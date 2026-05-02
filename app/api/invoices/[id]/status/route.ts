import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { enforceRateLimit, enforceSameOrigin } from '@/lib/security/api';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const allowedStatuses = new Set(['draft', 'sent', 'paid', 'overdue', 'cancelled']);

type Params = {
  params: { id: string };
};

export async function PATCH(request: Request, { params }: Params) {
  try {
    const csrfError = enforceSameOrigin(request);
    if (csrfError) return csrfError;

    const supabaseServer = createSupabaseServerClient();
    const { userId, sessionId } = await auth();
    if (!userId || !sessionId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const rateLimitError = await enforceRateLimit({
      request,
      key: 'invoices-status-patch',
      maxRequests: 120,
      windowMs: 5 * 60 * 1000,
      subject: userId
    });
    if (rateLimitError) return rateLimitError;

    const payload = await request.json();
    const status = typeof payload.status === 'string' ? payload.status.toLowerCase() : '';

    if (!allowedStatuses.has(status)) {
      return NextResponse.json({ message: 'Invalid status' }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from('invoices')
      .update({
        status,
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
