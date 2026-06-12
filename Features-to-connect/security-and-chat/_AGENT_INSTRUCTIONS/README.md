# LLM-Worker Agent Integration Guide
> **FOR AI AGENTS**: Read this file first before touching any code in this repo.
> This document tells you exactly how each feature module connects to the main app.

---

## Project Architecture Overview

```
llm-worker/
├── backend/          (NestJS — default port 3001)
│   ├── src/
│   │   ├── auth/           ✅ DONE — JWT + API Key auth
│   │   ├── models/         ✅ DONE — LLM provider routing + streaming
│   │   ├── chat/           ⬅ FEATURE 4 adds this
│   │   ├── middleware/     ⬅ FEATURE 3 adds this
│   │   └── main.ts         ⬅ FEATURE 3 modifies this
│   └── prisma/
│       └── schema.prisma   ⬅ FEATURE 4 adds models here
│
└── frontend/         (Next.js — default port 3000)
    ├── app/
    │   ├── auth/           ✅ DONE
    │   └── chat/           ⬅ FEATURE 4 adds this
    ├── components/         ⬅ FEATURE 4 adds ChatInterface, MessageList
    ├── hooks/              ⬅ FEATURE 4 adds useChat, useStreamChat
    └── lib/
        └── auth.ts         ✅ DONE
```

---

## How Features Connect — Quick Reference

### FEATURE 3 (Security) integration points:
1. `src/main.ts` — import and call `applySecurityConfig(app)` from `security.config.ts`
2. `src/app.module.ts` — add `ThrottlerModule` to imports array
3. All controller DTOs — add `@UsePipes(new ValidationPipe())` or use global pipe
4. `.env` — add `CORS_ORIGINS`, `THROTTLE_TTL`, `THROTTLE_LIMIT`

### FEATURE 4 (Chat) integration points:
1. `src/app.module.ts` — import `ChatModule` and add to `imports: [ChatModule]`
2. `prisma/schema.prisma` — paste Conversation + Message models, then `npx prisma migrate dev`
3. `frontend/app/layout.tsx` or nav — add link to `/chat`
4. `frontend/lib/api.ts` (or equivalent) — chat API calls use the same base URL + JWT token

---

## Environment Variables Required

Add these to both `.env` and `.env.example`:

```env
# FEATURE 3 — Security
CORS_ORIGINS=http://localhost:3000,https://yourdomain.com
THROTTLE_TTL=60000
THROTTLE_LIMIT=100
HELMET_ENABLED=true

# FEATURE 4 — Chat (DB already set up from Feature 1)
# No new env vars needed — uses existing DATABASE_URL and JWT_SECRET
```

---

## Integration Checklist for Agents

### After dropping in Feature 3 files:
- [ ] Copy `security.config.ts` → `src/security.config.ts`
- [ ] Copy `security.middleware.ts` → `src/middleware/security.middleware.ts`
- [ ] In `src/main.ts`: add the 3 import lines and call `applySecurityConfig(app)` before `app.listen()`
- [ ] In `src/app.module.ts`: add ThrottlerModule to imports (snippet in `CONNECT_TO_APP.md`)
- [ ] Run `npm install helmet @nestjs/throttler class-validator class-transformer`
- [ ] Add env vars to `.env`

### After dropping in Feature 4 files:
- [ ] Copy all backend files to `src/chat/`
- [ ] Copy all frontend files to their respective locations
- [ ] Append Prisma models from `prisma-additions.prisma` into `prisma/schema.prisma`
- [ ] Run `npx prisma migrate dev --name add_chat`
- [ ] In `src/app.module.ts`: add `ChatModule` to imports
- [ ] Verify JWT guard is shared (see `CONNECT_TO_APP.md`)

---

## Common Pitfalls

| Problem | Fix |
|---|---|
| `Cannot find module '@/hooks/useChat'` | Check tsconfig paths — alias must match |
| CORS errors in browser | `CORS_ORIGINS` must exactly match frontend origin (no trailing slash) |
| ThrottlerModule not found | Run `npm install @nestjs/throttler` |
| Prisma type errors after migration | Run `npx prisma generate` |
| JWT guard not found in ChatModule | Import `JwtAuthGuard` from `../auth/guards/jwt-auth.guard` |
| Stream not working | SSE requires `res.flushHeaders()` — already in the controller |

---

## Auth Integration (Critical)

Feature 4's chat endpoints are protected by the SAME `JwtAuthGuard` from Feature 1.
The guard path is: `src/auth/guards/jwt-auth.guard.ts`

If that file doesn't exist yet (Feature 1 not done), use the standalone guard stub:
```typescript
// Temporary stub — replace with real JWT guard when Feature 1 is implemented
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

---

## Database Schema Dependency Graph

```
User (Feature 1)
 └── Conversation (Feature 4)
      └── Message (Feature 4)
           └── branches_from → Message (self-relation, Feature 4)
```

Feature 4 Prisma models REQUIRE the `User` model from Feature 1 to exist first.
