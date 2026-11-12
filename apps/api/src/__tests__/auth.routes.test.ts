// Unit-level route tests with Prisma mocked. Full DB-backed auth flows
// (rotation, reuse detection, logout) live in auth.integration.test.ts.
import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../app';
import { prismaMock } from './setup';

async function csrfAgent() {
  const agent = request.agent(app);
  const res = await agent.get('/api/v1/csrf-token');
  return { agent, csrf: res.body.data.csrfToken as string };
}

const mockUser = {
  id: '6f1c2b9a-1111-4222-8333-444455556666',
  email: 'test@amdox.com',
  passwordHash: bcrypt.hashSync('Correct-Horse-1', 4),
  role: 'SUPER_ADMIN' as const,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('POST /api/v1/auth/login', () => {
  it('logs in, returns an access token and sets an httpOnly refresh cookie', async () => {
    prismaMock.user.findUnique.mockResolvedValue(mockUser);
    const { agent, csrf } = await csrfAgent();
    const res = await agent.post('/api/v1/auth/login').set('X-CSRF-Token', csrf)
      .send({ email: 'test@amdox.com', password: 'Correct-Horse-1' });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toEqual(expect.any(String));
    const cookie = String(res.headers['set-cookie']);
    expect(cookie).toMatch(/amx_rt=.*HttpOnly/);
    expect(prismaMock.session.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/) }),
    }));
  });

  it('returns 401 for a wrong password', async () => {
    prismaMock.user.findUnique.mockResolvedValue(mockUser);
    const { agent, csrf } = await csrfAgent();
    const res = await agent.post('/api/v1/auth/login').set('X-CSRF-Token', csrf)
      .send({ email: 'test@amdox.com', password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ success: false, message: 'Invalid email or password' });
  });

  it('returns 401 for an unknown user', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const { agent, csrf } = await csrfAgent();
    const res = await agent.post('/api/v1/auth/login').set('X-CSRF-Token', csrf)
      .send({ email: 'nobody@amdox.com', password: 'whatever' });
    expect(res.status).toBe(401);
  });

  it('returns 422 with field errors for an invalid body', async () => {
    const { agent, csrf } = await csrfAgent();
    const res = await agent.post('/api/v1/auth/login').set('X-CSRF-Token', csrf).send({ email: 'nope' });
    expect(res.status).toBe(422);
    expect(res.body.errors.fieldErrors).toHaveProperty('email');
  });

  it('rejects a POST without the CSRF header (403)', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'test@amdox.com', password: 'x' });
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Invalid CSRF token');
  });
});
