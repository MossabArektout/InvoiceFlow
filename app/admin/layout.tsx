import AdminLayoutShell from '@/components/admin/AdminLayoutShell';
import { requireAdminPageAccess } from '@/lib/admin/auth';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPageAccess();
  return <AdminLayoutShell>{children}</AdminLayoutShell>;
}
