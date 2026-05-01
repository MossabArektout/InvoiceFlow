import { type Dispatch, type SetStateAction } from 'react';
import { Field } from './FormPrimitives';

type DiscountType = 'percentage' | 'fixed';

type LineItem = {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
  discountPercent: string;
};

type InvoiceDataLike = {
  items: LineItem[];
  taxPercent: string;
  shippingFee: string;
  discountType: DiscountType;
  discountValue: string;
};

type InvoiceComputedLike = {
  lineTotals: number[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  shippingAmount: number;
  grandTotal: number;
};

type LineItemsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  data: InvoiceDataLike;
  setData: Dispatch<SetStateAction<any>>;
  computed: InvoiceComputedLike;
  selectedCurrency: string;
  isDiscountVisible: boolean;
  setIsDiscountVisible: Dispatch<SetStateAction<boolean>>;
  updateItem: (id: string, field: keyof Omit<LineItem, 'id'>, value: string) => void;
  removeItem: (id: string) => void;
  addItem: () => void;
  formatCurrency: (value: number, currencyCode: string) => string;
};

export default function LineItemsModal({
  isOpen,
  onClose,
  data,
  setData,
  computed,
  selectedCurrency,
  isDiscountVisible,
  setIsDiscountVisible,
  updateItem,
  removeItem,
  addItem,
  formatCurrency
}: LineItemsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[58] flex items-center justify-center bg-slate-900/45 p-3 sm:p-6" onClick={onClose}>
      <div
        className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Line Items</h3>
            <p className="text-xs text-slate-500">Add and edit your invoice items</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close line items editor"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6 overflow-y-auto px-5 py-5">
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-[760px] w-full text-sm">
              <thead className="bg-slate-50/70">
                <tr className="text-left text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
                  <th className="px-3 py-2.5">Description</th>
                  <th className="w-28 px-3 py-2.5">Qty</th>
                  <th className="w-40 px-3 py-2.5">Unit Price</th>
                  <th className="w-32 px-3 py-2.5">Disc. %</th>
                  <th className="w-40 px-3 py-2.5 text-right">Amount</th>
                  <th className="w-24 px-3 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {data.items.map((item, index) => (
                  <tr key={item.id}>
                    <td className="px-3 py-2.5">
                      <input
                        value={item.description}
                        onChange={(event) => updateItem(item.id, 'description', event.target.value)}
                        placeholder="Item description"
                        className="h-10 rounded-lg"
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={item.quantity}
                        onChange={(event) => updateItem(item.id, 'quantity', event.target.value)}
                        className="h-10 rounded-lg"
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(event) => updateItem(item.id, 'unitPrice', event.target.value)}
                        className="h-10 rounded-lg"
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={item.discountPercent}
                        onChange={(event) => updateItem(item.id, 'discountPercent', event.target.value)}
                        className="h-10 rounded-lg"
                      />
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium text-slate-800">
                      {formatCurrency(computed.lineTotals[index] ?? 0, selectedCurrency)}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        disabled={data.items.length === 1}
                        className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={addItem}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-indigo-600">
              <path d="M10 4a1 1 0 0 1 1 1v4h4a1 1 0 1 1 0 2h-4v4a1 1 0 1 1-2 0v-4H5a1 1 0 1 1 0-2h4V5a1 1 0 0 1 1-1Z" />
            </svg>
            Add Item
          </button>

          <div className="grid gap-4 lg:grid-cols-3">
            <Field label="Tax (%)">
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={data.taxPercent}
                onChange={(event) => setData((prev: InvoiceDataLike) => ({ ...prev, taxPercent: event.target.value }))}
                className="h-10 rounded-lg"
              />
            </Field>
            <Field label="Shipping">
              <input
                type="number"
                min="0"
                step="0.01"
                value={data.shippingFee}
                onChange={(event) => setData((prev: InvoiceDataLike) => ({ ...prev, shippingFee: event.target.value }))}
                className="h-10 rounded-lg"
              />
            </Field>
            <div className="space-y-2">
              <label className="block text-[12px] font-medium tracking-normal text-slate-500">Discount</label>
              {isDiscountVisible ? (
                <div className="flex gap-2">
                  <select
                    value={data.discountType}
                    onChange={(event) =>
                      setData((prev: InvoiceDataLike) => ({ ...prev, discountType: event.target.value as DiscountType }))
                    }
                    className="h-10 w-28 rounded-lg"
                  >
                    <option value="percentage">%</option>
                    <option value="fixed">{selectedCurrency}</option>
                  </select>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={data.discountValue}
                    onChange={(event) => setData((prev: InvoiceDataLike) => ({ ...prev, discountValue: event.target.value }))}
                    className="h-10 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setData((prev: InvoiceDataLike) => ({ ...prev, discountValue: '0' }));
                      setIsDiscountVisible(false);
                    }}
                    className="rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsDiscountVisible(true)}
                  className="inline-flex h-10 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Add Discount
                </button>
              )}
            </div>
          </div>

          <div className="ml-auto w-full max-w-sm space-y-2 border-t border-slate-200 pt-3 text-sm">
            <p className="flex items-center justify-between">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-medium text-slate-800">{formatCurrency(computed.subtotal, selectedCurrency)}</span>
            </p>
            {isDiscountVisible ? (
              <p className="flex items-center justify-between">
                <span className="text-slate-500">
                  {data.discountType === 'percentage' ? `Discount (${Number(data.discountValue) || 0}%)` : 'Discount'}
                </span>
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
            <p className="flex items-center justify-between border-t border-slate-200 pt-2 text-base font-semibold text-indigo-700">
              <span>Total</span>
              <span>{formatCurrency(computed.grandTotal, selectedCurrency)}</span>
            </p>
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

