import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [hotel, setHotel] = useState(() => {
    const saved = localStorage.getItem('hotel');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          const res = await api.get('/auth/me');
          if (res.data.success) {
            setUser(res.data.data.user);
            setHotel(res.data.data.hotel);
            localStorage.setItem('user', JSON.stringify(res.data.data.user));
            if (res.data.data.hotel) {
              localStorage.setItem('hotel', JSON.stringify(res.data.data.hotel));
            }
          }
        } catch (err) {
          console.error('Failed to restore session:', err);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.success) {
      const { user: userData, hotel: hotelData, accessToken, refreshToken } = res.data.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(userData));
      if (hotelData) {
        localStorage.setItem('hotel', JSON.stringify(hotelData));
      }
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
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        localStorage.removeItem('hotel');
        return res.data;
      }
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(userData));
      if (hotelData) {
        localStorage.setItem('hotel', JSON.stringify(hotelData));
      }
      setUser(userData);
      setHotel(hotelData);
      return res.data;
    }
    throw new Error(res.data.message || 'Registration failed');
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      await api.post('/auth/logout', { refreshToken });
    } catch (e) {
      // Ignore network error on logout
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('hotel');
      setUser(null);
      setHotel(null);
    }
  };

  const refreshUser = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data.success) {
        setUser(res.data.data.user);
        setHotel(res.data.data.hotel);
      }
    } catch (e) {
      console.error('Error refreshing user:', e);
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

