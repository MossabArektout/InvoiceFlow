import AdminUsersPage from '@/components/admin/AdminUsersPage';
import { requireAdminPageAccess } from '@/lib/admin/auth';

export default async function AdminUsersRoutePage() {
  await requireAdminPageAccess();
  return <AdminUsersPage />;
}
