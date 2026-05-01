'use client';

import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import ComingSoonModal from './ComingSoonModal';
import { type UserPlan, normalizePlan } from '@/lib/plans';
import WorkspaceNavbar from './WorkspaceNavbar';

const ResponsiveContainer = dynamic(() => import('recharts').then((mod) => mod.ResponsiveContainer), { ssr: false });
const BarChart = dynamic(() => import('recharts').then((mod) => mod.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then((mod) => mod.Bar), { ssr: false });
const XAxis = dynamic(() => import('recharts').then((mod) => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then((mod) => mod.YAxis), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then((mod) => mod.Tooltip), { ssr: false });
const PieChart = dynamic(() => import('recharts').then((mod) => mod.PieChart), { ssr: false });
const Pie = dynamic(() => import('recharts').then((mod) => mod.Pie), { ssr: false });
const Cell = dynamic(() => import('recharts').then((mod) => mod.Cell), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then((mod) => mod.CartesianGrid), { ssr: false });

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

type DashboardStats = {
  revenue: {
    thisMonth: number;
    lastMonth: number;
    total: number;
    growth: number;
  };
  invoices: {
    total: number;
    draft: number;
    sent: number;
    paid: number;
    overdue: number;
    cancelled: number;
  };
  invoice_amounts: {
    draft: number;
    sent: number;
    paid: number;
    overdue: number;
    cancelled: number;
  };
  outstanding: number;
  overdue_amount: number;
  recent: ApiInvoice[];
};

type ChartPoint = {
  month: string;
  revenue: number;
  invoices: number;
};

type ApiUser = {
  name: string | null;
  plan: UserPlan;
};

type TopClient = {
  name: string;
  amount: number;
  count: number;
};

const CURRENCY_STORAGE_KEY = 'invoiceflow_currency';
const CURRENCY_LOCALE: Record<CurrencyCode, string> = {
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB',
  MAD: 'fr-MA',
  CAD: 'en-CA',
  AUD: 'en-AU',
  JPY: 'ja-JP',
  CHF: 'de-CH',
  INR: 'en-IN',
  AED: 'ar-AE',
  SAR: 'ar-SA',
  BRL: 'pt-BR',
  MXN: 'es-MX',
  NGN: 'en-NG',
  ZAR: 'en-ZA',
  SGD: 'en-SG'
};

const STATUS_STYLES = {
  draft: { label: 'Draft', bg: '#f3f4f6', text: '#6b7280', color: '#9ca3af' },
  sent: { label: 'Sent', bg: '#eff6ff', text: '#2563eb', color: '#3b82f6' },
  paid: { label: 'Paid', bg: '#f0fdf4', text: '#16a34a', color: '#22c55e' },
  overdue: { label: 'Overdue', bg: '#fef2f2', text: '#dc2626', color: '#ef4444' },
  cancelled: { label: 'Cancelled', bg: '#f8fafc', text: '#475569', color: '#64748b' }
} as const;

const formatDate = (value: string | null) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const getGreeting = (firstName: string) => {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  return `${greeting}, ${firstName} 👋`;
};

const AnimatedNumber = ({ value, formatter }: { value: number; formatter: (value: number) => string }) => {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const duration = 650;
    const start = performance.now();
    const from = 0;
    let raf = 0;
    const tick = (time: number) => {
      const progress = Math.min((time - start) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      setDisplay(from + (value - from) * eased);
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <>{formatter(display)}</>;
};

const Skeleton = ({ className }: { className: string }) => <div className={`animate-pulse rounded-xl bg-slate-200 ${className}`} />;

const RevenueTooltip = ({
  active,
  payload,
  label,
  formatMoney
}: {
  active?: boolean;
  payload?: Array<{ value?: number; payload?: ChartPoint }>;
  label?: string;
  formatMoney: (value: number) => string;
}) => {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0]?.payload;
  if (!point) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-slate-700">Month: {label}</p>
      <p className="text-slate-600">Revenue: {formatMoney(point.revenue)}</p>
      <p className="text-slate-500">Invoices: {point.invoices}</p>
    </div>
  );
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoaded, isSignedIn } = useUser();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [period, setPeriod] = useState<'6months' | '12months'>('6months');
  const [isLoading, setIsLoading] = useState(true);
  const [isChartLoading, setIsChartLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('USD');
  const [plan, setPlan] = useState<UserPlan>('free');
  const [isComingSoonOpen, setIsComingSoonOpen] = useState(false);
  const [fallbackName, setFallbackName] = useState('there');
  const [topClients, setTopClients] = useState<TopClient[]>([]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace('/sign-in');
    }
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    const stored = localStorage.getItem(CURRENCY_STORAGE_KEY) as CurrencyCode | null;
    if (stored && CURRENCY_LOCALE[stored]) {
      setSelectedCurrency(stored);
    }
  }, []);

  useEffect(() => {
    const loadStats = async () => {
      setIsLoading(true);
      try {
        const [statsRes, userRes, invoicesRes] = await Promise.all([
          fetch('/api/dashboard/stats'),
          fetch('/api/user/me'),
          fetch('/api/invoices')
        ]);
        if (statsRes.status === 401) {
          router.replace('/sign-in');
          return;
        }
        if (!statsRes.ok) throw new Error('Failed to load stats');
        const statsBody = (await statsRes.json()) as DashboardStats;
        setStats(statsBody);

        if (userRes.ok) {
          const userBody = (await userRes.json()) as ApiUser;
          setPlan(normalizePlan(userBody.plan));
          const first = userBody.name?.trim().split(' ')[0];
          if (first) setFallbackName(first);
        }
        if (invoicesRes.ok) {
          const invoiceRows = (await invoicesRes.json()) as ApiInvoice[];
          const grouped = invoiceRows.reduce<Record<string, { amount: number; count: number }>>((acc, row) => {
            const name = row.to_name?.trim() || 'Unnamed client';
            if (!acc[name]) {
              acc[name] = { amount: 0, count: 0 };
            }
            acc[name].amount += Number(row.total ?? 0);
            acc[name].count += 1;
            return acc;
          }, {});
          const ranked = Object.entries(grouped)
            .map(([name, value]) => ({ name, amount: value.amount, count: value.count }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5);
          setTopClients(ranked);
        }
      } catch {
        setToastMessage('Something went wrong. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    void loadStats();
  }, []);

  useEffect(() => {
    const loadChart = async () => {
      setIsChartLoading(true);
      try {
        const response = await fetch(`/api/dashboard/chart?period=${period}`);
        if (!response.ok) throw new Error('Failed to load chart');
        const body = (await response.json()) as ChartPoint[];
        setChartData(body);
      } catch {
        setChartData([]);
      } finally {
        setIsChartLoading(false);
      }
    };
    void loadChart();
  }, [period]);

  useEffect(() => {
    if (!toastMessage) return;
    const timeout = setTimeout(() => setToastMessage(null), 3000);
    return () => clearTimeout(timeout);
  }, [toastMessage]);

  const displayName = user?.fullName || user?.firstName || user?.primaryEmailAddress?.emailAddress || fallbackName;
  const firstName = displayName.split(' ')[0] || 'there';

  const formatMoney = (value: number) =>
    new Intl.NumberFormat(CURRENCY_LOCALE[selectedCurrency], {
      style: 'currency',
      currency: selectedCurrency
    }).format(value);

  const growthText = useMemo(() => {
    if (!stats) return null;
    const growth = stats.revenue.growth;
    if (growth > 0) {
      return <span className="text-xs font-semibold text-emerald-600">↗ {Math.round(growth)}% from last month</span>;
    }
    if (growth < 0) {
      return <span className="text-xs font-semibold text-red-600">↘ {Math.abs(Math.round(growth))}% from last month</span>;
    }
    return <span className="text-xs font-semibold text-slate-500">Same as last month</span>;
  }, [stats]);

  const donutData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: 'Draft', key: 'draft', value: stats.invoices.draft, amount: stats.invoice_amounts.draft, color: STATUS_STYLES.draft.color },
      { name: 'Sent', key: 'sent', value: stats.invoices.sent, amount: stats.invoice_amounts.sent, color: STATUS_STYLES.sent.color },
      { name: 'Paid', key: 'paid', value: stats.invoices.paid, amount: stats.invoice_amounts.paid, color: STATUS_STYLES.paid.color },
      { name: 'Overdue', key: 'overdue', value: stats.invoices.overdue, amount: stats.invoice_amounts.overdue, color: STATUS_STYLES.overdue.color },
      { name: 'Cancelled', key: 'cancelled', value: stats.invoices.cancelled, amount: stats.invoice_amounts.cancelled, color: STATUS_STYLES.cancelled.color }
    ];
  }, [stats]);

  const hasInvoices = (stats?.invoices.total ?? 0) > 0;
  const hasRevenueData = chartData.some((item) => item.revenue > 0);

  const exportAllInvoices = async () => {
    try {
      const response = await fetch('/api/invoices');
      if (!response.ok) throw new Error('Export failed');
      const invoices = (await response.json()) as ApiInvoice[];
      const header = ['Invoice #', 'Client Name', 'Client Email', 'Issue Date', 'Due Date', 'Total', 'Status', 'Currency', 'Template'];
      const rows = invoices.map((invoice) => [
        invoice.invoice_number ?? '',
        invoice.to_name ?? '',
        invoice.to_email ?? '',
        invoice.issue_date ?? '',
        invoice.due_date ?? '',
        String(Number(invoice.total ?? 0)),
        invoice.status ?? '',
        invoice.currency ?? '',
        invoice.template ?? ''
      ]);
      const escapeCell = (cell: string) => `"${cell.replaceAll('"', '""')}"`;
      const csv = [header, ...rows].map((row) => row.map(escapeCell).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'invoiceflow-export.csv';
      link.click();
      URL.revokeObjectURL(url);
      setToastMessage(`Exported ${invoices.length} invoices ✓`);
    } catch {
      setToastMessage('Something went wrong. Please try again.');
    }
  };

  return (
    <div className="workspace-bg min-h-screen text-slate-900">
      <WorkspaceNavbar displayName={displayName} plan={plan} />
      {toastMessage ? (
        <div className="toast-spring fixed right-4 top-20 z-50 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-lg">
          {toastMessage}
        </div>
      ) : null}
      <div className="md:pl-[var(--workspace-sidebar-width)]">
        <main className="mx-auto w-full max-w-[1700px] space-y-6 p-4 pb-24 md:p-5 lg:p-6 lg:pb-8">
        <section className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{getGreeting(firstName)}</h1>
            <p className="mt-1 text-sm text-slate-500">Here&apos;s what&apos;s happening with your business</p>
          </div>
          <Link href="/app" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
            New Invoice
          </Link>
        </section>

        <section className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md" style={{ borderLeft: '4px solid #16a34a' }}>
            {isLoading || !stats ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <>
                <p className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">💲</p>
                <p className="mt-3 text-xl font-extrabold text-slate-900 md:text-2xl">
                  <AnimatedNumber value={stats.revenue.total} formatter={formatMoney} />
                </p>
                <p className="text-sm font-semibold text-slate-700">Total Revenue</p>
                <p className="text-xs text-slate-500">All time</p>
              </>
            )}
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md" style={{ borderLeft: '4px solid #4f46e5' }}>
            {isLoading || !stats ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <>
                <p className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">📅</p>
                <p className="mt-3 text-xl font-extrabold text-slate-900 md:text-2xl">
                  <AnimatedNumber value={stats.revenue.thisMonth} formatter={formatMoney} />
                </p>
                <p className="text-sm font-semibold text-slate-700">This Month</p>
                {growthText}
              </>
            )}
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md" style={{ borderLeft: '4px solid #d97706' }}>
            {isLoading || !stats ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <>
                <p className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">🕒</p>
                <p className="mt-3 text-xl font-extrabold text-slate-900 md:text-2xl">
                  <AnimatedNumber value={stats.outstanding} formatter={formatMoney} />
                </p>
                <p className="text-sm font-semibold text-slate-700">Outstanding</p>
                <p className="text-xs text-slate-500">{stats.invoices.sent} invoices waiting</p>
              </>
            )}
          </article>

          <article
            className={`rounded-2xl border p-5 shadow-sm transition hover:shadow-md ${
              stats && stats.overdue_amount > 0 ? 'border-red-200 bg-red-50/50' : 'border-slate-200 bg-white'
            }`}
            style={{ borderLeft: '4px solid #dc2626' }}
          >
            {isLoading || !stats ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <>
                <p className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-700">⚠️</p>
                <p className="mt-3 text-xl font-extrabold text-slate-900 md:text-2xl">
                  <AnimatedNumber value={stats.overdue_amount} formatter={formatMoney} />
                </p>
                <p className="text-sm font-semibold text-slate-700">Overdue</p>
                {stats.invoices.overdue > 0 ? (
                  <p className="text-xs text-red-600">{stats.invoices.overdue} invoices overdue</p>
                ) : (
                  <p className="text-xs text-emerald-600">All caught up! ✓</p>
                )}
              </>
            )}
          </article>
        </section>

        {!isLoading && stats && !hasInvoices ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-xl font-bold text-slate-900">Welcome to your dashboard! 🎉</p>
            <p className="mt-2 text-slate-600">Create your first invoice to start seeing your business stats here.</p>
            <Link href="/app" className="mt-5 inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
              Create First Invoice
            </Link>
          </section>
        ) : (
          <section className="grid grid-cols-1 gap-4 xl:grid-cols-5">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-3">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <h2 className="text-lg font-bold text-slate-900">Revenue Overview</h2>
                <div className="inline-flex w-full rounded-full border border-slate-200 bg-slate-50 p-1 text-xs font-semibold md:w-auto">
                  <button
                    type="button"
                    onClick={() => setPeriod('6months')}
                    className={`w-1/2 rounded-full px-3 py-2 md:w-auto ${period === '6months' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}
                  >
                    6 months
                  </button>
                  <button
                    type="button"
                    onClick={() => setPeriod('12months')}
                    className={`w-1/2 rounded-full px-3 py-2 md:w-auto ${period === '12months' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}
                  >
                    12 months
                  </button>
                </div>
              </div>

              {isChartLoading ? (
                <Skeleton className="h-[220px] w-full md:h-[280px]" />
              ) : !hasRevenueData ? (
                <div className="flex h-[220px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center text-sm text-slate-500 md:h-[280px]">
                  No revenue data yet. Mark invoices as paid to see your stats.
                </div>
              ) : (
                <div className="h-[220px] md:h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <defs>
                        <linearGradient id="invoiceRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.45} />
                          <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.12} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" stroke="#64748b" />
                      <YAxis stroke="#64748b" tickFormatter={(value: number) => Math.round(value).toString()} />
                      <Tooltip content={<RevenueTooltip formatMoney={formatMoney} />} />
                      <Bar dataKey="revenue" fill="url(#invoiceRevenueGradient)" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
              <h2 className="text-lg font-bold text-slate-900">Invoice Status</h2>
              {isLoading || !stats ? (
                <Skeleton className="mt-4 h-[270px] w-full" />
              ) : stats.invoices.total === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  No invoices yet.
                </div>
              ) : (
                <>
                  <div className="relative mt-3 h-[190px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78}>
                          {donutData.map((entry) => (
                            <Cell key={entry.key} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '12px', borderColor: '#e2e8f0' }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <p className="text-xs text-slate-500">Total</p>
                      <p className="text-2xl font-bold text-slate-900">{stats.invoices.total}</p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {donutData.map((item) => (
                      <div key={item.key} className="rounded-lg border border-slate-200 p-2 text-sm">
                        <div className="inline-flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-slate-700">{item.name}</span>
                        </div>
                        <span className="mt-1 block text-slate-500">
                          {item.value} · {formatMoney(item.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </article>
          </section>
        )}

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-20">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-13">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-slate-900">Top Clients</h2>
              <Link href="/invoices" className="text-sm font-semibold text-indigo-700 hover:text-indigo-800">
                View Invoices
              </Link>
            </div>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((idx) => (
                  <Skeleton key={idx} className="h-12 w-full" />
                ))}
              </div>
            ) : topClients.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                No client data yet.
              </div>
            ) : (
              <div className="space-y-2">
                {topClients.map((client, index) => (
                  <button
                    key={client.name}
                    type="button"
                    onClick={() => router.push(`/invoices?search=${encodeURIComponent(client.name)}`)}
                    className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-indigo-300 hover:bg-indigo-50"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {index + 1}. {client.name}
                      </p>
                      <p className="text-xs text-slate-500">{client.count} invoice{client.count > 1 ? 's' : ''}</p>
                    </div>
                    <p className="text-sm font-bold text-indigo-700">{formatMoney(client.amount)}</p>
                  </button>
                ))}
              </div>
            )}
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-7">
            <h2 className="mb-4 text-lg font-bold text-slate-900">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-1">
              <button
                type="button"
                onClick={() => router.push('/app')}
                className="rounded-xl border border-slate-200 p-4 text-left transition hover:border-indigo-300 hover:bg-indigo-50"
              >
                <p className="text-sm font-bold text-indigo-700">＋ New Invoice</p>
                <p className="mt-1 text-xs text-slate-500">Create a new invoice</p>
              </button>
              <button
                type="button"
                onClick={() => router.push('/clients')}
                className="rounded-xl border border-slate-200 p-4 text-left transition hover:border-emerald-300 hover:bg-emerald-50"
              >
                <p className="text-sm font-bold text-emerald-700">👤 Add Client</p>
                <p className="mt-1 text-xs text-slate-500">Save a new client</p>
              </button>
              <button
                type="button"
                onClick={() => router.push('/invoices?status=overdue')}
                className="rounded-xl border border-slate-200 p-4 text-left transition hover:border-red-300 hover:bg-red-50"
              >
                <p className="text-sm font-bold text-red-700">⚠ View Overdue</p>
                <p className={`mt-1 text-xs ${(stats?.invoices.overdue ?? 0) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {(stats?.invoices.overdue ?? 0) > 0 ? `${stats?.invoices.overdue ?? 0} invoices need attention` : 'All invoices are up to date ✓'}
                </p>
              </button>
              {plan !== 'free' ? (
                <button
                  type="button"
                  onClick={() => void exportAllInvoices()}
                  className="rounded-xl border border-slate-200 p-4 text-left transition hover:border-indigo-300 hover:bg-indigo-50"
                >
                  <p className="text-sm font-bold text-indigo-700">⬇ Export All Invoices</p>
                  <p className="mt-1 text-xs text-slate-500">Download all as CSV</p>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsComingSoonOpen(true)}
                  className="rounded-xl border border-slate-200 p-4 text-left transition hover:border-amber-300 hover:bg-amber-50"
                >
                  <p className="text-sm font-bold text-amber-700">⚡ Upgrade to Creator</p>
                  <p className="mt-1 text-xs text-slate-500">Unlock all templates + no watermark</p>
                </button>
              )}
            </div>
          </article>
        </section>
        <ComingSoonModal isOpen={isComingSoonOpen} onClose={() => setIsComingSoonOpen(false)} plan="creator" defaultEmail={user?.primaryEmailAddress?.emailAddress} />
        </main>
      </div>
    </div>
  );
}
