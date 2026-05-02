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

type TemplateFilter = 'all' | 'free' | 'pro';
type TemplateCategory = 'minimal' | 'professional' | 'services';

type TemplateCard = {
  id: TemplateId;
  name: string;
  description: string;
  useCase: string;
  accentClass: string;
  previewClass: string;
  isPro: boolean;
  category: TemplateCategory;
};

const TEMPLATE_CARDS: TemplateCard[] = [
  {
    id: 'minimal',
    name: 'Modern Minimal',
    description: 'Clean monochrome invoice with clear spacing.',
    useCase: 'Best for solo freelancers',
    accentClass: 'text-slate-900',
    previewClass: 'bg-white border-slate-200',
    isPro: false,
    category: 'minimal'
  },
  {
    id: 'classic-professional',
    name: 'Classic Professional',
    description: 'Structured layout with corporate style hierarchy.',
    useCase: 'Best for agencies and B2B',
    accentClass: 'text-blue-700',
    previewClass: 'bg-blue-50 border-blue-200',
    isPro: true,
    category: 'professional'
  },
  {
    id: 'detailed-itemized',
    name: 'Detailed / Itemized',
    description: 'Line-heavy format with detailed cost transparency.',
    useCase: 'Best for complex projects',
    accentClass: 'text-emerald-700',
    previewClass: 'bg-emerald-50 border-emerald-200',
    isPro: true,
    category: 'professional'
  },
  {
    id: 'compact-receipt',
    name: 'Compact / Receipt Style',
    description: 'Compact invoice footprint for quick payment review.',
    useCase: 'Best for one-off jobs',
    accentClass: 'text-slate-700',
    previewClass: 'bg-slate-50 border-slate-300',
    isPro: false,
    category: 'minimal'
  },
  {
    id: 'creative-bold-branding',
    name: 'Creative / Bold Branding',
    description: 'High-contrast visual style with branded personality.',
    useCase: 'Best for studios and creators',
    accentClass: 'text-indigo-700',
    previewClass: 'bg-slate-900 border-slate-700',
    isPro: true,
    category: 'professional'
  },
  {
    id: 'service-hours',
    name: 'Service-Based (Time & Hours)',
    description: 'Focused on hours, rates, and service breakdown.',
    useCase: 'Best for consultants and services',
    accentClass: 'text-sky-700',
    previewClass: 'bg-sky-50 border-sky-200',
    isPro: false,
    category: 'services'
  },
  {
    id: 'international-tax',
    name: 'International / Tax-Compliant',
    description: 'VAT-friendly format for global tax-ready invoicing.',
    useCase: 'Best for international clients',
    accentClass: 'text-purple-700',
    previewClass: 'bg-purple-50 border-purple-200',
    isPro: true,
    category: 'professional'
  }
];

const FILTERS: { id: TemplateFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'free', label: 'Free' },
  { id: 'pro', label: 'Pro' }
];

const RECOMMENDED_TEMPLATE_ID: TemplateId = 'service-hours';

export default function TemplatesPage() {
  const { user } = useUser();
  const [plan, setPlan] = useState<UserPlan>('free');
  const [activeFilter, setActiveFilter] = useState<TemplateFilter>('all');
  const [previewTemplate, setPreviewTemplate] = useState<TemplateCard | null>(null);
  const [lockedTemplate, setLockedTemplate] = useState<TemplateCard | null>(null);

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

  const recommendedTemplate = TEMPLATE_CARDS.find((template) => template.id === RECOMMENDED_TEMPLATE_ID) ?? TEMPLATE_CARDS[0];

  const filteredTemplates = useMemo(() => {
    return TEMPLATE_CARDS.filter((template) => {
      if (activeFilter === 'all') return true;
      if (activeFilter === 'free') return !template.isPro;
      return template.isPro;
    });
  }, [activeFilter]);

  const isTemplateUnlocked = (template: TemplateCard) => !template.isPro || plan !== 'free';

  const openUpgradePrompt = (template: TemplateCard) => {
    setLockedTemplate(template);
  };

  const handleTemplateCardClick = (template: TemplateCard) => {
    if (!isTemplateUnlocked(template)) {
      openUpgradePrompt(template);
      return;
    }
    setPreviewTemplate(template);
  };

  return (
    <>
      <WorkspaceNavbar displayName={displayName} plan={plan} />
      <main className="min-h-screen bg-white md:pl-[var(--workspace-sidebar-width)]">
        <div className="mx-auto w-full max-w-[1700px] p-4 pb-10 md:p-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Templates</h1>
          <p className="mt-1 text-sm text-slate-500">Pick a style that matches your workflow, then customize in seconds.</p>

          <section className="mt-6 rounded-none bg-gradient-to-r from-slate-900 to-indigo-900 p-5 text-white md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-2xl">
                <p className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                  Recommended · Free
                </p>
                <h2 className="mt-3 text-xl font-bold md:text-2xl">{recommendedTemplate.name}</h2>
                <p className="mt-2 text-sm text-white/85">{recommendedTemplate.description}</p>
                <p className="mt-1 text-sm font-medium text-white/90">{recommendedTemplate.useCase}</p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewTemplate(recommendedTemplate)}
                  className="rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
                >
                  Preview
                </button>
                <Link
                  href={`/app?template=${recommendedTemplate.id}`}
                  className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                >
                  Use Template
                </Link>
              </div>
            </div>
          </section>

          <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
            {FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setActiveFilter(filter.id)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeFilter === filter.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredTemplates.map((template) => {
              const unlocked = isTemplateUnlocked(template);

              return (
                <article
                  key={template.id}
                  className="group -translate-y-0.5 rounded-none bg-white p-3 shadow-xl shadow-slate-200/60 transition duration-200"
                >
                  <button type="button" onClick={() => handleTemplateCardClick(template)} className="w-full text-left">
                    <div className={`relative h-44 overflow-hidden rounded-none border ${template.previewClass} p-4`}>
                      {template.isPro ? (
                        <span className="absolute right-3 top-3 inline-flex items-center rounded-full bg-slate-900/85 px-2.5 py-1 text-[11px] font-semibold text-white">
                          🔒 Pro
                        </span>
                      ) : (
                        <span className="absolute right-3 top-3 inline-flex items-center rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white">
                          Free
                        </span>
                      )}
                      <div className="mx-auto h-full w-full max-w-[86%] rounded-none bg-white/75 p-3 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="h-2 w-20 rounded bg-slate-300/70" />
                          <div className="h-2 w-12 rounded bg-slate-300/70" />
                        </div>
                        {!template.isPro ? (
                          <div className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-emerald-600">Ready on Free Plan</div>
                        ) : null}
                        <div className="mt-3 h-2 w-28 rounded bg-slate-200/80" />
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <div className="h-10 rounded border border-slate-200 bg-white/80" />
                          <div className="h-10 rounded border border-slate-200 bg-white/80" />
                        </div>
                        <div className="mt-3 h-12 rounded border border-slate-200 bg-white/80" />
                      </div>
                    </div>

                    <p className={`mt-4 text-base font-semibold ${template.accentClass}`}>{template.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{template.description}</p>
                    <p className="mt-1 text-xs font-medium text-slate-400">{template.useCase}</p>
                  </button>

                  <div className="mt-4 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewTemplate(template)}
                      className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                    >
                      Preview
                    </button>
                    {unlocked ? (
                      <Link
                        href={`/app?template=${template.id}`}
                        className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
                      >
                        Use Template
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openUpgradePrompt(template)}
                        className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100"
                      >
                        Upgrade to Use
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </main>

      {previewTemplate ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setPreviewTemplate(null)}>
          <div
            className="w-full max-w-4xl rounded-none bg-white p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className={`text-lg font-bold ${previewTemplate.accentClass}`}>{previewTemplate.name}</p>
                <p className="mt-1 text-sm text-slate-500">{previewTemplate.description}</p>
                <p className="mt-1 text-xs font-medium text-slate-400">{previewTemplate.useCase}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200"
                aria-label="Close preview"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 overflow-hidden rounded-none bg-slate-100">
              <iframe
                src={`/app?preview=template&template=${previewTemplate.id}`}
                title={`${previewTemplate.name} preview`}
                className="h-[70vh] w-full bg-white"
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="border border-slate-200 bg-white px-2 py-1">Real layout</span>
              <span className="border border-slate-200 bg-white px-2 py-1">Client-ready structure</span>
              <span className="border border-slate-200 bg-white px-2 py-1">One-click customize</span>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
              >
                Close
              </button>
              {isTemplateUnlocked(previewTemplate) ? (
                <Link
                  href={`/app?template=${previewTemplate.id}`}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Use This Template
                </Link>
              ) : (
                <Link href="/pricing" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
                  Upgrade to Pro
                </Link>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {lockedTemplate ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setLockedTemplate(null)}>
          <div className="w-full max-w-lg rounded-none bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Premium Template</p>
                <h3 className="mt-1 text-xl font-bold text-slate-900">Unlock this template with Pro</h3>
                <p className="mt-2 text-sm text-slate-500">{lockedTemplate.name} is available on the Pro plan.</p>
              </div>
              <button
                type="button"
                onClick={() => setLockedTemplate(null)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200"
                aria-label="Close upgrade prompt"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 rounded-none bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-800">Pro benefits:</p>
              <ul className="mt-2 space-y-1 text-sm text-slate-600">
                <li>• Access all premium templates</li>
                <li>• Remove watermark</li>
                <li>• Custom branding</li>
              </ul>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setLockedTemplate(null)}
                className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
              >
                Continue with free templates
              </button>
              <Link href="/pricing" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
                Upgrade to Pro
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
