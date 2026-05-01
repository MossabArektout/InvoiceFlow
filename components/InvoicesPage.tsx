'use client';

import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { useMemo, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { type UserPlan, normalizePlan } from '@/lib/plans';
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

type SortKey = 'invoice_number' | 'client' | 'issue_date' | 'due_date' | 'total' | 'created_at';
type SortDirection = 'asc' | 'desc';

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

const STATUS_ORDER: InvoiceStatus[] = ['draft', 'sent', 'paid', 'overdue', 'cancelled'];
const STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  paid: 'Paid',
  overdue: 'Overdue',
  cancelled: 'Cancelled'
};

const STATUS_CLASSES: Record<InvoiceStatus, string> = {
  draft: 'bg-slate-100 text-slate-700',
  sent: 'bg-blue-50 text-blue-700',
  paid: 'bg-emerald-50 text-emerald-700',
  overdue: 'bg-red-50 text-red-700',
  cancelled: 'bg-slate-200 text-slate-700'
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
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
    <div className="w-full max-w-md rounded-2xl border bg-white p-5 shadow-2xl" style={{ borderColor: 'var(--color-border)' }}>
      <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${
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
  const [sortOption, setSortOption] = useState('newest');
  const [columnSort, setColumnSort] = useState<{ key: SortKey; dir: SortDirection }>({ key: 'created_at', dir: 'desc' });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmState, setConfirmState] = useState<
    | null
    | {
        type: 'deleteOne' | 'deleteSelected';
        id?: string;
      }
  >(null);
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  useEffect(() => {
    const userName = user?.fullName || user?.firstName || user?.primaryEmailAddress?.emailAddress || 'User';
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
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [invoiceRes, userRes] = await Promise.all([fetch('/api/invoices'), fetch('/api/user/me')]);
        if (userRes.ok) {
          const userBody = (await userRes.json()) as { name?: string; email?: string; plan?: string };
          if (userBody.name || userBody.email) {
            setDisplayName(userBody.name || userBody.email || 'User');
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
            clientName: row.to_name || 'Unnamed client',
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
        acc[invoice.status] += 1;
        if (invoice.status === 'paid') acc.paidAmount += invoice.total;
        if (invoice.status === 'sent') acc.outstandingAmount += invoice.total;
        if (invoice.status === 'overdue') acc.overdueAmount += invoice.total;
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
    let next = invoices;
    if (activeFilter !== 'all') {
      next = next.filter((invoice) => invoice.status === activeFilter);
    }
    const query = search.trim().toLowerCase();
    if (query) {
      next = next.filter((invoice) => invoice.clientName.toLowerCase().includes(query) || invoice.invoiceNumber.toLowerCase().includes(query));
    }

    const sorter = [...next];

    const applySort = (key: SortKey, dir: SortDirection) => {
      sorter.sort((a, b) => {
        const order = dir === 'asc' ? 1 : -1;
        if (key === 'invoice_number') return a.invoiceNumber.localeCompare(b.invoiceNumber) * order;
        if (key === 'client') return a.clientName.localeCompare(b.clientName) * order;
        if (key === 'issue_date') return (new Date(a.issueDate || 0).getTime() - new Date(b.issueDate || 0).getTime()) * order;
        if (key === 'due_date') return (new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime()) * order;
        if (key === 'total') return (a.total - b.total) * order;
        return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * order;
      });
    };

    if (sortOption === 'newest') applySort('created_at', 'desc');
    if (sortOption === 'oldest') applySort('created_at', 'asc');
    if (sortOption === 'highest') applySort('total', 'desc');
    if (sortOption === 'lowest') applySort('total', 'asc');

    applySort(columnSort.key, columnSort.dir);
    return sorter;
  }, [activeFilter, columnSort.dir, columnSort.key, invoices, search, sortOption]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const onDeleteOne = async (id: string) => {
    await fetch(`/api/invoices/${id}`, { method: 'DELETE' });
    setInvoices((prev) => prev.filter((invoice) => invoice.id !== id));
    setSelectedIds((prev) => prev.filter((item) => item !== id));
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
        clientName: row.to_name || 'Unnamed client',
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

  const onDeleteSelected = async () => {
    const ids = [...selectedIds];
    await Promise.all(ids.map((id) => fetch(`/api/invoices/${id}`, { method: 'DELETE' })));
    setInvoices((prev) => prev.filter((invoice) => !ids.includes(invoice.id)));
    setSelectedIds([]);
  };

  const onBulkMarkPaid = async () => {
    const ids = [...selectedIds];
    await Promise.all(ids.map((id) => fetch(`/api/invoices/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'paid' }) })));
    setInvoices((prev) => prev.map((invoice) => (ids.includes(invoice.id) ? { ...invoice, status: 'paid' } : invoice)));
    setSelectedIds([]);
  };

  const updateStatus = async (id: string, status: InvoiceStatus) => {
    await fetch(`/api/invoices/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    setInvoices((prev) => prev.map((invoice) => (invoice.id === id ? { ...invoice, status } : invoice)));
  };

  const toggleSort = (key: SortKey) => {
    setColumnSort((prev) => {
      if (prev.key !== key) return { key, dir: 'asc' };
      return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
    });
  };

  return (
    <div className="workspace-bg min-h-screen text-slate-900">
      <WorkspaceNavbar displayName={displayName} plan={plan} />
      <div className="md:pl-[var(--workspace-sidebar-width)]">
        <main className="mx-auto w-full max-w-[1700px] space-y-5 p-4 pb-24 md:p-6">
        <section className="app-card rounded-2xl p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900">My Invoices</h1>
              <p className="mt-1 text-sm text-slate-500">Manage and track all your invoices</p>
            </div>
            <Link href="/app" className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">
              + New Invoice
            </Link>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="app-card rounded-xl px-4 py-3 text-sm">Total: <span className="font-semibold">{counts.total} invoices</span></div>
          <div className="app-card rounded-xl px-4 py-3 text-sm text-emerald-700">Paid: <span className="font-semibold">{formatMoney(counts.paidAmount, 'USD')}</span></div>
          <div className="app-card rounded-xl px-4 py-3 text-sm text-amber-700">Outstanding: <span className="font-semibold">{formatMoney(counts.outstandingAmount, 'USD')}</span></div>
          <div className="app-card rounded-xl px-4 py-3 text-sm text-red-700">Overdue: <span className="font-semibold">{formatMoney(counts.overdueAmount, 'USD')}</span></div>
        </section>

        <section className="app-card space-y-4 rounded-2xl p-4">
          <div className="flex flex-wrap gap-2">
            {(['all', ...STATUS_ORDER] as FilterStatus[]).map((status) => {
              const count = status === 'all' ? counts.total : counts[status];
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => setActiveFilter(status)}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold ${
                    activeFilter === status ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  <span>{status === 'all' ? 'All' : STATUS_LABEL[status]}</span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs">{count}</span>
                </button>
              );
            })}
          </div>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by client name or invoice number"
              className="md:max-w-sm"
            />
            <select value={sortOption} onChange={(e) => setSortOption(e.target.value)} className="md:max-w-[220px]">
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="highest">Highest amount</option>
              <option value="lowest">Lowest amount</option>
            </select>
          </div>
        </section>

        <section className="app-card rounded-2xl p-3 md:p-4">
          {isLoading ? (
            <p className="px-3 py-8 text-sm text-slate-500">Loading invoices...</p>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
              <svg className="h-20 w-20 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 6a2 2 0 0 1 2-2h8l6 6v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6Z" />
                <path d="M14 4v6h6" />
                <path d="M8 13h8M8 17h5" />
              </svg>
              <p className="mt-4 text-xl font-bold text-slate-900">No invoices yet</p>
              <p className="mt-1 text-sm text-slate-500">Create your first invoice to get started</p>
              <Link href="/app" className="mt-4 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">Create Invoice</Link>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={filtered.length > 0 && filtered.every((invoice) => selectedIds.includes(invoice.id))}
                          onChange={(e) => setSelectedIds(e.target.checked ? filtered.map((invoice) => invoice.id) : [])}
                        />
                      </th>
                      <th className="cursor-pointer px-3 py-2" onClick={() => toggleSort('invoice_number')}>Invoice #</th>
                      <th className="cursor-pointer px-3 py-2" onClick={() => toggleSort('client')}>Client</th>
                      <th className="cursor-pointer px-3 py-2" onClick={() => toggleSort('issue_date')}>Issue Date</th>
                      <th className="cursor-pointer px-3 py-2" onClick={() => toggleSort('due_date')}>Due Date</th>
                      <th className="cursor-pointer px-3 py-2" onClick={() => toggleSort('total')}>Amount</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((invoice) => {
                      const isOverdue = invoice.status === 'overdue';
                      return (
                        <tr key={invoice.id} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                          <td className="px-3 py-2">
                            <input type="checkbox" checked={selectedIds.includes(invoice.id)} onChange={() => toggleSelect(invoice.id)} />
                          </td>
                          <td className="px-3 py-2 font-mono font-bold text-indigo-700">{invoice.invoiceNumber}</td>
                          <td className="px-3 py-2 text-slate-700">{invoice.clientName}</td>
                          <td className="px-3 py-2 text-slate-600">{formatDate(invoice.issueDate)}</td>
                          <td className={`px-3 py-2 ${isOverdue ? 'font-semibold text-red-600' : 'text-slate-600'}`}>{formatDate(invoice.dueDate)}</td>
                          <td className="px-3 py-2 font-semibold text-slate-900">{formatMoney(invoice.total, invoice.currency)}</td>
                          <td className="px-3 py-2">
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${STATUS_CLASSES[invoice.status]}`}>
                              {STATUS_LABEL[invoice.status]}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center justify-end gap-2">
                              <button type="button" onClick={() => router.push(`/app?invoiceId=${invoice.id}`)} className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700">
                                Open
                              </button>
                              <button
                                type="button"
                                onClick={() => void onDuplicate(invoice.id)}
                                disabled={duplicatingId === invoice.id}
                                className="rounded-md border border-indigo-200 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {duplicatingId === invoice.id ? 'Duplicating...' : 'Duplicate'}
                              </button>
                              <select
                                value={invoice.status}
                                onChange={(e) => void updateStatus(invoice.id, e.target.value as InvoiceStatus)}
                                className="h-9 w-[110px] rounded-md border border-slate-200 px-2 text-xs"
                              >
                                {STATUS_ORDER.map((status) => (
                                  <option key={status} value={status}>{STATUS_LABEL[status]}</option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => setConfirmState({ type: 'deleteOne', id: invoice.id })}
                                className="rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 md:hidden">
                {filtered.map((invoice) => (
                  <article
                    key={invoice.id}
                    className="relative overflow-hidden rounded-xl border border-slate-200 bg-white"
                    onTouchStart={(e) => setTouchStartX(e.touches[0]?.clientX ?? null)}
                    onTouchMove={(e) => {
                      if (touchStartX === null) return;
                      const delta = (e.touches[0]?.clientX ?? 0) - touchStartX;
                      if (delta < -42) setSwipedId(invoice.id);
                      if (delta > 22) setSwipedId(null);
                    }}
                    onTouchEnd={() => setTouchStartX(null)}
                  >
                    <button
                      type="button"
                      onClick={() => setConfirmState({ type: 'deleteOne', id: invoice.id })}
                      className={`absolute inset-y-0 right-0 w-[92px] bg-red-600 text-sm font-semibold text-white transition-transform ${
                        swipedId === invoice.id ? 'translate-x-0' : 'translate-x-full'
                      }`}
                    >
                      Delete
                    </button>
                    <div className={`space-y-2 p-4 transition-transform ${swipedId === invoice.id ? '-translate-x-[92px]' : 'translate-x-0'}`}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-mono text-sm font-bold text-indigo-700">{invoice.invoiceNumber}</p>
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_CLASSES[invoice.status]}`}>
                          {STATUS_LABEL[invoice.status]}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700">{invoice.clientName}</p>
                      <p className="text-sm font-bold text-slate-900">{formatMoney(invoice.total, invoice.currency)}</p>
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                        <p>Issue: {formatDate(invoice.issueDate)}</p>
                        <p className={invoice.status === 'overdue' ? 'text-red-600' : ''}>Due: {formatDate(invoice.dueDate)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => router.push(`/app?invoiceId=${invoice.id}`)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">
                          Open
                        </button>
                        <button
                          type="button"
                          onClick={() => void onDuplicate(invoice.id)}
                          disabled={duplicatingId === invoice.id}
                          className="w-full rounded-md border border-indigo-200 px-3 py-2 text-sm font-semibold text-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {duplicatingId === invoice.id ? 'Duplicating...' : 'Duplicate'}
                        </button>
                        <select
                          value={invoice.status}
                          onChange={(e) => void updateStatus(invoice.id, e.target.value as InvoiceStatus)}
                          className="h-10 w-full rounded-md border border-slate-200 px-2 text-sm"
                        >
                          {STATUS_ORDER.map((status) => (
                            <option key={status} value={status}>{STATUS_LABEL[status]}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
        </main>
      </div>

      {selectedIds.length > 0 ? (
        <div className="fixed inset-x-0 bottom-3 z-40 px-4">
          <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white px-4 py-3 shadow-2xl" style={{ borderColor: 'var(--color-border)' }}>
            <p className="text-sm font-semibold text-slate-700">{selectedIds.length} invoices selected</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => void onBulkMarkPaid()} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                Mark as Paid
              </button>
              <button type="button" onClick={() => setConfirmState({ type: 'deleteSelected' })} className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700">
                Delete Selected
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmState?.type === 'deleteOne' && confirmState.id ? (
        <ConfirmModal
          title="Delete invoice"
          description="This action cannot be undone."
          confirmLabel="Delete"
          onCancel={() => setConfirmState(null)}
          onConfirm={() => {
            void onDeleteOne(confirmState.id!);
            setConfirmState(null);
          }}
        />
      ) : null}

      {confirmState?.type === 'deleteSelected' ? (
        <ConfirmModal
          title="Delete selected invoices"
          description="This action cannot be undone."
          confirmLabel="Delete Selected"
          onCancel={() => setConfirmState(null)}
          onConfirm={() => {
            void onDeleteSelected();
            setConfirmState(null);
          }}
        />
      ) : null}
    </div>
  );
}
