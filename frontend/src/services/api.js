import axios from 'axios';

// Determine API URL based on environment
const getApiUrl = () => {
  // If VITE_API_URL is explicitly set, use it
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // For production builds (when served from the backend), use relative URL
  if (import.meta.env.PROD) {
    return '/api';
  }
  
  // Development: use relative URL to leverage Vite proxy
  return '/api';
};

const api = axios.create({
  baseURL: getApiUrl(),
  timeout: 30000,
  withCredentials: true,
});

// Servers
export const getServers = () => api.get('/servers');
export const getServer = (id) => api.get(`/servers/${id}`);
export const createServer = (data) => api.post('/servers', data);
export const updateServer = (id, data) => api.put(`/servers/${id}`, data);
export const startServer = (id) => api.post(`/servers/${id}/start`);
export const stopServer = (id) => api.post(`/servers/${id}/stop`);
export const restartServer = (id) => api.post(`/servers/${id}/restart`);
export const deleteServer = (id) => api.delete(`/servers/${id}`);
export const sendCommand = (id, command) => api.post(`/servers/${id}/command`, { command });
export const getServerStats = (id) => api.get(`/servers/${id}/stats`);
export const getServerFiles = (id, path = '') => api.get(`/servers/${id}/files?path=${path}`);
export const readFile = (id, path) => api.get(`/servers/${id}/files/read?path=${path}`);
export const writeFile = (id, path, content) => api.post(`/servers/${id}/files/write`, { path, content });
export const deleteFile = (id, path) => api.delete(`/servers/${id}/files?path=${path}`);
export const downloadFile = (id, path) => api.get(`/servers/${id}/files/download?path=${path}`, { responseType: 'blob' });
export const listFiles = (id, path = '') => api.get(`/servers/${id}/files?path=${path}`);
export const uploadFile = (id, path, formData) => {
  return api.post(`/servers/${id}/upload?path=${encodeURIComponent(path)}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};
export const uploadFiles = (id, files) => {
  const formData = new FormData();
  files.forEach(file => formData.append('files', file));
  return api.post(`/servers/${id}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};
export const moveFile = (id, sourcePath, destinationPath) => {
  return api.post(`/servers/${id}/files/move`, { sourcePath, destinationPath });
};
export const downloadHytaleFiles = (id) => api.post(`/servers/${id}/download-hytale`);
export const setupHytaleDownloader = () => api.post('/servers/hytale/setup');
export const checkHytaleCache = () => api.get('/servers/hytale/check-cache');

// Config
export const getServerConfig = (id) => api.get(`/config/${id}`);
export const updateServerConfig = (id, config) => api.put(`/config/${id}`, config);
export const getWorldConfigs = (id) => api.get(`/config/${id}/worlds`);
export const updateWorldConfig = (id, worldName, config) => api.put(`/config/${id}/worlds/${worldName}`, config);
export const getJVMArgs = (id) => api.get(`/config/${id}/jvm`);
export const updateJVMArgs = (id, jvmArgs) => api.put(`/config/${id}/jvm`, { jvmArgs });

// Backups
export const getBackups = (id) => api.get(`/backups/${id}`);
export const createBackup = (id, name) => api.post(`/backups/${id}`, { name });
export const restoreBackup = (id, backupId) => api.post(`/backups/${id}/restore/${backupId}`);
export const deleteBackup = (id, backupId) => api.delete(`/backups/${id}/${backupId}`);
export const downloadBackup = (id, backupId) => {
  window.open(`/api/backups/${id}/download/${backupId}`, '_blank');
};
export const getBackupSchedule = (id) => api.get(`/backups/${id}/schedule`);
export const updateBackupSchedule = (id, schedule) => api.post(`/backups/${id}/schedule`, schedule);

// Auth
export const login = (username, password) => api.post('/auth/login', { username, password });
export const register = (username, password, email) => api.post('/auth/register', { username, password, email });
export const logout = () => api.post('/auth/logout');
export const getCurrentUser = () => api.get('/auth/me');
export const checkSetupNeeded = () => api.get('/auth/setup-needed');
export const changePassword = (currentPassword, newPassword) => api.put('/auth/change-password', { currentPassword, newPassword });
export const createTempAdmin = () => api.post('/auth/create-temp-admin');
export const cleanupTempAdmins = () => api.post('/auth/cleanup-temp-admins');

// Users (Admin only)
export const getUsers = () => api.get('/users');
export const resetUserPassword = (userId, newPassword) => api.put(`/users/${userId}/password`, { newPassword });
export const deleteUser = (userId) => api.delete(`/users/${userId}`);

// Notifications
export const getNotifications = (limit = 50) => api.get(`/notifications?limit=${limit}`);
export const markNotificationRead = (id) => api.post(`/notifications/${id}/read`);
export const markAllNotificationsRead = () => api.post('/notifications/read-all');
export const clearNotifications = () => api.delete('/notifications');

// Mods
export const getMods = (serverId) => api.get(`/mods/${serverId}`);
export const uploadMod = (serverId, file) => {
  const formData = new FormData();
  formData.append('mod', file);
  return api.post(`/mods/${serverId}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};
export const deleteMod = (serverId, filename) => api.delete(`/mods/${serverId}/${encodeURIComponent(filename)}`);

export default api;