import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  PlayIcon, 
  StopIcon,
  ArrowPathIcon,
  TrashIcon,
  UsersIcon,
  SignalIcon,
  CpuChipIcon,
  CircleStackIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import * as api from '../services/api';
import websocket from '../services/websocket';
import Header from './Header';
import ConfirmModal from '../components/ConfirmModal';
import { ServerCardSkeleton, ListSkeleton } from '../components/Skeletons';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';

export default function Dashboard() {
  const { theme } = useTheme();
  const toast = useToast();
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, serverId: null, serverName: '' });

  useEffect(() => {
    loadServers();
    websocket.connect();

    // Listen for manual client-side signals to refresh servers (fallback for WS)
    const handleServersChanged = () => loadServers();
    window.addEventListener('servers-changed', handleServersChanged);

    const unsubConnect = websocket.on('connected', () => {});
    const unsubDisconnect = websocket.on('disconnected', () => {});
    const unsubUpdate = websocket.on('update', () => loadServers());

    const pollInterval = setInterval(() => {
      loadServers();
    }, 3000);

    return () => {
      unsubConnect();
      unsubDisconnect();
      unsubUpdate();
      window.removeEventListener('servers-changed', handleServersChanged);
      clearInterval(pollInterval);
    };
  }, []);

  const loadServers = async () => {
    try {
      const response = await api.getServers();
      setServers(response.data);
    } catch (error) {
      console.error('Failed to load servers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async (serverId, e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await api.startServer(serverId);
      toast.success('Server started successfully');
    } catch (error) {
      toast.error('Failed to start: ' + error.message);
    }
  };

  const handleStop = async (serverId, e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await api.stopServer(serverId);
      toast.success('Server stopped successfully');
    } catch (error) {
      toast.error('Failed to stop: ' + error.message);
    }
  };

  const handleRestart = async (serverId, e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await api.restartServer(serverId);
      toast.success('Server restarting');
    } catch (error) {
      toast.error('Failed to restart: ' + error.message);
    }
  };

  const handleDelete = async (serverId, e) => {
    e.preventDefault();
    e.stopPropagation();
    const server = servers.find(s => s.id === serverId);
    setDeleteModal({ isOpen: true, serverId, serverName: server?.name || 'this server' });
  };

  const confirmDelete = async () => {
    try {
      await api.deleteServer(deleteModal.serverId);
      setServers(prev => prev.filter(s => s.id !== deleteModal.serverId));
      toast.success('Server deleted successfully');
    } catch (error) {
      toast.error('Failed to delete: ' + error.message);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      'running': 'bg-emerald-500 text-white',
      'starting': 'bg-yellow-500 text-white animate-pulse',
      'stopping': 'bg-orange-500 text-white animate-pulse',
      'stopped': 'bg-gray-600 text-gray-200'
    };
    return styles[status] || styles.stopped;
  };

  const filteredServers = servers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: servers.length,
    running: servers.filter(s => s.status === 'running').length,
    offline: servers.filter(s => s.status === 'stopped').length,
    players: servers.reduce((acc, s) => acc + (s.players?.length || 0), 0),
    maxPlayers: servers.reduce((acc, s) => acc + (s.max_players || 0), 0),
    cpuTotal: Math.round(servers.reduce((acc, s) => acc + (s.stats?.cpu || 0), 0) * 100) / 100,
    memoryTotal: Math.round(servers.reduce((acc, s) => acc + (s.stats?.memory || 0), 0)),
    totalDiskSize: servers.reduce((acc, s) => acc + (s.dirSize || 0), 0)
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${theme.bg}`}>
        <Header />
        <div className={`min-h-screen ${theme.bg} p-6`}>
          {/* Stats Bar Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className={`${theme.card} p-4 animate-pulse`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="h-4 bg-gray-700 rounded w-20 mb-2" />
                    <div className="h-8 bg-gray-700 rounded w-16 mb-2" />
                    <div className="h-3 bg-gray-700 rounded w-24" />
                  </div>
                  <div className="w-10 h-10 bg-gray-700 rounded-full" />
                </div>
              </div>
            ))}
          </div>

          {/* Server List Skeleton */}
          <div className={theme.card}>
            <div className={`px-6 py-4 border-b ${theme.border} flex items-center justify-between animate-pulse`}>
              <div className="h-6 bg-gray-700 rounded w-32" />
              <div className="flex items-center space-x-4">
                <div className="h-10 w-48 bg-gray-700 rounded-lg" />
                <div className="h-10 w-40 bg-gray-700 rounded-lg" />
              </div>
            </div>

            {/* Table Skeleton */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`${theme.bgTertiary} border-b ${theme.border}`}>
                  <tr>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${theme.textSecondary} uppercase tracking-wider`}>
                      <div className="h-4 bg-gray-700 rounded w-24 animate-pulse" />
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${theme.textSecondary} uppercase tracking-wider`}>
                      <div className="h-4 bg-gray-700 rounded w-16 animate-pulse" />
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${theme.textSecondary} uppercase tracking-wider`}>
                      <div className="h-4 bg-gray-700 rounded w-20 animate-pulse" />
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${theme.textSecondary} uppercase tracking-wider`}>
                      <div className="h-4 bg-gray-700 rounded w-16 animate-pulse" />
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${theme.textSecondary} uppercase tracking-wider`}>
                      <div className="h-4 bg-gray-700 rounded w-24 animate-pulse" />
                    </th>
                  </tr>
                </thead>
                <tbody className={`${theme.bg} divide-y ${theme.border}`}>
                  {[1, 2, 3, 4, 5].map(i => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gray-700 rounded-xl" />
                          <div>
                            <div className="h-5 bg-gray-700 rounded w-32 mb-2" />
                            <div className="h-4 bg-gray-700 rounded w-24" />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-700 rounded w-16" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-700 rounded w-12" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-700 rounded w-20" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-gray-700 rounded-full" />
                          <div className="h-4 bg-gray-700 rounded w-16" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
      <>
    <Header />
        <div className={`min-h-screen ${theme.bg} p-6`}>
          {/* Stats Bar */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Total Servers Card */}
            <div className={`${theme.card} p-4 relative overflow-hidden group hover:scale-[1.02] transition-transform`}>
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2 rounded-lg bg-cyan-500/20`}>
                    <CircleStackIcon className="h-5 w-5 text-cyan-400" />
                  </div>
                  <div className={`text-xs px-2 py-0.5 rounded-full ${stats.running > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-600/20 text-gray-400'}`}>
                    {stats.running > 0 ? 'Active' : 'Idle'}
                  </div>
                </div>
                <div>
                  <p className={`${theme.textSecondary} text-xs font-medium mb-1`}>Total Servers</p>
                  <p className={`text-3xl font-bold ${theme.text} mb-2`}>{stats.total}</p>
                  <div className="flex items-center space-x-3 text-xs">
                    <span className="flex items-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1" />
                      <span className="text-emerald-400 font-semibold">{stats.running}</span>
                      <span className={`${theme.textSecondary} ml-1`}>online</span>
                    </span>
                    <span className="flex items-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-500 mr-1" />
                      <span className="text-gray-400 font-semibold">{stats.offline}</span>
                      <span className={`${theme.textSecondary} ml-1`}>offline</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Players Card */}
            <div className={`${theme.card} p-4 relative overflow-hidden group hover:scale-[1.02] transition-transform`}>
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2 rounded-lg bg-blue-500/20`}>
                    <UsersIcon className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className={`text-xs px-2 py-0.5 rounded-full ${stats.players > 0 ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-600/20 text-gray-400'}`}>
                    {stats.players > 0 ? 'Playing' : 'Empty'}
                  </div>
                </div>
                <div>
                  <p className={`${theme.textSecondary} text-xs font-medium mb-1`}>Active Players</p>
                  <p className={`text-3xl font-bold ${theme.text} mb-2`}>{stats.players}</p>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-700/50 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500"
                        style={{ width: `${stats.maxPlayers > 0 ? (stats.players / stats.maxPlayers * 100) : 0}%` }}
                      />
                    </div>
                    <span className={`text-xs ${theme.textSecondary}`}>{stats.maxPlayers} max</span>
                  </div>
                </div>
              </div>
            </div>

            {/* CPU Usage Card */}
            <div className={`${theme.card} p-4 relative overflow-hidden group hover:scale-[1.02] transition-transform`}>
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2 rounded-lg bg-purple-500/20`}>
                    <CpuChipIcon className="h-5 w-5 text-purple-400" />
                  </div>
                  <div className={`text-xs px-2 py-0.5 rounded-full ${
                    stats.cpuTotal > 75 ? 'bg-red-500/20 text-red-400' : 
                    stats.cpuTotal > 50 ? 'bg-yellow-500/20 text-yellow-400' : 
                    'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {stats.cpuTotal > 75 ? 'High' : stats.cpuTotal > 50 ? 'Medium' : 'Low'}
                  </div>
                </div>
                <div>
                  <p className={`${theme.textSecondary} text-xs font-medium mb-1`}>CPU Usage</p>
                  <p className={`text-3xl font-bold ${theme.text} mb-2`}>{stats.cpuTotal}%</p>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-700/50 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${
                          stats.cpuTotal > 75 ? 'bg-gradient-to-r from-red-600 to-red-400' : 
                          stats.cpuTotal > 50 ? 'bg-gradient-to-r from-yellow-600 to-yellow-400' : 
                          'bg-gradient-to-r from-emerald-600 to-emerald-400'
                        }`}
                        style={{ width: `${Math.min(stats.cpuTotal, 100)}%` }}
                      />
                    </div>
                    <span className={`text-xs ${theme.textSecondary}`}>all servers</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Memory Usage Card */}
            <div className={`${theme.card} p-4 relative overflow-hidden group hover:scale-[1.02] transition-transform`}>
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2 rounded-lg bg-pink-500/20`}>
                    <CircleStackIcon className="h-5 w-5 text-pink-400" />
                  </div>
                  <div className={`text-xs px-2 py-0.5 rounded-full ${
                    stats.memoryTotal > 32768 ? 'bg-red-500/20 text-red-400' : 
                    stats.memoryTotal > 16384 ? 'bg-yellow-500/20 text-yellow-400' : 
                    'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {stats.memoryTotal > 32768 ? 'High' : stats.memoryTotal > 16384 ? 'Medium' : 'Low'}
                  </div>
                </div>
                <div>
                  <p className={`${theme.textSecondary} text-xs font-medium mb-1`}>Memory Usage</p>
                  <p className={`text-3xl font-bold ${theme.text} mb-2`}>{stats.memoryTotal} MB</p>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-700/50 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-500"
                        style={{ width: `${Math.min((stats.memoryTotal / 327.68), 100)}%` }}
                      />
                    </div>
                    <span className={`text-xs ${theme.textSecondary}`}>all servers</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Server List */}
          <div className={`${theme.card} overflow-hidden`}>
            <div className={`px-6 py-5 ${theme.bgSecondary} border-b ${theme.border} flex items-center justify-between`}>
              <div>
                <h2 className={`text-2xl font-bold ${theme.text} mb-1`}>Server Overview</h2>
                <p className={`text-sm ${theme.textSecondary}`}>Manage and monitor all your Hytale servers</p>
              </div>
              <div className="flex items-center space-x-4">
                <input
                  type="text"
                  placeholder="Search servers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={theme.input + " px-4 py-2 rounded-lg focus:ring-2 focus:outline-none transition-all"}
                />
                <Link
                  to="/create"
                  className="btn-primary flex items-center space-x-2 px-6 py-2.5"
                >
                  <span>+</span>
                  <span>New Server</span>
                </Link>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`${theme.bgTertiary} border-b ${theme.border}`}>
                  <tr>
                    <th className={`px-6 py-4 text-left text-sm font-semibold ${theme.textSecondary}`}>Server</th>
                    <th className={`px-6 py-4 text-left text-sm font-semibold ${theme.textSecondary}`}>Actions</th>
                    <th className={`px-6 py-4 text-left text-sm font-semibold ${theme.textSecondary}`}>CPU Usage</th>
                    <th className={`px-6 py-4 text-left text-sm font-semibold ${theme.textSecondary}`}>Memory Usage</th>
                    <th className={`px-6 py-4 text-left text-sm font-semibold ${theme.textSecondary}`}>Server Dir Size</th>
                    <th className={`px-6 py-4 text-left text-sm font-semibold ${theme.textSecondary}`}>Players</th>
                    <th className={`px-6 py-4 text-left text-sm font-semibold ${theme.textSecondary}`}>Status</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${theme.border}`}>
                  {filteredServers.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center">
                        <CircleStackIcon className={`h-12 w-12 ${theme.textSecondary} mx-auto mb-3`} />
                        <p className={theme.textSecondary}>No servers found</p>
                        <Link to="/create" className="text-cyan-400 hover:text-cyan-300 text-sm mt-2 inline-block">
                          Create your first server
                        </Link>
                      </td>
                    </tr>
                  ) : (
                    filteredServers.map((server) => (
                      <tr key={server.id} className={`hover:${theme.bgSecondary} transition-all border-b ${theme.border} last:border-0 group`}>
                        {/* Server Info */}
                        <td className="px-6 py-5">
                          <Link to={`/server/${server.id}`} className="flex items-center space-x-4">
                            {/* Status Indicator Circle */}
                            <div className="relative">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                server.status === 'running' ? 'bg-emerald-500/20' :
                                server.status === 'starting' ? 'bg-yellow-500/20' :
                                server.status === 'stopping' ? 'bg-orange-500/20' :
                                'bg-gray-600/20'
                              }`}>
                                <CircleStackIcon className={`h-6 w-6 ${
                                  server.status === 'running' ? 'text-emerald-400' :
                                  server.status === 'starting' ? 'text-yellow-400' :
                                  server.status === 'stopping' ? 'text-orange-400' :
                                  'text-gray-400'
                                }`} />
                              </div>
                              {server.status === 'running' && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-gray-900 animate-pulse" />
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <p className={`${theme.accentText} font-semibold text-lg group-hover:text-cyan-300 transition-colors`}>
                                {server.name}
                              </p>
                              <p className={`text-sm ${theme.textSecondary} mt-0.5`}>
                                Port {server.port}
                              </p>
                            </div>
                          </Link>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-5">
                          <div className="flex items-center space-x-2">
                            {server.status === 'stopped' ? (
                              <button
                                onClick={(e) => handleStart(server.id, e)}
                                className="px-4 py-2 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 transition-all font-medium flex items-center space-x-2"
                                title="Start Server"
                              >
                                <PlayIcon className="h-4 w-4" />
                                <span>Start</span>
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={(e) => handleStop(server.id, e)}
                                  className="p-2 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-all"
                                  title="Stop Server"
                                >
                                  <StopIcon className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={(e) => handleRestart(server.id, e)}
                                  className="p-2 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition-all"
                                  title="Restart Server"
                                >
                                  <ArrowPathIcon className="h-5 w-5" />
                                </button>
                              </>
                            )}
                            <button
                              onClick={(e) => handleDelete(server.id, e)}
                              className={`p-2 rounded-lg ${theme.bgTertiary} ${theme.textSecondary} hover:bg-red-600/20 hover:text-red-400 transition-all`}
                              title="Delete Server"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </div>
                        </td>

                        {/* CPU Usage */}
                        <td className="px-6 py-5">
                          <div className="flex items-center space-x-3">
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className={`text-sm font-semibold ${theme.text}`}>
                                  {typeof server.stats?.cpu !== 'undefined' ? `${server.stats.cpu}%` : '0%'}
                                </span>
                              </div>
                              <div className="w-24 bg-gray-700/50 rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className={`h-full transition-all duration-500 ${
                                    (server.stats?.cpu || 0) > 75 ? 'bg-red-500' :
                                    (server.stats?.cpu || 0) > 50 ? 'bg-yellow-500' :
                                    'bg-emerald-500'
                                  }`}
                                  style={{ width: `${Math.min(server.stats?.cpu || 0, 100)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Memory Usage */}
                        <td className="px-6 py-5">
                          <div className="flex items-center space-x-3">
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className={`text-sm font-semibold ${theme.text}`}>
                                  {typeof server.stats?.memory !== 'undefined' ? `${server.stats.memory} MB` : '0 MB'}
                                </span>
                              </div>
                              <div className="w-24 bg-gray-700/50 rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                                  style={{ width: `${Math.min((server.stats?.memory || 0) / 327.68, 100)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Disk Size */}
                        <td className="px-6 py-5">
                          <span className={`text-sm font-medium ${theme.text}`}>
                            {server.dirSizeFormatted || '-'}
                          </span>
                        </td>

                        {/* Players */}
                        <td className="px-6 py-5">
                          <div className="flex items-center space-x-2">
                            <UsersIcon className="h-5 w-5 text-blue-400" />
                            <span className={`text-sm font-semibold ${theme.text}`}>
                              {server.players?.length || 0}
                            </span>
                            <span className={`text-xs ${theme.textSecondary}`}>
                              / {server.max_players}
                            </span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-5">
                          <div className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-full ${
                            server.status === 'running' ? 'bg-emerald-500/20' :
                            server.status === 'starting' ? 'bg-yellow-500/20' :
                            server.status === 'stopping' ? 'bg-orange-500/20' :
                            'bg-gray-600/20'
                          }`}>
                            <span className={`w-2 h-2 rounded-full ${
                              server.status === 'running' ? 'bg-emerald-400 animate-pulse' :
                              server.status === 'starting' ? 'bg-yellow-400 animate-pulse' :
                              server.status === 'stopping' ? 'bg-orange-400 animate-pulse' :
                              'bg-gray-400'
                            }`} />
                            <span className={`text-sm font-semibold ${
                              server.status === 'running' ? 'text-emerald-400' :
                              server.status === 'starting' ? 'text-yellow-400' :
                              server.status === 'stopping' ? 'text-orange-400' :
                              theme.textSecondary
                            }`}>
                              {server.status === 'running' ? 'Online' :
                               server.status === 'starting' ? 'Starting' :
                               server.status === 'stopping' ? 'Stopping' :
                               'Offline'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {filteredServers.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-700/50">
                <p className="text-sm text-gray-500">
                  Showing 1 to {filteredServers.length} of {filteredServers.length} entries
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal({ isOpen: false, serverId: null, serverName: '' })}
          onConfirm={confirmDelete}
          title="Delete Server"
          message={`Are you sure you want to delete "${deleteModal.serverName}"?`}
          confirmText="Delete"
          cancelText="Cancel"
          danger={true}
          warning="This action cannot be undone. All server files and configurations will be permanently deleted."
        />
      </>
  );
}
