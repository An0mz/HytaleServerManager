const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { verifyToken } = require('./auth');

// Get server config (read from config.json)
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const serverId = parseInt(req.params.id);
    const server = req.app.locals.db.getServer(serverId);
    
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const configPath = path.join(server.server_path, 'config.json');
    
    try {
      const configData = await fs.readFile(configPath, 'utf8');
      const config = JSON.parse(configData);
      
      res.json({
        serverName: config.ServerName || server.name,
        motd: config.MOTD || '',
        password: config.Password || '',
        maxPlayers: config.MaxPlayers || 100,
        maxViewRadius: config.MaxViewRadius || 12
      });
    } catch (error) {
      res.json({
        serverName: server.name,
        motd: '',
        password: '',
        maxPlayers: server.max_players || 100,
        maxViewRadius: server.max_view_radius || 12
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update server config (write to config.json)
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const serverId = parseInt(req.params.id);
    const { serverName, motd, password, maxPlayers, maxViewRadius } = req.body;
    
    console.log(`[CONFIG PUT] Server ID: ${serverId}`);
    console.log(`[CONFIG PUT] Request body:`, req.body);
    
    const server = req.app.locals.db.getServer(serverId);
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const configPath = path.join(server.server_path, 'config.json');
    
    let config = {};
    try {
      const configData = await fs.readFile(configPath, 'utf8');
      config = JSON.parse(configData);
    } catch (error) {
      console.log(`[CONFIG PUT] Creating new config.json`);
      config = {
        "Version": 3,
        "ServerName": "Hytale Server",
        "MOTD": "",
        "Password": "",
        "MaxPlayers": 100,
        "MaxViewRadius": 32,
        "LocalCompressionEnabled": false,
        "Defaults": { "World": "default", "GameMode": "Adventure" },
        "ConnectionTimeouts": { "JoinTimeouts": {} },
        "RateLimit": {},
        "Modules": {},
        "LogLevels": {},
        "Mods": {},
        "DisplayTmpTagsInStrings": false,
        "PlayerStorage": { "Type": "Hytale" }
      };
    }

    config.ServerName = serverName || config.ServerName;
    config.MOTD = motd !== undefined ? motd : config.MOTD;
    config.Password = password !== undefined ? password : config.Password;
    config.MaxPlayers = maxPlayers !== undefined ? parseInt(maxPlayers) : config.MaxPlayers;
    config.MaxViewRadius = maxViewRadius !== undefined ? parseInt(maxViewRadius) : config.MaxViewRadius;

    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');
    console.log(`[CONFIG PUT] Config.json saved successfully`);
    
    // ✅ Update database using the existing updateServer method
    try {
      req.app.locals.db.updateServer(serverId, {
        name: serverName,
        max_players: maxPlayers,
        max_view_radius: maxViewRadius
      });
      console.log(`[CONFIG PUT] Database updated successfully`);
    } catch (dbError) {
      console.error(`[CONFIG PUT] DB update failed:`, dbError);
    }

    res.json({ success: true, message: 'Configuration saved' });
  } catch (error) {
    console.error(`[CONFIG PUT] Fatal error:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Get JVM arguments
router.get('/:id/jvm', verifyToken, (req, res) => {
  try {
    const serverId = parseInt(req.params.id);
    const config = req.app.locals.db.getServerConfig(serverId);
    
    res.json({
      jvmArgs: config.jvmArgs || ['-Xms2G', '-Xmx4G', '-XX:+UseG1GC']
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update JVM arguments
router.put('/:id/jvm', verifyToken, (req, res) => {
  try {
    const serverId = parseInt(req.params.id);
    const { jvmArgs } = req.body;
    
    console.log(`[JVM PUT] Server ID: ${serverId}`);
    console.log(`[JVM PUT] Body:`, req.body);
    
    if (!jvmArgs) {
      return res.status(400).json({ error: 'JVM arguments required' });
    }

    let args = jvmArgs;
    if (typeof jvmArgs === 'string') {
      args = jvmArgs.split(' ').filter(arg => arg.trim());
    }

    console.log(`[JVM PUT] Saving:`, args);
    req.app.locals.db.saveServerConfig(serverId, 'jvmArgs', args);
    
    res.json({ success: true, message: 'JVM arguments updated' });
  } catch (error) {
    console.error(`[JVM PUT] Error:`, error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
