import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { connectDatabase, closeDatabase, isDemoMode } from './config/database.js';
import { cloudinaryReady } from './config/cloudinary.js';
import { initialiseDemoStore } from './services/demoStore.js';
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import verificationRoutes from './routes/verificationRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import { errorHandler, notFound } from './middleware/errors.js';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : false);
app.use(helmet());
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) res.setHeader('Cache-Control', 'private, no-store');
  next();
});
app.use(express.json({ limit: '128kb', strict: true }));

const apiLimiter = rateLimit({
  windowMs: 60_000, limit: 120, standardHeaders: 'draft-7', legacyHeaders: false,
  message: { success: false, code: 'RATE_LIMITED', message: 'Take a short breather, then try again.' },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60_000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false,
  message: { success: false, code: 'AUTH_RATE_LIMITED', message: 'Too many sign-in attempts. Please try again in a few minutes.' },
});
app.use('/api', apiLimiter);

app.get('/api/health', (req, res) => {
  const mode = isDemoMode ? 'demo' : 'mongo';
  const databaseConnected = isDemoMode || mongoose.connection.readyState === 1;
  res.status(databaseConnected ? 200 : 503).json({
    success: databaseConnected,
    data: {
      service: 'AgriLink API', version: '1.0.0', mode,
      database: isDemoMode ? 'ephemeral-demo' : (databaseConnected ? 'mongodb' : 'disconnected'),
      demo: isDemoMode, persistentWrites: !isDemoMode && databaseConnected,
      cloudinaryConfigured: cloudinaryReady,
      authentication: 'Bearer JWT (HS256)',
      demoNotice: isDemoMode ? 'Illustrative sample data; changes reset when the API process restarts. No actual purchase, payment, or payout occurs.' : null,
    },
  });
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api', notFound);
app.use(errorHandler);

const port = Number(process.env.PORT || 4000);
let server;

async function start() {
  await connectDatabase();
  if (isDemoMode) await initialiseDemoStore();
  server = app.listen(port, '0.0.0.0', () => {
    console.info(`[AgriLink API] Listening on 0.0.0.0:${port}; mode=${isDemoMode ? 'demo (ephemeral)' : 'MongoDB (persistent)'}.`);
  });
}

async function shutdown(signal) {
  console.info(`[AgriLink API] ${signal}: closing gracefully.`);
  if (server) await new Promise((resolve) => server.close(resolve));
  await closeDatabase();
  process.exit(0);
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

start().catch((error) => {
  console.error(`[AgriLink API] Startup refused: ${error.message}`);
  process.exit(1);
});

export { app };
