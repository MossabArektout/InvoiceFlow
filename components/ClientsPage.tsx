'use client';

import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { type Dispatch, type SetStateAction, useEffect, useMemo, useState } from 'react';
import { type UserPlan, normalizePlan } from '@/lib/plans';
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

const emptyDraft = { name: '', email: '', address: '' };

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

const AddClientModal = ({
  draft,
  setDraft,
  isSaving,
  error,
  onClose,
  onSave
}: {
  draft: { name: string; email: string; address: string };
  setDraft: Dispatch<SetStateAction<{ name: string; email: string; address: string }>>;
  isSaving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: () => void;
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4" onClick={onClose}>
    <div
      className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-900">Add New Client</h2>
        <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-2.5 py-1.5 text-sm text-slate-600">
          Close
        </button>
      </div>
      <p className="mt-1 text-sm text-slate-500">Save client details once and reuse them in invoices.</p>

      <div className="mt-5 grid gap-3">
        <div>
          <label>Client Name</label>
          <input
            value={draft.name}
            onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="Acme Studio"
          />
        </div>
        <div>
          <label>Client Email</label>
          <input
            type="email"
            value={draft.email}
            onChange={(event) => setDraft((prev) => ({ ...prev, email: event.target.value }))}
            placeholder="billing@acme.com"
          />
        </div>
        <div>
          <label>Client Address</label>
          <textarea
            value={draft.address}
            onChange={(event) => setDraft((prev) => ({ ...prev, address: event.target.value }))}
            placeholder="123 Main St, City, Country"
            className="min-h-[110px] resize-y"
          />
        </div>
      </div>

      {error ? <p className="mt-3 text-sm font-semibold text-red-600">{error}</p> : null}

      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? 'Saving...' : 'Save Client'}
        </button>
      </div>
    </div>
  </div>
);

export default function ClientsPage() {
  const { user } = useUser();
  const [displayName, setDisplayName] = useState('');
  const [plan, setPlan] = useState<UserPlan>('free');
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newClientDraft, setNewClientDraft] = useState(emptyDraft);
  const [isSavingClient, setIsSavingClient] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);

  useEffect(() => {
    const userName = user?.fullName || user?.firstName || user?.primaryEmailAddress?.emailAddress || 'User';
    setDisplayName(userName);
  }, [user]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [clientRes, userRes] = await Promise.all([fetch('/api/clients'), fetch('/api/user/me')]);

      if (userRes.ok) {
        const userBody = (await userRes.json()) as { name?: string; email?: string; plan?: string };
        if (userBody.name || userBody.email) {
          setDisplayName(userBody.name || userBody.email || 'User');
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
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filteredClients = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return clients;
    return clients.filter((client) => client.name.toLowerCase().includes(query) || client.email.toLowerCase().includes(query));
  }, [clients, search]);

  const onSaveClient = async () => {
    const name = newClientDraft.name.trim();
    if (!name) {
      setModalError('Client name is required.');
      return;
    }

    setIsSavingClient(true);
    setModalError(null);
    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email: newClientDraft.email.trim(),
          address: newClientDraft.address.trim()
        })
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        setModalError(body?.message || 'Unable to save client.');
        return;
      }

      setIsModalOpen(false);
      setNewClientDraft(emptyDraft);
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

  return (
    <div className="workspace-bg min-h-screen text-slate-900">
      <WorkspaceNavbar displayName={displayName} plan={plan} />

      <div className="md:pl-[var(--workspace-sidebar-width)]">
        <main className="mx-auto w-full max-w-[1700px] space-y-5 p-4 pb-24 md:p-6">
        <section className="app-card rounded-2xl p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900">Clients</h1>
              <p className="mt-1 text-sm text-slate-500">Manage your client directory and reuse details in invoices.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setNewClientDraft(emptyDraft);
                setModalError(null);
                setIsModalOpen(true);
              }}
              className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              + Add New Client
            </button>
          </div>
        </section>

        <section className="app-card rounded-2xl p-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by client name or email"
              className="md:max-w-sm"
            />
            <p className="text-sm text-slate-500">
              {filteredClients.length} client{filteredClients.length === 1 ? '' : 's'}
            </p>
          </div>
        </section>

        <section className="app-card rounded-2xl p-3 md:p-4">
          {isLoading ? (
            <p className="px-3 py-8 text-sm text-slate-500">Loading clients...</p>
          ) : filteredClients.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
              <p className="text-xl font-bold text-slate-900">No clients yet</p>
              <p className="mt-1 text-sm text-slate-500">Add your first client and use it while creating invoices.</p>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="mt-4 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Add New Client
              </button>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredClients.map((client) => (
                <article key={client.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-bold text-slate-900">{client.name}</p>
                      <p className="mt-1 text-sm text-slate-600">{client.email || '-'}</p>
                      <p className="mt-1 whitespace-pre-line text-sm text-slate-500">{client.address || '-'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href="/app" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">
                        New Invoice
                      </Link>
                      <button
                        type="button"
                        onClick={() => void onDeleteClient(client.id)}
                        disabled={deletingClientId === client.id}
                        className="rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-60"
                      >
                        {deletingClientId === client.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-slate-400">Added {formatDate(client.createdAt)}</p>
                </article>
              ))}
            </div>
          )}
        </section>
        </main>
      </div>

      {isModalOpen ? (
        <AddClientModal
          draft={newClientDraft}
          setDraft={setNewClientDraft}
          isSaving={isSavingClient}
          error={modalError}
          onClose={() => setIsModalOpen(false)}
          onSave={() => void onSaveClient()}
        />
      ) : null}
    </div>
  );
}
