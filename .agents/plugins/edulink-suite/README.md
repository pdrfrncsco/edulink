# EduLink Engineering Suite

Plugin oficial de engenharia, produto e UI/UX para continuar o desenvolvimento da plataforma **EduLink Angola** (`pdrfrncsco/edulink`) no Google Antigravity.

## O que este plugin inclui

### Rules (Ativação Automática)
- `edulink-core`: Invariantes de negócio (Angola, `.edu.ao`, MED vs. MESCTI, marca única EduLink, conformidade APD/AGT e feature flags).
- `backend-django` (`backend/**/*.py`): Isolamento multi-tenant, `School.resolve_by_host()`, segurança Fernet/JWT e SAF-T (AO) XML.
- `frontend-nextjs` (`frontend/**/*.ts, frontend/**/*.tsx, frontend/public/sw.js`): Proteção contra hydration mismatch, segurança offline `401/403` da PWA e suporte a `domain=null`.

### Skills (Comandos `/`)
- `/edulink-sprint` — Executa sprints do backlog auditado (bloqueios P0, ambiente local fora do Docker, testes e CI).
- `/edulink-ui-ux` — Constrói a biblioteca `components/ui/`, refatora ecrãs monolíticos e garante UX mobile-first em `pt-AO`.
- `/edulink-deploy` — Configura Docker Compose, Caddy `on_demand_tls`, Nginx `stream` (`8085/8445`), Swap, Keycloak e backups.

### Servidor MCP Local (`edulink-devtools`)
- `edulink_repo_health` — Audita rastreio Git de `frontend/src/lib/*`, ícones PWA, ambiente local e resíduos de marca.
- `edulink_django_migrations` — Verifica `showmigrations --plan` e `makemigrations --check --dry-run`.
- `edulink_inspect_tenants` — Lista as escolas (`School`) via Django ORM com pipeline, feature flags e contagens.
- `edulink_probe_api` — Testa endpoints HTTP locais (`localhost` / `127.0.0.1` / `*.localhost`).
- `edulink_run_tests` — Executa a suíte de testes Django (total ou segmentada por app).

## Pré-requisitos
- Python 3.12+ e Node.js 20+ (modo local fora do Docker) ou Docker + Docker Compose.

## Validação e Instalação
```bash
agy plugin validate --strict ./.agents/plugins/edulink-suite
agy plugin install ./.agents/plugins/edulink-suite
```
