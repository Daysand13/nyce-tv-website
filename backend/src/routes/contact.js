import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';
import { asyncRoute } from '../middleware/errorHandler.js';

const router = Router();

function toApi(row) {
  return { address: row.address, phone: row.phone, email: row.email, socials: row.socials || {} };
}

const contactSchema = z.object({
  address: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  email: z.string().optional().default(''),
  socials: z.record(z.string(), z.string()).optional().default({}),
});

router.get('/', asyncRoute(async (req, res) => {
  const { rows } = await query('SELECT * FROM contact_info WHERE id = 1');
  res.json(rows[0] ? toApi(rows[0]) : { address: '', phone: '', email: '', socials: {} });
}));

router.put('/', requireAdmin, asyncRoute(async (req, res) => {
  const d = contactSchema.parse(req.body);
  const { rows } = await query(
    `INSERT INTO contact_info (id, address, phone, email, socials) VALUES (1, $1, $2, $3, $4)
     ON CONFLICT (id) DO UPDATE SET address=$1, phone=$2, email=$3, socials=$4 RETURNING *`,
    [d.address, d.phone, d.email, JSON.stringify(d.socials)]
  );
  res.json(toApi(rows[0]));
}));

export default router;
