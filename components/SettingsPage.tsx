'use client';

import { SignOutButton, useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import WorkspaceNavbar from './WorkspaceNavbar';
import { type UserPlan, normalizePlan } from '@/lib/plans';
import { useDarkMode } from '@/hooks/useDarkMode';

type ApiUser = {
  name: string | null;
  email: string;
  plan: UserPlan;
};

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

const CURRENCY_STORAGE_KEY = 'invoiceflow_currency';

const CURRENCIES: Array<{ code: CurrencyCode; label: string }> = [
  { code: 'USD', label: 'USD - US Dollar' },
  { code: 'EUR', label: 'EUR - Euro' },
  { code: 'GBP', label: 'GBP - British Pound' },
  { code: 'MAD', label: 'MAD - Moroccan Dirham' },
  { code: 'CAD', label: 'CAD - Canadian Dollar' },
  { code: 'AUD', label: 'AUD - Australian Dollar' },
  { code: 'JPY', label: 'JPY - Japanese Yen' },
  { code: 'CHF', label: 'CHF - Swiss Franc' },
  { code: 'INR', label: 'INR - Indian Rupee' },
  { code: 'AED', label: 'AED - UAE Dirham' },
  { code: 'SAR', label: 'SAR - Saudi Riyal' },
  { code: 'BRL', label: 'BRL - Brazilian Real' },
  { code: 'MXN', label: 'MXN - Mexican Peso' },
  { code: 'NGN', label: 'NGN - Nigerian Naira' },
  { code: 'ZAR', label: 'ZAR - South African Rand' },
  { code: 'SGD', label: 'SGD - Singapore Dollar' }
];

export default function SettingsPage() {
  const router = useRouter();
  const { user } = useUser();
  const { isDarkMode, setIsDarkMode } = useDarkMode();

  const [displayName, setDisplayName] = useState('');
  const [profileName, setProfileName] = useState('');
  const [email, setEmail] = useState('');
  const [plan, setPlan] = useState<UserPlan>('free');
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  const [defaultCurrency, setDefaultCurrency] = useState<CurrencyCode>('USD');
  const [prefsMessage, setPrefsMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/user/me');
        if (response.status === 401) {
          router.replace('/sign-in');
          return;
        }
        if (!response.ok) return;

        const body = (await response.json()) as ApiUser;
        const safeName = body.name?.trim() || body.email || 'User';
        setDisplayName(safeName);
        setProfileName(safeName);
        setEmail(body.email || '');
        setPlan(normalizePlan(body.plan));
      } finally {
        setIsLoading(false);
      }
    };

    void loadSettings();
  }, [router]);

  useEffect(() => {
    const fallbackName = user?.fullName || user?.firstName || user?.primaryEmailAddress?.emailAddress || 'User';
    if (!displayName) {
      setDisplayName(fallbackName);
    }
    if (!profileName) {
      setProfileName(fallbackName);
    }
    if (!email) {
      setEmail(user?.primaryEmailAddress?.emailAddress || '');
    }
  }, [displayName, email, profileName, user]);

  useEffect(() => {
    const storedCurrency = localStorage.getItem(CURRENCY_STORAGE_KEY) as CurrencyCode | null;
    if (storedCurrency && CURRENCIES.some((item) => item.code === storedCurrency)) {
      setDefaultCurrency(storedCurrency);
    }
  }, []);

  useEffect(() => {
    if (!profileMessage) return;
    const timeout = window.setTimeout(() => setProfileMessage(null), 2500);
    return () => window.clearTimeout(timeout);
  }, [profileMessage]);

  useEffect(() => {
    if (!prefsMessage) return;
    const timeout = window.setTimeout(() => setPrefsMessage(null), 2500);
    return () => window.clearTimeout(timeout);
  }, [prefsMessage]);

  const saveProfile = async () => {
    const nextName = profileName.trim();
    if (!nextName) {
      setProfileMessage('Name is required.');
      return;
    }

    setIsSavingProfile(true);
    try {
      const response = await fetch('/api/user/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nextName })
      });

      if (response.status === 401) {
        router.replace('/sign-in');
        return;
      }

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        setProfileMessage(body?.message || 'Could not save profile.');
        return;
      }

      setDisplayName(nextName);
      setProfileMessage('Profile updated.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const savePreferences = () => {
    localStorage.setItem(CURRENCY_STORAGE_KEY, defaultCurrency);
    setPrefsMessage('Preferences saved on this browser.');
  };

  return (
    <div className="workspace-bg min-h-screen text-slate-900">
      <WorkspaceNavbar displayName={displayName || 'User'} plan={plan} />

      <div className="md:pl-[var(--workspace-sidebar-width)]">
        <main className="mx-auto w-full max-w-[1700px] space-y-5 p-4 pb-24 md:p-6">
          <section className="app-card rounded-2xl p-5">
            <h1 className="text-3xl font-extrabold text-slate-900">Settings</h1>
            <p className="mt-1 text-sm text-slate-500">Manage your profile and app preferences.</p>
          </section>

          <section className="app-card rounded-2xl p-5">
            <h2 className="text-xl font-bold text-slate-900">Profile</h2>
            <p className="mt-1 text-sm text-slate-500">This is saved to your account.</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label>Display Name</label>
                <input
                  value={profileName}
                  onChange={(event) => setProfileName(event.target.value)}
                  maxLength={120}
                  placeholder="Your name"
                  disabled={isLoading}
                />
              </div>
              <div>
                <label>Email</label>
                <input value={email} disabled readOnly />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={() => void saveProfile()}
                disabled={isLoading || isSavingProfile}
                className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingProfile ? 'Saving...' : 'Save Profile'}
              </button>
              {profileMessage ? <p className="text-sm font-medium text-slate-600">{profileMessage}</p> : null}
            </div>
          </section>

          <section className="app-card rounded-2xl p-5">
            <h2 className="text-xl font-bold text-slate-900">Preferences</h2>
            <p className="mt-1 text-sm text-slate-500">Stored locally in this browser.</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label>Default Currency</label>
                <select value={defaultCurrency} onChange={(event) => setDefaultCurrency(event.target.value as CurrencyCode)}>
                  {CURRENCIES.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label>Theme</label>
                <button
                  type="button"
                  onClick={() => setIsDarkMode((prev) => !prev)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {isDarkMode ? 'Dark mode enabled' : 'Light mode enabled'}
                </button>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={savePreferences}
                className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Save Preferences
              </button>
              {prefsMessage ? <p className="text-sm font-medium text-slate-600">{prefsMessage}</p> : null}
            </div>
          </section>

          <section className="app-card rounded-2xl p-5">
            <h2 className="text-xl font-bold text-slate-900">Security</h2>
            <p className="mt-1 text-sm text-slate-500">Sign out from your current session.</p>
            <div className="mt-4">
              <SignOutButton redirectUrl="/">
                <button
                  type="button"
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100"
                >
                  Sign Out
                </button>
              </SignOutButton>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
