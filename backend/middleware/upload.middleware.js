'use strict';

const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const uploadDir = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads'));
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    cb(null, `${Date.now()}-${uuidv4()}${ext}`);
  },
});

const allowedExts = String(process.env.ALLOWED_FILE_TYPES || 'pdf,jpg,jpeg,png,webp,doc,docx,xls,xlsx')
  .split(',')
  .map((ext) => ext.trim().toLowerCase());

const fileFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname || '').replace('.', '').toLowerCase();
  if (!allowedExts.includes(ext)) {
    return cb(new Error(`Unsupported file type: .${ext}`));
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: Number(process.env.MAX_FILE_SIZE_MB || 10) * 1024 * 1024,
  },
});

module.exports = upload;
