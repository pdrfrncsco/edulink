import { NextRequest, NextResponse } from 'next/server';

const ROOT_DOMAIN = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'edulink.ao')
  .toLowerCase()
  .replace(/^www\./, '')
  .split(':')[0];

// Ative como 'true' apenas de forma temporária se ainda não existir src/app/page.tsx
const FALLBACK_ROOT_TO_ADMIN = process.env.NEXT_PUBLIC_ROOT_FALLBACK_ADMIN === 'true';

const LOCAL_ROOT_HOSTS = new Set(['localhost', '127.0.0.1']);
const INFRA_SUBDOMAINS = new Set(['api', 'auth', 'sso', 'cdn', 'static', 'status']);

export const config = {
  matcher: [
    /*
     * Interceta todas as rotas aplicacionais exceto:
     * - /api/*
     * - /_next/static/* e /_next/image/*
     * - ficheiros estáticos em qualquer profundidade (.png, .svg, .js, .css, .woff2, etc.)
     */
    '/((?!api/|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|mjs|map|woff|woff2|ttf|otf|webmanifest|txt|xml|pdf)$).*)',
  ],
};

function getNormalizedHost(req: NextRequest): string {
  const rawHost =
    req.headers.get('x-forwarded-host') ||
    req.headers.get('host') ||
    'localhost';
  // Em cadeias de proxies (Nginx -> Caddy -> Next.js), usa o primeiro host
  const primaryHost = rawHost.split(',')[0].trim().toLowerCase();
  return primaryHost.split(':')[0].replace(/\.$/, '');
}

function rewritePreservingQuery(req: NextRequest, targetPathname: string, extraHeaders?: Record<string, string>) {
  const rewriteUrl = req.nextUrl.clone();
  rewriteUrl.pathname = targetPathname;
  const response = NextResponse.rewrite(rewriteUrl);
  if (extraHeaders) {
    Object.entries(extraHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }
  return response;
}

function normalizePrefixedPath(pathname: string, prefix: '/admin' | '/ops' | '/portal'): string {
  const stripped = pathname.replace(new RegExp(`^${prefix}`), '');
  if (!stripped || stripped === '/') {
    return prefix;
  }
  return `${prefix}${stripped.startsWith('/') ? stripped : `/${stripped}`}`;
}

export default function middleware(req: NextRequest) {
  const hostname = getNormalizedHost(req);
  const { pathname } = req.nextUrl;

  // 1. Rotas públicas explícitas (/verify e /consent) funcionam em qualquer host
  if (pathname.startsWith('/verify') || pathname.startsWith('/consent')) {
    return NextResponse.next();
  }

  // 2. Normalização canónica de "www." (evita falha de lookup no banco de dados)
  if (hostname.startsWith('www.')) {
    const apexHost = hostname.slice(4);
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.host = apexHost;
    return NextResponse.redirect(redirectUrl, 308);
  }

  // Identificação estrita dos hosts da infraestrutura EduLink
  const isRootHost = hostname === ROOT_DOMAIN || LOCAL_ROOT_HOSTS.has(hostname);
  const isOpsHost = hostname === `ops.${ROOT_DOMAIN}` || hostname === 'ops.localhost';
  const isAdminHost = hostname === `admin.${ROOT_DOMAIN}` || hostname === 'admin.localhost';
  const isPortalHost = hostname === `portal.${ROOT_DOMAIN}` || hostname === 'portal.localhost';

  // 3. Nunca reescrever subdomínios de infraestrutura (api.edulink.ao, auth.edulink.ao) para /sites
  if (hostname.endsWith(`.${ROOT_DOMAIN}`)) {
    const sub = hostname.slice(0, -(ROOT_DOMAIN.length + 1));
    if (INFRA_SUBDOMAINS.has(sub)) {
      return NextResponse.next();
    }
  }

  // 4. Backoffice Interno EduLink (equipa operacional — /ops)
  if (isOpsHost || (isRootHost && pathname.startsWith('/ops'))) {
    return rewritePreservingQuery(req, normalizePrefixedPath(pathname, '/ops'));
  }

  // 5. Portal Administrativo da Escola (/admin)
  if (isAdminHost || (isRootHost && pathname.startsWith('/admin'))) {
    return rewritePreservingQuery(req, normalizePrefixedPath(pathname, '/admin'));
  }

  // 6. Portal PWA do Estudante / Professor (/portal)
  if (isPortalHost || (isRootHost && pathname.startsWith('/portal'))) {
    return rewritePreservingQuery(req, normalizePrefixedPath(pathname, '/portal'));
  }

  // 7. Domínio Raiz da Plataforma (edulink.ao ou localhost)
  if (isRootHost) {
    if (FALLBACK_ROOT_TO_ADMIN && pathname === '/') {
      return rewritePreservingQuery(req, '/admin');
    }
    // Serve a Landing Page pública em src/app/page.tsx (ou rotas raiz da plataforma)
    return NextResponse.next();
  }

  // 8. Sites Institucionais Multi-tenant:
  //    - Demonstração instantânea: colegio-esperanca.edulink.ao ou colegio.localhost
  //    - Domínio oficial da escola: colegio-esperanca.edu.ao (ou .co.ao / .com)
  const suffix = pathname === '/' ? '' : pathname;
  return rewritePreservingQuery(req, `/sites/${hostname}${suffix}`, {
    'x-edulink-site-host': hostname,
  });
}