const API_PREFIX = '/api/v1';

type QueryValue = string | number | boolean | null | undefined;
type QueryParams = Record<string, QueryValue | QueryValue[]>;

export interface ApiEnvelope<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  params?: QueryParams;
  body?: BodyInit | Record<string, unknown> | unknown[] | null;
  token?: string | null;
  skipAuth?: boolean;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function normalizeApiBase(input = process.env.NEXT_PUBLIC_API_URL): string {
  if (!input) return API_PREFIX;

  const trimmed = input.replace(/\/+$/, '');
  if (trimmed.endsWith(API_PREFIX)) return trimmed;
  if (trimmed.endsWith('/api')) return `${trimmed}/v1`;
  return `${trimmed}${API_PREFIX}`;
}

export function getRealtimeBaseUrl(input = process.env.NEXT_PUBLIC_API_URL): string {
  const apiBase = normalizeApiBase(input);
  if (/^https?:\/\//i.test(apiBase)) {
    return apiBase.replace(new RegExp(`${API_PREFIX}$`), '');
  }
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}

export function buildApiUrl(endpoint: string, params?: QueryParams): string {
  const base = normalizeApiBase();
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const path = normalizedEndpoint.startsWith(API_PREFIX)
    ? normalizedEndpoint.slice(API_PREFIX.length)
    : normalizedEndpoint;
  const url = `${base}${path}`;
  const search = new URLSearchParams();

  Object.entries(params ?? {}).forEach(([key, value]) => {
    const values = Array.isArray(value) ? value : [value];
    values.forEach((entry) => {
      if (entry !== undefined && entry !== null && entry !== '') {
        search.append(key, String(entry));
      }
    });
  });

  const query = search.toString();
  return query ? `${url}?${query}` : url;
}

export function getStoredAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('token');
}

function extractMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>;
    const message = record.message ?? record.error ?? record.data;
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string') return message;
    if (message && typeof message === 'object' && 'message' in message) {
      const nested = (message as Record<string, unknown>).message;
      if (typeof nested === 'string') return nested;
    }
  }
  return fallback;
}

function unwrapEnvelope<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as ApiEnvelope<T>).data;
  }
  return payload as T;
}

function serializeBody(body: ApiRequestOptions['body']) {
  if (body === undefined || body === null) return undefined;
  if (
    (typeof Blob !== 'undefined' && body instanceof Blob) ||
    body instanceof ArrayBuffer ||
    (typeof FormData !== 'undefined' && body instanceof FormData) ||
    body instanceof URLSearchParams ||
    (typeof ReadableStream !== 'undefined' && body instanceof ReadableStream)
  ) {
    return body;
  }
  return JSON.stringify(body);
}

async function parseBody(res: Response): Promise<unknown> {
  if (res.status === 204) return undefined;
  const text = await res.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function requestPayload(endpoint: string, options: ApiRequestOptions = {}): Promise<unknown> {
  const { params, token, skipAuth, headers, body, ...init } = options;
  const serializedBody = serializeBody(body);
  const requestHeaders = new Headers(headers);

  if (serializedBody && typeof serializedBody === 'string' && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  const authToken = token ?? getStoredAuthToken();
  if (!skipAuth && authToken && !requestHeaders.has('Authorization')) {
    requestHeaders.set('Authorization', `Bearer ${authToken}`);
  }

  const res = await fetch(buildApiUrl(endpoint, params), {
    credentials: 'include',
    ...init,
    headers: requestHeaders,
    body: serializedBody,
  });
  const payload = await parseBody(res);

  if (!res.ok) {
    const message = extractMessage(payload, res.statusText || 'API request failed');
    const code =
      payload && typeof payload === 'object' && 'code' in payload
        ? String((payload as Record<string, unknown>).code)
        : undefined;

    if (typeof window !== 'undefined' && (res.status === 401 || res.status === 403)) {
      window.dispatchEvent(new CustomEvent('ttndd:auth-error', { detail: { status: res.status } }));
    }

    throw new ApiError(message, res.status, code, payload);
  }

  return payload;
}

async function request<T>(endpoint: string, options: ApiRequestOptions = {}): Promise<T> {
  return unwrapEnvelope<T>(await requestPayload(endpoint, options));
}

async function requestBlob(endpoint: string, options: ApiRequestOptions = {}): Promise<Blob> {
  const { params, token, skipAuth, headers, body, ...init } = options;
  const serializedBody = serializeBody(body);
  const requestHeaders = new Headers(headers);

  if (serializedBody && typeof serializedBody === 'string' && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  const authToken = token ?? getStoredAuthToken();
  if (!skipAuth && authToken && !requestHeaders.has('Authorization')) {
    requestHeaders.set('Authorization', `Bearer ${authToken}`);
  }

  const res = await fetch(buildApiUrl(endpoint, params), {
    credentials: 'include',
    ...init,
    headers: requestHeaders,
    body: serializedBody,
  });

  if (!res.ok) {
    const payload = await parseBody(res);
    const message = extractMessage(payload, res.statusText || 'API download failed');

    if (typeof window !== 'undefined' && (res.status === 401 || res.status === 403)) {
      window.dispatchEvent(new CustomEvent('ttndd:auth-error', { detail: { status: res.status } }));
    }

    throw new ApiError(message, res.status, undefined, payload);
  }

  return res.blob();
}

async function requestEnvelope<T>(
  endpoint: string,
  options: ApiRequestOptions = {},
): Promise<ApiEnvelope<T>> {
  const payload = await requestPayload(endpoint, options);
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload as ApiEnvelope<T>;
  }
  return { data: payload as T };
}

export const api = {
  request,
  requestEnvelope,
  get: <T>(url: string, params?: QueryParams, options?: ApiRequestOptions) =>
    request<T>(url, { ...options, params, method: 'GET' }),
  getEnvelope: <T>(url: string, params?: QueryParams, options?: ApiRequestOptions) =>
    requestEnvelope<T>(url, { ...options, params, method: 'GET' }),
  post: <T>(url: string, data?: ApiRequestOptions['body'], options?: ApiRequestOptions) =>
    request<T>(url, { ...options, method: 'POST', body: data }),
  patch: <T>(url: string, data?: ApiRequestOptions['body'], options?: ApiRequestOptions) =>
    request<T>(url, { ...options, method: 'PATCH', body: data }),
  delete: <T>(url: string, options?: ApiRequestOptions) =>
    request<T>(url, { ...options, method: 'DELETE' }),
  download: (url: string, params?: QueryParams, options?: ApiRequestOptions) =>
    requestBlob(url, { ...options, params, method: 'GET' }),
};
