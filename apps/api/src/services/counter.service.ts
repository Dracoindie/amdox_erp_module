import type { Prisma } from '@prisma/client';

/**
 * Atomically increments and returns the counter `name`.
 * INSERT ... ON CONFLICT DO UPDATE takes a row lock, so concurrent callers
 * always receive distinct, gap-free values (within committed transactions).
 */
export async function nextCounterValue(tx: Prisma.TransactionClient, name: string): Promise<number> {
  const rows = await tx.$queryRaw<{ value: number }[]>`
    INSERT INTO "counters" ("name", "value") VALUES (${name}, 1)
    ON CONFLICT ("name") DO UPDATE SET "value" = "counters"."value" + 1
    RETURNING "value"`;
  return rows[0]!.value;
}
