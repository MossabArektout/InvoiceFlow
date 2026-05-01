import AdminInvoicesPage from '@/components/admin/AdminInvoicesPage';
import { requireAdminPageAccess } from '@/lib/admin/auth';

export default async function AdminInvoicesRoutePage() {
  await requireAdminPageAccess();
  return <AdminInvoicesPage />;
}
