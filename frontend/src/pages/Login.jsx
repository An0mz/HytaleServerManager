import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RocketLaunchIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import * as api from '../services/api';

export default function Login() {
  const navigate = useNavigate();
  const { user, setUser, login } = useAuth();
  const { theme } = useTheme();
  const toast = useToast();
  const [isSetup, setIsSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    email: ''
  });
  const [showTempAdmin, setShowTempAdmin] = useState(false);
  const [tempAdminInfo, setTempAdminInfo] = useState(null);
  const [creatingTempAdmin, setCreatingTempAdmin] = useState(false);

  // --- FIRST-TIME SETUP CHECK ---
  useEffect(() => {
    const init = async () => {
      try {
        const response = await api.checkSetupNeeded();
        const setupNeeded = response.data.setupNeeded;
        setIsSetup(setupNeeded);

        // Only reset user if it's first-time setup
        if (setupNeeded) {
          setUser(null);
        }
      } catch (err) {
        console.error('Failed to check setup status:', err);
        setIsSetup(false);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [setUser]);

  // --- FORM SUBMISSION ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    if (isSetup) {
      // Registration flow
      if (!formData.username || !formData.password) {
        setError('Username and password are required');
        setSubmitting(false);
        return;
      }
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters');
        setSubmitting(false);
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        setSubmitting(false);
        return;
      }

      try {
        await api.register(formData.username, formData.password, formData.email);

        // Auto-login after registration
        const result = await login(formData.username, formData.password);
        if (result.success) {
          navigate('/');
        } else {
          setError('Account created but login failed. Please try logging in.');
          setIsSetup(false);
        }
      } catch (err) {
        setError(err.response?.data?.error || 'Registration failed');
      }
    } else {
      // Login flow
      const result = await login(formData.username, formData.password);
      if (result.success) {
        navigate('/');
      } else {
        setError(result.error);
      }
    }

    setSubmitting(false);
  };

  // --- TEMP ADMIN CREATION (FORGOT PASSWORD) ---
  const handleForgotPassword = async () => {
    try {
      setCreatingTempAdmin(true);
      const response = await api.createTempAdmin();
      setTempAdminInfo(response.data);
      setShowTempAdmin(true);
      toast.info('Temporary admin account created');
    } catch (err) {
      toast.error('Failed to create temporary admin: ' + err.message);
    } finally {
      setCreatingTempAdmin(false);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme.bg}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme.bg} flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden`}>
      <div className={`absolute inset-0 ${theme.bg}`}></div>
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>

      <div className="relative sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-3xl shadow-2xl shadow-cyan-500/50 animate-pulse">
            <RocketLaunchIcon className="h-12 w-12 text-white" />
          </div>
        </div>
        <h2 className="text-center text-4xl font-bold gradient-text mb-2">
          Hytale Server Manager
        </h2>
        <p className={`text-center ${theme.textSecondary}`}>
          {isSetup ? 'Create Your Admin Account' : 'Sign in to your account'}
        </p>
      </div>

      <div className="relative mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className={`${theme.card} p-8`}>
          {isSetup && (
            <div className="mb-6 bg-cyan-900/20 border border-cyan-500/30 rounded-xl p-4">
              <p className="text-sm text-cyan-400 font-semibold mb-1">🎉 First Time Setup</p>
              <p className={`text-xs ${theme.textSecondary}`}>
                Create your administrator account to get started. This will be the primary account for managing servers.
              </p>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-900/20 border border-red-700/50 text-red-400 px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            {/* Username */}
            <div>
              <label className={`block text-sm font-semibold ${theme.textSecondary} mb-2`}>Username *</label>
              <input
                type="text"
                required
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className={theme.input + " w-full px-4 py-2 rounded-lg focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none"}
                placeholder="Enter your username"
                autoComplete="username"
              />
            </div>

            {/* Email */}
            {isSetup && (
              <div>
                <label className={`block text-sm font-semibold ${theme.textSecondary} mb-2`}>Email (optional)</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={theme.input + " w-full px-4 py-2 rounded-lg focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none"}
                  placeholder="your.email@example.com"
                  autoComplete="email"
                />
              </div>
            )}

            {/* Password */}
            <div>
              <label className={`block text-sm font-semibold ${theme.textSecondary} mb-2`}>Password *</label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className={theme.input + " w-full px-4 py-2 rounded-lg focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none"}
                placeholder={isSetup ? "Create a strong password" : "Enter your password"}
                autoComplete={isSetup ? "new-password" : "current-password"}
              />
              {isSetup && <p className={`text-xs ${theme.textSecondary} mt-1`}>Minimum 6 characters</p>}
            </div>

            {/* Confirm Password */}
            {isSetup && (
              <div>
                <label className={`block text-sm font-semibold ${theme.textSecondary} mb-2`}>Confirm Password *</label>
                <input
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className={theme.input + " w-full px-4 py-3 rounded-xl focus:ring-2 focus:outline-none transition-all duration-200"}
                  placeholder="Confirm your password"
                  autoComplete="new-password"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <span className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>{isSetup ? 'Creating Account...' : 'Signing in...'}</span>
                </span>
              ) : (
                isSetup ? 'Create Admin Account' : 'Sign In'
              )}
            </button>
          </form>

          {!isSetup && (
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={creatingTempAdmin}
              className="mt-4 w-full text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              {creatingTempAdmin ? 'Creating temp admin...' : 'Forgot Password?'}
            </button>
          )}

          {isSetup && (
            <div className="mt-6 bg-blue-900/20 border border-blue-500/30 rounded-xl p-4">
              <p className="text-xs text-blue-400">
                <strong>💡 Tip:</strong> Save your credentials securely. This account will have full administrative access to all servers.
              </p>
            </div>
          )}
        </div>

        <p className={`mt-6 text-center text-xs ${theme.textSecondary}`}>
          Version 1.1.3 • Built with ❤️ for Hytale
        </p>
      </div>
    </div>
  );
}
