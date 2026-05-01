import { type Dispatch, type SetStateAction } from 'react';
import { Field } from './FormPrimitives';

type ClientModalMode = 'picker' | 'manage';
type SavingClientMode = 'none' | 'quick' | 'modal' | 'edit';

type Client = {
  id: string;
  name: string;
  email: string;
  address: string;
  createdAt: string;
};

type ClientDraft = {
  name: string;
  email: string;
  address: string;
};

const Spinner = ({ size = 'h-4 w-4' }: { size?: string }) => (
  <span className={`${size} inline-block animate-spin rounded-full border-2 border-current border-r-transparent`} />
);

type ClientManagerModalProps = {
  isMounted: boolean;
  isVisible: boolean;
  mode: ClientModalMode;
  clients: Client[];
  filteredClients: Client[];
  isClientsLoading: boolean;
  clientSearch: string;
  onClientSearchChange: (value: string) => void;
  showAddClientForm: boolean;
  onToggleAddClientForm: () => void;
  newClientDraft: ClientDraft;
  setNewClientDraft: Dispatch<SetStateAction<ClientDraft>>;
  editingClientId: string | null;
  editingClientDraft: ClientDraft;
  setEditingClientDraft: Dispatch<SetStateAction<ClientDraft>>;
  savingClientMode: SavingClientMode;
  deletingClientId: string | null;
  onClose: () => void;
  onSaveNewClient: () => Promise<void>;
  onCancelAddClient: () => void;
  onSelectClient: (client: Client) => void;
  onStartEditClient: (client: Client) => void;
  onSaveEditedClient: (clientId: string) => Promise<void>;
  onCancelEditClient: () => void;
  onDeleteClient: (clientId: string) => Promise<void>;
};

export default function ClientManagerModal({
  isMounted,
  isVisible,
  mode,
  clients,
  filteredClients,
  isClientsLoading,
  clientSearch,
  onClientSearchChange,
  showAddClientForm,
  onToggleAddClientForm,
  newClientDraft,
  setNewClientDraft,
  editingClientId,
  editingClientDraft,
  setEditingClientDraft,
  savingClientMode,
  deletingClientId,
  onClose,
  onSaveNewClient,
  onCancelAddClient,
  onSelectClient,
  onStartEditClient,
  onSaveEditedClient,
  onCancelEditClient,
  onDeleteClient
}: ClientManagerModalProps) {
  if (!isMounted) return null;

  return (
    <div
      className={`fixed inset-0 z-50 bg-slate-900/50 p-0 transition-opacity duration-200 sm:flex sm:items-center sm:justify-center sm:p-4 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={onClose}
    >
      <div
        className={`h-full w-full overflow-hidden bg-white transition-all duration-200 sm:h-auto sm:max-h-[85vh] sm:max-w-[500px] sm:rounded-2xl ${
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{mode === 'picker' ? 'Select Client' : 'Manage Clients'}</h3>
            <p className="text-xs text-slate-500">Clients ({clients.length})</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close client manager"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[calc(100vh-132px)] space-y-3 overflow-y-auto p-4 sm:max-h-[70vh]">
          <input
            value={clientSearch}
            onChange={(e) => onClientSearchChange(e.target.value)}
            placeholder="Search by client name or email..."
          />

          {mode === 'manage' ? (
            <button
              type="button"
              onClick={onToggleAddClientForm}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Add New Client
            </button>
          ) : null}

          {showAddClientForm && mode === 'manage' ? (
            <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <Field label="Name">
                <input
                  value={newClientDraft.name}
                  onChange={(e) => setNewClientDraft((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Client name"
                />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  value={newClientDraft.email}
                  onChange={(e) => setNewClientDraft((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="client@example.com"
                />
              </Field>
              <Field label="Address">
                <textarea
                  rows={2}
                  value={newClientDraft.address}
                  onChange={(e) => setNewClientDraft((prev) => ({ ...prev, address: e.target.value }))}
                  placeholder="123 Client Street"
                />
              </Field>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => void onSaveNewClient()}
                  disabled={savingClientMode === 'modal'}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {savingClientMode === 'modal' ? <Spinner /> : null}
                  Save Client
                </button>
                <button
                  type="button"
                  onClick={onCancelAddClient}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 sm:w-auto"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}

          {isClientsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((skeleton) => (
                <div key={skeleton} className="h-24 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
              ))}
            </div>
          ) : filteredClients.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-600">
              No clients saved yet. Add your first client!
            </p>
          ) : (
            <div className="space-y-3">
              {filteredClients.map((client) => (
                <article
                  key={client.id}
                  className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  {editingClientId === client.id ? (
                    <div className="space-y-2">
                      <Field label="Name">
                        <input
                          value={editingClientDraft.name}
                          onChange={(e) => setEditingClientDraft((prev) => ({ ...prev, name: e.target.value }))}
                        />
                      </Field>
                      <Field label="Email">
                        <input
                          type="email"
                          value={editingClientDraft.email}
                          onChange={(e) => setEditingClientDraft((prev) => ({ ...prev, email: e.target.value }))}
                        />
                      </Field>
                      <Field label="Address">
                        <textarea
                          rows={2}
                          value={editingClientDraft.address}
                          onChange={(e) => setEditingClientDraft((prev) => ({ ...prev, address: e.target.value }))}
                        />
                      </Field>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <button
                          type="button"
                          onClick={() => void onSaveEditedClient(client.id)}
                          disabled={savingClientMode === 'edit'}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                        >
                          {savingClientMode === 'edit' ? <Spinner /> : null}
                          Save Client
                        </button>
                        <button
                          type="button"
                          onClick={onCancelEditClient}
                          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 sm:w-auto"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-lg font-bold text-slate-900">{client.name}</p>
                      <p className="mt-1 text-sm text-slate-500">{client.email || '-'}</p>
                      <p className="mt-1 whitespace-pre-line text-sm text-slate-500">{client.address || '-'}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => onSelectClient(client)}
                          className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                        >
                          Select
                        </button>
                        {mode === 'manage' ? (
                          <button
                            type="button"
                            onClick={() => onStartEditClient(client)}
                            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            Edit
                          </button>
                        ) : null}
                        {mode === 'manage' ? (
                          <button
                            type="button"
                            onClick={() => void onDeleteClient(client.id)}
                            disabled={deletingClientId === client.id}
                            className="inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {deletingClientId === client.id ? <Spinner /> : null}
                            Delete
                          </button>
                        ) : null}
                      </div>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
        <div className="sticky bottom-0 border-t border-slate-200 bg-white px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
