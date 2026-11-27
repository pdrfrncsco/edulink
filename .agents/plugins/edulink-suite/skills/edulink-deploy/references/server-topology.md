# Topologia Auditada do Servidor de Produção

## Rede e Proxy (Nginx Nativo + Caddy Docker)
- **Nginx nativo (`80/443`):** Mantém os 31 domínios existentes (`angolanway.uk`, `awayuk.co.uk`, `bolayetu.com`, `eclezzia.com`, `ndeas.cloud`, `kuid.me`) encaminhados via `stream` (`ssl_preread on`) para `127.0.0.1:8444`.
- **Caddy Docker (`127.0.0.1:8085` HTTP / `127.0.0.1:8445` HTTPS):** Recebe o `default` do `stream` (domínios `edulink.ao`, `*.edulink.ao`, `api.edulink.ao`, `auth.edulink.ao` e todos os `*.edu.ao` das escolas).
- **Portas Ocupadas no Host (PROIBIDO USAR):** `80`, `443`, `1935`, `3000`, `3002`, `3003`, `5432`, `8001`, `8004`, `8006`, `8007`, `8009`, `8010`, `8011`, `8080`, `8088`, `9000`.
- **PostgreSQL Docker:** Apenas na rede interna Docker (sem `ports:` expostos no host).
- **Memória:** Host com 7.8 GiB RAM (configurar 2 GB de Swap) e `deploy.resources.limits.memory: 900M` no Keycloak.
