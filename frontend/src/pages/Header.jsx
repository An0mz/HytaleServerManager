import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  RocketLaunchIcon, 
  UserCircleIcon, 
  UsersIcon,
  Cog6ToothIcon, 
  ArrowRightOnRectangleIcon,
  ChevronDownIcon,
  MoonIcon,
  SunIcon,
  SwatchIcon,
  SignalIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';
import websocket from '../services/websocket';

export default function Header() {
  const { user, logout } = useAuth();
  const { theme, currentTheme, changeTheme, themes } = useTheme();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const dropdownRef = useRef(null);
  const themeDropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
      if (themeDropdownRef.current && !themeDropdownRef.current.contains(event.target)) {
        setThemeDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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

  const getThemeIcon = () => {
    if (currentTheme === 'light') return <SunIcon className={`h-5 w-5 ${theme.text}`} />;
    if (currentTheme === 'orange') return <SwatchIcon className={`h-5 w-5 ${theme.text}`} />;
    return <MoonIcon className={`h-5 w-5 ${theme.text}`} />;
  };

  return (
    <header className={`${theme.bgSecondary} backdrop-blur-sm border-b ${theme.border} sticky top-0 z-40`}>
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left - Logo and Title */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-all">
              <RocketLaunchIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold gradient-text">Hytale Server Manager</h1>
              <p className="text-xs text-gray-500">v1.1.2</p>
            </div>
          </Link>

          {/* Right - Connection Status, Theme Switcher and User Dropdown */}
          <div className="flex items-center space-x-3">
            {/* WebSocket Connection Status */}
            <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${theme.bgTertiary} border ${theme.border}`}>
              <SignalIcon className={`h-5 w-5 ${wsConnected ? 'text-emerald-400' : 'text-red-400'}`} />
              <div className="flex items-center space-x-2">
                <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                <span className={`text-xs font-semibold ${wsConnected ? 'text-emerald-400' : 'text-red-400'}`}>
                  {wsConnected ? 'Live' : 'Offline'}
                </span>
              </div>
            </div>

            {/* Theme Switcher */}
            <div className="relative" ref={themeDropdownRef}>
              <button
                onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
                className={`p-2 rounded-lg ${theme.bgTertiary} border ${theme.border} hover:opacity-80 transition-all`}
                title="Change Theme"
              >
                {getThemeIcon()}
              </button>

              {themeDropdownOpen && (
                <div className={`absolute right-0 mt-2 w-48 ${theme.card} rounded-xl shadow-2xl overflow-hidden`}>
                  <div className={`px-3 py-2 border-b ${theme.border} ${theme.bgTertiary}`}>
                    <p className={`text-xs font-semibold ${theme.textSecondary}`}>Select Theme</p>
                  </div>
                  <div className="py-1">
                    {Object.entries(themes).map(([key, themeOption]) => (
                      <button
                        key={key}
                        onClick={() => {
                          changeTheme(key);
                          setThemeDropdownOpen(false);
                        }}
                        className={`w-full px-4 py-2 text-left text-sm ${theme.textSecondary} hover:${theme.bgTertiary} flex items-center justify-between transition-colors`}
                      >
                        <span>{themeOption.name}</span>
                        {currentTheme === key && (
                          <span className={theme.accentText}>✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* User Dropdown */}
            <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className={`flex items-center space-x-3 px-4 py-2 rounded-xl ${theme.bgTertiary} border ${theme.border} hover:opacity-80 transition-all`}
            >
              <UserCircleIcon className={`h-6 w-6 ${theme.accentText}`} />
              <div className="text-left">
                <p className={`text-sm font-semibold ${theme.text}`}>{user?.username || 'User'}</p>
                <p className={`text-xs ${theme.textSecondary} capitalize`}>{user?.role || 'Admin'}</p>
              </div>
              <ChevronDownIcon className={`h-4 w-4 ${theme.textSecondary} transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className={`absolute right-0 mt-2 w-56 ${theme.card} border ${theme.border} rounded-xl shadow-2xl overflow-hidden`}>
                {/* User Info Section */}
                <div className={`px-4 py-3 border-b ${theme.border} ${theme.bgTertiary}`}>
                  <p className={`text-sm font-semibold ${theme.text}`}>{user?.username || 'User'}</p>
                  <p className={`text-xs ${theme.textSecondary}`}>{user?.email || 'No email set'}</p>
                </div>

                {/* Menu Items */}
                <div className="py-2">
                  {user?.role !== 'temp_admin' && (
                    <Link
                      to="/settings"
                      onClick={() => setDropdownOpen(false)}
                      className={`w-full px-4 py-2 text-left text-sm ${theme.textSecondary} hover:${theme.bgTertiary} hover:${theme.text} flex items-center space-x-3 transition-colors`}
                    >
                      <Cog6ToothIcon className={`h-5 w-5 ${theme.textSecondary}`} />
                      <span>Settings</span>
                    </Link>
                  )}

                  {/* Users - Only for admin/temp_admin */}
                  {(user?.role === 'admin' || user?.role === 'temp_admin') && (
                    <Link
                      to="/users"
                      onClick={() => setDropdownOpen(false)}
                      className={`w-full px-4 py-2 text-left text-sm ${theme.textSecondary} hover:${theme.bgTertiary} hover:${theme.text} flex items-center space-x-3 transition-colors`}
                    >
                      <UsersIcon className={`h-5 w-5 ${theme.textSecondary}`} />
                      <span>Users</span>
                    </Link>
                  )}

                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      handleLogout();
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-900/20 hover:text-red-300 flex items-center space-x-3 transition-colors"
                  >
                    <ArrowRightOnRectangleIcon className="h-5 w-5" />
                    <span>Logout</span>
                  </button>
                </div>

                {/* Footer */}
                <div className={`px-4 py-2 border-t ${theme.border} ${theme.bgTertiary}`}>
                  <p className={`text-xs ${theme.textSecondary} text-center`}>
                    Hytale Server Manager 1.1.2
                  </p>
                </div>
              </div>
            )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}