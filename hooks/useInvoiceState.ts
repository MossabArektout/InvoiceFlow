import { useCallback, useMemo, useState } from 'react';

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
type DiscountType = 'percentage' | 'fixed';
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

type UseInvoiceStateParams = {
  createInitialData: () => InvoiceData;
  createEmptyItem: () => LineItem;
  computeDiscountAmount: (subtotal: number, discountType: DiscountType, discountValue: number) => number;
};

export const useInvoiceState = ({ createInitialData, createEmptyItem, computeDiscountAmount }: UseInvoiceStateParams) => {
  const [data, setData] = useState<InvoiceData>(() => createInitialData());
  const [isDiscountVisible, setIsDiscountVisible] = useState(false);
  const [errorFields, setErrorFields] = useState<string[]>([]);

  const computed = useMemo<InvoiceComputed>(() => {
    const lineTotals = data.items.map((item) => {
      const qty = Math.max(Number(item.quantity) || 0, 0);
      const price = Math.max(Number(item.unitPrice) || 0, 0);
      const baseTotal = qty * price;
      const itemDiscountPercent = Math.min(Math.max(Number(item.discountPercent) || 0, 0), 100);
      const itemDiscountAmount = (baseTotal * itemDiscountPercent) / 100;
      return Math.max(baseTotal - itemDiscountAmount, 0);
    });

    const subtotal = lineTotals.reduce((sum, line) => sum + line, 0);
    const rawDiscountValue = isDiscountVisible ? Number(data.discountValue) || 0 : 0;
    const discountAmount = computeDiscountAmount(subtotal, data.discountType, rawDiscountValue);
    const taxableSubtotal = Math.max(subtotal - discountAmount, 0);
    const taxRate = Math.min(Math.max(Number(data.taxPercent) || 0, 0), 100);
    const taxAmount = taxableSubtotal * (taxRate / 100);
    const shippingAmount = Math.max(Number(data.shippingFee) || 0, 0);
    const grandTotal = taxableSubtotal + taxAmount + shippingAmount;

    return { lineTotals, subtotal, discountAmount, taxableSubtotal, taxAmount, shippingAmount, grandTotal };
  }, [computeDiscountAmount, data.discountType, data.discountValue, data.items, data.shippingFee, data.taxPercent, isDiscountVisible]);

  const updateParty = useCallback((side: 'from' | 'to', field: keyof Party, value: string) => {
    setData((prev) => ({
      ...prev,
      [side]: { ...prev[side], [field]: value }
    }));
  }, []);

  const updateItem = useCallback((id: string, field: keyof Omit<LineItem, 'id'>, value: string) => {
    setData((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    }));
  }, []);

  const addItem = useCallback(() => {
    setData((prev) => ({ ...prev, items: [...prev.items, createEmptyItem()] }));
  }, [createEmptyItem]);

  const removeItem = useCallback((id: string) => {
    setData((prev) => {
      if (prev.items.length === 1) return prev;
      return { ...prev, items: prev.items.filter((item) => item.id !== id) };
    });
  }, []);

  const replaceData = useCallback(
    (nextData: InvoiceData, options: { discountVisible?: boolean; clearErrors?: boolean } = {}) => {
      setData(nextData);
      if (typeof options.discountVisible === 'boolean') {
        setIsDiscountVisible(options.discountVisible);
      }
      if (options.clearErrors ?? true) {
        setErrorFields([]);
      }
    },
    []
  );

  const validateRequiredFields = useCallback(() => {
    const invalid: string[] = [];
    if (!data.from.name.trim()) invalid.push('from.name');
    if (!data.from.email.trim()) invalid.push('from.email');
    if (!data.to.name.trim()) invalid.push('to.name');
    if (!data.to.email.trim()) invalid.push('to.email');

    if (invalid.length > 0) {
      setErrorFields(invalid);
      window.setTimeout(() => setErrorFields([]), 450);
    }

    return invalid;
  }, [data.from.email, data.from.name, data.to.email, data.to.name]);

  return {
    data,
    setData,
    isDiscountVisible,
    setIsDiscountVisible,
    errorFields,
    computed,
    updateParty,
    updateItem,
    addItem,
    removeItem,
    replaceData,
    validateRequiredFields
  };
};
