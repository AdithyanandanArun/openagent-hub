# FEATURE 4: Connect to Main App
> FOR AI AGENTS: Apply these exact changes to wire Feature 4 into the app.

---

## File Placement Map

```
Source (this package)                    →   Destination in your project
─────────────────────────────────────────────────────────────────────────
backend/chat.dto.ts                      →   src/chat/dto/chat.dto.ts
backend/chat.service.ts                  →   src/chat/chat.service.ts
backend/chat.controller.ts               →   src/chat/chat.controller.ts
backend/chat.module.ts                   →   src/chat/chat.module.ts
database/prisma-additions.prisma         →   APPEND into prisma/schema.prisma
frontend/useChat.ts                      →   hooks/useChat.ts
frontend/MessageList.tsx                 →   components/MessageList.tsx
frontend/ChatInterface.tsx               →   components/ChatInterface.tsx
frontend/chat-page.tsx                   →   app/chat/page.tsx
```

---

## Step 1 — Install backend dependencies (if not already present)

```bash
# In your backend/NestJS directory
npm install @nestjs/common @nestjs/core rxjs  # usually already installed
```

---

## Step 2 — Database migration

1. Open `prisma/schema.prisma`
2. Add `conversations Conversation[]` to the **existing** `User` model
3. Paste the `Conversation` and `Message` models from `prisma-additions.prisma`
4. Run:

```bash
npx prisma migrate dev --name add_chat
npx prisma generate
```

---

## Step 3 — Register ChatModule in AppModule

```diff
// src/app.module.ts
+import { ChatModule } from './chat/chat.module';

 @Module({
   imports: [
     // ...existing modules
+    ChatModule,
   ],
 })
 export class AppModule {}
```

---

## Step 4 — Verify PrismaService is injectable in ChatModule

If your `PrismaModule` is decorated with `@Global()`, nothing to do.

If it is NOT global, add it to ChatModule imports:

```diff
// src/chat/chat.module.ts
+import { PrismaModule } from '../prisma/prisma.module';

 @Module({
+  imports: [PrismaModule],
   controllers: [ChatController],
   providers: [ChatService],
 })
```

---

## Step 5 — Verify JwtAuthGuard path

The controller imports from `'../auth/guards/jwt-auth.guard'`.
If Feature 1 placed the guard at a different path, update that import line:

```diff
// src/chat/chat.controller.ts
-import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
+import { JwtAuthGuard } from '<YOUR_CORRECT_PATH>';
```

---

## Step 6 — Connect Model Streaming (Feature 2)

Once Feature 2 (`ModelRouterService`) is in place:

1. In `src/chat/chat.module.ts`, uncomment:
   ```typescript
   import { ModelsModule } from '../models/models.module';
   // and add ModelsModule to imports array
   ```

2. In `src/chat/chat.service.ts`:
   - Uncomment the `ModelRouterService` injection in the constructor
   - Uncomment the real streaming block in `streamResponse()`
   - Delete the STUB section

---

## Step 7 — Frontend environment variable

Ensure `.env.local` (Next.js) has:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## Step 8 — Add Chat link to navigation

Find your main layout or nav component and add:
```tsx
// Example — adjust to match your nav structure
import Link from 'next/link';
<Link href="/chat">Chat</Link>
```

---

## Step 9 — Auth protection for /chat route

Option A — Next.js middleware (recommended):
```typescript
// middleware.ts (project root)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value
    ?? request.headers.get('authorization')?.replace('Bearer ', '');

  if (!token && request.nextUrl.pathname.startsWith('/chat')) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ['/chat/:path*'] };
```

Option B — In the page component: call `requireAuth()` from `lib/auth.ts`

---

## Verification

```bash
# Create a conversation
curl -X POST http://localhost:3001/chat/conversations \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test"}'

# List conversations
curl http://localhost:3001/chat/conversations \
  -H "Authorization: Bearer <TOKEN>"

# Add a message
curl -X POST http://localhost:3001/chat/conversations/<ID>/messages \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"role": "user", "content": "Hello"}'

# Delete
curl -X DELETE http://localhost:3001/chat/conversations/<ID> \
  -H "Authorization: Bearer <TOKEN>"
# Expect 204 No Content
```

---

## Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| `Cannot read properties of undefined (reading 'conversation')` | Prisma relations not migrated | Run `npx prisma migrate dev` |
| `401 Unauthorized` on all chat routes | JwtAuthGuard path wrong | Check import in chat.controller.ts |
| `request.user is undefined` | JWT strategy not attaching user | Verify JWT strategy calls `validate()` and returns user object |
| SSE stream never closes | Normal for long responses | Add timeout or check `done` condition in reader loop |
| `Module not found: hooks/useChat` | Path alias not configured | Add `"@/*": ["./*"]` to tsconfig.json paths |
