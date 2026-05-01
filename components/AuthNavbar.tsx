import Link from 'next/link';
import BrandLogo from '@/components/BrandLogo';

export default function AuthNavbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/85 backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="inline-flex items-center gap-2 text-xl font-bold text-slate-900">
          <BrandLogo textClassName="text-xl font-bold text-slate-900" />
        </Link>
      </nav>
    </header>
  );
}
