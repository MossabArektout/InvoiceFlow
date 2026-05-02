import type { UserPlan } from '@/lib/plans';

type ExportLimitModalProps = {
  isOpen: boolean;
  plan: UserPlan;
  exportsResetDate: string;
  formatShortDate: (value: string) => string;
  onClose: () => void;
  onJoinWaitlist: () => void;
};

export default function ExportLimitModal({
  isOpen,
  plan,
  exportsResetDate,
  formatShortDate,
  onClose,
  onJoinWaitlist
}: ExportLimitModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Monthly limit reached 📊</h3>
            <p className="mt-2 text-sm text-slate-600">
              {plan === 'free'
                ? `You've used all 15 of your free PDF exports this month. Resets on ${formatShortDate(exportsResetDate)}.`
                : plan === 'creator'
                  ? `You've used all 40 of your Creator exports this month. Resets on ${formatShortDate(exportsResetDate)}.`
                  : `You've used all 150 of your Pro exports this month. Resets on ${formatShortDate(exportsResetDate)}.`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
            aria-label="Close export limit modal"
          >
            ✕
          </button>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          {plan === 'free' ? (
            <button
              type="button"
              onClick={onJoinWaitlist}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Join Waitlist
            </button>
          ) : (
            <a
              href="mailto:support@invoiceflow.com"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Contact Support
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
