import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';
import { logger } from './utils/logger.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { generalLimiter } from './middlewares/rateLimiter.js';
import { whatsappService } from './services/WhatsAppService.js';
import { emailService } from './services/EmailService.js';
import { startMessageWorker } from './workers/messageWorker.js';
import { startFollowUpWorker } from './workers/followUpWorker.js';
import { startSearchWorker } from './workers/searchWorker.js';
import { startScheduler } from './cron/scheduler.js';
import bcrypt from 'bcryptjs';

// Routes
import authRoutes from './routes/auth.js';
import campaignRoutes from './routes/campaigns.js';
import leadRoutes from './routes/leads.js';
import messageRoutes from './routes/messages.js';
import analyticsRoutes from './routes/analytics.js';
import webhookRoutes from './routes/webhooks.js';

const app = express();

// ─── Middleware ───────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(generalLimiter);

// ─── Health Check ────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ─── Routes ──────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/webhooks', webhookRoutes);

// ─── 404 Handler ─────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// ─── Error Handler ───────────────────────────────────────────────
app.use(errorHandler);

// ─── Startup ─────────────────────────────────────────────────────
async function start(): Promise<void> {
  try {
    // 1. Connect to MongoDB
    await connectDatabase();

    // 2. Seed admin user on first run
    await seedAdminUser();

    // 3. Initialize Email service
    emailService.initialize();

    // 4. Register in-memory queue handlers (replaces BullMQ workers)
    startMessageWorker();
    startFollowUpWorker();
    startSearchWorker();
    logger.info('In-memory queue workers registered');

    // 5. Start cron scheduler
    startScheduler();

    // 6. Start HTTP server
    app.listen(env.PORT, () => {
      logger.info(`🚀 Server running on port ${env.PORT} (${env.NODE_ENV})`);
      logger.info(`📊 Health check: http://localhost:${env.PORT}/api/health`);
      
      // Render free-tier keep-alive
      const url = process.env.RENDER_EXTERNAL_URL || `http://localhost:${env.PORT}`;
      const interval = 600000; // 10 minutes
      function reloadWebsite() {
          fetch(url).then((response: any) => {
              logger.info(`Keep-alive: website reloaded (${url})`);
          })
          .catch((error: any) => {
              logger.error(`Keep-alive Error: ${error.message}`);
          });
      }
      setInterval(reloadWebsite, interval);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// ─── Auto-seed Admin ─────────────────────────────────────────────
async function seedAdminUser(): Promise<void> {
  try {
    const { User } = await import('./models/User.js');

    const existingUser = await User.findOne({ email: env.ADMIN_EMAIL.toLowerCase() });
    if (!existingUser) {
      const hashedPassword = await bcrypt.hash(env.ADMIN_PASSWORD, 12);
      await User.create({
        email: env.ADMIN_EMAIL.toLowerCase(),
        password: hashedPassword,
      });
      logger.info(`Admin user created: ${env.ADMIN_EMAIL}`);
    }
  } catch (error) {
    logger.error('Failed to seed admin user:', error);
  }
}

// ─── Graceful Shutdown ───────────────────────────────────────────
async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`${signal} received — starting graceful shutdown`);

  try {
    await whatsappService.destroyAll();
    await disconnectDatabase();
    logger.info('Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled rejections
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

start();
