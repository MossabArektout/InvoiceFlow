type MobileActionBarProps = {
  isEditTab: boolean;
  isSavingInvoice: boolean;
  onSave: () => void;
  onDownload: () => void;
};

const Spinner = ({ size = 'h-4 w-4' }: { size?: string }) => (
  <span className={`${size} inline-block animate-spin rounded-full border-2 border-current border-r-transparent`} />
);

export default function MobileActionBar({ isEditTab, isSavingInvoice, onSave, onDownload }: MobileActionBarProps) {
  if (!isEditTab) return null;

  return (
    <div className="fixed inset-x-0 bottom-[58px] z-30 border-t border-slate-200 bg-white px-4 py-3 md:hidden">
      <div className="mx-auto grid max-w-[1700px] grid-cols-1 gap-2 min-[400px]:grid-cols-2">
        <button
          type="button"
          title="Save Invoice (⌘/Ctrl+S)"
          onClick={onSave}
          disabled={isSavingInvoice}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-indigo-300 bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSavingInvoice ? <Spinner /> : null}
          Save Invoice
        </button>
        <button
          type="button"
          title="Download PDF (⌘/Ctrl+P)"
          onClick={onDownload}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M10 2a1 1 0 0 1 1 1v7.17l1.59-1.58a1 1 0 1 1 1.41 1.42l-3.3 3.29a1 1 0 0 1-1.4 0l-3.3-3.3a1 1 0 0 1 1.41-1.4L9 10.16V3a1 1 0 0 1 1-1Z" />
            <path d="M4 14a1 1 0 0 1 1 1v1h10v-1a1 1 0 1 1 2 0v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1Z" />
          </svg>
          Download PDF
        </button>
      </div>
    </div>
  );
}
