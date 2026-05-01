import AdminSettingsPage from '@/components/admin/AdminSettingsPage';
import { requireAdminPageAccess } from '@/lib/admin/auth';

export default async function AdminSettingsRoutePage() {
  await requireAdminPageAccess();
  return <AdminSettingsPage />;
}
