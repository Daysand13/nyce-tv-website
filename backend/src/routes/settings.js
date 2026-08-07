import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';
import { asyncRoute } from '../middleware/errorHandler.js';

const router = Router();

function toApi(row) {
  return { stationName: row.station_name, tagline: row.tagline, liveStreamUrl: row.live_stream_url };
}

const settingsSchema = z.object({
  stationName: z.string().min(1),
  tagline: z.string().optional().default(''),
  liveStreamUrl: z.string().optional().default(''),
});

router.get('/', asyncRoute(async (req, res) => {
  const { rows } = await query('SELECT * FROM site_settings WHERE id = 1');
  res.json(rows[0] ? toApi(rows[0]) : { stationName: 'NYCE TV', tagline: '', liveStreamUrl: '' });
}));

router.put('/', requireAdmin, asyncRoute(async (req, res) => {
  const d = settingsSchema.parse(req.body);
  const { rows } = await query(
    `INSERT INTO site_settings (id, station_name, tagline, live_stream_url) VALUES (1, $1, $2, $3)
     ON CONFLICT (id) DO UPDATE SET station_name=$1, tagline=$2, live_stream_url=$3 RETURNING *`,
    [d.stationName, d.tagline, d.liveStreamUrl]
  );
  res.json(toApi(rows[0]));
}));

export default router;
