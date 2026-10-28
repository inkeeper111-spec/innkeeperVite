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

const MUTATING_METHODS = new Set(['post', 'put', 'patch', 'delete']);

const dispatchToast = (type, message, key) => {
  if (!message) return;
  window.dispatchEvent(new CustomEvent('innkeeper:toast', {
    detail: { type, message, key }
  }));
};

const operationKey = (config, status) => {
  const method = String(config?.method || 'get').toUpperCase();
  const url = config?.url || '';
  return `${status}:${method}:${url}:${config?.toastKey || ''}`;
};

const getSuccessMessage = (response) => {
  const apiMessage = response?.data?.message;
  if (typeof apiMessage === 'string' && apiMessage.trim()) return apiMessage;
  const method = String(response?.config?.method || '').toLowerCase();
  if (method === 'post') return 'Data created successfully.';
  if (method === 'delete') return 'Data deleted successfully.';
  return 'Data saved successfully.';
};

const getErrorMessage = (error) => {
  const apiMessage = error.response?.data?.message;
  if (typeof apiMessage === 'string' && apiMessage.trim()) return apiMessage;
  if (error.code === 'ERR_NETWORK' || !error.response) {
    return 'Unable to connect to the server. Please check your connection and try again.';
  }
  if (error.response.status >= 500) {
    return 'The server encountered an error. Please try again.';
  }
  return 'Something went wrong. Please try again.';
};

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
  (response) => {
    const method = String(response.config?.method || '').toLowerCase();
    if (!response.config?.skipToast) {
      if (response.data?.success === false) {
        dispatchToast('error', getErrorMessage({ response }), operationKey(response.config, response.status));
      } else if (MUTATING_METHODS.has(method)) {
        dispatchToast('success', getSuccessMessage(response), operationKey(response.config, response.status));
      }
    }
    return response;
  },
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

    if (!originalRequest?.skipToast
      && error.code !== 'ERR_CANCELED'
      && error.code !== 'ECONNABORTED') {
      dispatchToast(
        'error',
        getErrorMessage(error),
        operationKey(originalRequest, error.response?.status || error.code || 'NETWORK')
      );
    }
    return Promise.reject(error);
  }
);

export default api;
