import React, { useState, useEffect } from 'react';
import { 
  CogIcon,
  ServerIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import * as api from '../services/api';

export default function ConfigEditor({ serverId, onSaved }) {
  const [config, setConfig] = useState({
    serverName: '',
    motd: '',
    password: '',
    maxPlayers: 20,
    maxViewRadius: 16
  });
  const [jvmArgs, setJvmArgs] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, [serverId]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      
      const configResponse = await api.getServerConfig(serverId);
      setConfig({
        serverName: configResponse.data.serverName || '',
        motd: configResponse.data.motd || '',
        password: configResponse.data.password || '',
        maxPlayers: configResponse.data.maxPlayers || 20,
        maxViewRadius: configResponse.data.maxViewRadius || 16
      });
      
      try {
        const jvmResponse = await api.getJVMArgs(serverId);
        setJvmArgs(jvmResponse.data.jvmArgs.join(' ') || '');
      } catch (jvmError) {
        console.warn('Failed to load JVM args:', jvmError);
        setJvmArgs('-Xms2G -Xmx4G -XX:+UseG1GC');
      }
    } catch (error) {
      console.error('Failed to load config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      await api.updateServerConfig(serverId, config);
      
      if (jvmArgs.trim()) {
        await api.updateJVMArgs(serverId, jvmArgs);
      }
      
      alert('Configuration saved successfully! Restart the server for changes to take effect.');
      
      if (onSaved) {
        onSaved({
          ServerName: config.serverName,
          MOTD: config.motd,
          MaxPlayers: config.maxPlayers,
          MaxViewRadius: config.maxViewRadius
        });
      }
    } catch (error) {
      alert('Failed to save configuration: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="card p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Server Configuration */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-gray-800/50 to-gray-900/50 border-b border-gray-700/50">
          <div className="flex items-center space-x-3">
            <ServerIcon className="h-6 w-6 text-cyan-400" />
            <h3 className="text-lg font-semibold text-white">Server Configuration</h3>
          </div>
        </div>

          <div className="p-6 space-y-6">
            {/* Server Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Server Name
              </label>
              <input
                type="text"
                value={config.serverName}
                onChange={(e) => setConfig({ ...config, serverName: e.target.value })}
                className="input-modern"
                placeholder="My Awesome Server"
                autoComplete="off"
              />
            </div>

            {/* MOTD */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                MOTD (Message of the Day)
              </label>
              <textarea
                value={config.motd}
                onChange={(e) => setConfig({ ...config, motd: e.target.value })}
                className="input-modern"
                rows="3"
                placeholder="Welcome to our server!"
                autoComplete="off"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Password (Optional)
              </label>
              <input
                type="password"
                value={config.password}
                onChange={(e) => setConfig({ ...config, password: e.target.value })}
                className="input-modern"
                placeholder="Leave empty for no password"
                autoComplete="new-password"
              />
            </div>

            {/* Max Players and View Radius */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Max Players
                </label>
                <input
                  type="number"
                  value={config.maxPlayers}
                  onChange={(e) => setConfig({ ...config, maxPlayers: parseInt(e.target.value) })}
                  className="input-modern"
                  min="1"
                  max="1000"
                  autoComplete="off"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Max View Radius
                </label>
                <input
                  type="number"
                  value={config.maxViewRadius}
                  onChange={(e) => setConfig({ ...config, maxViewRadius: parseInt(e.target.value) })}
                  className="input-modern"
                  min="1"
                  max="1000"
                  autoComplete="off"
                />
              </div>
            </div>
          </div>
        </div>

      {/* JVM Arguments */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-gray-800/50 to-gray-900/50 border-b border-gray-700/50">
          <div className="flex items-center space-x-3">
            <CogIcon className="h-6 w-6 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">JVM Arguments</h3>
          </div>
        </div>

        <div className="p-6">
          <input
            type="text"
            value={jvmArgs}
            onChange={(e) => setJvmArgs(e.target.value)}
            className="input-modern font-mono text-sm"
            placeholder="-Xms2G -Xmx4G -XX:+UseG1GC"
            autoComplete="off"
          />
          <p className="text-xs text-gray-500 mt-2">
            Space-separated JVM arguments
          </p>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
      >
        <CheckIcon className="h-5 w-5" />
        <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
      </button>

      <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-xl p-4">
        <p className="text-sm text-yellow-400">
          ⚠️ <strong>Note:</strong> You must restart the server for configuration changes to take effect.
        </p>
      </div>
    </div>
  );
}