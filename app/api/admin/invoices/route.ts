import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireAdminApiAccess } from '@/lib/admin/auth';

type InvoiceRow = {
  id: string;
  clerk_id: string;
  invoice_number: string;
  to_name: string | null;
  total: number | null;
  status: string | null;
  currency: string | null;
  created_at: string;
  due_date: string | null;
};

type UserRow = {
  clerk_id: string;
  email: string;
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
    const status = (searchParams.get('status') ?? '').trim().toLowerCase();
    const sort = (searchParams.get('sort') ?? 'newest').trim().toLowerCase();

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const supabase = createSupabaseServerClient();

    let countQuery = supabase.from('invoices').select('id', { count: 'exact', head: true });
    let dataQuery = supabase
      .from('invoices')
      .select('id,clerk_id,invoice_number,to_name,total,status,currency,created_at,due_date')
      .range(from, to);

    if (search) {
      const safeSearch = search.replace(/,/g, ' ').trim();
      const filter = `invoice_number.ilike.%${safeSearch}%,to_name.ilike.%${safeSearch}%`;
      countQuery = countQuery.or(filter);
      dataQuery = dataQuery.or(filter);
    }

    if (status && status !== 'all') {
      countQuery = countQuery.eq('status', status);
      dataQuery = dataQuery.eq('status', status);
    }

    if (sort === 'oldest') {
      dataQuery = dataQuery.order('created_at', { ascending: true });
    } else if (sort === 'highest') {
      dataQuery = dataQuery.order('total', { ascending: false });
    } else if (sort === 'lowest') {
      dataQuery = dataQuery.order('total', { ascending: true });
    } else {
      dataQuery = dataQuery.order('created_at', { ascending: false });
    }

    const [{ count, error: countError }, { data, error: dataError }] = await Promise.all([countQuery, dataQuery]);

    if (countError || dataError) {
      return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
    }

    const invoices = (data ?? []) as InvoiceRow[];
    const clerkIds = [...new Set(invoices.map((invoice) => invoice.clerk_id))];

    const userEmailMap = new Map<string, string>();
    if (clerkIds.length > 0) {
      const { data: users, error: usersError } = await supabase.from('users').select('clerk_id,email').in('clerk_id', clerkIds);
      if (usersError) {
        return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
      }

      (users as UserRow[] | null)?.forEach((user) => {
        userEmailMap.set(user.clerk_id, user.email);
      });
    }

    const rows = invoices.map((invoice) => ({
      ...invoice,
      user_email: userEmailMap.get(invoice.clerk_id) ?? 'Unknown'
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
