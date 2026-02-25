# SparkHub One-Command Deployment Script (PowerShell)  v0.3.0
# Usage: .\deploy.ps1 [-Dev]
param(
    [switch]$Dev
)

$ErrorActionPreference = "Stop"

function Write-Teal  { param($msg) Write-Host $msg -ForegroundColor Cyan }
function Write-Green { param($msg) Write-Host $msg -ForegroundColor Green }
function Write-Red   { param($msg) Write-Host $msg -ForegroundColor Red }
function Write-Yellow{ param($msg) Write-Host $msg -ForegroundColor Yellow }

Write-Teal ""
Write-Teal "  +=========================================+"
Write-Teal "  |   SparkHub Deployment Script           |"
Write-Teal "  |   v0.3.0 (build 20260225.A) - Windows  |"
Write-Teal "  +=========================================+"
Write-Teal ""

# Check Node.js >= 18
try {
    $nodeVersion = node -e "process.exit(parseInt(process.version.slice(1)) >= 18 ? 0 : 1)" 2>$null
    if ($LASTEXITCODE -ne 0) { throw "Version too low" }
    $nodeVerStr = node --version
    Write-Green "OK  Node.js $nodeVerStr"
} catch {
    Write-Red "Error: Node.js 18 or later is required. Install from https://nodejs.org"
    exit 1
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

# Copy .env files if they don't exist
if ((Test-Path "backend\.env.example") -and -not (Test-Path "backend\.env")) {
    Copy-Item "backend\.env.example" "backend\.env"
    Write-Yellow "Created backend\.env from example - please edit it."
}
if ((Test-Path "frontend\.env.local.example") -and -not (Test-Path "frontend\.env.local")) {
    Copy-Item "frontend\.env.local.example" "frontend\.env.local"
    Write-Yellow "Created frontend\.env.local from example."
}

# Ensure NODE_ENV=production in backend/.env
if (Test-Path "backend\.env") {
    $envContent = Get-Content "backend\.env" -Raw
    if ($envContent -notmatch "^NODE_ENV=") {
        Add-Content "backend\.env" "`nNODE_ENV=production"
        Write-Green "OK  Added NODE_ENV=production to backend\.env"
    }
}

# Auto-generate ADMIN_PIN if not set
if (Test-Path "backend\.env") {
    $envContent = Get-Content "backend\.env" -Raw
    if ($envContent -notmatch "^ADMIN_PIN=") {
        $generatedPin = Get-Random -Minimum 100000 -Maximum 999999
        Add-Content "backend\.env" "`nADMIN_PIN=$generatedPin"
        Write-Yellow ""
        Write-Yellow "  +-----------------------------------------------+"
        Write-Yellow "  |  ADMIN PIN generated: $generatedPin                |"
        Write-Yellow "  |  Save this - you need it to access /admin     |"
        Write-Yellow "  +-----------------------------------------------+"
        Write-Yellow ""
    }
}

# Remind about optional GEMINI_API_KEY
if ((Test-Path "backend\.env") -and ((Get-Content "backend\.env" -Raw) -notmatch "^GEMINI_API_KEY=")) {
    Write-Yellow "Tip: Add GEMINI_API_KEY to backend\.env for real AI responses."
    Write-Yellow "     Free key at: https://aistudio.google.com/app/apikey"
}

Write-Teal "`nInstalling dependencies in parallel..."
$backendJob  = Start-Job -ScriptBlock { param($dir) & npm install --prefix $dir/backend  --legacy-peer-deps } -ArgumentList $ScriptDir
$frontendJob = Start-Job -ScriptBlock { param($dir) & npm install --prefix $dir/frontend --legacy-peer-deps } -ArgumentList $ScriptDir

Wait-Job $backendJob, $frontendJob | Out-Null
Receive-Job $backendJob  | Write-Host
Receive-Job $frontendJob | Write-Host
Remove-Job  $backendJob, $frontendJob

Write-Green "OK  Dependencies installed"

Write-Teal "`nSyncing database..."
Set-Location "$ScriptDir\backend"
npx prisma db push --skip-generate
Set-Location $ScriptDir
Write-Green "OK  Database ready"

# Install PM2 if missing
if (-not (Get-Command pm2 -ErrorAction SilentlyContinue)) {
    Write-Yellow "Installing PM2..."
    npm install -g pm2
}

# Install pm2-logrotate for automatic log rotation
pm2 install pm2-logrotate 2>$null; $true

# Ensure logs directory exists
New-Item -ItemType Directory -Force -Path "$ScriptDir\logs" | Out-Null

# Build frontend first if not in dev mode
if (-not $Dev) {
    Write-Teal "`nBuilding frontend for production..."
    Set-Location "$ScriptDir\frontend"
    npm run build
    Set-Location $ScriptDir
}

Write-Teal "`nStarting servers with PM2 ecosystem..."
pm2 delete sparkhub-backend  2>$null; $true
pm2 delete sparkhub-frontend 2>$null; $true

if ($Dev) {
    pm2 start "$ScriptDir\ecosystem.config.js" --env dev
    Write-Green "`nOK  SparkHub v0.3.0 running in dev mode"
} else {
    pm2 start "$ScriptDir\ecosystem.config.js"
    Write-Green "`nOK  SparkHub v0.3.0 running in production mode"
}

# Save and register as Windows service (NSSM) for boot persistence
pm2 save
Write-Yellow "To enable auto-start on Windows boot, run: pm2-startup install"

Write-Teal "`n-----------------------------------------"
Write-Teal "  SparkHub v0.3.0 (build 20260225.A)"
Write-Teal "  Backend:  http://localhost:4000"
Write-Teal "  Frontend: http://localhost:3000"
Write-Teal "  Admin:    http://localhost:3000/admin"
Write-Teal "  Health:   http://localhost:4000/healthz"
Write-Teal "  Logs:     pm2 logs  |  .\logs\"
Write-Teal "-----------------------------------------"
pm2 list
