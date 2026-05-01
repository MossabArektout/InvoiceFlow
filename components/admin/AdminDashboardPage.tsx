'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';

const ResponsiveContainer = dynamic(() => import('recharts').then((mod) => mod.ResponsiveContainer), { ssr: false });
const LineChart = dynamic(() => import('recharts').then((mod) => mod.LineChart), { ssr: false });
const Line = dynamic(() => import('recharts').then((mod) => mod.Line), { ssr: false });
const Area = dynamic(() => import('recharts').then((mod) => mod.Area), { ssr: false });
const XAxis = dynamic(() => import('recharts').then((mod) => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then((mod) => mod.YAxis), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then((mod) => mod.Tooltip), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then((mod) => mod.CartesianGrid), { ssr: false });
const PieChart = dynamic(() => import('recharts').then((mod) => mod.PieChart), { ssr: false });
const Pie = dynamic(() => import('recharts').then((mod) => mod.Pie), { ssr: false });
const Cell = dynamic(() => import('recharts').then((mod) => mod.Cell), { ssr: false });

type StatResponse = {
  users: {
    total: number;
    pro: number;
    creator: number;
    free: number;
    newThisMonth: number;
    newThisWeek: number;
  };
  invoices: {
    total: number;
    thisMonth: number;
    paid: number;
    overdue: number;
  };
  revenue: {
    total: number;
    thisMonth: number;
  };
  waitlist: {
    total: number;
    creator: number;
    pro: number;
  };
  growth: Array<{ date: string; newUsers: number }>;
  recentSignups: Array<{
    id: string;
    name: string | null;
    email: string;
    plan: 'free' | 'creator' | 'pro';
    created_at: string;
  }>;
};

const AnimatedNumber = ({ value, prefix = '' }: { value: number; prefix?: string }) => {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const duration = 650;
    const start = performance.now();
    let raf = 0;

    const tick = (time: number) => {
      const progress = Math.min((time - start) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      setDisplay(value * eased);
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return (
    <span>
      {prefix}
      {Math.round(display).toLocaleString()}
    </span>
  );
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<StatResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const conversion = useMemo(() => {
    if (!stats || stats.users.total === 0) return 0;
    return Math.round(((stats.users.creator + stats.users.pro) / stats.users.total) * 100);
  }, [stats]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/stats');
        if (!res.ok) throw new Error('Failed to load admin stats');
        setStats((await res.json()) as StatResponse);
      } catch {
        setToast('Failed to load admin stats');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const updatePlan = async (id: string, plan: 'free' | 'creator' | 'pro') => {
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan })
      });
      if (!res.ok) throw new Error('failed');

      const statsRes = await fetch('/api/admin/stats');
      if (statsRes.ok) {
        setStats((await statsRes.json()) as StatResponse);
      }

      setToast(plan === 'free' ? 'User downgraded' : 'User upgraded');
    } catch {
      setToast('Failed to update user plan');
    }
  };

  if (loading) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Loading admin dashboard...</div>;
  }

  if (!stats) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-red-600">Could not load admin data.</div>;
  }

  return (
    <div className="space-y-6">
      {toast ? (
        <div className="toast-spring fixed right-4 top-20 z-50 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-lg">
          {toast}
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="rounded-2xl border border-gray-100 border-l-4 border-l-indigo-500 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total Users</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            <AnimatedNumber value={stats.users.total} />
          </p>
          <p className="mt-1 text-xs text-slate-500">+{stats.users.newThisWeek} this week</p>
        </div>

        <div className="rounded-2xl border border-gray-100 border-l-4 border-l-yellow-500 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Paid Users</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            <AnimatedNumber value={stats.users.creator + stats.users.pro} />
          </p>
          <p className="mt-1 text-xs text-slate-500">{conversion}% conversion rate</p>
        </div>

        <div className="rounded-2xl border border-gray-100 border-l-4 border-l-blue-500 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total Invoices</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            <AnimatedNumber value={stats.invoices.total} />
          </p>
          <p className="mt-1 text-xs text-slate-500">{stats.invoices.thisMonth} this month</p>
        </div>

        <div className="rounded-2xl border border-gray-100 border-l-4 border-l-green-500 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Revenue</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            <AnimatedNumber value={stats.revenue.total} prefix="$" />
          </p>
          <p className="mt-1 text-xs text-slate-500">${stats.revenue.thisMonth} this month</p>
        </div>
        <div className="rounded-2xl border border-gray-100 border-l-4 border-l-indigo-500 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Waitlist</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            <AnimatedNumber value={stats.waitlist.total} />
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {stats.waitlist.creator} Creator, {stats.waitlist.pro} Pro
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm xl:col-span-3">
          <p className="mb-4 text-sm font-semibold text-slate-800">User Growth (Last 30 days)</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.growth}>
                <defs>
                  <linearGradient id="adminGrowth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={(value: string) => value.slice(5)} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area type="monotone" dataKey="newUsers" stroke="none" fill="url(#adminGrowth)" />
                <Line type="monotone" dataKey="newUsers" stroke="#4F46E5" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm xl:col-span-2">
          <p className="mb-4 text-sm font-semibold text-slate-800">Plan Distribution</p>
          <div className="relative h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Free', value: stats.users.free, color: '#CBD5E1' },
                    { name: 'Creator', value: stats.users.creator, color: '#818CF8' },
                    { name: 'Pro', value: stats.users.pro, color: '#4F46E5' }
                  ]}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={70}
                  outerRadius={100}
                  stroke="none"
                >
                  <Cell fill="#CBD5E1" />
                  <Cell fill="#818CF8" />
                  <Cell fill="#4F46E5" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-3xl font-bold text-slate-900">{stats.users.total}</p>
              <p className="text-xs uppercase tracking-wide text-slate-500">total users</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <p className="mb-4 text-sm font-semibold text-slate-800">Recent Signups</p>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-[#F8F9FC]">
              <tr>
                {['Avatar', 'Name', 'Email', 'Plan', 'Joined', 'Actions'].map((label) => (
                  <th key={label} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.recentSignups.map((user) => {
                const initials = (user.name || user.email || 'U')
                  .split(' ')
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((chunk) => chunk[0]?.toUpperCase() ?? '')
                  .join('');

                return (
                  <tr key={user.id} className="hover:bg-[#F8F9FC]">
                    <td className="px-3 py-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">{initials}</div>
                    </td>
                    <td className="px-3 py-3 text-sm font-medium text-slate-800">{user.name || 'Unnamed user'}</td>
                    <td className="px-3 py-3 text-sm text-slate-500">{user.email}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          user.plan === 'pro'
                            ? 'bg-purple-100 text-purple-700'
                            : user.plan === 'creator'
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {user.plan === 'pro' ? 'Pro' : user.plan === 'creator' ? 'Creator' : 'Free'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm text-slate-500">{formatDate(user.created_at)}</td>
                    <td className="px-3 py-3">
                      {user.plan === 'free' ? (
                        <button
                          type="button"
                          onClick={() => void updatePlan(user.id, 'creator')}
                          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                        >
                          Upgrade
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void updatePlan(user.id, 'free')}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Downgrade
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
