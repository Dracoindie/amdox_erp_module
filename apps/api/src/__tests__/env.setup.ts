// Runs before any test module is imported, so config/env.ts validates these.
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-0123456789abcdef0123';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-0123456789abcdef012';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
  ?? process.env.DATABASE_URL_TEST
  ?? 'postgresql://amdox:amdox_test@127.0.0.1:55432/amdox_test';
process.env.CORS_ORIGINS ??= 'http://localhost:3000';
process.env.AUTH_RATE_LIMIT_MAX ??= '1000';
process.env.REFRESH_RATE_LIMIT_MAX ??= '1000';
process.env.GLOBAL_RATE_LIMIT_MAX ??= '100000';
process.env.ML_INTERNAL_TOKEN ??= 'test-ml-internal-token';
process.env.LOG_LEVEL ??= 'error';
