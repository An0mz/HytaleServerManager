const cron = require('node-cron');
const path = require('path');
const fs = require('fs/promises');
const archiver = require('archiver');

class BackupScheduler {
  constructor(db, serverManager) {
    this.db = db;
    this.serverManager = serverManager;
    this.jobs = new Map();
    this.initialize();
  }

  initialize() {
    console.log('Backup Scheduler initialized');
    // Load existing schedules from database on startup
    setTimeout(() => {
      this.loadSchedules();
    }, 5000);
  }

  loadSchedules() {
    const servers = this.db.getAllServers();
    servers.forEach(server => {
      const schedule = this.getServerSchedule(server.id);
      if (schedule && schedule.enabled) {
        this.scheduleBackup(server.id, schedule);
      }
    });
  }

  getServerSchedule(serverId) {
    const config = this.db.getServerConfig(serverId);
    return config.backupSchedule || null;
  }

  saveServerSchedule(serverId, schedule) {
    this.db.saveServerConfig(serverId, 'backupSchedule', schedule);
  }

  /**
   * Schedule format: { enabled: boolean, cron: string, retention: number }
   * Example cron: '0 3 * * *' = daily at 3am
   */
  scheduleBackup(serverId, schedule) {
    // Cancel existing job if any
    if (this.jobs.has(serverId)) {
      this.jobs.get(serverId).stop();
      this.jobs.delete(serverId);
    }

    if (!schedule.enabled || !schedule.cron) {
      return;
    }

    try {
      const job = cron.schedule(schedule.cron, async () => {
        await this.performBackup(serverId, schedule.retention);
      });

      this.jobs.set(serverId, job);
      console.log(`✅ Scheduled backup for server ${serverId}: ${schedule.cron}`);
    } catch (error) {
      console.error(`❌ Failed to schedule backup for server ${serverId}:`, error.message);
    }
  }

  async performBackup(serverId, retentionDays = 7) {
    const server = this.db.getServer(serverId);
    if (!server) {
      console.error(`Server ${serverId} not found for backup`);
      return;
    }

    console.log(`🔄 Starting scheduled backup for server: ${server.name}`);

    try {
      const backupsPath = process.env.BACKUPS_PATH || 
        (process.platform === 'linux' ? '/app/data/backups' : './backups');
      
      await fs.mkdir(backupsPath, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const backupName = `${server.name}_auto_${timestamp}`;
      const backupPath = path.join(backupsPath, `${backupName}.zip`);

      // Create backup archive
      const output = require('fs').createWriteStream(backupPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      await new Promise((resolve, reject) => {
        output.on('close', resolve);
        archive.on('error', reject);
        archive.pipe(output);
        archive.directory(server.server_path, false);
        archive.finalize();
      });

      const stats = await fs.stat(backupPath);
      
      // Save backup to database
      this.db.createBackup({
        serverId: server.id,
        backupName,
        backupPath,
        sizeBytes: stats.size
      });

      console.log(`✅ Automated backup created: ${backupName} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);

      // Clean old backups based on retention
      if (retentionDays > 0) {
        await this.cleanOldBackups(serverId, retentionDays);
      }

    } catch (error) {
      console.error(`❌ Backup failed for server ${server.name}:`, error.message);
    }
  }

  async cleanOldBackups(serverId, retentionDays) {
    const backups = this.db.getBackups(serverId);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    for (const backup of backups) {
      const backupDate = new Date(backup.created_at);
      if (backupDate < cutoffDate) {
        try {
          await fs.unlink(backup.backup_path);
          this.db.deleteBackup(backup.id);
          console.log(`🗑️  Deleted old backup: ${backup.backup_name}`);
        } catch (error) {
          console.error(`Failed to delete backup ${backup.backup_name}:`, error.message);
        }
      }
    }
  }

  updateSchedule(serverId, schedule) {
    this.saveServerSchedule(serverId, schedule);
    this.scheduleBackup(serverId, schedule);
  }

  cancelSchedule(serverId) {
    if (this.jobs.has(serverId)) {
      this.jobs.get(serverId).stop();
      this.jobs.delete(serverId);
      console.log(`❌ Cancelled backup schedule for server ${serverId}`);
    }
  }

  stopAll() {
    this.jobs.forEach((job, serverId) => {
      job.stop();
      console.log(`Stopped backup job for server ${serverId}`);
    });
    this.jobs.clear();
  }
}

module.exports = BackupScheduler;
