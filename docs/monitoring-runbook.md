# TTNDD_OPS — Monitoring Runbook

## Alert: High Error Rate (>1%)
1. Check Cloud Logging for recent errors
2. Identify affected module/endpoint
3. Check recent deployments
4. If deployment-related: rollback to previous revision
5. If data-related: check database connectivity and query logs

## Alert: High Latency (p95 > 500ms)
1. Check Cloud SQL metrics (CPU, connections, slow queries)
2. Check Cloud Run instance count and scaling
3. Run `EXPLAIN ANALYZE` on slow queries
4. Add missing indexes if needed
5. Scale Cloud SQL if persistent

## Alert: Budget Approaching Limit
1. Check cost breakdown in Billing Console
2. Identify largest cost contributors
3. Scale down non-essential services
4. Review Cloud Run max-instances setting
5. Alert project owner if approaching hard limit

## Alert: Database Connection Pool Exhausted
1. Check active connections: `SELECT count(*) FROM pg_stat_activity`
2. Kill idle connections if necessary
3. Review Prisma connection pool settings
4. Consider connection pooling (PgBouncer)

## Scheduled Tasks
- Daily: Automated backup verification
- Weekly: Cost review and optimization check
- Monthly: Security scan (OWASP baseline)
- Monthly: Performance review (k6 load test)
