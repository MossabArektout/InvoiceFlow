import { type ReactNode } from 'react';

type PreviewModalProps = {
  invoiceNumber: string;
  selectedTemplateName: string;
  onClose: () => void;
  onDownload: () => void;
  children: ReactNode;
};

export default function PreviewModal({
  invoiceNumber,
  selectedTemplateName,
  onClose,
  onDownload,
  children
}: PreviewModalProps) {
  return (
    <div className="fixed inset-0 z-[65] bg-slate-900/55 p-3 sm:p-5" onClick={onClose}>
      <div
        className="mx-auto flex h-full w-full max-w-7xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-800">Preview · {invoiceNumber || 'Draft Invoice'}</p>
            <p className="truncate text-xs text-slate-500">Read-only preview using template: {selectedTemplateName}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onDownload}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-indigo-600 px-3 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Download PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100"
              aria-label="Close preview"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto bg-slate-100 p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );
}

