import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app, prisma, loginAs, newAgent, refreshCookie, createUser, PASSWORD } from './helpers';
import { REUSE_GRACE_MS } from '../../services/session.service';

/** Calls /auth/refresh presenting an explicit refresh cookie (simulates a replayed token). */
async function refreshWith(token: string) {
  const { csrf } = await newAgent();
  return request(app)
    .post('/api/v1/auth/refresh')
    .set('Cookie', `amx_rt=${token}; amx_csrf=${csrf}`)
    .set('X-CSRF-Token', csrf)
    .send({});
}

async function loginFresh() {
  const s = await loginAs('EMPLOYEE');
  const sessions = await prisma.session.findMany({ where: { userId: s.user.id } });
  expect(sessions).toHaveLength(1);
  return s;
}

describe('access tokens', () => {
  it('rejects a token signed with the old hardcoded fallback secret', async () => {
    const forged = jwt.sign({ userId: 'x', email: 'x@x', role: 'SUPER_ADMIN' }, 'amdox-access-secret-change-in-prod');
    const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${forged}`);
    expect(res.status).toBe(401);
  });

  it('accepts a real token on /auth/me', async () => {
    const s = await loginAs('HR_MANAGER', { withEmployee: true });
    const res = await request(app).get('/api/v1/auth/me').set(s.auth).expect(200);
    expect(res.body.data).toMatchObject({ id: s.user.id, role: 'HR_MANAGER', employee: { id: s.employee!.id } });
  });
});

describe('refresh rotation', () => {
  it('issues a new refresh token on every refresh and the new access token works', async () => {
    const s = await loginFresh();
    const res = await s.agent.post('/api/v1/auth/refresh').set('X-CSRF-Token', s.csrf).send({}).expect(200);
    const next = refreshCookie(res);
    expect(next).toBeDefined();

    const rows = await prisma.session.findMany({ where: { userId: s.user.id }, orderBy: { createdAt: 'asc' } });
    expect(rows).toHaveLength(2);
    expect(rows[0]!.rotatedAt).not.toBeNull();
    expect(rows[1]!.rotatedAt).toBeNull();
    expect(rows[0]!.familyId).toBe(rows[1]!.familyId);

    await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${res.body.data.accessToken}`).expect(200);
  });

  it('detects reuse of a rotated token and revokes every session of the user', async () => {
    const victim = await createUser('EMPLOYEE');
    // A second device of the same user — must also be revoked
    const other = await newAgent();
    await other.agent.post('/api/v1/auth/login').set('X-CSRF-Token', other.csrf)
      .send({ email: victim.email, password: PASSWORD }).expect(200);

    const v = await newAgent();
    const login = await v.agent.post('/api/v1/auth/login').set('X-CSRF-Token', v.csrf)
      .send({ email: victim.email, password: PASSWORD }).expect(200);
    const stolen = refreshCookie(login)!;
    await v.agent.post('/api/v1/auth/refresh').set('X-CSRF-Token', v.csrf).send({}).expect(200);
    // Pretend the rotation happened long ago, outside the grace window
    await prisma.session.updateMany({
      where: { userId: victim.user.id, rotatedAt: { not: null } },
      data: { rotatedAt: new Date(Date.now() - REUSE_GRACE_MS - 5_000) },
    });

    const replay = await refreshWith(stolen);
    expect(replay.status).toBe(401);
    expect(replay.body.message).toMatch(/reuse detected/i);

    const live = await prisma.session.count({ where: { userId: victim.user.id, revokedAt: null } });
    expect(live).toBe(0);
    // The legitimate holder of the newest token and the other device are logged out too
    await v.agent.post('/api/v1/auth/refresh').set('X-CSRF-Token', v.csrf).send({}).expect(401);
    await other.agent.post('/api/v1/auth/refresh').set('X-CSRF-Token', other.csrf).send({}).expect(401);
  });

  it('treats reuse inside the grace window as a race: 401 without revoking', async () => {
    const victim = await createUser('EMPLOYEE');
    const v = await newAgent();
    const login = await v.agent.post('/api/v1/auth/login').set('X-CSRF-Token', v.csrf)
      .send({ email: victim.email, password: PASSWORD }).expect(200);
    const original = refreshCookie(login)!;
    await v.agent.post('/api/v1/auth/refresh').set('X-CSRF-Token', v.csrf).send({}).expect(200);

    const replay = await refreshWith(original);
    expect(replay.status).toBe(401);
    expect(replay.body.message).toMatch(/already used/i);
    // The newest session still works
    await v.agent.post('/api/v1/auth/refresh').set('X-CSRF-Token', v.csrf).send({}).expect(200);
  });

  it('refuses refresh for a disabled account', async () => {
    const s = await loginFresh();
    await prisma.user.update({ where: { id: s.user.id }, data: { isActive: false } });
    await s.agent.post('/api/v1/auth/refresh').set('X-CSRF-Token', s.csrf).send({}).expect(401);
  });
});

describe('CSRF on the refresh path', () => {
  it('rejects refresh without the X-CSRF-Token header (403)', async () => {
    const s = await loginFresh();
    const res = await s.agent.post('/api/v1/auth/refresh').send({});
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Invalid CSRF token');
  });

  it('rejects refresh with a mismatching CSRF header (403)', async () => {
    const s = await loginFresh();
    await s.agent.post('/api/v1/auth/refresh').set('X-CSRF-Token', 'f'.repeat(64)).send({}).expect(403);
  });

  it('accepts refresh with the matching header', async () => {
    const s = await loginFresh();
    await s.agent.post('/api/v1/auth/refresh').set('X-CSRF-Token', s.csrf).send({}).expect(200);
  });
});

describe('logout', () => {
  it('revokes only its own session', async () => {
    const s = await loginFresh();
    const { agent: other, csrf: otherCsrf } = await newAgent();
    await other.post('/api/v1/auth/login').set('X-CSRF-Token', otherCsrf).send({ email: s.email, password: PASSWORD }).expect(200);

    const res = await s.agent.post('/api/v1/auth/logout').set('X-CSRF-Token', s.csrf).send({}).expect(200);
    expect(String(res.headers['set-cookie'])).toMatch(/amx_rt=;/);

    await s.agent.post('/api/v1/auth/refresh').set('X-CSRF-Token', s.csrf).send({}).expect(401);
    await other.post('/api/v1/auth/refresh').set('X-CSRF-Token', otherCsrf).send({}).expect(200);
  });

  it('a logged-out refresh token cannot be replayed', async () => {
    const victim = await createUser('EMPLOYEE');
    const v = await newAgent();
    const login = await v.agent.post('/api/v1/auth/login').set('X-CSRF-Token', v.csrf)
      .send({ email: victim.email, password: PASSWORD }).expect(200);
    const token = refreshCookie(login)!;
    await v.agent.post('/api/v1/auth/logout').set('X-CSRF-Token', v.csrf).send({}).expect(200);
    const replay = await refreshWith(token);
    expect(replay.status).toBe(401);
    expect(replay.body.message).toMatch(/revoked/i);
  });
});
