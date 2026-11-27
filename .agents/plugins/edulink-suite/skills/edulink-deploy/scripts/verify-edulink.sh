#!/usr/bin/env bash
set -euo pipefail

echo "==> 1. A verificar integridade de frontend/src/lib no Git..."
for f in frontend/src/lib/auth.ts frontend/src/lib/siteUrls.ts frontend/src/lib/siteServerContext.ts; do
  if [ -f "$f" ] && ! git ls-files --error-unmatch "$f" >/dev/null 2>&1; then
    echo "ERRO P0: $f existe localmente mas não está rastreado no Git (.gitignore)."
    exit 1
  fi
done

echo "==> 2. A verificar ícones PWA..."
for icon in frontend/public/icons/icon-192.png frontend/public/icons/icon-512.png; do
  if [ ! -f "$icon" ]; then
    echo "AVISO: Ícone PWA ausente: $icon"
  fi
done

echo "==> 3. A validar Backend Django..."
(
  cd backend
  export DJANGO_SETTINGS_MODULE="${DJANGO_SETTINGS_MODULE:-config.settings_local}"
  python3 manage.py check
  python3 manage.py makemigrations --check --dry-run
  python3 manage.py test
)

echo "==> 4. A validar Build Frontend Next.js..."
(
  cd frontend
  npm run build
)

echo "==> Verificação EduLink concluída com sucesso."
