import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import ServerDetail from './pages/ServerDetail';
import CreateServer from './pages/CreateServer';
import Login from './pages/Login';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { Toaster } from './components/ui/sonner';
import Settings from './pages/Settings';
import Users from './pages/Users';
import websocket from './services/websocket';

function App() {
  return (
    <ToastProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/server/:id" element={<ProtectedRoute><ServerDetail /></ProtectedRoute>} />
          <Route path="/create" element={<ProtectedRoute><CreateServer /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
        </Routes>
      </Router>
      <Toaster position="bottom-right" richColors />
    </ToastProvider>
  );
}

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const { theme } = useTheme();
  
  // Initialize WebSocket connection once when authenticated
  useEffect(() => {
    if (isAuthenticated && !loading) {
      websocket.connect();
    }
    
    return () => {
      // Don't disconnect on unmount, keep connection alive
    };
  }, [isAuthenticated, loading]);
  
  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme.bg}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}

export default App;