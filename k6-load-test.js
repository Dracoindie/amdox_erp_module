// k6 load test against the API.
//   k6 run k6-load-test.js
//   k6 run -e BASE_URL=http://localhost:4000 -e EMAIL=viewer@amdox.com -e PASSWORD=Demo@1234 -e VUS=50 k6-load-test.js
//
// One login in setup(), then every VU reads dashboard data with the bearer token.
// The API rate-limits per IP (GLOBAL_RATE_LIMIT_MAX, default 500 / 15 min), so for
// a meaningful run start the API with a much higher GLOBAL_RATE_LIMIT_MAX.

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';
const VUS = Number(__ENV.VUS || 50);

export const options = {
  stages: [
    { duration: '30s', target: VUS },
    { duration: '1m', target: VUS },
    { duration: '15s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export function setup() {
  const csrfRes = http.get(`${BASE_URL}/api/v1/csrf-token`);
  const csrf = csrfRes.json('data.csrfToken');
  const res = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({ email: __ENV.EMAIL || 'viewer@amdox.com', password: __ENV.PASSWORD || 'Demo@1234' }),
    { headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf } },
  );
  check(res, { 'login 200': (r) => r.status === 200 });
  return { token: res.json('data.accessToken') };
}

export default function (data) {
  const params = { headers: { Authorization: `Bearer ${data.token}` } };
  const overview = http.get(`${BASE_URL}/api/v1/bi/overview`, params);
  check(overview, { 'overview 200': (r) => r.status === 200 });
  sleep(1);
  const ledger = http.get(`${BASE_URL}/api/v1/finance/ledger?limit=20`, params);
  check(ledger, { 'ledger 200': (r) => r.status === 200 });
  sleep(1);
}
