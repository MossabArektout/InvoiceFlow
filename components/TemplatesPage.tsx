'use client';

import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { type UserPlan, normalizePlan } from '@/lib/plans';
import WorkspaceNavbar from './WorkspaceNavbar';

type TemplateId =
  | 'minimal'
  | 'classic-professional'
  | 'detailed-itemized'
  | 'compact-receipt'
  | 'creative-bold-branding'
  | 'service-hours'
  | 'international-tax';

type TemplateCard = {
  id: TemplateId;
  name: string;
  description: string;
  accentClass: string;
  previewClass: string;
};

const TEMPLATE_CARDS: TemplateCard[] = [
  {
    id: 'minimal',
    name: 'Modern Minimal',
    description: 'Black and white, strong typography, clean spacing.',
    accentClass: 'text-slate-900',
    previewClass: 'bg-white border-slate-200'
  },
  {
    id: 'classic-professional',
    name: 'Classic Professional',
    description: 'Formal white layout with blue structured accents.',
    accentClass: 'text-blue-700',
    previewClass: 'bg-blue-50 border-blue-200'
  },
  {
    id: 'detailed-itemized',
    name: 'Detailed / Itemized',
    description: 'Data-dense invoice with full itemized financial columns.',
    accentClass: 'text-green-700',
    previewClass: 'bg-green-50 border-green-200'
  },
  {
    id: 'compact-receipt',
    name: 'Compact / Receipt Style',
    description: 'Narrow, compact receipt-like invoice presentation.',
    accentClass: 'text-slate-700',
    previewClass: 'bg-slate-50 border-slate-300'
  },
  {
    id: 'creative-bold-branding',
    name: 'Creative / Bold Branding',
    description: 'Dark branded style with vibrant gradients and highlights.',
    accentClass: 'text-indigo-700',
    previewClass: 'bg-slate-900 border-slate-700'
  },
  {
    id: 'service-hours',
    name: 'Service-Based (Time & Hours)',
    description: 'Optimized for hourly services and time-based billing.',
    accentClass: 'text-blue-700',
    previewClass: 'bg-sky-50 border-sky-200'
  },
  {
    id: 'international-tax',
    name: 'International / Tax-Compliant',
    description: 'Formal VAT-ready layout with currency and tax labels.',
    accentClass: 'text-purple-700',
    previewClass: 'bg-purple-50 border-purple-200'
  }
];

export default function TemplatesPage() {
  const { user } = useUser();
  const [plan, setPlan] = useState<UserPlan>('free');
  const [previewTemplate, setPreviewTemplate] = useState<TemplateCard | null>(null);

  const displayName = useMemo(() => {
    if (!user) return '';
    return user.fullName || user.primaryEmailAddress?.emailAddress || user.username || 'User';
  }, [user]);

  useEffect(() => {
    const loadPlan = async () => {
      try {
        const response = await fetch('/api/user/me');
        if (!response.ok) return;
        const body = (await response.json()) as { plan?: string };
        setPlan(normalizePlan(body.plan));
      } catch {
        setPlan('free');
      }
    };
    void loadPlan();
  }, []);

  return (
    <>
      <WorkspaceNavbar displayName={displayName} plan={plan} />
      <main className="workspace-bg min-h-screen md:pl-[var(--workspace-sidebar-width)]">
        <div className="mx-auto w-full max-w-[1700px] p-4 pb-10 md:p-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Templates</h1>
            <p className="mt-1 text-sm text-slate-500">Choose a template to open in the invoice editor.</p>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {TEMPLATE_CARDS.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => setPreviewTemplate(template)}
                className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md"
              >
                <div className={`h-32 rounded-lg border ${template.previewClass} p-3`}>
                  <div className="flex items-center justify-between">
                    <div className="h-2 w-16 rounded bg-white/70" />
                    <div className="h-2 w-10 rounded bg-white/70" />
                  </div>
                  <div className="mt-3 h-2 w-28 rounded bg-white/60" />
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="h-10 rounded border border-white/70 bg-white/40" />
                    <div className="h-10 rounded border border-white/70 bg-white/40" />
                  </div>
                  <div className="mt-3 h-7 rounded border border-white/70 bg-white/40" />
                </div>
                <p className={`mt-4 text-base font-semibold ${template.accentClass}`}>{template.name}</p>
                <p className="mt-1 text-sm text-slate-500">{template.description}</p>
                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-indigo-600">Preview Template</p>
              </button>
            ))}
          </div>
        </div>
      </main>
      {previewTemplate ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setPreviewTemplate(null)}
        >
          <div
            className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className={`text-lg font-bold ${previewTemplate.accentClass}`}>{previewTemplate.name}</p>
                <p className="mt-1 text-sm text-slate-500">{previewTemplate.description}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                aria-label="Close preview"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
              <iframe
                src={`/app?template=${previewTemplate.id}`}
                title={`${previewTemplate.name} preview`}
                className="h-[70vh] w-full bg-white"
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
              <Link
                href={`/app?template=${previewTemplate.id}`}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Use This Template
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
