const express = require('express');
const fs = require('fs');
const path = require('path');
const { body, validationResult } = require('express-validator');
const { KYCRequirement, KYCSubmission } = require('../database');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { kycUpload } = require('../middleware/upload');
const { logActivity } = require('../utils/activity');
const { sendKYCSubmissionNotificationEmail, sendUserKYCStatusEmail } = require('../utils/email');

const router = express.Router();
const privateKycDirectory = path.join(__dirname, '../../private_uploads/kyc');

const defaultRequirements = [
  { name: 'Government-issued photo ID', description: 'Passport, driver license, or national identity card.', sortOrder: 10 },
  { name: 'Proof of address', description: 'Utility bill or bank statement issued within the last 90 days.', sortOrder: 20 },
];

async function ensureRequirements() {
  if (await KYCRequirement.exists({})) return;
  await KYCRequirement.insertMany(defaultRequirements);
}

function serializeSubmission(submission) {
  if (!submission) return null;
  const source = submission.toJSON ? submission.toJSON() : submission;
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
    const { legalFirstName, legalLastName, dateOfBirth, country, residentialAddress } = req.body;
    if (![legalFirstName, legalLastName, dateOfBirth, country, residentialAddress].every((value) => String(value || '').trim())) {
      removeFiles(uploadedFiles);
      return res.status(400).json({ error: 'Complete all identity details before submitting' });
    }

    const birthDate = new Date(dateOfBirth);
    if (Number.isNaN(birthDate.getTime()) || birthDate >= new Date()) {
      removeFiles(uploadedFiles);
      return res.status(400).json({ error: 'Enter a valid date of birth' });
    }

    await ensureRequirements();
    const requirements = await KYCRequirement.find({ active: true });
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

    const existing = await KYCSubmission.findOne({ userId: req.user.id });
    if (existing?.status === 'pending' || existing?.status === 'approved') {
      removeFiles(documents);
      return res.status(409).json({ error: `Verification is already ${existing.status}` });
    }

    const oldDocuments = existing?.documents ? [...existing.documents] : [];
    const submission = await KYCSubmission.findOneAndUpdate(
      { userId: req.user.id },
      {
        legalFirstName: legalFirstName.trim(),
        legalLastName: legalLastName.trim(),
        dateOfBirth: birthDate,
        country: country.trim(),
        residentialAddress: residentialAddress.trim(),
        documents,
        status: 'pending',
        rejectionReason: null,
        submittedAt: new Date(),
        reviewedAt: null,
        reviewedBy: null,
      },
      { new: true, upsert: true, runValidators: true }
    );
    filesPersisted = true;
    removeFiles(oldDocuments);
    await logActivity(req.user.id, 'KYC_SUBMITTED', { documents: documents.length }, req);

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
      { new: true, runValidators: true }
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
  body('sortOrder').optional().isInt({ min: 0, max: 10000 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const allowed = ['name', 'description', 'required', 'active', 'sortOrder'];
  const update = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
  try {
    const requirement = await KYCRequirement.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!requirement) return res.status(404).json({ error: 'Requirement not found' });
    res.json({ requirement });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update requirement' });
  }
});

module.exports = router;
