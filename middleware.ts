import { NextRequest, NextResponse } from 'next/server';

const protectedRoutes = ['/dashboard', '/profile', '/admin'];

const authRoutes = ['/login'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hasSession = request.cookies.has('eden_session');

  if (protectedRoutes.some(route => pathname.startsWith(route)) && !hasSession) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (authRoutes.includes(pathname) && hasSession) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
