<#
.SYNOPSIS
    Valida, testa e instala o plugin EduLink Engineering Suite (.agents/plugins/edulink-suite).

.DESCRIPTION
    Verifica os ficheiros do plugin no repositório, valida a sintaxe e o protocolo
    JSON-RPC do servidor MCP (edulink-devtools) e, opcionalmente, instala o plugin
    globalmente em ~/.gemini/config/plugins/edulink-suite ou via CLI `agy`.

.PARAMETER Global
    Instala também o plugin no diretório global do Antigravity (~/.gemini/config/plugins/edulink-suite).
    Por omissão, mantém apenas a descoberta automática por workspace (.agents/plugins/).

.PARAMETER TargetRoot
    Caminho raiz do repositório onde está .agents/plugins/edulink-suite (padrão: pai de scripts/).

.EXAMPLE
    .\scripts\install_edulink_plugin.ps1
    .\scripts\install_edulink_plugin.ps1 -Global
#>
[CmdletBinding()]
param(
    [switch]$Global,
    [string]$TargetRoot = ""
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

if ([string]::IsNullOrWhiteSpace($TargetRoot)) {
    $TargetRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
} else {
    $TargetRoot = (Resolve-Path $TargetRoot).Path
}

$PluginRelPath = Join-Path ".agents" (Join-Path "plugins" "edulink-suite")
$PluginDir = Join-Path $TargetRoot $PluginRelPath

Write-Host "==> Raiz do repositório: $TargetRoot" -ForegroundColor Cyan
Write-Host "==> Plugin alvo: $PluginDir" -ForegroundColor Cyan

# 1. Verificar integridade da árvore do plugin
$RequiredFiles = @(
    "plugin.json",
    "README.md",
    "mcp_config.json",
    "mcp/edulink_mcp_server.py",
    "rules/edulink-core.md",
    "rules/backend-django.md",
    "rules/frontend-nextjs.md",
    "skills/edulink-sprint/SKILL.md",
    "skills/edulink-sprint/references/backlog-and-audit.md",
    "skills/edulink-ui-ux/SKILL.md",
    "skills/edulink-ui-ux/references/design-system.md",
    "skills/edulink-deploy/SKILL.md",
    "skills/edulink-deploy/references/server-topology.md",
    "skills/edulink-deploy/scripts/verify-edulink.sh"
)

$Missing = @()
foreach ($rel in $RequiredFiles) {
    $full = Join-Path $PluginDir ($rel -replace "/", "\")
    if (-not (Test-Path $full)) {
        $Missing += $rel
    }
}

if ($Missing.Count -gt 0) {
    Write-Error "Ficheiros do plugin em falta em ${PluginDir}:`n - $($Missing -join "`n - ")"
}
Write-Host "[OK] Todos os $($RequiredFiles.Count) ficheiros do plugin encontrados." -ForegroundColor Green

# 2. Localizar Python 3
$PythonCmd = Get-Command python -ErrorAction SilentlyContinue
if (-not $PythonCmd) {
    $PythonCmd = Get-Command python3 -ErrorAction SilentlyContinue
}
if (-not $PythonCmd) {
    Write-Error "Python 3 não encontrado no PATH. Instala Python 3.12+ antes de continuar."
}
$PythonExe = $PythonCmd.Source
Write-Host "[OK] Python detetado: $PythonExe" -ForegroundColor Green

# 3. Validar sintaxe e smoke test JSON-RPC do servidor MCP
$McpServer = Join-Path $PluginDir "mcp\edulink_mcp_server.py"
& $PythonExe -m py_compile $McpServer
if ($LASTEXITCODE -ne 0) {
    Write-Error "Falha de compilação Python em $McpServer"
}

$SmokePayload = @'
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05"}}
{"jsonrpc":"2.0","id":2,"method":"tools/list"}
'@

$env:EDULINK_REPO_ROOT = $TargetRoot
$SmokeOut = ($SmokePayload | & $PythonExe -u $McpServer | Out-String)
if ($LASTEXITCODE -ne 0 -or ($SmokeOut -notmatch '"edulink_repo_health"')) {
    Write-Error "Smoke test do servidor MCP falhou.`nSaída: $SmokeOut"
}
Write-Host "[OK] Servidor MCP edulink-devtools validado (initialize + tools/list)." -ForegroundColor Green

# 4. Validar/instalar com `agy` CLI se disponível
$AgyCmd = Get-Command agy -ErrorAction SilentlyContinue
if ($AgyCmd) {
    Write-Host "==> A validar com agy plugin validate --strict..." -ForegroundColor Cyan
    & $AgyCmd.Source plugin validate --strict $PluginDir
    if ($LASTEXITCODE -ne 0) {
        Write-Error "agy plugin validate --strict falhou."
    }
    Write-Host "[OK] Validação estrita do Antigravity passou." -ForegroundColor Green

    if ($Global) {
        Write-Host "==> A instalar globalmente com agy plugin install..." -ForegroundColor Cyan
        & $AgyCmd.Source plugin install $PluginDir
        if ($LASTEXITCODE -ne 0) {
            Write-Error "agy plugin install falhou."
        }
        Write-Host "[OK] Plugin instalado globalmente via agy CLI." -ForegroundColor Green
    }
} else {
    Write-Host "[INFO] CLI 'agy' não encontrada no PATH; descoberta por workspace (.agents/plugins/) está ativa no IDE." -ForegroundColor Yellow

    if ($Global) {
        $GlobalDir = Join-Path $env:USERPROFILE ".gemini\config\plugins\edulink-suite"
        if (Test-Path $GlobalDir) {
            Remove-Item -Recurse -Force $GlobalDir
        }
        New-Item -ItemType Directory -Force -Path (Split-Path $GlobalDir -Parent) | Out-Null
        Copy-Item -Recurse -Force $PluginDir $GlobalDir

        # Em instalação global, substituir ${workspaceFolder} por caminho absoluto do repositório
        $GlobalMcpCfg = Join-Path $GlobalDir "mcp_config.json"
        $EscapedRoot = $TargetRoot -replace "\\", "/"
        $CfgContent = (Get-Content $GlobalMcpCfg -Raw -Encoding UTF8).Replace('${workspaceFolder}', $EscapedRoot)
        [System.IO.File]::WriteAllText($GlobalMcpCfg, $CfgContent, [System.Text.UTF8Encoding]::new($false))

        Write-Host "[OK] Plugin copiado para $GlobalDir (com caminho absoluto para MCP)." -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Instalação concluída. Comandos disponíveis no Antigravity:" -ForegroundColor Green
Write-Host "  /edulink-sprint  |  /edulink-ui-ux  |  /edulink-deploy"
Write-Host "  Ferramentas MCP: edulink_repo_health, edulink_django_migrations, edulink_inspect_tenants, edulink_probe_api, edulink_run_tests"
