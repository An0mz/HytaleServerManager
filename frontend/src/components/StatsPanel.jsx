import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import * as api from '../services/api';
import websocket from '../services/websocket';

export default function StatsPanel({ serverId, serverStatus }) {
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
        setHistory(prev => [...prev.slice(-20), {
          time: new Date().toLocaleTimeString(),
          memory: data.data.memory,
          cpu: data.data.cpu,
        }]);
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

  if (serverStatus !== 'running') {
    return (
      <div className="card p-8 text-center text-gray-400">
        Server must be running to view statistics
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-6">
          <div className="text-sm text-gray-400">Memory Usage</div>
          <div className="text-2xl font-bold text-white">{stats?.memory || 0} MB</div>
        </div>
        <div className="card p-6">
          <div className="text-sm text-gray-400">CPU Usage</div>
          <div className="text-2xl font-bold text-white">{stats?.cpu || 0}%</div>
        </div>
        <div className="card p-6">
          <div className="text-sm text-gray-400">Uptime</div>
          <div className="text-2xl font-bold text-white">{Math.floor((stats?.uptime || 0) / 60)}m</div>
        </div>
        <div className="card p-6">
          <div className="text-sm text-gray-400">Players</div>
          <div className="text-2xl font-bold text-white">{stats?.playerCount || 0}</div>
        </div>
      </div>

      {/* Chart */}
      {history.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Resource Usage History</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '0.5rem',
                  color: '#fff'
                }} 
              />
              <Legend />
              <Line type="monotone" dataKey="memory" stroke="#06B6D4" name="Memory (MB)" strokeWidth={2} />
              <Line type="monotone" dataKey="cpu" stroke="#10B981" name="CPU %" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}