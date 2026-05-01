import { useCallback, useMemo, useState } from 'react';

export type Client = {
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

export type ClientDraft = {
  name: string;
  email: string;
  address: string;
};

export type ClientModalMode = 'picker' | 'manage';
export type SavingClientMode = 'none' | 'quick' | 'modal' | 'edit';

type UseClientsParams = {
  apiFetch: <T,>(url: string, options?: RequestInit) => Promise<T>;
  mapApiClient: (client: ApiClient) => Client;
  createEmptyClientDraft: () => ClientDraft;
  showToast: (message: string) => void;
  openComingSoon: (plan?: 'creator' | 'pro') => void;
  handleRequestError: (error: unknown) => void;
};

const getErrorStatus = (error: unknown): number | null | undefined => {
  if (!error || typeof error !== 'object') return undefined;
  if (!('status' in error)) return undefined;
  return (error as { status?: number | null }).status;
};

export const useClients = ({
  apiFetch,
  mapApiClient,
  createEmptyClientDraft,
  showToast,
  openComingSoon,
  handleRequestError
}: UseClientsParams) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [showAddClientForm, setShowAddClientForm] = useState(false);
  const [newClientDraft, setNewClientDraft] = useState(createEmptyClientDraft);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [editingClientDraft, setEditingClientDraft] = useState(createEmptyClientDraft);
  const [clientModalMode, setClientModalMode] = useState<ClientModalMode>('picker');
  const [isClientModalMounted, setIsClientModalMounted] = useState(false);
  const [isClientModalVisible, setIsClientModalVisible] = useState(false);
  const [isClientsLoading, setIsClientsLoading] = useState(true);
  const [savingClientMode, setSavingClientMode] = useState<SavingClientMode>('none');
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);

  const filteredClients = useMemo(() => {
    const query = clientSearch.trim().toLowerCase();
    if (!query) return clients;
    return clients.filter(
      (client) => client.name.toLowerCase().includes(query) || client.email.toLowerCase().includes(query)
    );
  }, [clientSearch, clients]);

  const loadClients = useCallback(async () => {
    setIsClientsLoading(true);
    try {
      const records = await apiFetch<ApiClient[]>('/api/clients');
      setClients(records.map(mapApiClient));
    } catch (error) {
      handleRequestError(error);
    } finally {
      setIsClientsLoading(false);
    }
  }, [apiFetch, handleRequestError, mapApiClient]);

  const openClientModal = useCallback(
    (mode: ClientModalMode) => {
      setClientModalMode(mode);
      void loadClients();
      setIsClientModalMounted(true);
      requestAnimationFrame(() => setIsClientModalVisible(true));
    },
    [loadClients]
  );

  const closeClientModal = useCallback(() => {
    setIsClientModalVisible(false);
    setTimeout(() => {
      setIsClientModalMounted(false);
      setShowAddClientForm(false);
      setEditingClientId(null);
      setClientSearch('');
    }, 220);
  }, []);

  const updateClientById = useCallback(
    async (clientId: string, name: string, email: string, address: string) => {
      await apiFetch<ApiClient>(`/api/clients/${clientId}`, {
        method: 'PUT',
        body: JSON.stringify({ name, email, address })
      });
      await loadClients();
    },
    [apiFetch, loadClients]
  );

  const saveToAsClient = useCallback(
    async (invoiceRecipient: { name: string; email: string; address: string }) => {
      const name = invoiceRecipient.name.trim();
      const email = invoiceRecipient.email.trim();
      const address = invoiceRecipient.address.trim();

      if (!name) {
        showToast('Something went wrong. Please try again.');
        return;
      }

      setSavingClientMode('quick');
      try {
        await apiFetch<ApiClient>('/api/clients', {
          method: 'POST',
          body: JSON.stringify({ name, email, address })
        });
        await loadClients();
        showToast('Client saved ✓');
      } catch (error) {
        const status = getErrorStatus(error);
        if (status === 403) {
          openComingSoon('creator');
          showToast("You've reached the free plan limit of 5 clients.");
          return;
        }

        if (status === 409 && email) {
          let existing = clients.find((client) => client.email.trim().toLowerCase() === email.toLowerCase());
          if (!existing) {
            const records = await apiFetch<ApiClient[]>('/api/clients');
            const mappedClients = records.map(mapApiClient);
            setClients(mappedClients);
            existing = mappedClients.find((client) => client.email.trim().toLowerCase() === email.toLowerCase());
          }
          if (!existing) {
            showToast('Client with this email already exists');
            return;
          }
          await updateClientById(existing.id, name, email, address);
          showToast('Client updated ✓');
          return;
        }

        handleRequestError(error);
      } finally {
        setSavingClientMode('none');
      }
    },
    [apiFetch, clients, handleRequestError, loadClients, mapApiClient, openComingSoon, showToast, updateClientById]
  );

  const saveNewClientFromModal = useCallback(async () => {
    const name = newClientDraft.name.trim();
    const email = newClientDraft.email.trim();
    const address = newClientDraft.address.trim();

    if (!name) {
      showToast('Something went wrong. Please try again.');
      return;
    }

    setSavingClientMode('modal');
    try {
      await apiFetch<ApiClient>('/api/clients', {
        method: 'POST',
        body: JSON.stringify({ name, email, address })
      });
      await loadClients();
      setNewClientDraft(createEmptyClientDraft());
      setShowAddClientForm(false);
      showToast('Client saved ✓');
    } catch (error) {
      const status = getErrorStatus(error);
      if (status === 403) {
        openComingSoon('creator');
        showToast("You've reached the free plan limit of 5 clients.");
        return;
      }
      handleRequestError(error);
    } finally {
      setSavingClientMode('none');
    }
  }, [apiFetch, createEmptyClientDraft, handleRequestError, loadClients, newClientDraft.address, newClientDraft.email, newClientDraft.name, openComingSoon, showToast]);

  const startEditClient = useCallback((client: Client) => {
    setEditingClientId(client.id);
    setEditingClientDraft({
      name: client.name,
      email: client.email,
      address: client.address
    });
  }, []);

  const saveEditedClient = useCallback(
    async (clientId: string) => {
      const name = editingClientDraft.name.trim();
      const email = editingClientDraft.email.trim();
      const address = editingClientDraft.address.trim();

      if (!name) {
        showToast('Something went wrong. Please try again.');
        return;
      }

      setSavingClientMode('edit');
      try {
        await updateClientById(clientId, name, email, address);
        setEditingClientId(null);
        showToast('Client updated ✓');
      } catch (error) {
        handleRequestError(error);
      } finally {
        setSavingClientMode('none');
      }
    },
    [editingClientDraft.address, editingClientDraft.email, editingClientDraft.name, handleRequestError, showToast, updateClientById]
  );

  const deleteClientImmediately = useCallback(
    async (clientId: string) => {
      const previous = clients;
      setDeletingClientId(clientId);
      setClients((prev) => prev.filter((client) => client.id !== clientId));

      try {
        await apiFetch<{ success: true }>(`/api/clients/${clientId}`, {
          method: 'DELETE'
        });
        showToast('Client deleted');
      } catch (error) {
        setClients(previous);
        handleRequestError(error);
      } finally {
        setDeletingClientId(null);
      }
    },
    [apiFetch, clients, handleRequestError, showToast]
  );

  return {
    clients,
    setClients,
    isClientsLoading,
    setIsClientsLoading,
    filteredClients,
    clientSearch,
    setClientSearch,
    showAddClientForm,
    setShowAddClientForm,
    newClientDraft,
    setNewClientDraft,
    editingClientId,
    setEditingClientId,
    editingClientDraft,
    setEditingClientDraft,
    clientModalMode,
    isClientModalMounted,
    isClientModalVisible,
    savingClientMode,
    deletingClientId,
    loadClients,
    openClientModal,
    closeClientModal,
    saveToAsClient,
    saveNewClientFromModal,
    startEditClient,
    saveEditedClient,
    deleteClientImmediately
  };
};
