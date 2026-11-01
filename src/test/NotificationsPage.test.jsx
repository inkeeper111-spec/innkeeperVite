import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationsPage } from '../pages/notifications/NotificationsPage';
import { Header } from '../components/layout/Header';
import api from '../api/axios';
import { useNotifications } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';

const { navigate, markAsRead, markAllAsRead, fetchNotifications } = vi.hoisted(() => ({
  navigate: vi.fn(),
  markAsRead: vi.fn(),
  markAllAsRead: vi.fn(),
  fetchNotifications: vi.fn()
}));

vi.mock('../api/axios', () => ({ default: { get: vi.fn() } }));
vi.mock('../contexts/NotificationContext', () => ({
  useNotifications: vi.fn()
}));
vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }));

class MockIntersectionObserver {
  static instances = [];

  constructor(callback) {
    this.callback = callback;
    MockIntersectionObserver.instances.push(this);
  }

  observe() {}
  disconnect() {}

  show() {
    this.callback([{ isIntersecting: true, intersectionRatio: 1 }]);
  }
}

describe('NotificationsPage', () => {
  beforeEach(() => {
    MockIntersectionObserver.instances = [];
    window.IntersectionObserver = MockIntersectionObserver;
    markAsRead.mockReset();
    markAsRead.mockResolvedValue(undefined);
    markAllAsRead.mockReset();
    fetchNotifications.mockReset();
    navigate.mockReset();
    useNotifications.mockReturnValue({
      unreadCount: 1,
      markAsRead,
      markAllAsRead,
      fetchNotifications
    });
    api.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          notifications: [{
            _id: 'notification-1',
            title: 'New reservation',
            message: 'A new reservation needs review.',
            module: 'reservations',
            priority: 'medium',
            isRead: false,
            createdAt: '2026-11-01T10:00:00.000Z',
            link: '/reservations'
          }],
          pagination: { page: 1, pages: 1, total: 1 }
        }
      }
    });
  });

  afterEach(() => {
    delete window.IntersectionObserver;
  });

  it('marks an unread notification as read when it becomes visible', async () => {
    render(<NotificationsPage />);

    await screen.findByText('New reservation');
    expect(markAsRead).not.toHaveBeenCalled();

    MockIntersectionObserver.instances[0].show();
    await waitFor(() => expect(markAsRead).toHaveBeenCalledWith('notification-1'));
    expect(screen.queryByRole('button', { name: /mark read/i })).not.toBeInTheDocument();
  });

  it('still opens the linked page when a notification is clicked', async () => {
    render(<NotificationsPage />);
    fireEvent.click(await screen.findByRole('button', { name: /new reservation/i }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/reservations'));
  });

  it('marks a header dropdown notification as read when it becomes visible', async () => {
    const notification = {
      _id: 'header-notification-1',
      title: 'New reservation',
      message: 'A new reservation needs review.',
      module: 'reservations',
      priority: 'medium',
      isRead: false,
      createdAt: '2026-11-01T10:00:00.000Z',
      link: '/reservations'
    };
    useAuth.mockReturnValue({ user: {}, hotel: null, logout: vi.fn() });
    useNotifications.mockReturnValue({
      notifications: [notification],
      unreadCount: 1,
      markAsRead,
      markAllAsRead
    });

    render(<Header isCollapsed={false} setIsCollapsed={vi.fn()} setIsMobileOpen={vi.fn()} />);
    fireEvent.click(screen.getByTitle('Notifications'));
    await screen.findByText('New reservation');
    expect(markAsRead).not.toHaveBeenCalled();

    MockIntersectionObserver.instances[0].show();
    await waitFor(() => expect(markAsRead).toHaveBeenCalledWith('header-notification-1'));
  });
});
