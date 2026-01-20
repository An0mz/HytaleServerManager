const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');

class DatabaseManager {
  constructor() {
    const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../data/hytale-manager.json');
    
    // Ensure directory exists
    const fs = require('fs');
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const adapter = new FileSync(dbPath);
    this.db = low(adapter);
    this.initialize();
  }

  initialize() {
    // Set defaults
    this.db.defaults({
      users: [],
      servers: [],
      server_configs: [],
      backups: [],
      permissions: [],
      notifications: []
    }).write();

    console.log('Database initialized');
  }

  // Server methods
  createServer(serverData) {
    const servers = this.db.get('servers').value();
    const id = servers.length > 0 ? Math.max(...servers.map(s => s.id)) + 1 : 1;
    
    const server = {
      id,
      name: serverData.name,
      port: serverData.port,
      max_players: serverData.maxPlayers || 20,
      max_view_radius: serverData.maxViewRadius || 16,
      auto_start: serverData.autoStart || false,
      server_path: serverData.serverPath,
      status: 'stopped',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    this.db.get('servers').push(server).write();
    return id;
  }

  getServer(id) {
    return this.db.get('servers').find({ id: parseInt(id) }).value();
  }

  getAllServers() {
    return this.db.get('servers').value() || [];
  }

  updateServer(id, updates = {}) {
    try {
      const server = this.db.get('servers').find({ id: parseInt(id) }).value();
      if (!server) return null;
      const allowed = ['name', 'port', 'max_players', 'max_view_radius', 'auto_start', 'backupSchedule'];
      const assign = {};
      Object.keys(updates).forEach(k => {
        if (allowed.includes(k) || k === 'name') {
          assign[k] = updates[k];
        }
      });
      assign.updated_at = new Date().toISOString();
      this.db.get('servers').find({ id: parseInt(id) }).assign(assign).write();
      return this.getServer(id);
    } catch (error) {
      console.error('Error updating server:', error);
      return null;
    }
  }

  getAllUsers() {
    return this.db.get('users').value() || [];
  }
  
  updateServerStatus(id, status) {
    this.db.get('servers')
      .find({ id: parseInt(id) })
      .assign({ status, updated_at: new Date().toISOString() })
      .write();
  }

  deleteServer(id) {
    this.db.get('servers').remove({ id: parseInt(id) }).write();
    this.db.get('server_configs').remove({ server_id: parseInt(id) }).write();
    this.db.get('backups').remove({ server_id: parseInt(id) }).write();
  }

  // Config methods
  getServerConfig(serverId) {
    try {
      const rows = this.db.get('server_configs')
        .filter({ server_id: parseInt(serverId) })
        .value();

      const config = {};
      rows.forEach(row => {
        try {
          config[row.config_key] = JSON.parse(row.config_value);
        } catch {
          config[row.config_key] = row.config_value;
        }
      });

      return config;
    } catch (error) {
      console.error('Error getting server config:', error);
      return {};
    }
  }

  saveServerConfig(serverId, key, value) {
    try {
      const existing = this.db.get('server_configs')
        .find({ server_id: parseInt(serverId), config_key: key })
        .value();

      const valueStr = typeof value === 'string' ? value : JSON.stringify(value);

      if (existing) {
        this.db.get('server_configs')
          .find({ server_id: parseInt(serverId), config_key: key })
          .assign({ config_value: valueStr, updated_at: new Date().toISOString() })
          .write();
      } else {
        const configs = this.db.get('server_configs').value();
        const id = configs.length > 0 ? Math.max(...configs.map(c => c.id)) + 1 : 1;
        this.db.get('server_configs')
          .push({ id, server_id: parseInt(serverId), config_key: key, config_value: valueStr, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .write();
      }

      return true;
    } catch (error) {
      console.error('Error saving server config:', error);
      return false;
    }
  }

  // Backup methods
  createBackup(backupData) {
    const backups = this.db.get('backups').value();
    const id = backups.length > 0 ? Math.max(...backups.map(b => b.id)) + 1 : 1;
    
    const backup = {
      id,
      server_id: backupData.serverId,
      backup_name: backupData.backupName,
      backup_path: backupData.backupPath,
      size_bytes: backupData.sizeBytes,
      created_at: new Date().toISOString()
    };
    
    this.db.get('backups').push(backup).write();
    return id;
  }

  getBackups(serverId) {
    return this.db.get('backups')
      .filter({ server_id: parseInt(serverId) })
      .orderBy(['created_at'], ['desc'])
      .value() || [];
  }

  deleteBackup(id) {
    this.db.get('backups').remove({ id: parseInt(id) }).write();
  }

  // User methods
  createUser(userData) {
    const users = this.db.get('users').value();
    const id = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;
    
    const user = {
      id,
      username: userData.username,
      password: userData.password,
      email: userData.email,
      role: userData.role || 'user',
      created_at: new Date().toISOString()
    };
    
    this.db.get('users').push(user).write();
    return id;
  }

  getUserByUsername(username) {
    return this.db.get('users').find({ username }).value();
  }

  // Notification methods
  createNotification(notificationData) {
    const notifications = this.db.get('notifications').value();
    const id = notifications.length > 0 ? Math.max(...notifications.map(n => n.id)) + 1 : 1;
    
    const notification = {
      id,
      type: notificationData.type,
      title: notificationData.title,
      message: notificationData.message,
      server_id: notificationData.serverId || null,
      server_name: notificationData.serverName || null,
      created_at: new Date().toISOString(),
      read: false
    };
    
    this.db.get('notifications').push(notification).write();
    
    // Auto-prune old notifications (keep max 1000)
    const allNotifications = this.db.get('notifications').value();
    if (allNotifications.length > 1000) {
      const toRemove = allNotifications.length - 1000;
      const oldest = allNotifications.slice(0, toRemove).map(n => n.id);
      oldest.forEach(id => {
        this.db.get('notifications').remove({ id }).write();
      });
    }
    
    return id;
  }

  getNotifications(limit = 50) {
    return this.db.get('notifications')
      .orderBy(['created_at'], ['desc'])
      .take(limit)
      .value() || [];
  }

  markNotificationRead(id) {
    this.db.get('notifications')
      .find({ id: parseInt(id) })
      .assign({ read: true })
      .write();
  }

  markAllNotificationsRead() {
    const notifications = this.db.get('notifications').value();
    notifications.forEach(n => {
      this.db.get('notifications')
        .find({ id: n.id })
        .assign({ read: true })
        .write();
    });
  }

  clearNotifications() {
    this.db.set('notifications', []).write();
  }

  close() {
    // No need to close with lowdb
  }
}

module.exports = DatabaseManager;
