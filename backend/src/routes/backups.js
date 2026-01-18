const express = require('express');
const router = express.Router();
const archiver = require('archiver');
const extract = require('extract-zip');
const fs = require('fs').promises;
const path = require('path');
const { createWriteStream, createReadStream } = require('fs');

// Get backups for a server
router.get('/:id', (req, res) => {
  try {
    const backups = req.app.locals.db.getBackups(req.params.id);
    res.json(backups);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create backup
router.post('/:id', async (req, res) => {
  try {
    const serverId = parseInt(req.params.id);
    const server = req.app.locals.db.getServer(serverId);
    
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const backupName = req.body.name || `backup_${Date.now()}`;
    const backupPath = path.join(
      process.env.BACKUPS_PATH || '/app/data/backups',
      `server_${serverId}`,
      `${backupName}.zip`
    );

    // Create backup directory
    await fs.mkdir(path.dirname(backupPath), { recursive: true });

    // Create zip archive
    const output = createWriteStream(backupPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', async () => {
      const stats = await fs.stat(backupPath);
      
      // Save to database
      req.app.locals.db.createBackup({
        serverId,
        backupName,
        backupPath,
        sizeBytes: stats.size
      });

      res.json({
        success: true,
        backup: {
          name: backupName,
          size: stats.size,
          path: backupPath
        }
      });
    });

    archive.on('error', (err) => {
      throw err;
    });

    archive.pipe(output);
    
    // Add server files to archive
    archive.directory(server.server_path, false);
    
    await archive.finalize();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Restore backup
router.post('/:id/restore/:backupId', async (req, res) => {
  try {
    const serverId = parseInt(req.params.id);
    const backupId = parseInt(req.params.backupId);
    
    const server = req.app.locals.db.getServer(serverId);
    const backups = req.app.locals.db.getBackups(serverId);
    const backup = backups.find(b => b.id === backupId);

    if (!server || !backup) {
      return res.status(404).json({ error: 'Server or backup not found' });
    }

    // Stop server if running
    if (req.app.locals.serverManager.servers.has(serverId)) {
      await req.app.locals.serverManager.stopServer(serverId);
    }

    // Clear server directory
    const files = await fs.readdir(server.server_path);
    for (const file of files) {
      await fs.rm(path.join(server.server_path, file), { recursive: true, force: true });
    }

    // Extract backup
    await extract(backup.backup_path, { dir: server.server_path });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Download backup
router.get('/:id/download/:backupId', async (req, res) => {
  try {
    const backupId = parseInt(req.params.backupId);
    const backups = req.app.locals.db.getBackups(req.params.id);
    const backup = backups.find(b => b.id === backupId);

    if (!backup) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    res.download(backup.backup_path, `${backup.backup_name}.zip`);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete backup
router.delete('/:id/:backupId', async (req, res) => {
  try {
    const backupId = parseInt(req.params.backupId);
    const backups = req.app.locals.db.getBackups(req.params.id);
    const backup = backups.find(b => b.id === backupId);

    if (!backup) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    // Delete file
    await fs.unlink(backup.backup_path);

    // Delete from database
    req.app.locals.db.deleteBackup(backupId);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
