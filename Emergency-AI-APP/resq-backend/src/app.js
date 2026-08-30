import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { mkdir } from 'node:fs/promises';
import authRoutes from './routes/authRoutes.js';
import citizenRoutes from './routes/citizenRoutes.js';
import responderRoutes from './routes/responderRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import mapsRoutes from './routes/mapsRoutes.js';
import { allowRoles, requireAuth } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/error.js';

const app = express();
const clientOrigins = process.env.CLIENT_ORIGIN?.split(',').map((origin) => origin.trim()).filter(Boolean);
const upload = multer({
  storage: multer.diskStorage({
    destination: async (req, file, callback) => { await mkdir('uploads', { recursive: true }); callback(null, 'uploads'); },
    filename: (req, file, callback) => callback(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, callback) => callback(null, file.mimetype.startsWith('image/')),
});

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: clientOrigins?.length ? clientOrigins : true, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: 'draft-8', legacyHeaders: false }));
app.use('/uploads', express.static('uploads'));

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'resq-api' }));
app.use('/api/auth', authRoutes);
app.post('/api/uploads', requireAuth, allowRoles('citizen'), upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Choose a valid image under 5 MB' });
  return res.status(201).json({ imageUrl: `/uploads/${req.file.filename}` });
});
app.use('/api/citizen', citizenRoutes);
app.use('/api/responder', responderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/maps', mapsRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;
