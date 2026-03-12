/**
 * TTNDD_Ops — k6 Load Test Plan
 *
 * Targets P0 API endpoints with staged virtual user ramp-up.
 * Install: https://grafana.com/docs/k6/latest/set-up/install-k6/
 * Run:     k6 run tests/load/k6-load.ts
 *
 * Stages:  10 → 50 → 100 VUs over 3 minutes
 * Targets: p95 < 500ms, error rate < 1%
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// ── Custom metrics ──────────────────────────────────────────────
const errorRate = new Rate('errors');
const loginDuration = new Trend('login_duration', true);
const listDuration = new Trend('list_duration', true);

// ── Configuration ───────────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const AUTH_EMAIL = __ENV.AUTH_EMAIL || 'demo-truong@ttndd.org';
const AUTH_PASS = __ENV.AUTH_PASS || 'Demo@123';

export const options = {
  stages: [
    { duration: '30s', target: 10 },   // warm-up
    { duration: '1m',  target: 50 },   // ramp to typical load
    { duration: '1m',  target: 100 },  // peak load
    { duration: '30s', target: 0 },    // cool-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],   // 95th percentile < 500ms
    errors:           ['rate<0.01'],    // < 1% error rate
    login_duration:   ['p(95)<1000'],   // login < 1s
    list_duration:    ['p(95)<400'],    // list endpoints < 400ms
  },
};

// ── Helpers ─────────────────────────────────────────────────────
function getAuthToken(): string {
  const res = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    email: AUTH_EMAIL,
    password: AUTH_PASS,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  loginDuration.add(res.timings.duration);

  check(res, {
    'login 200': (r) => r.status === 200,
    'has token':  (r) => !!r.json('data.access_token'),
  }) || errorRate.add(1);

  const body = res.json() as { data?: { access_token?: string } };
  return body?.data?.access_token || '';
}

function authHeaders(token: string) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
}

// ── Main scenario ───────────────────────────────────────────────
export default function () {
  // 1. Login
  const token = getAuthToken();
  if (!token) return;

  const opts = authHeaders(token);

  // 2. Health canary (unauthenticated)
  group('Health Canary', () => {
    const res = http.get(`${BASE_URL}/health/canary`);
    check(res, {
      'canary 200': (r) => r.status === 200,
      'canary ok':  (r) => r.json('status') === 'ok',
    }) || errorRate.add(1);
  });

  sleep(0.5);

  // 3. Member listing (paginated)
  group('List Members', () => {
    const res = http.get(`${BASE_URL}/members?page=1&limit=20`, opts);
    listDuration.add(res.timings.duration);
    check(res, {
      'members 200':  (r) => r.status === 200,
      'has data':     (r) => Array.isArray(r.json('data')),
    }) || errorRate.add(1);
  });

  sleep(0.3);

  // 4. Session listing
  group('List Sessions', () => {
    const res = http.get(`${BASE_URL}/sessions?page=1&limit=10`, opts);
    listDuration.add(res.timings.duration);
    check(res, {
      'sessions 200': (r) => r.status === 200,
    }) || errorRate.add(1);
  });

  sleep(0.3);

  // 5. Skill tree
  group('List Skills', () => {
    const res = http.get(`${BASE_URL}/skills?page=1&limit=50`, opts);
    listDuration.add(res.timings.duration);
    check(res, {
      'skills 200': (r) => r.status === 200,
    }) || errorRate.add(1);
  });

  sleep(0.5);

  // 6. Events listing
  group('List Events', () => {
    const res = http.get(`${BASE_URL}/events?page=1&limit=10`, opts);
    listDuration.add(res.timings.duration);
    check(res, {
      'events 200': (r) => r.status === 200,
    }) || errorRate.add(1);
  });

  sleep(0.5);
}
