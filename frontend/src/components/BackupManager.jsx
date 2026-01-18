import React, { useState, useEffect } from 'react';
import { ArrowDownTrayIcon, ArrowPathIcon, TrashIcon } from '@heroicons/react/24/outline';
import * as api from '../services/api';
import { useTheme } from '../contexts/ThemeContext';

export default function BackupManager({ serverId }) {
  const { theme } = useTheme();
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [backupName, setBackupName] = useState('');

  useEffect(() => {
    loadBackups();
  }, [serverId]);

  const loadBackups = async () => {
    try {
      const response = await api.getBackups(serverId);
      setBackups(response.data);
    } catch (error) {
      console.error('Failed to load backups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    setCreating(true);
    try {
      await api.createBackup(serverId, backupName || undefined);
      setBackupName('');
      loadBackups();
    } catch (error) {
      alert('Failed to create backup: ' + error.message);
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async (backupId) => {
    if (window.confirm('Are you sure you want to restore this backup? This will overwrite current server files.')) {
      try {
        await api.restoreBackup(serverId, backupId);
        alert('Backup restored successfully');
      } catch (error) {
        alert('Failed to restore backup: ' + error.message);
      }
    }
  };

  const handleDelete = async (backupId) => {
    if (window.confirm('Are you sure you want to delete this backup?')) {
      try {
        await api.deleteBackup(serverId, backupId);
        loadBackups();
      } catch (error) {
        alert('Failed to delete backup: ' + error.message);
      }
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Create Backup Card */}
      <div className={`${theme.card} p-6`}>
        <h3 className={`text-lg font-semibold mb-4 ${theme.text}`}>Create New Backup</h3>

        <div className="flex space-x-2">
          <input
            type="text"
            value={backupName}
            onChange={(e) => setBackupName(e.target.value)}
            placeholder="Backup name (optional)"
            className="flex-1 input-modern"
          />
          <button
            onClick={handleCreateBackup}
            disabled={creating}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? 'Creating...' : 'Create Backup'}
          </button>
        </div>
      </div>

      {/* Backup History Card */}
      <div className={`${theme.card} overflow-hidden`}>
        <div className={`px-6 py-4 border-b ${theme.border}`}>
          <h3 className={`text-lg font-semibold ${theme.text}`}>Backup History</h3>
        </div>

        {loading ? (
          <div className={`p-8 text-center ${theme.textSecondary}`}>Loading backups...</div>
        ) : backups.length === 0 ? (
          <div className={`p-8 text-center ${theme.textSecondary}`}>No backups found</div>
        ) : (
          <div className={`divide-y ${theme.border}`}>
            {backups.map((backup) => (
              <div key={backup.id} className={`px-6 py-4 flex items-center justify-between hover:${theme.bgSecondary} transition-colors`}>
                <div>
                  <div className={`text-sm font-semibold ${theme.text}`}>{backup.backup_name}</div>
                  <div className={`text-sm ${theme.textSecondary}`}>
                    {new Date(backup.created_at).toLocaleString()} • {formatBytes(backup.size_bytes)}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => api.downloadBackup(serverId, backup.id)}
                    className={`p-2 ${theme.textSecondary} hover:text-cyan-400 transition-colors`}
                    title="Download"
                  >
                    <ArrowDownTrayIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleRestore(backup.id)}
                    className={`p-2 ${theme.textSecondary} hover:text-blue-400 transition-colors`}
                    title="Restore"
                  >
                    <ArrowPathIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(backup.id)}
                    className={`p-2 ${theme.textSecondary} hover:text-red-400 transition-colors`}
                    title="Delete"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}