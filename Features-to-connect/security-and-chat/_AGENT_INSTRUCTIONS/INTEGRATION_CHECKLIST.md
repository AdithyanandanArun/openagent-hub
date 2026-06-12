# Integration Checklist
> FOR AI AGENTS: Work through this top to bottom. Check off as you go.
> Prerequisites: Feature 1 (JWT Auth) and Feature 2 (Model Streaming) must be done first.

---

## Pre-flight checks

- [ ] Feature 1 done: `src/auth/guards/jwt-auth.guard.ts` exists
- [ ] Feature 2 done: `src/models/model-router.service.ts` exists  
- [ ] `prisma/schema.prisma` has a `User` model
- [ ] `DATABASE_URL` is set in `.env`
- [ ] `JWT_SECRET` is set in `.env`

---

## FEATURE 3 — Security (est. 15 min)

- [ ] `npm install helmet @nestjs/throttler class-validator class-transformer`
- [ ] Copy `feature-3-security/security.config.ts` → `src/security.config.ts`
- [ ] Copy `feature-3-security/security.middleware.ts` → `src/middleware/security.middleware.ts`
- [ ] Copy `feature-3-security/common.dto.ts` → `src/common/dto/common.dto.ts`
- [ ] Apply diff from `feature-3-security/CONNECT_TO_APP.md` → `src/main.ts`
- [ ] Apply diff from `feature-3-security/CONNECT_TO_APP.md` → `src/app.module.ts`
- [ ] Apply diff from `feature-3-security/CONNECT_TO_APP.md` → `src/auth/auth.service.ts`
- [ ] Apply Prisma diff, run `npx prisma migrate dev --name hash_api_keys`
- [ ] Add env vars: `CORS_ORIGINS`, `THROTTLE_TTL`, `THROTTLE_LIMIT`, `HELMET_ENABLED`
- [ ] Restart server, run verification curl commands from CONNECT_TO_APP.md

---

## FEATURE 4 — Chat System (est. 30 min)

### Backend
- [ ] Create folder `src/chat/dto/`
- [ ] Copy `feature-4-chat/backend/chat.dto.ts` → `src/chat/dto/chat.dto.ts`
- [ ] Copy `feature-4-chat/backend/chat.service.ts` → `src/chat/chat.service.ts`
- [ ] Copy `feature-4-chat/backend/chat.controller.ts` → `src/chat/chat.controller.ts`
- [ ] Copy `feature-4-chat/backend/chat.module.ts` → `src/chat/chat.module.ts`

### Database
- [ ] Add `conversations Conversation[]` to `User` model in `prisma/schema.prisma`
- [ ] Append contents of `feature-4-chat/database/prisma-additions.prisma` to `prisma/schema.prisma`
- [ ] Run `npx prisma migrate dev --name add_chat`
- [ ] Run `npx prisma generate`

### Wire to AppModule
- [ ] Add `ChatModule` to `src/app.module.ts` imports

### Frontend
- [ ] Copy `feature-4-chat/frontend/useChat.ts` → `hooks/useChat.ts`
- [ ] Copy `feature-4-chat/frontend/MessageList.tsx` → `components/MessageList.tsx`
- [ ] Copy `feature-4-chat/frontend/ChatInterface.tsx` → `components/ChatInterface.tsx`
- [ ] Copy `feature-4-chat/frontend/chat-page.tsx` → `app/chat/page.tsx`
- [ ] Add `NEXT_PUBLIC_API_URL` to `.env.local`
- [ ] Add `/chat` link to app navigation
- [ ] Add route protection (see CONNECT_TO_APP.md Step 9)

### Connect to Feature 2 (Model Streaming)
- [ ] Uncomment `ModelsModule` import in `src/chat/chat.module.ts`
- [ ] Uncomment `ModelRouterService` injection in `src/chat/chat.service.ts`
- [ ] Uncomment real streaming block, delete STUB block

---

## Final verification

```bash
# Run all in sequence
npm run build          # should compile with no errors
npx prisma studio      # verify Conversation + Message tables exist
npm run start:dev      # start the server

# Then test from CONNECT_TO_APP.md verification section
```
