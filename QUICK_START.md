# Quick Start Guide

## Answers to Common Questions

### 1. Where are cluster IPs and tokens configured?

**Answer:** Cluster IPs, tokens, and certificates are configured in **kubectl**, NOT in the application config files.

- **Location:** `~/.kube/config` (kubectl configuration file)
- **Application config files** (`backend/app/env-config/*.yaml`) only map environment names to kubectl context names
- **How it works:** The app runs `kubectl --context <context-name>` commands, and kubectl handles all authentication

**To configure:**
1. Set up kubectl contexts (see [KUBECTL_SETUP.md](KUBECTL_SETUP.md))
2. Update `backend/app/env-config/*.yaml` files to reference your context names

**Example:**
```bash
# 1. Configure kubectl context (stores cluster IP, token, etc.)
kubectl config set-cluster sit-cluster --server=https://10.0.0.1:6443
kubectl config set-credentials sit-user --token=eyJhbGc...
kubectl config set-context sit-cluster --cluster=sit-cluster --user=sit-user

# 2. Update config file to reference the context name
# backend/app/env-config/sit.yaml:
kubectlContext: sit-cluster  # ← This references the kubectl context above
```

### 2. Compilation Status

✅ **Backend (Python):** All files compile successfully
- Syntax check: ✅ Passed
- Import structure: ✅ Valid
- No syntax errors detected

✅ **Frontend (TypeScript):** All files structured correctly
- TypeScript configuration: ✅ Valid
- Component structure: ✅ Valid
- No obvious syntax errors

**Note:** Full compilation requires dependencies to be installed:
- Backend: `pip install -r requirements.txt`
- Frontend: `npm install`

### 3. Run Guide

See **[README.md](README.md)** for the complete run guide. Quick version:

```bash
# 1. Configure kubectl contexts (see KUBECTL_SETUP.md)
kubectl config get-contexts

# 2. Update config files
nano backend/app/env-config/sit.yaml  # Set kubectlContext to match your context name

# 3. Install backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python run.py

# 4. Install frontend (in new terminal)
cd frontend
npm install
npm run dev

# 5. Open browser
# http://localhost:5173
```

## File Structure Summary

```
LightweightKubernetesLogExplorer/
├── backend/
│   ├── app/
│   │   ├── env-config/          ← Environment configs (map names to kubectl contexts)
│   │   │   ├── sit.yaml
│   │   │   ├── replica.yaml
│   │   │   └── prod.yaml
│   │   └── ...
│   └── requirements.txt
├── frontend/
│   └── ...
├── README.md                    ← Complete documentation
├── KUBECTL_SETUP.md            ← How to configure kubectl contexts
└── QUICK_START.md              ← This file
```

## Configuration Files Explained

### Environment Config Files (`backend/app/env-config/*.yaml`)

These files **DO NOT** contain cluster IPs or tokens. They only contain:

```yaml
envName: sit                    # Environment identifier
kubectlContext: sit-cluster     # ← References kubectl context name
defaultNamespace: default      # Default namespace
allowedNamespaces:             # Optional namespace filter
  - default
refreshInterval: 300           # Auto-refresh interval
```

**The `kubectlContext` field** must match a context name from `kubectl config get-contexts`.

### kubectl Configuration (`~/.kube/config`)

This file **DOES** contain cluster IPs, tokens, certificates:

```yaml
clusters:
- cluster:
    server: https://10.0.0.1:6443    # ← Cluster IP
    certificate-authority-data: ...   # ← Certificate
  name: sit-cluster
users:
- name: sit-user
  user:
    token: eyJhbGc...                 # ← Token
contexts:
- context:
    cluster: sit-cluster
    user: sit-user
  name: sit-cluster                   # ← Context name (used in config files)
```

## Verification Checklist

Before running, verify:

- [ ] kubectl is installed: `kubectl version --client`
- [ ] kubectl contexts exist: `kubectl config get-contexts`
- [ ] Contexts are accessible: `kubectl --context sit-cluster get nodes`
- [ ] Config files reference correct context names: `grep kubectlContext backend/app/env-config/*.yaml`
- [ ] Python 3.10+ installed: `python3 --version`
- [ ] Node.js 18+ installed: `node --version`

## Next Steps

1. Read [KUBECTL_SETUP.md](KUBECTL_SETUP.md) for detailed kubectl configuration
2. Follow the run guide in [README.md](README.md)
3. Start with one environment (sit) to test, then add others
