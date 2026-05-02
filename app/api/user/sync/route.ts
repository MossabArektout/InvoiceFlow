import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { enforceRateLimit, enforceSameOrigin } from '@/lib/security/api';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
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
      key: 'user-sync-post',
      maxRequests: 30,
      windowMs: 5 * 60 * 1000,
      subject: userId
    });
    if (rateLimitError) return rateLimitError;

    const { data: existingUser, error: fetchError } = await supabaseServer
      .from('users')
      .select('*')
      .eq('clerk_id', userId)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
    }

    if (existingUser) {
      return NextResponse.json(existingUser, { status: 200 });
    }

    const clerkUser = await currentUser();
    const email = clerkUser?.emailAddresses[0]?.emailAddress ?? '';
    const name = clerkUser?.fullName ?? clerkUser?.firstName ?? null;

    const { data: createdUser, error: createError } = await supabaseServer
      .from('users')
      .insert({
        clerk_id: userId,
        email,
        name,
        plan: 'free',
        credits: 0,
        exports_this_month: 0,
        exports_reset_date: new Date().toISOString().slice(0, 10)
      })
      .select('*')
      .single();

    if (createError) {
      return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
    }

    return NextResponse.json(createdUser, { status: 200 });
  } catch {
    return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
