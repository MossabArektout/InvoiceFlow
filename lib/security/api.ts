import { NextResponse } from 'next/server';

type RateLimitRecord = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  request: Request;
  key: string;
  maxRequests: number;
  windowMs: number;
  subject?: string;
};

type GlobalRateLimitState = {
  buckets: Map<string, RateLimitRecord>;
};

const getState = (): GlobalRateLimitState => {
  const globalWithState = globalThis as typeof globalThis & {
    __invoiceflowRateLimit?: GlobalRateLimitState;
  };

  if (!globalWithState.__invoiceflowRateLimit) {
    globalWithState.__invoiceflowRateLimit = { buckets: new Map() };
  }

  return globalWithState.__invoiceflowRateLimit;
};

const getClientIp = (request: Request) => {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown';
  }

  return request.headers.get('x-real-ip') || request.headers.get('cf-connecting-ip') || 'unknown';
};

const getRequestHost = (request: Request) => {
  return request.headers.get('x-forwarded-host') || request.headers.get('host') || null;
};

const normalizeOriginHost = (value: string | null) => {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.host.toLowerCase();
  } catch {
    return value.toLowerCase();
  }
};

const getAllowedHosts = (request: Request) => {
  const hosts = new Set<string>();
  const requestHost = getRequestHost(request);
  if (requestHost) {
    hosts.add(requestHost.toLowerCase());
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (appUrl) {
    const parsedAppHost = normalizeOriginHost(appUrl);
    if (parsedAppHost) hosts.add(parsedAppHost);
  }

  return hosts;
};

export const enforceSameOrigin = (request: Request) => {
  const method = request.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return null;
  }

  const allowedHosts = getAllowedHosts(request);
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const secFetchSite = request.headers.get('sec-fetch-site');

  const originHost = normalizeOriginHost(origin);
  const refererHost = normalizeOriginHost(referer);

  const originAllowed = originHost ? allowedHosts.has(originHost) : false;
  const refererAllowed = refererHost ? allowedHosts.has(refererHost) : false;

  if (originAllowed || refererAllowed) {
    return null;
  }

  // Allow non-browser requests that do not send Origin/Referer.
  if (!origin && !referer && (!secFetchSite || secFetchSite === 'none')) {
    return null;
  }

  return NextResponse.json({ message: 'Invalid request origin' }, { status: 403 });
};

export const enforceRateLimit = ({ request, key, maxRequests, windowMs, subject }: RateLimitOptions) => {
  const now = Date.now();
  const state = getState();
  const identity = subject || getClientIp(request);
  const bucketKey = `${key}:${identity}`;
  const current = state.buckets.get(bucketKey);

  if (!current || current.resetAt <= now) {
    state.buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
  } else {
    current.count += 1;
    state.buckets.set(bucketKey, current);
  }

  const bucket = state.buckets.get(bucketKey)!;

  if (bucket.count > maxRequests) {
    const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    return NextResponse.json(
      { message: 'Too many requests. Please try again shortly.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter)
        }
      }
    );
  }

  // Opportunistic cleanup to keep memory bounded.
  if (state.buckets.size > 2000) {
    for (const [storedKey, value] of state.buckets.entries()) {
      if (value.resetAt <= now) {
        state.buckets.delete(storedKey);
      }
    }
  }

  return null;
};

