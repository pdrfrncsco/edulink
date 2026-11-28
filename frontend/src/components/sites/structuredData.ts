import type { PublicSchoolData } from '@/lib/siteServerContext';

/** Builds Schema.org JSON-LD metadata for public school and higher-ed institutional pages. */
export function buildSchoolStructuredData(
  school: PublicSchoolData,
  canonicalOrigin: string,
  isHigherEd: boolean
) {
  return {
    '@context': 'https://schema.org',
    '@type': isHigherEd ? 'CollegeOrUniversity' : 'School',
    name: school.name,
    url: canonicalOrigin,
    logo: school.logo_url || undefined,
    email: school.contact_email,
    telephone: school.phone || undefined,
    address: {
      '@type': 'PostalAddress',
      streetAddress: school.address || undefined,
      addressLocality: school.municipality || 'Talatona',
      addressRegion: school.province || 'Luanda',
      addressCountry: 'AO',
    },
    identifier: [
      {
        '@type': 'PropertyValue',
        name: isHigherEd ? 'Reconhecimento MESCTI' : 'Alvará MED',
        value: school.alvara_med_mescti,
      },
      ...(school.apd_dossier_number
        ? [
            {
              '@type': 'PropertyValue',
              name: 'Registo APD (Lei n.º 22/11)',
              value: school.apd_dossier_number,
            },
          ]
        : []),
    ],
  };
}
