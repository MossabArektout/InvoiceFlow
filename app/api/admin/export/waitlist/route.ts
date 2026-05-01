import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireAdminApiAccess } from '@/lib/admin/auth';
import { toCsv } from '@/lib/admin/csv';

type WaitlistRow = {
  email: string;
  plan: string;
  created_at: string;
};

export async function GET() {
  try {
    const { isAdmin } = await requireAdminApiAccess();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.from('waitlist').select('email,plan,created_at').order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
    }

    const rows = ((data ?? []) as WaitlistRow[]).map((entry) => [entry.email, entry.plan, entry.created_at]);
    const csv = toCsv(['email', 'plan', 'created_at'], rows);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="invoiceflow-waitlist.csv"'
      }
    });
  } catch {
    return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
