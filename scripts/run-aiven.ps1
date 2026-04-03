<#
.SYNOPSIS
  Build and run CollaboDraw against Aiven MySQL (Windows PowerShell).

.DESCRIPTION
  - Loads .env (if present) to set DB_URL/DB_USER/DB_PASS (or builds DB_URL from AIVEN_HOST/AIVEN_PORT/AIVEN_DB)
  - Cleans and packages the project with Maven Wrapper (skips tests by default)
  - Starts Spring Boot using mvnw.cmd spring-boot:run

.EXAMPLES
  ./scripts/run-aiven.ps1                 # Clean, package (skip tests), run
  ./scripts/run-aiven.ps1 -RunTests       # Clean, package (with tests), run
  ./scripts/run-aiven.ps1 -SkipRun        # Only build (skip tests)
  ./scripts/run-aiven.ps1 -VerboseEnv     # Print resolved env and preflight warnings
#>
param(
  [switch]$RunTests,
  [switch]$SkipRun,
  [switch]$VerboseEnv,
  [int]$Port = 8080,
  [switch]$DevFallback
)

$ErrorActionPreference = 'Stop'
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Resolve-Path (Join-Path $scriptDir '..')
Push-Location $rootDir
try {
  function Import-DotEnv {
    $envFile = Join-Path $rootDir '.env'
    if (Test-Path $envFile) {
      Write-Host "Loading .env" -ForegroundColor Cyan
      Get-Content $envFile | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith('#')) { return }
        $eq = $line.IndexOf('=')
        if ($eq -lt 1) { return }
        $k = $line.Substring(0,$eq).Trim()
        $v = $line.Substring($eq+1).Trim()
        if ($k -match '^[A-Za-z_][A-Za-z0-9_]*$') {
          [Environment]::SetEnvironmentVariable($k, $v, 'Process')
        }
      }
    }
  }

  function Set-EnvValue {
    param(
      [Parameter(Mandatory = $true)]
      [string]$Name,
      [Parameter(Mandatory = $true)]
      [string]$Value
    )

    [Environment]::SetEnvironmentVariable($Name, $Value, 'Process')
  }

  function Clear-EnvValue {
    param(
      [Parameter(Mandatory = $true)]
      [string]$Name
    )

    [Environment]::SetEnvironmentVariable($Name, $null, 'Process')
  }

  function Get-FirstValue {
    param(
      [Parameter(Mandatory = $true)]
      [string[]]$Names,
      [string]$Default = ''
    )

    foreach ($name in $Names) {
      $value = [Environment]::GetEnvironmentVariable($name)
      if (-not [string]::IsNullOrWhiteSpace($value)) {
        return $value.Trim()
      }
    }

    return $Default
  }

  function Stop-PortListener {
    param(
      [Parameter(Mandatory = $true)]
      [int]$ListenPort
    )

    $connections = Get-NetTCPConnection -LocalPort $ListenPort -State Listen -ErrorAction SilentlyContinue
    if (-not $connections) {
      return
    }

    $processIds = $connections | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($processId in $processIds) {
      $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
      if ($null -eq $process) {
        continue
      }

      if ($process.ProcessName -match 'java|javaw|mvn|mvnw') {
        Write-Host "Stopping stale process '$($process.ProcessName)' (PID $processId) on port $ListenPort..." -ForegroundColor Yellow
        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
        continue
      }

      Write-Host "Port $ListenPort is already in use by '$($process.ProcessName)' (PID $processId). Stop it before running the app." -ForegroundColor Red
      exit 5
    }
  }

  Import-DotEnv

  # Prefer the Aiven values from .env and mirror them into the DB_* names used by the app.
  $aivenHost = Get-FirstValue -Names @('AIVEN_HOST', 'DB_HOST')
  $aivenPort = Get-FirstValue -Names @('AIVEN_PORT', 'DB_PORT') -Default '17118'
  $aivenDb = Get-FirstValue -Names @('AIVEN_DB', 'DB_NAME') -Default 'collaborative_workspace_db'

  if ([string]::IsNullOrWhiteSpace($aivenHost)) {
    Write-Host 'Missing Aiven host in .env (set AIVEN_HOST or DB_HOST).' -ForegroundColor Red
    exit 2
  }

  Set-EnvValue -Name 'AIVEN_HOST' -Value $aivenHost
  Set-EnvValue -Name 'AIVEN_PORT' -Value $aivenPort
  Set-EnvValue -Name 'AIVEN_DB' -Value $aivenDb
  Set-EnvValue -Name 'DB_HOST' -Value $aivenHost
  Set-EnvValue -Name 'DB_PORT' -Value $aivenPort
  Set-EnvValue -Name 'DB_NAME' -Value $aivenDb

  # Remove stale Spring datasource overrides so the profile properties win.
  foreach ($override in 'SPRING_DATASOURCE_URL', 'SPRING_DATASOURCE_USERNAME', 'SPRING_DATASOURCE_PASSWORD', 'SPRING_DATASOURCE_DRIVER_CLASS_NAME') {
    Clear-EnvValue -Name $override
  }

  foreach ($req in 'DB_USER','DB_PASS') {
    $val = Get-FirstValue -Names @($req)
    if ([string]::IsNullOrWhiteSpace($val)) {
      Write-Host "Missing $req env var (set it in .env)" -ForegroundColor Red
      exit 2
    }
  }

  # Validate Google OAuth vars (fail fast if missing to avoid silent bypass or misconfig)
  foreach ($g in 'GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET') {
    $gval = Get-FirstValue -Names @($g)
    if ([string]::IsNullOrWhiteSpace($gval)) {
      Write-Host "Missing $g env var for Google OAuth (set it in .env)" -ForegroundColor Red
      exit 3
    }
  }

  if ($VerboseEnv) {
    try {
      $dbHost = $env:DB_HOST
      $dbPort = if ($env:DB_PORT) { $env:DB_PORT } else { '17118' }
      $dbName = if ($env:DB_NAME) { $env:DB_NAME } else { 'collaborative_workspace_db' }
      Write-Host "Resolved DB: host=$dbHost port=$dbPort db=$dbName" -ForegroundColor DarkGray
      Write-Host "DB_USER=$($env:DB_USER) DB_PASS=********" -ForegroundColor DarkGray
      Write-Host "GOOGLE_CLIENT_ID=$($env:GOOGLE_CLIENT_ID) GOOGLE_CLIENT_SECRET=********" -ForegroundColor DarkGray
    } catch {}
  }

  # Optional: quick DNS/port preflight (non-blocking)
  $dbReachable = $true
  try {
    $h = $env:DB_HOST
    $p = if ($env:DB_PORT) { [int]$env:DB_PORT } else { 3306 }
    if ($h -and $p) {
      $dns = Resolve-DnsName -Name $h -ErrorAction SilentlyContinue
      if (-not $dns) { Write-Host "Warning: DNS lookup failed for $h" -ForegroundColor Yellow }
      $tnc = Test-NetConnection -ComputerName $h -Port $p -WarningAction SilentlyContinue
  if ($VerboseEnv) { Write-Host ("Connectivity: {0} to {1}:{2}" -f $tnc.TcpTestSucceeded, $h, $p) -ForegroundColor DarkGray }
      if (-not $tnc.TcpTestSucceeded) { $dbReachable = $false }
    }
  } catch { $dbReachable = $false }

  if (-not $dbReachable -and -not $DevFallback) {
    Write-Host "Aiven/MySQL is not reachable on $($env:DB_HOST):$($env:DB_PORT). Fix the network or credentials before running." -ForegroundColor Red
    exit 4
  }

  [Environment]::SetEnvironmentVariable('SPRING_PROFILES_ACTIVE','aiven','Process')

  if (-not $dbReachable) {
    Write-Host "Aiven/MySQL is currently unreachable. The app will start in offline mode and show a fallback message on the sign-in page." -ForegroundColor Yellow
  }

  Stop-PortListener -ListenPort $Port

  # Clean + package (skip tests by default)
  if ($RunTests) {
    Write-Host "Building (clean package WITH tests)..." -ForegroundColor Cyan
    & "$rootDir\mvnw.cmd" clean package
  } else {
    Write-Host "Building (clean package, skipping tests)..." -ForegroundColor Cyan
    & "$rootDir\mvnw.cmd" clean package -DskipTests
  }
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  if ($SkipRun) { Write-Host "Build finished. Skipping run as requested." -ForegroundColor Yellow; exit 0 }

  Write-Host "Starting Spring Boot with Aiven on port $Port..." -ForegroundColor Cyan
  # Set SERVER_PORT environment variable to avoid Maven argument parsing issues on Windows
  $env:SERVER_PORT = "$Port"
  & "$rootDir\mvnw.cmd" spring-boot:run
} finally {
  Pop-Location
}
