import axios from 'axios';
import {
  clearStaffSession,
  getStaffAccessToken,
  getStaffRefreshToken,
  getStaffSessionId,
  updateStaffTokens
} from '../auth/staffSession';

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';
let refreshRequest = null;

const invalidateStaffSession = (sessionId, expectedRefreshToken) => {
  if (!sessionId || getStaffSessionId() !== sessionId) return;
  if (expectedRefreshToken && getStaffRefreshToken() !== expectedRefreshToken) return;
  clearStaffSession();
  window.dispatchEvent(new CustomEvent('innkeeper:staff-session-invalidated'));
};

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request Interceptor: attach JWT
api.interceptors.request.use(
  (config) => {
    const token = getStaffAccessToken();
    const requestUrl = config.url || '';
    const publicRequest = /^\/public(?:\/|$)/.test(requestUrl)
      || /\/auth\/(login|register|refresh|forgot-password|reset-password)/.test(requestUrl);
    config.headers['Cache-Control'] = 'no-store';
    if (token && !publicRequest) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    config.staffSessionId = token && !publicRequest ? getStaffSessionId() : null;
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: handle 401 & token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const requestUrl = originalRequest?.url || '';
    const skipRefresh = originalRequest?.skipStaffRefresh
      || /\/auth\/(login|register|refresh|forgot-password|reset-password)/.test(requestUrl);
    if (error.response?.status === 401 && originalRequest && !skipRefresh) {
      const requestSessionId = originalRequest.staffSessionId;
      if (!requestSessionId || getStaffSessionId() !== requestSessionId) {
        return Promise.reject(error);
      }
      if (originalRequest._retry) {
        invalidateStaffSession(requestSessionId);
        return Promise.reject(error);
      }
      originalRequest._retry = true;
      const refreshToken = getStaffRefreshToken();

      if (!refreshToken) {
        invalidateStaffSession(requestSessionId);
        return Promise.reject(error);
      }
      try {
        if (!refreshRequest || refreshRequest.token !== refreshToken) {
          const pendingRefresh = { token: refreshToken, promise: null };
          pendingRefresh.promise = axios.post(`${API_BASE}/auth/refresh`, { refreshToken })
            .then((res) => res.data.data)
            .finally(() => {
              if (refreshRequest === pendingRefresh) refreshRequest = null;
            });
          refreshRequest = pendingRefresh;
        }
        const { accessToken, refreshToken: newRefreshToken } = await refreshRequest.promise;
        if (getStaffSessionId() !== requestSessionId) return Promise.reject(error);
        if (getStaffRefreshToken() === refreshToken) {
          updateStaffTokens({ accessToken, refreshToken: newRefreshToken });
        } else if (!getStaffAccessToken()) {
          return Promise.reject(error);
        }

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        if (refreshError.response?.status === 401) {
          invalidateStaffSession(requestSessionId, refreshToken);
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
