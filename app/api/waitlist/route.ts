import { NextResponse } from 'next/server';
import { enforceRateLimit, enforceSameOrigin } from '@/lib/security/api';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { normalizePlan } from '@/lib/plans';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const csrfError = enforceSameOrigin(request);
    if (csrfError) return csrfError;

    const rateLimitError = enforceRateLimit({
      request,
      key: 'waitlist-post',
      maxRequests: 30,
      windowMs: 5 * 60 * 1000
    });
    if (rateLimitError) return rateLimitError;

    const payload = (await request.json()) as { email?: string; plan?: string };
    const email = (payload.email ?? '').trim().toLowerCase();
    const plan = normalizePlan(payload.plan);

    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }
    if (plan !== 'creator' && plan !== 'pro') {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const supabase = createSupabaseServerClient();
    const { error } = await supabase.from('waitlist').insert({ email, plan });

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: "You're already on the list!" }, { status: 409 });
      }
      return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
