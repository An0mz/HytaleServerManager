# Hytale Server Manager

A full-featured web-based management system for Hytale game servers. Built with Node.js/Express backend, React frontend, and Docker containerization.

## Features

- **Server Management** - Create, configure, and manage multiple Hytale servers
- **Real-time Console** - Live server console output with WebSocket
- **Server Commands** - Send commands to running servers
- **Backup Management** - Create and restore server backups
- **System Stats** - Monitor server performance and player statistics
- **User Management** - Admin and role-based access control
- **File Management** - Browse and manage server files
- **Configuration Editor** - Edit server config files through the UI

## Quick Start

### Local Development

```bash
# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Start backend
cd ../backend && npm start

# In another terminal, start frontend dev server
cd frontend && npm start
```

Backend runs on `http://localhost:3000`
Frontend dev server runs on `http://localhost:3001`

### Docker (Unraid, Linux, etc.)

```bash
# Build the image
docker build -f docker/Dockerfile -t hytale-manager:latest .

# Run with docker-compose
docker-compose up -d
```

Access the app at `http://localhost:3000`

## Environment Configuration

### Required Variables

- `JWT_SECRET` - Secret key for JWT token signing (use a strong random string)
  - Generate with: `openssl rand -hex 32`

### Optional Variables

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - development or production (default: development)
- `DATABASE_PATH` - Path to database file (default: /app/data/hytale-manager.json)
- `SERVERS_PATH` - Path to servers directory (default: /app/data/servers)
- `BACKUPS_PATH` - Path to backups directory (default: /app/data/backups)

See `.env.production.example` for a complete example configuration.

## Project Structure

```
├── backend/
│   ├── src/
│   │   ├── index.js              # Main Express app
│   │   ├── database.js           # Database operations
│   │   ├── serverManager.js      # Server management logic
│   │   └── routes/               # API endpoints
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx               # Main React component
│   │   ├── pages/                # Page components
│   │   ├── components/           # Reusable components
│   │   └── services/             # API and WebSocket services
│   └── package.json
├── docker/
│   └── Dockerfile                # Multi-stage Docker build
└── docker-compose.yml            # Docker Compose configuration
```

## API Documentation

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Servers
- `GET /api/servers` - List all servers
- `POST /api/servers` - Create new server
- `GET /api/servers/:id` - Get server details
- `PUT /api/servers/:id` - Update server
- `DELETE /api/servers/:id` - Delete server
- `POST /api/servers/:id/start` - Start server
- `POST /api/servers/:id/stop` - Stop server

### Backups
- `GET /api/backups/:serverId` - List server backups
- `POST /api/backups/:serverId` - Create backup
- `DELETE /api/backups/:id` - Delete backup
- `POST /api/backups/:id/restore` - Restore backup

### WebSocket Events
- `authenticate` - Authenticate WebSocket connection
- `subscribe_console` - Subscribe to server console
- `send_command` - Send command to server
- `get_stats` - Request server statistics

## System Requirements

- **Docker**: 20.10+
- **Node.js**: 20+
- **Java**: 25+ (required for Hytale servers)
- **Memory**: 2GB+ minimum (depending on number of servers)
- **Disk Space**: At least 10GB for server files and backups

## Unraid Community App

This application is available as an Unraid community app. After installation:

1. Configure environment variables (especially `JWT_SECRET`)
2. Set volume mount paths for servers, backups, and data
3. Start the container
4. Access via Unraid IP:3000

## Troubleshooting

### App won't start
- Check that `JWT_SECRET` is set in environment variables
- Check Docker logs: `docker logs hytale-server-manager`

### Can't connect to servers
- Ensure UDP ports 5520-5620 are open/forwarded
- Check server port configuration

### WebSocket connection fails
- Verify browser can reach the backend URL
- Check firewall/reverse proxy settings
- Ensure `NODE_ENV=production` is set on production deployments

## Development

### Building the Docker image
```bash
docker build -f docker/Dockerfile -t yourusername/hytale-manager:latest .
docker push yourusername/hytale-manager:latest
```

### Frontend build
```bash
cd frontend
npm run build  # Build for production
npm run preview  # Preview the build
```

## License

MIT

## Support

For issues, questions, or suggestions, please open an issue on GitHub.
