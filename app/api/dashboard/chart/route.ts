import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { enforceRateLimit } from '@/lib/security/api';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type InvoiceRow = {
  created_at: string;
  total: number | null;
  status: string | null;
};

type Bucket = {
  month: string;
  revenue: number;
  invoices: number;
};

const MONTH_FORMATTER = new Intl.DateTimeFormat('en-US', { month: 'short', year: '2-digit' });

const getPeriodMonths = (period: string | null) => (period === '12months' ? 12 : 6);

const getMonthKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}`;

export async function GET(request: NextRequest) {
  try {
    const { userId, sessionId } = await auth();
    if (!userId || !sessionId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const rateLimitError = await enforceRateLimit({
      request,
      key: 'dashboard-chart-get',
      maxRequests: 120,
      windowMs: 60 * 1000,
      subject: userId
    });
    if (rateLimitError) return rateLimitError;

    const monthsCount = getPeriodMonths(request.nextUrl.searchParams.get('period'));
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - (monthsCount - 1), 1);

    const supabaseServer = createSupabaseServerClient();
    const { data, error } = await supabaseServer
      .from('invoices')
      .select('created_at,total,status')
      .eq('clerk_id', userId)
      .eq('status', 'paid')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
    }

    const paidInvoices = (data ?? []) as InvoiceRow[];
    const bucketsByKey = new Map<string, Bucket>();

    for (let i = 0; i < monthsCount; i += 1) {
      const date = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
      const key = getMonthKey(date);
      bucketsByKey.set(key, {
        month: MONTH_FORMATTER.format(date),
        revenue: 0,
        invoices: 0
      });
    }

    for (const invoice of paidInvoices) {
      const date = new Date(invoice.created_at);
      const key = getMonthKey(date);
      const bucket = bucketsByKey.get(key);
      if (!bucket) continue;
      bucket.revenue += Number(invoice.total ?? 0);
      bucket.invoices += 1;
    }

    return NextResponse.json(Array.from(bucketsByKey.values()), { status: 200 });
  } catch {
    return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
