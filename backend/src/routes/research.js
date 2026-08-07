import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';
import { asyncRoute } from '../middleware/errorHandler.js';

const router = Router();

function toApi(row) {
  return { id: row.id, label: row.label, url: row.url, description: row.description, sortOrder: row.sort_order };
}

const linkSchema = z.object({
  label: z.string().min(1),
  url: z.string().min(1),
  description: z.string().optional().default(''),
});

router.get('/', asyncRoute(async (req, res) => {
  const { rows } = await query('SELECT * FROM research_links ORDER BY sort_order, id');
  res.json(rows.map(toApi));
}));

router.post('/', requireAdmin, asyncRoute(async (req, res) => {
  const d = linkSchema.parse(req.body);
  const { rows } = await query(
    'INSERT INTO research_links (label, url, description) VALUES ($1,$2,$3) RETURNING *',
    [d.label, d.url, d.description]
  );
  res.status(201).json(toApi(rows[0]));
}));

router.put('/:id', requireAdmin, asyncRoute(async (req, res) => {
  const d = linkSchema.parse(req.body);
  const { rows } = await query(
    'UPDATE research_links SET label=$1, url=$2, description=$3 WHERE id=$4 RETURNING *',
    [d.label, d.url, d.description, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Link not found.' });
  res.json(toApi(rows[0]));
}));

router.delete('/:id', requireAdmin, asyncRoute(async (req, res) => {
  await query('DELETE FROM research_links WHERE id = $1', [req.params.id]);
  res.status(204).end();
}));

export default router;
