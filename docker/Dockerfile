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
FROM node:20-alpine AS backend-builder

WORKDIR /app/backend

# Copy backend package files
COPY backend/package*.json ./

# Install backend dependencies (production only)
RUN npm ci --only=production

# Stage 3: Final runtime image
FROM node:20-alpine

# Install Java 25 JRE (not JDK) - much smaller
RUN apk add --no-cache openjdk21-jre

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

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

# Expose ports
EXPOSE 3000 5520-5530/udp

# Start backend
CMD ["node", "src/index.js"]