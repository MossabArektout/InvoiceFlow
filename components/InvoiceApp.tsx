'use client';

import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type TouchEvent as ReactTouchEvent } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import ComingSoonModal from './ComingSoonModal';
import PreviewModal from './invoice/PreviewModal';
import SavedInvoicesSection from './invoice/SavedInvoicesSection';
import KeyboardShortcutsModal from './invoice/KeyboardShortcutsModal';
import ConfirmDialog from './invoice/ConfirmDialog';
import LineItemsModal from './invoice/LineItemsModal';
import InvoiceEditorPanel from './invoice/InvoiceEditorPanel';
import InvoicePreviewWorkspace from './invoice/InvoicePreviewWorkspace';
import QuickTourPopover from './invoice/QuickTourPopover';
import ClientManagerModal from './invoice/ClientManagerModal';
import MobileActionBar from './invoice/MobileActionBar';
import ExportLimitModal from './invoice/ExportLimitModal';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useInvoiceState } from '@/hooks/useInvoiceState';
import { useClients } from '@/hooks/useClients';
import { useInvoices } from '@/hooks/useInvoices';
import { t } from '@/lib/i18n';
import { PLAN_EXPORT_LIMITS, type UserPlan, normalizePlan } from '@/lib/plans';

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

type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
type InvoiceStatusFilter = 'all' | InvoiceStatus;
type DiscountType = 'percentage' | 'fixed';
type SignatureMode = 'upload' | 'draw';
type WorkspaceTab = 'edit' | 'preview';
type ConfirmDialogState = {
  title: string;
  description: string;
  confirmLabel: string;
  intent?: 'danger' | 'primary';
  onConfirm: () => void | Promise<void>;
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
  template: TemplateId;
  currency?: CurrencyCode;
  grandTotal: number;
  savedAt: string;
};

type ApiInvoice = {
  id: string;
  invoice_number: string;
  from_name: string | null;
  from_email: string | null;
  from_address: string | null;
  to_name: string | null;
  to_email: string | null;
  to_address: string | null;
  issue_date: string | null;
  due_date: string | null;
  status: string | null;
  notes: string | null;
  payment_terms: string | null;
  discount_type: string | null;
  discount_value: number | null;
  signature_mode: string | null;
  signature_data_url: string | null;
  line_items: unknown[];
  subtotal: number;
  tax: number;
  total: number;
  currency: string | null;
  template: string | null;
  created_at: string;
  updated_at: string;
};

type Client = {
  id: string;
  name: string;
  email: string;
  address: string;
  createdAt: string;
};

type ApiClient = {
  id: string;
  name: string;
  email: string | null;
  address: string | null;
  created_at: string;
};

type ApiUser = {
  id: string;
  clerk_id: string;
  email: string;
  name: string | null;
  plan: UserPlan;
  credits: number;
  logo_url: string | null;
  exports_this_month: number;
  exports_reset_date: string;
  remaining_exports: number;
  created_at: string;
};

type CurrencyCode =
  | 'USD'
  | 'EUR'
  | 'GBP'
  | 'MAD'
  | 'CAD'
  | 'AUD'
  | 'JPY'
  | 'CHF'
  | 'INR'
  | 'AED'
  | 'SAR'
  | 'BRL'
  | 'MXN'
  | 'NGN'
  | 'ZAR'
  | 'SGD';

type CurrencyOption = {
  code: CurrencyCode;
  name: string;
  symbol: string;
  flag: string;
  locale: string;
  decimals: 0 | 2;
};

type TemplateId =
  | 'minimal'
  | 'classic-professional'
  | 'detailed-itemized'
  | 'compact-receipt'
  | 'creative-bold-branding'
  | 'service-hours'
  | 'international-tax';

type InvoiceTemplateProps = {
  data: InvoiceData;
  computed: InvoiceComputed;
  currency: CurrencyCode;
  logoUrl: string | null;
};

const formatDate = (value: string) => {
  if (!value) return '-';
  const date = new Date(value);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const formatShortDate = (value: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const CURRENCIES: CurrencyOption[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸', locale: 'en-US', decimals: 2 },
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺', locale: 'de-DE', decimals: 2 },
  { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧', locale: 'en-GB', decimals: 2 },
  { code: 'MAD', name: 'Moroccan Dirham', symbol: 'MAD', flag: '🇲🇦', locale: 'fr-MA', decimals: 2 },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$', flag: '🇨🇦', locale: 'en-CA', decimals: 2 },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺', locale: 'en-AU', decimals: 2 },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵', locale: 'ja-JP', decimals: 0 },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', flag: '🇨🇭', locale: 'de-CH', decimals: 2 },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳', locale: 'en-IN', decimals: 2 },
  { code: 'AED', name: 'UAE Dirham', symbol: 'AED', flag: '🇦🇪', locale: 'ar-AE', decimals: 2 },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'SAR', flag: '🇸🇦', locale: 'ar-SA', decimals: 2 },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', flag: '🇧🇷', locale: 'pt-BR', decimals: 2 },
  { code: 'MXN', name: 'Mexican Peso', symbol: 'MX$', flag: '🇲🇽', locale: 'es-MX', decimals: 2 },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', flag: '🇳🇬', locale: 'en-NG', decimals: 2 },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', flag: '🇿🇦', locale: 'en-ZA', decimals: 2 },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', flag: '🇸🇬', locale: 'en-SG', decimals: 2 }
];

const CURRENCY_MAP: Record<CurrencyCode, CurrencyOption> = CURRENCIES.reduce(
  (acc, currency) => ({ ...acc, [currency.code]: currency }),
  {} as Record<CurrencyCode, CurrencyOption>
);

const formatCurrency = (value: number, currencyCode: CurrencyCode) => {
  const currency = CURRENCY_MAP[currencyCode];
  return new Intl.NumberFormat(currency.locale, {
    style: 'currency',
    currency: currency.code,
    minimumFractionDigits: currency.decimals,
    maximumFractionDigits: currency.decimals
  }).format(value);
};

const CURRENCY_STORAGE_KEY = 'invoiceflow_currency';
const FREE_TEMPLATE: TemplateId = 'minimal';
const FREE_TEMPLATE_IDS: TemplateId[] = ['minimal', 'compact-receipt', 'service-hours'];

const todayISO = () => new Date().toISOString().slice(0, 10);

const addDaysISO = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const createEmptyItem = (): LineItem => ({
  id: crypto.randomUUID(),
  description: '',
  quantity: '1',
  unitPrice: '0',
  discountPercent: '0'
});

const parseInvoiceNumber = (invoiceNumber: string) => {
  const match = invoiceNumber.match(/^INV-(\d+)$/);
  return match ? Number(match[1]) : 0;
};

const getNextInvoiceNumber = (invoices: SavedInvoice[]) => {
  const highest = invoices.reduce((max, invoice) => {
    const value = parseInvoiceNumber(invoice.invoiceNumber);
    return value > max ? value : max;
  }, 0);
  return `INV-${String(highest + 1).padStart(3, '0')}`;
};

const getInitialCurrency = (): CurrencyCode => {
  if (typeof window === 'undefined') return 'USD';
  const stored = localStorage.getItem(CURRENCY_STORAGE_KEY) as CurrencyCode | null;
  if (stored && CURRENCIES.some((currency) => currency.code === stored)) {
    return stored;
  }
  return 'USD';
};

const createEmptyClientDraft = () => ({
  name: '',
  email: '',
  address: ''
});

const createInitialData = (invoiceNumber = 'INV-001'): InvoiceData => ({
  from: { name: '', email: '', address: '' },
  to: { name: '', email: '', address: '' },
  invoiceNumber,
  issueDate: todayISO(),
  dueDate: addDaysISO(14),
  status: 'draft',
  notes: '',
  paymentTerms: '',
  discountType: 'percentage',
  discountValue: '0',
  shippingFee: '0',
  taxPercent: '0',
  signatureMode: 'upload',
  signatureDataUrl: '',
  items: [createEmptyItem()]
});

const createPreviewItem = (description: string, quantity: string, unitPrice: string, discountPercent = '0'): LineItem => ({
  id: crypto.randomUUID(),
  description,
  quantity,
  unitPrice,
  discountPercent
});

const createTemplatePreviewData = (templateId: TemplateId): InvoiceData => {
  const base: InvoiceData = {
    from: {
      name: 'Northline Creative Agency',
      email: 'finance@northline.agency',
      address: '120 Market Street\nSan Francisco, CA 94103'
    },
    to: {
      name: 'Acme Ventures LLC',
      email: 'billing@acmeventures.com',
      address: '88 Madison Ave\nNew York, NY 10016'
    },
    invoiceNumber: 'INV-1042',
    issueDate: todayISO(),
    dueDate: addDaysISO(14),
    status: 'sent',
    notes: 'Thank you for your business. Please include invoice number with your payment reference.',
    paymentTerms: 'Bank transfer within 14 days',
    discountType: 'percentage',
    discountValue: '0',
    shippingFee: '0',
    taxPercent: '8.5',
    signatureMode: 'upload',
    signatureDataUrl: '',
    items: [createPreviewItem('Design system and UI kit', '1', '2400'), createPreviewItem('Frontend implementation', '20', '95')]
  };

  if (templateId === 'detailed-itemized') {
    return {
      ...base,
      invoiceNumber: 'INV-2238',
      to: {
        name: 'Vertex Logistics Inc.',
        email: 'ap@vertexlogistics.com',
        address: '29 Hudson Yards\nNew York, NY 10001'
      },
      notes: 'Project billed in weekly milestones with QA reporting included.',
      paymentTerms: 'Net 30',
      discountType: 'fixed',
      discountValue: '0',
      items: [
        createPreviewItem('Product discovery workshop', '2', '850'),
        createPreviewItem('UX wireframing and user flows', '16', '90'),
        createPreviewItem('UI high-fidelity screens', '22', '95'),
        createPreviewItem('Design QA and implementation support', '10', '85')
      ]
    };
  }

  if (templateId === 'compact-receipt') {
    return {
      ...base,
      invoiceNumber: 'INV-3881',
      from: {
        name: 'Studio Oak',
        email: 'hello@studiooak.co',
        address: '1410 Pine Street\nSeattle, WA 98101'
      },
      notes: 'Paid upon receipt preferred.',
      paymentTerms: 'Due on receipt',
      discountValue: '0',
      taxPercent: '7.25',
      items: [createPreviewItem('Logo refresh package', '1', '450'), createPreviewItem('Print-ready assets', '1', '180')]
    };
  }

  if (templateId === 'creative-bold-branding') {
    return {
      ...base,
      invoiceNumber: 'INV-5127',
      from: {
        name: 'Nova Motion Studio',
        email: 'accounts@novamotion.com',
        address: '2208 W Sunset Blvd\nLos Angeles, CA 90026'
      },
      to: {
        name: 'Pulse Beverage Co.',
        email: 'payables@pulsebev.com',
        address: '455 5th Ave\nBrooklyn, NY 11215'
      },
      notes: 'Campaign rollout package for Summer launch.',
      paymentTerms: '50% deposit, balance due in 15 days',
      shippingFee: '35',
      taxPercent: '9',
      items: [
        createPreviewItem('Campaign concept and art direction', '1', '3200'),
        createPreviewItem('Social media design pack (30 assets)', '1', '1800'),
        createPreviewItem('Motion graphics deliverables', '12', '120')
      ]
    };
  }

  if (templateId === 'service-hours') {
    return {
      ...base,
      invoiceNumber: 'INV-6409',
      from: {
        name: 'Miller Consulting Group',
        email: 'billing@millerconsulting.io',
        address: '75 Congress St\nBoston, MA 02110'
      },
      to: {
        name: 'Bright Legal Partners',
        email: 'finance@brightlegal.com',
        address: '150 N Riverside\nChicago, IL 60606'
      },
      notes: 'Monthly advisory retainer and support hours.',
      paymentTerms: 'Net 15',
      discountType: 'percentage',
      discountValue: '0',
      shippingFee: '0',
      taxPercent: '0',
      items: [
        createPreviewItem('Business strategy advisory', '12', '140'),
        createPreviewItem('Operations review meetings', '6', '120'),
        createPreviewItem('Priority support', '8', '95')
      ]
    };
  }

  if (templateId === 'international-tax') {
    return {
      ...base,
      invoiceNumber: 'INV-7702',
      from: {
        name: 'Atlas Digital Ltd.',
        email: 'accounts@atlasdigital.co.uk',
        address: '11 Bishopsgate\nLondon EC2N 3AQ\nUnited Kingdom'
      },
      to: {
        name: 'EuroTrade GmbH',
        email: 'rechnung@eurotrade.de',
        address: 'Kurfuerstendamm 101\n10711 Berlin\nGermany'
      },
      notes: 'Cross-border consulting services. VAT details included.',
      paymentTerms: 'SEPA transfer within 21 days',
      discountType: 'fixed',
      discountValue: '0',
      shippingFee: '0',
      taxPercent: '20',
      items: [
        createPreviewItem('Market expansion strategy', '1', '2800'),
        createPreviewItem('Localization and compliance review', '14', '95'),
        createPreviewItem('Quarterly reporting package', '1', '640')
      ]
    };
  }

  if (templateId === 'classic-professional') {
    return {
      ...base,
      invoiceNumber: 'INV-1874',
      from: {
        name: 'Bridgepoint Solutions',
        email: 'invoices@bridgepoint.com',
        address: '300 W Adams St\nChicago, IL 60606'
      },
      notes: 'Professional services billed for Q2 delivery.',
      paymentTerms: 'Net 21',
      items: [
        createPreviewItem('Project planning and kickoff', '1', '900'),
        createPreviewItem('Weekly implementation sprint', '18', '110'),
        createPreviewItem('Documentation and handover', '6', '90')
      ]
    };
  }

  return base;
};

const TEMPLATES: { id: TemplateId; name: string }[] = [
  { id: 'minimal', name: 'Modern Minimal' },
  { id: 'classic-professional', name: 'Classic Professional' },
  { id: 'detailed-itemized', name: 'Detailed / Itemized' },
  { id: 'compact-receipt', name: 'Compact / Receipt Style' },
  { id: 'creative-bold-branding', name: 'Creative / Bold Branding' },
  { id: 'service-hours', name: 'Service-Based (Time & Hours)' },
  { id: 'international-tax', name: 'International / Tax-Compliant' }
];

const STATUS_ORDER: InvoiceStatus[] = ['draft', 'sent', 'paid', 'overdue', 'cancelled'];
const SAVED_FILTER_ORDER: Array<'all' | 'draft' | 'sent' | 'paid' | 'overdue'> = ['all', 'draft', 'sent', 'paid', 'overdue'];
type SavedInvoiceSort = 'newest' | 'oldest' | 'invoice-asc' | 'invoice-desc' | 'client-asc' | 'client-desc' | 'amount-high' | 'amount-low';

const STATUS_META: Record<
  InvoiceStatus,
  {
    label: string;
    icon: string;
    emptyIcon: string;
    bg: string;
    text: string;
    ring: string;
    activeBg: string;
    activeText: string;
  }
> = {
  draft: {
    label: t('invoice.status.draft'),
    icon: '✏️',
    emptyIcon: '📝',
    bg: '#f3f4f6',
    text: '#6b7280',
    ring: 'ring-slate-200',
    activeBg: 'bg-slate-100',
    activeText: 'text-slate-700'
  },
  sent: {
    label: t('invoice.status.sent'),
    icon: '📤',
    emptyIcon: '📭',
    bg: '#eff6ff',
    text: '#2563eb',
    ring: 'ring-blue-200',
    activeBg: 'bg-blue-100',
    activeText: 'text-blue-700'
  },
  paid: {
    label: t('invoice.status.paid'),
    icon: '✅',
    emptyIcon: '💸',
    bg: '#f0fdf4',
    text: '#16a34a',
    ring: 'ring-emerald-200',
    activeBg: 'bg-emerald-100',
    activeText: 'text-emerald-700'
  },
  overdue: {
    label: t('invoice.status.overdue'),
    icon: '⚠️',
    emptyIcon: '⏰',
    bg: '#fef2f2',
    text: '#dc2626',
    ring: 'ring-red-200',
    activeBg: 'bg-red-100',
    activeText: 'text-red-700'
  },
  cancelled: {
    label: t('invoice.status.cancelled'),
    icon: '🛑',
    emptyIcon: '🚫',
    bg: '#f8fafc',
    text: '#475569',
    ring: 'ring-slate-200',
    activeBg: 'bg-slate-200',
    activeText: 'text-slate-700'
  }
};

const TEMPLATE_STORAGE_KEY = 'invoiceflow-selected-template';

const getInitialTemplate = (): TemplateId => {
  if (typeof window === 'undefined') return FREE_TEMPLATE;
  const stored = localStorage.getItem(TEMPLATE_STORAGE_KEY) as TemplateId | null;
  const isValid = stored && TEMPLATES.some((template) => template.id === stored);
  return isValid ? stored : FREE_TEMPLATE;
};

const normalizeStatus = (value: string | null | undefined): InvoiceStatus => {
  if (value === 'sent' || value === 'paid' || value === 'overdue' || value === 'draft' || value === 'cancelled') {
    return value;
  }
  return 'draft';
};

const normalizeDiscountType = (value: string | null | undefined): DiscountType =>
  value === 'fixed' ? 'fixed' : 'percentage';

const getNormalizedDiscountValue = (subtotal: number, discountType: DiscountType, rawValue: number) => {
  if (!Number.isFinite(rawValue)) return 0;
  if (discountType === 'percentage') {
    return Math.min(Math.max(rawValue, 0), 100);
  }
  return Math.min(Math.max(rawValue, 0), subtotal);
};

const computeDiscountAmount = (subtotal: number, discountType: DiscountType, rawValue: number) => {
  const normalized = getNormalizedDiscountValue(subtotal, discountType, rawValue);
  return discountType === 'percentage' ? (subtotal * normalized) / 100 : normalized;
};

const INVOICE_LINE_META_KEY = '__invoiceflow_meta';

const getLineItemsMeta = (lineItems: unknown[]): Record<string, unknown> => {
  const metaEntry = lineItems.find((item) => {
    const obj = (item ?? {}) as Record<string, unknown>;
    return typeof obj === 'object' && obj !== null && INVOICE_LINE_META_KEY in obj;
  }) as Record<string, unknown> | undefined;

  const meta = metaEntry?.[INVOICE_LINE_META_KEY];
  return typeof meta === 'object' && meta !== null ? (meta as Record<string, unknown>) : {};
};

const getShippingFeeFromLineItems = (lineItems: unknown[]): string => {
  const meta = getLineItemsMeta(lineItems);
  const shippingFee = Number(meta.shipping_fee ?? 0);
  if (!Number.isFinite(shippingFee) || shippingFee <= 0) return '0';
  return String(shippingFee);
};

const toStoredLineItems = (items: LineItem[], shippingFee: string) => {
  const normalizedShippingFee = Math.max(Number(shippingFee) || 0, 0);
  return [
    ...items,
    {
      [INVOICE_LINE_META_KEY]: {
        shipping_fee: normalizedShippingFee
      }
    }
  ];
};

const allowedLogoTypes = new Set(['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']);
const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024;

class ApiRequestError extends Error {
  status: number | null;

  constructor(message: string, status: number | null = null) {
    super(message);
    this.status = status;
  }
}

const sanitizeLineItems = (lineItems: unknown[]): LineItem[] => {
  if (!Array.isArray(lineItems) || lineItems.length === 0) {
    return [createEmptyItem()];
  }

  const normalized = lineItems
    .map((item) => {
      const obj = (item ?? {}) as Record<string, unknown>;
      if (INVOICE_LINE_META_KEY in obj) return null;
      return {
        id: typeof obj.id === 'string' ? obj.id : crypto.randomUUID(),
        description: typeof obj.description === 'string' ? obj.description : '',
        quantity: typeof obj.quantity === 'string' ? obj.quantity : String(obj.quantity ?? '1'),
        unitPrice: typeof obj.unitPrice === 'string' ? obj.unitPrice : String(obj.unitPrice ?? '0'),
        discountPercent: typeof obj.discountPercent === 'string' ? obj.discountPercent : String(obj.discountPercent ?? '0')
      };
    })
    .filter((item): item is LineItem => item !== null);

  return normalized.length > 0 ? normalized : [createEmptyItem()];
};

const toTaxPercent = (subtotal: number, tax: number) => {
  if (!subtotal || !tax) return '0';
  const raw = (tax / subtotal) * 100;
  const fixed = raw.toFixed(2);
  return fixed.endsWith('.00') ? String(Math.round(raw)) : fixed;
};

const isTemplateId = (value: string): value is TemplateId =>
  TEMPLATES.some((template) => template.id === value);

const getPreviewModeFromQuery = (query: string) => new URLSearchParams(query).get('preview') === 'template';

const getTemplateFromQuery = (query: string): TemplateId | null => {
  const value = new URLSearchParams(query).get('template');
  return value && isTemplateId(value) ? value : null;
};

const mapApiInvoice = (invoice: ApiInvoice): SavedInvoice => ({
  id: invoice.id,
  from: {
    name: invoice.from_name ?? '',
    email: invoice.from_email ?? '',
    address: invoice.from_address ?? ''
  },
  to: {
    name: invoice.to_name ?? '',
    email: invoice.to_email ?? '',
    address: invoice.to_address ?? ''
  },
  invoiceNumber: invoice.invoice_number,
  issueDate: invoice.issue_date ?? todayISO(),
  dueDate: invoice.due_date ?? addDaysISO(14),
  status: normalizeStatus(invoice.status),
  notes: invoice.notes ?? '',
  paymentTerms: invoice.payment_terms ?? '',
  discountType: normalizeDiscountType(invoice.discount_type),
  discountValue: String(Number(invoice.discount_value ?? 0)),
  shippingFee: getShippingFeeFromLineItems(invoice.line_items ?? []),
  taxPercent: toTaxPercent(
    Math.max(
      0,
      Number(invoice.subtotal ?? 0) -
        computeDiscountAmount(
          Number(invoice.subtotal ?? 0),
          normalizeDiscountType(invoice.discount_type),
          Number(invoice.discount_value ?? 0)
        )
    ),
    Number(invoice.tax ?? 0)
  ),
  signatureMode: invoice.signature_mode === 'draw' ? 'draw' : 'upload',
  signatureDataUrl: invoice.signature_data_url ?? '',
  items: sanitizeLineItems(invoice.line_items ?? []),
  template: invoice.template && isTemplateId(invoice.template) ? invoice.template : FREE_TEMPLATE,
  currency: (invoice.currency as CurrencyCode) ?? 'USD',
  grandTotal: Number(invoice.total ?? 0),
  savedAt: invoice.updated_at ?? invoice.created_at
});

const mapApiClient = (client: ApiClient): Client => ({
  id: client.id,
  name: client.name,
  email: client.email ?? '',
  address: client.address ?? '',
  createdAt: client.created_at
});

const toInvoicePayload = (
  data: InvoiceData,
  selectedTemplate: TemplateId,
  selectedCurrency: CurrencyCode,
  computed: InvoiceComputed,
  isDiscountEnabled: boolean
) => {
  const normalizedDiscountValue = isDiscountEnabled
    ? getNormalizedDiscountValue(computed.subtotal, data.discountType, Number(data.discountValue) || 0)
    : 0;
  return {
    invoice_number: data.invoiceNumber.trim() || undefined,
    from_name: data.from.name.trim() || null,
    from_email: data.from.email.trim() || null,
    from_address: data.from.address.trim() || null,
    to_name: data.to.name.trim() || null,
    to_email: data.to.email.trim() || null,
    to_address: data.to.address.trim() || null,
    issue_date: data.issueDate || null,
    due_date: data.dueDate || null,
    status: data.status,
    notes: data.notes.trim() || null,
    payment_terms: data.paymentTerms.trim() || null,
    discount_type: data.discountType,
    discount_value: normalizedDiscountValue,
    signature_mode: data.signatureDataUrl ? data.signatureMode : null,
    signature_data_url: data.signatureDataUrl || null,
    line_items: toStoredLineItems(data.items, data.shippingFee),
    subtotal: computed.subtotal,
    tax: computed.taxAmount,
    total: computed.grandTotal,
    currency: selectedCurrency,
    template: selectedTemplate
  };
};

const apiFetch = async <T,>(url: string, options?: RequestInit): Promise<T> => {
  let response: Response;

  try {
    response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers ?? {})
      }
    });
  } catch {
    throw new ApiRequestError('Connection error. Please try again.');
  }

  if (!response.ok) {
    const fallback = `Request failed (${response.status})`;
    let errorMessage = fallback;

    try {
      const body = (await response.json()) as { message?: string; error?: string };
      errorMessage = body.message || body.error || fallback;
    } catch {
      errorMessage = fallback;
    }

    throw new ApiRequestError(errorMessage, response.status);
  }

  return (await response.json()) as T;
};

const Spinner = ({ size = 'h-4 w-4' }: { size?: string }) => (
  <span className={`${size} inline-block animate-spin rounded-full border-2 border-current border-r-transparent`} />
);

const Toast = ({ message }: { message: string }) => (
  <div className="toast-spring fixed right-4 top-20 z-50 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-lg">
    {message}
  </div>
);

function InvoiceApp() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isTemplatePreviewOnly = searchParams.get('preview') === 'template';
  const {
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
  } = useInvoiceState({ createInitialData, createEmptyItem, computeDiscountAmount });
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>(() => getInitialTemplate());
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>(() => getInitialCurrency());
  const [plan, setPlan] = useState<UserPlan>('free');
  const [exportsThisMonth, setExportsThisMonth] = useState(0);
  const [exportsResetDate, setExportsResetDate] = useState('');
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);
  const [currencySearch, setCurrencySearch] = useState('');
  const [isComingSoonModalOpen, setIsComingSoonModalOpen] = useState(false);
  const [comingSoonPlan, setComingSoonPlan] = useState<'creator' | 'pro'>('creator');
  const [isExportLimitModalOpen, setIsExportLimitModalOpen] = useState(false);
  const [isAppLoading, setIsAppLoading] = useState(() => !isTemplatePreviewOnly);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [isLogoLoading, setIsLogoLoading] = useState(true);
  const [isLogoUploading, setIsLogoUploading] = useState(false);
  const [isLogoDragActive, setIsLogoDragActive] = useState(false);
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<WorkspaceTab>('edit');
  const [isBillFromExpanded, setIsBillFromExpanded] = useState(true);
  const [isBillToExpanded, setIsBillToExpanded] = useState(true);
  const [isLineItemsModalOpen, setIsLineItemsModalOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [mobilePreviewScale, setMobilePreviewScale] = useState(1);
  const [mobilePreviewHeight, setMobilePreviewHeight] = useState(980);
  const [isPreviewFitWidth, setIsPreviewFitWidth] = useState(false);
  const [showTopActionBar, setShowTopActionBar] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [connectionIssueVisible, setConnectionIssueVisible] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [tourStep, setTourStep] = useState<number | null>(null);
  const [isSignatureDrawing, setIsSignatureDrawing] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);
  const currencyDropdownRef = useRef<HTMLDivElement>(null);
  const statusMenuRef = useRef<HTMLDivElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);
  const hasShownDiscountWarningRef = useRef(false);
  const consumedQueryActionsRef = useRef<string | null>(null);
  const hasHydratedFormRef = useRef(false);
  const tourSteps = [
    'Start by filling in your company details.',
    'Add your client information here.',
    'Line items go here.',
    'Pick a template on the right.',
    'Download your PDF when ready.'
  ];
  const hasPaidPlan = plan === 'creator' || plan === 'pro';
  const unlockedTemplateIds = useMemo<TemplateId[]>(
    () => (isTemplatePreviewOnly || hasPaidPlan ? TEMPLATES.map((template) => template.id) : FREE_TEMPLATE_IDS),
    [hasPaidPlan, isTemplatePreviewOnly]
  );
  const exportLimit = PLAN_EXPORT_LIMITS[plan];
  const exportsRemaining = Math.max(0, exportLimit - exportsThisMonth);
  const exportsUsedPercent = exportLimit > 0 ? (exportsThisMonth / exportLimit) * 100 : 0;
  const exportCounterTextColor =
    exportsRemaining === 0 ? 'text-red-600' : exportsUsedPercent >= 75 ? 'text-amber-600' : 'text-slate-500';
  const { isDarkMode, setIsDarkMode } = useDarkMode();
  const isTemplatePreviewRuntime = () =>
    isTemplatePreviewOnly || (typeof window !== 'undefined' && getPreviewModeFromQuery(window.location.search));

  const isTemplateUnlocked = (templateId: TemplateId) => unlockedTemplateIds.includes(templateId);
  const logoDisplayUrl = logoPreviewUrl ?? logoUrl;
  const openComingSoon = (nextPlan: 'creator' | 'pro' = 'creator') => {
    setComingSoonPlan(nextPlan);
    setIsComingSoonModalOpen(true);
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 3000);
  };

  const handleRequestError = (error: unknown) => {
    if (error instanceof ApiRequestError) {
      if (error.status === 401) {
        window.location.href = '/sign-in';
        return;
      }
      if (error.status === 409) {
        showToast(error.message || 'Invoice number already exists. Please try again.');
        return;
      }
      if (error.status === 500) {
        showToast(error.message || 'Something went wrong. Please try again.');
        return;
      }
      if (error.status === null) {
        setConnectionIssueVisible(true);
        showToast('Connection error. Please try again.');
        return;
      }
      showToast(error.message || 'Something went wrong. Please try again.');
      return;
    }

    showToast('Something went wrong. Please try again.');
  };

  const {
    clients,
    setClients,
    isClientsLoading,
    setIsClientsLoading,
    filteredClients,
    clientSearch,
    setClientSearch,
    showAddClientForm,
    setShowAddClientForm,
    newClientDraft,
    setNewClientDraft,
    editingClientId,
    setEditingClientId,
    editingClientDraft,
    setEditingClientDraft,
    clientModalMode,
    isClientModalMounted,
    isClientModalVisible,
    savingClientMode,
    deletingClientId,
    openClientModal,
    closeClientModal,
    saveToAsClient,
    saveNewClientFromModal,
    startEditClient,
    saveEditedClient,
    deleteClientImmediately
  } = useClients({
    apiFetch,
    mapApiClient,
    createEmptyClientDraft,
    showToast,
    openComingSoon,
    handleRequestError
  });

  const {
    savedInvoices,
    setSavedInvoices,
    isInvoicesLoading,
    setIsInvoicesLoading,
    isSavingInvoice,
    deletingInvoiceId,
    currentInvoiceId,
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
    saveInvoice,
    openSavedInvoice,
    updateInvoiceStatus,
    autoMarkOverdueInvoices,
    deleteSavedInvoiceImmediately,
    clearAllSavedInvoicesImmediately,
    resetFormForNewInvoice
  } = useInvoices({
    apiFetch,
    mapApiInvoice: (invoice) => mapApiInvoice(invoice as ApiInvoice),
    getNextInvoiceNumber: (invoices) => getNextInvoiceNumber(invoices as SavedInvoice[]),
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
    getStatusLabel: (status) => STATUS_META[status].label,
    openComingSoon,
    handleRequestError
  });

  useEffect(() => {
    if (isTemplatePreviewRuntime()) return;
    let isMounted = true;

    const loadInitialData = async () => {
      setIsAppLoading(true);
      try {
        await apiFetch('/api/user/sync', { method: 'POST' });
        const [invoiceRecords, clientRecords, userRecord] = await Promise.all([
          apiFetch<ApiInvoice[]>('/api/invoices'),
          apiFetch<ApiClient[]>('/api/clients'),
          apiFetch<ApiUser>('/api/user/me')
        ]);

        if (!isMounted) return;

        const mappedInvoices = invoiceRecords.map(mapApiInvoice);
        setSavedInvoices(mappedInvoices);
        setClients(clientRecords.map(mapApiClient));
        setLogoUrl(userRecord.logo_url);
        setPlan(normalizePlan(userRecord.plan));
        setExportsThisMonth(Number(userRecord.exports_this_month ?? 0));
        setExportsResetDate(userRecord.exports_reset_date ?? '');
        setData((prev) => ({ ...prev, invoiceNumber: getNextInvoiceNumber(mappedInvoices) }));
        void autoMarkOverdueInvoices(mappedInvoices);
      } catch (error) {
        if (!isMounted) return;
        handleRequestError(error);
      } finally {
        if (isMounted) {
          setIsAppLoading(false);
          setIsInvoicesLoading(false);
          setIsClientsLoading(false);
          setIsLogoLoading(false);
        }
      }
    };

    void loadInitialData();

    return () => {
      isMounted = false;
    };
  }, [isTemplatePreviewOnly]);

  useEffect(() => {
    if (!isTemplatePreviewOnly) return;
    const template = searchParams.get('template');
    const templateId = template && isTemplateId(template) ? template : 'minimal';
    setData(createTemplatePreviewData(templateId));
    setIsDiscountVisible(false);
    setIsAppLoading(false);
    setIsInvoicesLoading(false);
    setIsClientsLoading(false);
    setIsLogoLoading(false);
  }, [isTemplatePreviewOnly, searchParams, setData, setIsClientsLoading, setIsDiscountVisible, setIsInvoicesLoading]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateViewport = () => {
      const mobile = window.innerWidth < 768;
      setIsMobileViewport(mobile);
      if (!mobile) {
        setMobilePreviewScale(1);
        return;
      }
      const nextScale = Math.max(0.42, Math.min((window.innerWidth - 44) / 794, 0.62));
      setMobilePreviewScale(nextScale);
    };

    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const done = localStorage.getItem('invoiceflow_tour_completed') === 'true';
    if (!done) {
      setTourStep(0);
    }
  }, []);

  useEffect(() => {
    const onScroll = () => {
      setShowTopActionBar(window.scrollY > 120);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TEMPLATE_STORAGE_KEY, selectedTemplate);
  }, [selectedTemplate]);

  useEffect(() => {
    if (isTemplatePreviewRuntime()) return;
    if (!unlockedTemplateIds.includes(selectedTemplate)) {
      setSelectedTemplate(FREE_TEMPLATE);
    }
  }, [isTemplatePreviewOnly, selectedTemplate, unlockedTemplateIds]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(CURRENCY_STORAGE_KEY, selectedCurrency);
  }, [selectedCurrency]);

  useEffect(() => {
    if (!newlySavedInvoiceNumber) return;
    const timeout = setTimeout(() => setNewlySavedInvoiceNumber(null), 700);
    return () => clearTimeout(timeout);
  }, [newlySavedInvoiceNumber]);

  useEffect(() => {
    if (!isMobileViewport) return;
    const frame = window.requestAnimationFrame(() => {
      if (!invoiceRef.current) return;
      setMobilePreviewHeight(Math.max(360, Math.round(invoiceRef.current.scrollHeight * mobilePreviewScale)));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [data, isMobileViewport, mobilePreviewScale, selectedTemplate]);

  useEffect(() => {
    if (isAppLoading) return;
    if (typeof window === 'undefined') return;

    const frame = window.requestAnimationFrame(() => {
      window.dispatchEvent(new Event('resize'));
      if (isMobileViewport && invoiceRef.current) {
        setMobilePreviewHeight(Math.max(360, Math.round(invoiceRef.current.scrollHeight * mobilePreviewScale)));
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isAppLoading, isMobileViewport, mobilePreviewScale, selectedTemplate]);

  useEffect(() => {
    if (!isCurrencyDropdownOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!currencyDropdownRef.current?.contains(event.target as Node)) {
        setIsCurrencyDropdownOpen(false);
        setCurrencySearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCurrencyDropdownOpen]);

  useEffect(() => {
    if (!openStatusMenuInvoiceId) return;
    if (isMobileViewport) return;
    const onOutsideClick = (event: MouseEvent) => {
      if (!statusMenuRef.current?.contains(event.target as Node)) {
        setOpenStatusMenuInvoiceId(null);
      }
    };
    document.addEventListener('mousedown', onOutsideClick);
    return () => document.removeEventListener('mousedown', onOutsideClick);
  }, [isMobileViewport, openStatusMenuInvoiceId]);

  useEffect(() => {
    if (isAppLoading) return;
    if (!hasHydratedFormRef.current) {
      hasHydratedFormRef.current = true;
      return;
    }
    setHasUnsavedChanges(true);
  }, [data, isAppLoading, selectedCurrency, selectedTemplate]);

  useEffect(() => {
    if (!isDiscountVisible) {
      hasShownDiscountWarningRef.current = false;
      return;
    }

    const rawDiscountValue = Number(data.discountValue) || 0;
    const maxAllowed = data.discountType === 'percentage' ? 100 : computed.subtotal;
    const isExceeded = rawDiscountValue > maxAllowed;
    if (isExceeded && !hasShownDiscountWarningRef.current) {
      hasShownDiscountWarningRef.current = true;
      showToast('Discount cannot exceed the subtotal');
    }
    if (!isExceeded) {
      hasShownDiscountWarningRef.current = false;
    }
  }, [computed.subtotal, data.discountType, data.discountValue, isDiscountVisible]);

  const filteredCurrencies = useMemo(() => {
    const query = currencySearch.trim().toLowerCase();
    if (!query) return CURRENCIES;
    return CURRENCIES.filter(
      (currency) =>
        currency.code.toLowerCase().includes(query) ||
        currency.name.toLowerCase().includes(query) ||
        currency.symbol.toLowerCase().includes(query)
    );
  }, [currencySearch]);

  const selectedCurrencyOption = CURRENCY_MAP[selectedCurrency];
  const renderSelectedTemplate = () => {
    if (selectedTemplate === 'minimal') {
      return <MinimalTemplate data={data} computed={computed} currency={selectedCurrency} logoUrl={logoDisplayUrl} />;
    }
    if (selectedTemplate === 'classic-professional') {
      return <ClassicProfessionalTemplate data={data} computed={computed} currency={selectedCurrency} logoUrl={logoDisplayUrl} />;
    }
    if (selectedTemplate === 'detailed-itemized') {
      return <DetailedItemizedTemplate data={data} computed={computed} currency={selectedCurrency} logoUrl={logoDisplayUrl} />;
    }
    if (selectedTemplate === 'compact-receipt') {
      return <CompactReceiptTemplate data={data} computed={computed} currency={selectedCurrency} logoUrl={logoDisplayUrl} />;
    }
    if (selectedTemplate === 'creative-bold-branding') {
      return <CreativeBoldBrandingTemplate data={data} computed={computed} currency={selectedCurrency} logoUrl={logoDisplayUrl} />;
    }
    if (selectedTemplate === 'service-hours') {
      return <ServiceHoursTemplate data={data} computed={computed} currency={selectedCurrency} logoUrl={logoDisplayUrl} />;
    }
    return <InternationalTaxTemplate data={data} computed={computed} currency={selectedCurrency} logoUrl={logoDisplayUrl} />;
  };

  const clearForm = () => {
    resetFormForNewInvoice();
    setLogoPreviewUrl(null);
    setLogoUrl(null);
  };

  const closeCurrencyDropdown = () => {
    setIsCurrencyDropdownOpen(false);
    setCurrencySearch('');
  };

  const handleTemplateSelect = (templateId: TemplateId) => {
    if (!isTemplateUnlocked(templateId)) {
      openComingSoon('creator');
      return;
    }
    setSelectedTemplate(templateId);
  };

  const validateLogoFile = (file: File) => {
    if (file.size > MAX_LOGO_SIZE_BYTES) {
      return 'Logo must be under 2MB';
    }
    if (!allowedLogoTypes.has(file.type)) {
      return 'Please upload a PNG, JPG, SVG or WEBP';
    }
    return null;
  };

  const uploadLogoFile = async (file: File) => {
    const validationError = validateLogoFile(file);
    if (validationError) {
      showToast(validationError);
      return;
    }

    const previousLogoUrl = logoUrl;
    const previewObjectUrl = URL.createObjectURL(file);
    setLogoPreviewUrl(previewObjectUrl);
    setIsLogoUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/user/logo', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        const message = body?.message;
        if (message === 'Logo must be under 2MB') {
          throw new Error('Logo must be under 2MB');
        }
        if (message === 'Please upload a PNG, JPG, SVG or WEBP') {
          throw new Error('Please upload a PNG, JPG, SVG or WEBP');
        }
        throw new Error(message || 'Upload failed. Please try again.');
      }

      const body = (await response.json()) as { logo_url: string };
      setLogoUrl(body.logo_url);
      showToast('Logo saved ✓');
    } catch (error) {
      setLogoUrl(previousLogoUrl);
      if (error instanceof Error) {
        showToast(error.message);
      } else {
        showToast('Upload failed. Please try again.');
      }
    } finally {
      setIsLogoUploading(false);
      setLogoPreviewUrl(null);
      URL.revokeObjectURL(previewObjectUrl);
    }
  };

  const handleLogoPick = () => {
    if (isLogoUploading) return;
    logoInputRef.current?.click();
  };

  const deleteLogo = async () => {
    setConfirmDialog({
      title: 'Remove logo',
      description: 'This will remove it from all your invoices.',
      confirmLabel: 'Remove',
      intent: 'danger',
      onConfirm: async () => {
        const previousLogoUrl = logoUrl;
        setLogoUrl(null);
        setIsLogoUploading(true);

        try {
          const response = await fetch('/api/user/logo', { method: 'DELETE' });
          if (!response.ok) {
            const body = (await response.json().catch(() => null)) as { message?: string } | null;
            throw new Error(body?.message || 'Upload failed. Please try again.');
          }
          showToast('Logo removed');
        } catch (error) {
          setLogoUrl(previousLogoUrl);
          if (error instanceof Error) {
            showToast(error.message);
          } else {
            showToast('Upload failed. Please try again.');
          }
        } finally {
          setIsLogoUploading(false);
        }
      }
    });
  };

  const getSignatureCanvasPoint = (event: ReactMouseEvent<HTMLCanvasElement> | ReactTouchEvent<HTMLCanvasElement>) => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in event) {
      const touch = event.touches[0] ?? event.changedTouches[0];
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const beginSignatureStroke = (event: ReactMouseEvent<HTMLCanvasElement> | ReactTouchEvent<HTMLCanvasElement>) => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const { x, y } = getSignatureCanvasPoint(event);
    context.beginPath();
    context.moveTo(x, y);
    context.lineWidth = 2;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = '#111827';
    setIsSignatureDrawing(true);
  };

  const drawSignatureStroke = (event: ReactMouseEvent<HTMLCanvasElement> | ReactTouchEvent<HTMLCanvasElement>) => {
    if (!isSignatureDrawing) return;
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const { x, y } = getSignatureCanvasPoint(event);
    context.lineTo(x, y);
    context.stroke();
  };

  const endSignatureStroke = () => {
    if (!isSignatureDrawing) return;
    setIsSignatureDrawing(false);
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    setData((prev) => ({ ...prev, signatureDataUrl: dataUrl }));
  };

  const clearSignatureCanvas = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    setData((prev) => ({ ...prev, signatureDataUrl: '' }));
  };

  const handleSignatureUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('Please upload an image file for signature.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) return;
      setData((prev) => ({ ...prev, signatureMode: 'upload', signatureDataUrl: result }));
    };
    reader.readAsDataURL(file);
  };

  const deleteClient = async (clientId: string) => {
    setConfirmDialog({
      title: 'Delete client',
      description: 'This will remove the client from your saved list.',
      confirmLabel: 'Delete',
      intent: 'danger',
      onConfirm: async () => {
        await deleteClientImmediately(clientId);
      }
    });
  };


  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isMeta = event.metaKey || event.ctrlKey;
      if (isMeta && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void saveInvoice({ source: 'manual' });
        return;
      }
      if (isMeta && event.key.toLowerCase() === 'p') {
        event.preventDefault();
        void downloadPdf();
        return;
      }
      if (event.key === '?') {
        event.preventDefault();
        setShowShortcutsModal(true);
        return;
      }
      if (event.key === 'Escape') {
        setShowShortcutsModal(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!hasUnsavedChanges || isSavingInvoice || isAppLoading) return;
      void saveInvoice({ silent: true, source: 'autosave' });
    }, 30000);
    return () => window.clearInterval(interval);
  }, [hasUnsavedChanges, isAppLoading, isSavingInvoice]);


  useEffect(() => {
    if (!isTemplatePreviewRuntime()) return;
    const template = searchParams.get('template') ?? (typeof window !== 'undefined' ? getTemplateFromQuery(window.location.search) : null);
    if (template && isTemplateId(template)) {
      setSelectedTemplate(template);
    }
  }, [isTemplatePreviewOnly, searchParams]);

  useEffect(() => {
    if (isTemplatePreviewOnly) return;
    if (isAppLoading) return;
    const key = searchParams.toString();
    if (!key || consumedQueryActionsRef.current === key) return;

    let consumed = false;

    const filter = searchParams.get('filter');
    if (filter === 'draft' || filter === 'sent' || filter === 'paid' || filter === 'overdue' || filter === 'cancelled') {
      setActiveStatusFilter(filter);
      consumed = true;
    }

    const openClients = searchParams.get('openClients');
    if (openClients === 'manage' || openClients === 'picker') {
      openClientModal(openClients);
      consumed = true;
    }

    const template = searchParams.get('template');
    if (template && isTemplateId(template)) {
      handleTemplateSelect(template);
      consumed = true;
    }

    const invoiceId = searchParams.get('invoiceId');
    if (invoiceId) {
      const target = savedInvoices.find((invoice) => invoice.id === invoiceId);
      if (target) {
        openSavedInvoice(target);
        consumed = true;
      }
    }

    if (!consumed) return;
    consumedQueryActionsRef.current = key;
    router.replace(pathname);
  }, [handleTemplateSelect, isAppLoading, isTemplatePreviewOnly, openClientModal, openSavedInvoice, pathname, router, savedInvoices, searchParams]);

  const deleteSavedInvoice = async (invoiceId: string) => {
    setConfirmDialog({
      title: 'Delete invoice',
      description: 'This action cannot be undone.',
      confirmLabel: 'Delete',
      intent: 'danger',
      onConfirm: async () => {
        await deleteSavedInvoiceImmediately(invoiceId, {
          onDeletedCurrent: clearForm
        });
      }
    });
  };

  const clearAllSavedInvoices = async () => {
    setConfirmDialog({
      title: 'Delete all saved invoices',
      description: 'This action cannot be undone.',
      confirmLabel: 'Delete all',
      intent: 'danger',
      onConfirm: async () => {
        await clearAllSavedInvoicesImmediately({
          onCleared: clearForm
        });
      }
    });
  };

  const buildPdfDocument = async (): Promise<{ pdf: jsPDF; filename: string } | null> => {
    try {
      if (!invoiceRef.current) return null;
      const exportRoot = (invoiceRef.current.firstElementChild as HTMLElement | null) ?? invoiceRef.current;
      const savedRecord = await saveInvoice({ source: 'manual' });
      if (!savedRecord) return null;

      const exportCheck = await apiFetch<{
        allowed: boolean;
        remaining: number;
        exports_this_month?: number;
        exports_reset_date?: string;
      }>('/api/user/export', { method: 'POST' });

      if (typeof exportCheck.exports_this_month === 'number') {
        setExportsThisMonth(exportCheck.exports_this_month);
      }
      if (exportCheck.exports_reset_date) {
        setExportsResetDate(exportCheck.exports_reset_date);
      }

      if (!exportCheck.allowed) {
        setIsExportLimitModalOpen(true);
        return null;
      }

      const logoImages = Array.from(exportRoot.querySelectorAll('img[data-invoice-logo="true"]')) as HTMLImageElement[];

      await Promise.all(
        logoImages.map(
          (img) =>
            new Promise<void>((resolve) => {
              if (img.complete && img.naturalWidth > 0) {
                resolve();
                return;
              }
              const onLoad = () => {
                img.removeEventListener('load', onLoad);
                img.removeEventListener('error', onError);
                resolve();
              };
              const onError = () => {
                img.removeEventListener('load', onLoad);
                img.removeEventListener('error', onError);
                resolve();
              };
              img.addEventListener('load', onLoad);
              img.addEventListener('error', onError);
            })
        )
      );

      const canvas = await html2canvas(exportRoot, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true
      });

      const currentExportCount = Number(exportCheck.exports_this_month ?? exportsThisMonth);
      const shouldSkipWatermarkForFree = plan === 'free' && currentExportCount <= 15;

      if (!hasPaidPlan && !shouldSkipWatermarkForFree) {
        const context = canvas.getContext('2d');
        if (context) {
          context.save();
          context.translate(canvas.width / 2, canvas.height / 2);
          context.rotate((-24 * Math.PI) / 180);
          context.textAlign = 'center';
          context.textBaseline = 'middle';
          context.font = `${Math.max(34, Math.floor(canvas.width * 0.08))}px Inter, sans-serif`;
          context.fillStyle = 'rgba(100, 116, 139, 0.28)';
          context.fillText('InvoiceFlow Free', 0, 0);
          context.restore();
        }
      }

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');

      const pdfWidth = 210;
      const pdfHeight = 297;
      const margin = 20;
      const usableWidth = pdfWidth - margin * 2;
      const imgHeight = (canvas.height * usableWidth) / canvas.width;
      const usableHeight = pdfHeight - margin * 2;

      let heightLeft = imgHeight;
      let positionY = margin;
      const pageBreakTolerance = 4;

      pdf.addImage(imgData, 'PNG', margin, positionY, usableWidth, imgHeight);
      heightLeft -= usableHeight;

      while (heightLeft > pageBreakTolerance) {
        positionY = heightLeft - imgHeight + margin;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', margin, positionY, usableWidth, imgHeight);
        heightLeft -= usableHeight;
      }
      return {
        pdf,
        filename: `${savedRecord?.invoiceNumber || data.invoiceNumber || 'invoice'}.pdf`
      };
    } catch {
      showToast('PDF export failed. Please try again.');
      return null;
    }
  };

  const downloadPdf = async () => {
    const result = await buildPdfDocument();
    if (!result) return;
    result.pdf.save(result.filename);
  };

  const printInvoice = async () => {
    const result = await buildPdfDocument();
    if (!result) return;

    const blob = result.pdf.output('blob');
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank', 'noopener,noreferrer');
    if (!printWindow) {
      URL.revokeObjectURL(url);
      showToast('Please allow popups to print the invoice.');
      return;
    }
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  if (isAppLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f5f7] text-slate-700">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <Spinner size="h-5 w-5" />
          <span className="text-sm font-semibold">Loading your workspace...</span>
        </div>
      </div>
    );
  }

  if (isTemplatePreviewOnly) {
    return (
      <div className="min-h-screen bg-slate-100 p-3 sm:p-5">
        <div className="mx-auto w-full max-w-[900px] overflow-auto border border-slate-200 bg-white shadow-[0_18px_36px_rgba(15,23,42,0.12)]">
          <div ref={invoiceRef} className="mx-auto w-[794px] max-w-[794px] break-normal bg-white">
            {renderSelectedTemplate()}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="workspace-bg min-h-screen text-slate-900">
      {toastMessage ? <Toast message={toastMessage} /> : null}
      <div className="md:pl-[var(--workspace-sidebar-width)]">
        {connectionIssueVisible ? (
          <div className="sticky top-16 z-40 mx-auto w-full max-w-[1800px] px-4 md:px-5 lg:px-6">
            <div className="mt-2 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
              <p>⚠️ Connection issue — changes may not be saved. Check your internet.</p>
              <button type="button" className="text-amber-800" onClick={() => setConnectionIssueVisible(false)}>
                ✕
              </button>
            </div>
          </div>
        ) : null}
        <div className="mx-auto w-full max-w-[1800px] space-y-5 p-4 pb-40 md:p-5 md:pb-28 lg:p-6 lg:pb-8">
        <div className="hidden px-1 py-1 md:block">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Create Invoice</h1>
              <p className="mt-1 text-sm text-slate-500">Complete invoice details and preview in real time.</p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <span
                title={`You have ${exportsRemaining} exports remaining this month. Resets on ${formatShortDate(exportsResetDate)}.`}
                className={`rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold ${exportCounterTextColor}`}
              >
                {exportsThisMonth} / {exportLimit} exports
              </span>
              {/* <button
                type="button"
                onClick={() => setIsDarkMode((prev) => !prev)}
                title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  {isDarkMode ? (
                    <path d="M10 3.25a.75.75 0 0 1 .75.75v1.25a.75.75 0 0 1-1.5 0V4a.75.75 0 0 1 .75-.75Zm0 10a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5Zm0 3.5a.75.75 0 0 1 .75.75v1.25a.75.75 0 0 1-1.5 0V17.5a.75.75 0 0 1 .75-.75ZM3.25 10a.75.75 0 0 1 .75-.75h1.25a.75.75 0 0 1 0 1.5H4a.75.75 0 0 1-.75-.75Zm11.5 0a.75.75 0 0 1 .75-.75h1.25a.75.75 0 0 1 0 1.5H15.5a.75.75 0 0 1-.75-.75ZM5.42 5.42a.75.75 0 0 1 1.06 0l.88.88a.75.75 0 0 1-1.06 1.06l-.88-.88a.75.75 0 0 1 0-1.06Zm8.28 8.28a.75.75 0 0 1 1.06 0l.88.88a.75.75 0 0 1-1.06 1.06l-.88-.88a.75.75 0 0 1 0-1.06ZM5.42 14.58a.75.75 0 0 1 1.06 0l.88.88a.75.75 0 1 1-1.06 1.06l-.88-.88a.75.75 0 0 1 0-1.06Zm8.28-8.28a.75.75 0 0 1 1.06 0l.88.88a.75.75 0 1 1-1.06 1.06l-.88-.88a.75.75 0 0 1 0-1.06Z" />
                  ) : (
                    <path d="M13.27 2.44a.75.75 0 0 1 .3 1.03 6.25 6.25 0 1 0 2.96 8.22.75.75 0 0 1 1.37.61 7.75 7.75 0 1 1-4.63-10.16Z" />
                  )}
                </svg>
              </button> */}
              {/* <button type="button" className="inline-flex h-10 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100">
                EN
              </button> */}
              <button
                type="button"
                title="Save Invoice (⌘/Ctrl+S)"
                onClick={() => void saveInvoice({ source: 'manual' })}
                disabled={isSavingInvoice}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingInvoice ? <Spinner /> : null}
                Save Draft
              </button>
            </div>
          </div>
        </div>
        <div className="md:hidden">
          <div className="inline-flex w-full rounded-full border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setActiveWorkspaceTab('edit')}
              className={`w-1/2 rounded-full px-3 py-2 text-sm font-semibold ${
                activeWorkspaceTab === 'edit' ? 'bg-indigo-600 text-white' : 'text-slate-600'
              }`}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setActiveWorkspaceTab('preview')}
              className={`w-1/2 rounded-full px-3 py-2 text-sm font-semibold ${
                activeWorkspaceTab === 'preview' ? 'bg-indigo-600 text-white' : 'text-slate-600'
              }`}
            >
              Preview
            </button>
          </div>
        </div>

        <SavedInvoicesSection
          savedInvoicesCount={savedInvoices.length}
          isCollapsed={isSavedInvoicesCollapsed}
          onToggleCollapsed={() => setIsSavedInvoicesCollapsed((prev) => !prev)}
          savedInvoiceSearch={savedInvoiceSearch}
          onSavedInvoiceSearchChange={setSavedInvoiceSearch}
          savedInvoiceSort={savedInvoiceSort}
          onSavedInvoiceSortChange={setSavedInvoiceSort}
          activeStatusFilter={activeStatusFilter}
          onActiveStatusFilterChange={setActiveStatusFilter}
          statusFilterOrder={SAVED_FILTER_ORDER}
          statusCounts={statusCounts}
          statusOrder={STATUS_ORDER}
          statusLabels={{
            draft: STATUS_META.draft.label,
            sent: STATUS_META.sent.label,
            paid: STATUS_META.paid.label,
            overdue: STATUS_META.overdue.label,
            cancelled: STATUS_META.cancelled.label
          }}
          isInvoicesLoading={isInvoicesLoading}
          filteredInvoices={filteredInvoices}
          deletingInvoiceId={deletingInvoiceId}
          onOpenInvoice={(row) => {
            const invoice = savedInvoices.find((item) => item.id === row.id);
            if (!invoice) return;
            openSavedInvoice(invoice);
          }}
          onDeleteInvoice={(invoiceId) => {
            void deleteSavedInvoice(invoiceId);
          }}
          onUpdateInvoiceStatus={(invoiceId, status) => {
            void updateInvoiceStatus(invoiceId, status);
          }}
          formatCurrency={(value, currencyCode) => formatCurrency(value, currencyCode as CurrencyCode)}
          formatDate={formatDate}
        />

        <div className="grid gap-5 xl:h-[calc(100vh-190px)] xl:min-h-0 xl:grid-cols-[minmax(390px,460px)_minmax(0,1fr)] xl:overflow-hidden">
        <InvoiceEditorPanel
          activeWorkspaceTab={activeWorkspaceTab}
          data={data}
          clearForm={clearForm}
          isBillFromExpanded={isBillFromExpanded}
          setIsBillFromExpanded={setIsBillFromExpanded}
          isBillToExpanded={isBillToExpanded}
          setIsBillToExpanded={setIsBillToExpanded}
          logoInputRef={logoInputRef}
          uploadLogoFile={uploadLogoFile}
          handleLogoPick={handleLogoPick}
          isLogoUploading={isLogoUploading}
          isLogoDragActive={isLogoDragActive}
          setIsLogoDragActive={setIsLogoDragActive}
          isLogoLoading={isLogoLoading}
          logoDisplayUrl={logoDisplayUrl}
          deleteLogo={deleteLogo}
          updateParty={updateParty}
          errorFields={errorFields}
          onOpenClientPicker={() => openClientModal('picker')}
          onSaveToClient={() => void saveToAsClient(data.to)}
          savingClientMode={savingClientMode}
          selectedCurrency={selectedCurrency}
          setSelectedCurrency={(currency) => setSelectedCurrency(currency as CurrencyCode)}
          currencies={CURRENCIES}
          setData={setData}
          statusOptions={STATUS_ORDER.map((status) => ({ value: status, label: STATUS_META[status].label }))}
          setIsLineItemsModalOpen={setIsLineItemsModalOpen}
          computed={computed}
          isDiscountVisible={isDiscountVisible}
          formatCurrency={(value, currencyCode) => formatCurrency(value, currencyCode as CurrencyCode)}
          signatureInputRef={signatureInputRef}
          handleSignatureUpload={handleSignatureUpload}
          signatureCanvasRef={signatureCanvasRef}
          beginSignatureStroke={beginSignatureStroke}
          drawSignatureStroke={drawSignatureStroke}
          endSignatureStroke={endSignatureStroke}
          clearSignatureCanvas={clearSignatureCanvas}
        />

        <InvoicePreviewWorkspace
          activeWorkspaceTab={activeWorkspaceTab}
          selectedTemplate={selectedTemplate}
          templateOptions={TEMPLATES}
          onTemplateChange={(templateId) => handleTemplateSelect(templateId as TemplateId)}
          onSave={() => void saveInvoice({ source: 'manual' })}
          isSavingInvoice={isSavingInvoice}
          isMobileViewport={isMobileViewport}
          mobilePreviewHeight={mobilePreviewHeight}
          mobilePreviewScale={mobilePreviewScale}
          isPreviewFitWidth={isPreviewFitWidth}
          setIsPreviewFitWidth={setIsPreviewFitWidth}
          invoiceRef={invoiceRef}
          renderSelectedTemplate={renderSelectedTemplate}
          onOpenPreview={() => setIsPreviewModalOpen(true)}
          onDownloadPdf={() => void downloadPdf()}
          onPrintInvoice={() => void printInvoice()}
          onShowShortcuts={() => setShowShortcutsModal(true)}
        />
        </div>

        <MobileActionBar
          isEditTab={activeWorkspaceTab === 'edit'}
          isSavingInvoice={isSavingInvoice}
          onSave={() => void saveInvoice({ source: 'manual' })}
          onDownload={() => void downloadPdf()}
        />

        {isPreviewModalOpen ? (
          <PreviewModal
            invoiceNumber={data.invoiceNumber}
            selectedTemplateName={TEMPLATES.find((template) => template.id === selectedTemplate)?.name ?? selectedTemplate}
            onClose={() => setIsPreviewModalOpen(false)}
            onDownload={() => {
              void downloadPdf();
            }}
          >
            <div className="mx-auto w-[794px] max-w-[794px] break-normal bg-white">
              {renderSelectedTemplate()}
            </div>
          </PreviewModal>
        ) : null}

        <KeyboardShortcutsModal isOpen={showShortcutsModal} onClose={() => setShowShortcutsModal(false)} />

        <QuickTourPopover
          tourStep={tourStep}
          tourSteps={tourSteps}
          onSkip={() => {
            localStorage.setItem('invoiceflow_tour_completed', 'true');
            setTourStep(null);
          }}
          onNext={() => {
            if (tourStep === null) return;
            if (tourStep >= tourSteps.length - 1) {
              localStorage.setItem('invoiceflow_tour_completed', 'true');
              setTourStep(null);
              return;
            }
            setTourStep((prev) => (prev === null ? 0 : prev + 1));
          }}
        />

        {confirmDialog ? (
          <ConfirmDialog
            title={confirmDialog.title}
            description={confirmDialog.description}
            confirmLabel={confirmDialog.confirmLabel}
            intent={confirmDialog.intent}
            onCancel={() => setConfirmDialog(null)}
            onConfirm={() => {
              const task = confirmDialog.onConfirm();
              if (task instanceof Promise) {
                void task.finally(() => setConfirmDialog(null));
              } else {
                setConfirmDialog(null);
              }
            }}
          />
        ) : null}

        <LineItemsModal
          isOpen={isLineItemsModalOpen}
          onClose={() => setIsLineItemsModalOpen(false)}
          data={data}
          setData={setData}
          computed={computed}
          selectedCurrency={selectedCurrency}
          isDiscountVisible={isDiscountVisible}
          setIsDiscountVisible={setIsDiscountVisible}
          updateItem={updateItem}
          removeItem={removeItem}
          addItem={addItem}
          formatCurrency={(value, currencyCode) => formatCurrency(value, currencyCode as CurrencyCode)}
        />

        <ClientManagerModal
          isMounted={isClientModalMounted}
          isVisible={isClientModalVisible}
          mode={clientModalMode}
          clients={clients}
          filteredClients={filteredClients}
          isClientsLoading={isClientsLoading}
          clientSearch={clientSearch}
          onClientSearchChange={setClientSearch}
          showAddClientForm={showAddClientForm}
          onToggleAddClientForm={() => {
            setShowAddClientForm((prev) => !prev);
            setNewClientDraft(createEmptyClientDraft());
          }}
          newClientDraft={newClientDraft}
          setNewClientDraft={setNewClientDraft}
          editingClientId={editingClientId}
          editingClientDraft={editingClientDraft}
          setEditingClientDraft={setEditingClientDraft}
          savingClientMode={savingClientMode}
          deletingClientId={deletingClientId}
          onClose={closeClientModal}
          onSaveNewClient={saveNewClientFromModal}
          onCancelAddClient={() => setShowAddClientForm(false)}
          onSelectClient={(client) => {
            setData((prev) => ({
              ...prev,
              to: {
                name: client.name,
                email: client.email,
                address: client.address
              }
            }));
            closeClientModal();
          }}
          onStartEditClient={startEditClient}
          onSaveEditedClient={saveEditedClient}
          onCancelEditClient={() => setEditingClientId(null)}
          onDeleteClient={deleteClient}
        />

        <ExportLimitModal
          isOpen={isExportLimitModalOpen}
          plan={plan}
          exportsResetDate={exportsResetDate}
          formatShortDate={formatShortDate}
          onClose={() => setIsExportLimitModalOpen(false)}
          onJoinWaitlist={() => {
            setIsExportLimitModalOpen(false);
            openComingSoon('creator');
          }}
        />
        <ComingSoonModal isOpen={isComingSoonModalOpen} onClose={() => setIsComingSoonModalOpen(false)} plan={comingSoonPlan} />
        </div>
      </div>
    </div>
  );
}
type InvoiceLogoProps = {
  logoUrl: string | null;
  className?: string;
  imageClassName?: string;
};

const InvoiceLogo = ({
  logoUrl,
  className = '',
  imageClassName = ''
}: InvoiceLogoProps) => {
  if (!logoUrl) return null;

  return (
    <div className={`flex max-h-[80px] min-h-[44px] max-w-[120px] items-center justify-center overflow-hidden ${className}`}>
      <img
        src={logoUrl}
        alt="Company logo"
        className={`max-h-[80px] max-w-[120px] object-contain ${imageClassName}`}
        width={240}
        height={160}
        crossOrigin="anonymous"
        data-invoice-logo="true"
      />
    </div>
  );
};

type InvoiceAdditionalDetailsProps = {
  data: InvoiceData;
  containerClassName?: string;
  dividerClassName?: string;
  labelClassName?: string;
  bodyClassName?: string;
  notesBodyClassName?: string;
};

const InvoiceAdditionalDetails = ({
  data,
  containerClassName = '',
  dividerClassName = '',
  labelClassName = '',
  bodyClassName = '',
  notesBodyClassName = ''
}: InvoiceAdditionalDetailsProps) => {
  const hasTerms = Boolean(data.paymentTerms.trim());
  const hasNotes = Boolean(data.notes.trim());
  const hasSignature = Boolean(data.signatureDataUrl);

  if (!hasTerms && !hasNotes && !hasSignature) return null;

  return (
    <div className={`mt-8 border-t pt-4 ${dividerClassName} ${containerClassName}`}>
      <div className={`grid gap-4 ${hasTerms && hasNotes ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
        {hasTerms ? (
          <div>
            <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${labelClassName}`}>Payment Terms</p>
            <p className={`mt-2 whitespace-pre-line text-sm ${bodyClassName}`}>{data.paymentTerms}</p>
          </div>
        ) : null}
        {hasNotes ? (
          <div>
            <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${labelClassName}`}>Notes</p>
            <p className={`mt-2 whitespace-pre-line text-sm ${notesBodyClassName || bodyClassName}`}>{data.notes}</p>
          </div>
        ) : null}
      </div>
      {hasSignature ? (
        <div className="mt-4 border-t border-dashed border-slate-300 pt-3">
          <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${labelClassName}`}>Signature</p>
          <img
            src={data.signatureDataUrl}
            alt="Signature"
            className="mt-2 max-h-16 w-auto object-contain"
            width={220}
            height={90}
          />
        </div>
      ) : null}
    </div>
  );
};

const MinimalTemplate = ({ data, computed, currency, logoUrl }: InvoiceTemplateProps) => (
  <div className="mx-auto min-h-[980px] w-full max-w-[794px] bg-white px-8 py-10 text-[13px] text-slate-700">
      <div className="flex items-start justify-between gap-8">
        <div className="min-w-0 flex flex-1 items-start gap-2.5">
          <InvoiceLogo logoUrl={logoUrl} className="max-h-[54px] max-w-[82px]" />
          <div className="min-w-0">
            <p className="text-[28px] font-bold tracking-tight text-black">{data.from.name || 'Your Company'}</p>
            <p className="mt-1 text-xs leading-5 text-slate-400">{data.from.email || 'your@email.com'}</p>
          </div>
        </div>
        <div className="shrink-0 pt-0.5 text-right">
          <p className="text-[56px] font-bold leading-[0.92] tracking-[0.01em] text-black">INVOICE</p>
          <p className="mt-2 text-sm font-medium text-slate-500">{data.invoiceNumber || '-'}</p>
        </div>
      </div>

      <div className="mt-14 grid grid-cols-[minmax(0,1fr)_260px] gap-10">
        <div>
          <p className="text-[25px] font-semibold leading-none text-black">Bill To</p>
          <p className="mt-3.5 text-lg font-semibold text-black">{data.to.name || 'Client name'}</p>
          <p className="mt-2 whitespace-pre-line text-[15px] leading-7 text-slate-700">{data.to.address || 'Client address'}</p>
          <p className="mt-2 text-[15px] text-slate-700">{data.to.email || 'client@email.com'}</p>
        </div>
        <div className="space-y-3">
          <p className="flex items-center justify-between gap-6">
            <span className="text-[13px] font-medium text-slate-500">Invoice No.</span>
            <span className="text-[15px] font-semibold text-slate-800">{data.invoiceNumber || '-'}</span>
          </p>
          <p className="flex items-center justify-between gap-6">
            <span className="text-[13px] font-medium text-slate-500">Invoice Date</span>
            <span className="text-[15px] font-semibold text-slate-800">{formatDate(data.issueDate)}</span>
          </p>
          <p className="flex items-center justify-between gap-6">
            <span className="text-[13px] font-medium text-slate-500">Due Date</span>
            <span className="text-[15px] font-semibold text-slate-800">{formatDate(data.dueDate)}</span>
          </p>
        </div>
      </div>

      <div className="mt-14 overflow-hidden border border-slate-200">
        <table className="w-full border-collapse text-left">
          <thead className="bg-black text-[11px] font-semibold uppercase tracking-[0.08em] text-white">
            <tr>
              <th className="px-5 py-2.5">Description</th>
              <th className="w-28 px-5 py-2.5 text-right">Quantity</th>
              <th className="w-40 px-5 py-2.5 text-right">Unit Price</th>
              <th className="w-40 px-5 py-2.5 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, index) => (
              <tr key={item.id} className="border-t border-slate-100 align-top">
                <td className="px-5 py-3.5">
                  <p className="text-[15px] font-semibold leading-6 text-black">{item.description || '-'}</p>
                </td>
                <td className="px-5 py-3.5 text-right text-[15px] text-slate-700">{item.quantity || '0'}</td>
                <td className="px-5 py-3.5 text-right text-[15px] text-slate-700">{formatCurrency(Number(item.unitPrice) || 0, currency)}</td>
                <td className="px-5 py-3.5 text-right text-[15px] font-medium text-slate-800">{formatCurrency(computed.lineTotals[index] ?? 0, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-16 grid grid-cols-[1fr_330px] gap-16">
        <div>
          <p className="text-[24px] font-semibold text-black">Notes</p>
          <p className="mt-4 whitespace-pre-line text-[15px] leading-7 text-slate-600">{data.notes.trim() || 'Add extra notes for your client here.'}</p>
          {data.paymentTerms.trim() ? (
            <p className="mt-4 text-sm text-slate-500">Payment terms: {data.paymentTerms}</p>
          ) : null}
        </div>
        <div className="ml-auto w-full max-w-[330px] text-sm">
          <p className="flex items-center justify-between border-b border-slate-100 py-3">
            <span className="text-slate-500">Subtotal</span>
            <span className="font-semibold text-slate-800">{formatCurrency(computed.subtotal, currency)}</span>
          </p>
          {computed.discountAmount > 0 ? (
            <p className="flex items-center justify-between border-b border-slate-100 py-3">
              <span className="text-slate-500">{data.discountType === 'percentage' ? `Discount (${Number(data.discountValue) || 0}%)` : 'Discount'}</span>
              <span className="font-semibold text-slate-800">- {formatCurrency(computed.discountAmount, currency)}</span>
            </p>
          ) : null}
          <p className="flex items-center justify-between border-b border-slate-100 py-3">
            <span className="text-slate-500">Tax ({Number(data.taxPercent) || 0}%)</span>
            <span className="font-semibold text-slate-800">{formatCurrency(computed.taxAmount, currency)}</span>
          </p>
          <p className="flex items-center justify-between border-b border-slate-100 py-3">
            <span className="text-slate-500">Shipping</span>
            <span className="font-semibold text-slate-800">{formatCurrency(computed.shippingAmount, currency)}</span>
          </p>
          <p className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4 text-[30px] font-bold leading-none text-black">
            <span>Total</span>
            <span>{formatCurrency(computed.grandTotal, currency)}</span>
          </p>
        </div>
      </div>

      <div className="mt-20 border-t border-slate-200 pt-7">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm font-medium text-slate-700">{data.from.email || 'your@email.com'}</p>
            <p className="mt-0.5 text-sm text-slate-500">{data.from.address || 'Your business address'}</p>
          </div>
          {data.signatureDataUrl ? (
            <img
              src={data.signatureDataUrl}
              alt="Signature"
              className="max-h-16 w-auto object-contain"
              width={220}
              height={90}
            />
          ) : (
            <p className="text-3xl italic leading-none text-slate-500">Signature</p>
          )}
        </div>
      </div>
  </div>
);

const ClassicProfessionalTemplate = ({ data, computed, currency, logoUrl }: InvoiceTemplateProps) => (
  <div className="min-h-[960px] bg-white px-10 py-10 text-[13px] text-slate-700">
    <div className="flex items-start justify-between border-b-2 border-[#1d4ed8] pb-6">
      <div className="flex items-start gap-3">
        <InvoiceLogo logoUrl={logoUrl} className="max-h-[58px] max-w-[90px]" />
        <div>
          <p className="text-2xl font-bold text-slate-900">{data.from.name || 'Your Company'}</p>
          <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{data.from.address || 'Your address'}</p>
          <p className="text-sm text-slate-600">{data.from.email || 'your@email.com'}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-[46px] font-extrabold tracking-tight text-slate-900">INVOICE</p>
        <p className="text-sm font-semibold text-[#1d4ed8]">{data.invoiceNumber}</p>
        <p className="mt-2 text-xs text-slate-500">Issue: {formatDate(data.issueDate)}</p>
        <p className="text-xs text-slate-500">Due: {formatDate(data.dueDate)}</p>
      </div>
    </div>

    <div className="mt-8 grid grid-cols-2 gap-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#1d4ed8]">Bill From</p>
        <p className="mt-2 font-semibold text-slate-900">{data.from.name || '-'}</p>
        <p className="whitespace-pre-line">{data.from.address || '-'}</p>
        <p>{data.from.email || '-'}</p>
      </div>
      <div className="text-right">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#1d4ed8]">Bill To</p>
        <p className="mt-2 font-semibold text-slate-900">{data.to.name || '-'}</p>
        <p className="whitespace-pre-line">{data.to.address || '-'}</p>
        <p>{data.to.email || '-'}</p>
      </div>
    </div>

    <div className="mt-7 overflow-hidden border border-slate-200">
      <table className="w-full border-collapse text-left">
        <thead className="bg-[#1d4ed8] text-xs font-semibold uppercase tracking-wide text-white">
          <tr>
            <th className="px-4 py-3">Description</th>
            <th className="w-24 px-4 py-3 text-right">Qty</th>
            <th className="w-40 px-4 py-3 text-right">Unit Price</th>
            <th className="w-40 px-4 py-3 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item, index) => (
            <tr key={item.id} className="border-t border-slate-200">
              <td className="px-4 py-3 text-slate-800">{item.description || '-'}</td>
              <td className="px-4 py-3 text-right">{item.quantity || '0'}</td>
              <td className="px-4 py-3 text-right">{formatCurrency(Number(item.unitPrice) || 0, currency)}</td>
              <td className="px-4 py-3 text-right font-semibold">{formatCurrency(computed.lineTotals[index] ?? 0, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <div className="mt-8 ml-auto w-full max-w-sm space-y-2 text-sm">
      <p className="flex items-center justify-between border-b border-slate-200 pb-2"><span>Subtotal</span><span>{formatCurrency(computed.subtotal, currency)}</span></p>
      {computed.discountAmount > 0 ? (
        <p className="flex items-center justify-between border-b border-slate-200 pb-2"><span>{data.discountType === 'percentage' ? `Discount (${Number(data.discountValue) || 0}%)` : 'Discount'}</span><span>- {formatCurrency(computed.discountAmount, currency)}</span></p>
      ) : null}
      <p className="flex items-center justify-between border-b border-slate-200 pb-2"><span>Tax ({Number(data.taxPercent) || 0}%)</span><span>{formatCurrency(computed.taxAmount, currency)}</span></p>
      <p className="flex items-center justify-between border-b border-slate-200 pb-2"><span>Shipping</span><span>{formatCurrency(computed.shippingAmount, currency)}</span></p>
      <p className="flex items-center justify-between rounded bg-[#dbeafe] px-3 py-2 font-bold text-[#1e3a8a]"><span>Total Due</span><span>{formatCurrency(computed.grandTotal, currency)}</span></p>
    </div>

    <InvoiceAdditionalDetails data={data} dividerClassName="border-slate-200" labelClassName="text-[#1d4ed8]" bodyClassName="text-slate-700" />
  </div>
);

const DetailedItemizedTemplate = ({ data, computed, currency, logoUrl }: InvoiceTemplateProps) => (
  <div className="min-h-[960px] bg-white px-8 py-8 text-[12px] text-slate-700">
    <div className="flex items-start justify-between border-b border-[#16a34a] pb-4">
      <div className="flex items-start gap-3">
        <InvoiceLogo logoUrl={logoUrl} className="max-h-[52px] max-w-[80px]" />
        <div>
          <p className="text-xl font-bold text-slate-900">{data.from.name || 'Your Company'}</p>
          <p className="text-xs text-slate-500">{data.from.email || 'your@email.com'}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-3xl font-extrabold text-[#14532d]">ITEMIZED INVOICE</p>
        <p className="text-sm font-semibold text-[#16a34a]">{data.invoiceNumber}</p>
      </div>
    </div>

    <div className="mt-5 grid grid-cols-2 gap-6 text-xs">
      <div>
        <p className="font-semibold uppercase tracking-wide text-[#16a34a]">Bill To</p>
        <p className="mt-1 font-semibold text-slate-900">{data.to.name || '-'}</p>
        <p className="whitespace-pre-line">{data.to.address || '-'}</p>
        <p>{data.to.email || '-'}</p>
      </div>
      <div className="text-right">
        <p>Issue Date: <span className="font-semibold">{formatDate(data.issueDate)}</span></p>
        <p>Due Date: <span className="font-semibold">{formatDate(data.dueDate)}</span></p>
        <p>Terms: <span className="font-semibold">{data.paymentTerms || '-'}</span></p>
      </div>
    </div>

    <div className="mt-6 overflow-hidden border border-slate-200">
      <table className="w-full border-collapse text-left text-[11px]">
        <thead className="bg-[#16a34a] text-white">
          <tr>
            <th className="px-2 py-2">Item Code</th>
            <th className="px-2 py-2">Description</th>
            <th className="px-2 py-2 text-right">Qty</th>
            <th className="px-2 py-2 text-right">Unit Price</th>
            <th className="px-2 py-2 text-right">Discount</th>
            <th className="px-2 py-2 text-right">Tax</th>
            <th className="px-2 py-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item, index) => {
            const qty = Number(item.quantity) || 0;
            const unit = Number(item.unitPrice) || 0;
            const lineBase = qty * unit;
            const lineDiscountRate = (Number(item.discountPercent) || 0) / 100;
            const lineDiscountAmount = lineBase * lineDiscountRate;
            const lineAfterDiscount = lineBase - lineDiscountAmount;
            const lineTaxAmount = lineAfterDiscount * ((Number(data.taxPercent) || 0) / 100);
            return (
              <tr key={item.id} className="border-t border-slate-200">
                <td className="px-2 py-2 font-semibold text-slate-600">ITM-{String(index + 1).padStart(3, '0')}</td>
                <td className="px-2 py-2 text-slate-900">{item.description || '-'}</td>
                <td className="px-2 py-2 text-right">{qty}</td>
                <td className="px-2 py-2 text-right">{formatCurrency(unit, currency)}</td>
                <td className="px-2 py-2 text-right">{lineDiscountRate * 100}%</td>
                <td className="px-2 py-2 text-right">{formatCurrency(lineTaxAmount, currency)}</td>
                <td className="px-2 py-2 text-right font-semibold">{formatCurrency(computed.lineTotals[index] ?? 0, currency)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>

    <div className="mt-6 ml-auto w-full max-w-[340px] space-y-1.5 rounded border border-[#86efac] bg-[#f0fdf4] p-3 text-xs">
      <p className="flex items-center justify-between"><span>Subtotal</span><span>{formatCurrency(computed.subtotal, currency)}</span></p>
      {computed.discountAmount > 0 ? (
        <p className="flex items-center justify-between"><span>Discount</span><span>- {formatCurrency(computed.discountAmount, currency)}</span></p>
      ) : null}
      <p className="flex items-center justify-between"><span>Tax</span><span>{formatCurrency(computed.taxAmount, currency)}</span></p>
      <p className="flex items-center justify-between"><span>Shipping</span><span>{formatCurrency(computed.shippingAmount, currency)}</span></p>
      <p className="flex items-center justify-between border-t border-[#86efac] pt-2 text-sm font-bold text-[#14532d]"><span>Grand Total</span><span>{formatCurrency(computed.grandTotal, currency)}</span></p>
    </div>

    <InvoiceAdditionalDetails data={data} dividerClassName="border-slate-200" labelClassName="text-[#16a34a]" bodyClassName="text-slate-700" />
  </div>
);

const CompactReceiptTemplate = ({ data, computed, currency, logoUrl }: InvoiceTemplateProps) => (
  <div className="mx-auto min-h-[960px] w-full max-w-[430px] bg-white px-6 py-6 font-mono text-[11px] text-slate-700">
    <div className="text-center">
      <div className="mx-auto flex justify-center">
        <InvoiceLogo logoUrl={logoUrl} className="max-h-[44px] max-w-[70px]" />
      </div>
      <p className="mt-2 text-lg font-bold uppercase tracking-[0.08em]">{data.from.name || 'Your Company'}</p>
      <p>{data.from.email || 'your@email.com'}</p>
      <p className="whitespace-pre-line">{data.from.address || '-'}</p>
      <p className="mt-2 border-y border-dashed border-slate-300 py-2 text-xs">Invoice {data.invoiceNumber}</p>
    </div>

    <div className="mt-3 space-y-1">
      <p>Date: {formatDate(data.issueDate)}</p>
      <p>Due: {formatDate(data.dueDate)}</p>
      <p>Client: {data.to.name || '-'}</p>
    </div>

    <table className="mt-4 w-full border-collapse text-left">
      <thead className="border-y border-dashed border-slate-300 text-[10px] uppercase">
        <tr>
          <th className="py-1">Item</th>
          <th className="py-1 text-right">Qty</th>
          <th className="py-1 text-right">Amt</th>
        </tr>
      </thead>
      <tbody>
        {data.items.map((item, index) => (
          <tr key={item.id} className="border-b border-dashed border-slate-200">
            <td className="py-1.5">{item.description || '-'}</td>
            <td className="py-1.5 text-right">{item.quantity || '0'}</td>
            <td className="py-1.5 text-right">{formatCurrency(computed.lineTotals[index] ?? 0, currency)}</td>
          </tr>
        ))}
      </tbody>
    </table>

    <div className="mt-4 space-y-1 border-y border-dashed border-slate-300 py-2">
      <p className="flex items-center justify-between"><span>Subtotal</span><span>{formatCurrency(computed.subtotal, currency)}</span></p>
      {computed.discountAmount > 0 ? (
        <p className="flex items-center justify-between"><span>Discount</span><span>- {formatCurrency(computed.discountAmount, currency)}</span></p>
      ) : null}
      <p className="flex items-center justify-between"><span>Tax</span><span>{formatCurrency(computed.taxAmount, currency)}</span></p>
      <p className="flex items-center justify-between"><span>Shipping</span><span>{formatCurrency(computed.shippingAmount, currency)}</span></p>
      <p className="flex items-center justify-between text-base font-bold"><span>TOTAL</span><span>{formatCurrency(computed.grandTotal, currency)}</span></p>
    </div>

    <InvoiceAdditionalDetails data={data} dividerClassName="border-dashed border-slate-300" labelClassName="text-slate-700" bodyClassName="text-slate-600" />
  </div>
);

const CreativeBoldBrandingTemplate = ({ data, computed, currency, logoUrl }: InvoiceTemplateProps) => (
  <div className="min-h-[960px] bg-[#070d1f] bg-[radial-gradient(circle_at_12%_12%,#1d4ed8_0%,transparent_40%),radial-gradient(circle_at_85%_0%,#e11d48_0%,transparent_36%)] p-8 text-[13px] text-slate-100">
    <div className="rounded-2xl border border-white/20 bg-black/35 p-6 backdrop-blur-[2px]">
      <div className="flex items-start justify-between">
        <div>
          <InvoiceLogo
            logoUrl={logoUrl}
            className="rounded-md bg-white/90 p-1.5"
          />
          <p className="mt-3 text-3xl font-extrabold uppercase tracking-tight text-white">{data.from.name || 'Your Company'}</p>
          <p className="mt-1 whitespace-pre-line text-slate-300">{data.from.address || 'Your address'}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Invoice</p>
          <p className="mt-1 text-4xl font-black text-white">{data.invoiceNumber}</p>
          <p className="mt-2 text-xs text-slate-300">Issue {formatDate(data.issueDate)}</p>
          <p className="text-xs text-slate-300">Due {formatDate(data.dueDate)}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-cyan-400/30 bg-cyan-300/10 p-4">
          <p className="text-xs uppercase tracking-wide text-cyan-200">Bill To</p>
          <p className="mt-2 text-base font-semibold text-white">{data.to.name || '-'}</p>
          <p className="whitespace-pre-line text-slate-200">{data.to.address || '-'}</p>
          <p className="text-slate-200">{data.to.email || '-'}</p>
        </div>
        <div className="rounded-xl border border-pink-400/30 bg-pink-300/10 p-4">
          <p className="text-xs uppercase tracking-wide text-pink-200">Contact</p>
          <p className="mt-2 text-base font-semibold text-white">{data.from.email || '-'}</p>
          {data.paymentTerms.trim() ? <p className="text-slate-200">{data.paymentTerms}</p> : null}
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-white/15">
        <table className="w-full border-collapse text-left">
          <thead className="bg-gradient-to-r from-[#2563eb] to-[#db2777] text-xs uppercase tracking-[0.13em] text-white">
            <tr>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3 text-right">Qty</th>
              <th className="px-4 py-3 text-right">Rate</th>
              <th className="px-4 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, index) => (
              <tr key={item.id} className="border-t border-white/10 bg-white/[0.04]">
                <td className="px-4 py-3 text-white">{item.description || '-'}</td>
                <td className="px-4 py-3 text-right text-slate-200">{item.quantity || '0'}</td>
                <td className="px-4 py-3 text-right text-slate-200">{formatCurrency(Number(item.unitPrice) || 0, currency)}</td>
                <td className="px-4 py-3 text-right font-semibold text-cyan-200">{formatCurrency(computed.lineTotals[index] ?? 0, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 ml-auto w-full max-w-xs rounded-xl bg-white/10 p-4">
        <p className="flex items-center justify-between text-sm"><span>Subtotal</span><span>{formatCurrency(computed.subtotal, currency)}</span></p>
        {computed.discountAmount > 0 ? (
          <p className="mt-1 flex items-center justify-between text-sm"><span>Discount</span><span>- {formatCurrency(computed.discountAmount, currency)}</span></p>
        ) : null}
        <p className="mt-1 flex items-center justify-between text-sm"><span>Tax</span><span>{formatCurrency(computed.taxAmount, currency)}</span></p>
        <p className="mt-1 flex items-center justify-between text-sm"><span>Shipping</span><span>{formatCurrency(computed.shippingAmount, currency)}</span></p>
        <p className="mt-3 flex items-center justify-between rounded-lg bg-gradient-to-r from-[#06b6d4] to-[#f43f5e] px-3 py-2 text-sm font-extrabold text-white"><span>Total</span><span>{formatCurrency(computed.grandTotal, currency)}</span></p>
      </div>
    </div>

    <InvoiceAdditionalDetails data={data} dividerClassName="border-white/20" labelClassName="text-cyan-200" bodyClassName="text-slate-200" />
  </div>
);

const ServiceHoursTemplate = ({ data, computed, currency, logoUrl }: InvoiceTemplateProps) => (
  <div className="min-h-[960px] bg-white px-8 py-8 text-[13px] text-slate-700">
    <div className="flex items-start justify-between border-b border-[#2563eb] pb-5">
      <div className="flex items-start gap-3">
        <InvoiceLogo logoUrl={logoUrl} />
        <div>
          <p className="text-2xl font-bold text-slate-900">{data.from.name || 'Your Company'}</p>
          <p className="text-sm text-slate-500">{data.from.email || 'your@email.com'}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-3xl font-extrabold text-[#1d4ed8]">SERVICE INVOICE</p>
        <p className="text-sm font-semibold text-slate-700">{data.invoiceNumber}</p>
      </div>
    </div>

    <div className="mt-5 grid grid-cols-2 gap-8 text-sm">
      <div>
        <p className="text-xs uppercase tracking-[0.12em] text-[#2563eb]">Client</p>
        <p className="mt-1 font-semibold text-slate-900">{data.to.name || '-'}</p>
        <p className="whitespace-pre-line">{data.to.address || '-'}</p>
        <p>{data.to.email || '-'}</p>
      </div>
      <div className="text-right">
        <p>Invoice Date: <span className="font-semibold">{formatDate(data.issueDate)}</span></p>
        <p>Due Date: <span className="font-semibold">{formatDate(data.dueDate)}</span></p>
      </div>
    </div>

    <div className="mt-6 overflow-hidden border border-slate-200">
      <table className="w-full border-collapse text-left">
        <thead className="bg-[#eff6ff] text-xs font-semibold uppercase tracking-wide text-[#1e3a8a]">
          <tr>
            <th className="px-3 py-2.5">Date</th>
            <th className="px-3 py-2.5">Description</th>
            <th className="px-3 py-2.5 text-right">Hours</th>
            <th className="px-3 py-2.5 text-right">Rate</th>
            <th className="px-3 py-2.5 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item, index) => (
            <tr key={item.id} className="border-t border-slate-200">
              <td className="px-3 py-2.5">{formatDate(data.issueDate)}</td>
              <td className="px-3 py-2.5">{item.description || '-'}</td>
              <td className="px-3 py-2.5 text-right">{item.quantity || '0'}</td>
              <td className="px-3 py-2.5 text-right">{formatCurrency(Number(item.unitPrice) || 0, currency)}</td>
              <td className="px-3 py-2.5 text-right font-semibold">{formatCurrency(computed.lineTotals[index] ?? 0, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <div className="mt-6 ml-auto w-full max-w-sm space-y-2 rounded-lg border border-[#bfdbfe] p-4">
      <p className="flex items-center justify-between"><span>Service Subtotal</span><span>{formatCurrency(computed.subtotal, currency)}</span></p>
      {computed.discountAmount > 0 ? (
        <p className="flex items-center justify-between"><span>Discount</span><span>- {formatCurrency(computed.discountAmount, currency)}</span></p>
      ) : null}
      <p className="flex items-center justify-between"><span>Tax ({Number(data.taxPercent) || 0}%)</span><span>{formatCurrency(computed.taxAmount, currency)}</span></p>
      <p className="flex items-center justify-between"><span>Expenses / Shipping</span><span>{formatCurrency(computed.shippingAmount, currency)}</span></p>
      <p className="flex items-center justify-between rounded bg-[#2563eb] px-3 py-2 font-bold text-white"><span>Total Fee</span><span>{formatCurrency(computed.grandTotal, currency)}</span></p>
    </div>

    <InvoiceAdditionalDetails data={data} dividerClassName="border-slate-200" labelClassName="text-[#2563eb]" bodyClassName="text-slate-700" />
  </div>
);

const InternationalTaxTemplate = ({ data, computed, currency, logoUrl }: InvoiceTemplateProps) => (
  <div className="min-h-[960px] bg-white px-8 py-8 text-[12px] text-slate-700">
    <div className="flex items-start justify-between border-b-2 border-[#7c3aed] pb-5">
      <div className="flex items-start gap-3">
        <InvoiceLogo logoUrl={logoUrl} />
        <div>
          <p className="text-2xl font-bold text-slate-900">{data.from.name || 'Your Company'}</p>
          <p className="text-xs text-slate-500">{data.from.address || 'Your business address'}</p>
          <p className="text-xs text-slate-500">{data.from.email || 'your@email.com'}</p>
          <p className="mt-1 text-xs"><span className="font-semibold text-[#7c3aed]">Tax ID:</span> TAX-{(data.invoiceNumber || '000').replace('INV-', '')}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-3xl font-extrabold text-[#5b21b6]">INVOICE</p>
        <p className="text-sm font-semibold text-[#7c3aed]">{data.invoiceNumber}</p>
      </div>
    </div>

    <div className="mt-5 grid grid-cols-2 gap-6">
      <div className="rounded border border-slate-200 p-3">
        <p className="text-xs uppercase tracking-[0.12em] text-[#7c3aed]">Bill To</p>
        <p className="mt-1 font-semibold text-slate-900">{data.to.name || '-'}</p>
        <p className="whitespace-pre-line">{data.to.address || '-'}</p>
        <p>{data.to.email || '-'}</p>
      </div>
      <div className="rounded border border-slate-200 p-3 text-right text-xs">
        <p>Invoice Date: <span className="font-semibold">{formatDate(data.issueDate)}</span></p>
        <p>Due Date: <span className="font-semibold">{formatDate(data.dueDate)}</span></p>
        <p>Currency: <span className="font-semibold">{currency}</span></p>
        <p>VAT Rate: <span className="font-semibold">{Number(data.taxPercent) || 0}%</span></p>
      </div>
    </div>

    <div className="mt-6 overflow-hidden border border-slate-200">
      <table className="w-full border-collapse text-left">
        <thead className="bg-[#f3e8ff] text-xs uppercase tracking-wide text-[#5b21b6]">
          <tr>
            <th className="px-3 py-2.5">Description</th>
            <th className="px-3 py-2.5 text-right">Qty</th>
            <th className="px-3 py-2.5 text-right">Unit ({currency})</th>
            <th className="px-3 py-2.5 text-right">Amount ({currency})</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item, index) => (
            <tr key={item.id} className="border-t border-slate-200">
              <td className="px-3 py-2.5">{item.description || '-'}</td>
              <td className="px-3 py-2.5 text-right">{item.quantity || '0'}</td>
              <td className="px-3 py-2.5 text-right">{formatCurrency(Number(item.unitPrice) || 0, currency)}</td>
              <td className="px-3 py-2.5 text-right font-semibold">{formatCurrency(computed.lineTotals[index] ?? 0, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <div className="mt-6 ml-auto w-full max-w-[360px] space-y-1.5 rounded border border-[#d8b4fe] bg-[#faf5ff] p-3 text-xs">
      <p className="flex items-center justify-between"><span>Subtotal ({currency})</span><span>{formatCurrency(computed.subtotal, currency)}</span></p>
      {computed.discountAmount > 0 ? (
        <p className="flex items-center justify-between"><span>Discount ({currency})</span><span>- {formatCurrency(computed.discountAmount, currency)}</span></p>
      ) : null}
      <p className="flex items-center justify-between"><span>VAT ({Number(data.taxPercent) || 0}%)</span><span>{formatCurrency(computed.taxAmount, currency)}</span></p>
      <p className="flex items-center justify-between"><span>Shipping ({currency})</span><span>{formatCurrency(computed.shippingAmount, currency)}</span></p>
      <p className="flex items-center justify-between border-t border-[#d8b4fe] pt-2 text-sm font-bold text-[#5b21b6]"><span>Total Payable ({currency})</span><span>{formatCurrency(computed.grandTotal, currency)}</span></p>
    </div>

    <InvoiceAdditionalDetails data={data} dividerClassName="border-slate-200" labelClassName="text-[#7c3aed]" bodyClassName="text-slate-700" />
  </div>
);

type TemplateThumbnailProps = {
  template: TemplateId;
  compact?: boolean;
};

const TemplateThumbnail = ({ template, compact = false }: TemplateThumbnailProps) => {
  const baseClass = compact ? 'h-[70px]' : 'h-16';
  if (template === 'minimal') {
    return (
      <div className={`${baseClass} rounded-md border border-slate-200 bg-white p-2`}>
        <div className="flex items-center justify-between">
          <div className="h-1.5 w-10 bg-slate-900" />
          <div className="h-1.5 w-8 bg-slate-300" />
        </div>
        <div className="mt-2 h-px bg-slate-200" />
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <div className="h-5 border border-slate-200" />
          <div className="h-5 border border-slate-200" />
        </div>
      </div>
    );
  }

  if (template === 'classic-professional') {
    return (
      <div className={`${baseClass} rounded-md border border-slate-200 bg-white p-2`}>
        <div className="h-1.5 rounded bg-[#1d4ed8]" />
        <div className="mt-1.5 flex justify-between">
          <div className="h-1.5 w-10 bg-slate-700" />
          <div className="h-1.5 w-10 bg-slate-300" />
        </div>
        <div className="mt-2 h-4 border border-[#bfdbfe] bg-[#dbeafe]" />
      </div>
    );
  }

  if (template === 'detailed-itemized') {
    return (
      <div className={`${baseClass} rounded-md border border-slate-200 bg-white p-2`}>
        <div className="h-1.5 rounded bg-[#16a34a]" />
        <div className="mt-2 grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }).map((_, index) => (
            <div key={index} className="h-4 border border-slate-200 bg-slate-50" />
          ))}
        </div>
      </div>
    );
  }

  if (template === 'compact-receipt') {
    return (
      <div className={`${baseClass} rounded-md border border-slate-200 bg-white px-3 py-2`}>
        <div className="mx-auto h-1.5 w-12 bg-slate-700" />
        <div className="mt-1 h-px w-full bg-slate-200" />
        <div className="mt-1 h-px w-full bg-slate-200" />
        <div className="mt-2 h-5 border border-dashed border-slate-300" />
      </div>
    );
  }

  if (template === 'creative-bold-branding') {
    return (
      <div className={`${baseClass} rounded-md border border-[#1e293b] bg-[#0f172a] p-2`}>
        <div className="h-1.5 rounded bg-gradient-to-r from-cyan-400 to-pink-500" />
        <div className="mt-2 grid grid-cols-2 gap-1">
          <div className="h-4 rounded border border-cyan-400/40 bg-cyan-500/20" />
          <div className="h-4 rounded border border-pink-400/40 bg-pink-500/20" />
        </div>
      </div>
    );
  }

  if (template === 'service-hours') {
    return (
      <div className={`${baseClass} rounded-md border border-slate-200 bg-white p-2`}>
        <div className="h-1.5 rounded bg-[#2563eb]" />
        <div className="mt-2 grid grid-cols-5 gap-1">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-4 border border-slate-200 bg-[#eff6ff]" />
          ))}
        </div>
      </div>
    );
  }

  if (template === 'international-tax') {
    return (
      <div className={`${baseClass} rounded-md border border-slate-200 bg-white p-2`}>
        <div className="flex items-center justify-between">
          <div className="h-1.5 w-10 bg-slate-700" />
          <div className="h-1.5 w-8 bg-[#7c3aed]" />
        </div>
        <div className="mt-2 h-4 rounded border border-[#d8b4fe] bg-[#f3e8ff]" />
        <div className="mt-2 h-1 rounded bg-[#7c3aed]/40" />
      </div>
    );
  }

  return (
    <div className={`${baseClass} rounded-md border border-slate-200 bg-white p-2`}>
      <div className="h-4 rounded bg-brand-600" />
      <div className="mt-2 h-2 w-12 rounded bg-brand-100" />
      <div className="mt-2 grid grid-cols-2 gap-1">
        <div className="h-4 rounded border border-slate-200" />
        <div className="h-4 rounded border border-slate-200" />
      </div>
    </div>
  );
};
export default InvoiceApp;
