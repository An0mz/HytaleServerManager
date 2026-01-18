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
  
  // Development fallback
  return 'http://localhost:3000/api';
};

const axiosInstance = axios.create({
  baseURL: getApiUrl(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

export default axiosInstance;