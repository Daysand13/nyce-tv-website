import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';
import { asyncRoute } from '../middleware/errorHandler.js';

const router = Router();

function toApi(row) {
  return { id: row.id, advertiser: row.advertiser, imageUrl: row.image_url, linkUrl: row.link_url, active: row.active, sortOrder: row.sort_order };
}

const adSchema = z.object({
  advertiser: z.string().min(1),
  imageUrl: z.string().optional().default(''),
  linkUrl: z.string().optional().default(''),
  active: z.boolean().optional().default(true),
});

// Returns every ad (active and inactive) — the admin panel needs to see and toggle both.
// The public site filters to `active` client-side before choosing what to display.
router.get('/', asyncRoute(async (req, res) => {
  const { rows } = await query('SELECT * FROM ads ORDER BY sort_order, id');
  res.json(rows.map(toApi));
}));

router.post('/', requireAdmin, asyncRoute(async (req, res) => {
  const d = adSchema.parse(req.body);
  const { rows } = await query(
    'INSERT INTO ads (advertiser, image_url, link_url, active) VALUES ($1,$2,$3,$4) RETURNING *',
    [d.advertiser, d.imageUrl, d.linkUrl, d.active]
  );
  res.status(201).json(toApi(rows[0]));
}));

router.put('/:id', requireAdmin, asyncRoute(async (req, res) => {
  const d = adSchema.parse(req.body);
  const { rows } = await query(
    'UPDATE ads SET advertiser=$1, image_url=$2, link_url=$3, active=$4 WHERE id=$5 RETURNING *',
    [d.advertiser, d.imageUrl, d.linkUrl, d.active, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Ad not found.' });
  res.json(toApi(rows[0]));
}));

router.delete('/:id', requireAdmin, asyncRoute(async (req, res) => {
  await query('DELETE FROM ads WHERE id = $1', [req.params.id]);
  res.status(204).end();
}));

export default router;
