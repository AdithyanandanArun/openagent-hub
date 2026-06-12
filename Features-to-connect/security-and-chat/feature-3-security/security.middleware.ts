/**
 * FEATURE 3: Security Middleware
 * ============================================================
 * Drop this file at: src/middleware/security.middleware.ts
 *
 * AGENT INSTRUCTIONS:
 * This middleware runs on every request. Apply it in AppModule or main.ts.
 * See CONNECT_TO_APP.md for the exact AppModule snippet.
 * ============================================================
 */

import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SecurityMiddleware.name);

  use(req: Request, res: Response, next: NextFunction): void {
    // ── Remove fingerprinting headers ─────────────────────────────────────
    res.removeHeader('X-Powered-By');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader(
      'Permissions-Policy',
      'geolocation=(), microphone=(), camera=()',
    );

    // ── Log suspicious patterns ───────────────────────────────────────────
    const suspicious =
      /<script/i.test(req.url) ||
      /\.\.\//i.test(req.url) ||
      /union.*select/i.test(req.url);

    if (suspicious) {
      this.logger.warn(
        `Suspicious request: ${req.method} ${req.url} from ${req.ip}`,
      );
    }

    next();
  }
}

// ── API Key Hashing Utility ───────────────────────────────────────────────────
// Use this wherever you store or compare API keys (auth.service.ts)
export function hashApiKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

export function generateApiKey(): { raw: string; hashed: string } {
  const raw = `llmw_${crypto.randomBytes(32).toString('hex')}`;
  return { raw, hashed: hashApiKey(raw) };
}
