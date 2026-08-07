import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';
import { asyncRoute } from '../middleware/errorHandler.js';

const router = Router();

function toApi(row) {
  return { id: row.id, name: row.name, role: row.role, photoUrl: row.photo_url, bio: row.bio, sortOrder: row.sort_order };
}

const teamSchema = z.object({
  name: z.string().min(1),
  role: z.string().optional().default(''),
  photoUrl: z.string().optional().default(''),
  bio: z.string().optional().default(''),
});

router.get('/', asyncRoute(async (req, res) => {
  const { rows } = await query('SELECT * FROM team_members ORDER BY sort_order, id');
  res.json(rows.map(toApi));
}));

router.post('/', requireAdmin, asyncRoute(async (req, res) => {
  const d = teamSchema.parse(req.body);
  const { rows } = await query(
    'INSERT INTO team_members (name, role, photo_url, bio) VALUES ($1,$2,$3,$4) RETURNING *',
    [d.name, d.role, d.photoUrl, d.bio]
  );
  res.status(201).json(toApi(rows[0]));
}));

router.put('/:id', requireAdmin, asyncRoute(async (req, res) => {
  const d = teamSchema.parse(req.body);
  const { rows } = await query(
    'UPDATE team_members SET name=$1, role=$2, photo_url=$3, bio=$4 WHERE id=$5 RETURNING *',
    [d.name, d.role, d.photoUrl, d.bio, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Team member not found.' });
  res.json(toApi(rows[0]));
}));

router.delete('/:id', requireAdmin, asyncRoute(async (req, res) => {
  await query('DELETE FROM team_members WHERE id = $1', [req.params.id]);
  res.status(204).end();
}));

export default router;
