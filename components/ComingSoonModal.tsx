'use client';

import { useEffect, useMemo, useState } from 'react';

type ComingSoonModalProps = {
  isOpen: boolean;
  onClose: () => void;
  plan: 'creator' | 'pro';
  defaultEmail?: string;
};

export default function ComingSoonModal({ isOpen, onClose, plan, defaultEmail = '' }: ComingSoonModalProps) {
  const [email, setEmail] = useState(defaultEmail);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setEmail(defaultEmail);
    setIsSubmitting(false);
    setIsSubmitted(false);
    setError(null);
  }, [defaultEmail, isOpen]);

  const planLabel = useMemo(() => (plan === 'pro' ? 'Pro' : 'Creator'), [plan]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
          aria-label="Close coming soon"
        >
          ✕
        </button>
        <div className="-mt-2 flex flex-col items-center text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-xl text-indigo-700">⚡</div>
          <h3 className="mt-3 text-2xl font-bold text-slate-900">Coming Soon 🚀</h3>
          <p className="mt-2 text-sm text-slate-600">
            Paid plans are launching soon! Join the waitlist and we&apos;ll notify you the moment Creator and Pro plans are available.
          </p>
          <span className="mt-3 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">You&apos;re interested in: {planLabel}</span>
        </div>

        <div className="mt-5">
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={isSubmitted}
            placeholder="your@email.com"
            className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
          />
          {error ? <p className="mt-2 text-xs font-semibold text-red-600">{error}</p> : null}
          {isSubmitted ? <p className="mt-2 text-xs font-semibold text-emerald-600">You&apos;re on the list! 🎉</p> : null}
          <button
            type="button"
            disabled={isSubmitting || isSubmitted}
            onClick={async () => {
              setIsSubmitting(true);
              setError(null);

              try {
                const response = await fetch('/api/waitlist', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email: email.trim(), plan })
                });

                if (!response.ok) {
                  const body = (await response.json().catch(() => null)) as { error?: string; message?: string } | null;
                  setError(body?.error || body?.message || 'Unable to join waitlist.');
                  return;
                }

                setIsSubmitted(true);
              } catch {
                setError('Unable to join waitlist.');
              } finally {
                setIsSubmitting(false);
              }
            }}
            className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Submitting...' : isSubmitted ? 'Submitted' : 'Notify Me'}
          </button>
          <p className="mt-2 text-center text-xs text-slate-500">No spam. Unsubscribe anytime.</p>
        </div>
      </div>
    </div>
  );
}
