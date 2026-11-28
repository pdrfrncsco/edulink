import type { OnboardingFormState } from './types';

const DOMAIN_REGEX =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:edu\.ao|ed\.ao|co\.ao|ao|com|org|net|localhost)$/;

/** Validates fields required by each step of the 4-step institutional onboarding wizard. */
export function validateOnboardingStep(
  targetStep: number,
  formData: OnboardingFormState,
  effectiveSlug: string,
  cleanedDomain: string
): string | null {
  if (targetStep === 1) {
    if (!formData.name.trim()) return 'Indique o nome oficial completo da instituição.';
    if (!/^\d{9,10}[A-Za-z0-9]?$/.test(formData.nif.trim())) {
      return 'O NIF institucional deve conter entre 9 e 10 dígitos numéricos (ex.: 5412345678).';
    }
    if (!formData.alvara_med_mescti.trim()) {
      return 'Indique o número do Alvará ou Despacho MED/MESCTI.';
    }
  }

  if (targetStep === 2) {
    if (!formData.director_external_email.trim() || !formData.director_external_email.includes('@')) {
      return 'Indique um e-mail externo válido do diretor/responsável (necessário para aprovação DNS.AO e Google).';
    }
  }

  if (targetStep === 3) {
    if (!effectiveSlug || effectiveSlug === 'sua-escola') {
      return 'Defina um slug válido para o endereço de demonstração na EduLink.';
    }
    if (cleanedDomain && !DOMAIN_REGEX.test(cleanedDomain)) {
      return 'Domínio definitivo inválido. Use um formato como colegio.edu.ao, colegio.co.ao ou deixe em branco para usar apenas o endereço de demonstração.';
    }
  }

  return null;
}

/** Normalizes wizard form inputs into the payload expected by `POST /tenants/onboard/`. */
export function buildOnboardingPayload(
  formData: OnboardingFormState,
  effectiveSlug: string,
  cleanedDomain: string,
  suggestedContactEmail: string
) {
  return {
    name: formData.name.trim(),
    institution_type: formData.institution_type,
    nif: formData.nif.trim(),
    alvara_med_mescti: formData.alvara_med_mescti.trim(),
    preview_slug: effectiveSlug,
    domain: cleanedDomain || null,
    director_external_email: formData.director_external_email.trim(),
    contact_email: (formData.contact_email.trim() || suggestedContactEmail).toLowerCase(),
    phone: formData.phone.trim(),
    province: formData.province,
    municipality: formData.municipality.trim(),
    address: formData.address.trim(),
    primary_color: formData.primary_color,
    logo_url: formData.logo_url.trim() || null,
    about_text:
      formData.about_text.trim() ||
      `${formData.name.trim()} — instituição acreditada comprometida com a excelência académica e literacia digital.`,
  };
}
