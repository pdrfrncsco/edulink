---
trigger: glob
globs: "backend/**/*.py"
description: "Padrões obrigatórios de backend Django/DRF, isolamento multi-tenant, Passaporte JWT e faturação AGT."
---

# Regras de Backend — EduLink (Django / DRF)

1. **Isolamento Multi-Tenant:**
   - `SCHOOL_SECRETARY` só lê e escreve na própria escola (`profile.school_id`).
   - Secretarias nunca podem alterar `is_active`, selo/dossiê APD, pipeline (`dns_status`, `google_status`, `microsoft_status`, `canva_status`), aprovação de `OnboardingDocument` nem feature flags.
   - Nunca filtrar listas paginadas no cliente: expor sempre `filterset_fields` e suporte a `?school=<uuid>` para `PLATFORM_ADMIN`.
2. **Resolução de Domínios:**
   - Usar sempre `School.resolve_by_host()` em lookups públicos e TLS.
   - `allow_bare_slug=True` é permitido apenas em endpoints públicos de leitura (`/by-domain/`), **nunca** em `/api/v1/tenants/tls-check/` do Caddy.
   - Tratar sempre `school.domain = None` (escolas em modo demonstração) usando `school.effective_site_host`.
3. **Segurança & Passaporte:**
   - Credenciais cloud encriptadas com Fernet (AES-256) e tratamento explícito de `InvalidToken`.
   - `verify_passport_token()` deve validar `iss`, `typ='edulink_passport'`, `exp`, `user.is_active`, `user.school.is_active` e `enrollment.status == 'ACTIVE'`.
4. **Faturação AGT & SAF-T (AO):**
   - Série anual dinâmica `FT EL{ano}` com numeração e `previous_hash` isolados por `series`.
   - `saft-export` (XML `AO_1.01_01` e JSON) é exclusivo de `IsPlatformAdmin`.
   - `KWANZA_SANDBOX_ENABLED` deve falhar fechado (`False`) quando não definido.
5. **Verificação Obrigatória:** Após alterações no backend, validar com `python manage.py check`, `python manage.py makemigrations --check --dry-run` e `python manage.py test`.
