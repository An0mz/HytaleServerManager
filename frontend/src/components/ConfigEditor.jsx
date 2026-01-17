import React, { useState, useEffect } from 'react';
import * as api from '../services/api';

export default function ConfigEditor({ serverId, onSaved }) {
  const [config, setConfig] = useState(null);
  const [jvmArgs, setJvmArgs] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, [serverId]);

  const loadConfig = async () => {
    let serverName = '';
    try {
      const serverRes = await api.getServer(serverId);
      serverName = serverRes?.data?.name || '';
    } catch (e) {
      console.warn('Could not load server info for default name:', e.message || e);
    }

    try {
      const configRes = await api.getServerConfig(serverId);
      const jvmRes = await api.getJVMArgs(serverId);
      // backend may return { config: {...} } or the config directly
      const loadedConfig = (configRes && (configRes.data?.config || configRes.data)) || {};
      if (!loadedConfig.ServerName && serverName) loadedConfig.ServerName = serverName;
      setConfig(loadedConfig);
      setJvmArgs((jvmRes?.data?.jvmArgs || []).join(' '));
    } catch (error) {
      // If config fetch fails, still set a minimal config using serverName so UI shows name
      console.warn('Failed to load config:', error.message || error);
      setConfig({ ServerName: serverName || '' });
      setJvmArgs('');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // send plain config object (not wrapped)
      await api.updateServerConfig(serverId, config || {});
      await api.updateJVMArgs(serverId, jvmArgs.split(' ').filter(arg => arg.trim()));
      // Also persist server display name to the server record so header updates on reloads
      if (config && config.ServerName) {
        try {
          await api.updateServer(serverId, { name: config.ServerName });
        } catch (e) {
          console.warn('Failed to update server name metadata:', e.message || e);
        }
      }
      // Persist MaxPlayers to server metadata so dashboard shows correct max
      if (config && typeof config.MaxPlayers !== 'undefined') {
        try {
          await api.updateServer(serverId, { max_players: parseInt(config.MaxPlayers) });
        } catch (e) {
          console.warn('Failed to update server max_players metadata:', e.message || e);
        }
      }
      alert('Configuration saved successfully');
      if (typeof onSaved === 'function') onSaved(config || {});
      // Notify other frontend pages to refresh server list (fallback when WS update not received)
      try {
        window.dispatchEvent(new Event('servers-changed'));
      } catch (e) {}
    } catch (error) {
      alert('Failed to save configuration: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400">Loading configuration...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Server Configuration Card */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Server Configuration</h3>
        <div className="space-y-4">
          {/* Server Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Server Name
            </label>
            <input
              type="text"
              value={config?.ServerName || ''}
              onChange={(e) => setConfig({ ...config, ServerName: e.target.value })}
              className="input-modern"
              placeholder="My Hytale Server"
            />
          </div>

          {/* MOTD */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              MOTD
            </label>
            <textarea
              value={config?.MOTD || ''}
              onChange={(e) => setConfig({ ...config, MOTD: e.target.value })}
              rows={4}
              className="input-modern"
              placeholder="Welcome to my server!"
            />
          </div>

          {/* Max Players & View Radius */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Max Players
              </label>
              <input
                type="number"
                value={config?.MaxPlayers || 100}
                onChange={(e) => setConfig({ ...config, MaxPlayers: parseInt(e.target.value) })}
                className="input-modern"
                placeholder="100"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Max View Radius
              </label>
              <input
                type="number"
                value={config?.MaxViewRadius || 12}
                onChange={(e) => setConfig({ ...config, MaxViewRadius: parseInt(e.target.value) })}
                className="input-modern"
                placeholder="12"
              />
            </div>
          </div>
        </div>
      </div>

      {/* JVM Arguments Card */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">JVM Arguments</h3>
        <input
          type="text"
          value={jvmArgs}
          onChange={(e) => setJvmArgs(e.target.value)}
          className="input-modern font-mono text-sm"
          placeholder="-Xms2G -Xmx4G -XX:+UseG1GC"
        />
        <p className="mt-2 text-sm text-gray-400">Space-separated JVM arguments</p>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
}