import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

function loadApiModule() {
  const source = readFileSync(new URL('./api.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;

  const module = { exports: {} };
  const windowEvents = [];
  const sandboxWindow = {
    localStorage: {
      getItem: () => 'token-1',
    },
    location: {
      origin: 'http://localhost:3000',
    },
    dispatchEvent: (event) => windowEvents.push(event),
  };

  const fn = new Function(
    'exports',
    'module',
    'process',
    'fetch',
    'Headers',
    'URLSearchParams',
    'window',
    'CustomEvent',
    'BodyInit',
    'Blob',
    'ArrayBuffer',
    'FormData',
    'ReadableStream',
    compiled,
  );

  let fetchImpl = async () => new Response(JSON.stringify({ data: {} }));
  fn(
    module.exports,
    module,
    { env: {} },
    (...args) => fetchImpl(...args),
    Headers,
    URLSearchParams,
    sandboxWindow,
    class CustomEvent {
      constructor(type, init) {
        this.type = type;
        this.detail = init?.detail;
      }
    },
    undefined,
    Blob,
    ArrayBuffer,
    FormData,
    ReadableStream,
  );

  return {
    apiModule: module.exports,
    setFetch: (impl) => {
      fetchImpl = impl;
    },
    windowEvents,
  };
}

test('normalizeApiBase adds /api/v1 exactly once', () => {
  const { apiModule } = loadApiModule();
  assert.equal(apiModule.normalizeApiBase(undefined), '/api/v1');
  assert.equal(apiModule.normalizeApiBase('https://api.example.com'), 'https://api.example.com/api/v1');
  assert.equal(apiModule.normalizeApiBase('https://api.example.com/api'), 'https://api.example.com/api/v1');
  assert.equal(
    apiModule.normalizeApiBase('https://api.example.com/api/v1'),
    'https://api.example.com/api/v1',
  );
});

test('buildApiUrl normalizes endpoint path and query params', () => {
  const { apiModule } = loadApiModule();
  assert.equal(
    apiModule.buildApiUrl('/api/v1/tickets', { status: 'open', tags: ['a', 'b'], empty: '' }),
    '/api/v1/tickets?status=open&tags=a&tags=b',
  );
});

test('getRealtimeBaseUrl resolves socket origin from API base', () => {
  const { apiModule } = loadApiModule();
  assert.equal(apiModule.getRealtimeBaseUrl(undefined), 'http://localhost:3000');
  assert.equal(
    apiModule.getRealtimeBaseUrl('https://api.example.com/api/v1'),
    'https://api.example.com',
  );
  assert.equal(apiModule.getRealtimeBaseUrl('https://api.example.com'), 'https://api.example.com');
});

test('api.get unwraps data envelope and sends bearer token', async () => {
  const { apiModule, setFetch } = loadApiModule();
  let seenUrl = '';
  let seenAuth = '';

  setFetch(async (url, init) => {
    seenUrl = url;
    seenAuth = init.headers.get('Authorization');
    return new Response(JSON.stringify({ data: { ok: true } }), { status: 200 });
  });

  const result = await apiModule.api.get('/auth/me');
  assert.deepEqual(result, { ok: true });
  assert.equal(seenUrl, '/api/v1/auth/me');
  assert.equal(seenAuth, 'Bearer token-1');
});

test('api.get throws ApiError and emits auth event on 401', async () => {
  const { apiModule, setFetch, windowEvents } = loadApiModule();
  setFetch(async () =>
    new Response(JSON.stringify({ code: 'ERR_401', message: 'Invalid token' }), { status: 401 }),
  );

  await assert.rejects(() => apiModule.api.get('/auth/me'), {
    name: 'ApiError',
    status: 401,
    code: 'ERR_401',
    message: 'Invalid token',
  });
  assert.equal(windowEvents[0].type, 'ttndd:auth-error');
  assert.deepEqual(windowEvents[0].detail, { status: 401 });
});
