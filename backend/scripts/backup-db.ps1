param(
  [string]$Tag = 'manual'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

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

function Get-PgDumpPath {
  $pgDump = Get-Command pg_dump -ErrorAction SilentlyContinue
  if ($pgDump) {
    return $pgDump.Source
  }

  $defaultRoot = 'C:\Program Files\PostgreSQL'
  if (-not (Test-Path $defaultRoot)) {
    return $null
  }

  $candidates = Get-ChildItem -Path $defaultRoot -Directory -ErrorAction SilentlyContinue |
    Sort-Object Name -Descending |
    ForEach-Object { Join-Path $_.FullName 'bin\pg_dump.exe' } |
    Where-Object { Test-Path $_ }

  return ($candidates | Select-Object -First 1)
}

function Get-PgDumpDatabaseUrl([string]$databaseUrl) {
  $uri = [System.Uri]$databaseUrl
  $builder = New-Object System.UriBuilder($uri)

  if ([string]::IsNullOrWhiteSpace($builder.Query)) {
    return $builder.Uri.AbsoluteUri
  }

  $pairs = $builder.Query.TrimStart('?') -split '&' | Where-Object { $_ -and $_.Trim().Length -gt 0 }
  $filtered = @()
  foreach ($pair in $pairs) {
    $nameValue = $pair -split '=', 2
    $key = [System.Uri]::UnescapeDataString($nameValue[0])
    if ($key -ieq 'schema') {
      continue
    }
    $filtered += $pair
  }

  $builder.Query = ($filtered -join '&')
  return $builder.Uri.AbsoluteUri
}

$projectRoot = Split-Path -Parent $PSScriptRoot
Push-Location $projectRoot

try {
  $databaseUrl = Get-DatabaseUrl
  $pgDumpDatabaseUrl = Get-PgDumpDatabaseUrl -databaseUrl $databaseUrl

  $pgDumpPath = Get-PgDumpPath
  if (-not $pgDumpPath) {
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
  & $pgDumpPath '--no-owner' '--no-privileges' '--format=plain' '--encoding=UTF8' ("--file={0}" -f $backupFile) $pgDumpDatabaseUrl

  if ($LASTEXITCODE -ne 0) {
    throw ("pg_dump failed with exit code {0}." -f $LASTEXITCODE)
  }

  Write-Host ("Backup completed: {0}" -f $backupFile)
}
finally {
  Pop-Location
}
