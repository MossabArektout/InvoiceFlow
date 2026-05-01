import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireAdminApiAccess } from '@/lib/admin/auth';
import { toCsv } from '@/lib/admin/csv';

type UserRow = {
  clerk_id: string;
  name: string | null;
  email: string;
  plan: 'free' | 'creator' | 'pro';
  created_at: string;
};

type InvoiceCountRow = {
  clerk_id: string;
};

export async function GET() {
  try {
    const { isAdmin } = await requireAdminApiAccess();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = createSupabaseServerClient();
    const [{ data: users, error: usersError }, { data: invoices, error: invoicesError }] = await Promise.all([
      supabase.from('users').select('clerk_id,name,email,plan,created_at').order('created_at', { ascending: false }),
      supabase.from('invoices').select('clerk_id')
    ]);

    if (usersError || invoicesError) {
      return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
    }

    const invoiceCountMap = new Map<string, number>();
    ((invoices ?? []) as InvoiceCountRow[]).forEach((row) => {
      invoiceCountMap.set(row.clerk_id, (invoiceCountMap.get(row.clerk_id) ?? 0) + 1);
    });

    const rows = ((users ?? []) as UserRow[]).map((user) => [
      user.name ?? '',
      user.email,
      user.plan,
      invoiceCountMap.get(user.clerk_id) ?? 0,
      user.created_at
    ]);

    const csv = toCsv(['name', 'email', 'plan', 'invoice_count', 'created_at'], rows);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="invoiceflow-users.csv"'
      }
    });
  } catch {
    return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
