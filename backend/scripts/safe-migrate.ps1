param(
  [Parameter(Mandatory = $true)]
  [string]$Name,
  [switch]$SkipBackup
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Assert-MigrationName([string]$migrationName) {
  if ($migrationName -notmatch '^[a-zA-Z0-9_-]+$') {
    throw 'Migration name must use only letters, numbers, underscore, and hyphen.'
  }
}

function Get-EnvValueFromFile([string]$filePath, [string]$key) {
  if (-not (Test-Path $filePath)) {
    return $null
  }

  $pattern = "^\s*{0}\s*=\s*(.+)\s*$" -f [regex]::Escape($key)
  $line = Select-String -Path $filePath -Pattern $pattern | Select-Object -First 1
  if (-not $line) {
    return $null
  }

  $value = $line.Matches[0].Groups[1].Value.Trim()
  if ($value.StartsWith('"') -and $value.EndsWith('"')) {
    $value = $value.Trim('"')
  }

  return $value
}

function Ensure-ShadowDatabaseUrl {
  if (-not $env:DATABASE_URL -or $env:DATABASE_URL.Trim().Length -eq 0) {
    $envPath = Join-Path (Split-Path -Parent $PSScriptRoot) '.env'
    $fromFile = Get-EnvValueFromFile -filePath $envPath -key 'DATABASE_URL'
    if ($fromFile) {
      $env:DATABASE_URL = $fromFile
    }
  }

  if ($env:SHADOW_DATABASE_URL -and $env:SHADOW_DATABASE_URL.Trim().Length -gt 0) {
    return
  }

  if (-not $env:DATABASE_URL -or $env:DATABASE_URL.Trim().Length -eq 0) {
    throw 'DATABASE_URL is missing. Cannot infer SHADOW_DATABASE_URL.'
  }

  $dbUrl = $env:DATABASE_URL.Trim()
  $shadowSchema = ('shadow_migrate_{0}' -f ([Guid]::NewGuid().ToString('N').Substring(0, 8)))
  if ($dbUrl -match 'schema=public') {
    $env:SHADOW_DATABASE_URL = ($dbUrl -replace 'schema=public', ("schema={0}" -f $shadowSchema))
    return
  }

  if ($dbUrl -match '\?') {
    $env:SHADOW_DATABASE_URL = ($dbUrl + ("&schema={0}" -f $shadowSchema))
  }
  else {
    $env:SHADOW_DATABASE_URL = ($dbUrl + ("?schema={0}" -f $shadowSchema))
  }
}

function Assert-CommandSuccess([int]$exitCode, [string]$message) {
  if ($exitCode -ne 0) {
    throw $message
  }
}

function Write-CommandOutput([string]$text) {
  if (-not [string]::IsNullOrWhiteSpace($text)) {
    Write-Host $text
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

function Invoke-ExternalCommand([string]$commandText) {
  $stdoutFile = [System.IO.Path]::GetTempFileName()
  $stderrFile = [System.IO.Path]::GetTempFileName()

  try {
    $process = Start-Process -FilePath 'cmd.exe' `
      -ArgumentList '/c', $commandText `
      -NoNewWindow `
      -Wait `
      -PassThru `
      -RedirectStandardOutput $stdoutFile `
      -RedirectStandardError $stderrFile

    $stdout = if (Test-Path $stdoutFile) { Get-Content -Path $stdoutFile -Raw } else { '' }
    $stderr = if (Test-Path $stderrFile) { Get-Content -Path $stderrFile -Raw } else { '' }

    $combined = @($stdout, $stderr) -join [Environment]::NewLine
    return @{ Output = $combined.Trim(); ExitCode = $process.ExitCode }
  }
  finally {
    if (Test-Path $stdoutFile) { Remove-Item -Path $stdoutFile -Force -ErrorAction SilentlyContinue }
    if (Test-Path $stderrFile) { Remove-Item -Path $stderrFile -Force -ErrorAction SilentlyContinue }
  }
}

function Is-NoSchemaChangeOutput([string]$outputText) {
  if ([string]::IsNullOrWhiteSpace($outputText)) {
    return $false
  }

  $hints = @(
    '(?i)already in sync',
    '(?i)no schema change',
    '(?i)no changes',
    '(?i)already up to date',
    '(?i)no pending migration'
  )

  foreach ($hint in $hints) {
    if ($outputText -match $hint) {
      return $true
    }
  }

  return $false
}

function Run-CheckedCommand([string]$label, [string]$commandText) {
  $result = Invoke-ExternalCommand -commandText $commandText
  Write-CommandOutput -text $result.Output

  if ($result.ExitCode -ne 0) {
    throw ("{0} failed with exit code {1}.\n{2}" -f $label, $result.ExitCode, $result.Output)
  }

  return $result
}

$projectRoot = Split-Path -Parent $PSScriptRoot
Push-Location $projectRoot

try {
  Assert-MigrationName -migrationName $Name
  Ensure-ShadowDatabaseUrl

  if (-not $SkipBackup) {
    & (Join-Path $PSScriptRoot 'backup-db.ps1') -Tag ("pre_migration_{0}" -f $Name)
    Assert-CommandSuccess -exitCode $LASTEXITCODE -message 'Backup step failed. Migration stopped.'
  }

  Write-Host 'Checking migration status...'
  $statusResult = Run-CheckedCommand -label 'prisma migrate status' -commandText 'npx prisma migrate status'
  Assert-StatusIsSafe -statusText $statusResult.Output

  Write-Host 'Checking schema diff against migrations...'
  $diffResult = Invoke-ExternalCommand -commandText 'npx prisma migrate diff --from-schema prisma/schema.prisma --to-config-datasource --exit-code'
  Write-CommandOutput -text $diffResult.Output

  if ($diffResult.ExitCode -eq 0) {
    Write-Host 'No schema changes detected'
    Write-Host 'Safe migration skipped (schema already matches migration history).'
    return
  }

  if ($diffResult.ExitCode -ne 2) {
    throw ("prisma migrate diff failed with exit code {0}.`n{1}" -f $diffResult.ExitCode, $diffResult.Output)
  }

  Write-Host ("Creating migration (create-only): {0}" -f $Name)
  $createResult = Invoke-ExternalCommand -commandText ("npx prisma migrate dev --name {0} --create-only" -f $Name)
  Write-CommandOutput -text $createResult.Output

  if ($createResult.ExitCode -ne 0) {
    if (Is-NoSchemaChangeOutput -outputText $createResult.Output) {
      Write-Host 'No schema changes detected'
      Write-Host 'Safe migration skipped (database already aligned with schema).'
      return
    }

    throw ("prisma migrate dev --create-only failed with exit code {0}.\n{1}" -f $createResult.ExitCode, $createResult.Output)
  }

  if (Is-NoSchemaChangeOutput -outputText $createResult.Output) {
    Write-Host 'No schema changes detected'
    Write-Host 'Safe migration skipped (database already aligned with schema).'
    return
  }

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
  $deployResult = Run-CheckedCommand -label 'prisma migrate deploy' -commandText 'npx prisma migrate deploy'

  Write-Host 'Generating Prisma client...'
  $generateResult = Run-CheckedCommand -label 'prisma generate' -commandText 'npx prisma generate'

  Write-Host ("Safe migration completed: {0}" -f $Name)
}
finally {
  Pop-Location
}
