import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.setGlobalPrefix('api/v1');
    await app.init();

    prisma = app.get(PrismaService);
    // Clean up test users
    await prisma.user.deleteMany({ where: { email: { contains: 'test@example' } } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: 'test@example' } } });
    await app.close();
  });

  // ─── Register ──────────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/register', () => {
    it('✅ registers with valid email + password', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'test@example.com', password: 'Password123' })
        .expect(201);

      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toMatchObject({ email: 'test@example.com' });
      expect(res.body.user).not.toHaveProperty('password');
      authToken = res.body.token;
    });

    it('❌ rejects duplicate email', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'test@example.com', password: 'Password123' })
        .expect(409);
    });

    it('❌ rejects invalid email format', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'not-an-email', password: 'Password123' })
        .expect(400);
    });

    it('❌ rejects short password', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'test2@example.com', password: 'short' })
        .expect(400);
    });

    it('❌ rejects missing fields', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'test3@example.com' })
        .expect(400);
    });
  });

  // ─── Login ─────────────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/login', () => {
    it('✅ logs in with correct credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'Password123' })
        .expect(200);

      expect(res.body).toHaveProperty('token');
      expect(res.body.user.email).toBe('test@example.com');
      authToken = res.body.token;
    });

    it('❌ rejects wrong password', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'wrongpassword' })
        .expect(401);
    });

    it('❌ rejects unknown email', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@example.com', password: 'Password123' })
        .expect(401);
    });
  });

  // ─── Protected Endpoints ───────────────────────────────────────────────────

  describe('GET /api/v1/auth/me', () => {
    it('✅ returns profile with valid token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toMatchObject({ email: 'test@example.com' });
    });

    it('❌ rejects request with no token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .expect(401);
    });

    it('❌ rejects request with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);
    });
  });

  // ─── API Key ───────────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/api-key', () => {
    it('✅ generates API key for authenticated user', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/api-key')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(res.body.apiKey).toMatch(/^sk-/);
    });

    it('❌ rejects without JWT', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/api-key')
        .expect(401);
    });
  });
});
