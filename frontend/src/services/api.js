import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
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
  return api.post(`/servers/${id}/upload`, formData, {
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

// Auth
export const login = (username, password) => api.post('/auth/login', { username, password });
export const register = (username, password, email) => api.post('/auth/register', { username, password, email });
export const logout = () => api.post('/auth/logout');
export const getCurrentUser = () => api.get('/auth/me');
export const checkSetupNeeded = () => api.get('/auth/setup-needed');

export default api;