'use client';

import { useEffect, useMemo, useState } from 'react';

type AdminInvoice = {
  id: string;
  clerk_id: string;
  invoice_number: string;
  to_name: string | null;
  total: number | null;
  status: string | null;
  currency: string | null;
  created_at: string;
  due_date: string | null;
  user_email: string;
};

type InvoicesResponse = {
  data: AdminInvoice[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

const formatDate = (value: string | null) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const isOverdueDate = (status: string | null, dueDate: string | null) => {
  if (!dueDate) return false;
  if ((status ?? '').toLowerCase() === 'paid') return false;
  return new Date(dueDate) < new Date();
};

const statusClass = (status: string | null) => {
  const key = (status ?? 'draft').toLowerCase();
  if (key === 'paid') return 'bg-emerald-100 text-emerald-700';
  if (key === 'sent') return 'bg-blue-100 text-blue-700';
  if (key === 'overdue') return 'bg-red-100 text-red-700';
  return 'bg-slate-100 text-slate-600';
};

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<AdminInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'draft' | 'sent' | 'paid' | 'overdue'>('all');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');
  const [page, setPage] = useState(1);

  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const limit = 20;

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search,
        status: status === 'all' ? '' : status,
        sort
      });

      const res = await fetch(`/api/admin/invoices?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load invoices');

      const body = (await res.json()) as InvoicesResponse;
      setInvoices(body.data);
      setTotal(body.total);
      setTotalPages(body.totalPages);
    } catch {
      setToast('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadInvoices();
  }, [page, search, status, sort]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const pageNumbers = useMemo(() => {
    const start = Math.max(page - 2, 1);
    const end = Math.min(start + 4, totalPages);
    return Array.from({ length: end - start + 1 }, (_, idx) => start + idx);
  }, [page, totalPages]);

  const startItem = total === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  return (
    <div className="space-y-4">
      {toast ? (
        <div className="toast-spring fixed right-4 top-20 z-50 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-lg">
          {toast}
        </div>
      ) : null}

      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">All Invoices</h1>
            <p className="text-sm text-slate-500">{total.toLocaleString()} total invoices</p>
          </div>

          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3 lg:max-w-4xl">
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search invoice or client"
              className="h-11"
            />
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as 'all' | 'draft' | 'sent' | 'paid' | 'overdue');
                setPage(1);
              }}
              className="h-11"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
            <select
              value={sort}
              onChange={(event) => {
                setSort(event.target.value as 'newest' | 'oldest' | 'highest' | 'lowest');
                setPage(1);
              }}
              className="h-11"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="highest">Highest</option>
              <option value="lowest">Lowest</option>
            </select>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-[#F8F9FC]">
              <tr>
                {['Invoice Number', 'Created By', 'Client Name', 'Amount', 'Status', 'Created Date', 'Due Date'].map((label) => (
                  <th key={label} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
                    Loading invoices...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
                    No invoices found.
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-[#F8F9FC]">
                    <td className="px-4 py-3 font-mono text-sm font-semibold text-indigo-700">{invoice.invoice_number}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{invoice.user_email}</td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">{invoice.to_name || '-'}</td>
                    <td className="px-4 py-3 text-sm font-bold text-slate-800">
                      {(Number(invoice.total ?? 0)).toLocaleString(undefined, {
                        style: 'currency',
                        currency: invoice.currency || 'USD'
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(invoice.status)}`}>
                        {(invoice.status ?? 'draft').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">{formatDate(invoice.created_at)}</td>
                    <td className={`px-4 py-3 text-sm ${isOverdueDate(invoice.status, invoice.due_date) ? 'font-semibold text-red-600' : 'text-slate-500'}`}>
                      {formatDate(invoice.due_date)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
          <p>
            Showing {startItem}-{endItem} of {total} invoices
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              disabled={page <= 1}
              className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>

            {pageNumbers.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setPage(value)}
                className={`rounded-lg px-3 py-1.5 ${value === page ? 'bg-indigo-600 text-white' : 'border border-slate-200 text-slate-700'}`}
              >
                {value}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={page >= totalPages}
              className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
