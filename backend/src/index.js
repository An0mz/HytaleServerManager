const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
require('dotenv').config();

const cookieParser = require('cookie-parser')
const Database = require('./database');
const ServerManager = require('./serverManager');
const authRoutes = require('./routes/auth');
const serverRoutes = require('./routes/servers');
const configRoutes = require('./routes/config');
const backupRoutes = require('./routes/backups');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: 'http://localhost:3001',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const db = new Database();

const serverManager = new ServerManager(db);

app.locals.serverManager = serverManager;
app.locals.db = db;

app.use('/api/auth', authRoutes);
app.use('/api/servers', serverRoutes);
app.use('/api/config', configRoutes);
app.use('/api/backups', backupRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}

// WebSocket connection for real-time updates
wss.on('connection', (ws, req) => {
  console.log('New WebSocket connection');

  // Send initial server list
  ws.send(JSON.stringify({
    type: 'server_list',
    data: serverManager.getAllServers()
  }));

  // Handle messages from client
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'subscribe_console':
          // Subscribe to server console output
          serverManager.subscribeToConsole(data.serverId, ws);
          break;
          
        case 'send_command':
          // Send command to server
          serverManager.sendCommand(data.serverId, data.command);
          break;
          
        case 'get_stats':
          // Send server stats
          const stats = await serverManager.getServerStats(data.serverId);
          ws.send(JSON.stringify({
            type: 'server_stats',
            serverId: data.serverId,
            data: stats
          }));
          break;
          
        case 'start_hytale_download':
          // Start Hytale download with OAuth
          serverManager.downloadHytaleFiles(ws);
          break;
          
        case 'cancel_hytale_download':
          // Cancel ongoing download
          serverManager.cancelHytaleDownload();
          break;
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: error.message
      }));
    }
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed');
    serverManager.unsubscribeAll(ws);
  });
});

// Broadcast updates to all connected clients
serverManager.on('update', (data) => {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
server.listen(PORT, () => {
  console.log(`Hytale Manager Backend running on port ${PORT}`);
  console.log(`WebSocket server ready`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await serverManager.stopAllServers();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
