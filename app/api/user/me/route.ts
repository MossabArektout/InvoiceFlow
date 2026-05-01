import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { enforceRateLimit } from '@/lib/security/api';
import { getRemainingExports, normalizePlan } from '@/lib/plans';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const isDifferentMonth = (sourceDate: Date, compareDate: Date) =>
  sourceDate.getFullYear() !== compareDate.getFullYear() || sourceDate.getMonth() !== compareDate.getMonth();

export async function GET(request: Request) {
  try {
    const supabaseServer = createSupabaseServerClient();
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const rateLimitError = enforceRateLimit({ request, key: 'user-me-get', maxRequests: 180, windowMs: 60 * 1000, subject: userId });
    if (rateLimitError) return rateLimitError;

    const { data, error } = await supabaseServer
      .from('users')
      .select('*')
      .eq('clerk_id', userId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const plan = normalizePlan(data.plan);
    const today = new Date();
    const todayIso = today.toISOString().slice(0, 10);
    const resetDate = data.exports_reset_date ? new Date(data.exports_reset_date) : null;
    const shouldReset = !resetDate || Number.isNaN(resetDate.getTime()) || isDifferentMonth(resetDate, today);
    const normalizedExportsThisMonth = shouldReset ? 0 : Number(data.exports_this_month ?? 0);
    const normalizedResetDate = shouldReset ? todayIso : data.exports_reset_date ?? todayIso;

    if (shouldReset) {
      await supabaseServer
        .from('users')
        .update({ exports_this_month: 0, exports_reset_date: todayIso })
        .eq('id', data.id);
    }

    return NextResponse.json(
      {
        ...data,
        plan,
        exports_this_month: normalizedExportsThisMonth,
        exports_reset_date: normalizedResetDate,
        remaining_exports: getRemainingExports(plan, normalizedExportsThisMonth)
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
