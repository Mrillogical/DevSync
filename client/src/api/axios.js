import axios from 'axios';

export const STORAGE_KEY = 'devsync_token';

/** @type {import('axios').AxiosInstance} */
export const api = axios.create({
  baseURL: 'https://devsync-production-21a0.up.railway.app/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem(STORAGE_KEY);
  
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  
    return config;
  });
