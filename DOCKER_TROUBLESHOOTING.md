# Docker Troubleshooting Guide

## Error: 403 Forbidden when pulling images

This error occurs when Docker Hub blocks requests due to:
- Rate limiting for anonymous users
- Network/proxy issues
- Authentication required

### Solution 1: Login to Docker Hub (Recommended)

Create a free Docker Hub account and login:

```bash
# Login to Docker Hub
docker login

# Enter your Docker Hub username and password when prompted
# If you don't have an account, create one at https://hub.docker.com/signup
```

After logging in, try again:
```bash
docker compose up -d
```

### Solution 2: Check Network/Proxy Settings

If you're behind a corporate proxy:

1. **Configure Docker Desktop proxy:**
   - Open Docker Desktop
   - Go to Settings → Resources → Proxies
   - Configure HTTP/HTTPS proxy settings

2. **Or set environment variables:**
   ```bash
   export HTTP_PROXY=http://proxy.example.com:8080
   export HTTPS_PROXY=http://proxy.example.com:8080
   export NO_PROXY=localhost,127.0.0.1
   ```

### Solution 3: Use Alternative Registry (Advanced)

If Docker Hub continues to block, you can use alternative registries by modifying the Dockerfiles to use:
- `mcr.microsoft.com` (Microsoft Container Registry)
- `quay.io` (Red Hat Quay)
- `ghcr.io` (GitHub Container Registry)

### Solution 4: Wait and Retry

Docker Hub rate limits reset periodically. Wait 5-10 minutes and try again.

### Solution 5: Use Traditional Setup Instead

If Docker continues to have issues, use the traditional setup:

```bash
# macOS/Linux
./start.sh

# Windows
.\start.ps1
```

This doesn't require Docker Hub access.

---

## Error: Permission denied while connecting to Docker daemon

**Solution:** Make sure Docker Desktop is fully started:
1. Open Docker Desktop application
2. Wait for the whale icon to appear in menu bar
3. Wait until it shows "Docker Desktop is running"
4. Try the command again

---

## Error: Port already in use

**Solution:** Change ports in `docker-compose.yml`:

```yaml
ports:
  - "8001:8000"  # Backend (change 8000 to 8001)
  - "3001:3000"  # Frontend (change 3000 to 3001)
```

Then access at:
- Frontend: http://localhost:3001
- Backend: http://localhost:8001

---

## Error: kubectl not found in container

**Solution:** Ensure `~/.kube/config` exists on your host:

```bash
# Check if config exists
ls -la ~/.kube/config

# If not, configure kubectl first
kubectl config set-context your-context-name ...
```

---

## Still Having Issues?

1. Check Docker Desktop logs: Docker Desktop → Troubleshoot → View logs
2. Restart Docker Desktop
3. Try traditional setup: `./start.sh` (no Docker needed)
4. Open an issue on GitHub with error details
