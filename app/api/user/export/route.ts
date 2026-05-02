import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { enforceRateLimit, enforceSameOrigin } from '@/lib/security/api';
import { PLAN_EXPORT_LIMITS, getRemainingExports, normalizePlan } from '@/lib/plans';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const isDifferentMonth = (sourceDate: Date, compareDate: Date) =>
  sourceDate.getFullYear() !== compareDate.getFullYear() || sourceDate.getMonth() !== compareDate.getMonth();

export async function POST(request: Request) {
  try {
    const csrfError = enforceSameOrigin(request);
    if (csrfError) return csrfError;

    const { userId, sessionId } = await auth();
    if (!userId || !sessionId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const rateLimitError = await enforceRateLimit({
      request,
      key: 'user-export-post',
      maxRequests: 180,
      windowMs: 60 * 60 * 1000,
      subject: userId
    });
    if (rateLimitError) return rateLimitError;

    const supabase = createSupabaseServerClient();
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('id,plan,exports_this_month,exports_reset_date')
      .eq('clerk_id', userId)
      .maybeSingle();

    if (userError) {
      return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
    }

    if (!userRecord) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const plan = normalizePlan(userRecord.plan);
    const today = new Date();
    const todayIso = today.toISOString().slice(0, 10);
    const resetDate = userRecord.exports_reset_date ? new Date(userRecord.exports_reset_date) : null;
    const shouldReset = !resetDate || Number.isNaN(resetDate.getTime()) || isDifferentMonth(resetDate, today);

    let exportsThisMonth = Number(userRecord.exports_this_month ?? 0);

    if (shouldReset) {
      exportsThisMonth = 0;
      const { error: resetError } = await supabase
        .from('users')
        .update({ exports_this_month: 0, exports_reset_date: todayIso })
        .eq('id', userRecord.id);
      if (resetError) {
        return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
      }
    }

    const limit = PLAN_EXPORT_LIMITS[plan];
    if (exportsThisMonth >= limit) {
      return NextResponse.json(
        {
          allowed: false,
          remaining: 0,
          plan,
          exports_this_month: exportsThisMonth,
          exports_reset_date: shouldReset ? todayIso : userRecord.exports_reset_date ?? todayIso
        },
        { status: 200 }
      );
    }

    const nextExports = exportsThisMonth + 1;
    const { error: updateError } = await supabase
      .from('users')
      .update({
        exports_this_month: nextExports,
        exports_reset_date: shouldReset ? todayIso : userRecord.exports_reset_date ?? todayIso
      })
      .eq('id', userRecord.id);

    if (updateError) {
      return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
    }

    return NextResponse.json(
      {
        allowed: true,
        remaining: getRemainingExports(plan, nextExports),
        plan,
        exports_this_month: nextExports,
        exports_reset_date: shouldReset ? todayIso : userRecord.exports_reset_date ?? todayIso
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
