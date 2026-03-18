Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

param(
  [Parameter(Mandatory = $true)]
  [string]$Name,
  [switch]$SkipBackup
)

function Assert-MigrationName([string]$migrationName) {
  if ($migrationName -notmatch '^[a-zA-Z0-9_-]+$') {
    throw 'Migration name must use only letters, numbers, underscore, and hyphen.'
  }
}

function Assert-CommandSuccess([int]$exitCode, [string]$message) {
  if ($exitCode -ne 0) {
    throw $message
  }
}

function Assert-StatusIsSafe([string]$statusText) {
  $riskyHints = @(
    '(?i)drift',
    '(?i)reset',
    '(?i)not in sync',
    '(?i)migrate reset',
    '(?i)need to reset',
    '(?i)schema drift'
  )

  foreach ($pattern in $riskyHints) {
    if ($statusText -match $pattern) {
      throw ("Unsafe migration status detected: '{0}'. Resolve drift/reset condition manually first." -f $pattern)
    }
  }
}

function Assert-SqlIsNonDestructive([string]$sqlText) {
  $destructivePatterns = @(
    '\bDROP\s+TABLE\b',
    '\bDROP\s+COLUMN\b',
    '\bTRUNCATE\b',
    '\bDELETE\s+FROM\b',
    '\bDROP\s+SCHEMA\b'
  )

  $found = @()
  foreach ($pattern in $destructivePatterns) {
    if ($sqlText -match $pattern) {
      $found += $pattern
    }
  }

  if ($found.Count -gt 0) {
    $joined = ($found -join ', ')
    throw ("Destructive SQL detected in migration.sql ({0}). Migration was created but not applied." -f $joined)
  }
}

$projectRoot = Split-Path -Parent $PSScriptRoot
Push-Location $projectRoot

try {
  Assert-MigrationName -migrationName $Name

  if (-not $SkipBackup) {
    & (Join-Path $PSScriptRoot 'backup-db.ps1') -Tag ("pre_migration_{0}" -f $Name)
    Assert-CommandSuccess -exitCode $LASTEXITCODE -message 'Backup step failed. Migration stopped.'
  }

  Write-Host 'Checking migration status...'
  $statusOutput = (& npx prisma migrate status 2>&1 | Out-String)
  Assert-CommandSuccess -exitCode $LASTEXITCODE -message 'prisma migrate status failed.'
  Assert-StatusIsSafe -statusText $statusOutput

  Write-Host ("Creating migration (create-only): {0}" -f $Name)
  $createOutput = (& npx prisma migrate dev --name $Name --create-only 2>&1 | Out-String)
  Assert-CommandSuccess -exitCode $LASTEXITCODE -message 'prisma migrate dev --create-only failed.'

  $migrationsRoot = Join-Path $projectRoot 'prisma\migrations'
  $latestMigrationDir = Get-ChildItem -Path $migrationsRoot -Directory |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

  if (-not $latestMigrationDir) {
    throw 'No migration directory found after create-only step.'
  }

  $migrationSql = Join-Path $latestMigrationDir.FullName 'migration.sql'
  if (-not (Test-Path $migrationSql)) {
    throw ("migration.sql not found in {0}" -f $latestMigrationDir.FullName)
  }

  $sqlText = Get-Content -Path $migrationSql -Raw
  Assert-SqlIsNonDestructive -sqlText $sqlText

  Write-Host 'Applying safe migrations with prisma migrate deploy...'
  & npx prisma migrate deploy
  Assert-CommandSuccess -exitCode $LASTEXITCODE -message 'prisma migrate deploy failed.'

  Write-Host 'Generating Prisma client...'
  & npx prisma generate
  Assert-CommandSuccess -exitCode $LASTEXITCODE -message 'prisma generate failed.'

  Write-Host ("Safe migration completed: {0}" -f $Name)
}
finally {
  Pop-Location
}
