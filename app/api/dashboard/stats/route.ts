import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { enforceRateLimit } from '@/lib/security/api';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type InvoiceRow = {
  id: string;
  invoice_number: string;
  to_name: string | null;
  to_email: string | null;
  issue_date: string | null;
  due_date: string | null;
  total: number | null;
  status: string | null;
  currency: string | null;
  template: string | null;
  created_at: string;
  updated_at: string;
};

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const startOfNextMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 1);

const sumTotals = (rows: InvoiceRow[]) => rows.reduce((sum, row) => sum + Number(row.total ?? 0), 0);

export async function GET(request: Request) {
  try {
    const { userId, sessionId } = await auth();
    if (!userId || !sessionId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const rateLimitError = await enforceRateLimit({
      request,
      key: 'dashboard-stats-get',
      maxRequests: 120,
      windowMs: 60 * 1000,
      subject: userId
    });
    if (rateLimitError) return rateLimitError;

    const supabaseServer = createSupabaseServerClient();
    const { data, error } = await supabaseServer
      .from('invoices')
      .select('id,invoice_number,to_name,to_email,issue_date,due_date,total,status,currency,template,created_at,updated_at')
      .eq('clerk_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
    }

    const invoices = ((data ?? []) as InvoiceRow[]).map((invoice) => ({
      ...invoice,
      status: (invoice.status ?? 'draft').toLowerCase()
    }));

    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const nextMonthStart = startOfNextMonth(now);
    const lastMonthStart = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));

    const paidInvoices = invoices.filter((invoice) => invoice.status === 'paid');
    const thisMonthPaid = paidInvoices.filter((invoice) => {
      const createdAt = new Date(invoice.created_at);
      return createdAt >= thisMonthStart && createdAt < nextMonthStart;
    });
    const lastMonthPaid = paidInvoices.filter((invoice) => {
      const createdAt = new Date(invoice.created_at);
      return createdAt >= lastMonthStart && createdAt < thisMonthStart;
    });

    const thisMonth = sumTotals(thisMonthPaid);
    const lastMonth = sumTotals(lastMonthPaid);
    const totalRevenue = sumTotals(paidInvoices);
    const growth = lastMonth === 0 ? (thisMonth > 0 ? 100 : 0) : ((thisMonth - lastMonth) / lastMonth) * 100;

    const counts = invoices.reduce(
      (acc, invoice) => {
        const status = invoice.status;
        if (status === 'draft' || status === 'sent' || status === 'paid' || status === 'overdue' || status === 'cancelled') {
          acc[status] += 1;
        }
        return acc;
      },
      { draft: 0, sent: 0, paid: 0, overdue: 0, cancelled: 0 }
    );
    const statusAmounts = invoices.reduce(
      (acc, invoice) => {
        const status = invoice.status;
        if (status === 'draft' || status === 'sent' || status === 'paid' || status === 'overdue' || status === 'cancelled') {
          acc[status] += Number(invoice.total ?? 0);
        }
        return acc;
      },
      { draft: 0, sent: 0, paid: 0, overdue: 0, cancelled: 0 }
    );

    const outstanding = sumTotals(invoices.filter((invoice) => invoice.status === 'sent'));
    const overdueAmount = sumTotals(invoices.filter((invoice) => invoice.status === 'overdue'));

    return NextResponse.json(
      {
        revenue: {
          thisMonth,
          lastMonth,
          total: totalRevenue,
          growth
        },
        invoices: {
          total: invoices.length,
          draft: counts.draft,
          sent: counts.sent,
          paid: counts.paid,
          overdue: counts.overdue,
          cancelled: counts.cancelled
        },
        invoice_amounts: statusAmounts,
        outstanding,
        overdue_amount: overdueAmount,
        recent: invoices.slice(0, 5)
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
