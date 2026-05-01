import { SignIn } from '@clerk/nextjs';
import BrandLogo from '@/components/BrandLogo';

export default function SignInPage() {
  return (
    <main className="min-h-screen bg-[#03050b] text-white">
      <div className="grid min-h-screen lg:grid-cols-2">
        <section className="relative hidden overflow-hidden lg:flex lg:items-center lg:justify-center">
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(37,99,235,0.32),transparent_56%),radial-gradient(circle_at_65%_30%,rgba(99,102,241,0.2),transparent_42%),linear-gradient(135deg,#02040a_10%,#09132d_45%,#040810_90%)]"
          />
          <div aria-hidden className="absolute inset-0 opacity-25 [background-image:radial-gradient(#ffffff_0.8px,transparent_0.8px)] [background-size:3px_3px]" />
          <BrandLogo
            className="relative z-10 items-center gap-3"
            textClassName="text-5xl font-bold tracking-tight text-slate-100"
            imageClassName="rounded-lg saturate-150 brightness-110 contrast-125 drop-shadow-[0_0_18px_rgba(99,102,241,0.55)]"
            size={56}
          />
        </section>

        <section className="flex items-center justify-center px-4 py-12 sm:px-6 lg:px-10">
          <div className="w-full max-w-md rounded-3xl border border-[#1a2340] bg-[#05070f] p-3 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
            <SignIn
              forceRedirectUrl="/app?welcome=signin"
              signUpUrl="/sign-up"
              appearance={{
                variables: {
                  colorPrimary: '#4f46e5',
                  colorBackground: '#05070f',
                  colorInputBackground: '#0b1120',
                  colorInputText: '#e2e8f0',
                  colorText: '#e2e8f0',
                  colorTextSecondary: '#94a3b8',
                  colorNeutral: '#334155',
                  borderRadius: '0.85rem'
                },
                elements: {
                  card: 'bg-transparent border-0 shadow-none',
                  headerTitle: 'text-white text-3xl font-bold',
                  headerSubtitle: 'text-slate-400',
                  socialButtonsBlockButton:
                    'bg-[#05070f] border border-[#1f2a44] text-slate-100 hover:bg-[#0b1120] transition',
                  socialButtonsBlockButtonText: 'text-slate-100',
                  dividerLine: 'bg-[#1f2a44]',
                  dividerText: 'text-slate-500',
                  formFieldLabel: 'text-slate-200',
                  formFieldInput:
                    'bg-[#0b1120] border border-[#1f2a44] text-slate-100 focus:border-indigo-500 focus:ring-0',
                  formButtonPrimary:
                    'bg-white text-slate-900 hover:bg-slate-200 shadow-none font-semibold',
                  footerActionText: 'text-slate-400',
                  footerActionLink: 'text-white hover:text-indigo-300',
                  identityPreviewText: 'text-slate-300',
                  identityPreviewEditButton: 'text-indigo-300 hover:text-indigo-200'
                }
              }}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
