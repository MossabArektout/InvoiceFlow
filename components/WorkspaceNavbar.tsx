'use client';

import { UserButton, useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import BrandLogo from './BrandLogo';
import ComingSoonModal from './ComingSoonModal';
import { type UserPlan } from '@/lib/plans';

type WorkspaceNavbarProps = {
  displayName: string;
  plan: UserPlan;
};

const SIDEBAR_STATE_KEY = 'invoiceflow_sidebar_collapsed';

const SidebarItem = ({
  href,
  label,
  active,
  disabled = false,
  collapsed = false,
  children
}: {
  href: string;
  label: string;
  active: boolean;
  disabled?: boolean;
  collapsed?: boolean;
  children: JSX.Element;
}) => (
  <Link
    href={disabled ? '/app' : href}
    title={label}
    onClick={(event) => {
      if (disabled) event.preventDefault();
    }}
    className={`group relative flex items-center rounded-lg py-2.5 text-sm font-medium transition ${
      active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    } ${collapsed ? 'justify-center px-2.5' : 'gap-3 px-3'} ${disabled ? 'cursor-default opacity-70' : ''}`}
  >
    <span className={active ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}>{children}</span>
    {!collapsed ? <span>{label}</span> : null}
  </Link>
);

export default function WorkspaceNavbar({ displayName, plan }: WorkspaceNavbarProps) {
  const isSettingsEnabled = process.env.NEXT_PUBLIC_ENABLE_SETTINGS === 'true';
  const { user } = useUser();
  const pathname = usePathname();
  const router = useRouter();
  const [isComingSoonOpen, setIsComingSoonOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const isDashboard = pathname === '/dashboard';
  const isInvoices = pathname.startsWith('/invoices');
  const isClients = pathname.startsWith('/clients');
  const isNewInvoice = pathname.startsWith('/app');
  const isTemplates = pathname.startsWith('/templates');
  const isSettings = pathname.startsWith('/settings');
  const isAdmin = (user?.publicMetadata as { role?: string } | undefined)?.role === 'admin';
  const isFreePlan = plan === 'free';

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        router.push('/app');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [router]);

  useEffect(() => {
    try {
      const storedValue = localStorage.getItem(SIDEBAR_STATE_KEY);
      if (storedValue === '1') {
        setIsSidebarCollapsed(true);
      }
    } catch {
      setIsSidebarCollapsed(false);
    }
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('--workspace-sidebar-width', isSidebarCollapsed ? '5rem' : '16rem');
    try {
      localStorage.setItem(SIDEBAR_STATE_KEY, isSidebarCollapsed ? '1' : '0');
    } catch {
      return;
    }
  }, [isSidebarCollapsed]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white md:hidden">
        <nav className="mx-auto flex h-16 w-full max-w-[1700px] items-center justify-between px-4 lg:px-6">
          <BrandLogo size={36} textClassName="text-base font-semibold text-slate-900" />
          <div className="flex items-center gap-3">
            <span className="sr-only">{displayName}</span>
            {plan === 'pro' ? (
              <span className="hidden rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-700 sm:inline-flex">Pro ✓</span>
            ) : plan === 'creator' ? (
              <span className="hidden rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700 sm:inline-flex">Creator ✓</span>
            ) : (
              <div className="hidden sm:block">
                <button
                  type="button"
                  onClick={() => setIsComingSoonOpen(true)}
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200"
                >
                  Free Plan
                </button>
              </div>
            )}
            <UserButton afterSignOutUrl="/" />
          </div>
        </nav>
      </header>

      <aside
        className={`fixed left-0 top-0 z-50 hidden h-screen border-r border-slate-200 bg-white transition-all duration-200 md:block ${
          isSidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div className={`flex h-full flex-col py-5 ${isSidebarCollapsed ? 'px-2.5' : 'px-4'}`}>
          <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
            <BrandLogo withText={!isSidebarCollapsed} size={40} textClassName="text-xl font-bold text-slate-800" />
            {!isSidebarCollapsed ? (
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed(true)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path d="M12.78 15.53a.75.75 0 0 1-1.06 0L7.25 11.06a1.5 1.5 0 0 1 0-2.12l4.47-4.47a.75.75 0 1 1 1.06 1.06L8.31 10l4.47 4.47a.75.75 0 0 1 0 1.06Z" />
                </svg>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed(false)}
                className="absolute right-2 top-5 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                aria-label="Expand sidebar"
                title="Expand sidebar"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path d="M7.22 15.53a.75.75 0 0 0 1.06 0l4.47-4.47a1.5 1.5 0 0 0 0-2.12L8.28 4.47a.75.75 0 0 0-1.06 1.06L11.69 10l-4.47 4.47a.75.75 0 0 0 0 1.06Z" />
                </svg>
              </button>
            )}
          </div>

          <Link
            href="/app"
            title="Create Invoice"
            className={`mt-5 inline-flex items-center justify-center rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 ${
              isSidebarCollapsed ? 'px-2' : 'gap-2 px-3'
            }`}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M10 4a1 1 0 0 1 1 1v4h4a1 1 0 1 1 0 2h-4v4a1 1 0 1 1-2 0v-4H5a1 1 0 1 1 0-2h4V5a1 1 0 0 1 1-1Z" />
            </svg>
            {!isSidebarCollapsed ? 'Create Invoice' : null}
          </Link>

          <div className="mt-6 space-y-1">
            <SidebarItem href="/dashboard" label="Dashboard" active={isDashboard} collapsed={isSidebarCollapsed}>
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                <path d="M3 3h6v6H3V3Zm0 8h6v6H3v-6Zm8-8h6v10h-6V3Zm0 12h6v2h-6v-2Z" />
              </svg>
            </SidebarItem>
            <SidebarItem href="/invoices" label="Invoices" active={isInvoices || isNewInvoice} collapsed={isSidebarCollapsed}>
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                <path d="M4 2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8.83a2 2 0 0 0-.59-1.41l-4.83-4.83A2 2 0 0 0 11.17 2H4Zm7 1.5V8h4.5L11 3.5ZM6 11a1 1 0 0 1 1-1h6a1 1 0 1 1 0 2H7a1 1 0 0 1-1-1Zm1 3a1 1 0 1 0 0 2h4a1 1 0 1 0 0-2H7Z" />
              </svg>
            </SidebarItem>
            <SidebarItem href="/clients" label="Clients" active={isClients} collapsed={isSidebarCollapsed}>
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                <path d="M5 7a3 3 0 1 1 6 0 3 3 0 0 1-6 0Zm8 1a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM3 15a4 4 0 1 1 8 0v1H3v-1Zm10-3a3 3 0 0 1 3 3v1h-4v-1a5.9 5.9 0 0 0-.73-2.82A2.98 2.98 0 0 1 13 12Z" />
              </svg>
            </SidebarItem>
            {/* <SidebarItem href="/app" label="Products & Services" active={false} disabled collapsed={isSidebarCollapsed}>
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                <path d="M3 5a2 2 0 0 1 2-2h1.38a2 2 0 0 1 1.79 1.11L9 6h6a2 2 0 0 1 1.94 2.47l-.8 3.2A2 2 0 0 1 14.2 13H7.3a2 2 0 0 1-1.94-1.52L4.1 6.4A1 1 0 0 0 3.12 5.6H3V5Z" />
              </svg>
            </SidebarItem> */}
            <SidebarItem href="/templates" label="Templates" active={isTemplates} collapsed={isSidebarCollapsed}>
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                <path d="M3 4a2 2 0 0 1 2-2h3v16H5a2 2 0 0 1-2-2V4Zm7-2h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5V2Z" />
              </svg>
            </SidebarItem>
            <SidebarItem href="/app" label="Payments" active={false} disabled collapsed={isSidebarCollapsed}>
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                <path d="M2 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1H2V5Zm0 3h16v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8Zm4 3a1 1 0 1 0 0 2h3a1 1 0 1 0 0-2H6Z" />
              </svg>
            </SidebarItem>
            {/* <SidebarItem href="/app" label="Reports" active={false} disabled collapsed={isSidebarCollapsed}>
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                <path d="M3 3h14v2H3V3Zm1 4h3v10H4V7Zm5 3h3v7H9v-7Zm5-5h3v12h-3V5Z" />
              </svg>
            </SidebarItem> */}
            {isSettingsEnabled ? (
              <SidebarItem href="/settings" label="Settings" active={isSettings} collapsed={isSidebarCollapsed}>
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                  <path d="M10 6.5A3.5 3.5 0 1 0 10 13.5 3.5 3.5 0 0 0 10 6.5Zm8 3.5-.9-.3a7.7 7.7 0 0 0-.47-1.12l.52-.8a1 1 0 0 0-.12-1.27l-1.5-1.5a1 1 0 0 0-1.27-.12l-.8.52c-.36-.18-.73-.34-1.12-.47L12 2h-4l-.3.9c-.39.13-.76.29-1.12.47l-.8-.52a1 1 0 0 0-1.27.12l-1.5 1.5a1 1 0 0 0-.12 1.27l.52.8c-.18.36-.34.73-.47 1.12L2 10v4l.9.3c.13.39.29.76.47 1.12l-.52.8a1 1 0 0 0 .12 1.27l1.5 1.5a1 1 0 0 0 1.27.12l.8-.52c.36.18.73.34 1.12.47L8 18h4l.3-.9c.39-.13.76-.29 1.12-.47l.8.52a1 1 0 0 0 1.27-.12l1.5-1.5a1 1 0 0 0 .12-1.27l-.52-.8c.18-.36.34-.73.47-1.12l.9-.3v-4Z" />
                </svg>
              </SidebarItem>
            ) : null}
          </div>

          <div className="mt-auto">
            {isAdmin ? (
              <div className="mb-3">
                <SidebarItem href="/admin/dashboard" label="Admin Panel" active={pathname.startsWith('/admin')} collapsed={isSidebarCollapsed}>
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                    <path d="M10 1.75 2.5 5v4.75c0 4.35 2.9 8.32 7.5 9.5 4.6-1.18 7.5-5.15 7.5-9.5V5L10 1.75Zm0 2.18 5.5 2.39v3.43c0 3.46-2.22 6.67-5.5 7.8-3.28-1.13-5.5-4.34-5.5-7.8V6.32L10 3.93Z" />
                  </svg>
                </SidebarItem>
              </div>
            ) : null}
            {isFreePlan ? (
              isSidebarCollapsed ? (
                <button
                  type="button"
                  onClick={() => setIsComingSoonOpen(true)}
                  title="Upgrade plan"
                  className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                >
                  ★
                </button>
              ) : (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3">
                  <p className="text-sm font-semibold text-indigo-700">Upgrade to Creator</p>
                  <p className="mt-1 text-xs text-slate-500">Unlock all templates, remove watermark, and increase export limits.</p>
                  <button
                    type="button"
                    onClick={() => setIsComingSoonOpen(true)}
                    className="mt-3 inline-flex w-full items-center justify-center rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
                  >
                    Join Waitlist
                  </button>
                </div>
              )
            ) : null}
            <div className={`mt-3 rounded-lg border border-slate-200 bg-white px-2.5 py-2 ${isSidebarCollapsed ? 'flex justify-center' : ''}`}>
              {isSidebarCollapsed ? (
                <UserButton afterSignOutUrl="/" />
              ) : (
                <div className="flex items-center gap-2">
                  <UserButton afterSignOutUrl="/" />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-slate-700">{displayName || 'User'}</p>
                    <p className="truncate text-[11px] text-slate-400">workspace account</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-[#f4f5f7] md:hidden">
        <div className="grid grid-cols-3">
          <Link
            href="/dashboard"
            className={`flex min-h-[58px] flex-col items-center justify-center py-2 text-xs font-semibold ${
              isDashboard ? 'text-indigo-700' : 'text-slate-500'
            }`}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path d="M3 3h6v6H3V3Zm0 8h6v6H3v-6Zm8-8h6v10h-6V3Zm0 12h6v2h-6v-2Z" />
            </svg>
            Dashboard
          </Link>
          <Link
            href="/app"
            className={`flex min-h-[58px] flex-col items-center justify-center py-2 text-xs font-semibold ${
              isNewInvoice ? 'text-indigo-700' : 'text-slate-500'
            }`}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path d="M10 3a1 1 0 0 1 1 1v5h5a1 1 0 1 1 0 2h-5v5a1 1 0 1 1-2 0v-5H4a1 1 0 1 1 0-2h5V4a1 1 0 0 1 1-1Z" />
            </svg>
            New
          </Link>
          <Link
            href="/invoices"
            className={`flex min-h-[58px] flex-col items-center justify-center py-2 text-xs font-semibold ${
              isInvoices ? 'text-indigo-700' : 'text-slate-500'
            }`}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path d="M4 2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8.83a2 2 0 0 0-.59-1.41l-4.83-4.83A2 2 0 0 0 11.17 2H4Zm7 1.5V8h4.5L11 3.5ZM6 11a1 1 0 0 1 1-1h6a1 1 0 1 1 0 2H7a1 1 0 0 1-1-1Zm1 3a1 1 0 1 0 0 2h4a1 1 0 1 0 0-2H7Z" />
            </svg>
            Invoices
          </Link>
        </div>
      </nav>
      <ComingSoonModal isOpen={isComingSoonOpen} onClose={() => setIsComingSoonOpen(false)} plan="creator" defaultEmail={user?.primaryEmailAddress?.emailAddress} />
    </>
  );
}
