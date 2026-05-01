import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { enforceRateLimit, enforceSameOrigin } from '@/lib/security/api';
import { FREE_INVOICE_LIMIT, normalizePlan } from '@/lib/plans';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const allowedStatuses = new Set(['draft', 'sent', 'paid', 'overdue', 'cancelled']);
const allowedDiscountTypes = new Set(['percentage', 'fixed']);
const allowedSignatureModes = new Set(['upload', 'draw']);

const parseInvoiceNumber = (invoiceNumber: string) => {
  const match = invoiceNumber.match(/^INV-(\d+)$/);
  return match ? Number(match[1]) : 0;
};

const nextInvoiceNumber = (invoices: { invoice_number: string }[]) => {
  const maxNumber = invoices.reduce((max, invoice) => {
    const value = parseInvoiceNumber(invoice.invoice_number);
    return value > max ? value : max;
  }, 0);
  return `INV-${String(maxNumber + 1).padStart(3, '0')}`;
};

const invoiceNumberPattern = /^INV-(\d+)$/;

const normalizeRequestedInvoiceNumber = (value: string | undefined) => {
  if (!value) return '';
  const trimmed = value.trim().toUpperCase();
  return invoiceNumberPattern.test(trimmed) ? trimmed : '';
};

const getUniqueInvoiceNumber = (existingNumbers: { invoice_number: string }[], requested?: string) => {
  const existingSet = new Set(existingNumbers.map((item) => item.invoice_number));
  const normalizedRequested = normalizeRequestedInvoiceNumber(requested);

  if (normalizedRequested && !existingSet.has(normalizedRequested)) {
    return normalizedRequested;
  }

  let next = nextInvoiceNumber(existingNumbers);
  while (existingSet.has(next)) {
    const match = next.match(invoiceNumberPattern);
    const value = match ? Number(match[1]) : 0;
    next = `INV-${String(value + 1).padStart(3, '0')}`;
  }

  return next;
};

const isDuplicateInvoiceNumberError = (errorMessage: string | undefined) => {
  const message = (errorMessage ?? '').toLowerCase();
  return message.includes('duplicate') && message.includes('invoice_number');
};

export async function GET(request: Request) {
  try {
    const supabaseServer = createSupabaseServerClient();
    const { userId, sessionId } = await auth();
    if (!userId || !sessionId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const rateLimitError = enforceRateLimit({ request, key: 'invoices-get', maxRequests: 180, windowMs: 60 * 1000, subject: userId });
    if (rateLimitError) return rateLimitError;

    const { data, error } = await supabaseServer
      .from('invoices')
      .select('*')
      .eq('clerk_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
    }

    return NextResponse.json(data, { status: 200 });
  } catch {
    return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const csrfError = enforceSameOrigin(request);
    if (csrfError) return csrfError;

    const supabaseServer = createSupabaseServerClient();
    const { userId, sessionId } = await auth();
    if (!userId || !sessionId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const rateLimitError = enforceRateLimit({
      request,
      key: 'invoices-post',
      maxRequests: 60,
      windowMs: 5 * 60 * 1000,
      subject: userId
    });
    if (rateLimitError) return rateLimitError;

    const payload = await request.json();
    const requestedInvoiceNumber = (payload.invoice_number as string | undefined)?.trim();
    const requestedStatus = typeof payload.status === 'string' ? payload.status.toLowerCase() : 'draft';
    const status = allowedStatuses.has(requestedStatus) ? requestedStatus : 'draft';
    const requestedDiscountType = typeof payload.discount_type === 'string' ? payload.discount_type.toLowerCase() : 'percentage';
    const discountType = allowedDiscountTypes.has(requestedDiscountType) ? requestedDiscountType : 'percentage';
    const requestedSignatureMode =
      typeof payload.signature_mode === 'string' ? payload.signature_mode.toLowerCase() : null;
    const signatureMode =
      requestedSignatureMode && allowedSignatureModes.has(requestedSignatureMode) ? requestedSignatureMode : null;
    const signatureDataUrl = typeof payload.signature_data_url === 'string' ? payload.signature_data_url.trim() : '';
    const discountValue = Number(payload.discount_value ?? 0);
    const normalizedDiscountValue = Number.isFinite(discountValue)
      ? Math.max(0, discountType === 'percentage' ? Math.min(discountValue, 100) : discountValue)
      : 0;

    const { data: existingNumbers, error: numberError } = await supabaseServer
      .from('invoices')
      .select('invoice_number')
      .eq('clerk_id', userId);

    if (numberError) {
      return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
    }

    const { data: userRecord, error: userError } = await supabaseServer
      .from('users')
      .select('plan')
      .eq('clerk_id', userId)
      .maybeSingle();

    if (userError) {
      return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
    }

    const plan = normalizePlan(userRecord?.plan);
    if (plan === 'free' && (existingNumbers?.length ?? 0) >= FREE_INVOICE_LIMIT) {
      return NextResponse.json(
        { message: "You've reached the free plan limit of 5 invoices. Upgrade to Creator for unlimited invoices." },
        { status: 403 }
      );
    }

    const invoiceNumber = getUniqueInvoiceNumber((existingNumbers ?? []) as { invoice_number: string }[], requestedInvoiceNumber);

    const existingList = (existingNumbers ?? []) as { invoice_number: string }[];
    const existingSet = new Set(existingList.map((row) => row.invoice_number));
    let candidateNumber = invoiceNumber;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const { data, error } = await supabaseServer
        .from('invoices')
        .insert({
          clerk_id: userId,
          invoice_number: candidateNumber,
          from_name: payload.from_name ?? null,
          from_email: payload.from_email ?? null,
          from_address: payload.from_address ?? null,
          to_name: payload.to_name ?? null,
          to_email: payload.to_email ?? null,
          to_address: payload.to_address ?? null,
          issue_date: payload.issue_date ?? null,
          due_date: payload.due_date ?? null,
          notes: payload.notes ?? null,
          payment_terms: payload.payment_terms ?? null,
          discount_type: discountType,
          discount_value: normalizedDiscountValue,
          signature_mode: signatureDataUrl ? signatureMode ?? 'upload' : null,
          signature_data_url: signatureDataUrl || null,
          line_items: Array.isArray(payload.line_items) ? payload.line_items : [],
          subtotal: Number(payload.subtotal ?? 0),
          tax: Number(payload.tax ?? 0),
          total: Number(payload.total ?? 0),
          currency: payload.currency ?? 'USD',
          template: payload.template ?? 'minimal',
          status
        })
        .select('*')
        .single();

      if (!error) {
        return NextResponse.json(data, { status: 201 });
      }

      if (!isDuplicateInvoiceNumberError(error.message)) {
        return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
      }

      existingSet.add(candidateNumber);
      const nextList = Array.from(existingSet).map((value) => ({ invoice_number: value }));
      candidateNumber = getUniqueInvoiceNumber(nextList);
    }

    return NextResponse.json({ message: 'Invoice number already exists. Please try again.' }, { status: 409 });
  } catch {
    return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
