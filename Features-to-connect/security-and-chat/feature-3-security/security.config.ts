/**
 * FEATURE 3: Security Configuration
 * ============================================================
 * Drop this file at: src/security.config.ts
 *
 * AGENT INSTRUCTIONS:
 * In src/main.ts, import and call applySecurityConfig(app) BEFORE app.listen().
 * See the exact diff you need to apply in: _AGENT_INSTRUCTIONS/CONNECT_TO_APP.md
 * ============================================================
 */

import { INestApplication } from '@nestjs/common';
import * as helmet from 'helmet';

export async function applySecurityConfig(app: INestApplication): Promise<void> {
  const isProduction = process.env.NODE_ENV === 'production';

  // ── 1. Helmet — security headers ─────────────────────────────────────────
  if (process.env.HELMET_ENABLED !== 'false') {
    app.use(
      (helmet as any).default({
        contentSecurityPolicy: isProduction
          ? {
              directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self'"],
                imgSrc: ["'self'", 'data:', 'https:'],
              },
            }
          : false, // disable CSP in dev so Next.js hot reload works
        crossOriginEmbedderPolicy: false, // keep false unless you need COEP
      }),
    );
  }

  // ── 2. CORS ───────────────────────────────────────────────────────────────
  const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim());

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin "${origin}" not allowed`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Api-Key'],
    credentials: true,
  });

  // ── 3. HTTPS redirect in production ──────────────────────────────────────
  if (isProduction) {
    app.use((req: any, res: any, next: any) => {
      if (req.headers['x-forwarded-proto'] === 'http') {
        return res.redirect(301, `https://${req.headers.host}${req.url}`);
      }
      next();
    });
  }
}
