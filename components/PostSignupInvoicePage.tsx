'use client';

type PostSignupInvoicePageProps = {
  onContinue: () => void;
};

const toolbarItems = [
  { label: 'Download', sub: 'PDF', icon: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
      <path d="M10 2a1 1 0 0 1 1 1v7.17l1.59-1.58a1 1 0 1 1 1.41 1.42l-3.3 3.29a1 1 0 0 1-1.4 0l-3.3-3.3a1 1 0 0 1 1.41-1.4L9 10.16V3a1 1 0 0 1 1-1Z" />
      <path d="M4 14a1 1 0 0 1 1 1v1h10v-1a1 1 0 1 1 2 0v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1Z" />
    </svg>
  ) },
  { label: 'Send', sub: 'Email', icon: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
      <path d="M2 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v.4l-8 4.8-8-4.8V5Zm0 2.74 7.49 4.5a1 1 0 0 0 1.02 0L18 7.74V15a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7.74Z" />
    </svg>
  ) },
  { label: 'Share', sub: 'Link', icon: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
      <path d="M12.5 4a3.5 3.5 0 0 1 2.47 5.97l-2 2a3.5 3.5 0 1 1-4.95-4.95l.72-.72a.75.75 0 1 1 1.06 1.06l-.72.72a2 2 0 1 0 2.83 2.83l2-2A2 2 0 1 0 11.09 6.1l-.54.55a.75.75 0 1 1-1.07-1.05l.55-.55A3.49 3.49 0 0 1 12.5 4ZM6.03 8.03a3.5 3.5 0 1 1 4.95 4.95l-.72.72a.75.75 0 1 1-1.06-1.06l.72-.72a2 2 0 0 0-2.83-2.83l-2 2A2 2 0 1 0 7.9 13.9l.54-.55a.75.75 0 0 1 1.07 1.05l-.55.55a3.49 3.49 0 0 1-2.47 1.03 3.5 3.5 0 0 1-2.47-5.97l2-2Z" />
    </svg>
  ) },
  { label: 'Print', sub: 'Invoice', icon: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
      <path d="M5 3a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v3H5V3Zm10 4H5a3 3 0 0 0-3 3v3h3v4h10v-4h3v-3a3 3 0 0 0-3-3Zm-2 8H7v-4h6v4Zm2-5a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" />
    </svg>
  ) },
  { label: 'More', sub: 'Options', icon: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
      <path d="M4.5 9a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm5.5 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm4 1.5a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Z" />
    </svg>
  ) }
];

export default function PostSignupInvoicePage({ onContinue }: PostSignupInvoicePageProps) {
  return (
    <div className="workspace-bg min-h-screen text-slate-900">
      <div className="md:pl-[var(--workspace-sidebar-width)]">
        <div className="mx-auto w-full max-w-[1820px] p-4 md:p-5 lg:p-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3 px-1">
              <div>
                <h1 className="text-[42px] font-bold leading-none tracking-tight text-slate-900">Create Invoice</h1>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path d="M10 2a.75.75 0 0 1 .75.75v1.02a6.5 6.5 0 1 1-1.5 0V2.75A.75.75 0 0 1 10 2Z" /></svg>
                </button>
                <button type="button" className="inline-flex h-10 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-slate-500"><path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm0 1.5a6.5 6.5 0 0 1 6.47 6H13.5a12.9 12.9 0 0 0-.5-3.36A5 5 0 0 0 10 3.5ZM8.2 6.93c.2-.73.49-1.33.83-1.77.34.44.63 1.04.83 1.77.17.62.3 1.35.35 2.17H7.85c.06-.82.18-1.55.35-2.17ZM3.53 9.5A6.5 6.5 0 0 1 10 3.5c-.96 0-1.87.99-2.47 2.64A14.4 14.4 0 0 0 7 9.5H3.53Zm0 1.5H7c.08 1.64.38 3.08.82 4.15.6 1.65 1.5 2.64 2.47 2.64a6.5 6.5 0 0 1-6.47-6Zm4.32 0h2.36a10.6 10.6 0 0 1-.35 2.17c-.2.73-.49 1.33-.83 1.77-.34-.44-.63-1.04-.83-1.77A10.6 10.6 0 0 1 7.85 11Zm2.15 6.79c.96 0 1.87-.99 2.47-2.64.44-1.07.74-2.5.82-4.15h3.18A6.5 6.5 0 0 1 10 17.79Z"/></svg>
                  EN
                </button>
                <button type="button" className="inline-flex h-10 items-center rounded-lg bg-[#2f5be9] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#254fda]">Preview &amp; Send</button>
                <button type="button" className="inline-flex h-10 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">Save Draft</button>
              </div>
          </div>

          <div className="grid items-start gap-4 xl:grid-cols-[minmax(340px,410px)_minmax(0,1.62fr)]">
              <section className="overflow-hidden rounded-xl border border-[#e7eaf1] bg-white shadow-[0_4px_16px_rgba(15,23,42,0.05)]">
                <div className="border-b border-[#edf0f6] p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-[#5a83ef]"><path d="M4 3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7.83a2 2 0 0 0-.59-1.41l-2.83-2.83A2 2 0 0 0 11.17 3H4Zm7 1.5V8h3.5L11 4.5Z" /></svg>
                    <p className="text-[15px] font-semibold text-slate-800">Invoice Details</p>
                  </div>
                  <div className="space-y-3">
                    <DetailField label="Invoice Number" value="INV-2024-0056" />
                    <DetailField label="Issue Date" value="May 20, 2024" />
                    <DetailField label="Due Date" value="June 20, 2024" />
                    <DetailField label="Currency" value="USD - US Dollar" />
                  </div>
                </div>

                <div className="border-b border-[#edf0f6] p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-[15px] font-semibold text-slate-800">Bill From</p>
                    <button type="button" className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50">Edit</button>
                  </div>
                  <div className="grid grid-cols-[1fr_112px] gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Your Business Name</p>
                      <p className="mt-1 text-sm text-slate-600">123 Business Street</p>
                      <p className="text-sm text-slate-600">New York, NY 10001, USA</p>
                      <p className="mt-1 text-sm text-slate-600">+1 (555) 123-4567</p>
                      <p className="text-sm text-slate-600">hello@yourbusiness.com</p>
                    </div>
                    <button type="button" className="flex min-h-[104px] items-center justify-center rounded-lg border border-dashed border-[#b9cdfb] bg-[#f7faff] text-sm font-semibold text-[#5a83ef]">Upload Logo</button>
                  </div>
                </div>

                <div className="border-b border-[#edf0f6] p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-[15px] font-semibold text-slate-800">Bill To</p>
                    <button type="button" className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50">Edit</button>
                  </div>
                  <p className="text-sm font-semibold text-slate-800">Acme Corporation</p>
                  <p className="mt-1 text-sm text-slate-600">John Smith</p>
                  <p className="text-sm text-slate-600">500 Market Street</p>
                  <p className="text-sm text-slate-600">San Francisco, CA 94105, USA</p>
                  <p className="mt-1 text-sm text-slate-600">+1 (555) 987-6543</p>
                  <p className="text-sm text-slate-600">john.smith@acmecorp.com</p>
                </div>

                <div className="p-5">
                  <p className="mb-2 text-sm font-semibold text-slate-900">Payment Terms</p>
                  <div className="flex min-h-[44px] items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700">Net 30</div>
                  <p className="mt-2 text-xs text-slate-500">Payment is due within 30 days.</p>
                </div>
              </section>

              <section className="overflow-hidden rounded-xl border border-[#e7eaf1] bg-white p-3 shadow-[0_4px_16px_rgba(15,23,42,0.05)]">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#edf0f6] bg-white px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-500">Template</span>
                    <div className="inline-flex h-9 items-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700">Modern Blue</div>
                  </div>
                  <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white p-1.5">
                    {['#2f5be9', '#38bdf8', '#10b981', '#f59e0b', '#6b7280'].map((color, index) => (
                      <span key={color} className={`h-5 w-5 rounded-md ${index === 0 ? 'ring-2 ring-[#a9bbf7]' : ''}`} style={{ backgroundColor: color }} />
                    ))}
                  </div>
                  <button type="button" className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Customize</button>
                </div>

                <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_96px]">
                  <div className="rounded-lg border border-[#e8ebf3] bg-[#f7f9ff] p-2.5 lg:p-3.5">
                    <div className="flex min-h-[690px] items-center justify-center rounded-md border border-[#dfe6f6] bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
                      <img src="/logoinvoice1.png" alt="Invoice preview" className="h-auto max-h-[640px] w-full max-w-[900px] object-contain" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-1 xl:content-center">
                    {toolbarItems.map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        className="flex min-h-[92px] flex-col items-center justify-center rounded-lg border border-slate-200 bg-white px-2 text-center text-sm font-semibold text-slate-600 shadow-[0_2px_8px_rgba(15,23,42,0.04)] hover:bg-slate-50"
                      >
                        <span className="text-slate-500">{item.icon}</span>
                        <span className="mt-1 leading-tight">{item.label}</span>
                        <span className="text-slate-400">{item.sub}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between rounded-lg border border-[#edf0f6] bg-white px-3 py-2">
                  <div className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-600">
                    <span>-</span>
                    <span>100%</span>
                    <span>+</span>
                  </div>
                  <button type="button" className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700">Fit Width</button>
                  <button type="button" className="rounded-md border border-slate-200 px-2 py-1.5 text-sm font-medium text-slate-700">⛶</button>
                </div>
              </section>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={onContinue}
                className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Continue To Full Editor
              </button>
            </div>
        </div>
      </div>
    </div>
  );
}

const DetailField = ({ label, value }: { label: string; value: string }) => (
  <div className="grid grid-cols-[110px_1fr] items-center gap-2">
    <p className="text-sm font-medium text-slate-500">{label}</p>
    <div className="flex h-11 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700">{value}</div>
  </div>
);
