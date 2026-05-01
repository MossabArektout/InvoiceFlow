import { t } from '@/lib/i18n';

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
export type InvoiceStatusFilter = 'all' | InvoiceStatus;
export type SavedInvoiceSort =
  | 'newest'
  | 'oldest'
  | 'invoice-asc'
  | 'invoice-desc'
  | 'client-asc'
  | 'client-desc'
  | 'amount-high'
  | 'amount-low';

type SavedInvoiceRow = {
  id: string;
  invoiceNumber: string;
  to: { name: string };
  grandTotal: number;
  currency?: string;
  status: InvoiceStatus;
  savedAt: string;
};

type SavedInvoicesSectionProps = {
  savedInvoicesCount: number;
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
  savedInvoiceSearch: string;
  onSavedInvoiceSearchChange: (value: string) => void;
  savedInvoiceSort: SavedInvoiceSort;
  onSavedInvoiceSortChange: (value: SavedInvoiceSort) => void;
  activeStatusFilter: InvoiceStatusFilter;
  onActiveStatusFilterChange: (value: InvoiceStatusFilter) => void;
  statusFilterOrder: InvoiceStatusFilter[];
  statusCounts: Record<InvoiceStatus, number>;
  statusOrder: InvoiceStatus[];
  statusLabels: Record<InvoiceStatus, string>;
  isInvoicesLoading: boolean;
  filteredInvoices: SavedInvoiceRow[];
  deletingInvoiceId: string | null;
  onOpenInvoice: (invoice: SavedInvoiceRow) => void;
  onDeleteInvoice: (invoiceId: string) => void;
  onUpdateInvoiceStatus: (invoiceId: string, status: InvoiceStatus) => void;
  formatCurrency: (value: number, currencyCode: string) => string;
  formatDate: (value: string) => string;
};

const Spinner = ({ size = 'h-3 w-3' }: { size?: string }) => (
  <span className={`${size} inline-block animate-spin rounded-full border-2 border-current border-r-transparent`} />
);

export default function SavedInvoicesSection({
  savedInvoicesCount,
  isCollapsed,
  onToggleCollapsed,
  savedInvoiceSearch,
  onSavedInvoiceSearchChange,
  savedInvoiceSort,
  onSavedInvoiceSortChange,
  activeStatusFilter,
  onActiveStatusFilterChange,
  statusFilterOrder,
  statusCounts,
  statusOrder,
  statusLabels,
  isInvoicesLoading,
  filteredInvoices,
  deletingInvoiceId,
  onOpenInvoice,
  onDeleteInvoice,
  onUpdateInvoiceStatus,
  formatCurrency,
  formatDate
}: SavedInvoicesSectionProps) {
  return (
    <section className="rounded-none border border-slate-200 bg-white p-4 shadow-sm md:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900">{t('invoice.savedInvoices')}</h3>
          <p className="text-sm text-slate-500">{t('invoice.totalInvoices', { count: savedInvoicesCount })}</p>
        </div>
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="inline-flex items-center justify-center self-start p-0 text-lg leading-none text-slate-500 hover:text-slate-700"
          aria-expanded={!isCollapsed}
          aria-label={isCollapsed ? t('invoice.savedInvoices.expand') : t('invoice.savedInvoices.collapse')}
          title={isCollapsed ? t('invoice.savedInvoices.expand') : t('invoice.savedInvoices.collapse')}
        >
          <span aria-hidden>{isCollapsed ? '▾' : '▴'}</span>
        </button>
      </div>

      {!isCollapsed ? (
        <>
          <div className="mt-4 flex flex-col gap-2 lg:flex-row lg:items-center">
            <div className="w-full lg:flex-1">
              <input
                value={savedInvoiceSearch}
                onChange={(event) => onSavedInvoiceSearchChange(event.target.value)}
                placeholder={t('invoice.searchPlaceholder')}
                className="h-10 rounded-none"
              />
            </div>
            <div className="flex w-full flex-col gap-2 lg:w-auto lg:flex-row lg:items-center">
              <select
                value={savedInvoiceSort}
                onChange={(event) => onSavedInvoiceSortChange(event.target.value as SavedInvoiceSort)}
                className="h-10 rounded-none lg:min-w-[200px]"
              >
                <option value="newest">{t('common.newest')}</option>
                <option value="oldest">{t('common.oldest')}</option>
                <option value="invoice-asc">{t('invoice.sort.invoiceAsc')}</option>
                <option value="invoice-desc">{t('invoice.sort.invoiceDesc')}</option>
                <option value="client-asc">{t('invoice.sort.clientAsc')}</option>
                <option value="client-desc">{t('invoice.sort.clientDesc')}</option>
                <option value="amount-high">{t('invoice.sort.amountHigh')}</option>
                <option value="amount-low">{t('invoice.sort.amountLow')}</option>
              </select>
              <select
                value={activeStatusFilter}
                onChange={(event) => onActiveStatusFilterChange(event.target.value as InvoiceStatusFilter)}
                className="h-10 rounded-none lg:min-w-[170px]"
              >
                {statusFilterOrder.map((status) => {
                  const count = status === 'all' ? savedInvoicesCount : statusCounts[status];
                  const label = status === 'all' ? t('invoice.status.all') : statusLabels[status];
                  return (
                    <option key={status} value={status}>
                      {label} ({count})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2.5">Invoice</th>
                    <th className="px-3 py-2.5">Client</th>
                    <th className="px-3 py-2.5">Amount</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5">Saved</th>
                    <th className="px-3 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isInvoicesLoading ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                        Loading invoices...
                      </td>
                    </tr>
                  ) : filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                        {t('invoice.noneFound')}
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2.5 font-semibold text-slate-800">{invoice.invoiceNumber}</td>
                        <td className="px-3 py-2.5 text-slate-700">{invoice.to.name || '-'}</td>
                        <td className="px-3 py-2.5 font-medium text-slate-800">
                          {formatCurrency(invoice.grandTotal, invoice.currency ?? 'USD')}
                        </td>
                        <td className="px-3 py-2.5">
                          <select
                            value={invoice.status}
                            onChange={(event) => onUpdateInvoiceStatus(invoice.id, event.target.value as InvoiceStatus)}
                            className="h-9 rounded-lg"
                          >
                            {statusOrder.map((status) => (
                              <option key={status} value={status}>
                                {statusLabels[status]}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2.5 text-slate-500">{formatDate(invoice.savedAt)}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => onOpenInvoice(invoice)}
                              className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                            >
                              Open
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteInvoice(invoice.id)}
                              disabled={deletingInvoiceId === invoice.id}
                              className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                            >
                              {deletingInvoiceId === invoice.id ? <Spinner /> : null}
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}

