import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  RocketLaunchIcon, 
  UserCircleIcon, 
  UsersIcon, // ✅ ADD THIS
  Cog6ToothIcon, 
  ArrowRightOnRectangleIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-40">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left - Logo and Title */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-all">
              <RocketLaunchIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold gradient-text">Hytale Server Manager</h1>
              <p className="text-xs text-gray-500">v1.1.0</p>
            </div>
          </Link>

          {/* Right - User Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center space-x-3 px-4 py-2 rounded-xl bg-gray-800/50 hover:bg-gray-800 transition-all border border-gray-700/50 hover:border-cyan-500/30"
            >
              <UserCircleIcon className="h-6 w-6 text-cyan-400" />
              <div className="text-left">
                <p className="text-sm font-semibold text-white">{user?.username || 'User'}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role || 'Admin'}</p>
              </div>
              <ChevronDownIcon className={`h-4 w-4 text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
                {/* User Info Section */}
                <div className="px-4 py-3 border-b border-gray-700 bg-gray-800/50">
                  <p className="text-sm font-semibold text-white">{user?.username || 'User'}</p>
                  <p className="text-xs text-gray-400">{user?.email || 'No email set'}</p>
                </div>

                {/* Menu Items */}
                <div className="py-2">
                  {user?.role !== 'temp_admin' && (
                    <Link
                      to="/settings"
                      onClick={() => setDropdownOpen(false)}
                      className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 hover:text-white flex items-center space-x-3 transition-colors"
                    >
                      <Cog6ToothIcon className="h-5 w-5 text-gray-400" />
                      <span>Settings</span>
                    </Link>
                  )}

                  {/* Users - Only for admin/temp_admin */}
                  {(user?.role === 'admin' || user?.role === 'temp_admin') && (
                    <Link
                      to="/users"
                      onClick={() => setDropdownOpen(false)}
                      className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 hover:text-white flex items-center space-x-3 transition-colors"
                    >
                      <UsersIcon className="h-5 w-5 text-gray-400" />
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
                <div className="px-4 py-2 border-t border-gray-700 bg-gray-800/30">
                  <p className="text-xs text-gray-500 text-center">
                    Hytale Server Manager v1.1.0
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}