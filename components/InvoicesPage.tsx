'use client';

import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { useMemo, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { type UserPlan, normalizePlan } from '@/lib/plans';
import { t } from '@/lib/i18n';
import WorkspaceNavbar from './WorkspaceNavbar';

type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
type FilterStatus = 'all' | InvoiceStatus;

type ApiInvoice = {
  id: string;
  invoice_number: string;
  to_name: string | null;
  to_email: string | null;
  issue_date: string | null;
  due_date: string | null;
  total: number | null;
  status: string | null;
  currency: string | null;
  template: string | null;
  created_at: string;
  updated_at: string;
};

type InvoiceRow = {
  id: string;
  invoiceNumber: string;
  clientName: string;
  issueDate: string | null;
  dueDate: string | null;
  total: number;
  status: InvoiceStatus;
  currency: string;
  createdAt: string;
};

type DateFilter = 'all' | 'upcoming' | 'past_due' | 'no_due_date';
type SortOption = 'newest' | 'oldest' | 'amount_high' | 'amount_low' | 'due_soon';

const STATUS_DOT_CLASSES: Record<InvoiceStatus, string> = {
  draft: 'bg-slate-400',
  sent: 'bg-blue-400',
  paid: 'bg-emerald-500',
  overdue: 'bg-rose-500',
  cancelled: 'bg-slate-400'
};

const STATUS_BADGE_CLASSES: Record<InvoiceStatus, string> = {
  draft: 'bg-slate-100 text-slate-600',
  sent: 'bg-blue-50 text-blue-700',
  paid: 'bg-emerald-50 text-emerald-700',
  overdue: 'bg-rose-50 text-rose-700',
  cancelled: 'bg-slate-100 text-slate-600'
};

const normalizeStatus = (value: string | null): InvoiceStatus => {
  if (value === 'sent' || value === 'paid' || value === 'overdue' || value === 'draft' || value === 'cancelled') return value;
  return 'draft';
};

const formatDate = (value: string | null) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatMoney = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
};

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return t('invoices.initialFallback');
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
};

const ConfirmModal = ({
  title,
  description,
  confirmLabel,
  confirmVariant = 'danger',
  onCancel,
  onConfirm
}: {
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant?: 'danger' | 'primary';
  onCancel: () => void;
  onConfirm: () => void;
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4">
    <div className="w-full max-w-md rounded-none border bg-white p-5 shadow-xl" style={{ borderColor: 'var(--color-border)' }}>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-none border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700">
          {t('common.cancel')}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={`rounded-none px-3 py-2 text-sm font-medium text-white ${
            confirmVariant === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
);

export default function InvoicesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const [displayName, setDisplayName] = useState('');
  const [plan, setPlan] = useState<UserPlan>('free');
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | InvoiceStatus>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [menuInvoiceId, setMenuInvoiceId] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{ type: 'deleteOne'; id: string } | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  useEffect(() => {
    const userName = user?.fullName || user?.firstName || user?.primaryEmailAddress?.emailAddress || t('invoices.userFallback');
    setDisplayName(userName);
  }, [user]);

  useEffect(() => {
    const initialFilter = searchParams.get('status');
    if (initialFilter === 'draft' || initialFilter === 'sent' || initialFilter === 'paid' || initialFilter === 'overdue' || initialFilter === 'cancelled') {
      setActiveFilter(initialFilter);
    }

    const initialSearch = searchParams.get('search');
    if (initialSearch) setSearch(initialSearch);
  }, [searchParams]);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-invoice-menu="true"]')) return;
      setMenuInvoiceId(null);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [invoiceRes, userRes] = await Promise.all([fetch('/api/invoices'), fetch('/api/user/me')]);
        if (userRes.ok) {
          const userBody = (await userRes.json()) as { name?: string; email?: string; plan?: string };
          if (userBody.name || userBody.email) {
            setDisplayName(userBody.name || userBody.email || t('invoices.userFallback'));
          }
          setPlan(normalizePlan(userBody.plan));
        }
        if (!invoiceRes.ok) {
          if (invoiceRes.status === 401) router.replace('/sign-in');
          return;
        }
        const body = (await invoiceRes.json()) as ApiInvoice[];
        setInvoices(
          body.map((row) => ({
            id: row.id,
            invoiceNumber: row.invoice_number,
            clientName: row.to_name || t('invoices.clientUnnamed'),
            issueDate: row.issue_date,
            dueDate: row.due_date,
            total: Number(row.total ?? 0),
            status: normalizeStatus(row.status),
            currency: row.currency || 'USD',
            createdAt: row.created_at
          }))
        );
      } finally {
        setIsLoading(false);
      }
    };
    void loadData();
  }, [router]);

  const counts = useMemo(() => {
    return invoices.reduce(
      (acc, invoice) => {
        acc.total += 1;
        if (invoice.status === 'draft') acc.draft += 1;
        if (invoice.status === 'sent') acc.sent += 1;
        if (invoice.status === 'paid') {
          acc.paid += 1;
          acc.paidAmount += invoice.total;
        }
        if (invoice.status === 'sent') acc.outstandingAmount += invoice.total;
        if (invoice.status === 'overdue') {
          acc.overdue += 1;
          acc.overdueAmount += invoice.total;
        }
        if (invoice.status === 'cancelled') acc.cancelled += 1;
        return acc;
      },
      {
        total: 0,
        draft: 0,
        sent: 0,
        paid: 0,
        overdue: 0,
        cancelled: 0,
        paidAmount: 0,
        outstandingAmount: 0,
        overdueAmount: 0
      }
    );
  }, [invoices]);

  const filtered = useMemo(() => {
    const now = Date.now();
    let next = [...invoices];

    if (activeFilter !== 'all') {
      next = next.filter((invoice) => invoice.status === activeFilter);
    }

    const query = search.trim().toLowerCase();
    if (query) {
      next = next.filter((invoice) => invoice.clientName.toLowerCase().includes(query) || invoice.invoiceNumber.toLowerCase().includes(query));
    }

    if (statusFilter !== 'all') {
      next = next.filter((invoice) => invoice.status === statusFilter);
    }

    if (dateFilter === 'upcoming') {
      next = next.filter((invoice) => (invoice.dueDate ? new Date(invoice.dueDate).getTime() >= now : false));
    }
    if (dateFilter === 'past_due') {
      next = next.filter((invoice) => (invoice.dueDate ? new Date(invoice.dueDate).getTime() < now : false));
    }
    if (dateFilter === 'no_due_date') {
      next = next.filter((invoice) => !invoice.dueDate);
    }

    next.sort((a, b) => {
      if (sortOption === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortOption === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortOption === 'amount_high') return b.total - a.total;
      if (sortOption === 'amount_low') return a.total - b.total;
      return new Date(a.dueDate || '2999-12-31').getTime() - new Date(b.dueDate || '2999-12-31').getTime();
    });

    return next;
  }, [activeFilter, dateFilter, invoices, search, sortOption, statusFilter]);

  const onDeleteOne = async (id: string) => {
    await fetch(`/api/invoices/${id}`, { method: 'DELETE' });
    setInvoices((prev) => prev.filter((invoice) => invoice.id !== id));
  };

  const onDuplicate = async (id: string) => {
    setDuplicatingId(id);
    try {
      const response = await fetch(`/api/invoices/${id}/duplicate`, { method: 'POST' });
      if (!response.ok) return;
      const row = (await response.json()) as ApiInvoice;
      const duplicated: InvoiceRow = {
        id: row.id,
        invoiceNumber: row.invoice_number,
        clientName: row.to_name || t('invoices.clientUnnamed'),
        issueDate: row.issue_date,
        dueDate: row.due_date,
        total: Number(row.total ?? 0),
        status: normalizeStatus(row.status),
        currency: row.currency || 'USD',
        createdAt: row.created_at
      };
      setInvoices((prev) => [duplicated, ...prev]);
    } finally {
      setDuplicatingId(null);
    }
  };

  const getStatusLabel = (status: InvoiceStatus) => t(`invoice.status.${status}`);

  const actionItems = (invoiceId: string) => [
    { label: t('invoices.actions.view'), onClick: () => router.push(`/app?invoiceId=${invoiceId}`) },
    { label: t('invoices.actions.edit'), onClick: () => router.push(`/app?invoiceId=${invoiceId}`) },
    { label: duplicatingId === invoiceId ? t('invoices.actions.duplicating') : t('invoices.actions.duplicate'), onClick: () => void onDuplicate(invoiceId), disabled: duplicatingId === invoiceId },
    { label: t('common.delete'), onClick: () => setConfirmState({ type: 'deleteOne', id: invoiceId }), destructive: true }
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <WorkspaceNavbar displayName={displayName} plan={plan} />
      <div className="md:pl-[var(--workspace-sidebar-width)]">
        <main className="mx-auto w-full max-w-[1600px] space-y-3 p-4 pb-24 md:p-8">
          <header className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{t('invoices.title')}</h1>
              <Link href="/app" className="inline-flex items-center rounded-none bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-700">
                {t('invoices.newInvoice')}
              </Link>
            </div>
            <p className="text-sm">
              <span className="font-medium text-slate-500">{t('invoices.stats.invoices', { count: counts.total })}</span>
              <span className="mx-3 text-slate-300">•</span>
              <span className="font-semibold text-emerald-600">{t('invoices.stats.paid', { amount: formatMoney(counts.paidAmount, 'USD') })}</span>
              <span className="mx-3 text-slate-300">•</span>
              <span className="font-semibold text-amber-600">{t('invoices.stats.outstanding', { amount: formatMoney(counts.outstandingAmount, 'USD') })}</span>
            </p>
          </header>

          <div className="mt-2 flex flex-wrap items-center gap-5 border-b border-slate-200 pb-3">
            {([
              ['all', t('invoices.tabs.all', { count: counts.total })],
              ['draft', t('invoices.tabs.draft', { count: counts.draft })],
              ['sent', t('invoices.tabs.sent', { count: counts.sent })],
              ['paid', t('invoices.tabs.paid', { count: counts.paid })],
              ['overdue', t('invoices.tabs.overdue', { count: counts.overdue })],
              ['cancelled', t('invoices.tabs.cancelled', { count: counts.cancelled })]
            ] as const).map(([status, label]) => (
              <button
                key={status}
                type="button"
                onClick={() => setActiveFilter(status)}
                className={`-mb-[13px] border-b-2 pb-3 text-sm font-medium ${
                  activeFilter === status ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="border-b border-slate-200 pb-4 pt-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <svg className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 3.473 9.765l3.63 3.63a.75.75 0 1 0 1.06-1.06l-3.63-3.63A5.5 5.5 0 0 0 9 3.5ZM5 9a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z" clipRule="evenodd" />
                </svg>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('invoices.searchPlaceholder')}
                  className="w-full rounded-none border border-slate-200 bg-white py-3 pl-12 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-300 focus:ring-0"
                />
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:w-[390px]">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | InvoiceStatus)}
                  className="!min-h-0 rounded-none border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-slate-300 focus:ring-0"
                >
                  <option value="all">{t('invoices.filters.statusAll')}</option>
                  <option value="draft">{getStatusLabel('draft')}</option>
                  <option value="sent">{getStatusLabel('sent')}</option>
                  <option value="paid">{getStatusLabel('paid')}</option>
                  <option value="overdue">{getStatusLabel('overdue')}</option>
                  <option value="cancelled">{getStatusLabel('cancelled')}</option>
                </select>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                  className="!min-h-0 rounded-none border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-slate-300 focus:ring-0"
                >
                  <option value="all">{t('invoices.filters.dateAll')}</option>
                  <option value="upcoming">{t('invoices.filters.dateUpcoming')}</option>
                  <option value="past_due">{t('invoices.filters.datePastDue')}</option>
                  <option value="no_due_date">{t('invoices.filters.dateNoDueDate')}</option>
                </select>
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as SortOption)}
                  className="!min-h-0 rounded-none border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-slate-300 focus:ring-0"
                >
                  <option value="newest">{t('invoices.filters.sortNewest')}</option>
                  <option value="oldest">{t('invoices.filters.sortOldest')}</option>
                  <option value="amount_high">{t('invoices.filters.sortAmountHigh')}</option>
                  <option value="amount_low">{t('invoices.filters.sortAmountLow')}</option>
                  <option value="due_soon">{t('invoices.filters.sortDueDate')}</option>
                </select>
              </div>
            </div>
          </div>

          {isLoading ? (
            <p className="py-10 text-sm text-slate-500">{t('invoices.loading')}</p>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-lg font-medium text-slate-900">{t('invoices.empty.title')}</p>
              <p className="mt-1 text-sm text-slate-500">{t('invoices.empty.description')}</p>
              <Link href="/app" className="mt-5 inline-flex items-center rounded-none bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-700">
                {t('invoices.newInvoice')}
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wide text-slate-500">
                    <th className="py-5 pr-4 font-semibold">{t('invoices.table.invoice')}</th>
                    <th className="py-5 pr-4 font-semibold">{t('invoices.table.client')}</th>
                    <th className="py-5 pr-4 font-semibold">{t('invoices.table.dueDate')}</th>
                    <th className="py-5 pr-4 font-semibold">{t('invoices.table.amount')}</th>
                    <th className="py-5 pr-4 font-semibold">{t('invoices.table.status')}</th>
                    <th className="py-5 pl-4 text-right font-semibold">{t('invoices.table.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((invoice, index) => (
                    <tr
                      key={invoice.id}
                      className="group cursor-pointer border-b border-slate-200 transition-colors duration-150 hover:bg-slate-50/60"
                      onClick={() => router.push(`/app?invoiceId=${invoice.id}`)}
                    >
                      <td className="py-7 pr-4">
                        <p className="font-mono text-base font-semibold text-indigo-600">{invoice.invoiceNumber}</p>
                        <p className="mt-1 font-mono text-[11px] font-semibold text-slate-600">#{String(filtered.length - index).padStart(4, '0')}</p>
                      </td>
                      <td className="py-7 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-semibold text-indigo-700">{getInitials(invoice.clientName)}</div>
                          <span className="text-xs text-slate-700">{invoice.clientName}</span>
                        </div>
                      </td>
                      <td className={`py-7 pr-4 text-xs ${invoice.status === 'overdue' ? 'text-rose-600' : 'text-slate-700'}`}>{formatDate(invoice.dueDate)}</td>
                      <td className="py-7 pr-4 text-base font-semibold text-slate-900">{formatMoney(invoice.total, invoice.currency)}</td>
                      <td className="py-7 pr-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-none px-2 py-1 text-[11px] font-semibold ${STATUS_BADGE_CLASSES[invoice.status]}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT_CLASSES[invoice.status]}`} aria-hidden="true" />
                          {getStatusLabel(invoice.status)}
                        </span>
                      </td>
                      <td className="py-7 pl-4 text-right">
                        <div className="relative inline-flex" data-invoice-menu="true">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuInvoiceId((prev) => (prev === invoice.id ? null : invoice.id));
                            }}
                            className="h-8 min-h-0 w-8 min-w-0 text-2xl leading-none text-slate-500 transition-colors hover:text-slate-700"
                            aria-label={t('invoices.actions.openMenuAria')}
                          >
                            ⋯
                          </button>
                          {menuInvoiceId === invoice.id ? (
                            <div className="absolute right-0 top-9 z-20 w-36 border border-slate-100 bg-white py-1">
                              {actionItems(invoice.id).map((item) => (
                                <button
                                  key={item.label}
                                  type="button"
                                  disabled={item.disabled}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMenuInvoiceId(null);
                                    item.onClick();
                                  }}
                                  className={`h-auto w-full min-h-0 min-w-0 px-3 py-2 text-left text-sm ${
                                    item.destructive ? 'text-rose-500 hover:bg-slate-50' : 'text-slate-500 hover:bg-slate-50'
                                  } disabled:cursor-not-allowed disabled:opacity-60`}
                                >
                                  {item.label}
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!isLoading && filtered.length > 0 ? (
            <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
              <p>{t('invoices.pagination.showing', { from: 1, to: filtered.length, total: filtered.length })}</p>
              <div className="flex items-center gap-3">
                <button type="button" className="h-9 min-h-0 w-9 min-w-0 rounded-none border border-slate-200 text-xl text-slate-400">
                  ‹
                </button>
                <button type="button" className="h-9 min-h-0 w-9 min-w-0 rounded-none border border-indigo-300 text-sm font-semibold text-indigo-600">
                  1
                </button>
                <button type="button" className="h-9 min-h-0 w-9 min-w-0 rounded-none border border-slate-200 text-xl text-slate-400">
                  ›
                </button>
              </div>
            </div>
          ) : null}
        </main>
      </div>

      {confirmState?.type === 'deleteOne' ? (
        <ConfirmModal
          title={t('invoices.modal.deleteTitle')}
          description={t('invoices.modal.deleteDescription')}
          confirmLabel={t('common.delete')}
          onCancel={() => setConfirmState(null)}
          onConfirm={() => {
            void onDeleteOne(confirmState.id);
            setConfirmState(null);
          }}
        />
      ) : null}
    </div>
  );
}
