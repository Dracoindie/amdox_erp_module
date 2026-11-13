// Resets the test database to a clean, fully migrated state once per run.
import { execSync } from 'node:child_process';
import path from 'node:path';

export default function globalSetup() {
  const url = process.env.TEST_DATABASE_URL
    ?? process.env.DATABASE_URL_TEST
    ?? 'postgresql://amdox:amdox_test@127.0.0.1:55432/amdox_test';
  if (!/test/i.test(url)) {
    throw new Error(`Refusing to reset a database whose URL does not contain "test": ${url.replace(/:[^:@/]+@/, ':***@')}`);
  }
  execSync('npx prisma migrate reset --force --skip-seed --skip-generate', {
    cwd: path.resolve(__dirname, '../../..'),
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'pipe',
  });
}
