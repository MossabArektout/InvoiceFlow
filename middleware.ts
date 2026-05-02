import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isProtectedRoute = createRouteMatcher([
  '/app(.*)',
  '/dashboard(.*)',
  '/invoices(.*)',
  '/clients(.*)',
  '/templates(.*)',
  '/settings(.*)',
  '/admin(.*)'
]);
const isAuthRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)']);

const hasClerkKeys = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY
);

const authMiddleware = clerkMiddleware(async (auth, req) => {
  const { userId, sessionId, redirectToSignIn } = await auth();

  if ((!userId || !sessionId) && isProtectedRoute(req)) {
    return redirectToSignIn({ returnBackUrl: req.url });
  }

  if (userId && sessionId && isAuthRoute(req)) {
    return Response.redirect(new URL('/app', req.url));
  }

  return undefined;
});

export default function middleware(...args: Parameters<typeof authMiddleware>) {
  const [request] = args;

  if (!hasClerkKeys) {
    if (isProtectedRoute(request)) {
      return new NextResponse('Authentication is not configured on this server.', {
        status: 503,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8'
        }
      });
    }

    return NextResponse.next();
  }

  return authMiddleware(...args);
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)'
  ]
};
