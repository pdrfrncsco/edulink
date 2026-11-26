import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'EduLink — Identidade Digital e Benefícios Educacionais em Angola',
  description: 'Infraestrutura de identidade institucional .edu.ao, provisionamento em nuvem (Google/Microsoft/Canva) e cartão acadêmico digital.',
  manifest: '/manifest.webmanifest',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-AO" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className="min-h-screen bg-[#f8f7f4] text-stone-900 selection:bg-teal-100 selection:text-teal-900"
      >
        {children}
      </body>
    </html>
  );
}
