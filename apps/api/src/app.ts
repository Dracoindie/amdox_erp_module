import express, { type Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { rateLimit } from 'express-rate-limit';

import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';

// Routes
import authRoutes      from './routes/auth.routes';
import userRoutes      from './routes/user.routes';
import employeeRoutes  from './routes/employee.routes';
import attendanceRoutes from './routes/attendance.routes';
import leaveRoutes     from './routes/leave.routes';
import payrollRoutes   from './routes/payroll.routes';
import inventoryRoutes from './routes/inventory.routes';
import purchaseRoutes  from './routes/purchase.routes';
import financeRoutes   from './routes/finance.routes';
import customerRoutes  from './routes/customer.routes';
import leadRoutes      from './routes/lead.routes';
import notificationRoutes from './routes/notification.routes';
import adminRoutes     from './routes/admin.routes';

const app: Application = express();

// ─── Security Middleware ──────────────────────────────────────────────────────

app.use(helmet({
  contentSecurityPolicy: false, // handled by Next.js for frontend
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Global rate limit
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
}));

// ─── Body Parsing ─────────────────────────────────────────────────────────────

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Logging ─────────────────────────────────────────────────────────────────

app.use(morgan('combined', {
  stream: { write: (msg) => logger.info(msg.trim()) },
}));

// ─── Root Route ───────────────────────────────────────────────────────────────

app.get('/', (_req, res) => {
  res.send('AMX-ERP-2026 API is running. Please access the dashboard at http://localhost:3000');
});

// ─── Health Check ─────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'AMX-ERP-2026 API is healthy',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────

const BASE = '/api/v1';

app.use(`${BASE}/auth`,          authRoutes);
app.use(`${BASE}/users`,         userRoutes);
app.use(`${BASE}/employees`,     employeeRoutes);
app.use(`${BASE}/attendance`,    attendanceRoutes);
app.use(`${BASE}/leave-requests`,leaveRoutes);
app.use(`${BASE}/payroll`,       payrollRoutes);
app.use(`${BASE}/inventory`,     inventoryRoutes);
app.use(`${BASE}/purchases`,     purchaseRoutes);
app.use(`${BASE}/finance`,       financeRoutes);
app.use(`${BASE}/customers`,     customerRoutes);
app.use(`${BASE}/leads`,         leadRoutes);
app.use(`${BASE}/notifications`, notificationRoutes);
app.use(`${BASE}/admin`,         adminRoutes);

// ─── Error Handling ───────────────────────────────────────────────────────────

app.use(notFound);
app.use(errorHandler);

export default app;
