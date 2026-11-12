// Shared helpers for integration tests (real Postgres via Prisma).
import request from 'supertest';
import bcrypt from 'bcryptjs';
import type { Role } from '@prisma/client';
import app from '../../app';
import { prisma } from '../../utils/prisma';

export { app, prisma };

/** Empties every table (fast, keeps the schema). */
export async function resetDb() {
  const rows = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (rows.length) {
    const list = rows.map((r) => `"public"."${r.tablename}"`).join(', ');
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
  }
}

export const PASSWORD = 'Test-Password-123';
const passwordHash = bcrypt.hashSync(PASSWORD, 4);
let seq = 0;

export async function createUser(role: Role, opts: { withEmployee?: boolean } = {}) {
  seq += 1;
  const email = `${role.toLowerCase()}-${seq}-${Date.now()}@test.amdox.com`;
  const user = await prisma.user.create({ data: { email, passwordHash, role } });
  const employee = opts.withEmployee
    ? await prisma.employee.create({
        data: { userId: user.id, name: `${role} ${seq}`, email, grossSalary: 60000, joinDate: new Date('2025-01-01') },
      })
    : null;
  return { user, employee, email };
}

/** A supertest agent that keeps cookies, plus its CSRF token. */
export async function newAgent() {
  const agent = request.agent(app);
  const res = await agent.get('/api/v1/csrf-token').expect(200);
  return { agent, csrf: res.body.data.csrfToken as string };
}

/** Creates a user with the role and logs in. Returns agent, csrf and bearer token. */
export async function loginAs(role: Role, opts: { withEmployee?: boolean } = {}) {
  const created = await createUser(role, opts);
  const { agent, csrf } = await newAgent();
  const res = await agent
    .post('/api/v1/auth/login')
    .set('X-CSRF-Token', csrf)
    .send({ email: created.email, password: PASSWORD })
    .expect(200);
  const token = res.body.data.accessToken as string;
  return { ...created, agent, csrf, token, auth: { Authorization: `Bearer ${token}`, 'X-CSRF-Token': csrf } };
}

/** Reads the refresh cookie value from a supertest response. */
export function refreshCookie(res: request.Response): string | undefined {
  const cookies = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
  const c = cookies.find((v) => v.startsWith('amx_rt='));
  return c?.split(';')[0]?.slice('amx_rt='.length) || undefined;
}
