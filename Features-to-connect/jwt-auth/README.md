# JWT Authentication Feature

Complete JWT authentication implementation for LLM Worker AI chat app.

## Files Included

### Backend (NestJS)
```
backend/
├── prisma/
│   └── schema.prisma          # User model
├── src/
│   ├── app.module.ts          # Root module
│   ├── main.ts                # Bootstrap with ValidationPipe + CORS
│   ├── prisma/
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   └── auth/
│       ├── auth.module.ts
│       ├── auth.service.ts    # register(), login(), generateApiKey()
│       ├── auth.controller.ts # POST /auth/register, /auth/login, etc.
│       ├── dto/
│       │   ├── register.dto.ts
│       │   └── login.dto.ts
│       ├── strategies/
│       │   └── jwt.strategy.ts
│       └── guards/
│           ├── jwt-auth.guard.ts
│           └── api-key.guard.ts
└── test/
    └── auth.e2e-spec.ts       # Full test suite
```

### Frontend (Next.js)
```
frontend/
├── middleware.ts              # Route protection
├── lib/
│   ├── auth.ts                # Token storage + API helpers
│   └── auth-context.tsx       # React context + useAuth() hook
└── app/
    └── auth/
        ├── login/page.tsx
        └── register/page.tsx
```

## Setup

### 1. Install dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure environment

```bash
# Copy and edit environment variables
cp .env.example backend/.env
cp .env.example frontend/.env.local
# Edit both files with your values
```

### 3. Run Prisma migration

```bash
cd backend
npx prisma migrate dev --name add_auth
npx prisma generate
```

### 4. Start services

```bash
# Backend (port 4000)
cd backend
npm run start:dev

# Frontend (port 3000)
cd frontend
npm run dev
```

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/v1/auth/register | None | Create account |
| POST | /api/v1/auth/login | None | Get JWT token |
| GET  | /api/v1/auth/me | JWT | Get current user |
| POST | /api/v1/auth/api-key | JWT | Generate API key |
| GET  | /api/v1/auth/me/api-key-access | API Key | Access via API key |

## Protecting Endpoints

```typescript
// Any controller/route
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Get('protected')
@UseGuards(JwtAuthGuard)
async myProtectedRoute(@Request() req) {
  // req.user = { id, email, createdAt }
  return req.user;
}
```

## Using in Frontend

```typescript
import { useAuth } from '@/lib/auth-context';

// In a component
const { user, isLoggedIn, logout } = useAuth();

// Wrap your app with AuthProvider in layout.tsx
import { AuthProvider } from '@/lib/auth-context';
export default function RootLayout({ children }) {
  return <AuthProvider>{children}</AuthProvider>;
}
```

## Running Tests

```bash
cd backend
npm test              # unit tests
npm run test:e2e      # end-to-end tests
```

## Test Coverage

- ✅ Register with valid email
- ✅ Register with invalid email → 400
- ✅ Register with duplicate email → 409
- ✅ Register with short password → 400
- ✅ Login with correct credentials → JWT token
- ✅ Login with wrong password → 401
- ✅ Login with unknown email → 401
- ✅ JWT token validation on protected routes
- ✅ No token → 401
- ✅ Invalid token → 401
- ✅ API key generation
- ✅ API key guard
