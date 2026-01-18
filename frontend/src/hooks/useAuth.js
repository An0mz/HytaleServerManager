import { useState, useEffect } from 'react';
import api from '../services/api';
import WebSocketService from '../services/websocket';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data);
      
      // If user exists (page refresh while logged in), get a fresh token for WebSocket
      try {
        const tokenResponse = await api.get('/auth/ws-token');
        WebSocketService.setAuthToken(tokenResponse.data.token);
      } catch (tokenErr) {
        console.warn('Could not get WebSocket token:', tokenErr.message);
      }
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      const response = await api.post('/auth/login', { username, password });
      setUser(response.data.user);
      
      // Extract token from response and set it in WebSocketService
      // The backend will also set it in httpOnly cookie automatically
      if (response.data.token) {
        WebSocketService.setAuthToken(response.data.token);
      } else {
        console.warn('No token in login response, WebSocket may fail to authenticate');
      }
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Login failed. Please try again.'
      };
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    }
    setUser(null);
    WebSocketService.setAuthToken(null);
  };

  return {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    checkAuth,
    // Expose setUser so screens like Login can clear user during first-time setup
    setUser
  };
}