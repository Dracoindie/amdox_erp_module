import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// WCAG 2.1 A/AA (axe) and no horizontal overflow on key views, per role, at
// desktop / tablet / phone width in light and dark. Needs the same running
// API + web + seeded DB as smoke.spec.ts.

const ADMIN_PW = process.env.ADMIN_PASSWORD || 'Admin@1234';
const DEMO_PW = process.env.DEMO_PASSWORD || 'Demo@1234';

const VIEWS: Array<[role: string, path: string]> = [
  ['admin', '/'],
  ['admin', '/finance?tab=ledger'],
  ['admin', '/settings?tab=users'],
  ['finance', '/finance?tab=expenses'],
  ['hr', '/hr?tab=payroll'],
  ['employee', '/finance'], // My expenses
  ['employee', '/hr?tab=payroll'], // My payslips
];

for (const [role, path] of VIEWS) {
  test(`${role} ${path}: no WCAG 2.1 AA violations or overflow`, async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(`${role}@amdox.com`);
    await page.getByLabel('Password', { exact: true }).fill(role === 'admin' ? ADMIN_PW : DEMO_PW);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 });

    for (const width of [1440, 768, 390]) {
      for (const colorScheme of ['light', 'dark'] as const) {
        await page.emulateMedia({ colorScheme });
        await page.setViewportSize({ width, height: 900 });
        await page.goto(path);
        await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
        await expect(page.locator('[role="status"][aria-label="Loading"]')).toHaveCount(0, { timeout: 15_000 });

        const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
        const found = violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
        expect(found, `${path} at ${width}px ${colorScheme}`).toEqual([]);

        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, `horizontal overflow on ${path} at ${width}px`).toBeLessThanOrEqual(1);
      }
    }
  });
}
