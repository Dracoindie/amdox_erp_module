// Regression tests for the original crash: arbitrary sort/page/order values and
// unhandled promise rejections used to take the whole API process down.
import request from 'supertest';
import { app, prisma, loginAs } from './helpers';

let admin: Awaited<ReturnType<typeof loginAs>>;
beforeAll(async () => {
  admin = await loginAs('SUPER_ADMIN');
});

describe('list query validation (sort/page crash regression)', () => {
  it.each([
    ['/api/v1/employees?sort=doesNotExist'],
    ['/api/v1/employees?sort=passwordHash'],
    ['/api/v1/users?sort=__proto__'],
    ['/api/v1/finance/invoices?page=abc'],
    ['/api/v1/finance/invoices?page=0'],
    ['/api/v1/finance/invoices?page=-3'],
    ['/api/v1/customers?limit=1000'],
    ['/api/v1/customers?limit=2.5'],
    ['/api/v1/leads?order=sideways'],
    ['/api/v1/leads?stage=NOT_A_STAGE'],
    ['/api/v1/finance/expenses?unexpected=1'],
    ['/api/v1/inventory/products?sort[]=sku'],
  ])('GET %s → 422 with field errors', async (path) => {
    const res = await admin.agent.get(path).set(admin.auth);
    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({ success: false, message: 'Validation failed', errors: expect.any(Object) });
  });

  it('the API is still alive after all of the above', async () => {
    await request(app).get('/health').expect(200);
    await admin.agent.get('/api/v1/employees?sort=name&order=asc&page=1&limit=5').set(admin.auth).expect(200);
  });

  it('rejects a non-uuid :id param with 422 instead of reaching Prisma', async () => {
    const res = await admin.agent.get('/api/v1/customers/not-a-uuid').set(admin.auth);
    expect(res.status).toBe(422);
  });
});

describe('error mapping', () => {
  it('unknown record → 404 (P2025)', async () => {
    const res = await admin.agent.patch('/api/v1/customers/00000000-0000-4000-8000-000000000000')
      .set(admin.auth).send({ name: 'Ghost' });
    expect(res.status).toBe(404);
  });

  it('duplicate unique value → 409 (P2002)', async () => {
    await admin.agent.post('/api/v1/customers').set(admin.auth).send({ name: 'A', email: 'dup@test.amdox.com' }).expect(201);
    const res = await admin.agent.post('/api/v1/customers').set(admin.auth).send({ name: 'B', email: 'dup@test.amdox.com' });
    expect(res.status).toBe(409);
  });

  it('missing foreign key → 400 (P2003)', async () => {
    const res = await admin.agent.post('/api/v1/finance/invoices').set(admin.auth)
      .send({ customerId: '00000000-0000-4000-8000-000000000000', subtotal: 10 });
    expect(res.status).toBe(400);
  });

  it('malformed JSON → 400, not 500', async () => {
    const res = await admin.agent.post('/api/v1/customers').set(admin.auth)
      .set('Content-Type', 'application/json').send('{"name":');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ success: false, message: 'Malformed request' });
  });

  it('unknown body fields are rejected (no mass assignment into Prisma)', async () => {
    const supplierBefore = await prisma.supplier.count();
    const inv = await loginAs('INVENTORY_MANAGER');
    const res = await inv.agent.post('/api/v1/purchases/suppliers').set(inv.auth)
      .send({ name: 'Sneaky', id: '00000000-0000-4000-8000-000000000001' });
    expect(res.status).toBe(422);
    expect(await prisma.supplier.count()).toBe(supplierBefore);
  });

  it('unknown routes → 404 JSON', async () => {
    const res = await request(app).get('/api/v1/nope');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
