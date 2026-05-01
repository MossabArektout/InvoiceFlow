'use client';

import { useEffect, useMemo, useState } from 'react';

type AdminUser = {
  id: string;
  clerk_id: string;
  name: string | null;
  email: string;
  plan: 'free' | 'creator' | 'pro';
  invoice_count: number;
  created_at: string;
};

type UsersResponse = {
  data: AdminUser[];
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

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [plan, setPlan] = useState<'all' | 'free' | 'creator' | 'pro'>('all');
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
  const [page, setPage] = useState(1);

  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [deletingUser, setDeletingUser] = useState<AdminUser | null>(null);
  const limit = 20;

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search,
        plan: plan === 'all' ? '' : plan,
        sort
      });

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load users');

      const body = (await res.json()) as UsersResponse;
      setUsers(body.data);
      setTotal(body.total);
      setTotalPages(body.totalPages);
    } catch {
      setToast('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, [page, search, plan, sort]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const updatePlan = async (user: AdminUser, nextPlan: 'free' | 'creator' | 'pro') => {
    const previousPlan = user.plan;

    setUsers((prev) => prev.map((row) => (row.id === user.id ? { ...row, plan: nextPlan } : row)));

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: nextPlan })
      });

      if (!res.ok) throw new Error('Failed to update plan');
      setToast(nextPlan === 'free' ? 'User downgraded successfully' : 'User upgraded successfully');
    } catch {
      setUsers((prev) => prev.map((row) => (row.id === user.id ? { ...row, plan: previousPlan } : row)));
      setToast('Failed to update plan');
    }
  };

  const confirmDelete = async () => {
    if (!deletingUser) return;
    const id = deletingUser.id;

    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('Failed to delete user');

      setUsers((prev) => prev.filter((user) => user.id !== id));
      setTotal((prev) => Math.max(prev - 1, 0));
      setToast('User deleted successfully');
      setDeletingUser(null);
    } catch {
      setToast('Failed to delete user');
    }
  };

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

      {deletingUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <p className="text-lg font-semibold text-slate-900">Delete {deletingUser.name || deletingUser.email}?</p>
            <p className="mt-2 text-sm text-slate-600">
              This will permanently delete their account, all invoices, and all clients. This cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Users</h1>
            <p className="text-sm text-slate-500">{total.toLocaleString()} total users</p>
          </div>

          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3 lg:max-w-3xl">
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search name or email"
              className="h-11"
            />
            <select
              value={plan}
              onChange={(event) => {
                setPlan(event.target.value as 'all' | 'free' | 'creator' | 'pro');
                setPage(1);
              }}
              className="h-11"
            >
              <option value="all">All Plans</option>
              <option value="free">Free</option>
              <option value="creator">Creator</option>
              <option value="pro">Pro</option>
            </select>
            <select
              value={sort}
              onChange={(event) => {
                setSort(event.target.value as 'newest' | 'oldest');
                setPage(1);
              }}
              className="h-11"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
            </select>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-[#F8F9FC]">
              <tr>
                {['Avatar', 'Name', 'Plan', 'Invoice Count', 'Joined Date', 'Actions'].map((label) => (
                  <th key={label} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const initials = (user.name || user.email || 'U')
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((chunk) => chunk[0]?.toUpperCase() ?? '')
                    .join('');

                  return (
                    <tr key={user.id} className="hover:bg-[#F8F9FC]">
                      <td className="px-4 py-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">{initials}</div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-slate-800">{user.name || 'Unnamed user'}</p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                            user.plan === 'pro'
                              ? 'bg-purple-100 text-purple-700'
                              : user.plan === 'creator'
                                ? 'bg-indigo-100 text-indigo-700'
                                : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {user.plan === 'pro' ? '👑 Pro' : user.plan === 'creator' ? 'Creator' : 'Free'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-700">{user.invoice_count}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{formatDate(user.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {user.plan === 'free' ? (
                            <button
                              type="button"
                              onClick={() => void updatePlan(user, 'creator')}
                              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                            >
                              Upgrade
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void updatePlan(user, 'free')}
                              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              Downgrade
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setDeletingUser(user)}
                            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
          <p>
            Showing {startItem}-{endItem} of {total} users
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
