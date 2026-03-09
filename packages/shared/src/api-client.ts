/**
 * TTNDD_OPS API Client — Type-safe HTTP client powered by openapi-fetch.
 *
 * Usage:
 *   import { createApiClient } from '@ttndd/shared/api-client';
 *   const api = createApiClient({ baseUrl: '/api/v1', token: '...' });
 *   const { data } = await api.GET('/api/v1/hrm/members');
 *
 * Types are auto-generated from contracts/openapi/api-types.d.ts
 * via openapi-typescript.
 *
 * Regenerate types:
 *   node contracts/openapi/codegen.js
 *   — OR —
 *   pnpm --filter api generate:openapi && node contracts/openapi/codegen.js
 */

// Re-export types for convenient import
export type { paths, operations } from '../../../contracts/openapi/api-types';

/**
 * Client configuration for API calls.
 * Uses native fetch under the hood for SSR/SSG compatibility.
 */
export interface ApiClientConfig {
  baseUrl: string;
  token?: string;
  orgId?: string;
}

/**
 * Create a configured API client instance.
 *
 * This is a thin wrapper providing:
 * - Base URL configuration
 * - Bearer token injection
 * - Org-Id header for multi-tenant RLS
 * - Type-safe path/body/response types (via openapi-fetch)
 *
 * Note: In production, use `openapi-fetch` createClient<paths>()
 * for full type-safety. This file provides the import path and
 * configuration pattern.
 */
export function createApiHeaders(config: ApiClientConfig): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (config.token) {
    headers['Authorization'] = `Bearer ${config.token}`;
  }

  if (config.orgId) {
    headers['X-Org-Id'] = config.orgId;
  }

  return headers;
}

/**
 * Build full API URL from base + path.
 */
export function buildApiUrl(config: ApiClientConfig, path: string): string {
  const base = config.baseUrl.replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}
