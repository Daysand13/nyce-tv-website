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
    excerpt: row.excerpt,
    body: row.body,
    imageUrl: row.image_url,
    videoUrl: row.video_url,
    youtubeUrl: row.youtube_url,
    author: row.author,
    featured: row.featured,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const articleSchema = z.object({
  categoryId: z.union([z.number(), z.string()]).nullable().optional(),
  title: z.string().min(1),
  excerpt: z.string().optional().default(''),
  body: z.string().optional().default(''),
  imageUrl: z.string().optional().default(''),
  videoUrl: z.string().optional().default(''),
  youtubeUrl: z.string().optional().default(''),
  author: z.string().optional().default(''),
  featured: z.boolean().optional().default(false),
});

router.get('/', asyncRoute(async (req, res) => {
  const { categoryId } = req.query;
  const { rows } = categoryId
    ? await query('SELECT * FROM articles WHERE category_id = $1 ORDER BY created_at DESC', [categoryId])
    : await query('SELECT * FROM articles ORDER BY created_at DESC');
  res.json(rows.map(toApi));
}));

router.get('/:id', asyncRoute(async (req, res) => {
  const { rows } = await query('SELECT * FROM articles WHERE id = $1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Article not found.' });
  res.json(toApi(rows[0]));
}));

router.post('/', requireAdmin, asyncRoute(async (req, res) => {
  const d = articleSchema.parse(req.body);
  const { rows } = await query(
    `INSERT INTO articles (category_id, title, excerpt, body, image_url, video_url, youtube_url, author, featured)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [d.categoryId || null, d.title, d.excerpt, d.body, d.imageUrl, d.videoUrl, d.youtubeUrl, d.author, d.featured]
  );
  res.status(201).json(toApi(rows[0]));
}));

router.put('/:id', requireAdmin, asyncRoute(async (req, res) => {
  const d = articleSchema.parse(req.body);
  const { rows } = await query(
    `UPDATE articles SET category_id=$1, title=$2, excerpt=$3, body=$4, image_url=$5,
       video_url=$6, youtube_url=$7, author=$8, featured=$9, updated_at=now()
     WHERE id=$10 RETURNING *`,
    [d.categoryId || null, d.title, d.excerpt, d.body, d.imageUrl, d.videoUrl, d.youtubeUrl, d.author, d.featured, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Article not found.' });
  res.json(toApi(rows[0]));
}));

router.delete('/:id', requireAdmin, asyncRoute(async (req, res) => {
  await query('DELETE FROM comments WHERE target_type = $1 AND target_id = $2', ['article', req.params.id]);
  await query('DELETE FROM articles WHERE id = $1', [req.params.id]);
  res.status(204).end();
}));

export default router;
