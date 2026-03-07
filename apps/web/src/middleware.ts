import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Middleware — T-0015 Route guards
 *
 * Protects dashboard routes from unauthenticated access.
 * In production, this validates JWT tokens; in dev, it allows passthrough.
 *
 * Flow:
 *   1. Public routes (/login, /register, /forgot-password) → always allowed
 *   2. API routes (/api/*) → handled by NestJS guards, not here
 *   3. Dashboard routes (/*) → require token in cookie or Authorization header
 *   4. No token → redirect to /login
 */

// Routes that don't require authentication
const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/_next',
  '/favicon.ico',
  '/api',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Skip static assets
  if (pathname.includes('.') && !pathname.endsWith('/')) {
    return NextResponse.next();
  }

  // Check for auth token
  const token =
    request.cookies.get('token')?.value ||
    request.headers.get('authorization')?.replace('Bearer ', '');

  // In development, allow passthrough if no auth system is active yet
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev && !token) {
    // Dev mode: allow access but set a flag for the client
    const response = NextResponse.next();
    response.headers.set('x-auth-status', 'dev-bypass');
    return response;
  }

  // In production, redirect to login if no token
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Token exists — allow request
  // Note: Actual JWT validation happens in the NestJS API guard layer
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
