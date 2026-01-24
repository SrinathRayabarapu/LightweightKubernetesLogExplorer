# Kubernetes Log Explorer

A lightweight, local web application for exploring Kubernetes logs across multiple environments. Built for developers who need quick access to logs without external infrastructure.

## Table of Contents

- [Important: Cluster Configuration](#important-cluster-configuration)
- [Features](#features)
- [Requirements](#requirements)
- [Installation & Run Guide](#installation--run-guide)
  - [Step 1: Prerequisites Check](#step-1-prerequisites-check)
  - [Step 2: Configure Kubernetes Clusters](#step-2-configure-kubernetes-clusters)
  - [Step 3: Install Backend Dependencies](#step-3-install-backend-dependencies)
  - [Step 4: Install Frontend Dependencies](#step-4-install-frontend-dependencies)
  - [Step 5: Start the Backend Server](#step-5-start-the-backend-server)
  - [Step 6: Start the Frontend Development Server](#step-6-start-the-frontend-development-server)
  - [Step 7: Access the Application](#step-7-access-the-application)
  - [Step 8: Verify Everything Works](#step-8-verify-everything-works)
- [Running in Production Mode](#running-in-production-mode)
- [Stopping the Application](#stopping-the-application)
- [Usage](#usage)
  - [Viewing Logs](#viewing-logs)
  - [Searching Logs](#searching-logs)
  - [Time Navigation](#time-navigation)
  - [Auto-Refresh](#auto-refresh)
- [Architecture](#architecture)
- [API Reference](#api-reference)
- [Storage & Retention](#storage--retention)
- [Configuration Reference](#configuration-reference)
- [Troubleshooting](#troubleshooting)
- [Limitations](#limitations)
- [Development](#development)
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

- **Multi-environment support**: Configure multiple Kubernetes clusters (sit, replica, prod)
- **Full-text search**: SQLite FTS5-powered search across log messages
- **Time-based navigation**: Splunk-style log exploration with +5min/+10min windows
- **Auto-refresh**: Configurable automatic log fetching
- **Storage management**: 100 MB cap with automatic cleanup of old logs
- **Production warning**: Confirmation dialog when accessing production logs

## Requirements

- macOS (tested on macOS 12+)
- Python 3.10+
- Node.js 18+
- kubectl installed and configured with cluster access

## Installation & Run Guide

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
2. You should see the K8s Log Explorer interface
3. Select an environment from the dropdown
4. Choose a namespace and service
5. Click **Refresh** to fetch logs

### Step 8: Verify Everything Works

1. **Test environment loading:**
   - Select different environments from dropdown
   - Each should load without errors

2. **Test namespace/service discovery:**
   - Select an environment
   - Namespace dropdown should populate
   - Select a namespace
   - Service dropdown should populate

3. **Test log fetching:**
   - Select env, namespace, and service
   - Click **Refresh**
   - Logs should appear in the table

4. **Test search:**
   - Enter a search term
   - Press Enter or click Search
   - Results should filter

5. **Test time navigation:**
   - Click any log timestamp
   - Use ±5m or ±10m buttons
   - Logs should update to show time window

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

1. **Stop frontend:** Press `Ctrl+C` in the frontend terminal
2. **Stop backend:** Press `Ctrl+C` in the backend terminal
3. **Clean up:** The database (`backend/logs.db`) persists between runs

## Usage

### Viewing Logs

1. Select an environment from the dropdown
2. Choose a namespace and service
3. Click **Refresh** to fetch logs from Kubernetes
4. Logs display newest-first

### Searching Logs

- Enter search terms in the search bar
- Press Enter or click Search
- FTS5 supports phrase search with quotes: `"error occurred"`

### Time Navigation

1. Click any log timestamp
2. Use the **±5m** or **±10m** buttons to view surrounding logs
3. Or enter a custom time window

### Auto-Refresh

1. Check the **Auto** checkbox
2. Click ⚙ to adjust the refresh interval (1m, 2m, 5m, 10m)
3. Logs will be fetched automatically from Kubernetes

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
│   ├── main.py              # FastAPI entry point
│   ├── config.py            # Environment config loader
│   ├── database.py          # SQLite + FTS5 setup
│   ├── models.py            # Pydantic models
│   ├── routers/
│   │   ├── envs.py          # /envs endpoints
│   │   ├── logs.py          # /logs, /search, /logs/by-time
│   │   ├── namespaces.py    # /namespaces, /services
│   │   └── refresh.py       # Auto-refresh control
│   ├── services/
│   │   ├── kubectl.py       # kubectl subprocess wrapper
│   │   ├── log_collector.py # Log fetching & parsing
│   │   ├── log_store.py     # Log queries
│   │   ├── retention.py     # Storage cap enforcement
│   │   └── refresh_scheduler.py
│   └── env-config/          # Environment YAML files
├── requirements.txt
└── run.py
```

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/envs` | GET | List environments |
| `/namespaces` | GET | List namespaces |
| `/services` | GET | List services |
| `/logs` | GET | Get logs with filters |
| `/logs/fetch` | POST | Fetch logs from K8s |
| `/logs/search` | GET | Full-text search |
| `/logs/by-time` | GET | Time-window query |
| `/logs/storage` | GET | Storage statistics |
| `/refresh/subscribe` | POST | Enable auto-refresh |
| `/refresh/unsubscribe` | POST | Disable auto-refresh |

## Storage & Retention

- Database location: `backend/logs.db`
- Maximum size: 100 MB (configurable in `config.py`)
- Retention: Oldest logs deleted first when limit exceeded
- VACUUM runs after deletion to reclaim space

### Log Deduplication

Logs are deduplicated using a hash of:
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
| `DEFAULT_LOG_LIMIT` | 100 | Default logs per query |
| `MAX_LOG_LIMIT` | 1000 | Maximum logs per query |

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

**Solution:** Update your config files to match actual context names, or create the missing contexts (see [KUBECTL_SETUP.md](KUBECTL_SETUP.md)).

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

**Solution:** Check network connectivity, verify cluster is running, and refresh credentials if needed.

### "Unauthorized" or "Forbidden"

Your credentials don't have permission:

```bash
# Check permissions
kubectl --context sit-cluster auth can-i get pods
kubectl --context sit-cluster auth can-i get logs
kubectl --context sit-cluster auth can-i get services
```

**Required permissions:**
- `get pods`
- `get services`
- `get logs`

**Solution:** Contact your cluster administrator to grant necessary permissions.

### "No pods found"

The service may not have any running pods, or the selector doesn't match:

```bash
# Check service selector
kubectl --context sit-cluster get svc <service> -n <namespace> -o yaml | grep selector

# Check pods matching selector
kubectl --context sit-cluster get pods -n <namespace> -l <selector>

# Check all pods in namespace
kubectl --context sit-cluster get pods -n <namespace>
```

**Solution:** Verify the service exists and has pods running. Check pod status with `kubectl get pods`.

### "ModuleNotFoundError: No module named 'yaml'"

Backend dependencies not installed:

```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

### "npm ERR! code ENOTFOUND"

Network issue or npm registry unreachable:

```bash
# Check npm configuration
npm config get registry

# Try with different registry or check network
npm install --registry https://registry.npmjs.org/
```

### Database locked

Only one backend instance should run at a time:

```bash
# Check for existing processes
lsof backend/logs.db

# Kill existing Python processes if needed
pkill -f "python.*run.py"
pkill -f "uvicorn.*app.main"
```

### Backend won't start

Check for errors:

```bash
cd backend
source venv/bin/activate

# Test config loading
python3 -c "from app.config import load_env_configs; load_env_configs()"

# Test database init
python3 -c "import asyncio; from app.database import init_database; asyncio.run(init_database())"
```

### Frontend shows "Failed to fetch" or connection errors

1. **Verify backend is running:**
   ```bash
   curl http://127.0.0.1:8000/health
   ```

2. **Check CORS settings** in `backend/app/main.py` - ensure frontend URL is allowed

3. **Check browser console** for detailed error messages

4. **Verify proxy settings** in `frontend/vite.config.ts`

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
- **No streaming**: Logs are fetched on-demand, not streamed
- **Label selector only**: Service-to-pod resolution uses label selectors

## Development

### Running Tests

```bash
cd backend
pytest
```

### Building Frontend

```bash
cd frontend
npm run build
```

## License

MIT
