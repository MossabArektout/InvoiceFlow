'use client';

import { useUser } from '@clerk/nextjs';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { type UserPlan, normalizePlan } from '@/lib/plans';
import InvoiceApp from './InvoiceApp';
import PostSignupInvoicePage from './PostSignupInvoicePage';
import WorkspaceNavbar from './WorkspaceNavbar';

const messageByMode: Record<string, string> = {
  signup: 'Welcome to InvoiceFlow! 🎉 Your account is ready.',
  signin: 'Welcome back! 👋'
};

const isTemplatePreviewQuery = (query: string) => new URLSearchParams(query).get('preview') === 'template';

const Toast = ({ message }: { message: string }) => (
  <div className="toast-spring fixed left-1/2 top-20 z-50 w-[min(92vw,520px)] -translate-x-1/2 overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-[0_10px_40px_rgba(15,23,42,0.15)]">
    <div className="flex items-center gap-3 border-l-4 border-emerald-500 px-5 py-4">
      <span className="rounded-lg bg-indigo-600 px-2 py-1 text-xs font-extrabold tracking-wide text-white">IF ⚡</span>
      <p className="text-sm font-semibold text-emerald-700">{message}</p>
    </div>
    <span className="welcome-toast-progress block h-1 bg-emerald-400" />
  </div>
);

export default function AppWorkspace() {
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [plan, setPlan] = useState<UserPlan>('free');
  const [showSignupInvoicePage, setShowSignupInvoicePage] = useState(false);
  const isTemplatePreviewOnly = searchParams.get('preview') === 'template';

  const displayName = useMemo(() => {
    if (!user) return '';
    return user.fullName || user.primaryEmailAddress?.emailAddress || user.username || 'User';
  }, [user]);

  const isTemplatePreviewRuntime = () =>
    isTemplatePreviewOnly || (typeof window !== 'undefined' && isTemplatePreviewQuery(window.location.search));

  useEffect(() => {
    if (isTemplatePreviewRuntime()) return;
    const bootstrapUser = async () => {
      try {
        await fetch('/api/user/sync', { method: 'POST' });
        const response = await fetch('/api/user/me');
        if (!response.ok) {
          setPlan('free');
          if (response.status === 401) {
            router.replace('/sign-in');
          }
          return;
        }
        const body = (await response.json()) as { plan?: string };
        setPlan(normalizePlan(body.plan));
      } catch {
        setPlan('free');
      }
    };
    void bootstrapUser();
  }, [isTemplatePreviewOnly, router]);

  useEffect(() => {
    if (isTemplatePreviewRuntime()) return;
    const welcome = searchParams.get('welcome');
    if (!welcome || !messageByMode[welcome]) return;

    if (welcome === 'signup') {
      localStorage.setItem('invoiceflow_pro', 'false');
      setShowSignupInvoicePage(true);
    }

    setToastMessage(messageByMode[welcome]);

    // Remove the query param without triggering a Next.js navigation cycle.
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', pathname);
    }
  }, [isTemplatePreviewOnly, pathname, searchParams]);

  useEffect(() => {
    if (!toastMessage) return;
    const timeout = setTimeout(() => setToastMessage(null), 4000);
    return () => clearTimeout(timeout);
  }, [toastMessage]);

  return (
    <>
      {isTemplatePreviewOnly ? null : <WorkspaceNavbar displayName={displayName} plan={plan} />}
      {isTemplatePreviewOnly ? null : toastMessage ? <Toast message={toastMessage} /> : null}
      {isTemplatePreviewOnly ? (
        <InvoiceApp />
      ) : showSignupInvoicePage ? (
        <PostSignupInvoicePage onContinue={() => setShowSignupInvoicePage(false)} />
      ) : (
        <InvoiceApp />
      )}
    </>
  );
}
