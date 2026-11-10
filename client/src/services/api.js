import axios from 'axios';

export const TOKEN_KEY = 'parkease_token';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const onLogin = window.location.pathname.startsWith('/login');
    if (err.response?.status === 401 && !onLogin) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const errMsg = (err, fallback = 'Something went wrong. Please try again.') =>
  err?.response?.data?.message || (err?.code === 'ERR_NETWORK' ? 'Cannot reach the server. Is the backend running?' : fallback);

export default api;
