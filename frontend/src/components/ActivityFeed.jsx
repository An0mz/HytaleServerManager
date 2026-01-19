import React, { useState, useEffect } from 'react';
import { 
  ClockIcon, 
  UserPlusIcon,
  UserMinusIcon,
  PlayIcon,
  StopIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { useTheme } from '../contexts/ThemeContext';
import websocket from '../services/websocket';

export default function ActivityFeed({ serverId }) {
  const { theme } = useTheme();
  const [activities, setActivities] = useState([]);
  const maxActivities = 20;

  useEffect(() => {
    const unsubscribe = websocket.on('console_output', (data) => {
      if (data.serverId === parseInt(serverId)) {
        parseConsoleOutput(data.data);
      }
    });

    const unsubStatusChange = websocket.on('server_status_changed', (data) => {
      if (data.serverId === parseInt(serverId)) {
        addActivity({
          type: 'status',
          action: data.status === 'running' ? 'started' : 'stopped',
          timestamp: new Date(),
          message: `Server ${data.status === 'running' ? 'started' : 'stopped'}`
        });
      }
    });

    const unsubPlayers = websocket.on('server_players_changed', (data) => {
      if (data.serverId === parseInt(serverId)) {
        if (data.joined) {
          addActivity({
            type: 'player_join',
            player: data.joined,
            timestamp: new Date(),
            message: `${data.joined} joined the server`
          });
        }
        if (data.left) {
          addActivity({
            type: 'player_leave',
            player: data.left,
            timestamp: new Date(),
            message: `${data.left} left the server`
          });
        }
      }
    });

    return () => {
      unsubscribe();
      unsubStatusChange();
      unsubPlayers();
    };
  }, [serverId]);

  const parseConsoleOutput = (output) => {
    const lines = output.split('\n').filter(line => line.trim());
    
    lines.forEach(line => {
      // Parse different log patterns
      if (line.includes('ERROR') || line.includes('SEVERE')) {
        addActivity({
          type: 'error',
          timestamp: new Date(),
          message: line.substring(line.indexOf(']') + 1).trim() || 'Error detected'
        });
      } else if (line.includes('WARN')) {
        addActivity({
          type: 'warning',
          timestamp: new Date(),
          message: line.substring(line.indexOf(']') + 1).trim() || 'Warning detected'
        });
      } else if (line.includes('joined') || line.includes('connected')) {
        const playerMatch = line.match(/(\w+)\s+(joined|connected)/i);
        if (playerMatch) {
          addActivity({
            type: 'player_join',
            player: playerMatch[1],
            timestamp: new Date(),
            message: `${playerMatch[1]} joined the server`
          });
        }
      } else if (line.includes('left') || line.includes('disconnected')) {
        const playerMatch = line.match(/(\w+)\s+(left|disconnected)/i);
        if (playerMatch) {
          addActivity({
            type: 'player_leave',
            player: playerMatch[1],
            timestamp: new Date(),
            message: `${playerMatch[1]} left the server`
          });
        }
      }
    });
  };

  const addActivity = (activity) => {
    setActivities(prev => {
      const newActivities = [activity, ...prev];
      return newActivities.slice(0, maxActivities);
    });
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'player_join':
        return <UserPlusIcon className="h-4 w-4 text-emerald-400" />;
      case 'player_leave':
        return <UserMinusIcon className="h-4 w-4 text-orange-400" />;
      case 'status':
        return <PlayIcon className="h-4 w-4 text-cyan-400" />;
      case 'error':
        return <ExclamationTriangleIcon className="h-4 w-4 text-red-400" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-4 w-4 text-yellow-400" />;
      default:
        return <InformationCircleIcon className="h-4 w-4 text-blue-400" />;
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case 'player_join':
        return 'bg-emerald-500/10 border-emerald-500/20';
      case 'player_leave':
        return 'bg-orange-500/10 border-orange-500/20';
      case 'status':
        return 'bg-cyan-500/10 border-cyan-500/20';
      case 'error':
        return 'bg-red-500/10 border-red-500/20';
      case 'warning':
        return 'bg-yellow-500/10 border-yellow-500/20';
      default:
        return 'bg-blue-500/10 border-blue-500/20';
    }
  };

  const formatTime = (date) => {
    const now = new Date();
    const diff = Math.floor((now - date) / 1000); // seconds

    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleTimeString();
  };

  return (
    <div className={`${theme.card} overflow-hidden`}>
      {/* Header */}
      <div className={`px-6 py-4 ${theme.bgSecondary} border-b ${theme.border}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <ClockIcon className={`h-5 w-5 ${theme.accentText}`} />
            <div>
              <h3 className={`text-lg font-semibold ${theme.text}`}>Activity Feed</h3>
              <p className={`text-sm ${theme.textSecondary}`}>Recent server events and actions</p>
            </div>
          </div>
          {activities.length > 0 && (
            <button
              onClick={() => setActivities([])}
              className={`text-sm ${theme.textSecondary} hover:text-red-400 transition-colors`}
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Activity List */}
      <div className="p-4 max-h-[500px] overflow-y-auto">
        {activities.length === 0 ? (
          <div className="text-center py-12">
            <ClockIcon className={`h-12 w-12 ${theme.textSecondary} mx-auto mb-3`} />
            <p className={theme.textSecondary}>No recent activity</p>
            <p className={`text-sm ${theme.textSecondary} mt-1`}>Events will appear here when they occur</p>
          </div>
        ) : (
          <div className="space-y-2">
            {activities.map((activity, index) => (
              <div
                key={index}
                className={`flex items-start space-x-3 p-3 rounded-lg border ${getActivityColor(activity.type)} ${theme.bgSecondary} hover:${theme.bgTertiary} transition-all group`}
              >
                {/* Icon */}
                <div className="flex-shrink-0 mt-0.5">
                  {getActivityIcon(activity.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${theme.text} font-medium`}>
                    {activity.message}
                  </p>
                  {activity.player && (
                    <p className={`text-xs ${theme.textSecondary} mt-0.5`}>
                      Player: {activity.player}
                    </p>
                  )}
                </div>

                {/* Timestamp */}
                <div className="flex-shrink-0">
                  <p className={`text-xs ${theme.textSecondary}`}>
                    {formatTime(activity.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {activities.length > 0 && (
        <div className={`px-6 py-3 ${theme.bgSecondary} border-t ${theme.border}`}>
          <p className={`text-xs ${theme.textSecondary} text-center`}>
            Showing {activities.length} of last {maxActivities} events
          </p>
        </div>
      )}
    </div>
  );
}
