import Link from 'next/link';

type LegalPageProps = {
  title: string;
  body: string;
};

export const LegalPage = ({ title, body }: LegalPageProps) => (
  <main className="min-h-screen bg-white px-4 py-12 text-slate-900">
    <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-slate-50 p-6 md:p-8">
      <Link href="/" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
        ← Back to InvoiceFlow
      </Link>
      <h1 className="mt-4 text-3xl font-bold">{title}</h1>
      <p className="mt-4 text-slate-600">{body}</p>
    </div>
  </main>
);
