// Dev helper: screenshot a few pages quickly.
//   node e2e/peek.mjs <outDir> <role> <theme> <width> <path> [<path>…]
import { chromium } from '@playwright/test';
import path from 'node:path';

const [outDir, role, theme, width, ...paths] = process.argv.slice(2);
const WEB = process.env.WEB_URL ?? 'http://localhost:3000';
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const ctx = await browser.newContext({ viewport: { width: Number(width), height: 900 }, colorScheme: theme });
await ctx.addInitScript((t) => localStorage.setItem('amx_theme', t), theme);
const page = await ctx.newPage();
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('console', m.type(), m.text().slice(0, 300)); });
page.on('pageerror', (e) => console.log('pageerror', String(e).slice(0, 300)));
await page.goto(`${WEB}/login`);
await page.getByLabel('Email').fill(`${role}@amdox.com`);
await page.getByLabel('Password', { exact: true }).fill(role === 'admin' ? 'Admin@1234' : 'Demo@1234');
await page.getByRole('button', { name: /sign in/i }).click();
await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 });
for (const p of paths) {
  await page.goto(`${WEB}${p}`);
  await page.waitForLoadState('networkidle').catch(() => undefined);
  await page.waitForTimeout(700);
  const name = `${p.replace(/[^a-z0-9]+/gi, '_') || 'root'}-${theme}-${width}.png`;
  await page.screenshot({ path: path.join(outDir, name), fullPage: true });
  console.log('shot', name);
}
await browser.close();
