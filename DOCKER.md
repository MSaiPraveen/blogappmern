# BlogApp MERN - Docker & CI/CD Setup

## 🐳 Docker Setup

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- Make sure Docker Desktop is started before running commands

---

## 🖥️ Local Testing with Docker Desktop (Windows)

### Step 1: Open PowerShell and navigate to project
```powershell
cd C:\Users\saipr\ReactApps\blogappmern
```

### Step 2: Create environment file
```powershell
# Copy the ready-to-use local config
copy .env.docker .env
```

### Step 3: Build and run containers
```powershell
# Build and start all services (first time takes 2-5 minutes)
docker-compose up --build

# Or run in background (detached mode)
docker-compose up --build -d
```

### Step 4: Access your app
| Service | URL |
|---------|-----|
| **Frontend** | http://localhost |
| **Backend API** | http://localhost:5000/api |
| **Health Check** | http://localhost:5000/api/health |
| **MongoDB** | localhost:27017 |

### Step 5: Stop containers
```powershell
# Stop all services
docker-compose down

# Stop and delete all data (fresh start)
docker-compose down -v
```

---

## 🔧 Development Mode (with hot reloading)

Use this when you're actively coding and want changes to reflect immediately:

```powershell
# Start development containers
docker-compose -f docker-compose.dev.yml up --build

# Access:
# - Frontend: http://localhost:5173
# - Backend:  http://localhost:5000
# - MongoDB:  localhost:27017
```

---

## 🚀 Production Mode (local test)

Use this to test the production build locally:

```powershell
# Start production containers
docker-compose up --build -d

# Access:
# - App: http://localhost (port 80)
# - API: http://localhost/api
```

### Docker Commands

```powershell
# View running containers
docker-compose ps

# View logs
docker-compose logs -f              # All services
docker-compose logs -f server       # Server only
docker-compose logs -f client       # Client only

# Stop services
docker-compose down

# Stop and remove volumes (⚠️ deletes data)
docker-compose down -v

# Rebuild specific service
docker-compose build server
docker-compose up -d server

# Check container status in Docker Desktop
# Open Docker Desktop > Containers to see all running containers
```

---

## 🚀 CI/CD with GitHub Actions

### Workflows

| Workflow | Trigger | Description |
|----------|---------|-------------|
| `ci.yml` | Push/PR to main, develop | Lint, test, build Docker images |
| `cd.yml` | Push to main | Build, push to GHCR, deploy via SSH |
| `docker-test.yml` | PR to main | Test docker-compose setup |
| `security.yml` | Push to main, weekly | Dependency & container vulnerability scan |

### Required GitHub Secrets

Go to **Settings → Secrets and variables → Actions** and add:

| Secret | Description |
|--------|-------------|
| `DEPLOY_HOST` | Your server IP or hostname |
| `DEPLOY_USER` | SSH username for deployment |
| `DEPLOY_SSH_KEY` | Private SSH key for deployment |
| `DEPLOY_PATH` | Path on server (e.g., `/opt/blogapp`) |

### Deployment Server Setup

1. **Install Docker on your server:**
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

2. **Create deployment directory:**
```bash
sudo mkdir -p /opt/blogapp
sudo chown $USER:$USER /opt/blogapp
cd /opt/blogapp
```

3. **Copy production docker-compose:**
```bash
# Copy docker-compose.prod.yml to /opt/blogapp/docker-compose.yml
# Create .env file with production values
```

4. **Configure firewall:**
```bash
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 22
```

---

## 📁 File Structure

```
blogappmern/
├── .github/
│   └── workflows/
│       ├── ci.yml              # Continuous Integration
│       ├── cd.yml              # Continuous Deployment
│       ├── docker-test.yml     # Docker Compose testing
│       └── security.yml        # Security scanning
├── client/
│   ├── Dockerfile              # Production build
│   ├── Dockerfile.dev          # Development with hot reload
│   ├── nginx.conf              # Nginx configuration
│   └── .dockerignore
├── server/
│   ├── Dockerfile              # Production build
│   ├── Dockerfile.dev          # Development with hot reload
│   └── .dockerignore
├── docker-compose.yml          # Local production setup
├── docker-compose.dev.yml      # Development setup
├── docker-compose.prod.yml     # Remote production setup
└── .env.example                # Environment template
```

---

## 🔒 Security Notes

1. **Never commit `.env` files** - They contain secrets
2. **Use strong passwords** for MongoDB and JWT
3. **Enable HTTPS** in production with SSL certificates
4. **Keep images updated** - Run security scans regularly

---

## 🐛 Troubleshooting

### Container won't start
```powershell
docker-compose logs <service-name>
```

### MongoDB connection issues
```powershell
# Check if MongoDB is healthy
docker-compose ps mongodb

# Check MongoDB logs
docker-compose logs mongodb
```

### Port already in use
```powershell
# Find process using port 80
netstat -ano | findstr :80

# Find process using port 5000
netstat -ano | findstr :5000

# Kill process by PID (replace <PID> with actual number)
taskkill /PID <PID> /F

# Or change ports in docker-compose.yml
```

### Docker Desktop not running
```
Error: Cannot connect to the Docker daemon
```
**Solution:** Open Docker Desktop app and wait for it to start (whale icon in taskbar)

### Build fails with npm errors
```powershell
# Clear Docker cache and rebuild
docker-compose build --no-cache
```

### Reset everything (fresh start)
```powershell
docker-compose down -v
docker system prune -a
docker-compose up --build
```

### View container in Docker Desktop
1. Open Docker Desktop
2. Click "Containers" in left sidebar
3. You'll see `blogapp-mongodb`, `blogapp-server`, `blogapp-client`
4. Click on any container to view logs, terminal, stats
