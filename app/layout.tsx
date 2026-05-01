import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

export const metadata: Metadata = {
  title: 'InvoiceFlow',
  description: 'Create and export polished invoices in seconds.',
  icons: {
    icon: [
      { url: '/logo101.png', sizes: '32x32', type: 'image/png' },
      { url: '/logo101.png', sizes: '192x192', type: 'image/png' },
      { url: '/logo101.png', sizes: '512x512', type: 'image/png' }
    ],
    shortcut: '/logo101.png',
    apple: '/apple-touch-icon.png'
  }
};

const hasClerkPublishableKey = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const content = (
    <html lang="en">
      <body>{children}</body>
    </html>
  );

  if (!hasClerkPublishableKey) {
    return content;
  }

  return <ClerkProvider>{content}</ClerkProvider>;
}
