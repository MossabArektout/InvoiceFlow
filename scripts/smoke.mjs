#!/usr/bin/env node

import http from 'node:http';
import https from 'node:https';

const baseUrl = (process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const authCookie = process.env.SMOKE_AUTH_COOKIE || '';
const nativeFetch = globalThis.fetch;

const origin = new URL(baseUrl).origin;

const pass = (message) => {
  process.stdout.write(`PASS ${message}\n`);
};

const fail = (message) => {
  throw new Error(message);
};

const expectStatus = (response, allowedStatuses, label) => {
  if (!allowedStatuses.includes(response.status)) {
    fail(`${label}: expected status ${allowedStatuses.join(' or ')}, received ${response.status}`);
  }
};

const createLegacyHeaders = (headers) => ({
  get(name) {
    const key = String(name || '').toLowerCase();
    const value = headers[key];
    if (Array.isArray(value)) return value.join(', ');
    return value || null;
  }
});

const legacyRequest = (url, options) =>
  new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const client = parsed.protocol === 'https:' ? https : http;
    const req = client.request(
      parsed,
      {
        method: options.method,
        headers: options.headers
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        res.on('end', () => {
          const bodyText = Buffer.concat(chunks).toString('utf8');
          resolve({
            status: res.statusCode || 0,
            headers: createLegacyHeaders(res.headers),
            text: async () => bodyText,
            json: async () => {
              try {
                return bodyText ? JSON.parse(bodyText) : {};
              } catch {
                return {};
              }
            }
          });
        });
      }
    );
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });

const requestWithRedirects = async (url, options, redirects = 0) => {
  const response = await legacyRequest(url, options);
  if (options.redirect !== 'follow') return response;

  const status = response.status;
  const location = response.headers.get('location');
  const isRedirect = [301, 302, 303, 307, 308].includes(status) && Boolean(location);
  if (!isRedirect || redirects >= 5) return response;

  const nextUrl = new URL(location, url).toString();
  const shouldSwitchToGet = status === 303 || ((status === 301 || status === 302) && options.method !== 'GET');
  const nextOptions = shouldSwitchToGet
    ? { ...options, method: 'GET', body: undefined }
    : options;

  return requestWithRedirects(nextUrl, nextOptions, redirects + 1);
};

const request = async (path, { method = 'GET', body, withAuth = false, redirect = 'follow' } = {}) => {
  const headers = {
    Accept: 'application/json'
  };

  if (method !== 'GET' && method !== 'HEAD') {
    headers.Origin = origin;
  }

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (withAuth && authCookie) {
    headers.Cookie = authCookie;
  }

  const requestBody = body !== undefined ? JSON.stringify(body) : undefined;
  const requestOptions = { method, headers, body: requestBody, redirect };

  const response = nativeFetch
    ? await nativeFetch(`${baseUrl}${path}`, requestOptions)
    : await requestWithRedirects(`${baseUrl}${path}`, requestOptions);

  return response;
};

const runPublicSmoke = async () => {
  const landing = await request('/', { redirect: 'manual' });
  expectStatus(landing, [200], 'Landing page');
  pass('Landing page responds with 200');

  const appRedirect = await request('/app', { redirect: 'manual' });
  expectStatus(appRedirect, [302, 307, 308, 503], 'Protected route redirect');
  if (appRedirect.status === 503) {
    pass('Protected route is blocked because auth is not configured');
  } else {
    const location = appRedirect.headers.get('location') || '';
    if (!location.includes('/sign-in')) {
      fail(`Protected route redirect: expected location to include /sign-in, received ${location || '(empty)'}`);
    }
    pass('Protected route redirects to sign-in when unauthenticated');
  }

  const invoices = await request('/api/invoices');
  expectStatus(invoices, [401, 500, 503], 'GET /api/invoices without auth');
  pass('Unauthenticated invoice read is blocked or auth is not configured');

  const exportResponse = await request('/api/user/export', { method: 'POST' });
  expectStatus(exportResponse, [401, 500, 503], 'POST /api/user/export without auth');
  pass('Unauthenticated export is blocked or auth is not configured');
};

const runAuthedSmoke = async () => {
  if (!authCookie) {
    process.stdout.write('SKIP Authenticated smoke checks (set SMOKE_AUTH_COOKIE to enable)\n');
    return;
  }

  const userMe = await request('/api/user/me', { withAuth: true });
  expectStatus(userMe, [200], 'GET /api/user/me with auth');
  pass('Authenticated user profile endpoint works');

  const uniqueNumber = `INV-${String(Date.now()).slice(-9)}`;
  const createInvoiceBody = {
    invoice_number: uniqueNumber,
    from_name: 'Smoke Tester',
    from_email: 'smoke@example.com',
    from_address: '123 Smoke Street',
    to_name: 'Client Example',
    to_email: 'client@example.com',
    to_address: '456 Client Road',
    issue_date: '2026-01-01',
    due_date: '2026-01-15',
    notes: 'Smoke test invoice',
    payment_terms: 'Due in 14 days',
    discount_type: 'percentage',
    discount_value: 0,
    line_items: [{ id: 'line-1', description: 'Smoke line item', quantity: 1, unitPrice: 100, discountPercent: 0 }],
    subtotal: 100,
    tax: 0,
    total: 100,
    currency: 'USD',
    template: 'minimal',
    status: 'draft'
  };

  const created = await request('/api/invoices', { method: 'POST', body: createInvoiceBody, withAuth: true });
  expectStatus(created, [201], 'POST /api/invoices with auth');
  const createdInvoice = await created.json();
  if (!createdInvoice?.id) {
    fail('POST /api/invoices with auth: missing invoice id in response');
  }
  pass('Invoice creation works');

  const invoiceId = createdInvoice.id;

  const listInvoices = await request('/api/invoices', { withAuth: true });
  expectStatus(listInvoices, [200], 'GET /api/invoices with auth');
  const invoices = await listInvoices.json();
  if (!Array.isArray(invoices) || !invoices.some((item) => item.id === invoiceId)) {
    fail('GET /api/invoices with auth: created invoice not found');
  }
  pass('Invoice list includes the created invoice');

  const statusUpdate = await request(`/api/invoices/${invoiceId}/status`, {
    method: 'PATCH',
    body: { status: 'sent' },
    withAuth: true
  });
  expectStatus(statusUpdate, [200], 'PATCH /api/invoices/:id/status with auth');
  pass('Invoice status update works');

  const duplicate = await request(`/api/invoices/${invoiceId}/duplicate`, {
    method: 'POST',
    withAuth: true
  });
  expectStatus(duplicate, [201], 'POST /api/invoices/:id/duplicate with auth');
  const duplicateInvoice = await duplicate.json();
  const duplicateId = duplicateInvoice?.id;
  if (!duplicateId) {
    fail('POST /api/invoices/:id/duplicate with auth: missing duplicated invoice id');
  }
  pass('Invoice duplication works');

  const exportResponse = await request('/api/user/export', { method: 'POST', withAuth: true });
  expectStatus(exportResponse, [200], 'POST /api/user/export with auth');
  const exportBody = await exportResponse.json();
  if (typeof exportBody?.allowed !== 'boolean') {
    fail('POST /api/user/export with auth: expected boolean `allowed` field');
  }
  pass('Export quota endpoint works');

  const deleteDuplicate = await request(`/api/invoices/${duplicateId}`, {
    method: 'DELETE',
    withAuth: true
  });
  expectStatus(deleteDuplicate, [200], 'DELETE duplicated invoice');

  const deleteOriginal = await request(`/api/invoices/${invoiceId}`, {
    method: 'DELETE',
    withAuth: true
  });
  expectStatus(deleteOriginal, [200], 'DELETE original invoice');
  pass('Invoice cleanup works');
};

const main = async () => {
  process.stdout.write(`Running smoke checks against ${baseUrl}\n`);
  await runPublicSmoke();
  await runAuthedSmoke();
  process.stdout.write('Smoke checks completed successfully\n');
};

main().catch((error) => {
  process.stderr.write(`Smoke checks failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
