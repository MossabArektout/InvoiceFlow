import { type Dispatch, type ReactNode, type RefObject, type SetStateAction } from 'react';

type TemplateOption = {
  id: string;
  name: string;
};

type InvoicePreviewWorkspaceProps = {
  activeWorkspaceTab: 'edit' | 'preview';
  selectedTemplate: string;
  templateOptions: TemplateOption[];
  onTemplateChange: (templateId: string) => void;
  onSave: () => void;
  isSavingInvoice: boolean;
  isMobileViewport: boolean;
  mobilePreviewHeight: number;
  mobilePreviewScale: number;
  isPreviewFitWidth: boolean;
  setIsPreviewFitWidth: Dispatch<SetStateAction<boolean>>;
  invoiceRef: RefObject<HTMLDivElement>;
  renderSelectedTemplate: () => ReactNode;
  onOpenPreview: () => void;
  onDownloadPdf: () => void;
  onPrintInvoice: () => void;
  onShowShortcuts: () => void;
};

export default function InvoicePreviewWorkspace({
  activeWorkspaceTab,
  selectedTemplate,
  templateOptions,
  onTemplateChange,
  onSave,
  isSavingInvoice,
  isMobileViewport,
  mobilePreviewHeight,
  mobilePreviewScale,
  isPreviewFitWidth,
  setIsPreviewFitWidth,
  invoiceRef,
  renderSelectedTemplate,
  onOpenPreview,
  onDownloadPdf,
  onPrintInvoice,
  onShowShortcuts
}: InvoicePreviewWorkspaceProps) {
  return (
    <section className={`${activeWorkspaceTab === 'edit' ? 'hidden md:block' : 'block'} hide-scrollbar xl:h-full xl:min-h-0 xl:overflow-y-auto xl:pr-1`}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 border border-slate-200 bg-white p-4 shadow-sm md:p-5">
          <div className="flex items-center justify-between gap-4 px-1 py-1">
            <div className="flex min-w-0 items-center gap-3">
              <span className="shrink-0 text-[13px] font-semibold text-slate-600">Template</span>
              <select
                value={selectedTemplate}
                onChange={(event) => onTemplateChange(event.target.value)}
                className="h-10 min-w-[190px] rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700"
              >
                {templateOptions.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenPreview}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-slate-500">
                  <path d="M10 4c4.6 0 7.86 4.02 8.73 5.22a1.3 1.3 0 0 1 0 1.56C17.86 12 14.6 16 10 16s-7.86-4.02-8.73-5.22a1.3 1.3 0 0 1 0-1.56C2.14 8.02 5.4 4 10 4Zm0 2c-3.38 0-5.99 2.82-6.92 4 .93 1.18 3.54 4 6.92 4s5.99-2.82 6.92-4C15.99 8.82 13.38 6 10 6Zm0 1.75a2.25 2.25 0 1 1 0 4.5 2.25 2.25 0 0 1 0-4.5Z" />
                </svg>
                Preview
              </button>
              <button
                type="button"
                title="Download PDF (⌘/Ctrl+P)"
                onClick={onDownloadPdf}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-slate-500">
                  <path d="M10 2a1 1 0 0 1 1 1v7.17l1.59-1.58a1 1 0 1 1 1.41 1.42l-3.3 3.29a1 1 0 0 1-1.4 0l-3.3-3.3a1 1 0 0 1 1.41-1.4L9 10.16V3a1 1 0 0 1 1-1Z" />
                  <path d="M4 14a1 1 0 0 1 1 1v1h10v-1a1 1 0 1 1 2 0v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1Z" />
                </svg>
                Download
              </button>
              <button
                type="button"
                onClick={onPrintInvoice}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-slate-500">
                  <path d="M5 2a2 2 0 0 0-2 2v3h14V4a2 2 0 0 0-2-2H5Z" />
                  <path d="M3 9h14v5a2 2 0 0 1-2 2h-1v-3H6v3H5a2 2 0 0 1-2-2V9Z" />
                </svg>
                Print
              </button>
              {/* <button
                type="button"
                onClick={onShowShortcuts}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-slate-500">
                  <circle cx="4" cy="10" r="1.5" />
                  <circle cx="10" cy="10" r="1.5" />
                  <circle cx="16" cy="10" r="1.5" />
                </svg>
                More
              </button> */}
              {/* <button
                type="button"
                title="Save Invoice (⌘/Ctrl+S)"
                onClick={onSave}
                disabled={isSavingInvoice}
                className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-slate-500">
                  <path d="M4 2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.83a2 2 0 0 0-.59-1.42l-3.82-3.82A2 2 0 0 0 12.17 2H4Zm2 2h6v4H6V4Zm4 10a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z" />
                </svg>
                Customize
              </button> */}
            </div>
          </div>

          <div className="mt-3 flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="min-w-0 flex-1 overflow-x-auto border border-slate-200 bg-white shadow-[0_14px_28px_rgba(15,23,42,0.12)]">
                <div className="relative">
                  <div
                    className="origin-top md:origin-center"
                    style={
                      isMobileViewport
                        ? {
                            width: '794px',
                            height: `${mobilePreviewHeight}px`,
                            transform: `scale(${mobilePreviewScale})`,
                            transformOrigin: 'top left'
                          }
                        : undefined
                    }
                  >
                    <div
                      ref={invoiceRef}
                      className={`mx-auto break-normal bg-white ${
                        isPreviewFitWidth ? 'w-full max-w-none' : 'w-full max-w-[794px]'
                      }`}
                    >
                      {renderSelectedTemplate()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white">
                <button type="button" className="inline-flex h-8 w-8 items-center justify-center text-slate-600 hover:bg-slate-50">-</button>
                <span className="inline-flex h-8 min-w-[56px] items-center justify-center border-x border-slate-200 text-sm font-semibold text-slate-700">100%</span>
                <button type="button" className="inline-flex h-8 w-8 items-center justify-center text-slate-600 hover:bg-slate-50">+</button>
              </div>
              <button
                type="button"
                onClick={() => setIsPreviewFitWidth((prev) => !prev)}
                className={`inline-flex h-8 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition ${
                  isPreviewFitWidth
                    ? 'border-slate-400 bg-slate-100 text-slate-900'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-slate-500">
                  <path d="M3 5a2 2 0 0 1 2-2h3a1 1 0 1 1 0 2H5v3a1 1 0 1 1-2 0V5Zm14 0v3a1 1 0 1 1-2 0V5h-3a1 1 0 1 1 0-2h3a2 2 0 0 1 2 2Zm-2 10v-3a1 1 0 1 1 2 0v3a2 2 0 0 1-2 2h-3a1 1 0 1 1 0-2h3Zm-10-3v3h3a1 1 0 1 1 0 2H5a2 2 0 0 1-2-2v-3a1 1 0 1 1 2 0Z" />
                </svg>
                Fit Width
              </button>
            </div>
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              aria-label="Expand preview"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path d="M3 7V3h4a1 1 0 1 1 0 2H5v2a1 1 0 1 1-2 0Zm14 0a1 1 0 1 1-2 0V5h-2a1 1 0 1 1 0-2h4v4Zm-2 8v-2a1 1 0 1 1 2 0v4h-4a1 1 0 1 1 0-2h2ZM3 13a1 1 0 1 1 2 0v2h2a1 1 0 1 1 0 2H3v-4Z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
