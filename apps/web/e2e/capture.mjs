// UI audit capture: screenshots every page / tab / state for every seeded role,
// at three widths, light + dark. Also records console errors, horizontal
// overflow and axe-core accessibility violations.
//
//   node e2e/capture.mjs <outDir> [--quick]
//
// Env: WEB_URL (default http://localhost:3000), DEMO_PASSWORD / ADMIN_PASSWORD
// (default to the seed defaults).

import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
import path from 'node:path';

const WEB = process.env.WEB_URL ?? 'http://localhost:3000';
const OUT = path.resolve(process.argv[2] ?? '../../ui-audit/before');
const QUICK = process.argv.includes('--quick');
const EXTRAS_ONLY = process.argv.includes('--extras-only');
const ADMIN_PW = process.env.ADMIN_PASSWORD || 'Admin@1234';
const DEMO_PW = process.env.DEMO_PASSWORD || 'Demo@1234';

const WIDTHS = { desktop: 1440, tablet: 768, mobile: 390 };
const ROLES = ['admin', 'hr', 'finance', 'inventory', 'sales', 'employee', 'viewer'];

// path, tabs (by visible tab label; null = page has no tabs)
const PAGES = [
  { id: 'dashboard', path: '/', tabs: null },
  { id: 'finance', path: '/finance', tabs: ['General ledger', 'Invoices', 'Expenses', 'Budgets', 'Reports'] },
  { id: 'hr', path: '/hr', tabs: ['Directory', 'Leave', 'Attendance', /^(Payroll|My payslips)$/, 'Org chart'] },
  { id: 'scm', path: '/scm', tabs: ['Inventory', 'Purchase orders', 'Vendors', 'Demand forecast'] },
  { id: 'crm', path: '/crm', tabs: ['Pipeline', 'Customers', 'Sales orders'] },
  { id: 'bi', path: '/bi', tabs: ['Dashboards', 'Report builder'] },
  { id: 'settings', path: '/settings', tabs: ['General', 'Users & roles', 'Audit log', 'System health'] },
];

// Modals opened from a page/tab by a button label (admin only)
const MODALS = [
  { page: '/finance', tab: 'General ledger', button: /new entry/i, id: 'finance-journal' },
  { page: '/finance', tab: 'Invoices', button: /new invoice/i, id: 'finance-invoice' },
  { page: '/hr', tab: 'Directory', button: /add employee/i, id: 'hr-employee' },
  { page: '/scm', tab: 'Inventory', button: /record movement/i, id: 'scm-movement' },
  { page: '/scm', tab: 'Inventory', button: /new product/i, id: 'scm-product' },
  { page: '/scm', tab: 'Purchase orders', button: /new purchase order/i, id: 'scm-po' },
  { page: '/crm', tab: 'Pipeline', button: /new lead/i, id: 'crm-lead' },
  { page: '/crm', tab: 'Sales orders', button: /new order/i, id: 'crm-order' },
];

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
fs.mkdirSync(OUT, { recursive: true });

const report = { consoleErrors: [], overflow: [], axe: {}, missing: [] };

function record(ctxLabel, page) {
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') {
      const text = m.text();
      if (/Download the React DevTools|\[HMR\]|\[Fast Refresh\]/.test(text)) return;
      report.consoleErrors.push({ where: `${ctxLabel} ${page.url()}`, type: m.type(), text: text.slice(0, 400) });
    }
  });
  page.on('pageerror', (e) => report.consoleErrors.push({ where: `${ctxLabel} ${page.url()}`, type: 'pageerror', text: String(e).slice(0, 400) }));
}

async function settle(page, ms = 500) {
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => undefined);
  await page.waitForTimeout(ms);
}

async function overflowCheck(page, name) {
  const o = await page.evaluate(() => {
    const doc = document.documentElement;
    const main = document.querySelector('main');
    return {
      page: doc.scrollWidth - doc.clientWidth,
      main: main ? main.scrollWidth - main.clientWidth : 0,
    };
  });
  if (o.page > 1 || o.main > 1) report.overflow.push({ name, ...o });
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
}

async function login(page, role) {
  await page.goto(`${WEB}/login`);
  await page.locator('input[type=email]').fill(`${role}@amdox.com`);
  await page.locator('input[type=password]').fill(role === 'admin' ? ADMIN_PW : DEMO_PW);
  await page.locator('button[type=submit]').click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 });
  await settle(page);
}

async function openTab(page, label) {
  const tab = label instanceof RegExp ? page.getByRole('tab', { name: label }) : page.getByRole('tab', { name: label, exact: true });
  if (!(await tab.count())) {
    report.missing.push(`tab "${label}" on ${page.url()}`);
    return false;
  }
  await tab.first().click();
  await settle(page);
  return true;
}

async function newContext(browser, theme, width) {
  const ctx = await browser.newContext({
    viewport: { width, height: 900 },
    colorScheme: theme,
    deviceScaleFactor: 1,
  });
  // Both the old toggle key and the new theme key, so the same script works before and after
  await ctx.addInitScript((t) => {
    try {
      localStorage.setItem('amx_dark_mode', String(t === 'dark'));
      localStorage.setItem('amx_theme', t);
    } catch { /* ignore */ }
  }, theme);
  return ctx;
}

async function capturePages(browser, role, theme, widths) {
  const ctx = await newContext(browser, theme, 1440);
  const page = await ctx.newPage();
  record(`${role}/${theme}`, page);
  await login(page, role);
  for (const p of PAGES) {
    await page.goto(`${WEB}${p.path}`);
    await settle(page, 800);
    const views = p.tabs ?? [null];
    for (const t of views) {
      if (t && !(await openTab(page, t))) continue;
      const base = `${role}--${p.id}${t ? `--${slug(t instanceof RegExp ? 'payroll' : t)}` : ''}--${theme}`;
      for (const [wName, w] of widths) {
        await page.setViewportSize({ width: w, height: 900 });
        await page.waitForTimeout(350);
        await shot(page, `${base}--${wName}`);
        await overflowCheck(page, `${base}--${wName}`);
      }
      await page.setViewportSize({ width: 1440, height: 900 });
      if (role === 'admin' && theme === 'light') {
        const key = `${p.id}${t ? `/${t instanceof RegExp ? 'payroll' : t}` : ''}`;
        const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze().catch(() => null);
        if (res) report.axe[key] = res.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length, sample: v.nodes.slice(0, 2).map((n) => n.target.join(' ')) }));
      }
    }
  }
  await ctx.close();
}

async function captureExtras(browser, theme) {
  const role = 'admin';
  for (const [wName, w] of [['desktop', 1440], ['mobile', 390]]) {
    const ctx = await newContext(browser, theme, w);
    const page = await ctx.newPage();
    record(`extras/${theme}/${wName}`, page);
    await login(page, role);

    // Modals
    for (const m of MODALS) {
      await page.goto(`${WEB}${m.page}`);
      await settle(page);
      await openTab(page, m.tab);
      const btn = page.getByRole('button', { name: m.button });
      if (!(await btn.count())) { report.missing.push(`modal button ${m.button} on ${m.page}/${m.tab}`); continue; }
      await btn.first().click();
      await settle(page, 400);
      await shot(page, `modal--${m.id}--${theme}--${wName}`);
      if (m.id === 'finance-invoice') {
        await page.getByRole('dialog').getByRole('button', { name: /create invoice/i }).click().catch(() => undefined);
        await page.waitForTimeout(300);
        await shot(page, `form--invoice-validation--${theme}--${wName}`);
      }
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
    }

    // Notification bell dropdown
    await page.goto(`${WEB}/`);
    await settle(page);
    const bell = page.getByRole('button', { name: /notifications/i });
    if (await bell.count()) {
      await bell.first().click();
      await settle(page, 400);
      await shot(page, `dropdown--notifications--${theme}--${wName}`);
      await page.keyboard.press('Escape');
    }

    // Mobile navigation (if a menu button exists)
    if (wName === 'mobile') {
      const menu = page.getByRole('button', { name: /menu|navigation/i });
      if (await menu.count()) {
        await menu.first().click();
        await page.waitForTimeout(400);
        await shot(page, `dropdown--mobile-nav--${theme}--${wName}`);
        await page.keyboard.press('Escape');
      } else {
        report.missing.push('mobile navigation toggle');
      }
    }

    // Validation: submit an invalid expense (server-side 422) and an empty required form
    await page.goto(`${WEB}/finance`);
    await settle(page);
    await openTab(page, 'Expenses');
    const submit = page.getByRole('button', { name: /^submit( expense)?$/i });
    if (await submit.count()) {
      await submit.first().click();
      await page.waitForTimeout(400);
      await shot(page, `form--expense-empty-submit--${theme}--${wName}`);
    }

    // Loading state: delay all data calls
    await page.route('**/api/v1/**', async (route) => {
      const u = route.request().url();
      if (/\/auth\/|csrf-token/.test(u)) return route.continue();
      await new Promise((r) => setTimeout(r, 6000));
      return route.continue().catch(() => undefined);
    });
    for (const p of ['/', '/finance', '/bi']) {
      await page.goto(`${WEB}${p}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1800);
      await shot(page, `state--loading--${slug(p) || 'dashboard'}--${theme}--${wName}`);
    }
    await page.unroute('**/api/v1/**');

    // Empty state: list endpoints return []
    await page.route('**/api/v1/**', async (route) => {
      const u = new URL(route.request().url());
      if (route.request().method() !== 'GET' || /\/auth\/|csrf-token|\/bi\/|\/notifications|\/budget|\/health|system-health/.test(u.pathname)) return route.continue();
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } }) });
    });
    for (const [p, tab] of [['/finance', 'General ledger'], ['/hr', 'Directory'], ['/scm', 'Inventory'], ['/crm', 'Customers'], ['/crm', 'Pipeline']]) {
      await page.goto(`${WEB}${p}`);
      await settle(page);
      await openTab(page, tab);
      await shot(page, `state--empty--${slug(p)}-${slug(tab)}--${theme}--${wName}`);
    }
    await page.unroute('**/api/v1/**');

    // Error state: data endpoints fail (500), session endpoints still work
    await page.route('**/api/v1/**', async (route) => {
      const u = route.request().url();
      if (/\/auth\/|csrf-token/.test(u)) return route.continue();
      return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Internal server error' }) });
    });
    for (const p of ['/', '/finance', '/hr', '/bi']) {
      await page.goto(`${WEB}${p}`);
      await settle(page);
      await shot(page, `state--error--${slug(p) || 'dashboard'}--${theme}--${wName}`);
    }
    await page.unroute('**/api/v1/**');

    // API completely down (network error on every call, including session restore)
    await page.route('**/api/v1/**', (route) => route.abort('connectionrefused'));
    await page.goto(`${WEB}/finance`);
    await settle(page, 1500);
    await shot(page, `state--api-down--${theme}--${wName}`);
    await page.unroute('**/api/v1/**');

    // 404 + forbidden
    await page.goto(`${WEB}/this-page-does-not-exist`);
    await settle(page);
    await shot(page, `state--404--${theme}--${wName}`);

    await ctx.close();
  }

  // Public pages
  for (const [wName, w] of Object.entries(WIDTHS)) {
    const ctx = await newContext(browser, theme, w);
    const page = await ctx.newPage();
    record(`public/${theme}/${wName}`, page);
    for (const [id, p] of [['login', '/login'], ['forgot-password', '/login/forgot-password'], ['reset-password', '/login/reset-password?token=abc']]) {
      await page.goto(`${WEB}${p}`);
      await settle(page);
      await shot(page, `public--${id}--${theme}--${wName}`);
      await overflowCheck(page, `public--${id}--${theme}--${wName}`);
    }
    // Failed login
    await page.goto(`${WEB}/login`);
    await settle(page);
    await page.locator('input[type=email]').fill('admin@amdox.com');
    await page.locator('input[type=password]').fill('wrong-password');
    await page.locator('button[type=submit]').click();
    await page.waitForTimeout(1500);
    await shot(page, `public--login-error--${theme}--${wName}`);
    await ctx.close();
  }
}

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
try {
  const all = Object.entries(WIDTHS);
  if (!EXTRAS_ONLY) for (const theme of ['light', 'dark']) {
    await capturePages(browser, 'admin', theme, all);
  }
  if (!QUICK && !EXTRAS_ONLY) {
    for (const role of ROLES.filter((r) => r !== 'admin')) {
      await capturePages(browser, role, 'light', [['desktop', 1440]]);
    }
    await capturePages(browser, 'employee', 'light', [['mobile', 390]]);
  }
  for (const theme of ['light', 'dark']) await captureExtras(browser, theme);
} finally {
  await browser.close();
  fs.writeFileSync(path.join(OUT, EXTRAS_ONLY ? '_report-extras.json' : '_report.json'), JSON.stringify(report, null, 2));
  console.log(`screenshots: ${fs.readdirSync(OUT).filter((f) => f.endsWith('.png')).length}`);
  console.log(`console errors/warnings: ${report.consoleErrors.length}, overflow: ${report.overflow.length}, missing: ${report.missing.length}`);
}
