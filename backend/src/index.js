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
const userRoutes = require('./routes/users');

const app = express();
app.set('trust proxy', 1);

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    
    const allowedPatterns = [
      /^http:\/\/localhost:\d+$/,
      /^http:\/\/127\.0\.0\.1:\d+$/,
      /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
      /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,
      /^http:\/\/172\.(1[6-9]|2\d|3[01])\.\d+\.\d+:\d+$/
    ];
    
    if (allowedPatterns.some(pattern => pattern.test(origin))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
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
app.use('/api/users', userRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const CommandValidator = {
  isValidCommand(command) {
    if (!command || typeof command !== 'string') return false;
    if (command.trim().length === 0) return false;
    if (command.length > 1000) return false;
    return true;
  },


  sanitizeCommand(command) {
    return command
      .trim()
      .replace(/[\r\n]+/g, ' ')
      .replace(/[;&|`$()]/g, '');
  },

  allowedPrefixes: [
    'say',
    'kick',
    'ban',
    'pardon',
    'tp',
    'give',
    'gamemode',
    'time',
    'weather',
    'difficulty',
    'list',
    'stop',
    'save-all',
    'whitelist',
    'help'
  ],

  isWhitelisted(command) {
    const cmd = command.trim().toLowerCase().split(' ')[0];
    return this.allowedPrefixes.some(prefix => cmd.startsWith(prefix));
  }
};

const commandRateLimiter = new Map();

function checkCommandRateLimit(ws) {
  const now = Date.now();
  const limit = { count: 10, window: 10000 };
  
  if (!commandRateLimiter.has(ws)) {
    commandRateLimiter.set(ws, { count: 1, resetAt: now + limit.window });
    return true;
  }
  
  const data = commandRateLimiter.get(ws);
  
  if (now > data.resetAt) {
    commandRateLimiter.set(ws, { count: 1, resetAt: now + limit.window });
    return true;
  }
  
  if (data.count >= limit.count) {
    return false;
  }
  
  data.count++;
  return true;
}

if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
      return next();
    }
    res.redirect(`https://${req.headers.host}${req.url}`);
  });
}

wss.on('connection', (ws, req) => {
  console.log('New WebSocket connection');

  ws.isAuthenticated = false;
  ws.userId = null;
  ws.userRole = null;

  ws.send(JSON.stringify({
    type: 'server_list',
    data: serverManager.getAllServers()
  }));

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'authenticate':
          try {
            const token = data.token;
            if (!token) {
              ws.send(JSON.stringify({ type: 'error', message: 'No token provided' }));
              return;
            }
            
            const jwt = require('jsonwebtoken');
            const JWT_SECRET = process.env.JWT_SECRET;
            
            const decoded = jwt.verify(token, JWT_SECRET);
            ws.isAuthenticated = true;
            ws.userId = decoded.id;
            ws.userRole = decoded.role;
            
            ws.send(JSON.stringify({ 
              type: 'authenticated', 
              user: { id: decoded.id, username: decoded.username, role: decoded.role } 
            }));
          } catch (error) {
            ws.send(JSON.stringify({ type: 'error', message: 'Authentication failed' }));
          }
          break;

        case 'subscribe_console':
          if (!ws.isAuthenticated) {
            ws.send(JSON.stringify({ type: 'error', message: 'Authentication required' }));
            return;
          }
          
          serverManager.subscribeToConsole(data.serverId, ws);
          break;
          
        case 'send_command':
          if (!ws.isAuthenticated) {
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: 'Authentication required to send commands' 
            }));
            return;
          }
          
          const serverId = parseInt(data.serverId);
          if (isNaN(serverId) || serverId < 1) {
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: 'Invalid server ID' 
            }));
            return;
          }
          
          const server = req.app.locals.db.getServer(serverId);
          if (!server) {
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: 'Server not found' 
            }));
            return;
          }
          
          if (!CommandValidator.isValidCommand(data.command)) {
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: 'Invalid command format' 
            }));
            return;
          }
          
          if (!checkCommandRateLimit(ws)) {
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: 'Too many commands. Please wait before sending more.' 
            }));
            return;
          }
          
          const sanitizedCommand = CommandValidator.sanitizeCommand(data.command);
          
          // Optional: Whitelist check (uncomment if you want strict control)
          /*
          if (!CommandValidator.isWhitelisted(sanitizedCommand)) {
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: 'Command not allowed. Use /help for available commands.' 
            }));
            return;
          }
          */
          
          console.log(`[COMMAND] User ${ws.userId} (${ws.userRole}) on server ${serverId}: ${sanitizedCommand}`);
          
          try {
            serverManager.sendCommand(serverId, sanitizedCommand);
            ws.send(JSON.stringify({ 
              type: 'command_sent', 
              serverId: serverId,
              command: sanitizedCommand 
            }));
          } catch (error) {
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: 'Failed to send command: ' + error.message 
            }));
          }
          
          break;
          
        case 'get_stats':
          if (!ws.isAuthenticated) {
            ws.send(JSON.stringify({ type: 'error', message: 'Authentication required' }));
            return;
          }
          
          const statsServerId = parseInt(data.serverId);
          if (isNaN(statsServerId)) {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid server ID' }));
            return;
          }
          
          const stats = await serverManager.getServerStats(statsServerId);
          ws.send(JSON.stringify({
            type: 'server_stats',
            serverId: statsServerId,
            data: stats
          }));
          break;
          
        case 'start_hytale_download':
          if (!ws.isAuthenticated || (ws.userRole !== 'admin' && ws.userRole !== 'temp_admin')) {
            ws.send(JSON.stringify({ type: 'error', message: 'Admin access required' }));
            return;
          }
          
          serverManager.downloadHytaleFiles(ws);
          break;
          
        case 'cancel_hytale_download':
          if (!ws.isAuthenticated || (ws.userRole !== 'admin' && ws.userRole !== 'temp_admin')) {
            ws.send(JSON.stringify({ type: 'error', message: 'Admin access required' }));
            return;
          }
          
          serverManager.cancelHytaleDownload();
          break;
          
        default:
          ws.send(JSON.stringify({ 
            type: 'error', 
            message: 'Unknown message type' 
          }));
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format'
      }));
    }
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed');
    serverManager.unsubscribeAll(ws);
    commandRateLimiter.delete(ws);
  });
});

serverManager.on('update', (data) => {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

server.listen(PORT, () => {
  console.log(`Hytale Manager Backend running on port ${PORT}`);
  console.log(`WebSocket server ready`);
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await serverManager.stopAllServers();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
