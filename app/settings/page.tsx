import SettingsPage from '@/components/SettingsPage';
import { notFound } from 'next/navigation';

export default function SettingsRoutePage() {
  if (process.env.NEXT_PUBLIC_ENABLE_SETTINGS !== 'true') {
    notFound();
  }

  return <SettingsPage />;
}
