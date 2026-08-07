import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'node:path';
import fs from 'node:fs';

import authRoutes from './src/routes/auth.js';
import categoriesRoutes from './src/routes/categories.js';
import articlesRoutes from './src/routes/articles.js';
import liveRoutes from './src/routes/live.js';
import teamRoutes from './src/routes/team.js';
import researchRoutes from './src/routes/research.js';
import contactRoutes from './src/routes/contact.js';
import donateRoutes from './src/routes/donate.js';
import settingsRoutes from './src/routes/settings.js';
import commentsRoutes from './src/routes/comments.js';
import uploadsRoutes from './src/routes/uploads.js';
import { notFoundHandler, errorHandler } from './src/middleware/errorHandler.js';

if (!process.env.JWT_SECRET) {
  console.error('Missing JWT_SECRET in environment. Copy .env.example to .env and set one before starting.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 4000;
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// FRONTEND_ORIGIN can be a comma-separated list. Lock this down to your real domain(s) in production.
const allowedOrigins = (process.env.FRONTEND_ORIGIN || '*').split(',').map((s) => s.trim());
app.use(cors({
  origin: allowedOrigins.includes('*') ? true : allowedOrigins,
}));
app.use(express.json({ limit: '2mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use('/uploads', express.static(UPLOAD_DIR));

app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/articles', articlesRoutes);
app.use('/api/live', liveRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/research', researchRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/donate', donateRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/upload', uploadsRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`NYCE TV API listening on port ${PORT}`);
});
