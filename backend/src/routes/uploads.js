import { Router } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

const audioUploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many audio uploads. Please slow down.' },
});

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/webm', 'video/quicktime',
  'audio/webm', 'audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/wav',
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB — raise if you expect longer video uploads
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      const err = new Error(`Unsupported file type: ${file.mimetype}`);
      err.status = 400;
      return cb(err);
    }
    cb(null, true);
  },
});

// NOTE: this saves to local disk, which works for a single server but is *not* durable on
// most modern hosts (containers get rebuilt and lose local files). Before going live, point
// this at object storage instead — e.g. an S3-compatible bucket (AWS S3, Cloudflare R2,
// Backblaze B2, DigitalOcean Spaces) — and return that URL instead of a local path.
router.post('/', requireAdmin, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file received (expected multipart field "file").' });
  const publicUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.status(201).json({ url: publicUrl });
});

// Comments allow anonymous audio uploads (no login) so listeners can leave a voice reply —
// rate-limited and size/type-restricted above to keep this from being an open dumping ground.
router.post('/comment-audio', audioUploadLimiter, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file received (expected multipart field "file").' });
  if (!req.file.mimetype.startsWith('audio/')) return res.status(400).json({ error: 'Only audio uploads are allowed here.' });
  const publicUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.status(201).json({ url: publicUrl });
});

export default router;
