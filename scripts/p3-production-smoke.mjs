#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const DEFAULT_API_BASE = 'https://ttndd-api-122940795437.asia-southeast1.run.app';
const DEFAULT_WEB_BASE = 'https://ttndd-platform-122940795437.asia-southeast1.run.app';

function normalizeBase(value) {
  return String(value || '').replace(/\/+$/, '');
}

function apiUrl(path) {
  const base = normalizeBase(process.env.TTNDD_API_BASE || DEFAULT_API_BASE);
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

async function fetchJson(name, url, options = {}) {
  const started = Date.now();
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        accept: 'application/json',
        ...(options.body ? { 'content-type': 'application/json' } : {}),
        ...(options.headers || {}),
      },
    });
    const text = await response.text();
    let body;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }
    return {
      name,
      url,
      ok: response.ok,
      statusCode: response.status,
      latencyMs: Date.now() - started,
      body,
    };
  } catch (error) {
    return {
      name,
      url,
      ok: false,
      statusCode: 0,
      latencyMs: Date.now() - started,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function fetchText(name, url) {
  const started = Date.now();
  try {
    const response = await fetch(url, { headers: { accept: 'text/html,*/*' } });
    const text = await response.text();
    return {
      name,
      url,
      ok: response.ok,
      statusCode: response.status,
      latencyMs: Date.now() - started,
      sample: text.slice(0, 160),
    };
  } catch (error) {
    return {
      name,
      url,
      ok: false,
      statusCode: 0,
      latencyMs: Date.now() - started,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function getGitSha() {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

function unwrap(result) {
  if (result?.body && typeof result.body === 'object' && 'data' in result.body) {
    return result.body.data;
  }
  return result?.body;
}

function gate(name, pass, details) {
  return { name, status: pass ? 'PASS' : 'FAIL', details };
}

async function main() {
  const authToken = process.env.TTNDD_AUTH_TOKEN;
  const webBase = normalizeBase(process.env.TTNDD_WEB_BASE || DEFAULT_WEB_BASE);
  const commitSha = process.env.COMMIT_SHA || getGitSha();
  const buildId =
    process.env.BUILD_ID ||
    `p3-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`;

  const apiHealth = await fetchJson('api-health', apiUrl('/api/v1/system/health'));
  const canary = await fetchJson('api-canary', apiUrl('/api/v1/system/health/canary'));
  const probes = await fetchJson('api-probes', apiUrl('/api/v1/system/health/probes'));
  const webHome = await fetchText('web-home', webBase || DEFAULT_WEB_BASE);

  const healthBody = unwrap(apiHealth);
  const canaryBody = unwrap(canary);
  const probesBody = unwrap(probes);

  const gates = [
    gate('api-health-ok', apiHealth.ok && healthBody?.status === 'ok', {
      statusCode: apiHealth.statusCode,
      body: healthBody,
    }),
    gate('api-canary-not-unhealthy', canary.ok && canaryBody?.status !== 'unhealthy', {
      statusCode: canary.statusCode,
      body: canaryBody,
    }),
    gate('api-probes-not-unhealthy', probes.ok && probesBody?.overall !== 'unhealthy', {
      statusCode: probes.statusCode,
      body: probesBody,
    }),
    gate('web-home-200', webHome.ok, {
      statusCode: webHome.statusCode,
      sample: webHome.sample,
    }),
  ];

  let releaseGateWrite = null;
  if (process.env.TTNDD_SAVE_RELEASE_GATE === 'true') {
    releaseGateWrite = await fetchJson('release-gate-save', apiUrl('/api/v1/system/release-gates/report'), {
      method: 'POST',
      body: JSON.stringify({
        environment: process.env.TTNDD_RELEASE_ENV || 'production',
        buildId,
        commitSha,
        profile: 'P3_PRODUCTION_OPS',
        status: gates.every((item) => item.status === 'PASS') ? 'PASS' : 'FAIL',
        reportJson: {
          generatedBy: 'scripts/p3-production-smoke.mjs',
          checkedAt: new Date().toISOString(),
          gates,
        },
        linksJson: {
          apiBase: normalizeBase(process.env.TTNDD_API_BASE || DEFAULT_API_BASE),
          webBase,
        },
      }),
    });
    gates.push(
      gate('release-gate-report-saved', releaseGateWrite.ok, {
        statusCode: releaseGateWrite.statusCode,
        body: unwrap(releaseGateWrite),
      }),
    );
  }

  let latestReleaseGate = null;
  if (authToken || releaseGateWrite?.ok) {
    const headers = authToken ? { authorization: `Bearer ${authToken}` } : undefined;
    latestReleaseGate = await fetchJson('release-gate-latest', apiUrl('/api/v1/system/release-gates/latest'), {
      headers,
    });
    gates.push(
      gate('release-gate-visible', latestReleaseGate.ok, {
        statusCode: latestReleaseGate.statusCode,
        body: unwrap(latestReleaseGate),
      }),
    );
  }

  const report = {
    status: gates.every((item) => item.status === 'PASS') ? 'PASS' : 'FAIL',
    checkedAt: new Date().toISOString(),
    buildId,
    commitSha,
    targets: {
      apiBase: normalizeBase(process.env.TTNDD_API_BASE || DEFAULT_API_BASE),
      webBase,
    },
    gates,
    raw: { apiHealth, canary, probes, webHome, releaseGateWrite, latestReleaseGate },
  };

  if (process.env.TTNDD_SMOKE_OUTPUT) {
    writeFileSync(process.env.TTNDD_SMOKE_OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
  }

  console.log(JSON.stringify(report, null, 2));
  if (report.status !== 'PASS') process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
