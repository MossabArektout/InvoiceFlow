'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'invoiceflow_admin_settings';

type AdminSettings = {
  gumroadUrl: string;
  supportEmail: string;
};

const downloadFile = async (url: string, filename: string) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Export failed');

  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = blobUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(blobUrl);
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AdminSettings>({
    gumroadUrl: 'https://gumroad.com/l/invoiceflow',
    supportEmail: 'support@invoiceflow.app'
  });
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as AdminSettings;
      if (parsed.gumroadUrl || parsed.supportEmail) {
        setSettings({
          gumroadUrl: parsed.gumroadUrl || 'https://gumroad.com/l/invoiceflow',
          supportEmail: parsed.supportEmail || 'support@invoiceflow.app'
        });
      }
    } catch {
      return;
    }
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 2500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setToast('Settings saved');
  };

  const exportUsers = async () => {
    try {
      await downloadFile('/api/admin/export/users', 'invoiceflow-users.csv');
      setToast('Users exported');
    } catch {
      setToast('Failed to export users');
    }
  };

  const exportInvoices = async () => {
    try {
      await downloadFile('/api/admin/export/invoices', 'invoiceflow-invoices.csv');
      setToast('Invoices exported');
    } catch {
      setToast('Failed to export invoices');
    }
  };

  return (
    <div className="space-y-4">
      {toast ? (
        <div className="toast-spring fixed right-4 top-20 z-50 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-lg">
          {toast}
        </div>
      ) : null}

      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">App Settings</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div>
            <label>Gumroad Product URL</label>
            <input
              value={settings.gumroadUrl}
              onChange={(event) => setSettings((prev) => ({ ...prev, gumroadUrl: event.target.value }))}
              placeholder="https://gumroad.com/l/invoiceflow"
            />
          </div>
          <div>
            <label>Support Email</label>
            <input
              value={settings.supportEmail}
              onChange={(event) => setSettings((prev) => ({ ...prev, supportEmail: event.target.value }))}
              placeholder="support@invoiceflow.app"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={save}
          className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Save
        </button>
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">How to Add Admins</h2>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-600">
          <li>Go to clerk.com dashboard</li>
          <li>Click Users and select the user</li>
          <li>Click Metadata then Public Metadata</li>
          <li>Add {`{ "role": "admin" }`}</li>
          <li>User can now access /admin</li>
        </ol>
        <pre className="mt-4 rounded-xl bg-slate-900 p-4 text-sm text-slate-100">{`{
  "role": "admin"
}`}</pre>
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Export Data</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void exportUsers()}
            className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
          >
            Export All Users (CSV)
          </button>
          <button
            type="button"
            onClick={() => void exportInvoices()}
            className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
          >
            Export All Invoices (CSV)
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-red-300 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-red-600">Danger Zone</h2>
        <p className="mt-2 text-sm text-red-500">This actions are irreversible. Be very careful.</p>
      </section>
    </div>
  );
}
