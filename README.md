<div align="center">

# Hytale Server Manager

### Professional Web-Based Management Platform for Hytale Game Servers

[![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)](https://github.com/An0mz/HytaleServerManager)
[![Docker](https://img.shields.io/badge/docker-ready-brightgreen.svg)](https://hub.docker.com/r/anomz/hytale-server-manager)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-20+-brightgreen.svg)](https://nodejs.org)
[![React](https://img.shields.io/badge/react-18-61dafb.svg)](https://reactjs.org)

**Powerful • Modern • Production-Ready**

[Features](#features) • [Quick Start](#quick-start) • [Docker](#docker-deployment) • [Documentation](#documentation)

---

</div>

## Features

### **Server Management**
- Create, configure, and manage multiple Hytale servers from a single interface
- Start/stop servers with one click
- Real-time server status monitoring
- Auto-restart on crashes (coming soon)

### **Real-Time Console**
- Live server console output via WebSocket
- Send commands directly to running servers
- Colored log output with ANSI support
- Console history and search

### **Backup System**
- One-click server backups
- Scheduled automatic backups (coming soon)
- Quick restore from any backup point
- Backup size tracking and management

### **Performance Monitoring**
- Real-time CPU and memory usage
- Player count tracking
- Server uptime statistics
- Performance graphs and charts

### **User Management**
- Role-based access control (Admin/User)
- Secure JWT authentication
- Multi-user support
- First-time setup wizard

### **File Management**
- Browse server files through the web UI
- Edit configuration files in-browser
- Upload/download server files
- Bulk file operations

### **Smart Cache System**
- One-time Hytale file download via OAuth
- Instant server creation from cached files
- Manual file upload fallback
- Automatic cache persistence across updates

---

## Quick Start

### Option 1: Docker (Recommended)

**Pull and run the latest image:**
```bash
docker run -d \
  --name hytale-manager \
  -p 3000:3000 \
  -p 5520-5620:5520-5620/udp \
  -v /path/to/data:/app/data \
  -e JWT_SECRET=$(openssl rand -hex 32) \
  anomz/hytale-server-manager:latest
```

**Or use Docker Compose:**
```bash
docker-compose up -d
```

Access at **http://localhost:3000**

### Option 2: Local Development

```bash
# Clone the repository
git clone https://github.com/An0mz/HytaleServerManager.git
cd HytaleServerManager

# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Start backend
cd backend && npm start

# Start frontend (in another terminal)
cd frontend && npm start
```

Backend: `http://localhost:3000`  
Frontend: `http://localhost:3001`

---

## Docker Deployment

### Unraid Installation

1. **Install from Community Apps** (coming soon)
   - Search for "Hytale Server Manager"
   - Click Install

2. **Manual Template Setup**
   ```
   Repository: anomz/hytale-server-manager:latest
   Port: 3000 → 3000
   UDP Ports: 5520-5620 → 5520-5620
   Volume: /mnt/user/appdata/hytale-manager → /app/data
   ```

3. **Required Environment Variables**
   ```
   JWT_SECRET=<generate with: openssl rand -hex 32>
   ```

### Building Your Own Image

```bash
# Build
docker build -f docker/Dockerfile -t hytale-manager:latest .

# Tag for Docker Hub
docker tag hytale-manager:latest yourusername/hytale-manager:latest

# Push
docker push yourusername/hytale-manager:latest
```

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_SECRET` | *(required)* | Secret key for JWT tokens - generate with `openssl rand -hex 32` |
| `PORT` | `3000` | HTTP server port |
| `DATABASE_PATH` | `/app/data/hytale-manager.json` | Path to JSON database file |
| `SERVERS_PATH` | `/app/data/servers` | Directory for server instances |
| `BACKUPS_PATH` | `/app/data/backups` | Directory for backup archives |
| `HYTALE_CACHE_PATH` | `/app/data/cache/hytale` | Directory for cached Hytale files |

### Volume Mounts

**Single volume mount for everything:**
```
/your/host/path:/app/data
```

This contains:
- `hytale-manager.json` - Database
- `servers/` - All server instances
- `backups/` - All backups
- `cache/hytale/` - Downloaded Hytale files (persists across updates!)

---

## Documentation

### Project Structure

```
HytaleServerManager/
├── backend/                 # Node.js/Express API
│   ├── src/
│   │   ├── index.js        # Main server & WebSocket
│   │   ├── database.js     # JSON database (lowdb)
│   │   ├── serverManager.js # Server lifecycle management
│   │   ├── hytaleDownloader.js # OAuth download system
│   │   └── routes/         # REST API endpoints
│   │       ├── auth.js     # Authentication
│   │       ├── servers.js  # Server CRUD
│   │       ├── config.js   # Configuration
│   │       ├── backups.js  # Backup management
│   │       └── users.js    # User management
│   └── package.json
│
├── frontend/               # React SPA
│   ├── src/
│   │   ├── App.jsx        # Root component
│   │   ├── pages/         # Page components
│   │   │   ├── Dashboard.jsx    # Server list
│   │   │   ├── ServerDetail.jsx # Server management
│   │   │   ├── CreateServer.jsx # Server creation
│   │   │   └── ...
│   │   ├── components/    # Reusable components
│   │   │   ├── Console.jsx      # Real-time console
│   │   │   ├── StatsPanel.jsx   # Performance stats
│   │   │   └── ...
│   │   ├── services/      # API clients
│   │   │   ├── api.js           # HTTP requests
│   │   │   ├── websocket.js     # WebSocket client
│   │   │   └── axios.js         # Axios config
│   │   └── hooks/         # Custom React hooks
│   └── package.json
│
├── docker/
│   └── Dockerfile         # Production Docker image
├── docker-compose.yml     # Development compose
└── README.md
```

### API Endpoints

<details>
<summary><b>Authentication</b></summary>

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - Create new user (first user is admin)
- `POST /api/auth/logout` - User logout
- `GET /api/auth/ws-token` - Get WebSocket token
- `GET /api/auth/setup-status` - Check if first-time setup needed

</details>

<details>
<summary><b>Servers</b></summary>

- `GET /api/servers` - List all servers
- `POST /api/servers` - Create new server
- `GET /api/servers/:id` - Get server details
- `PUT /api/servers/:id` - Update server
- `DELETE /api/servers/:id` - Delete server
- `POST /api/servers/:id/start` - Start server
- `POST /api/servers/:id/stop` - Stop server
- `GET /api/servers/:id/stats` - Get server statistics
- `GET /api/servers/hytale/check-cache` - Check if Hytale cache is ready

</details>

<details>
<summary><b>Configuration</b></summary>

- `GET /api/config/:id` - Get server configuration
- `PUT /api/config/:id` - Update server configuration
- `GET /api/config/:id/jvm` - Get JVM arguments
- `PUT /api/config/:id/jvm` - Update JVM arguments

</details>

<details>
<summary><b>Backups</b></summary>

- `GET /api/backups/:serverId` - List server backups
- `POST /api/backups/:serverId` - Create backup
- `DELETE /api/backups/:id` - Delete backup
- `POST /api/backups/:id/restore/:serverId` - Restore backup
- `GET /api/backups/:serverId/download/:backupId` - Download backup

</details>

<details>
<summary><b>Users</b></summary>

- `GET /api/users` - List all users (admin only)
- `POST /api/users` - Create new user (admin only)
- `DELETE /api/users/:id` - Delete user (admin only)

</details>

### WebSocket Events

**Client → Server:**
```javascript
{ type: 'authenticate', token: '<jwt-token>' }
{ type: 'subscribe_console', serverId: 1 }
{ type: 'send_command', serverId: 1, command: 'help' }
{ type: 'get_stats', serverId: 1 }
{ type: 'start_hytale_download' }
{ type: 'cancel_hytale_download' }
```

**Server → Client:**
```javascript
{ type: 'authenticated', user: {...} }
{ type: 'console_output', serverId: 1, data: '...' }
{ type: 'server_status_changed', serverId: 1, status: 'running' }
{ type: 'server_players_changed', serverId: 1, players: [...] }
{ type: 'hytale_oauth_url', data: 'https://...' }
{ type: 'hytale_complete' }
```

---

## System Requirements

| Component | Requirement |
|-----------|-------------|
| **Docker** | 20.10+ |
| **Node.js** | 20+ (for local dev) |
| **Java** | 25+ (included in Docker image) |
| **RAM** | 2GB minimum (4GB+ recommended) |
| **Disk** | 10GB+ for server files and backups |
| **Ports** | TCP 3000, UDP 5520-5620 |

---

## Troubleshooting

<details>
<summary><b>Container won't start</b></summary>

```bash
# Check logs
docker logs hytale-server-manager

# Common issues:
# 1. JWT_SECRET not set
# 2. Port 3000 already in use
# 3. Volume mount permission issues
```

</details>

<details>
<summary><b>WebSocket connection fails</b></summary>

- Verify the backend URL is accessible from your browser
- Check browser console for errors
- Ensure no reverse proxy is blocking WebSocket upgrades
- Try disabling browser extensions

</details>

<details>
<summary><b>Cache not persisting after update</b></summary>

- Verify volume mount: `/path/to/data:/app/data`
- Check platform detection (should be Linux in Docker)
- Ensure cache downloaded to `/app/data/cache/hytale/`
- Run: `docker exec hytale-server-manager ls -la /app/data/cache/hytale/`

</details>

<details>
<summary><b>Server files lost after update</b></summary>

**You're likely using an old image!** Update to v3.1.0+

All paths now correctly use `/app/data/` which is mounted. Older versions used unmounted paths.

</details>

---

## Roadmap

- [ ] Scheduled automatic backups
- [ ] Auto-restart on crashes
- [ ] Plugin/mod management system
- [ ] Multi-language support (i18n)
- [ ] Discord/Slack notifications
- [ ] Server templates (PvP, Creative, etc.)
- [ ] Performance profiling tools
- [ ] Mobile-optimized UI
- [ ] Dark/light theme toggle
- [ ] Audit log system

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Support

If you find this project helpful, consider:

- Starring the repository
- Reporting bugs
- Suggesting new features
- Improving documentation
- Contributing code

---

<div align="center">

**Built for the Hytale community**

[GitHub](https://github.com/An0mz/HytaleServerManager) • [Docker Hub](https://hub.docker.com/r/anomz/hytale-server-manager) • [Report Bug](https://github.com/An0mz/HytaleServerManager/issues) • [Request Feature](https://github.com/An0mz/HytaleServerManager/issues)

</div>
