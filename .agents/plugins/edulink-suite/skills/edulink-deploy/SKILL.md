---
name: edulink-deploy
description: >-
  Configura e audita Docker Compose, Caddy On-Demand TLS, convivência com Nginx nativo (stream),
  Keycloak, backups PostgreSQL, storage privado de documentos e verificação pré-deploy da EduLink.
  Usar em tarefas de infraestrutura, deploy, DevOps, SSL/TLS ou CI/CD.
---

# EduLink Deploy & Infraestrutura de Produção

Lê `references/server-topology.md` antes de alterar `docker-compose.yml`, `infra/caddy/Caddyfile` ou scripts de servidor.

## Procedimento
1. **Respeitar o Mapa de Portas Auditado:** Nunca mapear o Caddy para `80`, `443` ou `8080`, nem expor `5432` no host. Usar `127.0.0.1:8085:80` e `127.0.0.1:8445:443`.
2. **Padronizar Nomenclatura:** Todos os contentores, redes e volumes devem usar o prefixo `edulink_` (zero resíduos `yetuedu_` ou `acadid_`).
3. **Proteger Recursos do Host (7.8 GiB RAM):** Aplicar limite `memory: 900M` no Keycloak, `concurrency=2` no Celery e garantir Swap de 2 GB no servidor.
4. **Caddy On-Demand TLS:** Validar que `ask` aponta para `http://backend:8000/api/v1/tenants/tls-check/`.
5. **Storage Privado e Backups:** Garantir que `OnboardingDocument` usa volume privado/MinIO/R2 (nunca acesso anónimo direto) e que existe script de backup diário `pg_dump` encriptado.
6. **Checklist Pré-Deploy:** Executar `scripts/verify-edulink.sh` para confirmar integridade do Git, testes Django e build Next.js antes de publicar.
