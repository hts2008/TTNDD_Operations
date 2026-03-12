const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type FetchOptions = RequestInit & { params?: Record<string, string> };

async function fetcher<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { params, ...init } = options;
  let url = `${API_BASE}${endpoint}`;
  if (params) {
    const search = new URLSearchParams(params);
    url += `?${search.toString()}`;
  }

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, { ...init, headers });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || 'API Error');
  }
  return res.json();
}

export const api = {
  get: <T>(url: string, params?: Record<string, string>) => fetcher<T>(url, { params }),
  post: <T>(url: string, data?: unknown) =>
    fetcher<T>(url, { method: 'POST', body: JSON.stringify(data) }),
  put: <T>(url: string, data?: unknown) =>
    fetcher<T>(url, { method: 'PUT', body: JSON.stringify(data) }),
  patch: <T>(url: string, data?: unknown) =>
    fetcher<T>(url, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: <T>(url: string) => fetcher<T>(url, { method: 'DELETE' }),
};
