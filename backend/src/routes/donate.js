import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';
import { asyncRoute } from '../middleware/errorHandler.js';

const router = Router();

function methodToApi(row) {
  return { id: row.id, label: row.label, detail: row.detail, sortOrder: row.sort_order };
}

router.get('/', asyncRoute(async (req, res) => {
  const introResult = await query('SELECT * FROM donate_info WHERE id = 1');
  const methodsResult = await query('SELECT * FROM donate_methods ORDER BY sort_order, id');
  res.json({
    intro: introResult.rows[0]?.intro || '',
    methods: methodsResult.rows.map(methodToApi),
  });
}));

const introSchema = z.object({ intro: z.string().optional().default('') });
router.put('/intro', requireAdmin, asyncRoute(async (req, res) => {
  const d = introSchema.parse(req.body);
  await query(
    `INSERT INTO donate_info (id, intro) VALUES (1, $1)
     ON CONFLICT (id) DO UPDATE SET intro = $1`,
    [d.intro]
  );
  res.json({ intro: d.intro });
}));

const methodSchema = z.object({
  label: z.string().min(1),
  detail: z.string().optional().default(''),
});

router.post('/methods', requireAdmin, asyncRoute(async (req, res) => {
  const d = methodSchema.parse(req.body);
  const { rows } = await query('INSERT INTO donate_methods (label, detail) VALUES ($1,$2) RETURNING *', [d.label, d.detail]);
  res.status(201).json(methodToApi(rows[0]));
}));

router.put('/methods/:id', requireAdmin, asyncRoute(async (req, res) => {
  const d = methodSchema.parse(req.body);
  const { rows } = await query('UPDATE donate_methods SET label=$1, detail=$2 WHERE id=$3 RETURNING *', [d.label, d.detail, req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Donation method not found.' });
  res.json(methodToApi(rows[0]));
}));

router.delete('/methods/:id', requireAdmin, asyncRoute(async (req, res) => {
  await query('DELETE FROM donate_methods WHERE id = $1', [req.params.id]);
  res.status(204).end();
}));

export default router;
