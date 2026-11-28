const AOA_DECIMAL_FORMATTER = new Intl.NumberFormat('pt-AO', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const AOA_INTEGER_FORMATTER = new Intl.NumberFormat('pt-AO', {
  maximumFractionDigits: 0,
});

/** Formats monetary values in Kwanzas with two decimal places (e.g. `150 000,00 Kz`). */
export function formatAOA(value: string | number): string {
  const num = typeof value === 'string' ? Number.parseFloat(value) : value;
  if (Number.isNaN(num)) return `${value} Kz`;
  return `${AOA_DECIMAL_FORMATTER.format(num)} Kz`;
}

/** Formats rounded monetary values in Kwanzas for pricing/simulator displays. */
export function formatKz(value: number): string {
  return `${AOA_INTEGER_FORMATTER.format(Math.round(value))} Kz`;
}

/** Formats an ISO date string in `pt-AO` locale. */
export function formatDateAO(value: string | number | Date): string {
  return new Date(value).toLocaleDateString('pt-AO');
}

/** Formats an ISO date/timestamp with time in `pt-AO` locale. */
export function formatDateTimeAO(value: string | number | Date): string {
  return new Date(value).toLocaleString('pt-AO');
}

/** Normalizes a school name into a DNS-safe slug. */
export function slugifySchool(input: string, fallback = 'colegio-horizonte'): string {
  const cleaned = input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
  return cleaned || fallback;
}

/**
 * Computes an accessible dark/light foreground color (`#1C1917` or `#FFFFFF`)
 * from a hex background color using WCAG relative luminance.
 */
export function getContrastTextColor(hexColor?: string | null): '#FFFFFF' | '#1C1917' {
  if (!hexColor) return '#FFFFFF';
  const clean = hexColor.trim().replace('#', '');
  const expanded =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) return '#FFFFFF';

  const r = Number.parseInt(expanded.slice(0, 2), 16) / 255;
  const g = Number.parseInt(expanded.slice(2, 4), 16) / 255;
  const b = Number.parseInt(expanded.slice(4, 6), 16) / 255;

  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);

  return luminance > 0.36 ? '#1C1917' : '#FFFFFF';
}
