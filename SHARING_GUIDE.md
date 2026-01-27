# Sharing Guide - K8S Log Explorer

This guide helps you share the K8S Log Explorer with your team quickly and easily.

## 🚀 Recommended: Docker Compose (Easiest)

**Best for**: Teams that want zero setup hassle

### Prerequisites
- **Docker Desktop** installed ([Download](https://www.docker.com/products/docker-desktop/))
- **kubectl** configured on host machine (`~/.kube/config`)

### Quick Start (3 Steps)

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

**That's it!** No Python, no Node.js, no dependencies to install.

### Stop the Application
```bash
docker-compose down
```

### View Logs
```bash
# All services
docker-compose logs -f

# Backend only
docker-compose logs -f backend

# Frontend only
docker-compose logs -f frontend
```

### Rebuild After Code Changes
```bash
docker-compose up -d --build
```

---

## 📦 Option 2: GitHub Clone + Scripts

**Best for**: Developers comfortable with Python/Node setup

### Prerequisites
- Python 3.10+
- Node.js 18+
- kubectl configured

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/SrinathRayabarapu/LightweightKubernetesLogExplorer.git
   cd LightweightKubernetesLogExplorer
   ```

2. **Run the startup script**
   ```bash
   # macOS/Linux
   ./start.sh
   
   # Windows
   .\start.ps1
   ```

3. **Access the app**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000

See [README.md](README.md) for detailed setup instructions.

---

## 📎 Option 3: Pre-built Zip File

**Best for**: Teams without GitHub access or prefer offline distribution

### Steps

1. **Create a zip file**
   ```bash
   # Exclude unnecessary files
   zip -r k8s-log-explorer.zip . \
     -x "*.git*" \
     -x "*node_modules*" \
     -x "*venv*" \
     -x "*.db" \
     -x "*logs*" \
     -x "*.pid"
   ```

2. **Share the zip file** via email, shared drive, etc.

3. **Recipients extract and run**
   ```bash
   unzip k8s-log-explorer.zip
   cd LightweightKubernetesLogExplorer
   ./start.sh  # or .\start.ps1 on Windows
   ```

---

## 🔧 Troubleshooting

### Docker Issues

**Port already in use**
```bash
# Change ports in docker-compose.yml
ports:
  - "8001:8000"  # Backend
  - "3001:3000"  # Frontend
```

**kubectl not working in container**
- Ensure `~/.kube/config` exists on host
- Check permissions: `chmod 600 ~/.kube/config`
- Verify kubectl works: `kubectl get nodes`

**Database persistence**
- Database stored in `./data` directory
- To reset: `docker-compose down && rm -rf data/`

### Traditional Setup Issues

See [README.md](README.md) Troubleshooting section.

---

## 📊 Comparison

| Method | Setup Time | Requirements | Best For |
|--------|-----------|--------------|----------|
| **Docker Compose** | ⚡ 2 minutes | Docker only | Everyone |
| **GitHub Clone** | ⏱️ 10 minutes | Python + Node | Developers |
| **Zip File** | ⏱️ 10 minutes | Python + Node | Offline teams |

---

## 💡 Tips for Team Sharing

1. **Create a team channel** (Slack/Teams) with:
   - GitHub repo link
   - Quick start instructions
   - Troubleshooting FAQ

2. **Record a 2-minute demo video** showing:
   - Docker setup
   - Basic usage (select env → service → pod → search)

3. **Share kubectl config setup guide** if team members need cluster access

4. **Set up a shared wiki** with:
   - Common issues and solutions
   - Environment configuration examples
   - Best practices

---

## ✅ Checklist for Sharing

- [ ] Docker Compose tested on macOS/Linux/Windows
- [ ] README.md updated with Docker instructions
- [ ] Team has Docker Desktop installed
- [ ] Team has kubectl configured
- [ ] GitHub repo is accessible
- [ ] Quick start guide shared (this file)

---

**Questions?** Open an issue on GitHub or contact the team lead.
