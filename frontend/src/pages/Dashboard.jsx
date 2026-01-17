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

export default function Dashboard() {
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
    } catch (error) {
      alert('Failed to start: ' + error.message);
    }
  };

  const handleStop = async (serverId, e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await api.stopServer(serverId);
    } catch (error) {
      alert('Failed to stop: ' + error.message);
    }
  };

  const handleRestart = async (serverId, e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await api.restartServer(serverId);
    } catch (error) {
      alert('Failed to restart: ' + error.message);
    }
  };

  const handleDelete = async (serverId, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('Delete this server permanently?')) {
      try {
        await api.deleteServer(serverId);
        setServers(prev => prev.filter(s => s.id !== serverId));
      } catch (error) {
        alert('Failed to delete: ' + error.message);
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-cyan-500"></div>
      </div>
    );
  }

  return (
      <>
    <Header />
        <div className="min-h-screen p-6">
          {/* Stats Bar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Servers</p>
                  <p className="text-3xl font-bold text-white">{stats.total}</p>
                  <p className="text-emerald-400 text-xs mt-1">
                    {stats.running} online • {stats.offline} offline
                  </p>
                </div>
                <CircleStackIcon className="h-10 w-10 text-cyan-400" />
              </div>
            </div>

            <div className="card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Players</p>
                  <p className="text-3xl font-bold text-white">{stats.players}</p>
                  <p className="text-blue-400 text-xs mt-1">{stats.maxPlayers} Max</p>
                </div>
                <UsersIcon className="h-10 w-10 text-blue-400" />
              </div>
            </div>

            <div className="card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  <div>
                    <p className="text-gray-400 text-sm">CPU Usage</p>
                    <p className="text-3xl font-bold text-white">{stats.cpuTotal}%</p>
                    <p className="text-gray-500 text-xs mt-1">Across all servers</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Memory</p>
                    <p className="text-3xl font-bold text-white">{stats.memoryTotal} MB</p>
                    <p className="text-gray-500 text-xs mt-1">Total across servers</p>
                  </div>
                </div>
                <CpuChipIcon className="h-10 w-10 text-purple-400" />
              </div>
            </div>

            <div className="card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Connection</p>
                  <p className={`text-xl font-bold mt-1 ${wsConnected ? 'text-emerald-400' : 'text-red-400'}`}>
                    {wsConnected ? 'Live' : 'Offline'}
                  </p>
                </div>
                <SignalIcon className={`h-10 w-10 ${wsConnected ? 'text-emerald-400' : 'text-red-400'}`} />
              </div>
            </div>
          </div>

          {/* Server List */}
          <div className="card">
            <div className="px-6 py-4 border-b border-gray-700/50 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">All Servers</h2>
              <div className="flex items-center space-x-4">
                <input
                  type="text"
                  placeholder="Search servers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none"
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
                <thead className="bg-gray-800/50 border-b border-gray-700/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Server</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Actions</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">CPU Usage</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Memory Usage</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Server Dir Size</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Players</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/30">
                  {filteredServers.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center">
                        <CircleStackIcon className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-500">No servers found</p>
                        <Link to="/create" className="text-cyan-400 hover:text-cyan-300 text-sm mt-2 inline-block">
                          Create your first server
                        </Link>
                      </td>
                    </tr>
                  ) : (
                    filteredServers.map((server) => (
                      <tr key={server.id} className="hover:bg-gray-800/30 transition-colors">
                        <td className="px-6 py-4">
                          <Link to={`/server/${server.id}`} className="block">
                            <p className="text-cyan-400 font-medium hover:text-cyan-300">{server.name}</p>
                            <p className="text-sm text-gray-500">Port {server.port}</p>
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
                              className="p-2 rounded-lg bg-gray-700/50 text-gray-400 hover:bg-gray-600/50 transition-all"
                              title="Delete"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-white">{typeof server.stats?.cpu !== 'undefined' ? `${server.stats.cpu}%` : '0%'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-white">{typeof server.stats?.memory !== 'undefined' ? `${server.stats.memory} MB` : '-'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-white">{server.dirSizeFormatted || '-'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-white">{server.players?.length || 0} / {server.max_players} Max</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            {server.status === 'running' && (
                              <>
                                <span className="h-3 w-3 rounded-full bg-emerald-400" />
                                <span className="text-sm font-semibold text-white">Online</span>
                              </>
                            )}
                            {server.status === 'starting' && (
                              <>
                                <span className="h-3 w-3 rounded-full bg-yellow-400" />
                                <span className="text-sm font-semibold text-white">Starting</span>
                              </>
                            )}
                            {server.status === 'stopping' && (
                              <>
                                <span className="h-3 w-3 rounded-full bg-orange-400" />
                                <span className="text-sm font-semibold text-white">Shutting down</span>
                              </>
                            )}
                            {!(server.status === 'running' || server.status === 'starting' || server.status === 'stopping') && (
                              <>
                                <span className="h-3 w-3 rounded-full bg-red-400" />
                                <span className="text-sm font-semibold text-white">Offline</span>
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
