import { redirect } from 'next/navigation';
import { requireAdminPageAccess } from '@/lib/admin/auth';

export default async function AdminRootPage() {
  await requireAdminPageAccess();
  redirect('/admin/dashboard');
}
