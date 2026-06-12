# FEATURE 3: Connect to Main App
> FOR AI AGENTS: Apply these exact changes to wire Feature 3 into the app.

---

## 1. src/main.ts — Add security setup

Find your existing `main.ts` and apply this diff:

```diff
 import { NestFactory } from '@nestjs/core';
 import { AppModule } from './app.module';
+import { ValidationPipe } from '@nestjs/common';
+import { applySecurityConfig } from './security.config';

 async function bootstrap() {
   const app = await NestFactory.create(AppModule);

+  // Feature 3: Security hardening
+  await applySecurityConfig(app);

+  // Feature 3: Global input validation
+  app.useGlobalPipes(
+    new ValidationPipe({
+      whitelist: true,        // strip unknown properties
+      forbidNonWhitelisted: true,
+      transform: true,        // auto-cast query params to their DTO types
+      transformOptions: { enableImplicitConversion: true },
+    }),
+  );

   await app.listen(process.env.PORT ?? 3001);
 }
 bootstrap();
```

---

## 2. src/app.module.ts — Add Throttler + Security Middleware

```diff
 import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
+import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
+import { APP_GUARD } from '@nestjs/core';
+import { SecurityMiddleware } from './middleware/security.middleware';
 // ... your existing imports

 @Module({
   imports: [
     // ... your existing modules
+    ThrottlerModule.forRoot([
+      {
+        name: 'default',
+        ttl: parseInt(process.env.THROTTLE_TTL ?? '60000'),
+        limit: parseInt(process.env.THROTTLE_LIMIT ?? '100'),
+      },
+    ]),
   ],
+  providers: [
+    // ... your existing providers
+    {
+      provide: APP_GUARD,
+      useClass: ThrottlerGuard,  // applies rate limiting globally
+    },
+  ],
 })
-export class AppModule {}
+export class AppModule implements NestModule {
+  configure(consumer: MiddlewareConsumer) {
+    consumer.apply(SecurityMiddleware).forRoutes('*');
+  }
+}
```

---

## 3. Update auth.service.ts — Hash API Keys

In your existing `src/auth/auth.service.ts`, replace raw API key storage:

```diff
+import { hashApiKey, generateApiKey } from '../middleware/security.middleware';

 async generateApiKey(userId: string): Promise<string> {
-  const key = crypto.randomBytes(32).toString('hex');
-  await this.prisma.user.update({
-    where: { id: userId },
-    data: { apiKey: key },
-  });
-  return key;
+  const { raw, hashed } = generateApiKey();
+  await this.prisma.user.update({
+    where: { id: userId },
+    data: { apiKeyHash: hashed },  // ONLY store the hash
+  });
+  return raw;  // Return raw key ONCE — user must save it
 }

 async validateApiKey(rawKey: string): Promise<User | null> {
-  return this.prisma.user.findFirst({ where: { apiKey: rawKey } });
+  const hashed = hashApiKey(rawKey);
+  return this.prisma.user.findFirst({ where: { apiKeyHash: hashed } });
 }
```

---

## 4. Prisma schema update for hashed API keys

```diff
 model User {
   id        String   @id @default(uuid())
   email     String   @unique
   password  String
-  apiKey    String?  @unique
+  apiKeyHash String? @unique  // SHA-256 hash of the raw key
   createdAt DateTime @default(now())
   updatedAt DateTime @updatedAt
 }
```

Run: `npx prisma migrate dev --name hash_api_keys`

---

## 5. .env additions

```env
CORS_ORIGINS=http://localhost:3000
THROTTLE_TTL=60000
THROTTLE_LIMIT=100
HELMET_ENABLED=true
```

---

## 6. Install dependencies

```bash
npm install helmet @nestjs/throttler class-validator class-transformer
```

---

## Verification

```bash
# Security headers present
curl -I http://localhost:3001/health

# CORS rejection
curl -H "Origin: http://evil.com" http://localhost:3001/auth/login

# Rate limiting (run 101 times fast)
for i in $(seq 1 101); do curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/health; done
# Last responses should be 429

# Input validation
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "not-an-email", "password": "weak"}'
# Should return 400 with validation errors
```
