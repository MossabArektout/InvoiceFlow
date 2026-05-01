import {
  type Dispatch,
  type MouseEvent as ReactMouseEvent,
  type RefObject,
  type SetStateAction,
  type TouchEvent as ReactTouchEvent
} from 'react';
import { Field, FormBlock } from './FormPrimitives';

type Party = {
  name: string;
  email: string;
  address: string;
};

type LineItem = {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
  discountPercent: string;
};

type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
type SignatureMode = 'upload' | 'draw';

type InvoiceData = {
  from: Party;
  to: Party;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  notes: string;
  paymentTerms: string;
  discountType: 'percentage' | 'fixed';
  discountValue: string;
  shippingFee: string;
  taxPercent: string;
  signatureMode: SignatureMode;
  signatureDataUrl: string;
  items: LineItem[];
};

type InvoiceComputed = {
  lineTotals: number[];
  subtotal: number;
  discountAmount: number;
  taxableSubtotal: number;
  taxAmount: number;
  shippingAmount: number;
  grandTotal: number;
};

type CurrencyOption = {
  code: string;
  name: string;
};

type StatusOption = {
  value: InvoiceStatus;
  label: string;
};

type InvoiceEditorPanelProps = {
  activeWorkspaceTab: 'edit' | 'preview';
  data: InvoiceData;
  clearForm: () => void;
  isBillFromExpanded: boolean;
  setIsBillFromExpanded: Dispatch<SetStateAction<boolean>>;
  isBillToExpanded: boolean;
  setIsBillToExpanded: Dispatch<SetStateAction<boolean>>;
  logoInputRef: RefObject<HTMLInputElement>;
  uploadLogoFile: (file: File) => Promise<void>;
  handleLogoPick: () => void;
  isLogoUploading: boolean;
  isLogoDragActive: boolean;
  setIsLogoDragActive: Dispatch<SetStateAction<boolean>>;
  isLogoLoading: boolean;
  logoDisplayUrl: string | null;
  deleteLogo: () => Promise<void>;
  updateParty: (side: 'from' | 'to', field: keyof Party, value: string) => void;
  errorFields: string[];
  onOpenClientPicker: () => void;
  onSaveToClient: () => void;
  savingClientMode: 'none' | 'quick' | 'modal' | 'edit';
  selectedCurrency: string;
  setSelectedCurrency: (currency: string) => void;
  currencies: CurrencyOption[];
  setData: Dispatch<SetStateAction<InvoiceData>>;
  statusOptions: StatusOption[];
  setIsLineItemsModalOpen: Dispatch<SetStateAction<boolean>>;
  computed: InvoiceComputed;
  isDiscountVisible: boolean;
  formatCurrency: (value: number, currencyCode: string) => string;
  signatureInputRef: RefObject<HTMLInputElement>;
  handleSignatureUpload: (file: File) => void;
  signatureCanvasRef: RefObject<HTMLCanvasElement>;
  beginSignatureStroke: (event: ReactMouseEvent<HTMLCanvasElement> | ReactTouchEvent<HTMLCanvasElement>) => void;
  drawSignatureStroke: (event: ReactMouseEvent<HTMLCanvasElement> | ReactTouchEvent<HTMLCanvasElement>) => void;
  endSignatureStroke: () => void;
  clearSignatureCanvas: () => void;
};

const Spinner = ({ size = 'h-4 w-4' }: { size?: string }) => (
  <span className={`${size} inline-block animate-spin rounded-full border-2 border-current border-r-transparent`} />
);

export default function InvoiceEditorPanel({
  activeWorkspaceTab,
  data,
  clearForm,
  isBillFromExpanded,
  setIsBillFromExpanded,
  isBillToExpanded,
  setIsBillToExpanded,
  logoInputRef,
  uploadLogoFile,
  handleLogoPick,
  isLogoUploading,
  isLogoDragActive,
  setIsLogoDragActive,
  isLogoLoading,
  logoDisplayUrl,
  deleteLogo,
  updateParty,
  errorFields,
  onOpenClientPicker,
  onSaveToClient,
  savingClientMode,
  selectedCurrency,
  setSelectedCurrency,
  currencies,
  setData,
  statusOptions,
  setIsLineItemsModalOpen,
  computed,
  isDiscountVisible,
  formatCurrency,
  signatureInputRef,
  handleSignatureUpload,
  signatureCanvasRef,
  beginSignatureStroke,
  drawSignatureStroke,
  endSignatureStroke,
  clearSignatureCanvas
}: InvoiceEditorPanelProps) {
  return (
    <section className={`${activeWorkspaceTab === 'preview' ? 'hidden md:block' : 'block'} hide-scrollbar xl:h-full xl:min-h-0 xl:overflow-y-auto xl:pr-1`}>
      <div className="overflow-hidden border border-slate-200 bg-white p-0 shadow-sm">
        <div className="border-b border-slate-200 bg-white px-5 py-4 md:px-6">
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-900">{data.invoiceNumber}</h2>
            </div>
            <button
              type="button"
              onClick={clearForm}
              className="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-0 p-4 pb-10 md:p-5 md:pb-12">
          <div className="order-2">
            <FormBlock
              title="Bill From"
              action={
                <button
                  type="button"
                  onClick={() => setIsBillFromExpanded((prev) => !prev)}
                  className="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  {isBillFromExpanded ? 'Done' : 'Edit'}
                </button>
              }
            >
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  void uploadLogoFile(file);
                  e.currentTarget.value = '';
                }}
              />
              {!isBillFromExpanded ? (
                <div className="grid grid-cols-[1fr_120px] gap-3">
                  <div className="space-y-1 text-sm text-slate-600">
                    <p className="font-semibold text-slate-800">{data.from.name || '-'}</p>
                    <p className="whitespace-pre-line">{data.from.address || '-'}</p>
                    <p>{data.from.email || '-'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogoPick}
                    className="flex min-h-[112px] items-center justify-center rounded-xl border border-dashed border-indigo-200 bg-indigo-50/30 px-2 text-center text-sm font-semibold text-indigo-500 hover:bg-indigo-50"
                  >
                    Upload Logo
                  </button>
                </div>
              ) : null}
              {isBillFromExpanded ? (
                <>
                  <div className="grid gap-3 md:grid-cols-[1fr_132px] md:items-start">
                    <div className="space-y-3">
                      <Field label="Your Name / Company Name" required>
                        <input
                          value={data.from.name}
                          onChange={(e) => updateParty('from', 'name', e.target.value)}
                          placeholder="Your Business Name"
                          className={errorFields.includes('from.name') ? 'field-error-shake border-red-300' : ''}
                        />
                      </Field>
                      <Field label="Your Email" required>
                        <input
                          type="email"
                          value={data.from.email}
                          onChange={(e) => updateParty('from', 'email', e.target.value)}
                          placeholder="hello@yourbusiness.com"
                          className={errorFields.includes('from.email') ? 'field-error-shake border-red-300' : ''}
                        />
                      </Field>
                      <Field label="Your Address" required>
                        <textarea
                          rows={3}
                          value={data.from.address}
                          onChange={(e) => updateParty('from', 'address', e.target.value)}
                          placeholder="123 Business Street"
                        />
                      </Field>
                    </div>

                    <div
                      role="button"
                      tabIndex={0}
                      aria-label="Upload company logo"
                      onClick={handleLogoPick}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleLogoPick();
                        }
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (isLogoUploading) return;
                        setIsLogoDragActive(true);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        setIsLogoDragActive(false);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsLogoDragActive(false);
                        if (isLogoUploading) return;
                        const file = e.dataTransfer.files?.[0];
                        if (!file) return;
                        void uploadLogoFile(file);
                      }}
                      className={`group relative mt-6 flex min-h-[148px] items-center justify-center overflow-hidden rounded-xl border-2 border-dashed p-3 text-center transition ${
                        isLogoDragActive ? 'border-indigo-500 bg-[#EEF2FF]' : 'border-indigo-300 bg-[#f8faff]'
                      } ${isLogoUploading ? 'cursor-not-allowed opacity-80' : 'cursor-pointer hover:border-indigo-300'}`}
                    >
                      {isLogoLoading ? (
                        <div className="h-24 w-full animate-pulse rounded-lg bg-slate-200/70" />
                      ) : isLogoUploading ? (
                        <div className="flex h-24 flex-col items-center justify-center gap-2 text-indigo-700">
                          <Spinner size="h-5 w-5" />
                          <p className="text-sm font-semibold">Uploading...</p>
                        </div>
                      ) : logoDisplayUrl ? (
                        <>
                          <div className="flex h-24 items-center justify-center rounded-lg bg-white/80 p-3">
                            <img
                              src={logoDisplayUrl}
                              alt="Company logo"
                              className="max-h-20 max-w-full object-contain"
                              width={320}
                              height={80}
                              crossOrigin="anonymous"
                            />
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center gap-3 bg-slate-900/60 opacity-0 transition group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLogoPick();
                              }}
                              className="inline-flex rounded-full bg-white p-2 text-slate-700 hover:bg-slate-100"
                              aria-label="Replace logo"
                            >
                              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                                <path d="m14.85 2.15 3 3a.5.5 0 0 1 0 .7l-8.9 8.9-4.05.58a.5.5 0 0 1-.56-.56l.58-4.05 8.9-8.9a.5.5 0 0 1 .7 0ZM4 16.5h12a.5.5 0 0 1 0 1H4a.5.5 0 0 1 0-1Z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                void deleteLogo();
                              }}
                              className="inline-flex rounded-full bg-red-500 p-2 text-white hover:bg-red-600"
                              aria-label="Delete logo"
                            >
                              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                                <path d="M8.5 2a1 1 0 0 0-1 1v1H5a1 1 0 1 0 0 2h.46l.67 9.38A2 2 0 0 0 8.13 17h3.74a2 2 0 0 0 2-1.62L14.54 6H15a1 1 0 1 0 0-2h-2.5V3a1 1 0 0 0-1-1h-3Z" />
                              </svg>
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="flex h-24 flex-col items-center justify-center gap-1">
                          <svg viewBox="0 0 20 20" fill="currentColor" className="h-6 w-6 text-indigo-400">
                            <path d="M10 2a1 1 0 0 1 1 1v7.17l1.59-1.58a1 1 0 1 1 1.41 1.42l-3.3 3.29a1 1 0 0 1-1.4 0l-3.3-3.3a1 1 0 0 1 1.41-1.4L9 10.16V3a1 1 0 0 1 1-1Z" />
                            <path d="M4 14a1 1 0 0 1 1 1v1h10v-1a1 1 0 1 1 2 0v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1Z" />
                          </svg>
                          <p className="text-sm font-semibold text-indigo-500">Upload Logo</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : null}
            </FormBlock>
          </div>

          <div className="order-3">
            <FormBlock
              title="Bill To"
              action={
                <button
                  type="button"
                  onClick={() => setIsBillToExpanded((prev) => !prev)}
                  className="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  {isBillToExpanded ? 'Done' : 'Edit'}
                </button>
              }
            >
              {!isBillToExpanded ? (
                <div className="space-y-1 text-sm text-slate-600">
                  <p className="font-semibold text-slate-800">{data.to.name || '-'}</p>
                  <p className="whitespace-pre-line">{data.to.address || '-'}</p>
                  <p>{data.to.email || '-'}</p>
                </div>
              ) : null}
              {isBillToExpanded ? (
                <>
                  <div className="space-y-3">
                    <Field label="Client Name" required>
                      <input
                        value={data.to.name}
                        onChange={(e) => updateParty('to', 'name', e.target.value)}
                        placeholder="Acme Corporation"
                        className={errorFields.includes('to.name') ? 'field-error-shake border-red-300' : ''}
                      />
                    </Field>
                    <Field label="Client Email" required>
                      <input
                        type="email"
                        value={data.to.email}
                        onChange={(e) => updateParty('to', 'email', e.target.value)}
                        placeholder="john.smith@acmecorp.com"
                        className={errorFields.includes('to.email') ? 'field-error-shake border-red-300' : ''}
                      />
                    </Field>
                    <Field label="Client Address" required>
                      <textarea
                        rows={3}
                        value={data.to.address}
                        onChange={(e) => updateParty('to', 'address', e.target.value)}
                        placeholder="500 Market Street"
                      />
                    </Field>
                  </div>
                  <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1">
                    <button
                      type="button"
                      onClick={onOpenClientPicker}
                      className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-2.5 text-xs font-medium text-white hover:bg-indigo-700"
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                        <path d="M10 2a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Zm-7 14a7 7 0 1 1 14 0v1H3v-1Z" />
                      </svg>
                      Select Client
                    </button>
                    <button
                      type="button"
                      onClick={onSaveToClient}
                      disabled={savingClientMode === 'quick'}
                      className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingClientMode === 'quick' ? <Spinner /> : null}
                      Save as Client
                    </button>
                  </div>
                </>
              ) : null}
            </FormBlock>
          </div>

          <div className="order-1">
            <FormBlock title="Invoice Details">
              <div className="space-y-3">
                <div className="grid items-center gap-3 sm:grid-cols-[130px_1fr]">
                  <p className="text-sm font-medium text-slate-500">Invoice Number</p>
                  <div className="relative">
                    <input value={data.invoiceNumber} readOnly className="h-10 rounded-lg bg-slate-50 pr-10" />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                        <path d="M8 2a2 2 0 0 0-2 2v1H5a2 2 0 0 0-2 2v2h2V7h10v10H5v-2H3v2a2 2 0 0 0 2 2h1v1a2 2 0 1 0 4 0v-1h2v1a2 2 0 1 0 4 0v-1h1a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-1V4a2 2 0 1 0-4 0v1h-2V4a2 2 0 0 0-2-2Zm1 3V4a1 1 0 1 1 2 0v1H9Zm4 0V4a1 1 0 1 1 2 0v1h-2Z" />
                      </svg>
                    </span>
                  </div>
                </div>
                <div className="grid items-center gap-3 sm:grid-cols-[130px_1fr]">
                  <p className="text-sm font-medium text-slate-500">Issue Date</p>
                  <div className="relative">
                    <input
                      type="date"
                      value={data.issueDate}
                      onChange={(e) => setData((prev) => ({ ...prev, issueDate: e.target.value }))}
                      className="h-10 rounded-lg pr-10"
                    />
                  </div>
                </div>
                <div className="grid items-center gap-3 sm:grid-cols-[130px_1fr]">
                  <p className="text-sm font-medium text-slate-500">Due Date</p>
                  <div className="relative">
                    <input
                      type="date"
                      value={data.dueDate}
                      onChange={(e) => setData((prev) => ({ ...prev, dueDate: e.target.value }))}
                      className="h-10 rounded-lg pr-10"
                    />
                  </div>
                </div>
                <div className="grid items-center gap-3 sm:grid-cols-[130px_1fr]">
                  <p className="text-sm font-medium text-slate-500">Currency</p>
                  <select
                    value={selectedCurrency}
                    onChange={(e) => setSelectedCurrency(e.target.value)}
                    className="h-10 rounded-lg"
                  >
                    {currencies.map((currency) => (
                      <option key={currency.code} value={currency.code}>
                        {currency.code} - {currency.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </FormBlock>
          </div>

          <div className="order-4">
            <FormBlock title="Payment Terms">
              <input
                value={data.paymentTerms}
                onChange={(e) => setData((prev) => ({ ...prev, paymentTerms: e.target.value }))}
                placeholder="Payment due within 14 days"
              />
              <div className="mt-3">
                <Field label="Status">
                  <select
                    value={data.status}
                    onChange={(e) => setData((prev) => ({ ...prev, status: e.target.value as InvoiceStatus }))}
                    className="h-10 rounded-lg"
                  >
                    {statusOptions.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {[7, 14, 30, 60].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setData((prev) => ({ ...prev, paymentTerms: `Payment due within ${days} days` }))}
                    className="inline-flex h-8 items-center rounded-full border border-slate-300 bg-white px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                  >
                    Net {days}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500">{data.paymentTerms.trim() || 'No payment terms set yet.'}</p>
            </FormBlock>
          </div>

          <div className="order-5">
            <FormBlock title="Line Items">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  {data.items.length} item{data.items.length === 1 ? '' : 's'}
                </p>
                <button
                  type="button"
                  onClick={() => setIsLineItemsModalOpen(true)}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-indigo-600">
                    <path d="M10 4a1 1 0 0 1 1 1v4h4a1 1 0 1 1 0 2h-4v4a1 1 0 1 1-2 0v-4H5a1 1 0 1 1 0-2h4V5a1 1 0 0 1 1-1Z" />
                  </svg>
                  Add File
                </button>
              </div>
              <div className="mt-2 space-y-1 text-sm">
                <p className="flex items-center justify-between">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="font-medium text-slate-800">{formatCurrency(computed.subtotal, selectedCurrency)}</span>
                </p>
                {isDiscountVisible ? (
                  <p className="flex items-center justify-between">
                    <span className="text-slate-500">Discount</span>
                    <span className="font-medium text-slate-800">- {formatCurrency(computed.discountAmount, selectedCurrency)}</span>
                  </p>
                ) : null}
                <p className="flex items-center justify-between">
                  <span className="text-slate-500">Tax</span>
                  <span className="font-medium text-slate-800">{formatCurrency(computed.taxAmount, selectedCurrency)}</span>
                </p>
                <p className="flex items-center justify-between">
                  <span className="text-slate-500">Shipping</span>
                  <span className="font-medium text-slate-800">{formatCurrency(computed.shippingAmount, selectedCurrency)}</span>
                </p>
                <p className="mt-1 flex items-center justify-between border-t border-slate-200 pt-2 text-base font-semibold text-indigo-700">
                  <span>Total</span>
                  <span>{formatCurrency(computed.grandTotal, selectedCurrency)}</span>
                </p>
              </div>
            </FormBlock>
          </div>

          <div className="order-6">
            <FormBlock title="Additional Details">
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-slate-500">Notes</label>
                  <textarea
                    rows={3}
                    value={data.notes}
                    onChange={(e) => setData((prev) => ({ ...prev, notes: e.target.value.slice(0, 500) }))}
                    placeholder="Thank you for your business! We appreciate your prompt payment."
                    className="resize-y"
                  />
                  <p className={`mt-1 text-right text-xs ${data.notes.length >= 500 ? 'text-red-600' : 'text-slate-500'}`}>
                    {data.notes.length} / 500
                  </p>
                </div>
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-slate-500">Signature (Optional)</label>
                  <input
                    ref={signatureInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      handleSignatureUpload(file);
                      e.currentTarget.value = '';
                    }}
                  />
                  <div className="inline-flex rounded-full border border-slate-300 bg-slate-50 p-0.5">
                    <button
                      type="button"
                      onClick={() => setData((prev) => ({ ...prev, signatureMode: 'upload' }))}
                      className={`inline-flex h-8 items-center rounded-full px-3 text-xs font-medium ${
                        data.signatureMode === 'upload' ? 'bg-indigo-600 text-white' : 'text-slate-600'
                      }`}
                    >
                      Upload Image
                    </button>
                    <button
                      type="button"
                      onClick={() => setData((prev) => ({ ...prev, signatureMode: 'draw' }))}
                      className={`inline-flex h-8 items-center rounded-full px-3 text-xs font-medium ${
                        data.signatureMode === 'draw' ? 'bg-indigo-600 text-white' : 'text-slate-600'
                      }`}
                    >
                      Draw
                    </button>
                  </div>

                  {data.signatureMode === 'upload' ? (
                    <div className="mt-3 space-y-2">
                      <button
                        type="button"
                        onClick={() => signatureInputRef.current?.click()}
                        className="rounded-lg border border-indigo-300 bg-white px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
                      >
                        Upload Signature Image
                      </button>
                      {data.signatureDataUrl ? (
                        <div className="rounded-lg border border-slate-200 bg-white p-3">
                          <img
                            src={data.signatureDataUrl}
                            alt="Signature preview"
                            className="max-h-16 w-auto"
                            width={220}
                            height={90}
                          />
                          <button
                            type="button"
                            onClick={() => setData((prev) => ({ ...prev, signatureDataUrl: '' }))}
                            className="mt-2 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            Remove Signature
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                      <canvas
                        ref={signatureCanvasRef}
                        width={560}
                        height={160}
                        className="h-32 w-full touch-none rounded border border-dashed border-slate-300 bg-slate-50"
                        onMouseDown={beginSignatureStroke}
                        onMouseMove={drawSignatureStroke}
                        onMouseUp={endSignatureStroke}
                        onMouseLeave={endSignatureStroke}
                        onTouchStart={beginSignatureStroke}
                        onTouchMove={drawSignatureStroke}
                        onTouchEnd={endSignatureStroke}
                      />
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={clearSignatureCanvas}
                          className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </FormBlock>
          </div>
        </div>
      </div>
    </section>
  );
}
