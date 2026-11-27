#!/usr/bin/env python3
"""
Servidor MCP local (JSON-RPC 2.0 sobre stdio) para a plataforma EduLink Angola.
Sem dependências externas: usa apenas a biblioteca padrão do Python 3.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

SERVER_NAME = 'edulink-devtools'
SERVER_VERSION = '1.1.0'
DEFAULT_PROTOCOL_VERSION = '2024-11-05'

# Garante UTF-8 estrito em Windows e Linux/macOS
if hasattr(sys.stdin, 'reconfigure'):
    sys.stdin.reconfigure(encoding='utf-8')
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')


def get_repo_root() -> Path:
    env_root = os.environ.get('EDULINK_REPO_ROOT', '').strip()
    if env_root:
        candidate = Path(env_root).resolve()
        if candidate.exists():
            return candidate
    # Fallback: sobe a partir de .agents/plugins/edulink-suite/mcp/
    return Path(__file__).resolve().parents[4]


def resolve_backend_python(repo_root: Path) -> str:
    """Usa o Python do .venv local do backend se existir (Windows ou Unix)."""
    candidates = [
        repo_root / 'backend' / '.venv' / 'Scripts' / 'python.exe',
        repo_root / 'backend' / '.venv' / 'bin' / 'python',
        repo_root / '.venv' / 'Scripts' / 'python.exe',
        repo_root / '.venv' / 'bin' / 'python',
    ]
    for path in candidates:
        if path.exists():
            return str(path)
    return sys.executable


def build_django_env(settings_module: str | None = None) -> dict[str, str]:
    env = os.environ.copy()
    env['PYTHONUTF8'] = '1'
    env['PYTHONIOENCODING'] = 'utf-8'
    if settings_module:
        env['DJANGO_SETTINGS_MODULE'] = settings_module
    else:
        env.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings_local')
    return env


def run_cmd(
    args: list[str],
    cwd: Path,
    env: dict[str, str] | None = None,
    timeout: int = 90,
) -> dict[str, Any]:
    started = time.monotonic()
    try:
        proc = subprocess.run(
            args,
            cwd=str(cwd),
            env=env,
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='replace',
            timeout=timeout,
        )
        return {
            'ok': proc.returncode == 0,
            'returncode': proc.returncode,
            'duration_ms': round((time.monotonic() - started) * 1000),
            'stdout': proc.stdout,
            'stderr': proc.stderr,
        }
    except subprocess.TimeoutExpired as exc:
        return {
            'ok': False,
            'returncode': -1,
            'duration_ms': round((time.monotonic() - started) * 1000),
            'stdout': (exc.stdout or '') if isinstance(exc.stdout, str) else '',
            'stderr': f'Comando excedeu timeout de {timeout}s.',
        }
    except OSError as exc:
        return {
            'ok': False,
            'returncode': -1,
            'duration_ms': round((time.monotonic() - started) * 1000),
            'stdout': '',
            'stderr': str(exc),
        }


# ---------------------------------------------------------------------------
# Ferramentas MCP
# ---------------------------------------------------------------------------


def tool_repo_health(_args: dict[str, Any]) -> dict[str, Any]:
    root = get_repo_root()
    checks: dict[str, Any] = {'repo_root': str(root)}

    # 1. Verificar se frontend/src/lib/* existe e está rastreado no Git
    lib_files = [
        'frontend/src/lib/auth.ts',
        'frontend/src/lib/siteUrls.ts',
        'frontend/src/lib/siteServerContext.ts',
    ]
    lib_report = []
    for rel in lib_files:
        exists = (root / rel).exists()
        tracked = False
        if exists:
            res = run_cmd(['git', 'ls-files', '--error-unmatch', rel], cwd=root, timeout=10)
            tracked = res['ok']
        lib_report.append({'file': rel, 'exists': exists, 'git_tracked': tracked})
    checks['frontend_lib_files'] = lib_report

    # 2. Verificar ícones PWA e ambiente local fora do Docker
    expected_assets = [
        'frontend/public/icons/icon-192.png',
        'frontend/public/icons/icon-512.png',
        'backend/config/settings_local.py',
        'backend/.env.local',
        'frontend/.env.local',
    ]
    checks['expected_files'] = {rel: (root / rel).exists() for rel in expected_assets}

    # 3. Verificar ficheiros sensíveis ou pesados rastreados no Git
    risky_tracked = []
    for rel in ('.env', 'docs/Estudo sobre O sector edtech angola.pdf'):
        res = run_cmd(['git', 'ls-files', '--error-unmatch', rel], cwd=root, timeout=10)
        if res['ok']:
            risky_tracked.append(rel)
    checks['risky_git_tracked_files'] = risky_tracked

    # 4. Procurar resíduos de marca antiga em backend/ e frontend/src/
    brand_pattern = re.compile(r'\b(yetuedu|acadid|ye2026)\b', re.IGNORECASE)
    brand_hits: list[dict[str, Any]] = []
    for base in (root / 'backend' / 'apps', root / 'frontend' / 'src'):
        if not base.exists():
            continue
        for file_path in base.rglob('*'):
            if file_path.suffix not in {'.py', '.ts', '.tsx', '.js', '.json', '.html'}:
                continue
            if '__pycache__' in file_path.parts or 'migrations' in file_path.parts:
                continue
            try:
                text = file_path.read_text(encoding='utf-8', errors='ignore')
            except OSError:
                continue
            for idx, line in enumerate(text.splitlines(), start=1):
                if brand_pattern.search(line):
                    brand_hits.append({
                        'file': str(file_path.relative_to(root)),
                        'line': idx,
                        'snippet': line.strip()[:140],
                    })
                    if len(brand_hits) >= 25:
                        break
            if len(brand_hits) >= 25:
                break
    checks['residual_brand_references'] = brand_hits

    # 5. Último commit e resumo git status
    head = run_cmd(['git', 'log', '-1', '--oneline'], cwd=root, timeout=10)
    status = run_cmd(['git', 'status', '--short'], cwd=root, timeout=10)
    checks['git_head'] = head['stdout'].strip()
    checks['git_dirty_files'] = [line for line in status['stdout'].splitlines() if line.strip()][:30]

    return checks


def tool_django_migrations(args: dict[str, Any]) -> dict[str, Any]:
    root = get_repo_root()
    backend_dir = root / 'backend'
    py = resolve_backend_python(root)
    settings_mod = args.get('settings_module') or None
    env = build_django_env(settings_mod)

    show = run_cmd([py, 'manage.py', 'showmigrations', '--plan'], cwd=backend_dir, env=env)
    dry_run = run_cmd(
        [py, 'manage.py', 'makemigrations', '--check', '--dry-run'],
        cwd=backend_dir,
        env=env,
    )

    applied: list[str] = []
    pending: list[str] = []
    for line in show['stdout'].splitlines():
        stripped = line.strip()
        if stripped.startswith('[X]'):
            applied.append(stripped[3:].strip())
        elif stripped.startswith('[ ]'):
            pending.append(stripped[3:].strip())

    return {
        'python_executable': py,
        'settings_module': env['DJANGO_SETTINGS_MODULE'],
        'applied_count': len(applied),
        'pending_count': len(pending),
        'pending_migrations': pending,
        'model_changes_without_migration': not dry_run['ok'],
        'makemigrations_output': (dry_run['stdout'] or dry_run['stderr']).strip(),
        'errors': show['stderr'].strip() if not show['ok'] else '',
    }


def tool_inspect_tenants(args: dict[str, Any]) -> dict[str, Any]:
    root = get_repo_root()
    backend_dir = root / 'backend'
    py = resolve_backend_python(root)
    settings_mod = args.get('settings_module') or None
    limit = max(1, min(int(args.get('limit', 50)), 200))
    env = build_django_env(settings_mod)

    inspector_code = f"""
import json
from apps.tenants.models import School

rows = []
for s in School.objects.prefetch_related('onboarding_documents', 'cloud_integrations', 'academic_users').all()[:{limit}]:
    docs = list(s.onboarding_documents.all())
    users = list(s.academic_users.all())
    rows.append({{
        'id': str(s.id),
        'name': s.name,
        'institution_type': getattr(s, 'institution_type', None),
        'nif': s.nif,
        'preview_slug': getattr(s, 'preview_slug', None),
        'domain': s.domain,
        'effective_site_host': getattr(s, 'effective_site_host', s.domain),
        'is_active': s.is_active,
        'apd_notified': s.apd_notified,
        'pipeline': {{
            'dns': getattr(s, 'dns_status', None),
            'google': getattr(s, 'google_status', None),
            'microsoft': getattr(s, 'microsoft_status', None),
            'canva': getattr(s, 'canva_status', None),
        }},
        'feature_flags': {{
            'erp_sync': getattr(s, 'enable_erp_sync', False),
            'benefits_club': getattr(s, 'enable_benefits_club', False),
            'online_payments': getattr(s, 'enable_online_payments', False),
        }},
        'counts': {{
            'students': sum(1 for u in users if u.role == 'STUDENT'),
            'teachers': sum(1 for u in users if u.role == 'TEACHER'),
            'docs_uploaded': len(docs),
            'docs_approved': sum(1 for d in docs if d.status == 'APPROVED'),
            'cloud_integrations': len(list(s.cloud_integrations.all())),
        }},
    }})
print('__EDULINK_JSON_START__')
print(json.dumps({{'total_returned': len(rows), 'schools': rows}}, ensure_ascii=False))
"""
    res = run_cmd([py, 'manage.py', 'shell', '-c', inspector_code], cwd=backend_dir, env=env)
    if not res['ok']:
        return {
            'ok': False,
            'settings_module': env['DJANGO_SETTINGS_MODULE'],
            'stderr': res['stderr'].strip(),
            'stdout': res['stdout'].strip(),
        }

    marker = '__EDULINK_JSON_START__'
    raw = res['stdout'].split(marker, 1)[-1].strip() if marker in res['stdout'] else res['stdout'].strip()
    try:
        parsed = json.loads(raw)
        parsed['ok'] = True
        parsed['settings_module'] = env['DJANGO_SETTINGS_MODULE']
        return parsed
    except json.JSONDecodeError:
        return {'ok': False, 'error': 'Falha ao descodificar saída JSON do ORM.', 'raw': raw[:1000]}


def tool_probe_api(args: dict[str, Any]) -> dict[str, Any]:
    url = str(args.get('url', '')).strip()
    method = str(args.get('method', 'GET')).upper()
    host_header = str(args.get('host_header', '')).strip()
    bearer_token = str(args.get('bearer_token', '')).strip()
    body_obj = args.get('json_body')

    if method not in {'GET', 'POST', 'HEAD', 'OPTIONS'}:
        return {'ok': False, 'error': f'Método HTTP não suportado para probe: {method}'}

    parsed = urlparse(url)
    hostname = (parsed.hostname or '').lower()
    is_local = hostname in {'127.0.0.1', 'localhost', '::1'} or hostname.endswith('.localhost')
    if parsed.scheme not in {'http', 'https'} or not is_local:
        return {
            'ok': False,
            'error': 'Por segurança, edulink_probe_api aceita apenas destinos locais (localhost, 127.0.0.1 ou *.localhost).',
        }

    headers = {'Accept': 'application/json, text/html;q=0.9'}
    if host_header:
        headers['Host'] = host_header
    if bearer_token:
        headers['Authorization'] = f'Bearer {bearer_token}'

    data_bytes = None
    if body_obj is not None:
        headers['Content-Type'] = 'application/json'
        data_bytes = json.dumps(body_obj).encode('utf-8')

    req = Request(url, data=data_bytes, headers=headers, method=method)
    started = time.monotonic()

    def _decode_body(raw_bytes: bytes, content_type: str) -> Any:
        text = raw_bytes.decode('utf-8', errors='replace')
        if 'application/json' in content_type.lower():
            try:
                return json.loads(text)
            except json.JSONDecodeError:
                pass
        return text[:2000]

    try:
        with urlopen(req, timeout=15) as resp:
            ctype = resp.headers.get('Content-Type', '')
            payload = _decode_body(resp.read(65536), ctype)
            return {
                'ok': True,
                'status': resp.status,
                'duration_ms': round((time.monotonic() - started) * 1000),
                'content_type': ctype,
                'headers': {
                    k: resp.headers.get(k)
                    for k in ('Location', 'X-Edulink-Site-Host', 'Content-Disposition')
                    if resp.headers.get(k)
                },
                'body': payload,
            }
    except HTTPError as err:
        ctype = err.headers.get('Content-Type', '') if err.headers else ''
        payload = _decode_body(err.read(65536), ctype)
        return {
            'ok': False,
            'status': err.code,
            'duration_ms': round((time.monotonic() - started) * 1000),
            'content_type': ctype,
            'body': payload,
        }
    except URLError as err:
        return {
            'ok': False,
            'status': None,
            'duration_ms': round((time.monotonic() - started) * 1000),
            'error': f'Ligação falhou (o servidor local está a correr?): {err.reason}',
        }


def tool_run_tests(args: dict[str, Any]) -> dict[str, Any]:
    root = get_repo_root()
    backend_dir = root / 'backend'
    py = resolve_backend_python(root)
    settings_mod = args.get('settings_module') or None
    targets = args.get('targets') or []
    env = build_django_env(settings_mod)

    safe_targets = [
        str(t).strip()
        for t in targets
        if re.fullmatch(r'[a-zA-Z0-9_.]+', str(t).strip())
    ]
    cmd = [py, 'manage.py', 'test', '--verbosity=2', *safe_targets]
    res = run_cmd(cmd, cwd=backend_dir, env=env, timeout=180)
    combined = (res['stdout'] + '\n' + res['stderr']).strip()

    return {
        'ok': res['ok'],
        'returncode': res['returncode'],
        'duration_ms': res['duration_ms'],
        'settings_module': env['DJANGO_SETTINGS_MODULE'],
        'targets': safe_targets or ['(todos)'],
        'output_tail': '\n'.join(combined.splitlines()[-60:]),
    }


TOOLS: dict[str, dict[str, Any]] = {
    'edulink_repo_health': {
        'description': (
            'Audita a saúde do repositório EduLink: rastreio Git de frontend/src/lib/*, '
            'ícones PWA, ficheiros de arranque local, ficheiros sensíveis/pesados e referências residuais de marca.'
        ),
        'inputSchema': {
            'type': 'object',
            'properties': {},
            'additionalProperties': False,
        },
        'handler': tool_repo_health,
    },
    'edulink_django_migrations': {
        'description': (
            'Inspeciona migrações aplicadas/pendentes no backend Django e verifica se existem '
            'alterações nos modelos sem migração gerada.'
        ),
        'inputSchema': {
            'type': 'object',
            'properties': {
                'settings_module': {
                    'type': 'string',
                    'description': 'Opcional. Padrão: config.settings_local.',
                },
            },
            'additionalProperties': False,
        },
        'handler': tool_django_migrations,
    },
    'edulink_inspect_tenants': {
        'description': (
            'Consulta as escolas (School) via Django ORM devolvendo preview_slug, domain, '
            'institution_type, pipeline DNS/Google/MS/Canva, feature flags e contagens de alunos/documentos.'
        ),
        'inputSchema': {
            'type': 'object',
            'properties': {
                'limit': {
                    'type': 'integer',
                    'minimum': 1,
                    'maximum': 200,
                    'default': 50,
                },
                'settings_module': {
                    'type': 'string',
                    'description': 'Opcional. Padrão: config.settings_local.',
                },
            },
            'additionalProperties': False,
        },
        'handler': tool_inspect_tenants,
    },
    'edulink_probe_api': {
        'description': (
            'Executa pedidos HTTP de diagnóstico contra o backend Django ou frontend Next.js locais '
            '(apenas localhost, 127.0.0.1 ou *.localhost).'
        ),
        'inputSchema': {
            'type': 'object',
            'required': ['url'],
            'properties': {
                'url': {
                    'type': 'string',
                    'description': 'Ex.: http://127.0.0.1:8000/api/v1/tenants/by-domain/?domain=escola.localhost',
                },
                'method': {
                    'type': 'string',
                    'enum': ['GET', 'POST', 'HEAD', 'OPTIONS'],
                    'default': 'GET',
                },
                'host_header': {
                    'type': 'string',
                    'description': 'Cabeçalho Host opcional para testar roteamento multi-domínio.',
                },
                'bearer_token': {
                    'type': 'string',
                    'description': 'Token JWT opcional para endpoints autenticados.',
                },
                'json_body': {
                    'type': 'object',
                    'description': 'Corpo JSON opcional para pedidos POST.',
                },
            },
            'additionalProperties': False,
        },
        'handler': tool_probe_api,
    },
    'edulink_run_tests': {
        'description': (
            'Executa a suíte de testes Django (total ou por módulos específicos como apps.tenants, apps.billing).'
        ),
        'inputSchema': {
            'type': 'object',
            'properties': {
                'targets': {
                    'type': 'array',
                    'items': {'type': 'string'},
                    'description': 'Ex.: ["apps.tenants", "apps.passport", "apps.billing"]',
                },
                'settings_module': {
                    'type': 'string',
                    'description': 'Opcional. Padrão: config.settings_local.',
                },
            },
            'additionalProperties': False,
        },
        'handler': tool_run_tests,
    },
}


# ---------------------------------------------------------------------------
# Loop JSON-RPC 2.0 (MCP stdio)
# ---------------------------------------------------------------------------


def send_message(payload: dict[str, Any]) -> None:
    sys.stdout.write(json.dumps(payload, ensure_ascii=False) + '\n')
    sys.stdout.flush()


def handle_request(message: dict[str, Any]) -> dict[str, Any] | None:
    req_id = message.get('id')
    method = message.get('method', '')
    params = message.get('params') or {}

    # Notificações JSON-RPC (sem id) não devolvem resposta
    if req_id is None:
        return None

    if method == 'initialize':
        client_version = params.get('protocolVersion') or DEFAULT_PROTOCOL_VERSION
        return {
            'jsonrpc': '2.0',
            'id': req_id,
            'result': {
                'protocolVersion': client_version,
                'capabilities': {'tools': {}},
                'serverInfo': {'name': SERVER_NAME, 'version': SERVER_VERSION},
            },
        }

    if method == 'ping':
        return {'jsonrpc': '2.0', 'id': req_id, 'result': {}}

    if method == 'tools/list':
        tool_list = [
            {
                'name': name,
                'description': meta['description'],
                'inputSchema': meta['inputSchema'],
            }
            for name, meta in TOOLS.items()
        ]
        return {'jsonrpc': '2.0', 'id': req_id, 'result': {'tools': tool_list}}

    if method == 'tools/call':
        tool_name = params.get('name', '')
        tool_args = params.get('arguments') or {}
        tool = TOOLS.get(tool_name)
        if not tool:
            return {
                'jsonrpc': '2.0',
                'id': req_id,
                'error': {'code': -32601, 'message': f'Ferramenta desconhecida: {tool_name}'},
            }

        try:
            result = tool['handler'](tool_args)
            return {
                'jsonrpc': '2.0',
                'id': req_id,
                'result': {
                    'content': [
                        {
                            'type': 'text',
                            'text': json.dumps(result, ensure_ascii=False, indent=2),
                        }
                    ],
                    'isError': False,
                },
            }
        except Exception as exc:  # noqa: BLE001
            return {
                'jsonrpc': '2.0',
                'id': req_id,
                'result': {
                    'content': [{'type': 'text', 'text': f'Erro ao executar {tool_name}: {exc}'}],
                    'isError': True,
                },
            }

    return {
        'jsonrpc': '2.0',
        'id': req_id,
        'error': {'code': -32601, 'message': f'Método não suportado: {method}'},
    }


def main() -> None:
    for raw_line in sys.stdin:
        line = raw_line.strip()
        if not line:
            continue
        try:
            message = json.loads(line)
        except json.JSONDecodeError as exc:
            send_message({
                'jsonrpc': '2.0',
                'id': None,
                'error': {'code': -32700, 'message': f'JSON inválido: {exc}'},
            })
            continue

        response = handle_request(message)
        if response is not None:
            send_message(response)


if __name__ == '__main__':
    main()
