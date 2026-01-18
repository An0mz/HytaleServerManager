import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import * as api from '../services/api';

export default function ServerSettings({ serverId }) {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    autoStart: false,
    backupSchedule: {
      enabled: false,
      cron: '0 3 * * *',
      retention: 7
    }
  });

  const cronPresets = [
    { name: 'Daily at 3 AM', value: '0 3 * * *' },
    { name: 'Every 6 hours', value: '0 */6 * * *' },
    { name: 'Weekly (Sunday 3 AM)', value: '0 3 * * 0' },
    { name: 'Weekdays at 2 AM', value: '0 2 * * 1-5' },
    { name: 'Custom', value: 'custom' }
  ];

  const getCronDescription = (cron) => {
    const preset = cronPresets.find(p => p.value === cron);
    return preset ? preset.name : cron;
  };

  useEffect(() => {
    loadSettings();
  }, [serverId]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await api.getServer(serverId);
      setSettings({
        autoStart: response.data.auto_start || false,
        backupSchedule: response.data.backupSchedule || {
          enabled: false,
          cron: '0 3 * * *',
          retention: 7
        }
      });
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoStartToggle = async (enabled) => {
    try {
      setSaving(true);
      await api.updateServer(serverId, { auto_start: enabled });
      setSettings(prev => ({ ...prev, autoStart: enabled }));
    } catch (error) {
      console.error('Failed to update auto-start:', error);
      alert('Failed to update auto-start setting');
    } finally {
      setSaving(false);
    }
  };

  const handleBackupScheduleToggle = async (enabled) => {
    try {
      setSaving(true);
      const newSchedule = { ...settings.backupSchedule, enabled };
      await api.updateServer(serverId, { backupSchedule: newSchedule });
      setSettings(prev => ({ ...prev, backupSchedule: newSchedule }));
    } catch (error) {
      console.error('Failed to update backup schedule:', error);
      alert('Failed to update backup schedule');
    } finally {
      setSaving(false);
    }
  };

  const handleCronChange = async (cron) => {
    try {
      setSaving(true);
      const newSchedule = { ...settings.backupSchedule, cron };
      await api.updateServer(serverId, { backupSchedule: newSchedule });
      setSettings(prev => ({ ...prev, backupSchedule: newSchedule }));
    } catch (error) {
      console.error('Failed to update cron schedule:', error);
      alert('Failed to update cron schedule');
    } finally {
      setSaving(false);
    }
  };

  const handleRetentionChange = async (retention) => {
    try {
      setSaving(true);
      const newSchedule = { ...settings.backupSchedule, retention: parseInt(retention) };
      await api.updateServer(serverId, { backupSchedule: newSchedule });
      setSettings(prev => ({ ...prev, backupSchedule: newSchedule }));
    } catch (error) {
      console.error('Failed to update retention:', error);
      alert('Failed to update retention policy');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={`${theme.card} p-6`}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
        </div>
      </div>
    );
  }

  const isCustomCron = !cronPresets.slice(0, -1).some(preset => preset.value === settings.backupSchedule.cron);

  return (
    <div className="space-y-6">
      {/* Auto-Start Settings */}
      <div className={`${theme.card} p-6`}>
        <h3 className={`text-lg font-semibold mb-4 ${theme.text}`}>Server Startup</h3>
        
        <label className="flex items-start space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.autoStart}
            onChange={(e) => handleAutoStartToggle(e.target.checked)}
            disabled={saving}
            className={`mt-1 w-4 h-4 text-cyan-600 ${theme.input} rounded focus:ring-cyan-500 focus:ring-2`}
          />
          <div>
            <div className={`text-sm font-medium ${theme.text}`}>Auto-start on container boot</div>
            <div className={`text-xs mt-1 ${theme.textSecondary}`}>
              Automatically start this server when the container starts or restarts
            </div>
          </div>
        </label>
      </div>

      {/* Backup Schedule Settings */}
      <div className={`${theme.card} p-6`}>
        <h3 className={`text-lg font-semibold mb-4 ${theme.text}`}>Automated Backups</h3>
        
        <div className="space-y-4">
          {/* Enable/Disable Toggle */}
          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.backupSchedule.enabled}
              onChange={(e) => handleBackupScheduleToggle(e.target.checked)}
              disabled={saving}
              className={`mt-1 w-4 h-4 text-cyan-600 ${theme.input} rounded focus:ring-cyan-500 focus:ring-2`}
            />
            <div>
              <div className={`text-sm font-medium ${theme.text}`}>Enable scheduled backups</div>
              <div className={`text-xs mt-1 ${theme.textSecondary}`}>
                Automatically create backups on a schedule
              </div>
            </div>
          </label>

          {/* Schedule Configuration (only shown when enabled) */}
          {settings.backupSchedule.enabled && (
            <div className={`pt-4 border-t ${theme.border} space-y-4`}>
              {/* Cron Preset Selection */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme.text}`}>
                  Backup Schedule
                </label>
                <select
                  value={isCustomCron ? 'custom' : settings.backupSchedule.cron}
                  onChange={(e) => {
                    if (e.target.value !== 'custom') {
                      handleCronChange(e.target.value);
                    }
                  }}
                  disabled={saving}
                  className={`w-full px-4 py-2 ${theme.input} border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:outline-none`}
                >
                  {cronPresets.map((preset) => (
                    <option key={preset.value} value={preset.value}>
                      {preset.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Cron Input (only shown when custom is selected) */}
              {isCustomCron && (
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme.text}`}>
                    Custom Cron Expression
                  </label>
                  <input
                    type="text"
                    value={settings.backupSchedule.cron}
                    onChange={(e) => handleCronChange(e.target.value)}
                    disabled={saving}
                    placeholder="0 3 * * *"
                    className={`w-full px-4 py-2 ${theme.input} border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:outline-none font-mono text-sm`}
                  />
                  <p className={`text-xs mt-1 ${theme.textSecondary}`}>
                    Format: minute hour day month weekday (e.g., "0 3 * * *" for daily at 3 AM)
                  </p>
                </div>
              )}

              {/* Retention Policy */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme.text}`}>
                  Backup Retention
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={settings.backupSchedule.retention}
                    onChange={(e) => handleRetentionChange(e.target.value)}
                    disabled={saving}
                    className={`w-24 px-4 py-2 ${theme.input} border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:outline-none`}
                  />
                  <span className={`text-sm ${theme.textSecondary}`}>days</span>
                </div>
                <p className={`text-xs mt-1 ${theme.textSecondary}`}>
                  Backups older than this will be automatically deleted
                </p>
              </div>

              {/* Current Schedule Display */}
              <div className={`p-3 ${theme.bgSecondary} rounded-lg`}>
                <p className={`text-sm ${theme.text}`}>
                  {getCronDescription(settings.backupSchedule.cron)}
                </p>
                <p className={`text-xs ${theme.textSecondary} mt-1`}>
                  Backups kept for {settings.backupSchedule.retention} days
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Saving Indicator */}
      {saving && (
        <div className={`${theme.card} p-4`}>
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-500"></div>
            <span className={`text-sm ${theme.textSecondary}`}>Saving changes...</span>
          </div>
        </div>
      )}
    </div>
  );
}
