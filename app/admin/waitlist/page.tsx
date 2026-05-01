import AdminWaitlistPage from '@/components/admin/AdminWaitlistPage';
import { requireAdminPageAccess } from '@/lib/admin/auth';

export default async function AdminWaitlistRoutePage() {
  await requireAdminPageAccess();
  return <AdminWaitlistPage />;
}
