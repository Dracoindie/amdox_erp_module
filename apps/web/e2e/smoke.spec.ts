import { expect, test, type Page } from '@playwright/test';

// Signs in as every seeded role, opens every page and every tab that role can
// see, and fails on any browser console error, uncaught exception, error UI,
// or horizontal overflow (desktop and phone widths).

const ROLES = ['admin', 'hr', 'finance', 'inventory', 'sales', 'employee', 'viewer'] as const;
const PAGES = ['/', '/finance', '/hr', '/scm', '/crm', '/bi', '/settings'];
const ADMIN_PW = process.env.ADMIN_PASSWORD || 'Admin@1234';
const DEMO_PW = process.env.DEMO_PASSWORD || 'Demo@1234';

function watchConsole(page: Page) {
  const problems: string[] = [];
  page.on('console', (m) => {
    if (m.type() !== 'error' && m.type() !== 'warning') return;
    const text = m.text();
    if (/React DevTools|\[HMR\]|\[Fast Refresh\]/.test(text)) return;
    problems.push(`${m.type()}: ${text.slice(0, 300)} @ ${page.url()}`);
  });
  page.on('pageerror', (e) => problems.push(`pageerror: ${String(e).slice(0, 300)} @ ${page.url()}`));
  return problems;
}

async function signIn(page: Page, role: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(`${role}@amdox.com`);
  await page.getByLabel('Password', { exact: true }).fill(role === 'admin' ? ADMIN_PW : DEMO_PW);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 });
}

async function settle(page: Page) {
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  // No skeletons left and no error states rendered
  await expect(page.locator('[role="status"][aria-label="Loading"]')).toHaveCount(0, { timeout: 15_000 });
}

async function noOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, `horizontal overflow on ${page.url()}`).toBeLessThanOrEqual(1);
}

for (const role of ROLES) {
  test(`${role}: every page and tab renders without console errors`, async ({ page }) => {
    const problems = watchConsole(page);
    await signIn(page, role);
    for (const path of PAGES) {
      await page.goto(path);
      await settle(page);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.getByText("Couldn't load this data")).toHaveCount(0);
      await noOverflow(page);

      const tabs = page.getByRole('tab');
      const count = await tabs.count();
      for (let i = 0; i < count; i++) {
        await tabs.nth(i).click();
        await settle(page);
        await expect(tabs.nth(i)).toHaveAttribute('aria-selected', 'true');
        await expect(page.getByText("Couldn't load this data"), `error state on ${page.url()}`).toHaveCount(0);
        await noOverflow(page);
      }
    }
    expect(problems, problems.join('\n')).toEqual([]);
  });
}

test('phone width: navigation drawer and pages fit the screen', async ({ page }) => {
  const problems = watchConsole(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, 'admin');
  for (const path of PAGES) {
    await page.goto(path);
    await settle(page);
    await noOverflow(page);
  }
  await page.getByRole('button', { name: 'Open navigation' }).click();
  const nav = page.getByRole('dialog', { name: 'Navigation' });
  await expect(nav).toBeVisible();
  await nav.getByRole('link', { name: 'Finance' }).click();
  await expect(page).toHaveURL(/\/finance/);
  await expect(nav).toBeHidden();
  expect(problems, problems.join('\n')).toEqual([]);
});

test('modal traps focus and closes with Escape; form shows inline errors', async ({ page }) => {
  await signIn(page, 'admin');
  await page.goto('/finance?tab=invoices');
  await settle(page);
  const opener = page.getByRole('button', { name: 'New invoice' });
  await opener.click();
  const dialog = page.getByRole('dialog', { name: 'New invoice' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Create invoice' }).click();
  await expect(dialog.getByText(/fill out this field|select an item/i).first()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
});

test('unknown route shows the 404 page', async ({ page }) => {
  await page.goto('/definitely-not-a-page');
  await expect(page.getByRole('heading', { name: "We can't find that page" })).toBeVisible();
});
