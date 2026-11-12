import { prisma } from '../../utils/prisma';
import { resetDb } from './helpers';

jest.setTimeout(30_000);

beforeAll(async () => {
  await resetDb();
});

afterAll(async () => {
  await prisma.$disconnect();
});
