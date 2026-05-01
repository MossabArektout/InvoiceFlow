import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { enforceRateLimit, enforceSameOrigin } from '@/lib/security/api';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const allowedStatuses = new Set(['draft', 'sent', 'paid', 'overdue', 'cancelled']);
const allowedDiscountTypes = new Set(['percentage', 'fixed']);
const allowedSignatureModes = new Set(['upload', 'draw']);

type Params = {
  params: { id: string };
};

export async function PUT(request: Request, { params }: Params) {
  try {
    const csrfError = enforceSameOrigin(request);
    if (csrfError) return csrfError;

    const supabaseServer = createSupabaseServerClient();
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const rateLimitError = enforceRateLimit({
      request,
      key: 'invoices-put',
      maxRequests: 90,
      windowMs: 5 * 60 * 1000,
      subject: userId
    });
    if (rateLimitError) return rateLimitError;

    const payload = await request.json();
    const requestedInvoiceNumber = typeof payload.invoice_number === 'string' ? payload.invoice_number.trim().toUpperCase() : undefined;
    const requestedStatus = typeof payload.status === 'string' ? payload.status.toLowerCase() : undefined;
    const requestedDiscountType = typeof payload.discount_type === 'string' ? payload.discount_type.toLowerCase() : undefined;
    const discountType = requestedDiscountType && allowedDiscountTypes.has(requestedDiscountType) ? requestedDiscountType : undefined;
    const requestedSignatureMode =
      typeof payload.signature_mode === 'string' ? payload.signature_mode.toLowerCase() : undefined;
    const signatureMode =
      requestedSignatureMode && allowedSignatureModes.has(requestedSignatureMode) ? requestedSignatureMode : undefined;
    const signatureDataUrl =
      typeof payload.signature_data_url === 'string' ? payload.signature_data_url.trim() : undefined;
    const discountValue = Number(payload.discount_value ?? 0);
    const normalizedDiscountValue = Number.isFinite(discountValue)
      ? Math.max(0, discountType === 'percentage' ? Math.min(discountValue, 100) : discountValue)
      : 0;

    if (requestedStatus && !allowedStatuses.has(requestedStatus)) {
      return NextResponse.json({ message: 'Invalid status' }, { status: 400 });
    }
    if (requestedDiscountType && !discountType) {
      return NextResponse.json({ message: 'Invalid discount type' }, { status: 400 });
    }
    if (requestedSignatureMode && !signatureMode) {
      return NextResponse.json({ message: 'Invalid signature mode' }, { status: 400 });
    }
    if (requestedInvoiceNumber && !/^INV-(\d+)$/.test(requestedInvoiceNumber)) {
      return NextResponse.json({ message: 'Invalid invoice number format' }, { status: 400 });
    }

    if (requestedInvoiceNumber) {
      const { data: duplicateInvoice, error: duplicateError } = await supabaseServer
        .from('invoices')
        .select('id')
        .eq('clerk_id', userId)
        .eq('invoice_number', requestedInvoiceNumber)
        .neq('id', params.id)
        .maybeSingle();

      if (duplicateError) {
        return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
      }

      if (duplicateInvoice) {
        return NextResponse.json({ message: 'Invoice number already exists' }, { status: 409 });
      }
    }

    const { data, error } = await supabaseServer
      .from('invoices')
      .update({
        invoice_number: requestedInvoiceNumber || undefined,
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
        discount_type: discountType ?? undefined,
        discount_value: normalizedDiscountValue,
        signature_mode:
          signatureDataUrl !== undefined
            ? signatureDataUrl
              ? signatureMode ?? 'upload'
              : null
            : undefined,
        signature_data_url: signatureDataUrl !== undefined ? signatureDataUrl || null : undefined,
        line_items: Array.isArray(payload.line_items) ? payload.line_items : [],
        subtotal: Number(payload.subtotal ?? 0),
        tax: Number(payload.tax ?? 0),
        total: Number(payload.total ?? 0),
        currency: payload.currency ?? 'USD',
        template: payload.template ?? 'minimal',
        status: requestedStatus ?? undefined,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .eq('clerk_id', userId)
      .select('*')
      .maybeSingle();

    if (error) {
      return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(data, { status: 200 });
  } catch {
    return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const csrfError = enforceSameOrigin(request);
    if (csrfError) return csrfError;

    const supabaseServer = createSupabaseServerClient();
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const rateLimitError = enforceRateLimit({
      request,
      key: 'invoices-delete',
      maxRequests: 60,
      windowMs: 5 * 60 * 1000,
      subject: userId
    });
    if (rateLimitError) return rateLimitError;

    const { data, error } = await supabaseServer
      .from('invoices')
      .delete()
      .eq('id', params.id)
      .eq('clerk_id', userId)
      .select('id')
      .maybeSingle();

    if (error) {
      return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
