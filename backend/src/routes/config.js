const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

// Get server config.json
router.get('/:id', async (req, res) => {
  try {
    const server = req.app.locals.db.getServer(req.params.id);
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const configPath = path.join(server.server_path, 'config.json');
    
    try {
      const config = await fs.readFile(configPath, 'utf8');
      res.json(JSON.parse(config));
    } catch (error) {
      // Return default config if file doesn't exist
      const defaultConfig = {
        Version: 3,
        ServerName: server.name,
        MOTD: "",
        Password: "",
        MaxPlayers: server.max_players,
        MaxViewRadius: server.max_view_radius,
        LocalCompressionEnabled: false,
        Defaults: {
          World: "default",
          GameMode: "Adventure"
        },
        ConnectionTimeouts: {
          JoinTimeouts: {}
        },
        RateLimit: {},
        Modules: {},
        LogLevels: {},
        Mods: {},
        DisplayTmpTagsInStrings: false,
        PlayerStorage: {
          Type: "Hytale"
        }
      };
      res.json(defaultConfig);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update server config.json
router.put('/:id', async (req, res) => {
  try {
    const server = req.app.locals.db.getServer(req.params.id);
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const configPath = path.join(server.server_path, 'config.json');
    await fs.writeFile(configPath, JSON.stringify(req.body, null, 2), 'utf8');

    // Update database if relevant fields changed
    if (req.body.MaxPlayers !== undefined || req.body.MaxViewRadius !== undefined) {
      // Would update DB here if needed
    }

    res.json({ success: true, config: req.body });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get world configs
router.get('/:id/worlds', async (req, res) => {
  try {
    const server = req.app.locals.db.getServer(req.params.id);
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const worldsPath = path.join(server.server_path, 'universe', 'worlds');
    
    try {
      const worlds = await fs.readdir(worldsPath);
      const worldConfigs = [];

      for (const worldDir of worlds) {
        const configPath = path.join(worldsPath, worldDir, 'config.json');
        try {
          const config = await fs.readFile(configPath, 'utf8');
          worldConfigs.push({
            name: worldDir,
            config: JSON.parse(config)
          });
        } catch (err) {
          // Skip if config doesn't exist
        }
      }

      res.json(worldConfigs);
    } catch (error) {
      res.json([]); // No worlds yet
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update world config
router.put('/:id/worlds/:worldName', async (req, res) => {
  try {
    const server = req.app.locals.db.getServer(req.params.id);
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const configPath = path.join(
      server.server_path,
      'universe',
      'worlds',
      req.params.worldName,
      'config.json'
    );

    await fs.writeFile(configPath, JSON.stringify(req.body, null, 2), 'utf8');

    res.json({ success: true, config: req.body });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get JVM arguments
router.get('/:id/jvm', (req, res) => {
  try {
    const configs = req.app.locals.db.getServerConfigs(req.params.id);
    res.json({ jvmArgs: configs.jvmArgs || ['-Xms2G', '-Xmx4G', '-XX:+UseG1GC'] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update JVM arguments
router.put('/:id/jvm', (req, res) => {
  try {
    const { jvmArgs } = req.body;
    if (!Array.isArray(jvmArgs)) {
      return res.status(400).json({ error: 'jvmArgs must be an array' });
    }

    req.app.locals.db.saveServerConfig(req.params.id, 'jvmArgs', jvmArgs);
    res.json({ success: true, jvmArgs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
