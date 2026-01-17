import React, { useState, useEffect } from 'react';
import { ArrowDownTrayIcon, ArrowPathIcon, TrashIcon } from '@heroicons/react/24/outline';
import * as api from '../services/api';

export default function BackupManager({ serverId }) {
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
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Create New Backup</h3>
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
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">Backup History</h3>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading backups...</div>
        ) : backups.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No backups found</div>
        ) : (
          <div className="divide-y divide-gray-700">
            {backups.map((backup) => (
              <div key={backup.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-800/50 transition-colors">
                <div>
                  <div className="text-sm font-semibold text-white">{backup.backup_name}</div>
                  <div className="text-sm text-gray-400">
                    {new Date(backup.created_at).toLocaleString()} • {formatBytes(backup.size_bytes)}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => api.downloadBackup(serverId, backup.id)}
                    className="p-2 text-gray-400 hover:text-cyan-400 transition-colors"
                    title="Download"
                  >
                    <ArrowDownTrayIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleRestore(backup.id)}
                    className="p-2 text-gray-400 hover:text-blue-400 transition-colors"
                    title="Restore"
                  >
                    <ArrowPathIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(backup.id)}
                    className="p-2 text-gray-400 hover:text-red-400 transition-colors"
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