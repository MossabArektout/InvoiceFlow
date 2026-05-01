type KeyboardShortcutsModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-slate-900">Keyboard Shortcuts</h3>
        <div className="mt-3 space-y-2 text-sm text-slate-700">
          <p className="flex items-center justify-between">
            <span>Save invoice</span>
            <code>⌘/Ctrl + S</code>
          </p>
          <p className="flex items-center justify-between">
            <span>Download PDF</span>
            <code>⌘/Ctrl + P</code>
          </p>
          <p className="flex items-center justify-between">
            <span>Open shortcuts</span>
            <code>?</code>
          </p>
        </div>
        <button
          type="button"
          className="mt-4 w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
}

