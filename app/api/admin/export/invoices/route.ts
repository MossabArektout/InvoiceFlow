import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireAdminApiAccess } from '@/lib/admin/auth';
import { toCsv } from '@/lib/admin/csv';

type InvoiceRow = {
  clerk_id: string;
  invoice_number: string;
  to_name: string | null;
  total: number | null;
  status: string | null;
  currency: string | null;
  created_at: string;
};

type UserRow = {
  clerk_id: string;
  email: string;
};

export async function GET() {
  try {
    const { isAdmin } = await requireAdminApiAccess();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = createSupabaseServerClient();
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('clerk_id,invoice_number,to_name,total,status,currency,created_at')
      .order('created_at', { ascending: false });

    if (invoicesError) {
      return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
    }

    const clerkIds = [...new Set(((invoices ?? []) as InvoiceRow[]).map((invoice) => invoice.clerk_id))];
    const userEmailMap = new Map<string, string>();

    if (clerkIds.length > 0) {
      const { data: users, error: usersError } = await supabase.from('users').select('clerk_id,email').in('clerk_id', clerkIds);
      if (usersError) {
        return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
      }

      ((users ?? []) as UserRow[]).forEach((user) => {
        userEmailMap.set(user.clerk_id, user.email);
      });
    }

    const rows = ((invoices ?? []) as InvoiceRow[]).map((invoice) => [
      invoice.invoice_number,
      userEmailMap.get(invoice.clerk_id) ?? '',
      invoice.to_name ?? '',
      Number(invoice.total ?? 0),
      invoice.status ?? 'draft',
      invoice.currency ?? 'USD',
      invoice.created_at
    ]);

    const csv = toCsv(['invoice_number', 'user_email', 'client_name', 'total', 'status', 'currency', 'created_at'], rows);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="invoiceflow-invoices.csv"'
      }
    });
  } catch {
    return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
