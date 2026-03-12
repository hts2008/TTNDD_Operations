# Load Testing Runbook

## Prerequisites

1. **Install k6**: https://grafana.com/docs/k6/latest/set-up/install-k6/
   ```bash
   # Windows (chocolatey)
   choco install k6
   
   # macOS
   brew install k6
   ```

2. **Running API server** on `http://localhost:8080` (or set `BASE_URL`)

## Running

```bash
# Default (against local dev)
k6 run tests/load/k6-load.ts

# Against staging
BASE_URL=https://ttndd-staging.run.app k6 run tests/load/k6-load.ts

# With custom auth
AUTH_EMAIL=admin@test.org AUTH_PASS=secret k6 run tests/load/k6-load.ts
```

## Thresholds

| Metric | Target | Description |
|--------|--------|-------------|
| `http_req_duration` p95 | < 500ms | Overall response time |
| `login_duration` p95 | < 1000ms | Auth login |
| `list_duration` p95 | < 400ms | List endpoints |
| `errors` rate | < 1% | Error rate |

## Interpreting Results

- **✓ All thresholds pass** → Baseline acceptable
- **✗ p95 > 500ms** → Identify slow endpoints, check query plans
- **✗ error rate > 1%** → Check connection pool, rate limiting, memory

## Stages

| Phase | Duration | VUs | Purpose |
|-------|----------|-----|---------|
| Warm-up | 30s | 0→10 | Establish baseline |
| Ramp | 60s | 10→50 | Typical load |
| Peak | 60s | 50→100 | Stress test |
| Cool-down | 30s | 100→0 | Graceful drain |
