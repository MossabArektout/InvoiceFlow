import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireAdminApiAccess } from '@/lib/admin/auth';
import { normalizePlan } from '@/lib/plans';

type UserRow = {
  id: string;
  clerk_id: string;
  plan: string;
  name: string | null;
  email: string;
  created_at: string;
};

type InvoiceRow = {
  id: string;
  total: number | null;
  status: string | null;
  created_at: string;
};

type WaitlistRow = {
  id: string;
  plan: string;
};

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

export async function GET() {
  try {
    const { isAdmin } = await requireAdminApiAccess();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = createSupabaseServerClient();

    const [{ data: usersData, error: usersError }, { data: invoicesData, error: invoicesError }, { data: waitlistData, error: waitlistError }] = await Promise.all([
      supabase.from('users').select('id,clerk_id,plan,name,email,created_at'),
      supabase.from('invoices').select('id,total,status,created_at'),
      supabase.from('waitlist').select('id,plan')
    ]);

    if (usersError || invoicesError || waitlistError) {
      return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
    }

    const users = ((usersData ?? []) as UserRow[]).map((user) => ({ ...user, plan: normalizePlan(user.plan) }));
    const invoices = (invoicesData ?? []) as InvoiceRow[];
    const waitlist = (waitlistData ?? []) as WaitlistRow[];

    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    const monthStart = startOfMonth(now);

    const creatorUsers = users.filter((user) => user.plan === 'creator');
    const proUsers = users.filter((user) => user.plan === 'pro');
    const freeUsers = users.filter((user) => user.plan === 'free');

    const usersNewThisWeek = users.filter((user) => new Date(user.created_at) >= weekAgo).length;
    const usersNewThisMonth = users.filter((user) => new Date(user.created_at) >= monthStart).length;

    const invoicesThisMonth = invoices.filter((invoice) => new Date(invoice.created_at) >= monthStart).length;
    const paidInvoices = invoices.filter((invoice) => (invoice.status ?? '').toLowerCase() === 'paid').length;
    const overdueInvoices = invoices.filter((invoice) => (invoice.status ?? '').toLowerCase() === 'overdue').length;

    const totalRevenue = creatorUsers.length * 6 + proUsers.length * 20;
    const monthRevenue =
      users.filter((user) => user.plan === 'creator' && new Date(user.created_at) >= monthStart).length * 6 +
      users.filter((user) => user.plan === 'pro' && new Date(user.created_at) >= monthStart).length * 20;

    const last30 = Array.from({ length: 30 }, (_, index) => {
      const day = new Date(now);
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() - (29 - index));
      return day;
    });

    const growth = last30.map((date) => {
      const dayStart = new Date(date);
      const dayEnd = new Date(date);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const newUsers = users.filter((user) => {
        const createdAt = new Date(user.created_at);
        return createdAt >= dayStart && createdAt < dayEnd;
      }).length;

      return {
        date: dayStart.toISOString().slice(0, 10),
        newUsers
      };
    });

    const recentSignups = [...users]
      .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
      .slice(0, 10);

    return NextResponse.json(
      {
        users: {
          total: users.length,
          pro: proUsers.length,
          creator: creatorUsers.length,
          free: freeUsers.length,
          newThisMonth: usersNewThisMonth,
          newThisWeek: usersNewThisWeek
        },
        invoices: {
          total: invoices.length,
          thisMonth: invoicesThisMonth,
          paid: paidInvoices,
          overdue: overdueInvoices
        },
        revenue: {
          total: totalRevenue,
          thisMonth: monthRevenue
        },
        waitlist: {
          total: waitlist.length,
          creator: waitlist.filter((entry) => entry.plan === 'creator').length,
          pro: waitlist.filter((entry) => entry.plan === 'pro').length
        },
        growth,
        recentSignups
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
