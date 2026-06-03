import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import http from 'http';

import { connectDB } from './config/database';
import { logger } from './config/logger';
import { swaggerSpec } from './config/swagger';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { initSocket } from './config/socket';

// Route imports
import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/users/user.routes';
import shopRoutes from './modules/shops/shop.routes';
import customerRoutes from './modules/customers/customer.routes';
import transactionRoutes from './modules/transactions/transaction.routes';
import notificationRoutes from './modules/notifications/notification.routes';
import subscriptionRoutes from './modules/subscriptions/subscription.routes';

// Cron jobs
import './jobs/reminderJob';
import './jobs/keepAliveJob';

const app = express();

// ── Security middleware ────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
}));

// ── Rate limiting ──────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 100,
  message: { success: false, message: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// ── Body parsing ───────────────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

// ── API Docs ───────────────────────────────────────────────────
app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { background-color: #0d631b; }',
  customSiteTitle: 'UdharBook API Docs',
}));

// ── Health check ───────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() });
});

// ── API Routes ─────────────────────────────────────────────────
const API = '/api/v1';
app.use(`${API}/auth`, authRoutes);
app.use(`${API}/users`, userRoutes);
app.use(`${API}/shops`, shopRoutes);
app.use(`${API}/customers`, customerRoutes);
app.use(`${API}/transactions`, transactionRoutes);
app.use(`${API}/notifications`, notificationRoutes);
app.use(`${API}/subscriptions`, subscriptionRoutes);

// ── Error handlers ─────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Bootstrap ─────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 5000;

async function bootstrap() {
  try {
    await connectDB();
    const server = http.createServer(app);
    initSocket(server);

    server.listen(PORT, () => {
      logger.info(`🚀 UdharBook API running on port ${PORT} (with WebSockets)`);
      logger.info(`📚 Docs: http://localhost:${PORT}/api/v1/docs`);
    });
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

bootstrap();

export default app;
