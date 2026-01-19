import React, { useState, useEffect } from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CpuChipIcon, CircleStackIcon, ClockIcon, UsersIcon } from '@heroicons/react/24/outline';
import * as api from '../services/api';
import websocket from '../services/websocket';
import { useTheme } from '../contexts/ThemeContext';

export default function StatsPanel({ serverId, serverStatus }) {
  const { theme } = useTheme();
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (serverStatus === 'running') {
      loadStats();
      const interval = setInterval(loadStats, 5000);
      return () => clearInterval(interval);
    }
  }, [serverId, serverStatus]);

  useEffect(() => {
    const unsubscribe = websocket.on('server_stats', (data) => {
      if (data.serverId === parseInt(serverId)) {
        setStats(data.data);
        setHistory(prev => {
          const newHistory = [...prev, {
            time: new Date().toLocaleTimeString(),
            memory: data.data.memory,
            cpu: data.data.cpu,
            timestamp: Date.now()
          }];
          // Keep last 30 data points
          return newHistory.slice(-30);
        });
      }
    });

    return () => unsubscribe();
  }, [serverId]);

  const loadStats = async () => {
    try {
      const response = await api.getServerStats(serverId);
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const formatUptime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  if (serverStatus !== 'running') {
    return (
      <div className={`${theme.card} p-12 text-center`}>
        <CircleStackIcon className={`h-16 w-16 ${theme.textSecondary} mx-auto mb-4`} />
        <h3 className={`text-lg font-semibold ${theme.text} mb-2`}>Server Offline</h3>
        <p className={theme.textSecondary}>Start the server to view real-time statistics and performance metrics</p>
      </div>
    );
  }

  const getHealthColor = (value, type) => {
    if (type === 'cpu') {
      if (value > 80) return 'text-red-400';
      if (value > 60) return 'text-yellow-400';
      return 'text-emerald-400';
    }
    if (type === 'memory') {
      if (value > 3000) return 'text-red-400';
      if (value > 2000) return 'text-yellow-400';
      return 'text-emerald-400';
    }
  };

  const getHealthBg = (value, type) => {
    if (type === 'cpu') {
      if (value > 80) return 'bg-red-500/20';
      if (value > 60) return 'bg-yellow-500/20';
      return 'bg-emerald-500/20';
    }
    if (type === 'memory') {
      if (value > 3000) return 'bg-red-500/20';
      if (value > 2000) return 'bg-yellow-500/20';
      return 'bg-emerald-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Enhanced Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Memory Card */}
        <div className={`${theme.card} p-6 relative overflow-hidden group hover:scale-[1.02] transition-transform`}>
          <div className={`absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent`} />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${getHealthBg(stats?.memory, 'memory')}`}>
                <CircleStackIcon className={`h-6 w-6 ${getHealthColor(stats?.memory, 'memory')}`} />
              </div>
              <div className={`text-xs px-2 py-1 rounded-full ${getHealthBg(stats?.memory, 'memory')}`}>
                <span className={getHealthColor(stats?.memory, 'memory')}>
                  {stats?.memory > 3000 ? 'High' : stats?.memory > 2000 ? 'Medium' : 'Normal'}
                </span>
              </div>
            </div>
            <div>
              <p className={`text-xs ${theme.textSecondary} font-medium mb-1`}>Memory Usage</p>
              <p className={`text-3xl font-bold ${theme.text} mb-3`}>{stats?.memory || 0} MB</p>
              <div className="flex items-center space-x-2">
                <div className="flex-1 bg-gray-700/50 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                    style={{ width: `${Math.min((stats?.memory || 0) / 40, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CPU Card */}
        <div className={`${theme.card} p-6 relative overflow-hidden group hover:scale-[1.02] transition-transform`}>
          <div className={`absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent`} />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${getHealthBg(stats?.cpu, 'cpu')}`}>
                <CpuChipIcon className={`h-6 w-6 ${getHealthColor(stats?.cpu, 'cpu')}`} />
              </div>
              <div className={`text-xs px-2 py-1 rounded-full ${getHealthBg(stats?.cpu, 'cpu')}`}>
                <span className={getHealthColor(stats?.cpu, 'cpu')}>
                  {stats?.cpu > 80 ? 'High' : stats?.cpu > 60 ? 'Medium' : 'Normal'}
                </span>
              </div>
            </div>
            <div>
              <p className={`text-xs ${theme.textSecondary} font-medium mb-1`}>CPU Usage</p>
              <p className={`text-3xl font-bold ${theme.text} mb-3`}>{stats?.cpu || 0}%</p>
              <div className="flex items-center space-x-2">
                <div className="flex-1 bg-gray-700/50 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      (stats?.cpu || 0) > 80 ? 'bg-gradient-to-r from-red-500 to-orange-500' :
                      (stats?.cpu || 0) > 60 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                      'bg-gradient-to-r from-emerald-500 to-green-500'
                    }`}
                    style={{ width: `${Math.min(stats?.cpu || 0, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Uptime Card */}
        <div className={`${theme.card} p-6 relative overflow-hidden group hover:scale-[1.02] transition-transform`}>
          <div className={`absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent`} />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl bg-emerald-500/20`}>
                <ClockIcon className="h-6 w-6 text-emerald-400" />
              </div>
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div>
              <p className={`text-xs ${theme.textSecondary} font-medium mb-1`}>Uptime</p>
              <p className={`text-3xl font-bold ${theme.text} mb-1`}>{formatUptime(stats?.uptime || 0)}</p>
              <p className={`text-xs text-emerald-400 font-medium`}>Running smoothly</p>
            </div>
          </div>
        </div>

        {/* Players Card */}
        <div className={`${theme.card} p-6 relative overflow-hidden group hover:scale-[1.02] transition-transform`}>
          <div className={`absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent`} />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl bg-blue-500/20`}>
                <UsersIcon className="h-6 w-6 text-blue-400" />
              </div>
              <div className={`text-xs px-2 py-1 rounded-full ${(stats?.playerCount || 0) > 0 ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-600/20 text-gray-400'}`}>
                {(stats?.playerCount || 0) > 0 ? 'Active' : 'Empty'}
              </div>
            </div>
            <div>
              <p className={`text-xs ${theme.textSecondary} font-medium mb-1`}>Players Online</p>
              <p className={`text-3xl font-bold ${theme.text} mb-3`}>{stats?.playerCount || 0}</p>
              <div className="flex items-center space-x-2">
                <div className="flex-1 bg-gray-700/50 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500"
                    style={{ width: `${(stats?.playerCount || 0) * 10}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Charts */}
      {history.length > 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* CPU Chart */}
          <div className={`${theme.card} p-6`}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className={`text-lg font-semibold ${theme.text}`}>CPU Performance</h3>
                <p className={`text-sm ${theme.textSecondary} mt-1`}>Real-time processor usage</p>
              </div>
              <div className={`px-3 py-1.5 rounded-lg ${getHealthBg(stats?.cpu, 'cpu')}`}>
                <span className={`text-sm font-semibold ${getHealthColor(stats?.cpu, 'cpu')}`}>
                  {stats?.cpu}%
                </span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis 
                  dataKey="time" 
                  stroke="#9CA3AF" 
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis 
                  stroke="#9CA3AF" 
                  fontSize={12}
                  tickLine={false}
                  domain={[0, 100]}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '0.75rem',
                    color: '#fff',
                    padding: '12px'
                  }}
                  labelStyle={{ color: '#9CA3AF', marginBottom: '4px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="cpu" 
                  stroke="#8b5cf6" 
                  fill="url(#cpuGradient)"
                  strokeWidth={2}
                  name="CPU %"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Memory Chart */}
          <div className={`${theme.card} p-6`}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className={`text-lg font-semibold ${theme.text}`}>Memory Usage</h3>
                <p className={`text-sm ${theme.textSecondary} mt-1`}>RAM consumption over time</p>
              </div>
              <div className={`px-3 py-1.5 rounded-lg ${getHealthBg(stats?.memory, 'memory')}`}>
                <span className={`text-sm font-semibold ${getHealthColor(stats?.memory, 'memory')}`}>
                  {stats?.memory} MB
                </span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="memoryGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#06B6D4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis 
                  dataKey="time" 
                  stroke="#9CA3AF" 
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis 
                  stroke="#9CA3AF" 
                  fontSize={12}
                  tickLine={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '0.75rem',
                    color: '#fff',
                    padding: '12px'
                  }}
                  labelStyle={{ color: '#9CA3AF', marginBottom: '4px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="memory" 
                  stroke="#06B6D4" 
                  fill="url(#memoryGradient)"
                  strokeWidth={2}
                  name="Memory (MB)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}