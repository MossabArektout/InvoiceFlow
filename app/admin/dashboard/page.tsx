import AdminDashboardPage from '@/components/admin/AdminDashboardPage';
import { requireAdminPageAccess } from '@/lib/admin/auth';

export default async function AdminDashboardRoutePage() {
  await requireAdminPageAccess();
  return <AdminDashboardPage />;
}
