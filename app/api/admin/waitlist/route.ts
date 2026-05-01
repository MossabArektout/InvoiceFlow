import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireAdminApiAccess } from '@/lib/admin/auth';

type WaitlistRow = {
  id: string;
  email: string;
  plan: 'creator' | 'pro' | 'free';
  created_at: string;
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
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const supabase = createSupabaseServerClient();
    const [{ count, error: countError }, { data, error: dataError }] = await Promise.all([
      supabase.from('waitlist').select('id', { count: 'exact', head: true }),
      supabase.from('waitlist').select('id,email,plan,created_at').order('created_at', { ascending: false }).range(from, to)
    ]);

    if (countError || dataError) {
      return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
    }

    const total = count ?? 0;
    return NextResponse.json(
      {
        data: (data ?? []) as WaitlistRow[],
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
