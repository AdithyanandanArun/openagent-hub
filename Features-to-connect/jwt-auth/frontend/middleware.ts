import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require authentication
const PROTECTED_ROUTES = ['/dashboard', '/chat', '/settings'];

// Routes only for unauthenticated users (redirect if logged in)
const AUTH_ROUTES = ['/auth/login', '/auth/register'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for JWT token in cookies (set server-side) or fallback to client
  // Note: localStorage isn't accessible in middleware — use a cookie approach
  // for SSR-safe auth. The client lib/auth.ts handles localStorage for CSR.
  const token = request.cookies.get('llm_worker_token')?.value;

  const isProtected = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route),
  );
  const isAuthRoute = AUTH_ROUTES.some((route) =>
    pathname.startsWith(route),
  );

  // Redirect unauthenticated users away from protected pages
  if (isProtected && !token) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from auth pages
  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/chat/:path*',
    '/settings/:path*',
    '/auth/login',
    '/auth/register',
  ],
};
