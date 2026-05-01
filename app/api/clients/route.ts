import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { enforceRateLimit, enforceSameOrigin } from '@/lib/security/api';
import { FREE_CLIENT_LIMIT, normalizePlan } from '@/lib/plans';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const supabaseServer = createSupabaseServerClient();
    const { userId, sessionId } = await auth();
    if (!userId || !sessionId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const rateLimitError = enforceRateLimit({ request, key: 'clients-get', maxRequests: 180, windowMs: 60 * 1000, subject: userId });
    if (rateLimitError) return rateLimitError;

    const { data, error } = await supabaseServer
      .from('clients')
      .select('*')
      .eq('clerk_id', userId)
      .order('name', { ascending: true });

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
      key: 'clients-post',
      maxRequests: 60,
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
        .maybeSingle();

      if (existingError) {
        return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
      }

      if (existing) {
        return NextResponse.json({ message: 'Client with this email already exists' }, { status: 409 });
      }
    }

    const [{ data: userRecord, error: userError }, { count: clientCount, error: countError }] = await Promise.all([
      supabaseServer.from('users').select('plan').eq('clerk_id', userId).maybeSingle(),
      supabaseServer.from('clients').select('id', { count: 'exact', head: true }).eq('clerk_id', userId)
    ]);

    if (userError || countError) {
      return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
    }

    const plan = normalizePlan(userRecord?.plan);
    if (plan === 'free' && (clientCount ?? 0) >= FREE_CLIENT_LIMIT) {
      return NextResponse.json(
        { message: "You've reached the free plan limit of 5 clients. Upgrade to Creator for unlimited clients." },
        { status: 403 }
      );
    }

    const { data, error } = await supabaseServer
      .from('clients')
      .insert({
        clerk_id: userId,
        name,
        email: email || null,
        address: address || null
      })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
