# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install frontend dependencies
RUN npm ci --only=production=false

# Copy frontend source
COPY frontend ./

# Build frontend
RUN npm run build

# Stage 2: Build backend dependencies
FROM node:20-slim AS backend-builder

WORKDIR /app/backend

# Copy backend package files
COPY backend/package*.json ./

# Install backend dependencies (production only)
RUN npm ci --only=production

# Stage 3: Final runtime image
FROM node:20-slim

# Install OpenJDK 21 JRE from Adoptium
RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates wget apt-transport-https gnupg && \
    mkdir -p /etc/apt/keyrings && \
    wget -O - https://packages.adoptium.net/artifactory/api/gpg/key/public | gpg --dearmor -o /etc/apt/keyrings/adoptium.gpg && \
    echo "deb [signed-by=/etc/apt/keyrings/adoptium.gpg] https://packages.adoptium.net/artifactory/deb bookworm main" | tee /etc/apt/sources.list.d/adoptium.list && \
    apt-get update && \
    apt-get install -y --no-install-recommends temurin-21-jre && \
    apt-get remove -y wget apt-transport-https gnupg && \
    apt-get autoremove -y && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Verify Java installation
RUN java --version

# Set working directory
WORKDIR /app/backend

# Copy backend node_modules from builder FIRST
COPY --from=backend-builder /app/backend/node_modules ./node_modules

# Copy backend source code
COPY backend/ ./

# Copy built frontend from builder
COPY --from=frontend-builder /app/frontend/dist ./public

# Create necessary directories under /app/data for single volume mount
RUN mkdir -p /app/data/servers /app/data/backups /app/data/cache/hytale

# Expose ports
EXPOSE 3000 5520-5530/udp

# Start backend
CMD ["node", "src/index.js"]