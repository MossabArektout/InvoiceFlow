'use client';

import { useUser } from '@clerk/nextjs';
import { type Dispatch, type SetStateAction, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { type UserPlan, normalizePlan } from '@/lib/plans';
import { t } from '@/lib/i18n';
import WorkspaceNavbar from './WorkspaceNavbar';

type ClientRow = {
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

type ApiInvoice = {
  id: string;
  to_name: string | null;
  to_email: string | null;
  invoice_number: string | null;
  issue_date: string | null;
  total: number | null;
  status: string | null;
  currency: string | null;
  created_at: string;
};

type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

type SortOption = 'newest' | 'oldest' | 'name_asc' | 'name_desc';
type ModalMode = 'create' | 'edit' | 'view';

const emptyDraft = { name: '', email: '', address: '' };

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

const formatMoney = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
};

const normalizeStatus = (value: string | null): InvoiceStatus => {
  if (value === 'draft' || value === 'sent' || value === 'paid' || value === 'overdue' || value === 'cancelled') return value;
  return 'draft';
};

const normalizeIdentity = (value: string) => value.trim().toLowerCase();

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return t('clients.initialFallback');
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
};

const AddClientModal = ({
  mode,
  draft,
  setDraft,
  isSaving,
  error,
  onClose,
  onSave
}: {
  mode: ModalMode;
  draft: { name: string; email: string; address: string };
  setDraft: Dispatch<SetStateAction<{ name: string; email: string; address: string }>>;
  isSaving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: () => void;
}) => {
  const isReadOnly = mode === 'view';
  const title = mode === 'create' ? t('clients.modal.newTitle') : mode === 'edit' ? t('clients.modal.editTitle') : t('clients.modal.viewTitle');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4" onClick={onClose}>
      <div
        className="w-full max-w-xl rounded-none border border-slate-200 bg-white p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-none border border-slate-300 px-3 py-1.5 text-sm text-slate-600">
            {t('common.close')}
          </button>
        </div>

        <div className="mt-5 grid gap-3">
          <div>
            <label>{t('clients.modal.nameLabel')}</label>
            <input
              value={draft.name}
              onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
              placeholder={t('clients.modal.namePlaceholder')}
              readOnly={isReadOnly}
            />
          </div>
          <div>
            <label>{t('clients.modal.emailLabel')}</label>
            <input
              type="email"
              value={draft.email}
              onChange={(event) => setDraft((prev) => ({ ...prev, email: event.target.value }))}
              placeholder={t('clients.modal.emailPlaceholder')}
              readOnly={isReadOnly}
            />
          </div>
          <div>
            <label>{t('clients.modal.noteLabel')}</label>
            <textarea
              value={draft.address}
              onChange={(event) => setDraft((prev) => ({ ...prev, address: event.target.value }))}
              placeholder={t('clients.modal.notePlaceholder')}
              readOnly={isReadOnly}
              className="min-h-[110px] resize-y"
            />
          </div>
        </div>

        {error ? <p className="mt-3 text-sm font-semibold text-red-600">{error}</p> : null}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-none border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700">
            {t('common.cancel')}
          </button>
          {!isReadOnly ? (
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              className="rounded-none bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? t('clients.modal.saving') : mode === 'create' ? t('clients.modal.saveButton') : t('clients.modal.updateButton')}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default function ClientsPage() {
  const router = useRouter();
  const { user } = useUser();
  const [displayName, setDisplayName] = useState('');
  const [plan, setPlan] = useState<UserPlan>('free');
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [invoices, setInvoices] = useState<ApiInvoice[]>([]);
  const [search, setSearch] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [newClientDraft, setNewClientDraft] = useState(emptyDraft);
  const [isSavingClient, setIsSavingClient] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);
  const [menuClientId, setMenuClientId] = useState<string | null>(null);

  useEffect(() => {
    const userName = user?.fullName || user?.firstName || user?.primaryEmailAddress?.emailAddress || t('clients.userFallback');
    setDisplayName(userName);
  }, [user]);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-client-menu="true"]')) return;
      setMenuClientId(null);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [clientRes, invoiceRes, userRes] = await Promise.all([fetch('/api/clients'), fetch('/api/invoices'), fetch('/api/user/me')]);

      if (userRes.ok) {
        const userBody = (await userRes.json()) as { name?: string; email?: string; plan?: string };
        if (userBody.name || userBody.email) {
          setDisplayName(userBody.name || userBody.email || t('clients.userFallback'));
        }
        setPlan(normalizePlan(userBody.plan));
      }

      if (!clientRes.ok) return;
      const body = (await clientRes.json()) as ApiClient[];
      setClients(
        body.map((client) => ({
          id: client.id,
          name: client.name,
          email: client.email ?? '',
          address: client.address ?? '',
          createdAt: client.created_at
        }))
      );

      if (invoiceRes.ok) {
        const invoiceBody = (await invoiceRes.json()) as ApiInvoice[];
        setInvoices(invoiceBody);
      } else {
        setInvoices([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filteredClients = useMemo(() => {
    const query = search.trim().toLowerCase();
    let next = clients;

    if (query) {
      next = next.filter((client) => client.name.toLowerCase().includes(query) || client.email.toLowerCase().includes(query) || client.address.toLowerCase().includes(query));
    }

    const sorted = [...next];
    sorted.sort((a, b) => {
      if (sortOption === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortOption === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortOption === 'name_asc') return a.name.localeCompare(b.name);
      return b.name.localeCompare(a.name);
    });

    return sorted;
  }, [clients, search, sortOption]);

  const financialByClient = useMemo(() => {
    const map = new Map<
      string,
      {
        billed: number;
        outstanding: number;
        currency: string;
        lastInvoiceAt: string | null;
        lastInvoiceNumber: string | null;
        invoiceCount: number;
      }
    >();

    invoices.forEach((invoice) => {
      const emailKey = normalizeIdentity(invoice.to_email || '');
      const nameKey = normalizeIdentity(invoice.to_name || '');
      const key = emailKey || nameKey;
      if (!key) return;

      const status = normalizeStatus(invoice.status);
      const total = Number(invoice.total ?? 0);
      const row = map.get(key) ?? {
        billed: 0,
        outstanding: 0,
        currency: invoice.currency || 'USD',
        lastInvoiceAt: null,
        lastInvoiceNumber: null,
        invoiceCount: 0
      };

      row.invoiceCount += 1;
      if (status !== 'cancelled' && status !== 'draft') {
        row.billed += total;
      }
      if (status === 'sent' || status === 'overdue') {
        row.outstanding += total;
      }

      const candidateDate = invoice.issue_date || invoice.created_at || null;
      if (candidateDate) {
        if (!row.lastInvoiceAt || new Date(candidateDate).getTime() > new Date(row.lastInvoiceAt).getTime()) {
          row.lastInvoiceAt = candidateDate;
          row.lastInvoiceNumber = invoice.invoice_number || null;
        }
      }

      map.set(key, row);
    });

    return map;
  }, [invoices]);

  const summary = useMemo(() => {
    return filteredClients.reduce(
      (acc, client) => {
        const key = normalizeIdentity(client.email) || normalizeIdentity(client.name);
        const metrics = financialByClient.get(key);
        if (!metrics) return acc;
        acc.totalBilled += metrics.billed;
        acc.totalOutstanding += metrics.outstanding;
        return acc;
      },
      { totalBilled: 0, totalOutstanding: 0 }
    );
  }, [filteredClients, financialByClient]);

  const openCreateModal = () => {
    setNewClientDraft(emptyDraft);
    setModalError(null);
    setEditingClientId(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const openClientModal = (client: ClientRow, mode: ModalMode) => {
    setNewClientDraft({ name: client.name, email: client.email, address: client.address });
    setModalError(null);
    setEditingClientId(client.id);
    setModalMode(mode);
    setIsModalOpen(true);
  };

  const onSaveClient = async () => {
    const name = newClientDraft.name.trim();
    if (!name) {
      setModalError(t('clients.errors.nameRequired'));
      return;
    }

    setIsSavingClient(true);
    setModalError(null);
    try {
      const isEditing = modalMode === 'edit' && editingClientId;
      const response = await fetch(isEditing ? `/api/clients/${editingClientId}` : '/api/clients', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email: newClientDraft.email.trim(),
          address: newClientDraft.address.trim()
        })
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        setModalError(body?.message || t('clients.errors.saveFailed'));
        return;
      }

      setIsModalOpen(false);
      setNewClientDraft(emptyDraft);
      setEditingClientId(null);
      await loadData();
    } finally {
      setIsSavingClient(false);
    }
  };

  const onDeleteClient = async (id: string) => {
    setDeletingClientId(id);
    try {
      const response = await fetch(`/api/clients/${id}`, { method: 'DELETE' });
      if (!response.ok) return;
      setClients((prev) => prev.filter((client) => client.id !== id));
    } finally {
      setDeletingClientId(null);
    }
  };

  const clientMenuItems = (client: ClientRow) => [
    { label: t('clients.actions.view'), onClick: () => openClientModal(client, 'view') },
    { label: t('clients.actions.edit'), onClick: () => openClientModal(client, 'edit') },
    { label: t('clients.actions.newInvoice'), onClick: () => router.push('/app') },
    { label: deletingClientId === client.id ? t('clients.actions.deleting') : t('common.delete'), onClick: () => void onDeleteClient(client.id), destructive: true, disabled: deletingClientId === client.id }
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <WorkspaceNavbar displayName={displayName} plan={plan} />

      <div className="md:pl-[var(--workspace-sidebar-width)]">
        <main className="mx-auto w-full max-w-[1600px] space-y-4 p-4 pb-24 md:p-8">
          <header className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{t('clients.pageTitle')}</h1>
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center rounded-none bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                {t('clients.newClient')}
              </button>
            </div>
            <p className="text-sm text-slate-500">{t('clients.subtitle')}</p>
          </header>

          <section className="border-y border-slate-100 py-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="flex items-center md:pr-4 md:border-r md:border-slate-100">
                <div>
                  <p className="text-3xl font-semibold text-slate-900">{filteredClients.length}</p>
                  <p className="text-sm text-slate-500">{t('clients.stats.totalClients')}</p>
                </div>
              </div>
              <div className="flex items-center md:px-4 md:border-r md:border-slate-100">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{formatMoney(summary.totalBilled, 'USD')}</p>
                  <p className="text-sm text-slate-500">{t('clients.stats.totalBilled')}</p>
                </div>
              </div>
              <div className="flex items-center md:pl-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{formatMoney(summary.totalOutstanding, 'USD')}</p>
                  <p className="text-sm text-slate-500">{t('clients.stats.outstanding')}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="border-b border-slate-200 pb-4 pt-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <svg className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 3.473 9.765l3.63 3.63a.75.75 0 1 0 1.06-1.06l-3.63-3.63A5.5 5.5 0 0 0 9 3.5ZM5 9a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z" clipRule="evenodd" />
                </svg>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t('clients.searchPlaceholder')}
                  className="w-full rounded-none border border-slate-200 bg-white py-3 pl-12 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-300 focus:ring-0"
                />
              </div>
              <select
                value={sortOption}
                onChange={(event) => setSortOption(event.target.value as SortOption)}
                className="!min-h-0 w-full rounded-none border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-slate-300 focus:ring-0 lg:w-56"
              >
                <option value="newest">{t('clients.sort.newest')}</option>
                <option value="oldest">{t('clients.sort.oldest')}</option>
                <option value="name_asc">{t('clients.sort.nameAsc')}</option>
                <option value="name_desc">{t('clients.sort.nameDesc')}</option>
              </select>
            </div>
          </section>

          {isLoading ? (
            <p className="py-10 text-sm text-slate-500">{t('clients.loading')}</p>
          ) : filteredClients.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-base font-medium text-slate-900">{t('clients.empty.title')}</p>
              <p className="mt-1 text-sm text-slate-500">{t('clients.empty.description')}</p>
            </div>
          ) : (
            <section className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wide text-slate-500">
                    <th className="py-5 pr-4 font-bold">{t('clients.table.client')}</th>
                    <th className="py-5 pr-4 font-bold">{t('clients.table.totalBilled')}</th>
                    <th className="py-5 pr-4 font-bold">{t('clients.table.outstanding')}</th>
                    <th className="py-5 pr-4 font-bold">{t('clients.table.lastInvoice')}</th>
                    <th className="py-5 pr-4 font-bold">{t('clients.table.status')}</th>
                    <th className="py-5 pl-4 text-right font-bold">{t('clients.table.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((client) => {
                    const metricsKey = normalizeIdentity(client.email) || normalizeIdentity(client.name);
                    const metrics = financialByClient.get(metricsKey);
                    const currency = metrics?.currency || 'USD';
                    const totalBilled = metrics?.billed ?? 0;
                    const outstanding = metrics?.outstanding ?? 0;
                    const lastInvoiceDate = metrics?.lastInvoiceAt ?? null;
                    const lastInvoiceNumber = metrics?.lastInvoiceNumber ?? null;
                    const hasUnpaid = outstanding > 0;
                    const isActive =
                      !!lastInvoiceDate &&
                      new Date(lastInvoiceDate).getTime() >= Date.now() - 1000 * 60 * 60 * 24 * 90;

                    return (
                      <tr
                        key={client.id}
                        className="group cursor-pointer border-b border-slate-100 transition-colors duration-150 hover:bg-slate-50/60"
                        onClick={() => openClientModal(client, 'view')}
                      >
                        <td className="py-6 pr-4">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-semibold text-indigo-700">
                              {getInitials(client.name)}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900">{client.name}</p>
                              <p className="truncate text-xs text-slate-600">{client.email || '-'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-6 pr-4">
                          <p className="text-base font-semibold text-slate-700">{formatMoney(totalBilled, currency)}</p>
                          <p className="text-[11px] font-semibold text-slate-500">{t('clients.metrics.totalBilledLabel')}</p>
                        </td>
                        <td className="py-6 pr-4">
                          <p className={`text-base font-semibold ${hasUnpaid ? 'text-amber-500' : 'text-slate-700'}`}>{formatMoney(outstanding, currency)}</p>
                          <p className="text-[11px] font-semibold text-slate-500">{hasUnpaid ? t('clients.metrics.unpaidLabel') : t('clients.metrics.paidLabel')}</p>
                        </td>
                        <td className="py-6 pr-4">
                          <p className="text-xs font-semibold text-slate-700">{lastInvoiceDate ? formatDate(lastInvoiceDate) : t('clients.metrics.none')}</p>
                          <p className="text-[11px] font-semibold text-slate-500">{lastInvoiceNumber || t('clients.metrics.noInvoices')}</p>
                        </td>
                        <td className="py-6 pr-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-none px-2 py-1 text-[11px] font-semibold ${
                              isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                            {isActive ? t('clients.status.active') : t('clients.status.inactive')}
                          </span>
                        </td>
                        <td className="py-6 pl-4 text-right">
                          <div className="relative inline-flex" data-client-menu="true">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setMenuClientId((prev) => (prev === client.id ? null : client.id));
                              }}
                              className="h-8 min-h-0 w-8 min-w-0 text-2xl leading-none text-slate-500 transition-colors hover:text-slate-700"
                              aria-label={t('clients.actions.openMenuAria')}
                            >
                              ⋯
                            </button>

                            {menuClientId === client.id ? (
                              <div className="absolute right-0 top-8 z-20 w-36 border border-slate-100 bg-white py-1">
                                {clientMenuItems(client).map((item) => (
                                  <button
                                    key={item.label}
                                    type="button"
                                    disabled={item.disabled}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setMenuClientId(null);
                                      item.onClick();
                                    }}
                                    className={`h-auto w-full min-h-0 min-w-0 px-3 py-2 text-left text-sm ${
                                      item.destructive ? 'text-rose-500 hover:bg-slate-50' : 'text-slate-600 hover:bg-slate-50'
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
                    );
                  })}
                </tbody>
              </table>
            </section>
          )}

          {!isLoading && filteredClients.length > 0 ? (
            <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
              <p>{t('clients.pagination.showing', { from: 1, to: filteredClients.length, total: filteredClients.length })}</p>
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

      {isModalOpen ? (
        <AddClientModal
          mode={modalMode}
          draft={newClientDraft}
          setDraft={setNewClientDraft}
          isSaving={isSavingClient}
          error={modalError}
          onClose={() => {
            setIsModalOpen(false);
            setModalError(null);
          }}
          onSave={() => void onSaveClient()}
        />
      ) : null}
    </div>
  );
}
