const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const serverId = req.params.id;
    const server = req.app.locals.db.getServer(serverId);
    if (!server) {
      return cb(new Error('Server not found'));
    }
    
    const uploadPath = req.query.path || req.body.path || '';
    const targetPath = path.join(server.server_path, uploadPath);
    
    try {
      await fs.mkdir(targetPath, { recursive: true });
      cb(null, targetPath);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage });

router.get('/', (req, res) => {
  try {
    const servers = req.app.locals.serverManager.getAllServers();

    const computeDirSize = async (dirPath) => {
      const fsPromises = require('fs').promises;
      const path = require('path');
      let total = 0;
      try {
        const entries = await fsPromises.readdir(dirPath, { withFileTypes: true });
        for (const entry of entries) {
          const full = path.join(dirPath, entry.name);
          if (entry.isDirectory()) {
            total += await computeDirSize(full);
          } else {
            try {
              const st = await fsPromises.stat(full);
              total += st.size || 0;
            } catch (e) {
            }
          }
        }
      } catch (e) {
        return 0;
      }
      return total;
    };

    const formatBytes = (bytes) => {
      if (!bytes || bytes === 0) return '0 B';
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      return `${+(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
    };

    Promise.all(servers.map(async s => {
      try {
        if (s.server_path) {
          const bytes = await computeDirSize(s.server_path);
          s.dirSize = bytes;
          s.dirSizeFormatted = formatBytes(bytes);
        } else {
          s.dirSize = 0;
          s.dirSizeFormatted = '-';
        }
      } catch (e) {
        s.dirSize = 0;
        s.dirSizeFormatted = '-';
      }
      return s;
    })).then(results => res.json(results)).catch(err => res.json(servers));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const manager = req.app && req.app.locals && req.app.locals.serverManager;
    if (manager) {
      const all = manager.getAllServers();
      const found = all.find(s => parseInt(s.id) === parseInt(req.params.id));
      if (found) return res.json(found);
    }

    const server = req.app.locals.db.getServer(req.params.id);
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }
    res.json(server);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const server = req.app.locals.db.getServer(req.params.id);
    if (!server) return res.status(404).json({ error: 'Server not found' });

    const updates = req.body || {};
    const updated = await req.app.locals.db.updateServer(req.params.id, updates);
    if (!updated) return res.status(500).json({ error: 'Failed to update server' });
    try {
      if (req.app && req.app.locals && req.app.locals.serverManager) {
        req.app.locals.serverManager.emit('update', {
          type: 'server_updated',
          serverId: parseInt(req.params.id),
          data: updated
        });
      }
    } catch (e) {
      console.warn('Failed to emit server update event:', e.message || e);
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, port, maxPlayers, maxViewRadius, jvmArgs, useDownloader } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Server name is required' });
    }

    const desiredPort = parseInt(port) || 0;
    if (desiredPort) {
      const allServers = req.app.locals.db.getAllServers();
      const conflict = allServers.find(s => parseInt(s.port) === desiredPort);
      if (conflict) {
        return res.status(400).json({ error: 'Port already assigned to another server' });
      }

      const net = require('net');
      const isPortFree = await new Promise((resolve) => {
        const tester = net.createServer()
          .once('error', (err) => {
            if (err.code === 'EADDRINUSE') resolve(false);
            else resolve(false);
          })
          .once('listening', () => {
            tester.close();
            resolve(true);
          })
          .listen(desiredPort, '0.0.0.0');
      });

      if (!isPortFree) {
        return res.status(400).json({ error: 'Port is currently in use on this machine' });
      }
    }

    const serverId = await req.app.locals.serverManager.createServer({
      name,
      port: port || 5520,
      maxPlayers: maxPlayers || 20,
      maxViewRadius: maxViewRadius || 16,
      jvmArgs: jvmArgs || ['-Xms2G', '-Xmx4G', '-XX:+UseG1GC'],
      useDownloader: useDownloader !== false
    });

    const server = req.app.locals.db.getServer(serverId);
    res.status(201).json(server);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/download-hytale', async (req, res) => {
  try {
    const server = req.app.locals.db.getServer(req.params.id);
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    await req.app.locals.serverManager.downloadHytaleFiles(server.server_path);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/hytale/setup', async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Please use WebSocket connection for download with OAuth'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/hytale/check-cache', async (req, res) => {
  try {
    const result = await req.app.locals.serverManager.checkHytaleCache();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/start', async (req, res) => {
  try {
    console.log('🚀 Start request for server:', req.params.id);
    const serverId = parseInt(req.params.id);
    console.log('🚀 Parsed server ID:', serverId);
    
    const result = await req.app.locals.serverManager.startServer(serverId);
    console.log('✅ Start result:', result);
    
    res.json(result);
  } catch (error) {
    console.error('❌ Start server error:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/stop', async (req, res) => {
  try {
    const result = await req.app.locals.serverManager.stopServer(parseInt(req.params.id));
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/restart', async (req, res) => {
  try {
    const result = await req.app.locals.serverManager.restartServer(parseInt(req.params.id));
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await req.app.locals.serverManager.deleteServer(parseInt(req.params.id));
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/upload', upload.array('files'), async (req, res) => {
  try {
    res.json({ 
      success: true, 
      files: req.files.map(f => f.filename) 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/files', async (req, res) => {
  try {
    const server = req.app.locals.db.getServer(req.params.id);
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const dirPath = req.query.path || '';
    const fullPath = path.join(server.server_path, dirPath);

    const files = await fs.readdir(fullPath, { withFileTypes: true });
    const fileList = await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(fullPath, file.name);
        let size = 0;
        
        if (!file.isDirectory()) {
          try {
            const stats = await fs.stat(filePath);
            size = stats.size;
          } catch (err) {
          }
        }

        return {
          name: file.name,
          isDirectory: file.isDirectory(),
          path: path.join(dirPath, file.name),
          size
        };
      })
    );

    res.json({ files: fileList });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/files/read', async (req, res) => {
  try {
    const server = req.app.locals.db.getServer(req.params.id);
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const rawPath = req.query.path || '';
    const safePath = path
      .normalize(rawPath)
      .replace(/^(\.\.[\/\\])+/, '');

    const filePath = path.join(server.server_path, safePath);

    if (!filePath.startsWith(server.server_path)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const content = await fs.readFile(filePath, 'utf8');
    res.json({ content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/files/write', async (req, res) => {
  try {
    const server = req.app.locals.db.getServer(req.params.id);
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const { path: filePath, content } = req.body;
    const fullPath = path.join(server.server_path, filePath);
    
    await fs.writeFile(fullPath, content, 'utf8');
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id/files', async (req, res) => {
  try {
    const server = req.app.locals.db.getServer(req.params.id);
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const requestedPath = req.query.path;
    if (!requestedPath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    const normalizedPath = requestedPath.replace(/\\/g, path.sep);
    const fullPath = path.join(server.server_path, normalizedPath);
    
    if (!fullPath.startsWith(server.server_path)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    try {
      await fs.access(fullPath);
    } catch {
      return res.status(404).json({ error: 'File or folder not found' });
    }

    // Check if it's a directory
    const stats = await fs.stat(fullPath);
    if (stats.isDirectory()) {
      // Remove directory recursively
      await fs.rm(fullPath, { recursive: true, force: true });
    } else {
      // Remove file
      await fs.unlink(fullPath);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete file error:', error);
    
    if (error.code === 'EBUSY' || error.code === 'EPERM') {
      return res.status(409).json({ 
        error: "Can't delete this file while the server is running. Please stop the server first." 
      });
    }
    
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/files/move', async (req, res) => {
  try {
    const server = req.app.locals.db.getServer(req.params.id);
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const { sourcePath, destinationPath } = req.body;
    if (!sourcePath || !destinationPath) {
      return res.status(400).json({ error: 'Source and destination paths are required' });
    }

    const normalizedSource = sourcePath.replace(/\\/g, path.sep);
    const normalizedDest = destinationPath.replace(/\\/g, path.sep);
    
    const fullSourcePath = path.join(server.server_path, normalizedSource);
    const fullDestPath = path.join(server.server_path, normalizedDest);
    
    // Security check
    if (!fullSourcePath.startsWith(server.server_path) || !fullDestPath.startsWith(server.server_path)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if source exists
    try {
      await fs.access(fullSourcePath);
    } catch {
      return res.status(404).json({ error: 'Source file not found' });
    }

    // Check if destination directory exists
    const destDir = path.dirname(fullDestPath);
    try {
      await fs.access(destDir);
    } catch {
      return res.status(404).json({ error: 'Destination directory not found' });
    }

    // Move the file/folder
    await fs.rename(fullSourcePath, fullDestPath);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Move file error:', error);
    
    if (error.code === 'EBUSY' || error.code === 'EPERM') {
      return res.status(409).json({ 
        error: "Can't move this file while the server is running. Please stop the server first." 
      });
    }
    
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/files/download', async (req, res) => {
  try {
    const server = req.app.locals.db.getServer(req.params.id);
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const filePath = path.join(server.server_path, req.query.path);
    res.download(filePath);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/stats', async (req, res) => {
  try {
    const stats = await req.app.locals.serverManager.getServerStats(parseInt(req.params.id));
    if (!stats) {
      return res.status(404).json({ error: 'Server not running or stats unavailable' });
    }
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/config', async (req, res) => {
  try {
    const server = req.app.locals.db.getServer(req.params.id);
    if (!server) return res.status(404).json({ error: 'Server not found' });

    const config = await req.app.locals.db.getServerConfig(parseInt(req.params.id));
    res.json({ config });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/config', async (req, res) => {
  try {
    const server = req.app.locals.db.getServer(req.params.id);
    if (!server) return res.status(404).json({ error: 'Server not found' });

    const config = req.body || {};
    for (const key of Object.keys(config)) {
      await req.app.locals.db.saveServerConfig(parseInt(req.params.id), key, config[key]);
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/config/jvm', async (req, res) => {
  try {
    const cfg = await req.app.locals.db.getServerConfig(parseInt(req.params.id));
    const jvmArgs = cfg.jvmArgs || ['-Xms2G', '-Xmx4G', '-XX:+UseG1GC'];
    res.json({ jvmArgs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/config/jvm', async (req, res) => {
  try {
    const args = req.body.jvmArgs || [];
    await req.app.locals.db.saveServerConfig(parseInt(req.params.id), 'jvmArgs', args);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/command', async (req, res) => {
  try {
    const { command } = req.body;
    const result = req.app.locals.serverManager.sendCommand(parseInt(req.params.id), command);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
