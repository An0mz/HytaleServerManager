FROM node:20-bullseye

# ======================
# Java 25 (Temurin)
# ======================
RUN apt-get update && \
    apt-get install -y wget apt-transport-https gnupg && \
    mkdir -p /etc/apt/keyrings && \
    wget -O - https://packages.adoptium.net/artifactory/api/gpg/key/public \
      | tee /etc/apt/keyrings/adoptium.asc && \
    echo "deb [signed-by=/etc/apt/keyrings/adoptium.asc] \
      https://packages.adoptium.net/artifactory/deb \
      $(awk -F= '/^VERSION_CODENAME/{print$2}' /etc/os-release) main" \
      | tee /etc/apt/sources.list.d/adoptium.list && \
    apt-get update && \
    apt-get install -y temurin-25-jdk && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

RUN java --version

# ======================
# App setup
# ======================
WORKDIR /app
ENV NODE_ENV=production

# ---------- Backend deps ----------
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm ci --omit=dev

# ---------- Frontend deps ----------
WORKDIR /app
COPY frontend/package*.json ./frontend/
WORKDIR /app/frontend
RUN npm ci && npm run build

# ---------- Copy sources ----------
WORKDIR /app
COPY backend ./backend
COPY frontend ./frontend

# ---------- Persistent folders ----------
RUN mkdir -p /app/servers /app/backups /app/data

VOLUME ["/app/servers", "/app/backups", "/app/data"]

# ---------- Security ----------
RUN addgroup --system app && adduser --system --ingroup app app
RUN chown -R app:app /app
USER app

# ---------- Ports ----------
EXPOSE 3000 3001
EXPOSE 5520-5620/udp

# ---------- Start ----------
COPY docker/start.sh /start.sh
RUN chmod +x /start.sh

CMD ["/start.sh"]
