const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

// Get logs directory path - inside the server's own directory
const getLogsDir = (serverPath) => {
  return path.join(serverPath, 'logs', 'activity');
};

// Get current log filename based on date
const getCurrentLogFilename = () => {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
  return `Activity_${dateStr}.log`;
};

// Parse activity log file to get date range
const parseLogFilename = (filename) => {
  const match = filename.match(/Activity_(\d{4}-\d{2}-\d{2})\.log/);
  if (match) {
    return { startDate: match[1], endDate: match[1] };
  }
  return null;
};

// POST /api/activity/:serverId - Log an activity
router.post('/:serverId', async (req, res) => {
  try {
    const { serverId } = req.params;
    const { type, player, message, chatMessage, timestamp } = req.body;

    console.log(`[Activity] Logging activity for server ${serverId}:`, { type, player, message });

    if (!type || !message || !timestamp) {
      console.error('[Activity] Missing required fields:', req.body);
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get server info to find server path
    const serverInfo = req.app.locals.db.getServer(serverId);
    if (!serverInfo) {
      console.error('[Activity] Server not found:', serverId);
      return res.status(404).json({ error: 'Server not found' });
    }

    const logsDir = getLogsDir(serverInfo.server_path);
    await fs.mkdir(logsDir, { recursive: true });
    console.log(`[Activity] Logs directory: ${logsDir}`);

    const logFilename = getCurrentLogFilename();
    const logPath = path.join(logsDir, logFilename);
    console.log(`[Activity] Log file: ${logPath}`);

    // Create log entry
    const logEntry = {
      timestamp,
      type,
      player: player || null,
      message,
      chatMessage: chatMessage || null
    };

    // Append to log file (newline-delimited JSON)
    const logLine = JSON.stringify(logEntry) + '\n';
    await fs.appendFile(logPath, logLine, 'utf8');
    console.log(`[Activity] Successfully logged activity to ${logFilename}`);

    res.json({ success: true, message: 'Activity logged' });
  } catch (error) {
    console.error('[Activity] Failed to log activity:', error);
    res.status(500).json({ error: 'Failed to log activity' });
  }
});

// GET /api/activity/:serverId - Get all activities for a server
router.get('/:serverId', async (req, res) => {
  try {
    const { serverId } = req.params;
    const { limit = 100, date } = req.query;

    // Get server info to find server path
    const serverInfo = req.app.locals.db.getServer(serverId);
    if (!serverInfo) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const logsDir = getLogsDir(serverInfo.server_path);
    
    // Check if logs directory exists
    try {
      await fs.access(logsDir);
    } catch {
      return res.json({ activities: [], files: [] });
    }

    // If specific date requested, read that file only
    if (date) {
      const filename = `Activity_${date}.log`;
      const logPath = path.join(logsDir, filename);
      
      try {
        const content = await fs.readFile(logPath, 'utf8');
        const activities = content
          .split('\n')
          .filter(line => line.trim())
          .map(line => JSON.parse(line))
          .reverse(); // Most recent first

        return res.json({ 
          activities: activities.slice(0, parseInt(limit)),
          date 
        });
      } catch {
        return res.json({ activities: [], date });
      }
    }

    // Otherwise, read all log files and merge
    const files = await fs.readdir(logsDir);
    const logFiles = files
      .filter(f => f.endsWith('.log'))
      .sort()
      .reverse(); // Most recent files first

    let allActivities = [];

    for (const file of logFiles) {
      const logPath = path.join(logsDir, file);
      try {
        const content = await fs.readFile(logPath, 'utf8');
        const fileActivities = content
          .split('\n')
          .filter(line => line.trim())
          .map(line => JSON.parse(line));

        allActivities.push(...fileActivities);

        // Stop if we have enough
        if (allActivities.length >= parseInt(limit)) {
          break;
        }
      } catch (error) {
        console.error(`Failed to read log file ${file}:`, error);
      }
    }

    // Sort by timestamp (most recent first) and limit
    allActivities.sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );

    res.json({ 
      activities: allActivities.slice(0, parseInt(limit)),
      files: logFiles.map(f => parseLogFilename(f)).filter(Boolean)
    });
  } catch (error) {
    console.error('Failed to retrieve activities:', error);
    res.status(500).json({ error: 'Failed to retrieve activities' });
  }
});

// GET /api/activity/:serverId/files - List all activity log files
router.get('/:serverId/files', async (req, res) => {
  try {
    const { serverId } = req.params;
    
    // Get server info to find server path
    const serverInfo = req.app.locals.db.getServer(serverId);
    if (!serverInfo) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const logsDir = getLogsDir(serverInfo.server_path);

    try {
      await fs.access(logsDir);
    } catch {
      return res.json({ files: [] });
    }

    const files = await fs.readdir(logsDir);
    const logFiles = files
      .filter(f => f.endsWith('.log'))
      .sort()
      .reverse();

    const filesWithInfo = await Promise.all(
      logFiles.map(async (file) => {
        const filePath = path.join(logsDir, file);
        const stats = await fs.stat(filePath);
        const dateInfo = parseLogFilename(file);
        
        return {
          filename: file,
          date: dateInfo?.startDate,
          size: stats.size,
          modified: stats.mtime
        };
      })
    );

    res.json({ files: filesWithInfo });
  } catch (error) {
    console.error('Failed to list activity files:', error);
    res.status(500).json({ error: 'Failed to list activity files' });
  }
});

// DELETE /api/activity/:serverId - Clear activities (optionally by date)
router.delete('/:serverId', async (req, res) => {
  try {
    const { serverId } = req.params;
    const { date } = req.query;

    // Get server info to find server path
    const serverInfo = req.app.locals.db.getServer(serverId);
    if (!serverInfo) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const logsDir = getLogsDir(serverInfo.server_path);

    if (date) {
      // Delete specific date's log file
      const filename = `Activity_${date}.log`;
      const logPath = path.join(logsDir, filename);
      
      try {
        await fs.unlink(logPath);
        return res.json({ success: true, message: `Deleted logs for ${date}` });
      } catch {
        return res.status(404).json({ error: 'Log file not found' });
      }
    } else {
      // Delete all log files for this server (but keep the directory)
      try {
        const files = await fs.readdir(logsDir);
        const logFiles = files.filter(f => f.endsWith('.log'));
        
        await Promise.all(
          logFiles.map(file => fs.unlink(path.join(logsDir, file)))
        );
        
        return res.json({ success: true, message: `Deleted ${logFiles.length} activity log files` });
      } catch (error) {
        if (error.code === 'ENOENT') {
          return res.json({ success: true, message: 'No logs to delete' });
        }
        throw error;
      }
    }
  } catch (error) {
    console.error('Failed to delete activities:', error);
    res.status(500).json({ error: 'Failed to delete activities' });
  }
});

module.exports = router;
