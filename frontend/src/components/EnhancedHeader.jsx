import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, User, LogOut, Palette, Moon, Sun, Wifi, WifiOff, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';
import websocket from '../services/websocket';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { ScrollArea } from '../components/ui/scroll-area';
import * as api from '../services/api';
import { toast } from 'sonner';

export default function EnhancedHeader() {
  const { user, logout } = useAuth();
  const { theme, currentTheme, changeTheme, themes } = useTheme();
  const navigate = useNavigate();
  const [wsConnected, setWsConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Load notifications
  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    try {
      const response = await api.getNotifications(20);
      setNotifications(response.data);
      setUnreadCount(response.data.filter(n => !n.read).length);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  // Listen for new notifications via WebSocket
  useEffect(() => {
    const handleNotification = (data) => {
      toast.success(data.title, {
        description: data.message,
      });
      loadNotifications();
    };

    const unsubscribe = websocket.on('notification', handleNotification);
    return () => unsubscribe();
  }, []);

  // WebSocket connection status
  useEffect(() => {
    const unsubConnect = websocket.on('connected', () => setWsConnected(true));
    const unsubDisconnect = websocket.on('disconnected', () => setWsConnected(false));

    const current = websocket.getConnection();
    if (current && current.readyState === WebSocket.OPEN) {
      setWsConnected(true);
    }

    return () => {
      unsubConnect();
      unsubDisconnect();
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      loadNotifications();
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark notifications as read');
    }
  };

  const handleClearAll = async () => {
    try {
      await api.clearNotifications();
      setNotifications([]);
      setUnreadCount(0);
      setNotificationsOpen(false);
      toast.success('All notifications cleared');
    } catch (error) {
      toast.error('Failed to clear notifications');
    }
  };

  const getNotificationIcon = (type) => {
    if (type.includes('started')) return '🟢';
    if (type.includes('stopped')) return '🔴';
    if (type.includes('error')) return '⚠️';
    return '📢';
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <>
      <header className={`${theme.bgSecondary} backdrop-blur-sm border-b ${theme.border} sticky top-0 z-40`}>
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left - Logo */}
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-all">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold gradient-text">Hytale Server Manager</h1>
                <p className="text-xs text-gray-500">v1.1.2</p>
              </div>
            </Link>

            {/* Right - Actions */}
            <div className="flex items-center space-x-2">
              {/* Connection Status */}
              <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${theme.bgTertiary} border ${theme.border}`}>
                {wsConnected ? (
                  <Wifi className="h-4 w-4 text-emerald-400" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-400" />
                )}
                <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                <span className={`text-xs font-semibold ${wsConnected ? 'text-emerald-400' : 'text-red-400'}`}>
                  {wsConnected ? 'Live' : 'Offline'}
                </span>
              </div>

              {/* Theme Switcher */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    {currentTheme === 'light' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Theme</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {Object.entries(themes).map(([key, themeValue]) => (
                    <DropdownMenuItem 
                      key={key} 
                      onClick={() => changeTheme(key)}
                      className={currentTheme === key ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                    >
                      {key === 'light' ? <Sun className="h-4 w-4 mr-2" /> : 
                       key === 'midnight' ? <Palette className="h-4 w-4 mr-2" /> : 
                       <Moon className="h-4 w-4 mr-2" />}
                      {themeValue.name}
                      {currentTheme === key && <span className="ml-auto">✓</span>}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Notifications */}
              <DropdownMenu open={notificationsOpen} onOpenChange={setNotificationsOpen}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                      >
                        {Math.min(unreadCount, 99)}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <div className="flex items-center justify-between px-2 py-2">
                    <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
                    <div className="flex items-center space-x-1">
                      {unreadCount > 0 && (
                        <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="h-7 text-xs">
                          Mark all read
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={handleClearAll} className="h-7 text-xs">
                        Clear
                      </Button>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-gray-500">
                      No notifications
                    </div>
                  ) : (
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-1 p-1">
                        {notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors ${
                              !notification.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                            }`}
                            onClick={() => {
                              if (!notification.read) {
                                api.markNotificationRead(notification.id).then(loadNotifications);
                              }
                            }}
                          >
                            <div className="flex items-start space-x-2">
                              <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-medium">{notification.title}</p>
                                  {!notification.read && (
                                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                                  )}
                                </div>
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  {notification.message}
                                </p>
                                <div className="flex items-center justify-between">
                                  {notification.server_name && (
                                    <Badge variant="secondary" className="text-xs">
                                      {notification.server_name}
                                    </Badge>
                                  )}
                                  <span className="text-xs text-gray-500">
                                    {formatTime(notification.created_at)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>
                    <div>
                      <p className="font-medium">{user?.username}</p>
                      <p className="text-xs text-gray-500 font-normal">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/settings')}>
                    <Palette className="h-4 w-4 mr-2" /> Settings
                  </DropdownMenuItem>
                  {user?.role === 'admin' && (
                    <DropdownMenuItem onClick={() => navigate('/users')}>
                      <User className="h-4 w-4 mr-2" /> Users
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                    <LogOut className="h-4 w-4 mr-2" /> Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
