# InvoiceFlow

InvoiceFlow is a Next.js + TypeScript app for creating, managing, and exporting invoices.

## Tech stack

- Next.js 13 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- Clerk (authentication)
- Supabase (data + storage)

## Local development

1. Install dependencies:

```bash
npm install
```

2. Create your local env file and set required values:

```bash
cp .env.local.example .env.local
```

3. Run the app:

```bash
npm run dev
```

## Scripts

- `npm run dev`: start development server
- `npm run build`: create production build
- `npm run start`: start production server
- `npm run lint`: run ESLint
- `npm run typecheck`: run TypeScript checks
- `npm run smoke`: run smoke tests against `SMOKE_BASE_URL` (default `http://127.0.0.1:3000`)

## Environment variables

Required:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL` (recommended for API origin checks)

Optional:

- `APP_URL`
- `NEXT_PUBLIC_SITE_URL`
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (enables shared/distributed rate limiting)

## Smoke tests

Public smoke checks run by default and verify:

- landing page returns 200
- protected app route redirects to sign-in
- unauthenticated invoice/export API access is blocked

Authenticated smoke checks are enabled when you provide `SMOKE_AUTH_COOKIE` and verify:

- `/api/user/me`
- invoice create/list/status update/duplicate/delete
- export quota endpoint

Example:

```bash
SMOKE_BASE_URL=http://127.0.0.1:3000 npm run smoke
SMOKE_BASE_URL=https://your-app.com SMOKE_AUTH_COOKIE='__session=...' npm run smoke
```

## Deployment checklist

- Set all required production environment variables
- Ensure Clerk keys are configured (protected routes return 503 if auth is not configured)
- Enable HTTPS at your hosting provider
- Run `npm run typecheck && npm run lint && npm run build`
- Run `npm run smoke` against your deployed URL
- Configure `SMOKE_AUTH_COOKIE` in GitHub Actions secrets to enable authenticated CI smoke tests
