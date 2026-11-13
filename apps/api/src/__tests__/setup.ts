// Prisma mock for unit tests. Integration tests (*.integration.test.ts) opt out
// with jest.unmock('../utils/prisma') and use a real Postgres database.
import { PrismaClient } from '@prisma/client';
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';
import { prisma } from '../utils/prisma';

jest.mock('../utils/prisma', () => ({
  __esModule: true,
  prisma: mockDeep<PrismaClient>(),
}));

export const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

beforeEach(() => {
  mockReset(prismaMock);
});
