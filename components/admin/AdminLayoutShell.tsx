'use client';

import { UserButton, useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo, useState } from 'react';

type AdminLayoutShellProps = {
  children: React.ReactNode;
};

type NavItem = {
  href: string;
  label: string;
  icon: string;
};

const navItems: NavItem[] = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/admin/users', label: 'Users', icon: '👥' },
  { href: '/admin/invoices', label: 'Invoices', icon: '📄' },
  { href: '/admin/waitlist', label: 'Waitlist', icon: '📧' },
  { href: '/admin/settings', label: 'Settings', icon: '⚙️' }
];

const SidebarLink = ({ item, active }: { item: NavItem; active: boolean }) => (
  <Link
    href={item.href}
    className={`flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition ${
      active ? 'bg-[#4F46E5] text-white' : 'text-slate-100 hover:bg-[#1E293B]'
    } justify-center gap-3 xl:justify-start`}
  >
    <span className="text-lg leading-none">{item.icon}</span>
    <span className="hidden xl:inline">{item.label}</span>
  </Link>
);

export default function AdminLayoutShell({ children }: AdminLayoutShellProps) {
  const pathname = usePathname();
  const { user } = useUser();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const isAdmin = (user?.publicMetadata as { role?: string } | undefined)?.role === 'admin';

  const displayName = useMemo(() => {
    if (!user) return 'Admin user';
    return user.fullName || user.primaryEmailAddress?.emailAddress || 'Admin user';
  }, [user]);

  return (
    <div className="min-h-screen bg-[#F8F9FC] text-slate-900">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        <p className="text-sm font-semibold text-slate-800">Admin Panel</p>
        <button
          type="button"
          onClick={() => setIsMobileOpen((prev) => !prev)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
        >
          Menu
        </button>
      </header>

      {isMobileOpen ? (
        <button
          aria-label="Close menu"
          type="button"
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed left-0 top-0 z-50 h-screen w-72 transform bg-[#0F172A] text-white transition md:w-20 xl:w-72 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex h-full flex-col px-3 py-4">
          <div className="mb-5 flex items-center justify-between md:justify-center xl:justify-between">
            <div className="hidden items-center gap-2 xl:flex">
              <p className="text-sm font-bold tracking-wide">InvoiceFlow</p>
              <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">ADMIN</span>
            </div>
            <div className="flex items-center gap-2 xl:hidden">
              <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">ADMIN</span>
            </div>
            <button
              type="button"
              onClick={() => setIsMobileOpen(false)}
              className="rounded-md p-2 text-slate-300 hover:bg-[#1E293B] md:hidden"
            >
              ✕
            </button>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => (
              <SidebarLink key={item.href} item={item} active={pathname === item.href} />
            ))}

            <Link
              href="/dashboard"
              className="mt-2 flex items-center justify-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-100 transition hover:bg-[#1E293B] xl:justify-start"
            >
              <span className="text-base">←</span>
              <span className="hidden xl:inline">Back to App</span>
            </Link>
          </nav>

          <div className="mt-auto rounded-xl border border-slate-700 bg-[#111B32] p-3">
            <p className="hidden truncate text-sm font-semibold text-white xl:block">{displayName}</p>
            <p className="hidden truncate text-xs text-slate-400 xl:block">{isAdmin ? 'admin account' : 'user account'}</p>
            <div className="mt-0 xl:mt-2">
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </div>
      </aside>

      <div className="md:pl-20 xl:pl-72">
        <main className="min-h-screen p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
