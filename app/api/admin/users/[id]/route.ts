import { NextResponse } from 'next/server';
import { enforceSameOrigin } from '@/lib/security/api';
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

export async function PATCH(request: Request, context: { params: { id: string } }) {
  try {
    const csrfError = enforceSameOrigin(request);
    if (csrfError) return csrfError;

    const { isAdmin } = await requireAdminApiAccess();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const id = context.params.id;
    const payload = (await request.json()) as { plan?: string };
    const requestedPlan = (payload.plan ?? '').toLowerCase();

    if (requestedPlan !== 'free' && requestedPlan !== 'creator' && requestedPlan !== 'pro') {
      return NextResponse.json({ message: 'Invalid plan value' }, { status: 400 });
    }

    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase
      .from('users')
      .update({ plan: requestedPlan })
      .eq('id', id)
      .select('id,clerk_id,name,email,plan,created_at')
      .single();

    if (error) {
      return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
    }

    return NextResponse.json(data as UserRow, { status: 200 });
  } catch {
    return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: { id: string } }) {
  try {
    const csrfError = enforceSameOrigin(request);
    if (csrfError) return csrfError;

    const { isAdmin } = await requireAdminApiAccess();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const id = context.params.id;
    const supabase = createSupabaseServerClient();

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id,clerk_id')
      .eq('id', id)
      .single();

    if (userError || !user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const clerkId = (user as { clerk_id: string }).clerk_id;

    const { error: invoicesError } = await supabase.from('invoices').delete().eq('clerk_id', clerkId);
    if (invoicesError) {
      return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
    }

    const { error: clientsError } = await supabase.from('clients').delete().eq('clerk_id', clerkId);
    if (clientsError) {
      return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
    }

    const { error: deleteUserError } = await supabase.from('users').delete().eq('id', id);
    if (deleteUserError) {
      return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
