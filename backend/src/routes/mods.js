const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Configure multer for mod file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const serverId = req.params.serverId;
      const db = req.app.locals.db;
      const server = db.getServer(serverId);
      
      if (!server) {
        return cb(new Error('Server not found'));
      }
      
      const modsDir = path.join(server.server_path, 'mods');
      await fs.mkdir(modsDir, { recursive: true });
      cb(null, modsDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Sanitize filename
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, sanitized);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB max
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.jar' || ext === '.zip') {
      cb(null, true);
    } else {
      cb(new Error('Only .jar and .zip files are allowed'));
    }
  }
});

module.exports = (database) => {
  // GET /api/mods/:serverId - List mods
  router.get('/:serverId', async (req, res) => {
    try {
      const { serverId } = req.params;
      const server = database.getServer(serverId);
      
      if (!server) {
        return res.status(404).json({ error: 'Server not found' });
      }
      
      const modsDir = path.join(server.server_path, 'mods');
      
      try {
        await fs.access(modsDir);
      } catch {
        // Mods directory doesn't exist yet
        return res.json([]);
      }
      
      const files = await fs.readdir(modsDir);
      const mods = [];
      
      for (const file of files) {
        const filePath = path.join(modsDir, file);
        
        try {
          const stats = await fs.stat(filePath);
          
          // Only include files (not directories) with .jar or .zip extension
          if (stats.isFile()) {
            const ext = path.extname(file).toLowerCase();
            if (ext === '.jar' || ext === '.zip') {
              mods.push({
                name: file,
                size: stats.size,
                modified: stats.mtime.toISOString()
              });
            }
          }
        } catch (err) {
          // Skip files that can't be accessed
          console.warn(`Skipping file ${file}: ${err.message}`);
          continue;
        }
      }
      
      res.json(mods);
    } catch (error) {
      console.error('Error listing mods:', error);
      res.status(500).json({ error: 'Failed to list mods' });
    }
  });
  
  // POST /api/mods/:serverId/upload - Upload mod
  router.post('/:serverId/upload', upload.single('mod'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      // Create notification
      const { serverId } = req.params;
      const server = database.getServer(serverId);
      
      if (server) {
        database.createNotification({
          type: 'mod.uploaded',
          title: 'Mod Uploaded',
          message: `Mod "${req.file.filename}" was uploaded to ${server.name}`,
          serverId,
          serverName: server.name
        });
      }
      
      res.json({
        success: true,
        file: {
          name: req.file.filename,
          size: req.file.size,
          path: req.file.path
        }
      });
    } catch (error) {
      console.error('Error uploading mod:', error);
      res.status(500).json({ error: error.message || 'Failed to upload mod' });
    }
  });
  
  // DELETE /api/mods/:serverId/:filename - Delete mod
  router.delete('/:serverId/:filename', async (req, res) => {
    try {
      const { serverId, filename } = req.params;
      const server = database.getServer(serverId);
      
      if (!server) {
        return res.status(404).json({ error: 'Server not found' });
      }
      
      // Validate filename to prevent path traversal
      if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return res.status(400).json({ error: 'Invalid filename' });
      }
      
      const modPath = path.join(server.server_path, 'mods', filename);
      
      // Verify file exists and is within mods directory
      const modsDir = path.join(server.server_path, 'mods');
      const realPath = await fs.realpath(modPath).catch(() => null);
      
      if (!realPath || !realPath.startsWith(modsDir)) {
        return res.status(400).json({ error: 'Invalid file path' });
      }
      
      await fs.unlink(modPath);
      
      // Create notification
      database.createNotification({
        type: 'mod.deleted',
        title: 'Mod Deleted',
        message: `Mod "${filename}" was removed from ${server.name}`,
        serverId,
        serverName: server.name
      });
      
      res.json({ success: true, message: 'Mod deleted successfully' });
    } catch (error) {
      console.error('Error deleting mod:', error);
      res.status(500).json({ error: 'Failed to delete mod' });
    }
  });
  
  return router;
};
