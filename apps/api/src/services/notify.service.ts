// In-app notifications (the bell in the web header). Failures are logged and
// swallowed: a notification must never break the business action that caused it.

import type { Role } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

type Kind = 'info' | 'success' | 'alert';

export async function notifyUsers(userIds: string[], type: Kind, title: string, body?: string) {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return;
  try {
    await prisma.notification.createMany({ data: unique.map((userId) => ({ userId, type, title, body })) });
  } catch (err) {
    logger.error('Failed to create notifications', { error: (err as Error).message, title });
  }
}

export async function notifyRoles(roles: readonly Role[], type: Kind, title: string, body?: string) {
  const users = await prisma.user.findMany({ where: { role: { in: [...roles] }, isActive: true }, select: { id: true } });
  await notifyUsers(users.map((u) => u.id), type, title, body);
}

/** Notifies the user linked to an employee, if there is one. */
export async function notifyEmployee(employeeId: string, type: Kind, title: string, body?: string) {
  const emp = await prisma.employee.findUnique({ where: { id: employeeId }, select: { userId: true } });
  if (emp?.userId) await notifyUsers([emp.userId], type, title, body);
}
