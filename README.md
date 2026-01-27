# Kubernetes Log Explorer

A lightweight, local web application for exploring Kubernetes logs across multiple environments. Built for developers who need quick access to logs without external infrastructure.

## Table of Contents

- [Important: Cluster Configuration](#important-cluster-configuration)
- [Features](#features)
  - [Core Features](#core-features)
  - [Log Viewing & Management](#log-viewing--management)
  - [Search & Navigation](#search--navigation)
  - [UI & Theming](#ui--theming)
- [Requirements](#requirements)
- [Installation & Run Guide](#installation--run-guide)
  - [Quick Start with Docker (Recommended)](#-quick-start-with-docker-recommended)
  - [Traditional Setup (Python + Node.js)](#traditional-setup-python--nodejs)
  - [macOS Installation Guide](#macos-installation-guide)
  - [Windows Installation Guide](#windows-installation-guide)
- [Running in Production Mode](#running-in-production-mode)
- [Stopping the Application](#stopping-the-application)
- [Quick Start Scripts](#quick-start-scripts)
- [Usage Guide](#usage-guide)
  - [Basic Workflow](#basic-workflow)
  - [Viewing Logs](#viewing-logs)
  - [Searching Logs](#searching-logs)
  - [Field Extraction & Filtering](#field-extraction--filtering)
  - [Time Navigation](#time-navigation)
  - [Log Filtering](#log-filtering)
  - [Auto-Refresh](#auto-refresh)
  - [Themes & UI Customization](#themes--ui-customization)
- [Architecture](#architecture)
- [API Reference](#api-reference)
- [Storage & Retention](#storage--retention)
- [Configuration Reference](#configuration-reference)
- [Troubleshooting](#troubleshooting)
- [Limitations](#limitations)
- [Development](#development)
- [Roadmap](#roadmap)
- [Sharing with Your Team](#sharing-with-your-team)
- [License](#license)

## Important: Cluster Configuration

**This application does NOT store cluster IPs, tokens, or certificates directly.** Instead, it uses **kubectl contexts** which are configured separately in your `~/.kube/config` file.

- **Cluster IPs, tokens, certificates** → Configured in kubectl (see [KUBECTL_SETUP.md](KUBECTL_SETUP.md))
- **Environment config files** (`backend/app/env-config/*.yaml`) → Only map environment names to kubectl context names

**Quick setup:**
1. Configure kubectl contexts: `kubectl config set-context sit-cluster ...`
2. Update config files: Set `kubectlContext: sit-cluster` to match your context name
3. That's it! The app uses `kubectl --context <name>` to access clusters

See **[KUBECTL_SETUP.md](KUBECTL_SETUP.md)** for detailed cluster configuration instructions.

## Features

### Core Features

| Feature | Description |
|---------|-------------|
| **Multi-Environment Support** | Configure multiple Kubernetes clusters (sit, replica, prod) with easy switching |
| **Automatic Log Fetching** | ALL logs fetched automatically on pod selection - no manual "fetch all" needed |
| **Full-Text Search** | SQLite FTS5-powered search with instant results and highlighted matches |
| **Time-Based Navigation** | Splunk-style exploration with ±5min/±10min time windows |
| **Auto-Refresh** | Configurable automatic log fetching (10s, 30s, 1m, 2m, 5m, 10m intervals) |
| **Storage Management** | 100 MB cap with automatic cleanup of oldest logs |
| **Production Warning** | Confirmation dialog when accessing production environments |

### Log Viewing & Management

| Feature | Description |
|---------|-------------|
| **Complete Log History** | Fetches ALL available logs from K8s (no artificial limits) |
| **Paginated Display** | Shows 1000 logs per page with floating "Load More" button |
| **Log Filtering** | Configurable exclusion patterns (healthchecks, probes, etc.) |
| **Filter Toggle** | "Show All" button to temporarily disable filters and see all logs |
| **Multi-line Support** | Proper handling of Java stack traces and multi-line entries |
| **JSON Formatting** | Automatic pretty-printing of JSON payloads in log messages |
| **Copy to Clipboard** | Floating "Copy" button on each log for easy sharing |
| **Ask AI Integration** | Analyze logs with AI - opens Perplexity AI with your log for instant analysis |
| **Excel Export** | Download logs as Excel with two options: filtered logs or complete POD logs |
| **Log Deduplication** | Hash-based deduplication prevents duplicate log storage |

### Search & Navigation

| Feature | Description |
|---------|-------------|
| **Full-Text Search** | FTS5-powered instant search across all log messages |
| **Splunk-Style AND/OR/NOT** | Combine terms: `error AND timeout`, `error OR warning`, `error NOT debug` |
| **Field Extraction & Filtering** | Auto-extracts key=value pairs from logs, click to filter |
| **Text Selection Search** | Select text in logs → click "Add to Search" to append to query |
| **Search History** | Recent searches stored and accessible via dropdown (last 10) |
| **Search Highlighting** | All matched terms highlighted in yellow |
| **Time Presets** | Quick time filters: Last 5m, 15m, 1h, 4h, 24h |
| **Time Window Navigation** | Click any timestamp → navigate ±5min/±10min around it |
| **Time Range Display** | Shows calculated start/end time for time window queries |
| **Search Persistence** | Search automatically re-applied when switching pods |
| **Auto-Select Dropdown** | Press Enter to auto-select when only one option matches |

### UI & Theming

| Feature | Description |
|---------|-------------|
| **22 Professional Themes** | 11 dark + 11 light themes including Bootstrap-inspired options |
| **Keyboard Shortcuts** | `/` search, `R` refresh, `T` theme, `F` filters, `E` fields, `?` help |
| **Bootstrap CSS** | Standardized styling for consistent fonts and colors |
| **Auto-Hiding Headers** | Table headers hide when scrolling down, reappear at top |
| **Severity Highlighting** | Error/Warning/Exception logs highlighted with color-coded backgrounds |
| **Fixed Column Widths** | Timestamp and Pod columns maintain consistent width |
| **Responsive Design** | Clean, modern interface optimized for log viewing |
| **Millisecond Precision** | Timestamps display with millisecond accuracy |
| **Adjustable Font Size** | + and − controls to adjust log table font size (10px-22px) |

## Requirements

- **macOS** (tested on macOS 12+) or **Windows** (Windows 10/11, non-admin users supported)
- Python 3.10+ (or Docker for Docker setup)
- Node.js 18+ (or Docker for Docker setup)
- kubectl installed and configured with cluster access

## Installation & Run Guide

### 🐳 Quick Start with Docker (Recommended)

**Easiest way to get started - no Python/Node installation needed!**

**Prerequisites:**
- Docker Desktop installed ([Download](https://www.docker.com/products/docker-desktop/))
- kubectl configured on your host machine

**Steps:**

1. **Clone the repository**
   ```bash
   git clone https://github.com/SrinathRayabarapu/LightweightKubernetesLogExplorer.git
   cd LightweightKubernetesLogExplorer
   ```

2. **Start the application**
   ```bash
   docker-compose up -d
   ```

3. **Access the app**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000

**Stop the application:**
```bash
docker-compose down
```

**View logs:**
```bash
docker-compose logs -f
```

**Rebuild after code changes:**
```bash
docker-compose up -d --build
```

> **📖 For detailed Docker instructions and troubleshooting, see [SHARING_GUIDE.md](SHARING_GUIDE.md)**

---

### Traditional Setup (Python + Node.js)

> **Windows Users**: See [Windows Installation Guide](#windows-installation-guide) below for PowerShell-specific instructions.

## macOS Installation Guide

### Step 1: Prerequisites Check

Verify you have all required tools:

```bash
# Check Python version (need 3.10+)
python3 --version

# Check Node.js version (need 18+)
node --version

# Check kubectl installation
kubectl version --client

# Check kubectl can access clusters
kubectl config get-contexts
```

### Step 2: Configure Kubernetes Clusters

**Important:** This application uses kubectl contexts for cluster access. Cluster IPs, tokens, and certificates are configured in kubectl, NOT in the application config files.

#### 2.1. Set Up kubectl Contexts

You need to configure kubectl contexts for each environment. See **[KUBECTL_SETUP.md](KUBECTL_SETUP.md)** for detailed instructions.

Quick example:
```bash
# List existing contexts
kubectl config get-contexts

# If you need to add a new context:
kubectl config set-cluster sit-cluster --server=https://your-cluster:6443
kubectl config set-credentials sit-user --token=your-token
kubectl config set-context sit-cluster --cluster=sit-cluster --user=sit-user
```

#### 2.2. Update Environment Config Files

Edit the config files to match your kubectl context names:

```bash
# Edit each config file
nano backend/app/env-config/sit.yaml
nano backend/app/env-config/replica.yaml
nano backend/app/env-config/prod.yaml
```

Each file should have:
```yaml
envName: sit                    # Environment name
kubectlContext: sit-cluster     # Must match kubectl context name exactly
defaultNamespace: default
allowedNamespaces:              # Optional: restrict visible namespaces
  - default
  - app-services
refreshInterval: 300            # Auto-refresh interval in seconds
```

**Verify context names match:**
```bash
# Check your kubectl contexts
kubectl config get-contexts

# Test each context
kubectl --context sit-cluster get nodes
kubectl --context prod-cluster get nodes
```

### Step 3: Install Backend Dependencies

```bash
cd backend

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install Python dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Verify installation
python3 -c "import fastapi, uvicorn, yaml, aiosqlite; print('All dependencies installed')"
```

### Step 4: Install Frontend Dependencies

```bash
cd frontend

# Install Node.js dependencies
npm install

# Verify installation
npm list --depth=0
```

### Step 5: Start the Backend Server

```bash
cd backend
source venv/bin/activate  # If not already activated

# Start the FastAPI server
python run.py
```

You should see:
```
Loading environment configurations...
Loaded 3 environment(s): sit, replica, prod
Initializing database...
Database initialized successfully
Starting refresh scheduler...
Refresh scheduler started
INFO:     Started server process [xxxxx]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8000
```

**Verify backend is running:**
```bash
# In another terminal
curl http://127.0.0.1:8000/health
# Should return: {"status":"healthy","app":"K8s Log Explorer","version":"1.0.0"}

curl http://127.0.0.1:8000/envs
# Should return list of environments
```

### Step 6: Start the Frontend Development Server

Open a **new terminal** (keep backend running):

```bash
cd frontend

# Start Vite dev server
npm run dev
```

You should see:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### Step 7: Access the Application

1. Open your browser and navigate to: **http://localhost:5173**
2. You should see the K8S Log Explorer interface
3. Select an environment from the dropdown
4. Choose a service and pod
5. Logs will be fetched automatically!

### Step 8: Verify Everything Works

1. **Test environment loading:**
   - Select different environments from dropdown
   - Each should load without errors

2. **Test service discovery:**
   - Select an environment
   - Service dropdown should populate from K8s cluster

3. **Test pod discovery:**
   - Select a service
   - Pod dropdown should show available pods with status

4. **Test automatic log fetching:**
   - Select a pod
   - Logs should appear automatically (no manual refresh needed)
   - Check log count display

5. **Test search:**
   - Enter a search term
   - Press Enter or click Search
   - Results should filter with highlighted matches

6. **Test log filtering toggle:**
   - If "(X filtered)" appears, click "Show All"
   - All logs should display including filtered ones
   - Click "Filtering Off" to re-enable filters

7. **Test time navigation:**
   - Click any log timestamp
   - Use ±5m or ±10m buttons
   - Note the time range displayed

## Windows Installation Guide

> **Note for Windows Users**: This guide is specifically for Windows (Windows 10/11) and supports non-admin users. All commands use PowerShell.

### Step 1: Prerequisites Check (Windows)

Open **PowerShell** (not Command Prompt) and verify you have all required tools:

```powershell
# Check Python version (need 3.10+)
python --version

# Check Node.js version (need 18+)
node --version

# Check kubectl installation
kubectl version --client

# Check kubectl can access clusters
kubectl config get-contexts
```

**If any tool is missing:**

- **Python**: Download from https://www.python.org/downloads/ (check "Add Python to PATH" during installation)
- **Node.js**: Download from https://nodejs.org/ (LTS version recommended)
- **kubectl**: Download from https://kubernetes.io/docs/tasks/tools/install-kubectl-windows/ or use Chocolatey: `choco install kubernetes-cli`

### Step 2: Configure Kubernetes Clusters (Windows)

**Important:** This application uses kubectl contexts for cluster access. Cluster IPs, tokens, and certificates are configured in kubectl, NOT in the application config files.

#### 2.1. Set Up kubectl Contexts (Windows)

**Option A: Use the provided PowerShell script (Recommended)**

1. Open PowerShell in the project directory
2. Run the setup script:

```powershell
# Make sure you're in the project root directory
.\setup-kubectl-contexts.ps1
```

**Option B: Manual Configuration**

If you prefer to configure manually:

```powershell
# List existing contexts
kubectl config get-contexts

# Configure SIT cluster
kubectl config set-cluster sit-cluster --server=https://10.167.166.26:6443 --insecure-skip-tls-verify=true
kubectl config set-credentials sit-user --token=<your-sit-token>
kubectl config set-context sit-cluster --cluster=sit-cluster --user=sit-user --namespace=jio-t2r-ms

# Configure REPLICA cluster
kubectl config set-cluster replica-cluster --server=https://10.166.132.10:6443 --insecure-skip-tls-verify=true
kubectl config set-credentials replica-user --token=<your-replica-token>
kubectl config set-context replica-cluster --cluster=replica-cluster --user=replica-user --namespace=jio-t2r-ms

# Configure PRODUCTION cluster
kubectl config set-cluster prod-cluster --server=https://10.166.16.95:6443 --insecure-skip-tls-verify=true
kubectl config set-credentials prod-user --token=<your-prod-token>
kubectl config set-context prod-cluster --cluster=prod-cluster --user=prod-user --namespace=jio-t2r-ms
```

#### 2.2. Update Environment Config Files (Windows)

Edit the config files using any text editor (Notepad, VS Code, etc.):

```powershell
# Using VS Code (if installed)
code backend\app\env-config\sit.yaml
code backend\app\env-config\replica.yaml
code backend\app\env-config\prod.yaml

# Or using Notepad
notepad backend\app\env-config\sit.yaml
```

Each file should have:
```yaml
envName: sit                    # Environment name
kubectlContext: sit-cluster     # Must match kubectl context name exactly
defaultNamespace: jio-t2r-ms
allowedNamespaces:              # Optional: restrict visible namespaces
  - jio-t2r-ms
refreshInterval: 300            # Auto-refresh interval in seconds
```

**Verify context names match:**
```powershell
# Check your kubectl contexts
kubectl config get-contexts

# Test each context
kubectl --context sit-cluster get nodes
kubectl --context prod-cluster get nodes
```

### Step 3: Install Backend Dependencies (Windows)

```powershell
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment (PowerShell)
.\venv\Scripts\Activate.ps1

# If you get an execution policy error, run this first:
# Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Install Python dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Verify installation
python -c "import fastapi, uvicorn, yaml, aiosqlite; print('All dependencies installed')"
```

**Note:** If you encounter "execution policy" errors when activating the virtual environment, run:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```
This allows PowerShell scripts to run for your user account only (no admin required).

### Step 4: Install Frontend Dependencies (Windows)

```powershell
cd frontend

# Install Node.js dependencies
npm install

# Verify installation
npm list --depth=0
```

### Step 5: Start the Backend Server (Windows)

```powershell
cd backend
.\venv\Scripts\Activate.ps1  # If not already activated

# Start the FastAPI server
python run.py
```

You should see:
```
Loading environment configurations...
Loaded 3 environment(s): sit, replica, prod
Initializing database...
Database initialized successfully
Starting refresh scheduler...
Refresh scheduler started
INFO:     Started server process [xxxxx]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8000
```

**Verify backend is running:**
```powershell
# In another PowerShell window
curl http://127.0.0.1:8000/health
# Should return: {"status":"healthy","app":"K8s Log Explorer","version":"1.0.0"}
```

### Step 6: Start the Frontend Development Server (Windows)

Open a **new PowerShell window** (keep backend running):

```powershell
cd frontend

# Start Vite dev server
npm run dev
```

You should see:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### Step 7: Access the Application (Windows)

1. Open your browser and navigate to: **http://localhost:5173**
2. You should see the K8S Log Explorer interface
3. Select an environment from the dropdown
4. Choose a service and pod
5. Logs will be fetched automatically!

### Step 8: Verify Everything Works (Windows)

Run the verification script:

```powershell
# From project root directory
.\verify-setup.ps1
```

Or manually test:
1. **Test environment loading:** Select different environments from dropdown
2. **Test service discovery:** Select an environment → Service dropdown should populate
3. **Test pod discovery:** Select a service → Pod dropdown should show available pods
4. **Test automatic log fetching:** Select a pod → Logs should appear automatically
5. **Test search:** Enter a search term → Results should filter with highlighted matches
6. **Test Excel download:** Click Download dropdown → Test both filtered and all logs options

### Troubleshooting Windows Issues

**PowerShell Execution Policy Error:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**Python not found:**
- Make sure Python is added to PATH during installation
- Restart PowerShell after installing Python
- Try `python` instead of `python3` on Windows

**Virtual environment activation fails:**
- Make sure you're using PowerShell (not CMD)
- Run: `.\venv\Scripts\Activate.ps1` (not `activate`)

**Port already in use:**
```powershell
# Backend (port 8000)
netstat -ano | findstr :8000
# Kill process using PID from above command
taskkill /PID <pid> /F

# Frontend (port 5173)
netstat -ano | findstr :5173
taskkill /PID <pid> /F
```

## Running in Production Mode

### Backend

```bash
cd backend
source venv/bin/activate

# Run with production settings
uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 1
```

### Frontend

```bash
cd frontend

# Build for production
npm run build

# Preview production build
npm run preview
```

## Stopping the Application

### Manual Stop

1. **Stop frontend:** Press `Ctrl+C` in the frontend terminal
2. **Stop backend:** Press `Ctrl+C` in the backend terminal
3. **Clean up:** The database (`backend/logs.db`) persists between runs

### Using Stop Scripts

**macOS/Linux:**
```bash
./stop.sh
```

**Windows:**
```powershell
.\stop.ps1
```

## Quick Start Scripts

For convenience, startup and shutdown scripts are provided to quickly start and stop all services.

### macOS/Linux

**Start all services:**
```bash
./start.sh
```

**Stop all services:**
```bash
./stop.sh
```

**What the scripts do:**
- `start.sh`: 
  - Checks prerequisites (Python, Node.js, kubectl)
  - Starts backend server in background
  - Starts frontend server in background
  - Saves process IDs for clean shutdown
  - Logs are written to `logs/backend.log` and `logs/frontend.log`

- `stop.sh`:
  - Gracefully stops both services
  - Cleans up PID files
  - Optionally kills processes on ports 8000/5173 if still running

**View logs:**
```bash
# Backend logs
tail -f logs/backend.log

# Frontend logs
tail -f logs/frontend.log
```

### Windows

**Start all services:**
```powershell
.\start.ps1
```

**Stop all services:**
```powershell
.\stop.ps1
```

**What the scripts do:**
- `start.ps1`: 
  - Checks prerequisites (Python, Node.js, kubectl)
  - Starts backend server in background
  - Starts frontend server in background
  - Saves process IDs for clean shutdown
  - Logs are written to `logs\backend.log` and `logs\frontend.log`

- `stop.ps1`:
  - Gracefully stops both services
  - Cleans up PID files
  - Optionally kills processes on ports 8000/5173 if still running

**View logs:**
```powershell
# Backend logs (live)
Get-Content logs\backend.log -Wait

# Frontend logs (live)
Get-Content logs\frontend.log -Wait
```

**Note:** The scripts create a `logs/` directory automatically. PID files (`.backend.pid`, `.frontend.pid`) are stored in the project root for process management.

## Usage Guide

### Basic Workflow

```
1. Select Environment (sit/replica/prod)
        ↓
2. Select Service (auto-populated from K8s)
        ↓
3. Select Pod (shows status: Running/Pending/etc.)
        ↓
4. Logs fetched automatically!
        ↓
5. Search, filter, navigate as needed
```

### Viewing Logs

1. **Automatic Fetching**: Logs are fetched automatically when you select a pod
2. **Complete History**: ALL available logs are fetched (no artificial limits)
3. **Paginated Display**: First 1000 logs shown, click "Load More" for more
4. **Newest First**: Logs display with newest at the top
5. **Refresh Button**: Click ↻ to manually re-fetch latest logs

### Searching Logs

- Enter search terms in the search bar (or press `/` to focus)
- Press Enter or click Search
- **AND/OR/NOT Operations**:
  - `error AND timeout` - Both terms must match
  - `error OR warning` - Either term matches
  - `error NOT debug` - Contains "error" but NOT "debug"
  - `"error occurred" AND exception NOT retry` - Complex queries
  - Default: space-separated words are AND: `error timeout` = `error AND timeout`
- **Search History**: Click search bar to see recent searches (last 10)
- **Highlighting**: All matched terms highlighted in yellow
- **Text Selection**: Select any text in logs → popup appears → click "Add to Search"
- **Persistence**: Search re-applied automatically when changing pods

### Field Extraction & Filtering

The Fields Panel (left sidebar) automatically extracts structured data from your logs:

**Extracted Fields:**
- `key=value` pairs (e.g., `level=INFO`, `status=200`, `method=POST`)
- Log levels in brackets: `[INFO]`, `[ERROR]`, `[WARN]`
- HTTP methods: `GET`, `POST`, `PUT`, `DELETE`
- HTTP status codes: `200`, `404`, `500`
- Common JSON fields: `level`, `severity`, `status`, `method`

**How to Use:**
1. Select a pod to view logs
2. Fields panel appears on the left with extracted values
3. Click ▶ to expand a field and see all values with counts
4. Click any value to add it to your search filter
5. Active filters shown at top with "×" to remove
6. Use `E` key to toggle fields panel visibility

**Example:**
```
If your logs contain: level=ERROR method=POST status=500
Fields panel shows:
  level:  ERROR (45), INFO (320), WARN (12)
  method: POST (100), GET (250)
  status: 500 (45), 200 (300), 404 (20)
```

### Time Presets & Navigation

**Quick Time Presets** (above log table):
- Click **Last 5m**, **15m**, **1h**, **4h**, or **24h** for instant filtering
- Shows logs from the selected time range until now

**Timestamp Navigation**:
1. Click any log timestamp
2. Use the **±5m** or **±10m** buttons to view surrounding logs
3. Time range displayed: "Showing logs from X to Y"
4. Or enter a custom time window
5. Click "Clear Filter" to return to normal view

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `/` or `Ctrl+K` | Focus search bar |
| `Esc` | Close popups / blur input |
| `R` | Refresh logs |
| `T` | Toggle dark/light theme |
| `F` | Toggle filters panel |
| `E` | Toggle fields panel |
| `?` | Show keyboard shortcuts help |

### Log Filtering

**Configured Exclusion Patterns** (in `frontend/src/config/logFilters.ts`):
- Health check endpoints
- Liveness/readiness probes
- Metrics endpoints
- Other noise patterns

**Toggle Filtering:**
1. When filters are active, you'll see "(X filtered)"
2. Click **"👁 Show All"** to see all logs including filtered ones
3. Button changes to **"🚫 Filtering Off"**
4. Click again to re-enable filters

### Auto-Refresh

1. Check the **Auto** checkbox
2. Click ⚙ to adjust the refresh interval:
   - **10s, 30s** - For real-time monitoring
   - **1m, 2m** - For active debugging
   - **5m, 10m** - For passive monitoring
3. ALL logs will be fetched on each refresh cycle

### Adjusting Font Size

The log table has adjustable font size for better readability:

1. Use **−** button to decrease font size
2. Use **+** button to increase font size
3. Click the **size value** (e.g., "14px") to reset to default
4. Range: 10px to 22px
5. Setting persists in browser localStorage
6. Only affects log table data (timestamp, pod, message columns)

### Downloading Logs

Export logs to Excel for offline analysis or sharing:

1. Click the **Download** dropdown button
2. Choose an option:
   - **Download Filtered Logs**: Exports currently displayed logs (with all active filters)
   - **Download All Logs**: Exports complete POD logs (ignoring filters)
3. Excel file includes: Timestamp, Environment, Namespace, Service, Pod, Container, Message
4. Filename format: `filtered_logs_<pod-name>_<timestamp>.xlsx`

### Ask AI (Log Analysis)

Get instant AI analysis for any log entry:

1. Hover over any log row
2. Click the **Ask AI** button (star icon)
3. Perplexity AI opens in a new tab with your log pre-loaded
4. AI analyzes the log and suggests causes/solutions for errors
5. Full prompt is also copied to clipboard for use with other AI services

### Themes & UI Customization

The application includes **22 professional themes** for personalized viewing:

#### Dark Themes (11)
| Theme | Description |
|-------|-------------|
| Classic Dark | Original dark blue theme (default) |
| Midnight | Refined dark with soft blue undertones |
| Ocean | Deep blue with calming teal accents |
| Forest | Calming dark green theme |
| Slate | Professional gray tones |
| Sunset | Warm dark theme with orange accents |
| Lavender | Soft purple tones |
| Coffee | Warm sepia tones |
| Darkly | Bootstrap Darkly-inspired |
| Cyborg | Tech-inspired with cyan highlights |
| Superhero | Dark with orange accents |

#### Light Themes (11)
| Theme | Description |
|-------|-------------|
| Daylight | Clean, warm light theme |
| Arctic | Cool light gray theme |
| Paper | Warm off-white theme |
| Mint | Fresh green-tinted light theme |
| Rose | Soft pink-tinted light theme |
| Sky | Blue-tinted light theme |
| Sand | Warm beige light theme |
| Lavender Light | Soft purple light theme |
| Flatly | Bootstrap Flatly-inspired flat design |
| Cosmo | Clean modern with blue accents |
| United | Ubuntu-inspired orange accents |

**To change themes:**
1. Click the **Theme** dropdown in the header
2. Select your preferred theme
3. Theme preference saved in browser localStorage

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Frontend     │────▶│    Backend      │────▶│    kubectl      │
│  React + Vite   │     │    FastAPI      │     │                 │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                │
                       ┌────────▼────────┐
                       │     SQLite      │
                       │   + FTS5        │
                       └─────────────────┘
```

### Backend Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI entry point with lifespan management
│   ├── config.py            # Environment config loader & app settings
│   ├── database.py          # SQLite + FTS5 with thread-safe operations
│   ├── models.py            # Pydantic models for API
│   ├── routers/
│   │   ├── envs.py          # /envs endpoints
│   │   ├── logs.py          # /logs, /search, /logs/by-time
│   │   ├── namespaces.py    # /namespaces, /services, /pods
│   │   └── refresh.py       # Auto-refresh control
│   ├── services/
│   │   ├── kubectl.py       # kubectl subprocess wrapper
│   │   ├── log_collector.py # Log fetching, parsing, multi-line handling
│   │   ├── log_store.py     # Log queries & FTS5 search
│   │   ├── retention.py     # Storage cap enforcement
│   │   └── refresh_scheduler.py  # Background refresh tasks
│   └── env-config/          # Environment YAML files
├── requirements.txt
└── run.py                   # Application entry point
```

### Frontend Structure

```
frontend/
├── src/
│   ├── api/
│   │   └── client.ts        # API client with all endpoints
│   ├── components/
│   │   ├── LogTable.tsx     # Main log display with all features
│   │   ├── SearchBar.tsx    # Search input with highlighting
│   │   ├── TimeNavigation.tsx
│   │   ├── EnvSelector.tsx
│   │   ├── PodSelector.tsx
│   │   ├── RefreshIndicator.tsx
│   │   ├── SearchableSelect.tsx
│   │   └── ThemeSelector.tsx
│   ├── config/
│   │   ├── themes.ts        # 22 theme definitions
│   │   └── logFilters.ts    # Exclusion patterns
│   ├── context/
│   │   └── ThemeContext.tsx # Theme state management
│   ├── hooks/
│   │   └── useLogs.ts       # React Query hooks
│   ├── App.tsx              # Main application component
│   ├── main.tsx             # Entry point with providers
│   └── index.css            # Global styles & Bootstrap overrides
├── package.json
└── vite.config.ts
```

For detailed architecture documentation, see **[ARCHITECTURE.md](ARCHITECTURE.md)**.

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/envs` | GET | List environments |
| `/namespaces` | GET | List namespaces |
| `/services` | GET | List services in namespace |
| `/pods` | GET | List pods for a service with status |
| `/logs` | GET | Get logs with pagination (`limit`, `offset`) |
| `/logs/fetch` | POST | Fetch logs from K8s (`fetchAll` for complete history) |
| `/logs/search` | GET | Full-text search with FTS5 |
| `/logs/by-time` | GET | Time-window query (±minutes around timestamp) |
| `/logs/storage` | GET | Storage statistics |
| `/refresh/subscribe` | POST | Enable auto-refresh |
| `/refresh/unsubscribe` | POST | Disable auto-refresh |

## Storage & Retention

- **Database location**: `backend/logs.db`
- **Maximum size**: 100 MB (configurable in `config.py`)
- **Retention**: Oldest logs deleted first when limit exceeded
- **VACUUM**: Runs after deletion to reclaim disk space
- **WAL Mode**: Write-Ahead Logging for better concurrent performance

### Log Deduplication

Logs are deduplicated using a SHA-256 hash of:
- Environment
- Pod name
- Container name
- Timestamp
- First 100 characters of message

## Configuration Reference

### Environment Config (`env-config/*.yaml`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `envName` | string | Yes | Environment identifier |
| `kubectlContext` | string | Yes | kubectl context name |
| `defaultNamespace` | string | Yes | Default namespace selection |
| `allowedNamespaces` | list | No | Restrict namespace visibility |
| `refreshInterval` | int | No | Auto-refresh interval (seconds) |

### Application Settings (`config.py`)

| Setting | Default | Description |
|---------|---------|-------------|
| `DATABASE_PATH` | `logs.db` | SQLite database file |
| `MAX_DB_SIZE_MB` | 100 | Storage cap in megabytes |
| `DEFAULT_LOG_LIMIT` | 500 | Default logs per API query |
| `MAX_LOG_LIMIT` | 10000 | Maximum logs per query |
| `LOG_FETCH_BATCH_SIZE` | 5000 | Log lines fetched per kubectl call |
| `LOG_FETCH_TIMEOUT` | 60 | Timeout for kubectl commands (seconds) |

### Log Filtering (`frontend/src/config/logFilters.ts`)

Configure patterns to exclude unwanted logs from display:

```typescript
export const logFilterConfig = {
  enabled: true,
  excludePatterns: [
    'healthcheck',
    'liveness probe',
    'readiness probe',
    '/actuator/',
    '/health',
    '/metrics',
    // Add your custom patterns here
  ],
};
```

Patterns are case-insensitive and match anywhere in the log message.

## Troubleshooting

### "kubectl not found"

Ensure kubectl is installed and in your PATH:

```bash
which kubectl
kubectl version --client
```

**Install kubectl on macOS:**
```bash
brew install kubectl
```

### "Unknown context" or "context not found"

The `kubectlContext` in your config files doesn't match any kubectl context:

```bash
# Check available contexts
kubectl config get-contexts

# Verify context names match exactly (case-sensitive)
cat backend/app/env-config/sit.yaml | grep kubectlContext

# Test the context directly
kubectl --context sit-cluster get nodes
```

### "Unable to connect to the server"

The kubectl context exists but cluster is unreachable:

```bash
# Test the context directly
kubectl --context sit-cluster get nodes

# Check network connectivity
ping <cluster-ip>

# Verify credentials haven't expired
kubectl --context sit-cluster auth can-i get pods
```

### Backend Segmentation Fault

If the backend crashes with "segmentation fault":

1. **Restart the backend** - this usually resolves temporary issues
2. **Check for concurrent processes** - only one backend should run
3. **Clear the database** if corrupted:
   ```bash
   rm backend/logs.db*
   ```

The application includes robust handling for database concurrency using asyncio locks.

### "No pods found" or "No logs"

```bash
# Check service selector
kubectl --context sit-cluster get svc <service> -n <namespace> -o yaml

# Check pods matching selector
kubectl --context sit-cluster get pods -n <namespace> -l <selector>

# Check pod logs directly
kubectl --context sit-cluster logs <pod-name> -n <namespace>
```

### Database locked

Only one backend instance should run at a time:

```bash
# Check for existing processes
lsof backend/logs.db

# Kill existing Python processes if needed
pkill -f "python.*run.py"
```

### Port already in use

```bash
# Backend (port 8000)
lsof -ti:8000 | xargs kill -9

# Frontend (port 5173)
lsof -ti:5173 | xargs kill -9
```

## Limitations

- **Single user**: No authentication or multi-user support
- **Local only**: Not designed for network deployment
- **No streaming**: Logs are fetched on-demand, not streamed in real-time
- **Label selector only**: Service-to-pod resolution uses label selectors
- **macOS optimized**: Tested primarily on macOS

## Development

### Running Tests

```bash
cd backend
source venv/bin/activate
pytest
```

### Building Frontend

```bash
cd frontend
npm run build
```

### Type Checking

```bash
cd frontend
npm run build  # Includes TypeScript compilation
```

## Roadmap

See **[ROADMAP.md](ROADMAP.md)** for planned features including:

- **Phase 2**: Wildcard search, saved searches, share URL, case sensitivity
- **Phase 3**: Field extraction, timeline sparkline, live tail, regex search

## Sharing with Your Team

Want to share this tool with your team? We've got you covered!

### 🐳 Recommended: Docker Compose

The **easiest way** to share - just 3 steps:

1. Clone the repo
2. Run `docker-compose up -d`
3. Access http://localhost:3000

**No Python or Node.js installation needed!**

### 📖 Complete Sharing Guide

See **[SHARING_GUIDE.md](SHARING_GUIDE.md)** for:
- Docker Compose setup (recommended)
- GitHub clone instructions
- Pre-built zip distribution
- Troubleshooting tips
- Team sharing best practices

### Quick Comparison

| Method | Setup Time | Requirements |
|--------|-----------|--------------|
| **Docker Compose** | ⚡ 2 minutes | Docker only |
| **GitHub Clone** | ⏱️ 10 minutes | Python + Node |
| **Zip File** | ⏱️ 10 minutes | Python + Node |

## License

MIT
