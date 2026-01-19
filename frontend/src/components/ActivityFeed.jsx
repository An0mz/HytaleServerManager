import React, { useEffect } from 'react';
import { 
  UserPlusIcon,
  UserMinusIcon,
  PlayIcon,
  StopIcon,
  ExclamationTriangleIcon,
  ChatBubbleLeftIcon
} from '@heroicons/react/24/outline';
import { useTheme } from '../contexts/ThemeContext';
import { useActivity } from '../contexts/ActivityContext';
import websocket from '../services/websocket';

export default function ActivityFeed({ serverId }) {
  const { theme } = useTheme();
  const { activities: allActivities, addActivity, clearActivities, loadActivities } = useActivity();
  const activities = allActivities[serverId] || [];
  const serverStatusRef = React.useRef(null); // Track actual server status

  // Load activities from backend on mount
  useEffect(() => {
    loadActivities(serverId);
  }, [serverId, loadActivities]);

  useEffect(() => {
    const unsubscribe = websocket.on('console_output', (data) => {
      if (data.serverId === parseInt(serverId)) {
        parseConsoleOutput(data.data);
      }
    });

    const unsubStatusChange = websocket.on('server_status_changed', (data) => {
      if (data.serverId === parseInt(serverId)) {
        // Only add activity if status ACTUALLY changed
        if (serverStatusRef.current === data.status) {
          return; // Same status, ignore
        }

        const previousStatus = serverStatusRef.current;
        serverStatusRef.current = data.status;

        // Skip initial load - if we don't know the previous status, just record it
        if (previousStatus === null) {
          return;
        }

        const newActivity = {
          type: 'status',
          action: data.status === 'running' ? 'started' : 'stopped',
          timestamp: new Date().toISOString(),
          message: `Server ${data.status === 'running' ? 'started' : 'stopped'}`
        };
        
        addActivity(serverId, newActivity);
      }
    });

    return () => {
      unsubscribe();
      unsubStatusChange();
    };
  }, [serverId]);

  const isDuplicateActivity = (newActivity) => {
    if (activities.length === 0) return false;
    
    const lastActivity = activities[0];
    const timeDiff = new Date(newActivity.timestamp) - new Date(lastActivity.timestamp);
    
    // Check if same type within 3 seconds (regardless of exact message)
    return (
      lastActivity.type === newActivity.type &&
      timeDiff < 3000
    );
  };

  const parseConsoleOutput = (output) => {
    const lines = output.split('\n').filter(line => line.trim());
    
    lines.forEach(line => {
      let activity = null;

      // Skip internal server messages and debug output
      const skipPatterns = [
        /Received stream QuicConnectionAddress/,
        /Received connection from QuicConnectionAddress/,
        /com\.hypixel\.hytale\.protocol/,
        /Received com\./,
        /Sent com\./,
        /Added future for/,
        /compression now handled/,
        /Starting authenticated flow/,
        /\{Playing\(/,
        /\{Password\(/,
        /BreakBlockInteraction/,
        /Ref\{store=/,
        /requires a Player but was used for/,
        /\[CONTEXT ratelimit_period/,
        /@\d+\}/,
        /Task took \d+ms/,
        /java\.util\.concurrent/,
        /java\.lang\./
      ];

      // Check if this line should be skipped
      if (skipPatterns.some(pattern => pattern.test(line))) {
        return;
      }

      // Player chat - Hytale format: "[Hytale] PlayerName: message"
      const chatMatch = line.match(/\[Hytale\]\s+([^:]+):\s*(.+)$/);
      if (chatMatch && chatMatch[2]?.trim()) {
        const playerName = chatMatch[1].trim();
        const message = chatMatch[2].trim();
        
        // Avoid capturing system messages or commands as chat
        if (!message.startsWith('/') && !line.includes('joined') && !line.includes('left')) {
          activity = {
            type: 'player_chat',
            player: playerName,
            chatMessage: message,
            timestamp: new Date().toISOString(),
            message: `${playerName}: ${message}`
          };
        }
      }

      // Player joined - Hytale format: "Player 'PlayerName' joined world"
      if (!activity && line.includes("joined world")) {
        const match = line.match(/Player '([^']+)' joined world/);
        if (match) {
          activity = {
            type: 'player_join',
            player: match[1],
            timestamp: new Date().toISOString(),
            message: `${match[1]} joined the server`
          };
        }
      }
      // Player left - Hytale format: "UUID - PlayerName at ... left with reason:"
      else if (!activity && line.includes("left with reason:")) {
        const match = line.match(/[a-f0-9\-]+ - ([A-Za-z0-9_]+) at .+ left with reason:/);
        if (match) {
          activity = {
            type: 'player_leave',
            player: match[1],
            timestamp: new Date().toISOString(),
            message: `${match[1]} left the server`
          };
        }
      }

      // Add activity if not duplicate
      if (activity && !isDuplicateActivity(activity)) {
        addActivity(serverId, activity);
      }
    });
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'player_join':
        return <UserPlusIcon className="h-5 w-5 text-emerald-400" />;
      case 'player_leave':
        return <UserMinusIcon className="h-5 w-5 text-orange-400" />;
      case 'player_chat':
        return <ChatBubbleLeftIcon className="h-5 w-5 text-blue-400" />;
      case 'status':
        return <PlayIcon className="h-5 w-5 text-cyan-400" />;
      case 'error':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />;
      default:
        return <PlayIcon className="h-5 w-5 text-blue-400" />;
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case 'player_join':
        return 'bg-emerald-500/10 border-emerald-500/20';
      case 'player_leave':
        return 'bg-orange-500/10 border-orange-500/20';
      case 'player_chat':
        return 'bg-blue-500/10 border-blue-500/20';
      case 'status':
        return 'bg-cyan-500/10 border-cyan-500/20';
      case 'error':
        return 'bg-red-500/10 border-red-500/20';
      default:
        return 'bg-blue-500/10 border-blue-500/20';
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000); // seconds

    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const handleClear = () => {
    if (confirm('Clear all activity logs for this server?')) {
      clearActivities(serverId);
    }
  };

  return (
    <div className={`${theme.card} overflow-hidden`}>
      {/* Header */}
      <div className={`px-6 py-4 ${theme.bgSecondary} border-b ${theme.border}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className={`text-lg font-semibold ${theme.text}`}>Activity Feed</h3>
            <p className={`text-sm ${theme.textSecondary}`}>Server events and player activity</p>
          </div>
          {activities.length > 0 && (
            <button
              onClick={handleClear}
              className={`text-sm px-3 py-1 rounded-lg ${theme.textSecondary} hover:text-red-400 hover:bg-red-500/10 transition-colors`}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Activity List */}
      <div className="p-4 max-h-[600px] overflow-y-auto">
        {activities.length === 0 ? (
          <div className="text-center py-12">
            <PlayIcon className={`h-12 w-12 ${theme.textSecondary} mx-auto mb-3`} />
            <p className={`font-medium ${theme.text}`}>No activity yet</p>
            <p className={`text-sm ${theme.textSecondary} mt-1`}>Server events will appear here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {activities.map((activity, index) => (
              <div
                key={index}
                className={`flex items-start space-x-3 p-3 rounded-lg border ${getActivityColor(activity.type)} transition-all`}
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
                  <p className={`text-xs ${theme.textSecondary} mt-1`}>
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
            Showing {activities.length} recent events (max 100 stored)
          </p>
        </div>
      )}
    </div>
  );
}