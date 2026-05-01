import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from 'react';

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
type InvoiceStatusFilter = 'all' | InvoiceStatus;
type DiscountType = 'percentage' | 'fixed';
type SignatureMode = 'upload' | 'draw';
type SavedInvoiceSort =
  | 'newest'
  | 'oldest'
  | 'invoice-asc'
  | 'invoice-desc'
  | 'client-asc'
  | 'client-desc'
  | 'amount-high'
  | 'amount-low';

type InvoiceData = {
  from: Party;
  to: Party;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  notes: string;
  paymentTerms: string;
  discountType: DiscountType;
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

type SavedInvoice = {
  id: string;
  from: Party;
  to: Party;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  notes: string;
  paymentTerms: string;
  discountType: DiscountType;
  discountValue: string;
  shippingFee: string;
  taxPercent: string;
  signatureMode: SignatureMode;
  signatureDataUrl: string;
  items: LineItem[];
  template: string;
  currency?: string;
  grandTotal: number;
  savedAt: string;
};

type UseInvoicesParams<TTemplate extends string, TCurrency extends string> = {
  apiFetch: <T,>(url: string, options?: RequestInit) => Promise<T>;
  mapApiInvoice: (invoice: unknown) => SavedInvoice;
  getNextInvoiceNumber: (invoices: SavedInvoice[]) => string;
  createInitialData: (invoiceNumber?: string) => InvoiceData;
  toInvoicePayload: (
    data: InvoiceData,
    selectedTemplate: TTemplate,
    selectedCurrency: TCurrency,
    computed: InvoiceComputed,
    isDiscountEnabled: boolean
  ) => unknown;
  data: InvoiceData;
  setData: Dispatch<SetStateAction<InvoiceData>>;
  selectedTemplate: TTemplate;
  selectedCurrency: TCurrency;
  computed: InvoiceComputed;
  isDiscountVisible: boolean;
  setIsDiscountVisible: Dispatch<SetStateAction<boolean>>;
  validateRequiredFields: () => string[];
  replaceData: (nextData: InvoiceData, options?: { discountVisible?: boolean; clearErrors?: boolean }) => void;
  setSelectedTemplate: (template: TTemplate) => void;
  setSelectedCurrency: (currency: TCurrency) => void;
  showToast: (message: string) => void;
  getStatusLabel: (status: InvoiceStatus) => string;
  openComingSoon: (plan?: 'creator' | 'pro') => void;
  handleRequestError: (error: unknown) => void;
};

export const useInvoices = <TTemplate extends string, TCurrency extends string>({
  apiFetch,
  mapApiInvoice,
  getNextInvoiceNumber,
  createInitialData,
  toInvoicePayload,
  data,
  setData,
  selectedTemplate,
  selectedCurrency,
  computed,
  isDiscountVisible,
  setIsDiscountVisible,
  validateRequiredFields,
  replaceData,
  setSelectedTemplate,
  setSelectedCurrency,
  showToast,
  getStatusLabel,
  openComingSoon,
  handleRequestError
}: UseInvoicesParams<TTemplate, TCurrency>) => {
  const [savedInvoices, setSavedInvoices] = useState<SavedInvoice[]>([]);
  const [isInvoicesLoading, setIsInvoicesLoading] = useState(true);
  const [isSavingInvoice, setIsSavingInvoice] = useState(false);
  const [deletingInvoiceId, setDeletingInvoiceId] = useState<string | null>(null);
  const [currentInvoiceId, setCurrentInvoiceId] = useState<string | null>(null);
  const [newlySavedInvoiceNumber, setNewlySavedInvoiceNumber] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastAutosavedAt, setLastAutosavedAt] = useState<string | null>(null);
  const [activeStatusFilter, setActiveStatusFilter] = useState<InvoiceStatusFilter>('all');
  const [savedInvoiceSearch, setSavedInvoiceSearch] = useState('');
  const [savedInvoiceSort, setSavedInvoiceSort] = useState<SavedInvoiceSort>('newest');
  const [isSavedInvoicesCollapsed, setIsSavedInvoicesCollapsed] = useState(true);
  const [openStatusMenuInvoiceId, setOpenStatusMenuInvoiceId] = useState<string | null>(null);

  const statusCounts = useMemo(
    () =>
      savedInvoices.reduce<Record<InvoiceStatus, number>>(
        (acc, invoice) => {
          acc[invoice.status] += 1;
          return acc;
        },
        { draft: 0, sent: 0, paid: 0, overdue: 0, cancelled: 0 }
      ),
    [savedInvoices]
  );

  const filteredInvoices = useMemo(() => {
    let rows = [...savedInvoices];

    if (activeStatusFilter !== 'all') {
      rows = rows.filter((invoice) => invoice.status === activeStatusFilter);
    }

    const query = savedInvoiceSearch.trim().toLowerCase();
    if (query) {
      rows = rows.filter((invoice) => {
        const clientName = invoice.to.name.toLowerCase();
        const invoiceNumber = invoice.invoiceNumber.toLowerCase();
        return clientName.includes(query) || invoiceNumber.includes(query);
      });
    }

    rows.sort((a, b) => {
      if (savedInvoiceSort === 'oldest') return +new Date(a.savedAt) - +new Date(b.savedAt);
      if (savedInvoiceSort === 'invoice-asc') return a.invoiceNumber.localeCompare(b.invoiceNumber);
      if (savedInvoiceSort === 'invoice-desc') return b.invoiceNumber.localeCompare(a.invoiceNumber);
      if (savedInvoiceSort === 'client-asc') return (a.to.name || '').localeCompare(b.to.name || '');
      if (savedInvoiceSort === 'client-desc') return (b.to.name || '').localeCompare(a.to.name || '');
      if (savedInvoiceSort === 'amount-high') return b.grandTotal - a.grandTotal;
      if (savedInvoiceSort === 'amount-low') return a.grandTotal - b.grandTotal;
      return +new Date(b.savedAt) - +new Date(a.savedAt);
    });

    return rows;
  }, [activeStatusFilter, savedInvoiceSearch, savedInvoiceSort, savedInvoices]);

  const autoMarkOverdueInvoices = useCallback(
    async (invoicesToCheck: SavedInvoice[]) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const candidates = invoicesToCheck.filter((invoice) => {
        if (invoice.status !== 'sent') return false;
        if (!invoice.dueDate) return false;
        const dueDate = new Date(invoice.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        return Number.isFinite(dueDate.getTime()) && dueDate.getTime() < today.getTime();
      });

      if (candidates.length === 0) return;

      setSavedInvoices((prev) =>
        prev.map((invoice) => (candidates.some((item) => item.id === invoice.id) ? { ...invoice, status: 'overdue' } : invoice))
      );

      const results = await Promise.allSettled(
        candidates.map((invoice) =>
          apiFetch<unknown>(`/api/invoices/${invoice.id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'overdue' })
          })
        )
      );

      let successCount = 0;
      const failedIds = new Set<string>();
      const updatedRows: Record<string, InvoiceStatus> = {};

      results.forEach((result, index) => {
        const candidate = candidates[index];
        if (result.status === 'fulfilled') {
          successCount += 1;
          updatedRows[candidate.id] = mapApiInvoice(result.value).status;
        } else {
          failedIds.add(candidate.id);
        }
      });

      setSavedInvoices((prev) =>
        prev.map((invoice) => {
          if (updatedRows[invoice.id]) return { ...invoice, status: updatedRows[invoice.id] };
          if (failedIds.has(invoice.id)) {
            const original = invoicesToCheck.find((item) => item.id === invoice.id);
            return { ...invoice, status: original?.status ?? invoice.status };
          }
          return invoice;
        })
      );

      if (successCount > 0) {
        showToast(`${successCount} invoice${successCount > 1 ? 's are' : ' is'} now overdue`);
      }
    },
    [apiFetch, mapApiInvoice, showToast]
  );

  const loadInvoices = useCallback(async () => {
    setIsInvoicesLoading(true);
    try {
      const records = await apiFetch<unknown[]>('/api/invoices');
      const mapped = records.map(mapApiInvoice);
      setSavedInvoices(mapped);
      void autoMarkOverdueInvoices(mapped);
      if (!currentInvoiceId) {
        setData((prev) => ({ ...prev, invoiceNumber: getNextInvoiceNumber(mapped) }));
      }
    } catch (error) {
      handleRequestError(error);
    } finally {
      setIsInvoicesLoading(false);
    }
  }, [apiFetch, autoMarkOverdueInvoices, currentInvoiceId, getNextInvoiceNumber, handleRequestError, mapApiInvoice, setData]);

  const saveInvoice = useCallback(
    async (options: { silent?: boolean; source?: 'manual' | 'autosave' } = {}) => {
      const invalid = validateRequiredFields();
      if (invalid.length > 0) {
        showToast('Please fill all required fields before saving.');
        return null;
      }

      setIsSavingInvoice(true);

      try {
        const payload = toInvoicePayload(data, selectedTemplate, selectedCurrency, computed, isDiscountVisible);
        const record = currentInvoiceId
          ? await apiFetch<unknown>(`/api/invoices/${currentInvoiceId}`, {
              method: 'PUT',
              body: JSON.stringify(payload)
            })
          : await apiFetch<unknown>('/api/invoices', {
              method: 'POST',
              body: JSON.stringify(payload)
            });

        const mapped = mapApiInvoice(record);
        setCurrentInvoiceId(mapped.id);
        setData((prev) => ({
          ...prev,
          invoiceNumber: mapped.invoiceNumber,
          status: mapped.status,
          notes: mapped.notes,
          paymentTerms: mapped.paymentTerms,
          discountType: mapped.discountType,
          discountValue: mapped.discountValue,
          shippingFee: mapped.shippingFee
        }));
        setIsDiscountVisible(Number(mapped.discountValue) > 0);
        setNewlySavedInvoiceNumber(mapped.invoiceNumber);
        setHasUnsavedChanges(false);
        if (options.source === 'autosave') {
          setLastAutosavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        } else if (!options.silent) {
          showToast('Invoice saved ✓');
        }

        await loadInvoices();
        return mapped;
      } catch (error) {
        if (typeof error === 'object' && error && 'status' in error && (error as { status?: number }).status === 403) {
          openComingSoon('creator');
          showToast("You've reached the free plan limit of 5 invoices.");
          return null;
        }
        handleRequestError(error);
        return null;
      } finally {
        setIsSavingInvoice(false);
      }
    },
    [
      apiFetch,
      computed,
      currentInvoiceId,
      data,
      handleRequestError,
      isDiscountVisible,
      loadInvoices,
      mapApiInvoice,
      openComingSoon,
      selectedCurrency,
      selectedTemplate,
      setData,
      setIsDiscountVisible,
      showToast,
      toInvoicePayload,
      validateRequiredFields
    ]
  );

  const openSavedInvoice = useCallback(
    (invoice: SavedInvoice) => {
      setCurrentInvoiceId(invoice.id);
      replaceData(
        {
          from: invoice.from,
          to: invoice.to,
          invoiceNumber: invoice.invoiceNumber,
          issueDate: invoice.issueDate,
          dueDate: invoice.dueDate,
          status: invoice.status,
          notes: invoice.notes,
          paymentTerms: invoice.paymentTerms,
          discountType: invoice.discountType,
          discountValue: invoice.discountValue,
          shippingFee: invoice.shippingFee,
          taxPercent: invoice.taxPercent,
          signatureMode: invoice.signatureMode ?? 'upload',
          signatureDataUrl: invoice.signatureDataUrl ?? '',
          items: invoice.items
        },
        { discountVisible: Number(invoice.discountValue) > 0 }
      );
      setSelectedTemplate(invoice.template as TTemplate);
      setSelectedCurrency((invoice.currency ?? 'USD') as TCurrency);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [replaceData, setSelectedCurrency, setSelectedTemplate]
  );

  const updateInvoiceStatus = useCallback(
    async (invoiceId: string, nextStatus: InvoiceStatus, options: { showSuccessToast?: boolean } = { showSuccessToast: true }) => {
      const previous = savedInvoices;
      const next = savedInvoices.map((invoice) => (invoice.id === invoiceId ? { ...invoice, status: nextStatus } : invoice));
      setSavedInvoices(next);

      if (currentInvoiceId === invoiceId) {
        setData((prev) => ({ ...prev, status: nextStatus }));
      }

      try {
        const updated = await apiFetch<unknown>(`/api/invoices/${invoiceId}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: nextStatus })
        });

        const mapped = mapApiInvoice(updated);
        setSavedInvoices((prev) => prev.map((invoice) => (invoice.id === invoiceId ? { ...invoice, status: mapped.status } : invoice)));

        if (currentInvoiceId === invoiceId) {
          setData((prev) => ({ ...prev, status: mapped.status }));
        }

        if (options.showSuccessToast) {
          showToast(`Invoice marked as ${getStatusLabel(mapped.status)} ✓`);
        }
      } catch {
        setSavedInvoices(previous);
        if (currentInvoiceId === invoiceId) {
          const priorStatus = previous.find((invoice) => invoice.id === invoiceId)?.status ?? 'draft';
          setData((prev) => ({ ...prev, status: priorStatus }));
        }
        showToast('Failed to update status. Please try again.');
      }
    },
    [apiFetch, currentInvoiceId, getStatusLabel, mapApiInvoice, savedInvoices, setData, showToast]
  );

  const deleteSavedInvoiceImmediately = useCallback(
    async (invoiceId: string, options?: { onDeletedCurrent?: () => void }) => {
      const previous = savedInvoices;
      setDeletingInvoiceId(invoiceId);
      setSavedInvoices((prev) => prev.filter((invoice) => invoice.id !== invoiceId));

      try {
        await apiFetch<{ success: true }>(`/api/invoices/${invoiceId}`, {
          method: 'DELETE'
        });
        if (currentInvoiceId === invoiceId) {
          options?.onDeletedCurrent?.();
        }
        showToast('Invoice deleted');
      } catch (error) {
        setSavedInvoices(previous);
        handleRequestError(error);
      } finally {
        setDeletingInvoiceId(null);
      }
    },
    [apiFetch, currentInvoiceId, handleRequestError, savedInvoices, showToast]
  );

  const clearAllSavedInvoicesImmediately = useCallback(
    async (options?: { onCleared?: () => void }) => {
      const previous = savedInvoices;
      setSavedInvoices([]);

      try {
        await Promise.all(previous.map((invoice) => apiFetch(`/api/invoices/${invoice.id}`, { method: 'DELETE' })));
        options?.onCleared?.();
        showToast('Invoice deleted');
      } catch (error) {
        setSavedInvoices(previous);
        handleRequestError(error);
      }
    },
    [apiFetch, handleRequestError, savedInvoices, showToast]
  );

  const resetFormForNewInvoice = useCallback(() => {
    setCurrentInvoiceId(null);
    replaceData(createInitialData(getNextInvoiceNumber(savedInvoices)), {
      discountVisible: false
    });
  }, [createInitialData, getNextInvoiceNumber, replaceData, savedInvoices]);

  return {
    savedInvoices,
    setSavedInvoices,
    isInvoicesLoading,
    setIsInvoicesLoading,
    isSavingInvoice,
    deletingInvoiceId,
    currentInvoiceId,
    setCurrentInvoiceId,
    newlySavedInvoiceNumber,
    setNewlySavedInvoiceNumber,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    lastAutosavedAt,
    activeStatusFilter,
    setActiveStatusFilter,
    savedInvoiceSearch,
    setSavedInvoiceSearch,
    savedInvoiceSort,
    setSavedInvoiceSort,
    isSavedInvoicesCollapsed,
    setIsSavedInvoicesCollapsed,
    openStatusMenuInvoiceId,
    setOpenStatusMenuInvoiceId,
    statusCounts,
    filteredInvoices,
    loadInvoices,
    saveInvoice,
    openSavedInvoice,
    updateInvoiceStatus,
    autoMarkOverdueInvoices,
    deleteSavedInvoiceImmediately,
    clearAllSavedInvoicesImmediately,
    resetFormForNewInvoice
  };
};
