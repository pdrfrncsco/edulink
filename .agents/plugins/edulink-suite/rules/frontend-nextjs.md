---
trigger: glob
globs: "frontend/**/*.ts, frontend/**/*.tsx, frontend/public/sw.js"
description: "Regras de Next.js App Router, segurança offline PWA, roteamento multi-domínio e UI/UX."
---

# Regras de Frontend — EduLink (Next.js / TypeScript / Tailwind)

1. **Zero Hydration Mismatch:** Nunca ler `window.location` ou `isClientLocalHost()` diretamente no render SSR de Client Components. Resolver no cliente após montagem (`useEffect`) ou via `NEXT_PUBLIC_*`.
2. **Segurança Offline da PWA (`/portal`):**
   - Respostas HTTP `401` ou `403` devem limpar imediatamente `edulink_offline_passport_cache` e encerrar a sessão.
   - Ativar fallback offline apenas em erro real de rede (`TypeError` ou `!navigator.onLine`).
   - Em `sw.js`, fazer cache runtime de `/_next/static/*` e `/icons/*`; nunca guardar `/api/*`, `/admin` ou `/ops`.
3. **Middleware Multi-Domínio (`src/middleware.ts`):**
   - Preservar sempre query strings com `req.nextUrl.clone()`.
   - Ignorar ficheiros estáticos em qualquer profundidade de pasta.
   - Redirecionar `www.` (308), proteger subdomínios de infraestrutura (`api`, `auth`, `sso`, `cdn`, `static`, `status`) e não colidir domínios escolares com `admin.` / `portal.`.
4. **Resiliência a `domain = null`:** Qualquer página ou componente administrativo deve usar `effective_site_host` / `preview_slug` quando `school.domain` for nulo.
5. **Formulários e Tipagem:**
   - Zero dados fictícios hardcoded no `useState` inicial (usar `placeholder`).
   - Centralizar interfaces da API em `frontend/src/components/admin/types.ts` (evitar *type casts* inline).
   - Validar sempre com `npm run build` sem erros TypeScript.
