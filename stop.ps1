# PowerShell shutdown script for K8S Log Explorer (Windows)
# Stops both backend and frontend services

$ErrorActionPreference = "Continue"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$PidFile = Join-Path $ScriptDir ".k8s-log-explorer.pid"
$BackendPidFile = Join-Path $ScriptDir ".backend.pid"
$FrontendPidFile = Join-Path $ScriptDir ".frontend.pid"

Write-Host "========================================" -ForegroundColor Green
Write-Host "K8S Log Explorer - Stopping Services" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

$Stopped = 0

# Stop Backend
if (Test-Path $BackendPidFile) {
    $BackendPid = Get-Content $BackendPidFile
    $BackendProcess = Get-Process -Id $BackendPid -ErrorAction SilentlyContinue
    
    if ($BackendProcess) {
        Write-Host "Stopping Backend (PID: $BackendPid)..." -ForegroundColor Yellow
        
        # Try graceful shutdown
        Stop-Process -Id $BackendPid -ErrorAction SilentlyContinue
        
        # Wait for graceful shutdown (max 5 seconds)
        for ($i = 1; $i -le 5; $i++) {
            $BackendProcess = Get-Process -Id $BackendPid -ErrorAction SilentlyContinue
            if (-not $BackendProcess) {
                break
            }
            Start-Sleep -Seconds 1
        }
        
        # Force kill if still running
        $BackendProcess = Get-Process -Id $BackendPid -ErrorAction SilentlyContinue
        if ($BackendProcess) {
            Write-Host "  Force killing backend..." -ForegroundColor Yellow
            Stop-Process -Id $BackendPid -Force -ErrorAction SilentlyContinue
        }
        
        Write-Host "✓ Backend stopped" -ForegroundColor Green
        $Stopped++
    } else {
        Write-Host "⚠️  Backend was not running" -ForegroundColor Yellow
    }
    Remove-Item $BackendPidFile -ErrorAction SilentlyContinue
} else {
    Write-Host "⚠️  Backend PID file not found" -ForegroundColor Yellow
}

# Stop Frontend
if (Test-Path $FrontendPidFile) {
    $FrontendPid = Get-Content $FrontendPidFile
    $FrontendProcess = Get-Process -Id $FrontendPid -ErrorAction SilentlyContinue
    
    if ($FrontendProcess) {
        Write-Host "Stopping Frontend (PID: $FrontendPid)..." -ForegroundColor Yellow
        
        # Try graceful shutdown
        Stop-Process -Id $FrontendPid -ErrorAction SilentlyContinue
        
        # Wait for graceful shutdown (max 5 seconds)
        for ($i = 1; $i -le 5; $i++) {
            $FrontendProcess = Get-Process -Id $FrontendPid -ErrorAction SilentlyContinue
            if (-not $FrontendProcess) {
                break
            }
            Start-Sleep -Seconds 1
        }
        
        # Force kill if still running
        $FrontendProcess = Get-Process -Id $FrontendPid -ErrorAction SilentlyContinue
        if ($FrontendProcess) {
            Write-Host "  Force killing frontend..." -ForegroundColor Yellow
            Stop-Process -Id $FrontendPid -Force -ErrorAction SilentlyContinue
        }
        
        Write-Host "✓ Frontend stopped" -ForegroundColor Green
        $Stopped++
    } else {
        Write-Host "⚠️  Frontend was not running" -ForegroundColor Yellow
    }
    Remove-Item $FrontendPidFile -ErrorAction SilentlyContinue
} else {
    Write-Host "⚠️  Frontend PID file not found" -ForegroundColor Yellow
}

# Clean up PID file
Remove-Item $PidFile -ErrorAction SilentlyContinue

# Check for processes on ports
Write-Host ""
Write-Host "Checking for processes on ports 8000 and 5173..." -ForegroundColor Cyan

try {
    $Port8000 = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
    if ($Port8000) {
        Write-Host "⚠️  Process still running on port 8000 (PID: $Port8000)" -ForegroundColor Yellow
        $response = Read-Host "Kill it? (y/n)"
        if ($response -eq "y" -or $response -eq "Y") {
            Stop-Process -Id $Port8000 -Force -ErrorAction SilentlyContinue
            Write-Host "✓ Killed process on port 8000" -ForegroundColor Green
        }
    }
} catch {
    # Port check failed, continue
}

try {
    $Port5173 = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
    if ($Port5173) {
        Write-Host "⚠️  Process still running on port 5173 (PID: $Port5173)" -ForegroundColor Yellow
        $response = Read-Host "Kill it? (y/n)"
        if ($response -eq "y" -or $response -eq "Y") {
            Stop-Process -Id $Port5173 -Force -ErrorAction SilentlyContinue
            Write-Host "✓ Killed process on port 5173" -ForegroundColor Green
        }
    }
} catch {
    # Port check failed, continue
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
if ($Stopped -gt 0) {
    Write-Host "✓ Stopped $Stopped service(s)" -ForegroundColor Green
} else {
    Write-Host "⚠️  No services were running" -ForegroundColor Yellow
}
Write-Host "========================================" -ForegroundColor Green
