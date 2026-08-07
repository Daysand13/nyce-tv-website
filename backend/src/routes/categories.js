import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';
import { asyncRoute } from '../middleware/errorHandler.js';

const router = Router();

function toApi(row) {
  return { id: row.id, name: row.name, isLive: row.is_live, sortOrder: row.sort_order };
}

const categorySchema = z.object({
  name: z.string().min(1),
  isLive: z.boolean().optional().default(false),
});

router.get('/', asyncRoute(async (req, res) => {
  const { rows } = await query('SELECT * FROM categories ORDER BY sort_order, id');
  res.json(rows.map(toApi));
}));

router.post('/', requireAdmin, asyncRoute(async (req, res) => {
  const data = categorySchema.parse(req.body);
  const { rows } = await query(
    'INSERT INTO categories (name, is_live) VALUES ($1, $2) RETURNING *',
    [data.name, data.isLive]
  );
  res.status(201).json(toApi(rows[0]));
}));

router.put('/:id', requireAdmin, asyncRoute(async (req, res) => {
  const data = categorySchema.parse(req.body);
  const { rows } = await query(
    'UPDATE categories SET name = $1, is_live = $2 WHERE id = $3 RETURNING *',
    [data.name, data.isLive, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Category not found.' });
  res.json(toApi(rows[0]));
}));

router.delete('/:id', requireAdmin, asyncRoute(async (req, res) => {
  await query('DELETE FROM categories WHERE id = $1', [req.params.id]);
  res.status(204).end();
}));

export default router;
