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
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';

export default function Dashboard() {
  const { theme } = useTheme();
  const toast = useToast();
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadServers();
    websocket.connect();

    // Listen for manual client-side signals to refresh servers (fallback for WS)
    const handleServersChanged = () => loadServers();
    window.addEventListener('servers-changed', handleServersChanged);

    const unsubConnect = websocket.on('connected', () => setWsConnected(true));
    const unsubDisconnect = websocket.on('disconnected', () => setWsConnected(false));
    const unsubUpdate = websocket.on('update', () => loadServers());

    const current = websocket.getConnection();
    if (current && current.readyState === WebSocket.OPEN) {
      setWsConnected(true);
    }

    const pollInterval = setInterval(() => {
      loadServers();
      const c = websocket.getConnection();
      setWsConnected(!!(c && c.readyState === WebSocket.OPEN));
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
    if (window.confirm('Delete this server permanently?')) {
      try {
        await api.deleteServer(serverId);
        setServers(prev => prev.filter(s => s.id !== serverId));
        toast.success('Server deleted successfully');
      } catch (error) {
        toast.error('Failed to delete: ' + error.message);
      }
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
    memoryTotal: Math.round(servers.reduce((acc, s) => acc + (s.stats?.memory || 0), 0))
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme.bg}`}>
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-cyan-500"></div>
      </div>
    );
  }

  return (
      <>
    <Header />
        <div className={`min-h-screen ${theme.bg} p-6`}>
          {/* Stats Bar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className={`${theme.card} p-4`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`${theme.textSecondary} text-sm`}>Servers</p>
                  <p className={`text-3xl font-bold ${theme.text}`}>{stats.total}</p>
                  <p className="text-emerald-400 text-xs mt-1">
                    {stats.running} online • {stats.offline} offline
                  </p>
                </div>
                <CircleStackIcon className="h-10 w-10 text-cyan-400" />
              </div>
            </div>

            <div className={`${theme.card} p-4`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`${theme.textSecondary} text-sm`}>Players</p>
                  <p className={`text-3xl font-bold ${theme.text}`}>{stats.players}</p>
                  <p className="text-blue-400 text-xs mt-1">{stats.maxPlayers} Max</p>
                </div>
                <UsersIcon className="h-10 w-10 text-blue-400" />
              </div>
            </div>

            <div className={`${theme.card} p-4`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  <div>
                    <p className={`${theme.textSecondary} text-sm`}>CPU Usage</p>
                    <p className={`text-3xl font-bold ${theme.text}`}>{stats.cpuTotal}%</p>
                    <p className={`${theme.textSecondary} text-xs mt-1`}>Across all servers</p>
                  </div>
                  <div>
                    <p className={`${theme.textSecondary} text-sm`}>Memory</p>
                    <p className={`text-3xl font-bold ${theme.text}`}>{stats.memoryTotal} MB</p>
                    <p className={`${theme.textSecondary} text-xs mt-1`}>Total across servers</p>
                  </div>
                </div>
                <CpuChipIcon className="h-10 w-10 text-purple-400" />
              </div>
            </div>

            <div className={`${theme.card} p-4`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`${theme.textSecondary} text-sm`}>Connection</p>
                  <p className={`text-xl font-bold mt-1 ${wsConnected ? 'text-emerald-400' : 'text-red-400'}`}>
                    {wsConnected ? 'Live' : 'Offline'}
                  </p>
                </div>
                <SignalIcon className={`h-10 w-10 ${wsConnected ? 'text-emerald-400' : 'text-red-400'}`} />
              </div>
            </div>
          </div>

          {/* Server List */}
          <div className={theme.card}>
            <div className={`px-6 py-4 border-b ${theme.border} flex items-center justify-between`}>
              <h2 className={`text-xl font-bold ${theme.text}`}>All Servers</h2>
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
                  className="btn-primary flex items-center space-x-2"
                >
                  <span>+ Create New Server</span>
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
                      <tr key={server.id} className={`hover:${theme.bgTertiary} transition-colors`}>
                        <td className="px-6 py-4">
                          <Link to={`/server/${server.id}`} className="block">
                            <p className={`${theme.accentText} font-medium hover:text-cyan-300`}>{server.name}</p>
                            <p className={`text-sm ${theme.textSecondary}`}>Port {server.port}</p>
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            {server.status === 'stopped' ? (
                              <button
                                onClick={(e) => handleStart(server.id, e)}
                                className="p-2 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 transition-all"
                                title="Start"
                              >
                                <PlayIcon className="h-4 w-4" />
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={(e) => handleStop(server.id, e)}
                                  className="p-2 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-all"
                                  title="Stop"
                                >
                                  <StopIcon className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={(e) => handleRestart(server.id, e)}
                                  className="p-2 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition-all"
                                  title="Restart"
                                >
                                  <ArrowPathIcon className="h-4 w-4" />
                                </button>
                              </>
                            )}
                            <button
                              onClick={(e) => handleDelete(server.id, e)}
                              className={`p-2 rounded-lg ${theme.bgTertiary} ${theme.textSecondary} hover:bg-red-600/20 hover:text-red-400 transition-all`}
                              title="Delete"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className={theme.text}>{typeof server.stats?.cpu !== 'undefined' ? `${server.stats.cpu}%` : '0%'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className={theme.text}>{typeof server.stats?.memory !== 'undefined' ? `${server.stats.memory} MB` : '-'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className={theme.text}>{server.dirSizeFormatted || '-'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className={theme.text}>{server.players?.length || 0} / {server.max_players} Max</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            {server.status === 'running' && (
                              <>
                                <span className="h-3 w-3 rounded-full bg-emerald-400" />
                                <span className={`text-sm font-semibold ${theme.text}`}>Online</span>
                              </>
                            )}
                            {server.status === 'starting' && (
                              <>
                                <span className="h-3 w-3 rounded-full bg-yellow-400" />
                                <span className={`text-sm font-semibold ${theme.text}`}>Starting</span>
                              </>
                            )}
                            {server.status === 'stopping' && (
                              <>
                                <span className="h-3 w-3 rounded-full bg-orange-400" />
                                <span className={`text-sm font-semibold ${theme.text}`}>Shutting down</span>
                              </>
                            )}
                            {!(server.status === 'running' || server.status === 'starting' || server.status === 'stopping') && (
                              <>
                                <span className="h-3 w-3 rounded-full bg-red-400" />
                                <span className={`text-sm font-semibold ${theme.text}`}>Offline</span>
                              </>
                            )}
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
      </>
  );
}
