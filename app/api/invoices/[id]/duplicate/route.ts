import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { enforceRateLimit, enforceSameOrigin } from '@/lib/security/api';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type Params = {
  params: { id: string };
};

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

const getUniqueInvoiceNumber = (existingNumbers: { invoice_number: string }[]) => {
  const existingSet = new Set(existingNumbers.map((item) => item.invoice_number));
  let next = nextInvoiceNumber(existingNumbers);

  while (existingSet.has(next)) {
    const match = next.match(/^INV-(\d+)$/);
    const value = match ? Number(match[1]) : 0;
    next = `INV-${String(value + 1).padStart(3, '0')}`;
  }

  return next;
};

const isDuplicateInvoiceNumberError = (errorMessage: string | undefined) => {
  const message = (errorMessage ?? '').toLowerCase();
  return message.includes('duplicate') && message.includes('invoice_number');
};

export async function POST(request: Request, { params }: Params) {
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
      key: 'invoices-duplicate-post',
      maxRequests: 60,
      windowMs: 5 * 60 * 1000,
      subject: userId
    });
    if (rateLimitError) return rateLimitError;

    const [{ data: sourceInvoice, error: sourceError }, { data: existingNumbers, error: numberError }] = await Promise.all([
      supabaseServer
        .from('invoices')
        .select('*')
        .eq('id', params.id)
        .eq('clerk_id', userId)
        .maybeSingle(),
      supabaseServer.from('invoices').select('invoice_number').eq('clerk_id', userId)
    ]);

    if (sourceError || numberError) {
      return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
    }

    if (!sourceInvoice) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }

    const existingList = (existingNumbers ?? []) as { invoice_number: string }[];
    const existingSet = new Set(existingList.map((row) => row.invoice_number));
    let invoiceNumber = getUniqueInvoiceNumber(existingList);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const { data, error } = await supabaseServer
        .from('invoices')
        .insert({
          clerk_id: userId,
          invoice_number: invoiceNumber,
          from_name: sourceInvoice.from_name ?? null,
          from_email: sourceInvoice.from_email ?? null,
          from_address: sourceInvoice.from_address ?? null,
          to_name: sourceInvoice.to_name ?? null,
          to_email: sourceInvoice.to_email ?? null,
          to_address: sourceInvoice.to_address ?? null,
          issue_date: sourceInvoice.issue_date ?? null,
          due_date: sourceInvoice.due_date ?? null,
          notes: sourceInvoice.notes ?? null,
          payment_terms: sourceInvoice.payment_terms ?? null,
          discount_type: sourceInvoice.discount_type ?? 'percentage',
          discount_value: Number(sourceInvoice.discount_value ?? 0),
          signature_mode: sourceInvoice.signature_mode ?? null,
          signature_data_url: sourceInvoice.signature_data_url ?? null,
          line_items: Array.isArray(sourceInvoice.line_items) ? sourceInvoice.line_items : [],
          subtotal: Number(sourceInvoice.subtotal ?? 0),
          tax: Number(sourceInvoice.tax ?? 0),
          total: Number(sourceInvoice.total ?? 0),
          currency: sourceInvoice.currency ?? 'USD',
          template: sourceInvoice.template ?? 'minimal',
          status: 'draft'
        })
        .select('*')
        .single();

      if (!error) {
        return NextResponse.json(data, { status: 201 });
      }

      if (!isDuplicateInvoiceNumberError(error.message)) {
        return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
      }

      existingSet.add(invoiceNumber);
      const nextList = Array.from(existingSet).map((value) => ({ invoice_number: value }));
      invoiceNumber = getUniqueInvoiceNumber(nextList);
    }

    return NextResponse.json({ message: 'Invoice number already exists. Please try again.' }, { status: 409 });
  } catch {
    return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
