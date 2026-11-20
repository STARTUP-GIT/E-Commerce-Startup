<#
.SYNOPSIS
    AtlasBasket Remote Development Database Tunnel Manager

.DESCRIPTION
    Ensures a persistent, healthy SSH tunnel to atlasbasket_dev on the AtlasBasket VM.
    Endpoints:
      Local:        127.0.0.1:5433
      Intermediate: 127.0.0.1:25432 (physical host)
      Database:     172.18.0.9:5432 (VM container)

.PARAMETER Check
    Check if the tunnel and PostgreSQL server are responding without starting.

.PARAMETER Stop
    Stop any active tunnel process on port 5433.
#>

param(
    [switch]$Check,
    [switch]$Stop
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$devTunnelCjs = Join-Path $scriptDir "dev-tunnel.cjs"

if ($Check) {
    & node $devTunnelCjs --check
    exit $LASTEXITCODE
}

if ($Stop) {
    & node $devTunnelCjs --stop
    exit $LASTEXITCODE
}

Write-Host "Ensuring AtlasBasket development database tunnel is active..." -ForegroundColor Cyan
& node $devTunnelCjs
exit $LASTEXITCODE
