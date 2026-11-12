// env must be imported first: it loads .env and validates it before anything
// else (logger, Prisma, JWT) reads process.env.
import { env } from './config/env';

import express, { type Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { rateLimit } from 'express-rate-limit';

import { logger } from './utils/logger';
import { prisma } from './utils/prisma';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { csrfProtection, issueCsrfToken, CSRF_HEADER } from './middleware/csrf';
import { auditTrail } from './middleware/auditTrail';

import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import employeeRoutes from './routes/employee.routes';
import attendanceRoutes from './routes/attendance.routes';
import leaveRoutes from './routes/leave.routes';
import payrollRoutes from './routes/payroll.routes';
import inventoryRoutes from './routes/inventory.routes';
import purchaseRoutes from './routes/purchase.routes';
import financeRoutes from './routes/finance.routes';
import customerRoutes from './routes/customer.routes';
import leadRoutes from './routes/lead.routes';
import notificationRoutes from './routes/notification.routes';
import adminRoutes from './routes/admin.routes';
import biRoutes from './routes/bi.routes';
import salesOrderRoutes from './routes/salesOrder.routes';

const app: Application = express();

app.set('trust proxy', env.trustProxy);
app.disable('x-powered-by');

// ─── Security ─────────────────────────────────────────────────────────────────

app.use(helmet({ contentSecurityPolicy: false })); // the API serves JSON only

const allowedOrigins = new Set(env.corsOrigins);
app.use(cors({
  origin(origin, cb) {
    // Non-browser clients (curl, server-to-server) send no Origin header.
    if (!origin || allowedOrigins.has(origin)) return cb(null, true);
    return cb(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', CSRF_HEADER],
}));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.GLOBAL_RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later' },
}));

// ─── Parsing & logging ────────────────────────────────────────────────────────

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

if (!env.isTest) {
  app.use(morgan('combined', { stream: { write: (msg) => logger.http(msg.trim()) } }));
}

// ─── Health (no CSRF, no auth) ────────────────────────────────────────────────

const health = express.Router();
health.get('/', (_req, res) => {
  res.json({ success: true, message: 'AMX-ERP-2026 API is healthy', data: { timestamp: new Date().toISOString(), version: '0.2.0' } });
});
health.get('/ready', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ success: true, message: 'ready', data: { database: 'connected' } });
  } catch {
    res.status(503).json({ success: false, message: 'Database unavailable' });
  }
});
app.use('/health', health);
app.use('/api/v1/health', health);

app.get('/', (_req, res) => {
  res.json({ success: true, message: 'AMX-ERP-2026 API. See /health and /api/v1.', data: null });
});

// ─── CSRF ─────────────────────────────────────────────────────────────────────

app.get('/api/v1/csrf-token', issueCsrfToken);
app.use(csrfProtection);
app.use(auditTrail);

// ─── API routes ───────────────────────────────────────────────────────────────

const BASE = '/api/v1';
app.use(`${BASE}/auth`, authRoutes);
app.use(`${BASE}/users`, userRoutes);
app.use(`${BASE}/employees`, employeeRoutes);
app.use(`${BASE}/attendance`, attendanceRoutes);
app.use(`${BASE}/leave-requests`, leaveRoutes);
app.use(`${BASE}/payroll`, payrollRoutes);
app.use(`${BASE}/inventory`, inventoryRoutes);
app.use(`${BASE}/purchases`, purchaseRoutes);
app.use(`${BASE}/finance`, financeRoutes);
app.use(`${BASE}/customers`, customerRoutes);
app.use(`${BASE}/leads`, leadRoutes);
app.use(`${BASE}/notifications`, notificationRoutes);
app.use(`${BASE}/admin`, adminRoutes);
app.use(`${BASE}/bi`, biRoutes);
app.use(`${BASE}/sales-orders`, salesOrderRoutes);

// ─── Errors ───────────────────────────────────────────────────────────────────

app.use(notFound);
app.use(errorHandler);

export default app;
