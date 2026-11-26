import { NextRequest, NextResponse } from 'next/server';

export const config = {
  matcher: [
    /*
     * Interceta todas as requisições exceto ficheiros estáticos, api e favicon:
     * - _next/static (ficheiros estáticos)
     * - _next/image (otimização de imagens)
     * - favicon.ico (ícone do browser)
     * - ficheiros com extensão (.svg, .png, .jpg, .ico, etc.)
     */
    '/((?!api/|_next/static|_next/image|favicon.ico|[\\w-]+\\.\\w+).*)',
  ],
};

export default function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = req.headers.get('host')?.split(':')[0].toLowerCase() || 'localhost';
  const pathname = url.pathname;

  // Domínios de infraestrutura da plataforma EduLink
  const isPlatformAdmin = hostname === 'admin.edulink.ao' || hostname.startsWith('admin.');
  const isPlatformPortal = hostname === 'portal.edulink.ao' || hostname.startsWith('portal.');
  const isRootPlatform = hostname === 'edulink.ao' || hostname === 'www.edulink.ao' || hostname === 'localhost' || hostname === '127.0.0.1';

  // 1. Rotas explícitas públicas (/verify e /consent)
  if (pathname.startsWith('/verify') || pathname.startsWith('/consent')) {
    return NextResponse.next();
  }

  // 2. Portal Administrativo e Onboarding da Secretaria
  if (isPlatformAdmin || pathname.startsWith('/admin')) {
    const cleanPath = pathname.replace(/^\/admin/, '');
    const targetPath = cleanPath && cleanPath !== '/' ? `/admin${cleanPath}` : '/admin';
    return NextResponse.rewrite(new URL(targetPath, req.url));
  }

  // 3. Portal do Aluno/Professor (PWA Cartão Académico)
  if (isPlatformPortal || pathname.startsWith('/portal')) {
    const cleanPath = pathname.replace(/^\/portal/, '');
    const targetPath = cleanPath && cleanPath !== '/' ? `/portal${cleanPath}` : '/portal';
    return NextResponse.rewrite(new URL(targetPath, req.url));
  }

  // 4. Domínios Institucionais Escolares (.edu.ao ou subdomínios locais de teste)
  // Exemplo: colegio-esperanca.edu.ao ou colegio1.localhost
  if (!isRootPlatform) {
    const currentDomain = hostname;
    const suffix = pathname === '/' ? '' : pathname;
    return NextResponse.rewrite(new URL(`/sites/${currentDomain}${suffix}`, req.url));
  }

  // 5. Root Domain Fallback (Landing Page / Onboarding rápido)
  const suffix = pathname === '/' ? '' : pathname;
  return NextResponse.rewrite(new URL(`/admin${suffix}`, req.url));
}
