const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `qr_${uuidv4()}${ext}`);
  },
});

const kycStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const destination = path.join(__dirname, '../../private_uploads/kyc');
    fs.mkdirSync(destination, { recursive: true });
    cb(null, destination);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `kyc_${uuidv4()}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'), false);
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
});

const kycUpload = multer({
  storage: kycStorage,
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowedMimeTypes.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Only PDF, JPEG, PNG, and WebP files are allowed'), false);
  },
  limits: { fileSize: 10 * 1024 * 1024, files: 12 },
});

const PROOF_DIRECTORY = path.join(__dirname, '../../private_uploads/payment-proofs');

const proofUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      fs.mkdirSync(PROOF_DIRECTORY, { recursive: true });
      cb(null, PROOF_DIRECTORY);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '');
      cb(null, `proof_${uuidv4()}${ext}`);
    },
  }),
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'];
    if (allowedMimeTypes.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Upload the screenshot as a JPEG, PNG, WebP, HEIC or PDF file'), false);
  },
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
});

module.exports = { upload, kycUpload, proofUpload, PROOF_DIRECTORY };
