import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeftIcon,
  KeyIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import * as api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';
import Header from './Header';
import Users from './Users';

export default function Settings() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setSaving(true);
      await api.changePassword(formData.currentPassword, formData.newPassword);
      
      setSuccess('Password changed successfully!');
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  if (user?.role === 'temp_admin') {
    return (
      <>
        <Header />
        <div className="min-h-screen p-6 flex items-center justify-center">
          <div className="max-w-md">
            <div className="card p-8 text-center">
              <ExclamationTriangleIcon className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Access Restricted</h2>
              <p className="text-gray-400 mb-6">
                Temporary admin accounts cannot access settings. This account is only for password recovery.
              </p>
              <Link to="/" className="btn-primary inline-block">
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }
  
  return (
    <>
      <Header />
      <div className={`min-h-screen ${theme.bg} p-6`}>
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className={theme.card + " mb-6"}>
            <div className="px-6 py-4">
              <div className="flex items-center space-x-4">
                <Link 
                  to="/" 
                  className={`p-2 hover:${theme.bgTertiary} rounded-lg transition-colors`}
                >
                  <ArrowLeftIcon className={`h-5 w-5 ${theme.textSecondary}`} />
                </Link>
                <div>
                  <h1 className={`text-2xl font-bold ${theme.text}`}>Account Settings</h1>
                  <p className={`text-sm ${theme.textSecondary}`}>Manage your account preferences</p>
                </div>
              </div>
            </div>
          </div>

          {/* User Info */}
          <div className={theme.card + " mb-6"}>
            <div className={`px-6 py-4 border-b ${theme.border}`}>
              <h2 className={`text-lg font-semibold ${theme.text}`}>Account Information</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={`block text-sm font-semibold ${theme.textSecondary} mb-2`}>Username</label>
                <div className={`px-4 py-3 ${theme.bgTertiary} rounded-lg ${theme.text}`}>
                  {user?.username}
                </div>
              </div>
              <div>
                <label className={`block text-sm font-semibold ${theme.textSecondary} mb-2`}>Role</label>
                <div className={`px-4 py-3 ${theme.bgTertiary} rounded-lg ${theme.text} capitalize`}>
                  {user?.role}
                </div>
              </div>
            </div>
          </div>

          {/* Change Password */}
          <div className={theme.card}>
            <div className={`px-6 py-4 border-b ${theme.border}`}>
              <div className="flex items-center space-x-3">
                <KeyIcon className={`h-6 w-6 ${theme.accentText}`} />
                <h2 className={`text-lg font-semibold ${theme.text}`}>Change Password</h2>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {error && (
                <div className="bg-red-900/20 border border-red-700/50 text-red-400 px-4 py-3 rounded-xl">
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-emerald-900/20 border border-emerald-700/50 text-emerald-400 px-4 py-3 rounded-xl">
                  {success}
                </div>
              )}

              <div>
                <label className={`block text-sm font-semibold ${theme.textSecondary} mb-2`}>
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={formData.currentPassword}
                  onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                  className={theme.input + " w-full px-4 py-3 rounded-xl focus:ring-2 focus:outline-none transition-all duration-200"}
                  placeholder="Enter your current password"
                  autoComplete="current-password"
                />
              </div>

              <div>
                <label className={`block text-sm font-semibold ${theme.textSecondary} mb-2`}>
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={formData.newPassword}
                  onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                  className={theme.input + " w-full px-4 py-3 rounded-xl focus:ring-2 focus:outline-none transition-all duration-200"}
                  placeholder="Enter new password"
                  autoComplete="new-password"
                />
                <p className={`text-xs ${theme.textSecondary} mt-1`}>Minimum 6 characters</p>
              </div>

              <div>
                <label className={`block text-sm font-semibold ${theme.textSecondary} mb-2`}>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className={theme.input + " w-full px-4 py-3 rounded-xl focus:ring-2 focus:outline-none transition-all duration-200"}
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full btn-primary py-3 disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                <CheckIcon className="h-5 w-5" />
                <span>{saving ? 'Changing Password...' : 'Change Password'}</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}