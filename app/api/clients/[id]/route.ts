import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { enforceRateLimit, enforceSameOrigin } from '@/lib/security/api';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type Params = {
  params: { id: string };
};

export async function PUT(request: Request, { params }: Params) {
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
      key: 'clients-put',
      maxRequests: 90,
      windowMs: 5 * 60 * 1000,
      subject: userId
    });
    if (rateLimitError) return rateLimitError;

    const payload = await request.json();
    const name = (payload.name as string | undefined)?.trim();
    const email = (payload.email as string | undefined)?.trim() ?? '';
    const address = (payload.address as string | undefined)?.trim() ?? '';

    if (!name) {
      return NextResponse.json({ message: 'Client name is required' }, { status: 400 });
    }

    if (email) {
      const { data: existing, error: existingError } = await supabaseServer
        .from('clients')
        .select('id')
        .eq('clerk_id', userId)
        .ilike('email', email)
        .neq('id', params.id)
        .maybeSingle();

      if (existingError) {
        return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
      }

      if (existing) {
        return NextResponse.json({ message: 'Client with this email already exists' }, { status: 409 });
      }
    }

    const { data, error } = await supabaseServer
      .from('clients')
      .update({
        name,
        email: email || null,
        address: address || null
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
    const { userId, sessionId } = await auth();
    if (!userId || !sessionId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const rateLimitError = enforceRateLimit({
      request,
      key: 'clients-delete',
      maxRequests: 60,
      windowMs: 5 * 60 * 1000,
      subject: userId
    });
    if (rateLimitError) return rateLimitError;

    const { data, error } = await supabaseServer
      .from('clients')
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
