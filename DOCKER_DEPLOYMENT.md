# Docker Deployment Guide

This guide explains how to build and run the Hytale Server Manager Docker image.

## Prerequisites

- Docker and Docker Compose installed
- A Docker Hub account (optional, for sharing images)
- JWT_SECRET environment variable configured

## Building the Image

### Locally
```bash
docker build -f docker/Dockerfile -t hytale-manager:latest .
```

### With a Docker Hub tag
```bash
docker build -f docker/Dockerfile -t yourusername/hytale-manager:latest .
```

## Running the Container

### Using Docker Compose (Recommended)

1. Create a `.env` file in the project root:
```env
JWT_SECRET=your-super-secret-jwt-key-change-this
```

2. Start the services:
```bash
docker-compose up -d
```

3. Access the application at `http://localhost:3000`

### Using Docker Directly

```bash
docker run -d \
  --name hytale-manager \
  -p 3000:3000 \
  -p 5520-5620:5520-5620/udp \
  -v hytale-servers:/app/servers \
  -v hytale-backups:/app/backups \
  -v hytale-data:/app/data \
  -e JWT_SECRET=your-super-secret-jwt-key-change-this \
  -e NODE_ENV=production \
  yourusername/hytale-manager:latest
```

## Production Deployment

### Environment Variables (Required)

- `JWT_SECRET`: Secret key for JWT token signing (IMPORTANT: Use a strong random value)
- `NODE_ENV`: Set to `production` for production deployments
- `PORT`: Server port (default: 3000)
- `DATABASE_PATH`: Path to database file (default: /app/data/hytale-manager.db)
- `SERVERS_PATH`: Path to servers directory (default: /app/data/servers)
- `BACKUPS_PATH`: Path to backups directory (default: /app/data/backups)

### Using with Reverse Proxy (Nginx/Apache)

For HTTPS deployments, configure your reverse proxy to:
1. Forward HTTP requests to `http://localhost:3000`
2. Handle SSL/TLS certificates
3. Set appropriate headers (X-Forwarded-Proto, X-Forwarded-For, etc.)

Example Nginx configuration:
```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.crt;
    ssl_certificate_key /path/to/key.key;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Data Persistence

The Docker setup uses volumes to persist data:
- `/app/servers` - Game server files
- `/app/backups` - Server backups
- `/app/data` - Application database

These volumes are automatically created and managed by Docker.

## Publishing to Docker Hub

1. Build the image with your Docker Hub username:
```bash
docker build -f docker/Dockerfile -t yourusername/hytale-manager:latest .
```

2. Push to Docker Hub:
```bash
docker push yourusername/hytale-manager:latest
```

3. Other users can then run:
```bash
docker run -d \
  -p 3000:3000 \
  -p 5520-5620:5520-5620/udp \
  -v hytale-servers:/app/servers \
  -v hytale-backups:/app/backups \
  -v hytale-data:/app/data \
  -e JWT_SECRET=their-secret-key \
  yourusername/hytale-manager:latest
```

## Troubleshooting

### Container exits immediately
Check logs:
```bash
docker logs hytale-manager
```

### Permission denied errors
Ensure volumes have correct permissions:
```bash
docker exec hytale-manager chmod -R 755 /app/servers /app/backups /app/data
```

### API connection issues
Verify the frontend can reach the backend:
1. Check `VITE_API_URL` environment variable is correct
2. Ensure firewall allows traffic on port 3000
3. For remote deployments, use the actual server address/domain

## Updating the Image

1. Pull latest changes:
```bash
git pull
```

2. Rebuild the image:
```bash
docker build -f docker/Dockerfile -t yourusername/hytale-manager:latest .
```

3. Stop and remove old container:
```bash
docker-compose down
```

4. Start new container:
```bash
docker-compose up -d
```
