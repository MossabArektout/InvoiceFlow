import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireAdminApiAccess } from '@/lib/admin/auth';

type UserRow = {
  id: string;
  clerk_id: string;
  name: string | null;
  email: string;
  plan: 'free' | 'creator' | 'pro';
  created_at: string;
};

type InvoiceCountRow = {
  clerk_id: string;
};

export async function GET(request: Request) {
  try {
    const { isAdmin } = await requireAdminApiAccess();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(Number(searchParams.get('page') ?? '1'), 1);
    const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? '20'), 1), 100);
    const search = (searchParams.get('search') ?? '').trim();
    const plan = (searchParams.get('plan') ?? '').trim().toLowerCase();
    const sort = (searchParams.get('sort') ?? 'newest').trim().toLowerCase();

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const supabase = createSupabaseServerClient();

    let countQuery = supabase.from('users').select('id', { count: 'exact', head: true });
    let dataQuery = supabase
      .from('users')
      .select('id,clerk_id,name,email,plan,created_at')
      .range(from, to);

    if (search) {
      const safeSearch = search.replace(/,/g, ' ').trim();
      const filter = `name.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%`;
      countQuery = countQuery.or(filter);
      dataQuery = dataQuery.or(filter);
    }

    if (plan === 'free' || plan === 'creator' || plan === 'pro') {
      countQuery = countQuery.eq('plan', plan);
      dataQuery = dataQuery.eq('plan', plan);
    }

    dataQuery = dataQuery.order('created_at', { ascending: sort === 'oldest' });

    const [{ count, error: countError }, { data, error: dataError }] = await Promise.all([countQuery, dataQuery]);

    if (countError || dataError) {
      return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
    }

    const users = (data ?? []) as UserRow[];
    const clerkIds = users.map((user) => user.clerk_id);

    const invoiceCountMap = new Map<string, number>();

    if (clerkIds.length > 0) {
      const { data: invoiceRows, error: invoiceError } = await supabase
        .from('invoices')
        .select('clerk_id')
        .in('clerk_id', clerkIds);

      if (invoiceError) {
        return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
      }

      (invoiceRows as InvoiceCountRow[] | null)?.forEach((row) => {
        invoiceCountMap.set(row.clerk_id, (invoiceCountMap.get(row.clerk_id) ?? 0) + 1);
      });
    }

    const rows = users.map((user) => ({
      ...user,
      invoice_count: invoiceCountMap.get(user.clerk_id) ?? 0
    }));

    const total = count ?? 0;

    return NextResponse.json(
      {
        data: rows,
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1)
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
