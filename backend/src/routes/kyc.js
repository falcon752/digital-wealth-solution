const express = require('express');
const fs = require('fs');
const path = require('path');
const { body, validationResult } = require('express-validator');
const { KYCRequirement, KYCSubmission } = require('../database');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { kycUpload } = require('../middleware/upload');
const { logActivity } = require('../utils/activity');
const { encryptSensitiveValue, decryptSensitiveValue } = require('../utils/sensitiveData');
const { sendKYCSubmissionNotificationEmail, sendUserKYCStatusEmail } = require('../utils/email');

const router = express.Router();
const privateKycDirectory = path.join(__dirname, '../../private_uploads/kyc');

const defaultRequirements = [
  { name: 'Government-issued photo ID', description: 'Passport, driver license, or national identity card.', appliesTo: 'all', required: true, sortOrder: 10 },
  { name: 'Proof of address', description: 'Utility bill or bank statement issued within the last 90 days.', appliesTo: 'individual', required: true, sortOrder: 20 },
  { name: 'Tax certification', description: 'W-9 for applicable U.S. persons or the appropriate tax certification.', appliesTo: 'individual', required: true, sortOrder: 30 },
  { name: 'Formation or constitution documents', description: 'Articles of organization, certificate of formation, or equivalent.', appliesTo: 'business', required: true, sortOrder: 40 },
  { name: 'Business proof of address', description: 'Recent statement, lease, or utility record showing the principal address.', appliesTo: 'business', required: true, sortOrder: 50 },
  { name: 'Certificate of Good Standing', description: 'Current certificate from the entity formation jurisdiction.', appliesTo: 'business', required: true, sortOrder: 60 },
  { name: 'KYC/AML policy', description: 'Compliance program documentation, when maintained by the applicant.', appliesTo: 'business', required: false, sortOrder: 70 },
  { name: 'Financial statements', description: 'Recent bank statements, balance sheet, or other financial history.', appliesTo: 'business', required: false, sortOrder: 80 },
];

async function ensureRequirements() {
  await KYCRequirement.updateMany(
    { name: 'Proof of address', appliesTo: { $exists: false } },
    { $set: { appliesTo: 'individual' } }
  );
  await KYCRequirement.updateMany(
    { appliesTo: { $exists: false } },
    { $set: { appliesTo: 'all' } }
  );
  for (const requirement of defaultRequirements) {
    await KYCRequirement.updateOne(
      { name: requirement.name },
      { $setOnInsert: requirement },
      { upsert: true }
    );
  }
}

function serializeSubmission(submission) {
  if (!submission) return null;
  const source = submission.toJSON ? submission.toJSON() : { ...submission };
  delete source.taxIdentifierEncrypted;
  delete source.businessEinEncrypted;
  return {
    ...source,
    documents: (source.documents || []).map((document) => ({
      id: document._id?.toString?.() || document.id,
      requirementId: document.requirementId?.toString?.() || document.requirementId,
      requirementName: document.requirementName,
      originalName: document.originalName,
      mimeType: document.mimeType,
      size: document.size,
    })),
  };
}

function removeFiles(documents = []) {
  for (const document of documents) {
    if (!document.filename) continue;
    fs.unlink(path.join(privateKycDirectory, path.basename(document.filename)), () => {});
  }
}

function parsePeople(value, fieldName) {
  if (!value) return [];
  let parsed;
  try {
    parsed = typeof value === 'string' ? JSON.parse(value) : value;
  } catch {
    throw new Error(`${fieldName} must be valid structured data`);
  }
  if (!Array.isArray(parsed)) throw new Error(`${fieldName} must be a list`);
  return parsed.map((person) => ({
    fullName: String(person.fullName || '').trim(),
    title: String(person.title || '').trim() || null,
    email: String(person.email || '').trim().toLowerCase() || null,
    ownershipPercentage: person.ownershipPercentage === '' || person.ownershipPercentage == null
      ? null
      : Number(person.ownershipPercentage),
  }));
}

function validPeople(people, requireOwnership = false) {
  return people.every((person) => person.fullName
    && (!person.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(person.email))
    && (!requireOwnership || (Number.isFinite(person.ownershipPercentage)
      && person.ownershipPercentage >= 0
      && person.ownershipPercentage <= 100)));
}

router.get('/requirements', authenticate, async (req, res) => {
  try {
    await ensureRequirements();
    const filter = req.user.role === 'admin' ? {} : { active: true };
    const requirements = await KYCRequirement.find(filter).sort({ sortOrder: 1, createdAt: 1 });
    res.json({ requirements });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load KYC requirements' });
  }
});

router.get('/me', authenticate, async (req, res) => {
  try {
    const submission = await KYCSubmission.findOne({ userId: req.user.id });
    res.json({ submission: serializeSubmission(submission) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load verification status' });
  }
});

router.post('/submit', authenticate, kycUpload.any(), async (req, res) => {
  const uploadedFiles = req.files || [];
  let filesPersisted = false;
  try {
    const {
      applicantType, legalFirstName, legalLastName, dateOfBirth, emailAddress,
      phoneNumber, country, residentialAddress, taxClassification, taxIdentifier,
      taxCertificationConfirmed, legalEntityName, entityType, businessEin,
      principalAddress, formationJurisdiction, businessDescription,
      affiliatedEntities, kycAmlProgramDetails, financialHistorySummary,
    } = req.body;

    if (!['individual', 'business'].includes(applicantType)) {
      removeFiles(uploadedFiles);
      return res.status(400).json({ error: 'Select an individual or business application' });
    }
    const baseFields = [legalFirstName, legalLastName, dateOfBirth, emailAddress, phoneNumber, country, residentialAddress, taxClassification];
    if (!baseFields.every((value) => String(value || '').trim())) {
      removeFiles(uploadedFiles);
      return res.status(400).json({ error: 'Complete all applicant and tax details before submitting' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress)) {
      removeFiles(uploadedFiles);
      return res.status(400).json({ error: 'Enter a valid contact email' });
    }
    if (String(taxCertificationConfirmed) !== 'true') {
      removeFiles(uploadedFiles);
      return res.status(400).json({ error: 'Confirm the tax certification before submitting' });
    }

    const birthDate = new Date(dateOfBirth);
    if (Number.isNaN(birthDate.getTime()) || birthDate >= new Date()) {
      removeFiles(uploadedFiles);
      return res.status(400).json({ error: 'Enter a valid date of birth' });
    }

    let beneficialOwners = [];
    let authorizedRepresentatives = [];
    try {
      beneficialOwners = parsePeople(req.body.beneficialOwners, 'Beneficial owners');
      authorizedRepresentatives = parsePeople(req.body.authorizedRepresentatives, 'Authorized representatives');
    } catch (error) {
      removeFiles(uploadedFiles);
      return res.status(400).json({ error: error.message });
    }

    if (applicantType === 'business') {
      const businessFields = [legalEntityName, entityType, principalAddress, formationJurisdiction, businessDescription];
      if (!businessFields.every((value) => String(value || '').trim())) {
        removeFiles(uploadedFiles);
        return res.status(400).json({ error: 'Complete all required business information' });
      }
      if (!beneficialOwners.length || !validPeople(beneficialOwners, true)) {
        removeFiles(uploadedFiles);
        return res.status(400).json({ error: 'Add valid beneficial-owner information, including ownership percentage' });
      }
      if (!authorizedRepresentatives.length || !validPeople(authorizedRepresentatives)) {
        removeFiles(uploadedFiles);
        return res.status(400).json({ error: 'Add at least one valid authorized representative' });
      }
    }

    const existing = await KYCSubmission.findOne({ userId: req.user.id })
      .select('+taxIdentifierEncrypted +businessEinEncrypted');
    if (existing?.status === 'pending' || existing?.status === 'approved') {
      removeFiles(uploadedFiles);
      return res.status(409).json({ error: `Verification is already ${existing.status}` });
    }

    const cleanedTaxIdentifier = String(taxIdentifier || '').replace(/\s/g, '');
    if (!cleanedTaxIdentifier && !existing?.taxIdentifierEncrypted) {
      removeFiles(uploadedFiles);
      return res.status(400).json({ error: 'Enter an SSN or applicable tax identifier' });
    }
    if (cleanedTaxIdentifier && !/^[A-Za-z0-9-]{4,40}$/.test(cleanedTaxIdentifier)) {
      removeFiles(uploadedFiles);
      return res.status(400).json({ error: 'Enter a valid tax identifier' });
    }

    const cleanedBusinessEin = String(businessEin || '').replace(/\D/g, '');
    if (applicantType === 'business' && !cleanedBusinessEin && !existing?.businessEinEncrypted) {
      removeFiles(uploadedFiles);
      return res.status(400).json({ error: 'Enter the business EIN or FEIN' });
    }
    if (applicantType === 'business' && cleanedBusinessEin && cleanedBusinessEin.length !== 9) {
      removeFiles(uploadedFiles);
      return res.status(400).json({ error: 'EIN or FEIN must contain 9 digits' });
    }

    await ensureRequirements();
    const requirements = await KYCRequirement.find({
      active: true,
      appliesTo: { $in: ['all', applicantType] },
    });
    const requirementMap = new Map(requirements.map((item) => [item.id, item]));
    const documents = [];
    for (const file of uploadedFiles) {
      const requirementId = file.fieldname.replace(/^document_/, '');
      const requirement = requirementMap.get(requirementId);
      if (!requirement) {
        removeFiles([file]);
        continue;
      }
      documents.push({
        requirementId: requirement._id,
        requirementName: requirement.name,
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      });
    }

    const suppliedRequirementIds = new Set(documents.map((document) => document.requirementId.toString()));
    const missing = requirements.filter((requirement) => requirement.required && !suppliedRequirementIds.has(requirement.id));
    if (missing.length) {
      removeFiles(documents);
      return res.status(400).json({ error: `Upload the required document: ${missing[0].name}` });
    }

    const oldDocuments = existing?.documents ? [...existing.documents] : [];
    const update = {
      applicantType,
      legalFirstName: legalFirstName.trim(),
      legalLastName: legalLastName.trim(),
      dateOfBirth: birthDate,
      emailAddress: emailAddress.trim().toLowerCase(),
      phoneNumber: phoneNumber.trim(),
      country: country.trim(),
      residentialAddress: residentialAddress.trim(),
      taxClassification: taxClassification.trim(),
      taxIdentifierEncrypted: cleanedTaxIdentifier ? encryptSensitiveValue(cleanedTaxIdentifier) : existing.taxIdentifierEncrypted,
      taxIdentifierLast4: cleanedTaxIdentifier ? cleanedTaxIdentifier.replace(/\W/g, '').slice(-4) : existing.taxIdentifierLast4,
      taxCertificationConfirmed: true,
      legalEntityName: applicantType === 'business' ? legalEntityName.trim() : null,
      entityType: applicantType === 'business' ? entityType.trim() : null,
      businessEinEncrypted: applicantType === 'business'
        ? (cleanedBusinessEin ? encryptSensitiveValue(`${cleanedBusinessEin.slice(0, 2)}-${cleanedBusinessEin.slice(2)}`) : existing.businessEinEncrypted)
        : null,
      businessEinLast4: applicantType === 'business'
        ? (cleanedBusinessEin ? cleanedBusinessEin.slice(-4) : existing.businessEinLast4)
        : null,
      principalAddress: applicantType === 'business' ? principalAddress.trim() : null,
      formationJurisdiction: applicantType === 'business' ? formationJurisdiction.trim() : null,
      businessDescription: applicantType === 'business' ? businessDescription.trim() : null,
      affiliatedEntities: applicantType === 'business' ? String(affiliatedEntities || '').trim() || null : null,
      kycAmlProgramDetails: applicantType === 'business' ? String(kycAmlProgramDetails || '').trim() || null : null,
      financialHistorySummary: applicantType === 'business' ? String(financialHistorySummary || '').trim() || null : null,
      beneficialOwners: applicantType === 'business' ? beneficialOwners : [],
      authorizedRepresentatives: applicantType === 'business' ? authorizedRepresentatives : [],
      documents,
      status: 'pending',
      rejectionReason: null,
      submittedAt: new Date(),
      reviewedAt: null,
      reviewedBy: null,
    };

    const submission = await KYCSubmission.findOneAndUpdate(
      { userId: req.user.id },
      update,
      { returnDocument: 'after', upsert: true, runValidators: true }
    );
    filesPersisted = true;
    removeFiles(oldDocuments);
    await logActivity(req.user.id, 'KYC_SUBMITTED', { applicantType, documents: documents.length }, req);

    if (process.env.KYC_ADMIN_EMAIL_NOTIFICATIONS !== 'false') {
      const adminEmail = process.env.ADMIN_NOTIFY_EMAIL || process.env.ADMIN_EMAIL;
      if (adminEmail) {
        sendKYCSubmissionNotificationEmail({ adminEmail, user: req.user })
          .catch((error) => console.error('KYC notification email failed:', error.message));
      }
    }

    res.status(201).json({ message: 'Verification submitted for review', submission: serializeSubmission(submission) });
  } catch (error) {
    if (!filesPersisted) removeFiles(uploadedFiles);
    console.error('KYC submission error:', error);
    res.status(500).json({ error: 'Failed to submit verification' });
  }
});

router.get('/documents/:submissionId/:documentId', authenticate, async (req, res) => {
  try {
    const filter = { _id: req.params.submissionId };
    if (req.user.role !== 'admin') filter.userId = req.user.id;
    const submission = await KYCSubmission.findOne(filter);
    if (!submission) return res.status(404).json({ error: 'Verification submission not found' });
    const document = submission.documents.id(req.params.documentId);
    if (!document) return res.status(404).json({ error: 'Document not found' });
    const filePath = path.join(privateKycDirectory, path.basename(document.filename));
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Document file not found' });
    res.type(document.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(document.originalName)}"`);
    res.sendFile(filePath);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load document' });
  }
});

router.get('/admin/submissions', authenticate, requireAdmin, async (req, res) => {
  try {
    const submissions = await KYCSubmission.find()
      .populate('userId', 'firstName lastName email')
      .sort({ submittedAt: -1 });
    res.json({ submissions: submissions.map(serializeSubmission) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load KYC submissions' });
  }
});

router.get('/admin/submissions/:id/sensitive', authenticate, requireAdmin, async (req, res) => {
  try {
    const submission = await KYCSubmission.findById(req.params.id)
      .select('+taxIdentifierEncrypted +businessEinEncrypted');
    if (!submission) return res.status(404).json({ error: 'Verification submission not found' });
    await logActivity(req.user.id, 'KYC_SENSITIVE_DATA_VIEWED', { submissionId: submission.id }, req);
    res.json({
      taxIdentifier: decryptSensitiveValue(submission.taxIdentifierEncrypted),
      businessEin: decryptSensitiveValue(submission.businessEinEncrypted),
    });
  } catch (error) {
    console.error('Sensitive KYC data access error:', error);
    res.status(500).json({ error: 'Failed to load protected identifiers' });
  }
});

router.put('/admin/submissions/:id', authenticate, requireAdmin, [
  body('status').isIn(['approved', 'rejected']),
  body('rejectionReason').optional({ nullable: true }).trim().isLength({ max: 2000 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  if (req.body.status === 'rejected' && !req.body.rejectionReason?.trim()) {
    return res.status(400).json({ error: 'A rejection reason is required' });
  }
  try {
    const submission = await KYCSubmission.findByIdAndUpdate(
      req.params.id,
      {
        status: req.body.status,
        rejectionReason: req.body.status === 'rejected' ? req.body.rejectionReason.trim() : null,
        reviewedAt: new Date(),
        reviewedBy: req.user.id,
      },
      { returnDocument: 'after', runValidators: true }
    ).populate('userId', 'firstName lastName email');
    if (!submission) return res.status(404).json({ error: 'Verification submission not found' });
    await logActivity(req.user.id, 'KYC_REVIEWED', { submissionId: submission.id, status: submission.status }, req);
    sendUserKYCStatusEmail({
      userEmail: submission.userId.email,
      firstName: submission.userId.firstName,
      status: submission.status,
      rejectionReason: submission.rejectionReason,
    }).catch((error) => console.error('KYC status email failed:', error.message));
    res.json({ message: `Verification ${submission.status}`, submission: serializeSubmission(submission) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to review verification' });
  }
});

router.post('/admin/requirements', authenticate, requireAdmin, [
  body('name').trim().notEmpty().isLength({ max: 100 }),
  body('description').optional({ nullable: true }).trim().isLength({ max: 500 }),
  body('required').optional().isBoolean(),
  body('active').optional().isBoolean(),
  body('appliesTo').optional().isIn(['all', 'individual', 'business']),
  body('sortOrder').optional().isInt({ min: 0, max: 10000 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const requirement = await KYCRequirement.create(req.body);
    res.status(201).json({ requirement });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create requirement' });
  }
});

router.put('/admin/requirements/:id', authenticate, requireAdmin, [
  body('name').optional().trim().notEmpty().isLength({ max: 100 }),
  body('description').optional({ nullable: true }).trim().isLength({ max: 500 }),
  body('required').optional().isBoolean(),
  body('active').optional().isBoolean(),
  body('appliesTo').optional().isIn(['all', 'individual', 'business']),
  body('sortOrder').optional().isInt({ min: 0, max: 10000 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const allowed = ['name', 'description', 'required', 'active', 'appliesTo', 'sortOrder'];
  const update = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
  try {
    const requirement = await KYCRequirement.findByIdAndUpdate(req.params.id, update, { returnDocument: 'after', runValidators: true });
    if (!requirement) return res.status(404).json({ error: 'Requirement not found' });
    res.json({ requirement });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update requirement' });
  }
});

module.exports = router;
