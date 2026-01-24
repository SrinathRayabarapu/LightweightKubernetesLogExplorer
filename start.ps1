# PowerShell startup script for K8S Log Explorer (Windows)
# Starts both backend and frontend services

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$PidFile = Join-Path $ScriptDir ".k8s-log-explorer.pid"
$BackendPidFile = Join-Path $ScriptDir ".backend.pid"
$FrontendPidFile = Join-Path $ScriptDir ".frontend.pid"
$LogsDir = Join-Path $ScriptDir "logs"

Write-Host "========================================" -ForegroundColor Green
Write-Host "K8S Log Explorer - Starting Services" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Check if services are already running
if (Test-Path $BackendPidFile) {
    $BackendPid = Get-Content $BackendPidFile
    $BackendProcess = Get-Process -Id $BackendPid -ErrorAction SilentlyContinue
    if ($BackendProcess) {
        Write-Host "⚠️  Backend is already running (PID: $BackendPid)" -ForegroundColor Yellow
        Write-Host "   Run .\stop.ps1 to stop it first" -ForegroundColor Yellow
        exit 1
    }
}

if (Test-Path $FrontendPidFile) {
    $FrontendPid = Get-Content $FrontendPidFile
    $FrontendProcess = Get-Process -Id $FrontendPid -ErrorAction SilentlyContinue
    if ($FrontendProcess) {
        Write-Host "⚠️  Frontend is already running (PID: $FrontendPid)" -ForegroundColor Yellow
        Write-Host "   Run .\stop.ps1 to stop it first" -ForegroundColor Yellow
        exit 1
    }
}

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Cyan

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "✗ Python not found" -ForegroundColor Red
    exit 1
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "✗ Node.js not found" -ForegroundColor Red
    exit 1
}

if (-not (Get-Command kubectl -ErrorAction SilentlyContinue)) {
    Write-Host "✗ kubectl not found" -ForegroundColor Red
    exit 1
}

Write-Host "✓ All prerequisites found" -ForegroundColor Green
Write-Host ""

# Create logs directory
if (-not (Test-Path $LogsDir)) {
    New-Item -ItemType Directory -Path $LogsDir | Out-Null
}

# Start Backend
Write-Host "Starting Backend Server..." -ForegroundColor Cyan
$BackendDir = Join-Path $ScriptDir "backend"
$VenvPath = Join-Path $BackendDir "venv"
$VenvPython = Join-Path $VenvPath "Scripts\python.exe"

if (-not (Test-Path $VenvPath)) {
    Write-Host "✗ Virtual environment not found" -ForegroundColor Red
    Write-Host "   Run: cd backend; python -m venv venv; .\venv\Scripts\Activate.ps1; pip install -r requirements.txt" -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path $VenvPython)) {
    Write-Host "✗ Virtual environment Python not found" -ForegroundColor Red
    exit 1
}

$BackendLogFile = Join-Path $LogsDir "backend.log"
$BackendRunFile = Join-Path $BackendDir "run.py"

# Start backend process
$BackendProcess = Start-Process -FilePath $VenvPython `
    -ArgumentList $BackendRunFile `
    -WorkingDirectory $BackendDir `
    -NoNewWindow `
    -PassThru `
    -RedirectStandardOutput $BackendLogFile `
    -RedirectStandardError $BackendLogFile

if (-not $BackendProcess) {
    Write-Host "✗ Backend failed to start" -ForegroundColor Red
    Write-Host "   Check logs\backend.log for details" -ForegroundColor Yellow
    exit 1
}

Start-Sleep -Seconds 2

# Check if backend is still running
$BackendProcess = Get-Process -Id $BackendProcess.Id -ErrorAction SilentlyContinue
if (-not $BackendProcess) {
    Write-Host "✗ Backend failed to start" -ForegroundColor Red
    Write-Host "   Check logs\backend.log for details" -ForegroundColor Yellow
    exit 1
}

$BackendProcess.Id | Out-File -FilePath $BackendPidFile -Encoding ASCII
Write-Host "✓ Backend started (PID: $($BackendProcess.Id))" -ForegroundColor Green
Write-Host "   Logs: logs\backend.log" -ForegroundColor Gray
Write-Host ""

# Start Frontend
Write-Host "Starting Frontend Server..." -ForegroundColor Cyan
$FrontendDir = Join-Path $ScriptDir "frontend"
$NodeModulesPath = Join-Path $FrontendDir "node_modules"

if (-not (Test-Path $NodeModulesPath)) {
    Write-Host "✗ Frontend dependencies not installed" -ForegroundColor Red
    Write-Host "   Run: cd frontend; npm install" -ForegroundColor Yellow
    # Stop backend if frontend setup is missing
    Stop-Process -Id $BackendProcess.Id -Force -ErrorAction SilentlyContinue
    Remove-Item $BackendPidFile -ErrorAction SilentlyContinue
    exit 1
}

$FrontendLogFile = Join-Path $LogsDir "frontend.log"

# Start frontend process
$FrontendProcess = Start-Process -FilePath "npm" `
    -ArgumentList "run", "dev" `
    -WorkingDirectory $FrontendDir `
    -NoNewWindow `
    -PassThru `
    -RedirectStandardOutput $FrontendLogFile `
    -RedirectStandardError $FrontendLogFile

if (-not $FrontendProcess) {
    Write-Host "✗ Frontend failed to start" -ForegroundColor Red
    Write-Host "   Check logs\frontend.log for details" -ForegroundColor Yellow
    # Stop backend if frontend failed
    Stop-Process -Id $BackendProcess.Id -Force -ErrorAction SilentlyContinue
    Remove-Item $BackendPidFile -ErrorAction SilentlyContinue
    exit 1
}

Start-Sleep -Seconds 3

# Check if frontend is still running
$FrontendProcess = Get-Process -Id $FrontendProcess.Id -ErrorAction SilentlyContinue
if (-not $FrontendProcess) {
    Write-Host "✗ Frontend failed to start" -ForegroundColor Red
    Write-Host "   Check logs\frontend.log for details" -ForegroundColor Yellow
    # Stop backend if frontend failed
    Stop-Process -Id $BackendProcess.Id -Force -ErrorAction SilentlyContinue
    Remove-Item $BackendPidFile -ErrorAction SilentlyContinue
    exit 1
}

$FrontendProcess.Id | Out-File -FilePath $FrontendPidFile -Encoding ASCII
Write-Host "✓ Frontend started (PID: $($FrontendProcess.Id))" -ForegroundColor Green
Write-Host "   Logs: logs\frontend.log" -ForegroundColor Gray
Write-Host ""

# Save both PIDs
"$($BackendProcess.Id) $($FrontendProcess.Id)" | Out-File -FilePath $PidFile -Encoding ASCII

Write-Host "========================================" -ForegroundColor Green
Write-Host "✓ Services started successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Backend:  http://127.0.0.1:8000" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "To stop services, run: .\stop.ps1" -ForegroundColor Yellow
Write-Host "To view logs:" -ForegroundColor Yellow
Write-Host "  Backend:  Get-Content logs\backend.log -Wait" -ForegroundColor Gray
Write-Host "  Frontend: Get-Content logs\frontend.log -Wait" -ForegroundColor Gray
