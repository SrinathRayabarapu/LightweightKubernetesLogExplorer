# Kubernetes Cluster Configuration Guide

## Important: Cluster IPs and Tokens Configuration

**This application does NOT store cluster IPs or authentication tokens directly.** Instead, it uses **kubectl contexts**, which are configured separately in your `~/.kube/config` file.

## How It Works

1. **kubectl contexts** contain all cluster connection details (server URL, certificates, tokens, etc.)
2. **Environment config files** (`backend/app/env-config/*.yaml`) only map environment names to kubectl context names
3. The application uses `kubectl --context <context-name>` to execute commands

## Step-by-Step Setup

### 1. Configure kubectl Contexts

You need to set up kubectl contexts for each environment. Here are common methods:

#### Method A: Using kubectl config (for existing clusters)

```bash
# View existing contexts
kubectl config get-contexts

# If contexts already exist, you're done!
# Just note the context names and use them in the config files
```

#### Method B: Adding a new context manually

```bash
# Add a new cluster
kubectl config set-cluster sit-cluster \
  --server=https://your-cluster-ip:6443 \
  --certificate-authority=/path/to/ca.crt

# Add credentials (choose one method):

# Option 1: Using a token
kubectl config set-credentials sit-user \
  --token=your-token-here

# Option 2: Using a kubeconfig file
kubectl config set-credentials sit-user \
  --kubeconfig=/path/to/kubeconfig

# Option 3: Using client certificate
kubectl config set-credentials sit-user \
  --client-certificate=/path/to/client.crt \
  --client-key=/path/to/client.key

# Create the context
kubectl config set-context sit-cluster \
  --cluster=sit-cluster \
  --user=sit-user \
  --namespace=default

# Set as current context (optional)
kubectl config use-context sit-cluster
```

#### Method C: Using a kubeconfig file

If you have a kubeconfig file from your cluster administrator:

```bash
# Merge into your main config
export KUBECONFIG=~/.kube/config:/path/to/new-kubeconfig.yaml
kubectl config view --flatten > ~/.kube/config_merged
mv ~/.kube/config_merged ~/.kube/config

# Or set context directly
kubectl config set-context sit-cluster \
  --kubeconfig=/path/to/kubeconfig.yaml
```

#### Method D: Using cloud provider CLI tools

**AWS EKS:**
```bash
aws eks update-kubeconfig --name <cluster-name> --region <region> --alias sit-cluster
```

**Google GKE:**
```bash
gcloud container clusters get-credentials <cluster-name> --zone <zone> --project <project>
# Then rename the context
kubectl config rename-context gke_<project>_<zone>_<cluster> sit-cluster
```

**Azure AKS:**
```bash
az aks get-credentials --resource-group <rg> --name <cluster-name> --overwrite-existing
# Then rename the context
kubectl config rename-context <old-name> sit-cluster
```

### 2. Verify Contexts

```bash
# List all contexts
kubectl config get-contexts

# Test a context
kubectl --context sit-cluster get nodes

# Test another context
kubectl --context prod-cluster get nodes
```

Expected output:
```
CURRENT   NAME            CLUSTER         AUTHINFO        NAMESPACE
          sit-cluster     sit-cluster     sit-user        default
*         prod-cluster    prod-cluster    prod-user       default
```

### 3. Update Environment Config Files

Edit the config files to match your kubectl context names:

**`backend/app/env-config/sit.yaml`:**
```yaml
envName: sit
kubectlContext: sit-cluster        # Must match kubectl context name
defaultNamespace: default
allowedNamespaces:
  - default
  - app-services
refreshInterval: 300
```

**`backend/app/env-config/prod.yaml`:**
```yaml
envName: prod
kubectlContext: prod-cluster      # Must match kubectl context name
defaultNamespace: default
allowedNamespaces:
  - default
  - production
refreshInterval: 600
```

### 4. Test Configuration

```bash
# Test that the app can see your contexts
cd backend
python3 -c "
from app.config import load_env_configs
configs = load_env_configs()
for name, config in configs.items():
    print(f'{name}: {config.kubectlContext}')
"
```

## Security Notes

- **Never commit** `~/.kube/config` to version control
- kubectl contexts store credentials securely in `~/.kube/config`
- The application only reads context names, not credentials
- All authentication is handled by kubectl itself

## Troubleshooting

### "context not found"

The `kubectlContext` in your YAML file doesn't match any kubectl context:

```bash
# Check available contexts
kubectl config get-contexts

# Update your config file to match
```

### "Unable to connect to the server"

The kubectl context is configured but the cluster is unreachable:

```bash
# Test the context directly
kubectl --context sit-cluster get nodes

# Check network connectivity
ping <cluster-ip>

# Verify credentials haven't expired
kubectl --context sit-cluster auth can-i get pods
```

### "Unauthorized" or "Forbidden"

Your credentials don't have permission:

```bash
# Check permissions
kubectl --context sit-cluster auth can-i get pods
kubectl --context sit-cluster auth can-i get logs

# You need at least:
# - get pods
# - get services
# - get logs
```

## Example: Complete Setup for Three Environments

```bash
# 1. Configure kubectl contexts
kubectl config set-cluster sit-cluster --server=https://sit.example.com:6443 --certificate-authority=ca.crt
kubectl config set-credentials sit-user --token=<sit-token>
kubectl config set-context sit-cluster --cluster=sit-cluster --user=sit-user

kubectl config set-cluster replica-cluster --server=https://replica.example.com:6443 --certificate-authority=ca.crt
kubectl config set-credentials replica-user --token=<replica-token>
kubectl config set-context replica-cluster --cluster=replica-cluster --user=replica-user

kubectl config set-cluster prod-cluster --server=https://prod.example.com:6443 --certificate-authority=ca.crt
kubectl config set-credentials prod-user --token=<prod-token>
kubectl config set-context prod-cluster --cluster=prod-cluster --user=prod-user

# 2. Verify
kubectl config get-contexts

# 3. Update config files (already done in the repo)
# backend/app/env-config/sit.yaml -> kubectlContext: sit-cluster
# backend/app/env-config/replica.yaml -> kubectlContext: replica-cluster
# backend/app/env-config/prod.yaml -> kubectlContext: prod-cluster
```
