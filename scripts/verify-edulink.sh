#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> [1/4] Verificar higiene do repositório Git..."
if git status --porcelain | grep -E '(\.env$|db\.sqlite3$)' >/dev/null; then
  echo "ERRO: Ficheiro sensível (.env ou db.sqlite3) detetado no git status." >&2
  exit 1
fi

echo "==> [2/4] Validar configuração Docker Compose (Local + Produção)..."
docker compose config >/dev/null
docker compose -f docker-compose.yml -f docker-compose.prod.yml config >/dev/null

echo "==> [3/4] Executar checks e suíte de testes Django..."
(
  cd backend
  DJANGO_SETTINGS_MODULE=config.settings_local python3 manage.py check
  DJANGO_SETTINGS_MODULE=config.settings_local python3 manage.py test -v 2
)

echo "==> [4/4] Executar build de produção Next.js..."
(
  cd frontend
  npm ci
  npm run build
)

echo "Checklist pré-deploy EduLink concluído com sucesso."
