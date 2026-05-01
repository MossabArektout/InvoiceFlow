'use client';

import { useEffect, useMemo, useState } from 'react';

type WaitlistSignup = {
  id: string;
  email: string;
  plan: string;
  created_at: string;
};

type WaitlistResponse = {
  data: WaitlistSignup[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

export default function AdminWaitlistPage() {
  const [rows, setRows] = useState<WaitlistSignup[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page), limit: String(limit) });
        const response = await fetch(`/api/admin/waitlist?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to load waitlist');
        const body = (await response.json()) as WaitlistResponse;
        setRows(body.data);
        setTotal(body.total);
        setTotalPages(body.totalPages);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [page]);

  const pageNumbers = useMemo(() => {
    const start = Math.max(page - 2, 1);
    const end = Math.min(start + 4, totalPages);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [page, totalPages]);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Waitlist</h1>
            <p className="text-sm text-slate-500">{total.toLocaleString()} total signups</p>
          </div>
          <a
            href="/api/admin/export/waitlist"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Export as CSV
          </a>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-[#F8F9FC]">
              <tr>
                {['Email', 'Plan interested in', 'Date joined'].map((label) => (
                  <th key={label} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-sm text-slate-500">
                    Loading waitlist...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-sm text-slate-500">
                    No waitlist signups yet.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="hover:bg-[#F8F9FC]">
                    <td className="px-4 py-3 text-sm text-slate-700">{row.email}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-800">{row.plan === 'pro' ? 'Pro' : 'Creator'}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{formatDate(row.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-4 py-3">
          <button
            type="button"
            onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
            disabled={page <= 1}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          {pageNumbers.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setPage(value)}
              className={`rounded-lg px-3 py-1.5 text-sm ${value === page ? 'bg-indigo-600 text-white' : 'border border-slate-200 text-slate-700'}`}
            >
              {value}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={page >= totalPages}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </section>
    </div>
  );
}
