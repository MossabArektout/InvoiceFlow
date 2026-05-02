'use client';

import { useEffect, useRef, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BrandLogo from '@/components/BrandLogo';

type RevealProps = {
  id?: string;
  className?: string;
  children: JSX.Element | JSX.Element[];
};

const RevealSection = ({ id, className = '', children }: RevealProps) => {
  // Keep content visible on first paint to avoid blank sections on cold loads.
  const [visible, setVisible] = useState(true);
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setVisible(true);
        observer.unobserve(node);
      },
      { threshold: 0.2 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section id={id} ref={ref} className={`reveal-section ${visible ? 'visible' : ''} ${className}`}>
      {children}
    </section>
  );
};

const faqs = [
  {
    q: 'Can I start for free?',
    a: 'Yes. You can start on the free plan with no credit card and upgrade only when you need more monthly exports.'
  },
  {
    q: 'Do my invoices sync across sessions?',
    a: 'Yes. Invoices and clients are stored in your account so you can log in on any device and continue working.'
  },
  {
    q: 'What happens when I reach my monthly export limit?',
    a: 'You can continue editing invoices, and your export quota resets next month or you can upgrade instantly.'
  },
  {
    q: 'Can I use this on mobile?',
    a: 'Yes. InvoiceFlow is responsive and works on desktop, tablet, and mobile.'
  }
];

type FeatureCardProps = {
  title: string;
  description: string;
  badge: string;
};

const FeatureCard = ({ title, description, badge }: FeatureCardProps) => (
  <article className="rounded-3xl border border-slate-200 bg-[#f6f6f3] p-6 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
    <p className="inline-flex rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-indigo-700">{badge}</p>
    <h3 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">{title}</h3>
    <p className="mt-3 text-base leading-relaxed text-slate-600">{description}</p>
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="h-2 w-24 rounded bg-slate-200" />
      <div className="mt-3 h-10 rounded bg-slate-100" />
      <div className="mt-2 h-2 w-16 rounded bg-slate-200" />
    </div>
  </article>
);

type PriceCardProps = {
  name: string;
  price: string;
  description: string;
  highlights: string[];
  emphasized?: boolean;
  ctaLabel: string;
  ctaNote?: string;
  onClick: () => void;
};

const PriceCard = ({ name, price, description, highlights, emphasized = false, ctaLabel, ctaNote, onClick }: PriceCardProps) => (
  <article
    className={`rounded-3xl border p-7 ${
      emphasized
        ? 'border-indigo-500 bg-white shadow-[0_20px_48px_rgba(79,70,229,0.18)]'
        : 'border-slate-200 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.06)]'
    }`}
  >
    <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">{name}</p>
    <p className="mt-3 text-5xl font-black tracking-tight text-slate-900">{price}</p>
    <p className="mt-2 text-base text-slate-500">per month</p>
    <p className="mt-4 text-base text-slate-600">{description}</p>
    <ul className="mt-6 space-y-3 text-base text-slate-700">
      {highlights.map((item) => (
        <li key={item} className="flex items-start gap-2">
          <span className="mt-0.5 text-emerald-600">✓</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
    <button
      type="button"
      onClick={onClick}
      className={`mt-7 w-full rounded-xl px-4 py-3 text-sm font-semibold transition ${
        emphasized
          ? 'bg-indigo-600 text-white shadow-[0_10px_20px_rgba(79,70,229,0.25)] hover:bg-indigo-700'
          : 'bg-slate-900 text-white hover:bg-slate-800'
      }`}
    >
      {ctaLabel}
    </button>
    {ctaNote ? (
      <div className="relative mt-4 px-1 pb-1">
        <svg viewBox="0 0 120 40" aria-hidden className="pointer-events-none absolute -top-5 left-1 h-8 w-28 text-slate-900">
          <path d="M4 34C16 28 24 20 36 16C54 10 71 8 92 9" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M85 4L95 9L87 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p className="-rotate-1 pt-3 font-['Comic_Neue','Bradley_Hand',cursive] text-[1.85rem] leading-[1.05] tracking-wide text-slate-900">
          {ctaNote}
        </p>
      </div>
    ) : null}
  </article>
);

function LandingPage() {
  const router = useRouter();
  const { isSignedIn } = useUser();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const dismissed = localStorage.getItem('invoiceflow_announcement_dismissed') === 'true';
    setShowAnnouncement(!dismissed);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const updateScrollState = () => {
      const y = Math.max(window.scrollY, document.documentElement.scrollTop, document.body.scrollTop || 0);
      setHasScrolled(y > 10);
    };

    const rafId = window.requestAnimationFrame(updateScrollState);
    updateScrollState();

    window.addEventListener('scroll', updateScrollState, { passive: true });
    document.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState, { passive: true });
    window.addEventListener('hashchange', updateScrollState, { passive: true });
    window.addEventListener('pageshow', updateScrollState);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', updateScrollState);
      document.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
      window.removeEventListener('hashchange', updateScrollState);
      window.removeEventListener('pageshow', updateScrollState);
    };
  }, []);

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-slate-50 text-slate-900">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(99,102,241,0.16),transparent_40%),radial-gradient(circle_at_90%_20%,rgba(99,102,241,0.08),transparent_30%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04] [background-image:radial-gradient(#0f172a_0.7px,transparent_0.7px)] [background-size:4px_4px]"
      />
      <div className="relative">
        {showAnnouncement ? (
          <div className="sticky top-0 z-[70] bg-indigo-600 text-white">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2 text-sm sm:px-6 lg:px-8">
              <p className="truncate">🎉 InvoiceFlow is live! Get Pro for $9 — limited time</p>
              <button
                type="button"
                aria-label="Dismiss announcement"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-white/15 hover:bg-white/25"
                onClick={() => {
                  setShowAnnouncement(false);
                  localStorage.setItem('invoiceflow_announcement_dismissed', 'true');
                }}
              >
                ✕
              </button>
            </div>
          </div>
        ) : null}

        <header className={`fixed left-0 right-0 z-50 px-4 sm:px-6 lg:px-8 ${showAnnouncement ? 'top-14' : 'top-4'}`}>
          <nav
            className={`mx-auto flex w-full items-center justify-between rounded-full px-3 py-2 transition-all duration-300 ${
              hasScrolled
                ? 'max-w-5xl border border-slate-200 bg-white/90 shadow-[0_14px_30px_rgba(15,23,42,0.08)] backdrop-blur-md'
                : 'max-w-6xl border border-transparent bg-transparent shadow-none backdrop-blur-0'
            }`}
          >
            <div className="flex items-center gap-5">
              <Link href="/" className="inline-flex items-center gap-2">
                <BrandLogo textClassName="text-xl font-extrabold text-slate-900" />
              </Link>
              <div className="hidden items-center gap-6 text-sm font-semibold text-slate-600 md:flex">
                <Link href="#features" className="transition hover:text-slate-900">
                  Features
                </Link>
                <Link href="#process" className="transition hover:text-slate-900">
                  Process
                </Link>
                <Link href="#pricing" className="transition hover:text-slate-900">
                  Pricing
                </Link>
                <Link href="#testimonials" className="transition hover:text-slate-900">
                  Testimonials
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/sign-in" className="rounded-full px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 sm:px-4">
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_6px_18px_rgba(15,23,42,0.35)] transition hover:bg-slate-800 sm:px-6"
              >
                Sign up for free ↗
              </Link>
            </div>
          </nav>
        </header>

        <RevealSection className="mx-auto grid w-full max-w-6xl gap-10 px-4 pb-16 pt-36 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8 lg:pb-24 lg:pt-40">
          <div>
            <p className="inline-flex items-center rounded-full border border-indigo-100 bg-indigo-50 px-4 py-1.5 text-sm font-semibold text-indigo-700">
              Send your invoice in ⚡ 60 seconds
            </p>
            <h1 className="mt-7 text-[48px] font-black leading-[0.95] tracking-tight text-slate-900 sm:text-[66px]">
              Instant invoice
              <br />
              <span className="underline decoration-indigo-500 decoration-4 underline-offset-8">creation</span>
              <br />
              for freelancers
            </h1>
            <p className="mt-6 max-w-xl text-xl text-slate-600">
              Turn raw project details into polished, client-ready invoices without fighting spreadsheets or clunky accounting tools.
            </p>
            <button
              type="button"
              onClick={() => router.push(isSignedIn ? '/app' : '/sign-up')}
              className="mt-8 rounded-full bg-indigo-600 px-7 py-3 text-base font-semibold text-white shadow-[0_12px_22px_rgba(79,70,229,0.26)] transition hover:bg-indigo-700"
            >
              Join now ↗
            </button>
          </div>

          <div className="relative mx-auto w-full max-w-[560px]">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
              <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-[0_15px_35px_rgba(15,23,42,0.09)]">
                <div className="mb-3 flex items-center justify-between">
                  <span className="rounded-full bg-slate-900 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">Draft</span>
                  <span className="text-xs font-semibold text-slate-400">INV-042</span>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="h-2 w-24 rounded bg-slate-300" />
                  <div className="mt-3 h-12 rounded bg-white" />
                  <div className="mt-2 h-12 rounded bg-white" />
                  <div className="mt-3 h-2 w-16 rounded bg-slate-300" />
                </div>
              </div>
              <span className="text-5xl font-black text-indigo-600">→</span>
              <div className="rounded-[2rem] border border-indigo-200 bg-white p-4 shadow-[0_20px_45px_rgba(79,70,229,0.18)]">
                <div className="mb-3 flex items-center justify-between">
                  <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">Ready</span>
                  <span className="text-xs font-semibold text-slate-400">PDF Export</span>
                </div>
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                  <div className="h-2 w-24 rounded bg-indigo-300" />
                  <div className="mt-3 h-12 rounded bg-white" />
                  <div className="mt-2 h-12 rounded bg-white" />
                  <div className="mt-3 ml-auto h-6 w-28 rounded bg-indigo-200" />
                </div>
              </div>
            </div>
          </div>
        </RevealSection>

        <RevealSection id="features" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-8 sm:px-6 lg:px-8">
          <h2 className="text-center text-5xl font-black tracking-tight text-slate-900 sm:text-6xl">Built by freelancers, for freelancers</h2>
          <p className="mx-auto mt-4 max-w-3xl text-center text-xl text-slate-600">
            We cut the busywork so you can build, send, and track invoices in minutes.
          </p>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            <FeatureCard
              badge="Workflow-first"
              title="Faster Flow"
              description="Editing starts with your workflow, and timelines only appear when you need them."
            />
            <FeatureCard
              badge="Content-aware"
              title="Smart Fields"
              description="InvoiceFlow detects the critical fields and helps you complete totals, taxes, and dates quickly."
            />
            <FeatureCard
              badge="Brand-ready"
              title="Your Brand"
              description="Define your style once and keep a consistent look on every invoice you send."
            />
          </div>
        </RevealSection>

        <RevealSection id="process" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-14 sm:px-6 lg:px-8">
          <h2 className="text-center text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">Simple process. Better cashflow.</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
              <p className="text-sm font-bold uppercase tracking-wide text-indigo-600">Step 1</p>
              <h3 className="mt-2 text-2xl font-bold text-slate-900">Fill details</h3>
              <p className="mt-2 text-slate-600">Add your client, line items, and due date.</p>
            </article>
            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
              <p className="text-sm font-bold uppercase tracking-wide text-indigo-600">Step 2</p>
              <h3 className="mt-2 text-2xl font-bold text-slate-900">Pick template</h3>
              <p className="mt-2 text-slate-600">Choose a polished template that matches your brand.</p>
            </article>
            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
              <p className="text-sm font-bold uppercase tracking-wide text-indigo-600">Step 3</p>
              <h3 className="mt-2 text-2xl font-bold text-slate-900">Export + send</h3>
              <p className="mt-2 text-slate-600">Download a clean PDF and send it instantly.</p>
            </article>
          </div>
        </RevealSection>

        <RevealSection id="pricing" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-14 sm:px-6 lg:px-8">
          <h2 className="text-center text-6xl font-black tracking-tight text-slate-900">Let&apos;s create</h2>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            <PriceCard
              name="Free"
              price="$0/mo"
              description="Try it out for free, no commitments."
              highlights={['15 invoice exports / month', 'Guided AI suggestions', 'Basic templates', 'Email support']}
              ctaLabel="Try It"
              ctaNote="*we don't ask for your credit card"
              onClick={() => router.push(isSignedIn ? '/app' : '/sign-up')}
            />
            <PriceCard
              name="Creator"
              price="$6/mo"
              description="If you want to make more invoices and move faster."
              highlights={['40 invoice exports / month', 'Guided AI suggestions', 'Premium templates', 'Faster support']}
              emphasized
              ctaLabel="Get started"
              onClick={() => router.push(isSignedIn ? '/app' : '/sign-up')}
            />
            <PriceCard
              name="Pro"
              price="$20/mo"
              description="If you need high monthly volume and deeper control."
              highlights={['150 invoice exports / month', 'Guided AI suggestions', 'Advanced branding', 'Priority support']}
              ctaLabel="Get started"
              onClick={() => router.push(isSignedIn ? '/app' : '/sign-up')}
            />
          </div>
        </RevealSection>

        <RevealSection id="testimonials" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-8 sm:px-6 lg:px-8">
          <h2 className="text-center text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">Loved by independent creators</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <article className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-base text-slate-700">&quot;I send invoices in minutes now. Clients comment on how professional they look.&quot;</p>
              <p className="mt-3 text-sm font-semibold text-indigo-700">Aisha, UX Freelancer</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-base text-slate-700">&quot;The templates and tracking helped me get paid faster on every project.&quot;</p>
              <p className="mt-3 text-sm font-semibold text-indigo-700">Marco, Video Editor</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-base text-slate-700">&quot;Exactly what I needed. Clean, fast, and no accounting complexity.&quot;</p>
              <p className="mt-3 text-sm font-semibold text-indigo-700">Priya, Product Designer</p>
            </article>
          </div>
        </RevealSection>

        <RevealSection id="faq" className="mx-auto max-w-4xl rounded-3xl bg-[#f9fafb] px-4 py-14 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold">Questions? Answered.</h2>
          <div className="mt-8 space-y-3">
            {faqs.map((faq, index) => {
              const expanded = openFaq === index;
              return (
                <article
                  key={faq.q}
                  className="rounded-xl border border-slate-200 bg-white transition-colors duration-200 hover:bg-indigo-50/60"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(expanded ? null : index)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-slate-800"
                  >
                    <span>{faq.q}</span>
                    <span className="text-slate-400">{expanded ? '−' : '+'}</span>
                  </button>
                  <div
                    className={`grid overflow-hidden border-t border-slate-200 transition-all duration-300 ${
                      expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                    }`}
                  >
                    <p className="min-h-0 px-4 py-3 text-sm text-slate-600">{faq.a}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </RevealSection>

        <footer className="px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto mb-5 h-px w-full max-w-6xl bg-gradient-to-r from-indigo-500 to-indigo-200" />
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 text-center text-sm text-slate-600 md:flex-row md:items-center md:justify-between md:text-left">
            <p className="font-semibold text-indigo-600">InvoiceFlow — Made for freelancers</p>
            <div className="flex flex-col items-center gap-2 md:flex-row md:gap-4">
              <Link href="/privacy" className="hover:text-slate-900">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-slate-900">
                Terms of Service
              </Link>
            </div>
            <p>© 2026 InvoiceFlow</p>
          </div>
        </footer>
      </div>
    </main>
  );
}

export default LandingPage;
