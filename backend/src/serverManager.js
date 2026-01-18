const { spawn } = require('child_process');
const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const stripAnsi = require('strip-ansi');
const crypto = require('crypto');
const pidusage = require('pidusage');
const HytaleDownloader = require('./hytaleDownloader');

class ServerManager extends EventEmitter {
constructor(db) {
  super();
  this.db = db;
  this.servers = new Map();
  this.consoleSubscribers = new Map();
  this.statsInterval = null;
  
  // Use /app/data/cache for persistence in Docker, ./cache for local dev
  const defaultCachePath = process.env.NODE_ENV === 'production'
    ? '/app/data/cache/hytale'
    : './cache/hytale';
  
  this.hytaleCache = process.env.HYTALE_CACHE_PATH || defaultCachePath;
  this.hytaleDownloader = new HytaleDownloader(this.hytaleCache);
  this.initializeExistingServers();
  this.ensureHytaleCache();
}

  async ensureHytaleCache() {
    try {
      await fs.mkdir(this.hytaleCache, { recursive: true });
      console.log(`Hytale cache directory: ${this.hytaleCache}`);
    } catch (error) {
      console.error('Failed to create Hytale cache directory:', error);
    }
  }

  async initializeExistingServers() {
    const servers = this.db.getAllServers();
    for (const server of servers) {
      if (server.status === 'running') {
        // Mark as stopped on restart
        this.db.updateServerStatus(server.id, 'stopped');
      }
    }
    console.log(`Initialized ${servers.length} servers`);
  }

  getAllServers() {
    const dbServers = this.db.getAllServers();
    return dbServers.map(server => ({
      ...server,
      isRunning: this.servers.has(server.id),
      players: this.servers.get(server.id)?.players || [],
      stats: this.servers.get(server.id)?.stats || { cpu: 0, memory: 0, uptime: 0, playerCount: 0 }
    }));
  }

  async createServer(serverData) {
    const { name, port, maxPlayers, maxViewRadius, jvmArgs, useDownloader } = serverData;
    
    // Use /app/servers for Docker/Linux, ./servers for Windows/Mac
    const defaultServersPath = process.platform === 'linux'
      ? '/app/servers'
      : './servers';
    
    // Create server directory first
    const serverPath = path.join(
      process.env.SERVERS_PATH || defaultServersPath,
      `server_${Date.now()}`
    );
    await fs.mkdir(serverPath, { recursive: true });

    try {
      // If using downloader, attempt to copy cached files into the server dir
      if (useDownloader !== false) {
        await this.copyHytaleFilesToServer(serverPath);

        // Verify files were copied; if not, treat as failure
        const jarPath = path.join(serverPath, 'HytaleServer.jar');
        const assetsPath = path.join(serverPath, 'Assets.zip');
        try {
          await fs.access(jarPath);
          await fs.access(assetsPath);
        } catch (err) {
          // Cleanup directory and throw so caller knows creation failed
          try { await fs.rm(serverPath, { recursive: true, force: true }); } catch (e) {}
          throw new Error('Failed to copy Hytale files to server (cache not ready)');
        }
      }

      // Save to database only after files are present (or if not using downloader)
      const serverId = this.db.createServer({
        name,
        port: port || 5520,
        maxPlayers: maxPlayers || 100,
        maxViewRadius: maxViewRadius || 12,
        serverPath
      });

      // Save JVM args
      if (jvmArgs) {
        this.db.saveServerConfig(serverId, 'jvmArgs', jvmArgs);
      }

      this.emit('update', {
        type: 'server_created',
        serverId,
        data: this.db.getServer(serverId)
      });

      return serverId;
    } catch (error) {
      // Ensure we remove the server dir if creation failed
      try { await fs.rm(serverPath, { recursive: true, force: true }); } catch (e) {}
      throw error;
    }
  }

  async downloadHytaleFiles(ws = null) {
    console.log('🎮 Starting Hytale download with OAuth...');
    console.log(`WebSocket provided: ${ws ? 'yes' : 'no'}`);
    if (ws) {
      console.log(`WebSocket state: ${ws.readyState}, is open: ${ws.readyState === 1}`);
    }

    try {
      // Check if already cached
      const cacheReady = await this.hytaleDownloader.isCacheReady();
      console.log(`Cache ready status: ${cacheReady}`);
      
      if (cacheReady) {
        console.log('✅ Files already cached');
        if (ws && ws.readyState === 1) {
          ws.send(JSON.stringify({ type: 'hytale_complete' }));
        }
        return { success: true, cached: true };
      }

      // Remove old listeners to prevent duplicates
      this.hytaleDownloader.removeAllListeners('oauth-url');
      this.hytaleDownloader.removeAllListeners('oauth-code');
      this.hytaleDownloader.removeAllListeners('progress');
      this.hytaleDownloader.removeAllListeners('download-complete');

      // Set up event handlers for WebSocket broadcasting
      if (ws && ws.readyState === 1) {
        console.log('Setting up WebSocket event handlers...');
        
        this.hytaleDownloader.on('oauth-url', (url) => {
          console.log('Sending OAuth URL to client');
          ws.send(JSON.stringify({
            type: 'hytale_oauth_url',
            data: url
          }));
        });

        this.hytaleDownloader.on('oauth-code', (code) => {
          console.log('Sending OAuth code to client');
          ws.send(JSON.stringify({
            type: 'hytale_oauth_code',
            data: code
          }));
        });

        this.hytaleDownloader.on('progress', (message) => {
          console.log('Sending progress to client:', message);
          ws.send(JSON.stringify({
            type: 'hytale_progress',
            data: message
          }));
        });

        this.hytaleDownloader.on('download-complete', () => {
          console.log('Sending complete notification to client');
          ws.send(JSON.stringify({
            type: 'hytale_complete'
          }));
        });
      }

      // Start download
      console.log('Calling downloadWithOAuth...');
      const result = await this.hytaleDownloader.downloadWithOAuth();
      console.log('downloadWithOAuth completed successfully');
      
      return {
        success: true,
        message: 'Download complete!',
        ...result
      };

    } catch (error) {
      console.error('Download failed:', error);
      
      if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify({
          type: 'hytale_failed',
          data: error.message
        }));
      }
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  async checkHytaleCache() {
    const isReady = await this.hytaleDownloader.isCacheReady();
    
    if (isReady) {
      try {
        const jarPath = path.join(this.hytaleCache, 'HytaleServer.jar');
        const assetsPath = path.join(this.hytaleCache, 'Assets.zip');
        
        const jarStats = await fs.stat(jarPath);
        const assetsStats = await fs.stat(assetsPath);
        
        return {
          success: true,
          message: 'Cache is ready!',
          files: {
            jar: {
              path: jarPath,
              size: jarStats.size,
              sizeFormatted: `${(jarStats.size / 1024 / 1024).toFixed(2)} MB`
            },
            assets: {
              path: assetsPath,
              size: assetsStats.size,
              sizeFormatted: `${(assetsStats.size / 1024 / 1024).toFixed(2)} MB`
            }
          }
        };
      } catch (error) {
        return { success: false, message: 'Cache check failed' };
      }
    }
    
    return { success: false, message: 'Cache is empty. Start download to get files.' };
  }

  cancelHytaleDownload() {
    this.hytaleDownloader.cancelDownload();
  }

  async copyHytaleFilesToServer(serverPath) {
    const jarPath = path.join(this.hytaleCache, 'HytaleServer.jar');
    const assetsPath = path.join(this.hytaleCache, 'Assets.zip');

    try {
      // Check if files exist in cache
      await fs.access(jarPath);
      await fs.access(assetsPath);

      // Copy to server directory
      await fs.copyFile(jarPath, path.join(serverPath, 'HytaleServer.jar'));
      await fs.copyFile(assetsPath, path.join(serverPath, 'Assets.zip'));
      
      console.log(`Copied Hytale files to server: ${serverPath}`);
    } catch (error) {
      console.warn(`Hytale files not found in cache. User must upload manually.`);
      // Not throwing - user can still upload manually
    }
  }

  async startServer(serverId) {
    if (this.servers.has(serverId)) {
      throw new Error('Server is already running');
    }

    const serverInfo = this.db.getServer(serverId);
    if (!serverInfo) {
      throw new Error('Server not found');
    }

    // Check if server files exist
    const jarPath = path.join(serverInfo.server_path, 'HytaleServer.jar');
    try {
      await fs.access(jarPath);
    } catch {
      throw new Error('HytaleServer.jar not found. Please upload server files or use auto-download.');
    }

    // Get JVM args
    const config = this.db.getServerConfig(serverId);
    const jvmArgs = config.jvmArgs || ['-Xms2G', '-Xmx4G', '-XX:+UseG1GC'];

    // Build command
    const args = [
      ...jvmArgs,
      '-jar',
      'HytaleServer.jar',
      '--assets',
      path.join(serverInfo.server_path, 'Assets.zip'),
      '--bind',
      `0.0.0.0:${serverInfo.port}`
    ];

    console.log(`Starting server ${serverId}: java ${args.join(' ')}`);

    // Start server process with proper stdio configuration
    const serverProcess = spawn('java', args, {
      cwd: serverInfo.server_path,
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe']  // stdin, stdout, stderr as pipes
    });

    // IMPROVED: Hash-based deduplication for logs
    const recentHashes = new Set();
    const HASH_WINDOW = 500; // 500ms window for duplicate detection

    const serverInstance = {
      id: serverId,
      process: serverProcess,
      startTime: Date.now(),
      players: [],
      stats: {
        cpu: 0,
        memory: 0,
        uptime: 0
      },
      consoleHistory: []
    };

    this.servers.set(serverId, serverInstance);
    this.db.updateServerStatus(serverId, 'starting');

    // Start periodic stats polling for this server (pidusage)
    try {
      serverInstance.statsInterval = setInterval(async () => {
        try {
          const pid = serverProcess.pid;
          if (!pid) return;
          const stat = await pidusage(pid);
          const statsObj = {
            cpu: Math.round(stat.cpu * 100) / 100, // percent
            memory: Math.round((stat.memory || 0) / 1024 / 1024), // MB
            uptime: Math.floor((Date.now() - serverInstance.startTime) / 1000),
            playerCount: serverInstance.players.length
          };
          serverInstance.stats = statsObj;
          // Emit structured server_stats for websocket listeners
          this.emit('update', {
            type: 'server_stats',
            serverId,
            data: statsObj
          });
        } catch (e) {
          // ignore transient errors
        }
      }, 2000);
    } catch (e) {
      console.warn('Failed to start stats polling for server', serverId, e.message || e);
    }

    // Broadcast status change immediately
    this.emit('update', {
      type: 'server_status_changed',
      serverId,
      status: 'starting',
      data: this.db.getServer(serverId)
    });

    // FIXED: Better log deduplication using content hashing
    const handleOutput = (data) => {
      const output = stripAnsi(data.toString());
      const now = Date.now();
      
      // Create hash of the content
      const contentHash = crypto.createHash('md5').update(output.trim()).digest('hex');
      
      // Check if we've seen this exact content recently
      if (recentHashes.has(contentHash)) {
        return; // Skip duplicate
      }
      
      // Add hash to set and schedule removal after window
      recentHashes.add(contentHash);
      setTimeout(() => {
        recentHashes.delete(contentHash);
      }, HASH_WINDOW);
      
      // Add to console history (keep last 1000 lines)
      serverInstance.consoleHistory.push({
        timestamp: now,
        text: output
      });
      if (serverInstance.consoleHistory.length > 1000) {
        serverInstance.consoleHistory.shift(); // Remove oldest
      }
      
      this.broadcastConsole(serverId, output);
      this.parseServerOutput(serverId, output);
    };

    // Handle both stdout and stderr (Java often uses stderr for logs)
    serverProcess.stdout.on('data', handleOutput);
    serverProcess.stderr.on('data', handleOutput);

    // Handle process exit
    serverProcess.on('exit', (code) => {
      console.log(`Server ${serverId} exited with code ${code}`);
      this.servers.delete(serverId);
      try {
        if (serverInstance.statsInterval) clearInterval(serverInstance.statsInterval);
      } catch (e) {}
      this.db.updateServerStatus(serverId, 'stopped');
      
      this.emit('update', {
        type: 'server_stopped',
        serverId,
        exitCode: code
      });
      
      this.emit('update', {
        type: 'server_status_changed',
        serverId,
        status: 'stopped',
        data: this.db.getServer(serverId)
      });
    });

    // Handle errors
    serverProcess.on('error', (error) => {
      console.error(`Server ${serverId} error:`, error);
      this.servers.delete(serverId);
      try {
        if (serverInstance.statsInterval) clearInterval(serverInstance.statsInterval);
      } catch (e) {}
      this.db.updateServerStatus(serverId, 'stopped');
      
      this.emit('update', {
        type: 'server_status_changed',
        serverId,
        status: 'stopped',
        data: this.db.getServer(serverId)
      });
    });

    // Handle stdin errors
    serverProcess.stdin.on('error', (error) => {
      console.error(`Server ${serverId} stdin error:`, error.message);
    });

    // Handle stdin close
    serverProcess.stdin.on('close', () => {
      console.warn(`Server ${serverId} stdin closed`);
    });

    return { success: true, message: 'Server started' };
  }

  parseServerOutput(serverId, output) {
    const serverInstance = this.servers.get(serverId);
    if (!serverInstance) return;

    const readyPatterns = [
      /Server online on port/i,
      /Done \(/i,
      /Server started/i,
      /ready/i,
      /Hytale Server Booted/i
    ];

    if (readyPatterns.some(pattern => pattern.test(output))) {
      console.log(`Server ${serverId} is ready!`);
      this.db.updateServerStatus(serverId, 'running');
      
      // Update config.json with server name
      this.updateServerConfigName(serverId);
      
      this.emit('update', {
        type: 'server_ready',
        serverId,
        data: this.db.getServer(serverId)
      });
      
      this.emit('update', {
        type: 'server_status_changed',
        serverId,
        status: 'running',
        data: this.db.getServer(serverId)
      });
    }

    if (output.includes('Server is not authenticated') || 
        output.includes('Authentication required') ||
        output.includes('Please authenticate') ||
        output.includes('Run "/auth login"')) {
      console.log(`🔐 Server ${serverId} needs authentication`);
      
      setTimeout(() => {
        console.log(`📤 Sending /auth login device to server ${serverId}`);
        this.sendCommand(serverId, '/auth login device');
      }, 1000);
    }

    const authUrlMatch = output.match(/https:\/\/oauth\.accounts\.hytale\.com\/oauth2\/device\/verify\?user_code=([A-Za-z0-9]+)/);
    const authCodeMatch = output.match(/Authorization code:\s*([A-Za-z0-9]+)/);

    if (authUrlMatch) {
      const url = authUrlMatch[0];
      console.log(`🔗 Server ${serverId} OAuth URL: ${url}`);
      
      this.emit('update', {
        type: 'server_auth_url',
        serverId,
        url
      });
    }

    if (authCodeMatch) {
      const code = authCodeMatch[1];
      console.log(`🔑 Server ${serverId} OAuth Code: ${code}`);
      
      this.emit('update', {
        type: 'server_auth_code',
        serverId,
        code
      });
    }

    if (output.includes('Authentication successful!') || 
        output.includes('Server is already authenticated') ||
        output.match(/authenticated.*success/i)) {
      console.log(`✅ Server ${serverId} authenticated successfully`);
      
      this.emit('update', {
        type: 'server_auth_success',
        serverId
      });
    }

    const joinMatch = output.match(/Adding player\s+'([^']+)'/i)
      || output.match(/Player\s+['"]?([^'"\s][^'"\n]{0,120})['"]?\s+(?:joined|connected|logged in)/i)
      || output.match(/Player\s+'([^']+)'\s+joined/i)
      || output.match(/Client connected: ?([^\s]+)/i)
      || output.match(/Player\s+([^\s]+)\s+joined/i);

    if (joinMatch) {
      let rawName = joinMatch[1] || '';
      rawName = rawName.replace(/^['"]+|['"]+$/g, '').trim();
      const cleanName = rawName.split(' (')[0].trim();

      const exists = serverInstance.players.some(p => (p.name || '').toLowerCase() === cleanName.toLowerCase());
      if (!exists && cleanName) {
        serverInstance.players.push({ name: cleanName, joinedAt: Date.now() });
        console.log(`Player ${cleanName} joined server ${serverId}`);
        this.emit('update', { type: 'server_players_changed', serverId, players: serverInstance.players });
      }
    }

    const leaveMatch = output.match(/Removing player\s+'([^']+)'/i)
      || output.match(/[0-9a-f\-]{8,36}\s*-\s*([^\s]+).*left with reason/i)
      || output.match(/Player\s+['"]?([^'"\s][^'"\n]{0,120})['"]?\s+(?:left|disconnected|logged out|lost connection)/i)
      || output.match(/Client disconnected: ?([^\s]+)/i)
      || output.match(/([^\s]+)\s+left/i);

    if (leaveMatch) {
      let rawName = leaveMatch[1] || '';
      rawName = rawName.replace(/^['"]+|['"]+$/g, '').trim();
      const cleanName = rawName.split(' (')[0].trim();

      if (cleanName) {
        const before = serverInstance.players.length;
        serverInstance.players = serverInstance.players.filter(p => {
          const pn = (p.name || '').toLowerCase();
          const cn = cleanName.toLowerCase();
          return !(pn === cn || pn.includes(cn) || cn.includes(pn));
        });
        if (serverInstance.players.length !== before) {
          console.log(`Player ${cleanName} left server ${serverId}`);
          this.emit('update', { type: 'server_players_changed', serverId, players: serverInstance.players });
        }
      }
    }
  }

  async updateServerConfigName(serverId) {
    try {
      const serverInfo = this.db.getServer(serverId);
      if (!serverInfo) {
        console.warn(`Server ${serverId} not found in database`);
        return;
      }

      const configPath = path.join(serverInfo.server_path, 'config.json');
      
      // Try to read existing config
      let config = {};
      try {
        const configData = await fs.readFile(configPath, 'utf-8');
        config = JSON.parse(configData);
      } catch (e) {
        console.log(`📝 No existing config.json for server ${serverId}, creating new one`);
      }

      // Update with server name from database
      config.name = serverInfo.name;
      
      // Write updated config back
      await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
      console.log(`✅ Updated config.json for server ${serverId} with name: ${serverInfo.name}`);
      
    } catch (error) {
      console.error(`❌ Failed to update config.json for server ${serverId}:`, error.message);
    }
  }

  async stopServer(serverId) {
    const serverInstance = this.servers.get(serverId);
    if (!serverInstance) {
      throw new Error('Server is not running');
    }

    console.log(`Stopping server ${serverId}...`);
    this.db.updateServerStatus(serverId, 'stopping');

    this.emit('update', {
      type: 'server_status_changed',
      serverId,
      status: 'stopping',
      data: this.db.getServer(serverId)
    });

    // Try graceful shutdown first
    try {
      serverInstance.process.stdin.write('stop\n');
      serverInstance.process.stdin.end();
    } catch (error) {
      console.log('Could not send stop command, forcing kill');
    }

    // Force kill after 10 seconds if still running
    setTimeout(() => {
      if (this.servers.has(serverId)) {
        console.log(`Force killing server ${serverId}`);
        serverInstance.process.kill('SIGTERM');
        setTimeout(() => {
          if (this.servers.has(serverId)) {
            serverInstance.process.kill('SIGKILL');
          }
        }, 5000);
      }
    }, 10000);

    // Clear stats polling if present
    try {
      if (serverInstance.statsInterval) {
        clearInterval(serverInstance.statsInterval);
        serverInstance.statsInterval = null;
      }
    } catch (e) {}

    return { success: true, message: 'Server stopping' };
  }

  async restartServer(serverId) {
    console.log(`Restarting server ${serverId}...`);
    await this.stopServer(serverId);
    
    // Wait for server to fully stop
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    return await this.startServer(serverId);
  }

  sendCommand(serverId, command) {
    const serverInstance = this.servers.get(serverId);
    if (!serverInstance) {
      throw new Error('Server is not running');
    }

    try {
      console.log(`📤 Sending command to server ${serverId}: "${command}"`);
      
      if (!serverInstance.process) {
        throw new Error('Server process is null');
      }
      
      if (!serverInstance.process.stdin) {
        throw new Error('Server stdin is not available');
      }
      
      if (serverInstance.process.stdin.destroyed) {
        throw new Error('Server stdin stream is destroyed');
      }
      
      const written = serverInstance.process.stdin.write(command + '\n', (err) => {
        if (err) {
          console.error(`❌ Error writing to stdin: ${err.message}`);
        }
      });
      
      if (!written) {
        console.warn(`⚠️ Write buffer full for server ${serverId}, command may be queued`);
      } else {
        console.log(`✅ Command sent successfully to server ${serverId}`);
      }
      
      return { success: true, written };
    } catch (error) {
      console.error(`❌ Failed to send command to server ${serverId}:`, error.message);
      throw error;
    }
  }

  subscribeToConsole(serverId, ws) {
    if (!this.consoleSubscribers.has(serverId)) {
      this.consoleSubscribers.set(serverId, new Set());
    }
    this.consoleSubscribers.get(serverId).add(ws);
    
    // Send console history to new subscriber
    const serverInstance = this.servers.get(serverId);
    if (serverInstance && serverInstance.consoleHistory.length > 0) {
      // Send all history as a single batch
      const historyText = serverInstance.consoleHistory
        .map(entry => entry.text)
        .join('');
      
      ws.send(JSON.stringify({
        type: 'console_history',
        serverId,
        data: historyText
      }));
    }
  }

  unsubscribeAll(ws) {
    for (const [serverId, subscribers] of this.consoleSubscribers.entries()) {
      subscribers.delete(ws);
    }
  }

  broadcastConsole(serverId, output) {
    const subscribers = this.consoleSubscribers.get(serverId);
    if (!subscribers) return;

    const message = JSON.stringify({
      type: 'console_output',
      serverId,
      data: output
    });

    subscribers.forEach(ws => {
      if (ws.readyState === 1) { // WebSocket.OPEN
        ws.send(message);
      }
    });
  }

  async deleteServer(serverId) {
    // Stop if running
    if (this.servers.has(serverId)) {
      await this.stopServer(serverId);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    const server = this.db.getServer(serverId);
    if (!server) {
      throw new Error('Server not found');
    }

    // Delete server directory
    try {
      await fs.rm(server.server_path, { recursive: true, force: true });
    } catch (error) {
      console.error(`Failed to delete server directory: ${error.message}`);
    }

    // Remove from database
    this.db.deleteServer(serverId);

    this.emit('update', {
      type: 'server_deleted',
      serverId
    });

    return { success: true, message: 'Server deleted' };
  }

  async getServerStats(serverId) {
    const serverInstance = this.servers.get(serverId);
    if (!serverInstance) {
      return null;
    }

    // Return latest collected stats if available
    if (serverInstance.stats) {
      return {
        cpu: serverInstance.stats.cpu || 0,
        memory: serverInstance.stats.memory || 0,
        uptime: serverInstance.stats.uptime || Math.floor((Date.now() - serverInstance.startTime) / 1000),
        players: serverInstance.players.length || 0
      };
    }

    // Fallback
    return {
      cpu: 0,
      memory: 0,
      uptime: Math.floor((Date.now() - serverInstance.startTime) / 1000),
      players: serverInstance.players.length
    };
  }
}

module.exports = ServerManager;
