Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

param(
  [string]$Tag = 'manual'
)

function Get-DatabaseUrl {
  if ($env:DATABASE_URL -and $env:DATABASE_URL.Trim().Length -gt 0) {
    return $env:DATABASE_URL.Trim()
  }

  $envFile = Join-Path (Get-Location) '.env'
  if (-not (Test-Path $envFile)) {
    throw 'DATABASE_URL not found in environment and .env file is missing.'
  }

  $line = Select-String -Path $envFile -Pattern '^\s*DATABASE_URL\s*=\s*(.+)\s*$' | Select-Object -First 1
  if (-not $line) {
    throw 'DATABASE_URL not found in .env file.'
  }

  $rawValue = $line.Matches[0].Groups[1].Value.Trim()
  if ($rawValue.StartsWith('"') -and $rawValue.EndsWith('"')) {
    return $rawValue.Trim('"')
  }

  return $rawValue
}

function Get-DatabaseName([string]$databaseUrl) {
  $match = [regex]::Match($databaseUrl, '^[a-zA-Z0-9+.-]+://[^/]+/([^?]+)')
  if (-not $match.Success) {
    return 'database'
  }

  $dbName = $match.Groups[1].Value
  if ([string]::IsNullOrWhiteSpace($dbName)) {
    return 'database'
  }

  return ($dbName -replace '[^a-zA-Z0-9_-]', '_')
}

$projectRoot = Split-Path -Parent $PSScriptRoot
Push-Location $projectRoot

try {
  $databaseUrl = Get-DatabaseUrl

  $pgDump = Get-Command pg_dump -ErrorAction SilentlyContinue
  if (-not $pgDump) {
    throw 'pg_dump is not available in PATH. Install PostgreSQL client tools first.'
  }

  $timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
  $safeTag = ($Tag -replace '[^a-zA-Z0-9_-]', '_')
  $dbName = Get-DatabaseName -databaseUrl $databaseUrl

  $backupDir = Join-Path $projectRoot 'backups'
  if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
  }

  $backupFile = Join-Path $backupDir ("{0}_{1}_{2}.sql" -f $dbName, $safeTag, $timestamp)

  Write-Host ("Creating backup: {0}" -f $backupFile)
  & $pgDump.Source '--no-owner' '--no-privileges' '--format=plain' '--encoding=UTF8' ("--file={0}" -f $backupFile) $databaseUrl

  if ($LASTEXITCODE -ne 0) {
    throw ("pg_dump failed with exit code {0}." -f $LASTEXITCODE)
  }

  Write-Host ("Backup completed: {0}" -f $backupFile)
}
finally {
  Pop-Location
}
