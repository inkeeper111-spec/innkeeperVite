import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import {
  clearStaffSession,
  getStaffAccessToken,
  getStaffRefreshToken,
  getStaffSessionId,
  isStaffRole,
  setStaffSession,
  STAFF_SESSION_KEYS
} from '../auth/staffSession';

const AuthContext = createContext(null);
let legacyMigrationRefreshRequest = null;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [hotel, setHotel] = useState(null);
  const [loading, setLoading] = useState(true);
  const staffSessionIdRef = useRef(getStaffSessionId());

  useEffect(() => {
    let active = true;
    let validationId = 0;
    const restoreSession = async (token, allowLegacy = false) => {
      const currentValidation = ++validationId;
      let verifiedLegacyStaffToken = false;
      if (!token) {
        setUser(null);
        setHotel(null);
        setLoading(false);
        return;
      }

      try {
        const res = await api.get('/auth/me', allowLegacy
          ? {
            headers: { Authorization: ['Bearer', token].join(' ') },
            skipStaffRefresh: true
          }
          : undefined);
        if (!active || validationId !== currentValidation) return;
        const userData = res.data.data.user;
        if (!isStaffRole(userData.role)) {
          if (!allowLegacy) {
            clearStaffSession();
            staffSessionIdRef.current = null;
          }
          setUser(null);
          setHotel(null);
          return;
        }
        verifiedLegacyStaffToken = allowLegacy;
        if (allowLegacy && getStaffAccessToken()) return;
        if (allowLegacy && !getStaffAccessToken()) {
          const legacyRefreshToken = localStorage.getItem('refreshToken');
          let sessionTokens = { accessToken: token, refreshToken: '' };
          if (legacyRefreshToken) {
            if (!legacyMigrationRefreshRequest) {
              legacyMigrationRefreshRequest = api.post('/auth/refresh', {
                refreshToken: legacyRefreshToken,
                expectedUserId: userData.id
              })
                .then((refreshResponse) => refreshResponse.data.data)
                .finally(() => {
                  legacyMigrationRefreshRequest = null;
                });
            }
            sessionTokens = await legacyMigrationRefreshRequest;
          }
          if (!active || validationId !== currentValidation) return;
          setStaffSession(sessionTokens);
          staffSessionIdRef.current = getStaffSessionId();
          if (localStorage.getItem('accessToken') === token) {
            localStorage.removeItem('accessToken');
          }
          if (legacyRefreshToken && localStorage.getItem('refreshToken') === legacyRefreshToken) {
            localStorage.removeItem('refreshToken');
          }
        }
        if (!active || validationId !== currentValidation) return;
        setUser(userData);
        setHotel(res.data.data.hotel);
      } catch (error) {
        if (!active || validationId !== currentValidation) return;
        if (!allowLegacy && [401, 403].includes(error.response?.status)) {
          clearStaffSession();
          staffSessionIdRef.current = null;
        }
        if (allowLegacy && verifiedLegacyStaffToken && error.response?.status === 401
          && localStorage.getItem('accessToken') === token) {
          localStorage.removeItem('accessToken');
        }
        if (![401, 403].includes(error.response?.status)) {
          console.error('Failed to restore staff session:', error);
        }
        setUser(null);
        setHotel(null);
      } finally {
        if (active && validationId === currentValidation) setLoading(false);
      }
    };

    const staffToken = getStaffAccessToken();
    if (staffToken) {
      restoreSession(staffToken);
    } else {
      const legacyToken = localStorage.getItem('accessToken');
      restoreSession(legacyToken, Boolean(legacyToken));
    }

    const syncStaffSession = () => {
      const nextSessionId = getStaffSessionId();
      if (nextSessionId === staffSessionIdRef.current) return;
      staffSessionIdRef.current = nextSessionId;
      setUser(null);
      setHotel(null);
      const token = getStaffAccessToken();
      setLoading(Boolean(token));
      restoreSession(token);
    };
    const handleStorageChange = (event) => {
      if (event.key === STAFF_SESSION_KEYS.accessToken) syncStaffSession();
    };
    const handleInvalidated = () => {
      staffSessionIdRef.current = null;
      setUser(null);
      setHotel(null);
      setLoading(false);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('pageshow', syncStaffSession);
    window.addEventListener('innkeeper:staff-session-invalidated', handleInvalidated);
    return () => {
      active = false;
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('pageshow', syncStaffSession);
      window.removeEventListener('innkeeper:staff-session-invalidated', handleInvalidated);
    };
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password, portal: 'staff' });
    if (res.data.success) {
      const { user: userData, hotel: hotelData, accessToken, refreshToken } = res.data.data;
      if (!isStaffRole(userData.role)) throw new Error('This account cannot access the staff portal.');
      staffSessionIdRef.current = setStaffSession({ accessToken, refreshToken });
      setUser(userData);
      setHotel(hotelData);
      return res.data;
    }
    throw new Error(res.data.message || 'Login failed');
  };

  const register = async (formData) => {
    const res = await api.post('/auth/register', formData);
    if (res.data.success) {
      const { user: userData, hotel: hotelData, accessToken, refreshToken } = res.data.data;
      if (res.data.data.approval?.required) {
        setUser(null);
        setHotel(null);
        clearStaffSession();
        staffSessionIdRef.current = null;
        return res.data;
      }
      staffSessionIdRef.current = setStaffSession({ accessToken, refreshToken });
      setUser(userData);
      setHotel(hotelData);
      return res.data;
    }
    throw new Error(res.data.message || 'Registration failed');
  };

  const logout = async () => {
    try {
      const refreshToken = getStaffRefreshToken();
      await api.post('/auth/logout', { refreshToken });
    } catch (e) {
      console.error('Failed to revoke staff session on the server:', e);
    } finally {
      clearStaffSession();
      staffSessionIdRef.current = null;
      setUser(null);
      setHotel(null);
    }
  };

  const refreshUser = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data.success) {
        if (!isStaffRole(res.data.data.user.role)) {
          clearStaffSession();
          staffSessionIdRef.current = null;
          setUser(null);
          setHotel(null);
          return;
        }
        setUser(res.data.data.user);
        setHotel(res.data.data.hotel);
      }
    } catch (e) {
      console.error('Error refreshing user:', e);
      if (e.response?.status === 401) {
        clearStaffSession();
        staffSessionIdRef.current = null;
        setUser(null);
        setHotel(null);
      }
    }
  };

  const hasRole = (...roles) => {
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        hotel,
        loading,
        login,
        register,
        logout,
        refreshUser,
        hasRole,
        isAuthenticated: Boolean(user)
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
