# PowerShell verification script for K8s Log Explorer setup
# For Windows (non-admin users)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "K8s Log Explorer - Setup Verification" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Continue"
$allChecksPassed = $true

# Check kubectl
Write-Host "1. Checking kubectl installation..." -ForegroundColor Yellow
if (Get-Command kubectl -ErrorAction SilentlyContinue) {
    $kubectlVersion = kubectl version --client --short 2>&1 | Select-Object -First 1
    Write-Host "   ✓ kubectl found: $kubectlVersion" -ForegroundColor Green
} else {
    Write-Host "   ✗ kubectl not found" -ForegroundColor Red
    Write-Host "   Install from: https://kubernetes.io/docs/tasks/tools/install-kubectl-windows/" -ForegroundColor Yellow
    $allChecksPassed = $false
}
Write-Host ""

# Check contexts
Write-Host "2. Checking kubectl contexts..." -ForegroundColor Yellow
$contexts = kubectl config get-contexts --no-headers 2>&1 | ForEach-Object { ($_ -split '\s+')[1] } | Where-Object { $_ -ne $null }
$requiredContexts = @("sit-cluster", "replica-cluster", "prod-cluster")

foreach ($ctx in $requiredContexts) {
    if ($contexts -contains $ctx) {
        Write-Host "   ✓ $ctx configured" -ForegroundColor Green
    } else {
        Write-Host "   ✗ $ctx NOT found" -ForegroundColor Red
        $allChecksPassed = $false
    }
}
Write-Host ""

# Check config files
Write-Host "3. Checking application config files..." -ForegroundColor Yellow
$configDir = "backend\app\env-config"
$envs = @("sit", "replica", "prod")

foreach ($env in $envs) {
    $configFile = Join-Path $configDir "$env.yaml"
    if (Test-Path $configFile) {
        $content = Get-Content $configFile -Raw
        $kubectlCtx = if ($content -match "kubectlContext:\s*(.+)") { $matches[1].Trim() } else { "not found" }
        $namespace = if ($content -match "defaultNamespace:\s*(.+)") { $matches[1].Trim() } else { "not found" }
        Write-Host "   ✓ ${env}.yaml: context=$kubectlCtx, namespace=$namespace" -ForegroundColor Green
    } else {
        Write-Host "   ✗ ${env}.yaml NOT found" -ForegroundColor Red
        $allChecksPassed = $false
    }
}
Write-Host ""

# Check Python
Write-Host "4. Checking Python installation..." -ForegroundColor Yellow
if (Get-Command python -ErrorAction SilentlyContinue) {
    $pythonVersion = python --version 2>&1
    Write-Host "   ✓ $pythonVersion" -ForegroundColor Green
    
    # Check if venv exists
    $venvPath = "backend\venv"
    if (Test-Path $venvPath) {
        Write-Host "   ✓ Virtual environment exists" -ForegroundColor Green
        
        # Check dependencies
        Write-Host "   Checking backend dependencies..." -ForegroundColor Cyan
        $venvPython = Join-Path $venvPath "Scripts\python.exe"
        if (Test-Path $venvPython) {
            $missingDeps = @()
            $deps = @("fastapi", "uvicorn", "yaml", "aiosqlite", "pydantic")
            
            foreach ($dep in $deps) {
                $checkResult = & $venvPython -c "import $dep" 2>&1
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "     ✓ $dep installed" -ForegroundColor Green
                } else {
                    Write-Host "     ✗ $dep NOT installed" -ForegroundColor Red
                    $missingDeps += $dep
                }
            }
            
            if ($missingDeps.Count -gt 0) {
                Write-Host "   ⚠️  Run: cd backend; .\venv\Scripts\Activate.ps1; pip install -r requirements.txt" -ForegroundColor Yellow
            }
        } else {
            Write-Host "   ⚠️  Virtual environment Python not found" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   ⚠️  Virtual environment not created. Run: cd backend; python -m venv venv" -ForegroundColor Yellow
    }
} elseif (Get-Command python3 -ErrorAction SilentlyContinue) {
    $pythonVersion = python3 --version 2>&1
    Write-Host "   ✓ $pythonVersion" -ForegroundColor Green
    Write-Host "   ⚠️  Note: Using python3. Virtual environment check skipped." -ForegroundColor Yellow
} else {
    Write-Host "   ✗ Python not found" -ForegroundColor Red
    Write-Host "   Install from: https://www.python.org/downloads/" -ForegroundColor Yellow
    $allChecksPassed = $false
}
Write-Host ""

# Check Node.js
Write-Host "5. Checking Node.js installation..." -ForegroundColor Yellow
if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeVersion = node --version 2>&1
    Write-Host "   ✓ $nodeVersion" -ForegroundColor Green
    
    # Check if node_modules exists
    $nodeModulesPath = "frontend\node_modules"
    if (Test-Path $nodeModulesPath) {
        Write-Host "   ✓ Frontend dependencies installed" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Frontend dependencies not installed. Run: cd frontend; npm install" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ✗ Node.js not found" -ForegroundColor Red
    Write-Host "   Install from: https://nodejs.org/" -ForegroundColor Yellow
    $allChecksPassed = $false
}
Write-Host ""

# Test context connectivity
Write-Host "6. Testing cluster connectivity..." -ForegroundColor Yellow
foreach ($ctx in $requiredContexts) {
    if ($contexts -contains $ctx) {
        # Get namespace from config
        $envName = $ctx -replace '-cluster$', ''
        $configFile = Join-Path $configDir "$envName.yaml"
        
        if (Test-Path $configFile) {
            $content = Get-Content $configFile -Raw
            $namespace = if ($content -match "defaultNamespace:\s*(.+)") { $matches[1].Trim() } else { "default" }
            
            $podsResult = kubectl --context $ctx get pods -n $namespace 2>&1
            if ($LASTEXITCODE -eq 0) {
                $podCount = ($podsResult | Measure-Object -Line).Lines - 1  # Subtract header line
                if ($podCount -lt 0) { $podCount = 0 }
                Write-Host "   ✓ $ctx : Connected (found $podCount pods in $namespace)" -ForegroundColor Green
            } else {
                Write-Host "   ⚠️  $ctx : Connection failed or no access to namespace $namespace" -ForegroundColor Yellow
            }
        }
    }
}
Write-Host ""

Write-Host "==========================================" -ForegroundColor Cyan
if ($allChecksPassed) {
    Write-Host "Verification complete! All checks passed." -ForegroundColor Green
} else {
    Write-Host "Verification complete! Some checks failed - please review above." -ForegroundColor Yellow
}
Write-Host "==========================================" -ForegroundColor Cyan
