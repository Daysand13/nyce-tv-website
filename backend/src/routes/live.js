import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';
import { asyncRoute } from '../middleware/errorHandler.js';

const router = Router();

function toApi(row) {
  return {
    id: row.id,
    categoryId: row.category_id,
    title: row.title,
    description: row.description,
    mediaType: row.media_type,
    mediaUrl: row.media_url,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const liveSchema = z.object({
  categoryId: z.union([z.number(), z.string()]).nullable().optional(),
  title: z.string().min(1),
  description: z.string().optional().default(''),
  mediaType: z.enum(['none', 'image', 'video', 'youtube']).optional().default('none'),
  mediaUrl: z.string().optional().default(''),
  status: z.enum(['live', 'ended']).optional().default('ended'),
});

router.get('/', asyncRoute(async (req, res) => {
  const { rows } = await query('SELECT * FROM live_posts ORDER BY (status = \'live\') DESC, created_at DESC');
  res.json(rows.map(toApi));
}));

router.post('/', requireAdmin, asyncRoute(async (req, res) => {
  const d = liveSchema.parse(req.body);
  const { rows } = await query(
    `INSERT INTO live_posts (category_id, title, description, media_type, media_url, status)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [d.categoryId || null, d.title, d.description, d.mediaType, d.mediaUrl, d.status]
  );
  res.status(201).json(toApi(rows[0]));
}));

router.put('/:id', requireAdmin, asyncRoute(async (req, res) => {
  const d = liveSchema.parse(req.body);
  const { rows } = await query(
    `UPDATE live_posts SET category_id=$1, title=$2, description=$3, media_type=$4, media_url=$5,
       status=$6, updated_at=now() WHERE id=$7 RETURNING *`,
    [d.categoryId || null, d.title, d.description, d.mediaType, d.mediaUrl, d.status, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Live post not found.' });
  res.json(toApi(rows[0]));
}));

router.delete('/:id', requireAdmin, asyncRoute(async (req, res) => {
  await query('DELETE FROM comments WHERE target_type = $1 AND target_id = $2', ['live', req.params.id]);
  await query('DELETE FROM live_posts WHERE id = $1', [req.params.id]);
  res.status(204).end();
}));

export default router;
