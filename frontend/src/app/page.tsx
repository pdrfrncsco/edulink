import React from 'react';
import type { Metadata } from 'next';
import EduLinkLanding from '@/components/landing/EduLinkLanding';
import { buildAppOrigin } from '@/lib/siteUrls';

const STATIC_SITE_ORIGIN = buildAppOrigin(
  process.env.NEXT_PUBLIC_APP_ORIGIN || process.env.NEXT_PUBLIC_ROOT_DOMAIN
);

export const metadata: Metadata = {
  title: 'EduLink Angola — Domínio .edu.ao, Google Workspace, Microsoft 365 e Cartão Digital',
  description:
    'Infraestrutura chave-na-mão para escolas, colégios e universidades em Angola: registo .edu.ao, site institucional automático, Google Workspace, Microsoft 365, Canva Educação, Passaporte QR e conformidade APD (Lei n.º 22/11).',
  keywords: [
    'EduLink Angola',
    'domínio edu.ao',
    'Google Workspace for Education Angola',
    'Microsoft 365 Education Angola',
    'Canva Educação Angola',
    'cartão de estudante digital Angola',
    'conformidade APD escolas',
  ],
  alternates: {
    canonical: STATIC_SITE_ORIGIN,
  },
  openGraph: {
    title: 'EduLink Angola — Transformação Digital Chave-na-Mão para Escolas e IES',
    description:
      'Domínio .edu.ao, site institucional, e-mails académicos, Google, Microsoft, Canva Educação e conformidade APD num único pacote em Kwanzas.',
    url: STATIC_SITE_ORIGIN,
    siteName: 'EduLink Angola',
    locale: 'pt_AO',
    type: 'website',
  },
};

export default function HomePage() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'EduLink Angola',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Web, PWA',
    url: STATIC_SITE_ORIGIN,
    areaServed: {
      '@type': 'Country',
      name: 'Angola',
    },
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'AOA',
      lowPrice: '150000',
      highPrice: '1200000',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
        }}
      />
      <EduLinkLanding />
    </>
  );
}