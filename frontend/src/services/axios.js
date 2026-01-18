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
  // This avoids SSL/protocol issues and uses the configured proxy
  return '/api';
};

const axiosInstance = axios.create({
  baseURL: getApiUrl(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

export default axiosInstance;