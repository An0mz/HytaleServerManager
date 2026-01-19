import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import api from '../services/api';

const ActivityContext = createContext();

export function ActivityProvider({ children }) {
  const [activities, setActivities] = useState({});
  const [loadedServers, setLoadedServers] = useState(new Set());

  // Load activities from backend for a specific server
  const loadActivities = useCallback(async (serverId) => {
    if (loadedServers.has(serverId)) return;
    
    try {
      console.log('Loading activities for server:', serverId);
      const response = await api.get(`/activity/${serverId}?limit=100`);
      console.log('Activities loaded from backend:', response.data);
      setActivities(prev => ({
        ...prev,
        [serverId]: response.data.activities || []
      }));
      setLoadedServers(prev => new Set([...prev, serverId]));
    } catch (error) {
      console.error('Failed to load activities from backend:', error.response?.data || error.message);
      // Fallback to localStorage if backend fails
      const saved = localStorage.getItem(`serverActivities_${serverId}`);
      if (saved) {
        console.log('Loading activities from localStorage fallback');
        setActivities(prev => ({
          ...prev,
          [serverId]: JSON.parse(saved)
        }));
      }
      setLoadedServers(prev => new Set([...prev, serverId]));
    }
  }, [loadedServers]);

  const addActivity = async (serverId, activity) => {
    // Add to local state immediately
    setActivities(prev => {
      const serverActivities = prev[serverId] || [];
      const newActivities = [activity, ...serverActivities].slice(0, 100);
      
      // Also save to localStorage as backup
      localStorage.setItem(`serverActivities_${serverId}`, JSON.stringify(newActivities));
      
      return { ...prev, [serverId]: newActivities };
    });

    // Save to backend (fire and forget)
    try {
      console.log('Saving activity to backend:', serverId, activity);
      const response = await api.post(`/activity/${serverId}`, activity);
      console.log('Activity saved successfully:', response.data);
    } catch (error) {
      console.error('Failed to save activity to backend:', error.response?.data || error.message);
    }
  };

  const clearActivities = async (serverId) => {
    // Clear from local state
    setActivities(prev => {
      const newActivities = { ...prev };
      delete newActivities[serverId];
      return newActivities;
    });
    
    // Clear from localStorage
    localStorage.removeItem(`serverActivities_${serverId}`);
    
    // Clear from backend
    try {
      await api.delete(`/activity/${serverId}`);
    } catch (error) {
      console.error('Failed to clear activities from backend:', error);
    }
  };

  const getActivities = (serverId) => {
    return activities[serverId] || [];
  };

  return (
    <ActivityContext.Provider value={{ activities, addActivity, clearActivities, getActivities, loadActivities }}>
      {children}
    </ActivityContext.Provider>
  );
}

export function useActivity() {
  const context = useContext(ActivityContext);
  if (!context) {
    throw new Error('useActivity must be used within ActivityProvider');
  }
  return context;
}
