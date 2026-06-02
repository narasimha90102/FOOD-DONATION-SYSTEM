import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler } from './middlewares/error';
import { apiLimiter } from './middlewares/auth';

// Route Imports
import authRoutes from './routes/auth.routes';
import donationRoutes from './routes/donation.routes';
import chatRoutes from './routes/chat.routes';
import adminRoutes from './routes/admin.routes';
import aiRoutes from './routes/ai.routes';

const app = express();

// Security Headers
app.use(helmet());

// Cross Origin Resource Sharing
const allowedOrigins = [
  env.FRONTEND_URL,
  'http://localhost:3003',
  'http://localhost:3000',
  'http://127.0.0.1:3003',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || env.NODE_ENV === 'development') {
        return callback(null, true);
      }
      return callback(new Error(`CORS policy: origin ${origin} is not allowed.`));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// Handle preflight OPTIONS requests
app.options('*', cors());

// Payload parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply basic rate limiting to general APIs
app.use('/api/', apiLimiter);

// Health Check API
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'FoodBridge AI Service is Healthy',
    timestamp: new Date(),
  });
});

// API Routes mounting
app.use('/api/auth', authRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);

// Catch-all 404 Route handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Not Found: ${req.method} ${req.originalUrl}`,
  });
});

// Global Error Handler
app.use(errorHandler);

export { app };
export default app;
