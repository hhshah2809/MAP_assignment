import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { httpLogger } from './config/logger';
import { requestIdMiddleware } from './middleware/request-id';
import { errorHandler } from './middleware/error-handler';
import { notFoundHandler } from './middleware/not-found';
import healthRoutes from './routes/health.routes';
import apiV1Routes from './routes/index';

export function createApp(): Application {
  const app = express();

  // 1. Security Headers
  app.use(helmet());

  // 2. CORS configuration
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, postman) or matching whitelist
        if (!origin || env.CORS_ORIGINS.includes(origin) || env.CORS_ORIGINS.includes('*')) {
          callback(null, true);
        } else {
          callback(new Error(`Origin ${origin} not allowed by CORS`));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Request-Id', 'X-Actor-Id']
    })
  );

  // 3. Body parsers with limits
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // 4. Request ID & Structured HTTP Logging
  app.use(requestIdMiddleware);
  if (env.NODE_ENV !== 'test') {
    app.use(httpLogger);
  }

  // 5. Rate limiting for API endpoints
  const limiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please slow down.'
      }
    }
  });

  // 6. Health & Readiness endpoints (unthrottled for orchestrators/k8s)
  app.use('/', healthRoutes);

  // 7. Core API v1 routes (throttled)
  app.use(env.API_PREFIX, limiter, apiV1Routes);

  // 8. Not Found handler
  app.use(notFoundHandler);

  // 9. Central Error Handler
  app.use(errorHandler);

  return app;
}

export const app = createApp();
