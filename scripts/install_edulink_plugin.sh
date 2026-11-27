#!/usr/bin/env bash
set -euo pipefail

# Valida, testa e instala o plugin EduLink Engineering Suite (.agents/plugins/edulink-suite).
# Uso:
#   ./scripts/install_edulink_plugin.sh            # Valida e prepara o plugin no workspace
#   ./scripts/install_edulink_plugin.sh --global   # Instala também em ~/.gemini/config/plugins/edulink-suite

GLOBAL_INSTALL=0
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --global)
      GLOBAL_INSTALL=1
      shift
      ;;
    --root)
      TARGET_ROOT="$(cd "$2" && pwd)"
      shift 2
      ;;
    -h|--help)
      echo "Uso: $0 [--global] [--root <caminho-repo>]"
      exit 0
      ;;
    *)
      echo "Argumento desconhecido: $1" >&2
      exit 1
      ;;
  esac
done

PLUGIN_DIR="${TARGET_ROOT}/.agents/plugins/edulink-suite"
echo "==> Raiz do repositório: ${TARGET_ROOT}"
echo "==> Plugin alvo: ${PLUGIN_DIR}"

# 1. Verificar integridade da árvore do plugin
REQUIRED_FILES=(
  "plugin.json"
  "README.md"
  "mcp_config.json"
  "mcp/edulink_mcp_server.py"
  "rules/edulink-core.md"
  "rules/backend-django.md"
  "rules/frontend-nextjs.md"
  "skills/edulink-sprint/SKILL.md"
  "skills/edulink-sprint/references/backlog-and-audit.md"
  "skills/edulink-ui-ux/SKILL.md"
  "skills/edulink-ui-ux/references/design-system.md"
  "skills/edulink-deploy/SKILL.md"
  "skills/edulink-deploy/references/server-topology.md"
  "skills/edulink-deploy/scripts/verify-edulink.sh"
)

for rel in "${REQUIRED_FILES[@]}"; do
  if [[ ! -f "${PLUGIN_DIR}/${rel}" ]]; then
    echo "ERRO: Ficheiro do plugin em falta: ${PLUGIN_DIR}/${rel}" >&2
    exit 1
  fi
done
echo "[OK] Todos os ${#REQUIRED_FILES[@]} ficheiros do plugin encontrados."

# 2. Garantir permissões de execução nos scripts
chmod +x "${PLUGIN_DIR}/mcp/edulink_mcp_server.py" \
         "${PLUGIN_DIR}/skills/edulink-deploy/scripts/verify-edulink.sh"

# 3. Localizar Python 3
if command -v python3 >/dev/null 2>&1; then
  PYTHON_BIN="python3"
elif command -v python >/dev/null 2>&1; then
  PYTHON_BIN="python"
else
  echo "ERRO: Python 3 não encontrado no PATH." >&2
  exit 1
fi
echo "[OK] Python detetado: $(command -v "${PYTHON_BIN}")"

# 4. Validar sintaxe e smoke test JSON-RPC do servidor MCP
"${PYTHON_BIN}" -m py_compile "${PLUGIN_DIR}/mcp/edulink_mcp_server.py"

SMOKE_OUT="$(
  EDULINK_REPO_ROOT="${TARGET_ROOT}" "${PYTHON_BIN}" -u "${PLUGIN_DIR}/mcp/edulink_mcp_server.py" <<'EOF'
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05"}}
{"jsonrpc":"2.0","id":2,"method":"tools/list"}
EOF
)"

if ! grep -q '"edulink_repo_health"' <<<"${SMOKE_OUT}"; then
  echo "ERRO: Smoke test do servidor MCP falhou." >&2
  echo "${SMOKE_OUT}" >&2
  exit 1
fi
echo "[OK] Servidor MCP edulink-devtools validado (initialize + tools/list)."

if ! command -v python >/dev/null 2>&1; then
  echo "[AVISO] 'python' não está no PATH (apenas 'python3'). Se necessário, ajusta 'command' em ${PLUGIN_DIR}/mcp_config.json para 'python3'."
fi

# 5. Validar/instalar com `agy` CLI se disponível
if command -v agy >/dev/null 2>&1; then
  echo "==> A validar com agy plugin validate --strict..."
  agy plugin validate --strict "${PLUGIN_DIR}"
  echo "[OK] Validação estrita do Antigravity passou."

  if [[ "${GLOBAL_INSTALL}" -eq 1 ]]; then
    echo "==> A instalar globalmente com agy plugin install..."
    agy plugin install "${PLUGIN_DIR}"
    echo "[OK] Plugin instalado globalmente via agy CLI."
  fi
else
  echo "[INFO] CLI 'agy' não encontrada no PATH; descoberta por workspace (.agents/plugins/) está ativa no IDE."

  if [[ "${GLOBAL_INSTALL}" -eq 1 ]]; then
    GLOBAL_DIR="${HOME}/.gemini/config/plugins/edulink-suite"
    rm -rf "${GLOBAL_DIR}"
    mkdir -p "$(dirname "${GLOBAL_DIR}")"
    cp -R "${PLUGIN_DIR}" "${GLOBAL_DIR}"

    "${PYTHON_BIN}" - "${GLOBAL_DIR}/mcp_config.json" "${TARGET_ROOT}" "${PYTHON_BIN}" <<'PY'
import pathlib, sys
cfg_path = pathlib.Path(sys.argv[1])
repo_root = sys.argv[2]
py_bin = sys.argv[3]
text = cfg_path.read_text(encoding='utf-8').replace('${workspaceFolder}', repo_root)
text = text.replace('"command": "python"', f'"command": "{py_bin}"')
cfg_path.write_text(text, encoding='utf-8')
PY
    echo "[OK] Plugin copiado para ${GLOBAL_DIR}."
  fi
fi

echo ""
echo "Instalação concluída. Comandos disponíveis no Antigravity:"
echo "  /edulink-sprint  |  /edulink-ui-ux  |  /edulink-deploy"
echo "  Ferramentas MCP: edulink_repo_health, edulink_django_migrations, edulink_inspect_tenants, edulink_probe_api, edulink_run_tests"
