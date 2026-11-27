# Backlog Auditado da EduLink (Base: Commit `fda499e`)

## Bloqueios P0 (Corrigir Primeiro)
1. **`.gitignore` oculta `frontend/src/lib/`:** Substituir `lib/` por `/backend/lib/` (ou adicionar `!frontend/src/lib/` e `!frontend/src/lib/**`) e commitar `auth.ts`, `siteUrls.ts` e `siteServerContext.ts`.
2. **Ícones PWA em falta:** Criar `frontend/public/icons/icon-192.png` e `icon-512.png` (`#0f766e`, monograma `E`).
3. **Hydration Mismatch em `isClientLocalHost()`:** Corrigir chamadas durante o render em `admin/page.tsx` e `OnboardingTab.tsx` usando hook pós-montagem (`useEffect`).
4. **Landing Page (`app/page.tsx`):** Proteger `requestHost` contra Host Header Injection (allowlist ou `NEXT_PUBLIC_ROOT_DOMAIN`) e evitar SSR desnecessário.
5. **Limpeza de peso no Git:** Remover `docs/Estudo sobre O sector edtech angola.pdf` (4,52 MB) do versionamento.

## Sprint 1 — Ambiente Local Fora do Docker & Contratos
- Criar `backend/config/settings_local.py` (SQLite + Celery EAGER + `MEDIA_ROOT` + opt-in `USE_LOCAL_POSTGRES`/`USE_LOCAL_REDIS`).
- Servir `MEDIA_URL` sob `if settings.DEBUG:` em `backend/config/urls.py`.
- Parametrizar `BACKEND_INTERNAL_URL` em `frontend/next.config.mjs` (fallback `http://127.0.0.1:8000`).
- Registar `OnboardingDocument` em `backend/apps/tenants/admin.py`.
- Consolidar todos os novos campos da API em `frontend/src/components/admin/types.ts` e remover tipos duplicados (`ExtendedSchool`, `ExtendedAuthUser`).
- Atualizar `.env.example` e `README.md`.

## Sprint 2 — Fecho Funcional do MVP Piloto & Testes
- **`PlatformOpsTab.tsx`:** Adicionar painel para revisar (aprovar/rejeitar) os 4 `OnboardingDocument` (`/tenants/<id>/documents/<doc_id>/review/`), atualizar estados do pipeline (`dns_status`, `google_status`, `microsoft_status`, `canva_status`) e alternar feature flags.
- **Compatibilidade `domain=null`:** Auditar `DirectoryTab.tsx` (pré-validação visual CSV + link de download de `samples/turma_exemplo_angola.csv`), `ProvisioningTab.tsx`, `DomainsDNSTab.tsx`, `ComplianceAPDTab.tsx` e `ERPAndVerifiersTab.tsx`.
- **Fluxos Públicos:** Atualizar `frontend/src/app/verify/page.tsx` (usar `school_primary_color`, `school_logo_url`, `institution_type`, selo APD) e rever `frontend/src/app/consent/page.tsx` em mobile.
- **Testes & CI:** Expandir `tenants/tests.py`, `passport/tests.py` e `billing/tests.py`; criar `.github/workflows/ci.yml` (`manage.py test` + `npm run build`).
