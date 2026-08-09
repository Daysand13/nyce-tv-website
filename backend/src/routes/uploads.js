import { Router } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import crypto from 'node:crypto';
import fs from 'node:fs';
import mime from 'mime-types';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

const audioUploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many audio uploads. Please slow down.' },
});

const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/webm', 'video/quicktime',
  'audio/webm', 'audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/wav',
]);

// Browsers often report MediaRecorder's mimeType with a codec parameter attached
// (e.g. "audio/webm;codecs=opus") — compare only the base type against the allowlist,
// otherwise a perfectly normal recording gets rejected as an "unsupported" type.
function baseMime(mimetype) {
  return (mimetype || '').split(';')[0].trim().toLowerCase();
}

// --- Storage backend: Cloudflare R2 (or any S3-compatible store) when configured,
// falling back to local disk automatically when it isn't (e.g. local development). ---
const R2_CONFIGURED = !!(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_BUCKET_NAME && process.env.R2_PUBLIC_URL);

let s3 = null;
if (R2_CONFIGURED) {
  s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
  console.log('Uploads: using Cloudflare R2 (persistent).');
} else {
  console.warn('Uploads: R2 not configured — falling back to local disk. Fine for local dev; NOT durable in production (see README).');
}

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
if (!R2_CONFIGURED) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// multer.memoryStorage() just buffers the file in RAM — nothing touches local disk on the
// R2 path. On the local-disk fallback path we write that buffer out ourselves below.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB — raise if you expect longer video uploads
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.has(baseMime(file.mimetype))) {
      const err = new Error(`Unsupported file type: ${file.mimetype}`);
      err.status = 400;
      return cb(err);
    }
    cb(null, true);
  },
});

function makeFilename(originalname, mimetype) {
  const base = baseMime(mimetype);
  const extFromMime = mime.extension(base);
  // Falls back to the original filename's extension only if the MIME type is somehow
  // unrecognized — in normal operation extFromMime always wins, and matters most for
  // "audio/webm", which needs ".weba" (not ".webm") to be served back with the correct
  // audio/* Content-Type instead of defaulting to video/webm and failing to play.
  const ext = extFromMime ? `.${extFromMime}` : (path.extname(originalname) || '');
  return `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
}

async function saveFile(file, req) {
  const filename = makeFilename(file.originalname, file.mimetype);
  if (R2_CONFIGURED) {
    await s3.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: filename,
      Body: file.buffer,
      ContentType: file.mimetype,
    }));
    return `${process.env.R2_PUBLIC_URL.replace(/\/$/, '')}/${filename}`;
  }
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), file.buffer);
  return `${req.protocol}://${req.get('host')}/uploads/${filename}`;
}

router.post('/', requireAdmin, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file received (expected multipart field "file").' });
    const url = await saveFile(req.file, req);
    res.status(201).json({ url });
  } catch (err) { next(err); }
});

// Comments allow anonymous audio uploads (no login) so listeners can leave a voice reply —
// rate-limited and size/type-restricted above to keep this from being an open dumping ground.
router.post('/comment-audio', audioUploadLimiter, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file received (expected multipart field "file").' });
    if (!req.file.mimetype.startsWith('audio/')) return res.status(400).json({ error: 'Only audio uploads are allowed here.' });
    const url = await saveFile(req.file, req);
    res.status(201).json({ url });
  } catch (err) { next(err); }
});

export default router;
