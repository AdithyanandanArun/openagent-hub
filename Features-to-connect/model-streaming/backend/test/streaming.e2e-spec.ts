// test/streaming.e2e-spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Model Streaming (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.setGlobalPrefix('api/v1');
    await app.init();

    // Register + login to get token
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: `stream-test-${Date.now()}@example.com`, password: 'Password123' });
    authToken = res.body.token;
  });

  afterAll(async () => {
    await app.close();
  });

  // ─── GET /models ────────────────────────────────────────────────────────────

  describe('GET /api/v1/models', () => {
    it('✅ returns model list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/models')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('models');
      expect(Array.isArray(res.body.models)).toBe(true);
    });

    it('✅ returns provider list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/models/providers')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('providers');
    });

    it('✅ health check endpoint', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/models/health')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('providers');
    });

    it('❌ rejects unauthenticated request', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/models')
        .expect(401);
    });
  });

  // ─── POST /chat/complete ─────────────────────────────────────────────────────

  describe('POST /api/v1/chat/complete', () => {
    it('❌ rejects missing model field', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/chat/complete')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ messages: [{ role: 'user', content: 'hi' }] })
        .expect(400);
    });

    it('❌ rejects empty messages array', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/chat/complete')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ model: 'gpt-4o', messages: [] })
        .expect(400);
    });

    it('❌ rejects invalid role', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/chat/complete')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ model: 'gpt-4o', messages: [{ role: 'robot', content: 'hi' }] })
        .expect(400);
    });

    it('❌ rejects unauthenticated request', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/chat/complete')
        .send({ model: 'gpt-4o', messages: [{ role: 'user', content: 'hi' }] })
        .expect(401);
    });

    // NOTE: Live LLM tests require a real API key configured in .env
    // Run these manually with: OPENAI_API_KEY=sk-... npm run test:e2e
    it.skip('✅ [LIVE] returns complete response', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/chat/complete')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          model:    'gpt-4o-mini',
          messages: [{ role: 'user', content: 'Say exactly: hello world' }],
          maxTokens: 10,
        })
        .expect(200);

      expect(res.body.content).toBeTruthy();
      expect(res.body.model).toBeTruthy();
      expect(res.body.provider).toBe('openai');
    });
  });

  // ─── POST /chat/stream ───────────────────────────────────────────────────────

  describe('POST /api/v1/chat/stream', () => {
    it('❌ rejects unauthenticated', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/chat/stream')
        .send({ model: 'gpt-4o', messages: [{ role: 'user', content: 'hi' }] })
        .expect(401);
    });

    it('❌ rejects bad payload', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/chat/stream')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ messages: [{ role: 'user', content: 'hi' }] })  // missing model
        .expect(400);
    });

    it.skip('✅ [LIVE] streams SSE tokens', (done) => {
      const chunks: string[] = [];

      request(app.getHttpServer())
        .post('/api/v1/chat/stream')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Accept', 'text/event-stream')
        .send({
          model:     'gpt-4o-mini',
          messages:  [{ role: 'user', content: 'Count to 3, one word per line' }],
          maxTokens: 20,
        })
        .buffer(true)
        .parse((res, callback) => {
          res.on('data', (chunk: Buffer) => chunks.push(chunk.toString()));
          res.on('end', () => callback(null, chunks.join('')));
        })
        .expect(200)
        .end((err, res) => {
          expect(err).toBeNull();
          const raw = res.body as string;
          expect(raw).toContain('data:');
          // Should have at least one token and a done event
          expect(raw).toContain('"type":"token"');
          expect(raw).toContain('"type":"done"');
          done();
        });
    });
  });
});
