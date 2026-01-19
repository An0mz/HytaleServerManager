import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeftIcon,
  UsersIcon,
  KeyIcon,
  TrashIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import * as api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import Header from './Header';
import ConfirmModal from '../components/ConfirmModal';
import { UserRowSkeleton, ListSkeleton } from '../components/Skeletons';

export default function Users() {
  const { user: currentUser } = useAuth();
  const { theme } = useTheme();
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, userId: null, username: '' });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await api.getUsers();
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (newPassword.length < 6) {
      toast.warning('Password must be at least 6 characters');
      return;
    }

    try {
      setResetting(true);
      await api.resetUserPassword(selectedUser.id, newPassword);
      toast.success(`Password reset successfully for ${selectedUser.username}`);
      setSelectedUser(null);
      setNewPassword('');
    } catch (error) {
      toast.error('Failed to reset password: ' + error.message);
    } finally {
      setResetting(false);
    }
  };

  const handleDeleteUser = async (user) => {
    setDeleteModal({ isOpen: true, userId: user.id, username: user.username });
  };

  const confirmDelete = async () => {
    try {
      await api.deleteUser(deleteModal.userId);
      toast.success('User deleted successfully');
      loadUsers();
    } catch (error) {
      toast.error('Failed to delete user: ' + error.message);
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className={`min-h-screen ${theme.bg} p-6`}>
          <div className="max-w-4xl mx-auto">
            <div className={theme.card + " mb-6 p-6"}>
              <div className="h-8 bg-gray-700 rounded w-32 mb-2 animate-pulse" />
              <div className="h-4 bg-gray-700 rounded w-48 animate-pulse" />
            </div>
            <ListSkeleton count={5} ItemSkeleton={UserRowSkeleton} />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className={`min-h-screen ${theme.bg} p-6`}>
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className={theme.card + " mb-6"}>
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Link 
                    to="/" 
                    className={`p-2 hover:${theme.bgTertiary} rounded-lg transition-colors`}
                  >
                    <ArrowLeftIcon className={`h-5 w-5 ${theme.textSecondary}`} />
                  </Link>
                  <div>
                    <h1 className={`text-2xl font-bold ${theme.text}`}>User Management</h1>
                    <p className={`text-sm ${theme.textSecondary}`}>Manage system users and passwords</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Temp Admin Warning */}
          {currentUser?.role === 'temp_admin' && (
            <div className="mb-6 bg-yellow-900/20 border border-yellow-700/50 rounded-xl p-4">
              <div className="flex items-start space-x-3">
                <ExclamationTriangleIcon className="h-6 w-6 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-yellow-400 mb-1">Temporary Admin Access</h3>
                  <p className="text-sm text-yellow-400/80">
                    You are logged in as a temporary admin. This account will expire in 30 minutes. 
                    Reset the user password you need to recover, then logout.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Users List */}
          <div className={theme.card}>
            <div className={`px-6 py-4 border-b ${theme.border}`}>
              <div className="flex items-center space-x-3">
                <UsersIcon className={`h-6 w-6 ${theme.accentText}`} />
                <h2 className={`text-lg font-semibold ${theme.text}`}>All Users</h2>
              </div>
            </div>

            <div className="p-6">
              {users.length === 0 ? (
                <p className={`text-center ${theme.textSecondary} py-8`}>No users found</p>
              ) : (
                <div className="space-y-3">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className={`flex items-center justify-between p-4 ${theme.bgTertiary} rounded-xl border ${theme.border}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h3 className={`font-semibold ${theme.text}`}>{user.username}</h3>
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            user.role === 'admin' || user.role === 'temp_admin'
                              ? 'bg-purple-900/30 text-purple-400 border border-purple-700/30'
                              : 'bg-blue-900/30 text-blue-400 border border-blue-700/30'
                          }`}>
                            {user.role === 'temp_admin' ? 'Temp Admin' : user.role}
                          </span>
                          {user.id === currentUser?.id && (
                            <span className="text-xs text-gray-500">(You)</span>
                          )}
                        </div>
                        {user.email && (
                          <p className={`text-sm ${theme.textSecondary} mt-1`}>{user.email}</p>
                        )}
                        {user.is_temp && (
                          <p className="text-xs text-yellow-400 mt-1">
                            Expires: {new Date(user.expires_at).toLocaleString()}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="btn-secondary flex items-center space-x-2"
                        >
                          <KeyIcon className="h-4 w-4" />
                          <span>Reset Password</span>
                        </button>
                        
                        {user.id !== currentUser?.id && (
                          <button
                            onClick={() => handleDeleteUser(user)}
                            className="p-2 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-all"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reset Password Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className={`${theme.card} rounded-2xl border ${theme.accent} max-w-md w-full p-6`}>
            <h2 className={`text-xl font-bold ${theme.text} mb-4`}>
              Reset Password for {selectedUser.username}
            </h2>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className={`block text-sm font-semibold ${theme.textSecondary} mb-2`}>
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={theme.input + " w-full px-4 py-3 rounded-xl focus:ring-2 focus:outline-none transition-all duration-200"}
                  placeholder="Enter new password"
                  autoFocus
                />
                <p className={`text-xs ${theme.textSecondary} mt-1`}>Minimum 6 characters</p>
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUser(null);
                    setNewPassword('');
                  }}
                  className="flex-1 btn-secondary py-3"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetting}
                  className="flex-1 btn-primary py-3 disabled:opacity-50"
                >
                  {resetting ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, userId: null, username: '' })}
        onConfirm={confirmDelete}
        title="Delete User"
        message={`Are you sure you want to delete user "${deleteModal.username}"?`}
        confirmText="Delete User"
        cancelText="Cancel"
        danger={true}
        warning="This action cannot be undone. The user will lose access to the system."
      />
    </>
  );
}