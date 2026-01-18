FROM node:20-bullseye as builder

# Install Java 25 (Temurin/Adoptium)
RUN apt-get update && \
    apt-get install -y wget apt-transport-https gnupg && \
    mkdir -p /etc/apt/keyrings && \
    wget -O - https://packages.adoptium.net/artifactory/api/gpg/key/public | tee /etc/apt/keyrings/adoptium.asc && \
    echo "deb [signed-by=/etc/apt/keyrings/adoptium.asc] https://packages.adoptium.net/artifactory/deb $(awk -F= '/^VERSION_CODENAME/{print$2}' /etc/os-release) main" | tee /etc/apt/sources.list.d/adoptium.list && \
    apt-get update && \
    apt-get install -y temurin-25-jdk && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN cd backend && npm install
RUN cd frontend && npm install

# Copy application code
COPY backend ./backend
COPY frontend ./frontend

# Build frontend
RUN cd frontend && npm run build

# Production stage
FROM node:20-bullseye

# Install Java 25 (Temurin/Adoptium)
RUN apt-get update && \
    apt-get install -y wget apt-transport-https gnupg && \
    mkdir -p /etc/apt/keyrings && \
    wget -O - https://packages.adoptium.net/artifactory/api/gpg/key/public | tee /etc/apt/keyrings/adoptium.asc && \
    echo "deb [signed-by=/etc/apt/keyrings/adoptium.asc] https://packages.adoptium.net/artifactory/deb $(awk -F= '/^VERSION_CODENAME/{print$2}' /etc/os-release) main" | tee /etc/apt/sources.list.d/adoptium.list && \
    apt-get update && \
    apt-get install -y temurin-25-jdk && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy backend from builder with node_modules
COPY --from=builder /app/backend ./backend
# Copy built frontend to backend's public directory
COPY --from=builder /app/frontend/dist ./backend/public

# Create necessary directories
RUN mkdir -p /app/servers /app/backups /app/data

# Expose ports
EXPOSE 3000 5520-5530/udp

# Start script
COPY start.sh /start.sh
RUN chmod +x /start.sh

CMD ["/start.sh"]