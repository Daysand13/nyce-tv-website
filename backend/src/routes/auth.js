import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { query } from '../db.js';
import { signToken, requireAdmin } from '../middleware/auth.js';
import { asyncRoute } from '../middleware/errorHandler.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again in a few minutes.' },
});

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

router.post('/login', loginLimiter, asyncRoute(async (req, res) => {
  const { username, password } = loginSchema.parse(req.body);
  const { rows } = await query('SELECT * FROM admins WHERE username = $1', [username]);
  const admin = rows[0];
  if (!admin) return res.status(401).json({ error: 'Incorrect username or password.' });

  const ok = await bcrypt.compare(password, admin.password_hash);
  if (!ok) return res.status(401).json({ error: 'Incorrect username or password.' });

  const token = signToken(admin);
  res.json({ token, admin: { id: admin.id, username: admin.username } });
}));

router.get('/me', requireAdmin, (req, res) => {
  res.json({ admin: req.admin });
});

// Lets a logged-in admin change their own password.
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'New password must be at least 8 characters.'),
});

router.post('/change-password', requireAdmin, asyncRoute(async (req, res) => {
  const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
  const { rows } = await query('SELECT * FROM admins WHERE id = $1', [req.admin.id]);
  const admin = rows[0];
  const ok = await bcrypt.compare(currentPassword, admin.password_hash);
  if (!ok) return res.status(401).json({ error: 'Current password is incorrect.' });
  const hash = await bcrypt.hash(newPassword, 12);
  await query('UPDATE admins SET password_hash = $1 WHERE id = $2', [hash, admin.id]);
  res.json({ ok: true });
}));

export default router;
