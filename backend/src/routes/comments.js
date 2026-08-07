import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { query } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';
import { asyncRoute } from '../middleware/errorHandler.js';
import { cleanText } from '../utils/profanity.js';

const router = Router();

function toApi(row) {
  return {
    id: row.id,
    targetType: row.target_type,
    targetId: row.target_id,
    parentId: row.parent_id,
    author: row.author,
    type: row.type,
    text: row.body,
    audioData: row.audio_url,
    flagged: row.flagged,
    createdAt: row.created_at,
  };
}

const postLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many comments posted. Please slow down.' },
});

const querySchema = z.object({
  targetType: z.enum(['article', 'live']),
  targetId: z.string().min(1),
});

router.get('/', asyncRoute(async (req, res) => {
  const { targetType, targetId } = querySchema.parse(req.query);
  const { rows } = await query(
    'SELECT * FROM comments WHERE target_type = $1 AND target_id = $2 ORDER BY created_at ASC',
    [targetType, targetId]
  );
  res.json(rows.map(toApi));
}));

const commentSchema = z.object({
  targetType: z.enum(['article', 'live']),
  targetId: z.union([z.number(), z.string()]),
  parentId: z.union([z.number(), z.string()]).nullable().optional(),
  author: z.string().optional().default('Guest listener'),
  type: z.enum(['text', 'audio']),
  text: z.string().optional().default(''),
  audioUrl: z.string().optional().default(''),
});

router.post('/', postLimiter, asyncRoute(async (req, res) => {
  const d = commentSchema.parse(req.body);
  let body = '';
  let flagged = false;
  if (d.type === 'text') {
    if (!d.text.trim()) return res.status(400).json({ error: 'Comment text cannot be empty.' });
    const result = cleanText(d.text.trim());
    body = result.cleaned;
    flagged = result.flagged;
  } else if (!d.audioUrl) {
    return res.status(400).json({ error: 'Missing audioUrl for an audio comment. Upload the recording first via /api/upload.' });
  }
  const { rows } = await query(
    `INSERT INTO comments (target_type, target_id, parent_id, author, type, body, audio_url, flagged)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [d.targetType, d.targetId, d.parentId || null, d.author.trim() || 'Guest listener', d.type, body, d.audioUrl, flagged]
  );
  res.status(201).json(toApi(rows[0]));
}));

router.delete('/:id', requireAdmin, asyncRoute(async (req, res) => {
  // Deletes the comment and anything threaded under it (parent_id has ON DELETE CASCADE).
  await query('DELETE FROM comments WHERE id = $1', [req.params.id]);
  res.status(204).end();
}));

export default router;
