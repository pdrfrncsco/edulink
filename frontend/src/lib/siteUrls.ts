const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

/**
 * Remove protocolo, barra final e porta de um hostname.
 */
export function stripHostPort(rawHost: string): string {
  return rawHost
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .split('/')[0]
    .split(':')[0]
    .replace(/\.$/, '');
}

/**
 * Verifica se o host atual corresponde ao ambiente local (localhost / 127.0.0.1 / *.localhost).
 */
export function isLocalHost(rawHost?: string | null): boolean {
  if (!rawHost) return false;
  const host = stripHostPort(rawHost);
  return LOCAL_HOSTNAMES.has(host) || host.endsWith('.localhost');
}

export function isClientLocalHost(): boolean {
  if (typeof window === 'undefined') return false;
  return isLocalHost(window.location.host);
}

/**
 * Domínio raiz usado em etiquetas visuais e e-mails de exemplo (.edulink.ao).
 * Nunca expõe "localhost:3000" em e-mails sugeridos ou pré-visualizações.
 */
export function getDisplayRootDomain(): string {
  const raw =
    process.env.NEXT_PUBLIC_DISPLAY_DOMAIN ||
    process.env.NEXT_PUBLIC_ROOT_DOMAIN ||
    'edulink.ao';
  const cleaned = stripHostPort(raw).replace(/^www\./, '');
  if (!cleaned || isLocalHost(cleaned)) {
    return 'edulink.ao';
  }
  return cleaned;
}

/**
 * Constrói o link clicável para pré-visualizar/abrir o site institucional de uma escola:
 * - Em localhost/127.0.0.1 usa a rota interna `/sites/{host}` (evita abrir *.edulink.ao na Internet).
 * - Em produção usa `https://{host}`.
 */
export function buildSchoolSiteHref(effectiveHost: string, requestHost?: string | null): string {
  const cleanHost = (effectiveHost || '').trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
  if (!cleanHost) return '#';

  const local = requestHost ? isLocalHost(requestHost) : isClientLocalHost();
  if (local) {
    return `/sites/${encodeURIComponent(cleanHost)}`;
  }
  return `https://${cleanHost}`;
}

/**
 * Constrói a origem canónica da aplicação consoante o host atual.
 */
export function buildAppOrigin(requestHost?: string | null): string {
  const explicitOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN;
  if (explicitOrigin) return explicitOrigin.replace(/\/+$/, '');

  if (requestHost && isLocalHost(requestHost)) {
    return `http://${requestHost}`;
  }
  return `https://${getDisplayRootDomain()}`;
}
