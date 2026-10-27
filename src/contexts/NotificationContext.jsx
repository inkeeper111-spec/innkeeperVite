import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../api/axios';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const requestGeneration = useRef(0);
  const userId = user?.id || user?._id;

  const fetchNotifications = useCallback(async () => {
    const generation = ++requestGeneration.current;
    if (!userId) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    try {
      const res = await api.get('/notifications?limit=20');
      if (res.data.success && requestGeneration.current === generation) {
        setNotifications(res.data.data.notifications);
        setUnreadCount(res.data.data.unreadCount);
      }
    } catch (e) {
      console.error('Failed to refresh notifications:', e);
    }
  }, [userId]);

  useEffect(() => {
    requestGeneration.current += 1;
    setNotifications([]);
    setUnreadCount(0);
    fetchNotifications();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') fetchNotifications();
    }, 10000);
    return () => {
      requestGeneration.current += 1;
      clearInterval(interval);
    };
  }, [fetchNotifications]);

  const markAsRead = async (id) => {
    const generation = requestGeneration.current;
    try {
      await api.patch(`/notifications/${id}/read`);
      if (requestGeneration.current !== generation) return;
      const wasUnread = notifications.some((notification) => notification._id === id && !notification.isRead);
      setNotifications((previous) => previous.map((notification) => (
        notification._id === id ? { ...notification, isRead: true, readAt: new Date().toISOString() } : notification
      )));
      if (wasUnread) setUnreadCount((previous) => Math.max(0, previous - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  };

  const markAllAsRead = async () => {
    const generation = requestGeneration.current;
    try {
      await api.patch('/notifications/read-all');
      if (requestGeneration.current !== generation) return;
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() })));
      setUnreadCount(0);
    } catch (e) {
      console.error('Error marking notifications as read:', e);
      throw e;
    }
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
