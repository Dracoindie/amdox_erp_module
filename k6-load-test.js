import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 500 }, // Ramp up to 500 VUs
    { duration: '1m', target: 2000 }, // Peak at 2000 VUs for 1 minute
    { duration: '30s', target: 0 },   // Ramp down to 0 VUs
  ],
  thresholds: {
    // 95% of requests must complete within 500ms
    http_req_duration: ['p(95)<500'],
    // Less than 1% of requests should fail
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const BASE_URL = 'http://localhost:3000';
  
  // Simulate user browsing the BI dashboard and triggering an API fetch
  const res1 = http.get(`${BASE_URL}/bi`);
  check(res1, {
    'BI page status is 200': (r) => r.status === 200,
  });

  // Small sleep to simulate reading time
  sleep(1);

  // Simulate user visiting the SCM API
  const res2 = http.get(`${BASE_URL}/api/finance/ledger`);
  check(res2, {
    'Ledger API status is 200': (r) => r.status === 200,
  });

  sleep(2);
}
