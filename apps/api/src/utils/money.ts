// Money is stored as DECIMAL(14,2) and handled as Prisma.Decimal (decimal.js),
// never as floating point. The API serialises Decimal values as strings
// (e.g. "1234.50"); see Money in @repo/types.

import { Prisma } from '@prisma/client';
import { z } from 'zod';

export const Decimal = Prisma.Decimal;
export type Decimal = Prisma.Decimal;

const MAX = new Prisma.Decimal('999999999999.99');

/** Accepts 12.5, "12.50" etc. Rejects NaN, >2 decimals, and out-of-range values. */
export const money = z
  .union([z.number(), z.string().trim().regex(/^-?\d+(\.\d+)?$/, 'Must be a number')])
  .transform((v, ctx) => {
    let d: Prisma.Decimal;
    try {
      d = new Prisma.Decimal(v);
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Must be a number', fatal: true });
      return z.NEVER;
    }
    if (!d.isFinite()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Must be a finite number', fatal: true });
      return z.NEVER;
    }
    if (d.decimalPlaces() > 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'At most 2 decimal places', fatal: true });
      return z.NEVER;
    }
    if (d.abs().gt(MAX)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Amount is too large', fatal: true });
      return z.NEVER;
    }
    return d;
  });

export const nonNegativeMoney = money.refine((d) => d.gte(0), 'Must be zero or more');
export const positiveMoney = money.refine((d) => d.gt(0), 'Must be greater than 0');

export function sum(values: Iterable<Prisma.Decimal.Value>): Prisma.Decimal {
  let total = new Prisma.Decimal(0);
  for (const v of values) total = total.plus(v);
  return total;
}

/** Rounds half-up to cents. */
export function cents(v: Prisma.Decimal.Value): Prisma.Decimal {
  return new Prisma.Decimal(v).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

/** v × rate, rounded to cents. */
export function pct(v: Prisma.Decimal.Value, rate: Prisma.Decimal.Value): Prisma.Decimal {
  return cents(new Prisma.Decimal(v).times(rate));
}
