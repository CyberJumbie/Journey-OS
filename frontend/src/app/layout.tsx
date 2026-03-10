import type { Metadata } from 'next';
import { Lora, Source_Sans_3, DM_Mono } from 'next/font/google';
import QueryProvider from '@/providers/QueryProvider';
import '@/styles/globals.css';

const lora = Lora({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-heading',
  display: 'swap',
});

const sourceSans = Source_Sans_3({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-body',
  display: 'swap',
});

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-label',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Journey OS',
  description: 'AI-powered competency-based medical education platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${lora.variable} ${sourceSans.variable} ${dmMono.variable}`}>
      <body className="min-h-screen bg-[var(--cream)] font-[family-name:var(--font-body)] text-[var(--gray-600)] antialiased">
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
