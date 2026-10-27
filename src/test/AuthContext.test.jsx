import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

const { mockGet, mockPost } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn()
}));

vi.mock('../api/axios', () => ({
  default: { get: mockGet, post: mockPost }
}));

import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { STAFF_SESSION_KEYS } from '../auth/staffSession';

const staffUser = {
  id: 'staff-1',
  name: 'Staff User',
  email: 'staff@example.com',
  role: 'receptionist'
};

const guestUser = {
  id: 'guest-1',
  name: 'Guest User',
  email: 'guest@example.com',
  role: 'guest'
};

const AuthProbe = () => {
  const { user, loading, logout } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="identity">{user?.email || 'signed-out'}</span>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

const renderAuth = () => render(
  <AuthProvider>
    <AuthProbe />
  </AuthProvider>
);

beforeEach(() => {
  localStorage.clear();
  mockGet.mockReset();
  mockPost.mockReset();
});

describe('staff authentication session isolation', () => {
  it('restores identity from the verified staff token, not cached user data', async () => {
    localStorage.setItem(STAFF_SESSION_KEYS.accessToken, 'staff-token');
    localStorage.setItem('user', JSON.stringify(guestUser));
    localStorage.setItem('innkeeper.guest.accessToken', 'guest-token');
    mockGet.mockResolvedValue({
      data: { success: true, data: { user: staffUser, hotel: { name: 'Hotel' } } }
    });

    renderAuth();

    expect(await screen.findByText('staff@example.com')).toBeInTheDocument();
    expect(localStorage.getItem('user')).toContain('guest@example.com');
    expect(localStorage.getItem('innkeeper.guest.accessToken')).toBe('guest-token');
  });

  it('rejects a guest identity from the staff session and clears only staff keys', async () => {
    localStorage.setItem(STAFF_SESSION_KEYS.accessToken, 'guest-token');
    localStorage.setItem(STAFF_SESSION_KEYS.refreshToken, 'guest-refresh');
    localStorage.setItem('innkeeper.guest.accessToken', 'guest-token');
    mockGet.mockResolvedValue({
      data: { success: true, data: { user: guestUser, hotel: null } }
    });

    renderAuth();

    expect(await screen.findByText('signed-out')).toBeInTheDocument();
    expect(localStorage.getItem(STAFF_SESSION_KEYS.accessToken)).toBeNull();
    expect(localStorage.getItem(STAFF_SESSION_KEYS.refreshToken)).toBeNull();
    expect(localStorage.getItem('innkeeper.guest.accessToken')).toBe('guest-token');
  });

  it('migrates a verified legacy staff session using its matching refresh token', async () => {
    localStorage.setItem('accessToken', 'legacy-staff-access');
    localStorage.setItem('refreshToken', 'legacy-staff-refresh');
    mockGet.mockResolvedValue({
      data: { success: true, data: { user: staffUser, hotel: null } }
    });
    mockPost.mockResolvedValue({
      data: { data: { accessToken: 'migrated-access', refreshToken: 'migrated-refresh' } }
    });

    renderAuth();

    expect(await screen.findByText('staff@example.com')).toBeInTheDocument();
    expect(localStorage.getItem(STAFF_SESSION_KEYS.accessToken)).toBe('migrated-access');
    expect(localStorage.getItem(STAFF_SESSION_KEYS.refreshToken)).toBe('migrated-refresh');
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
    expect(mockPost).toHaveBeenCalledWith('/auth/refresh', {
      refreshToken: 'legacy-staff-refresh',
      expectedUserId: staffUser.id
    });
  });

  it('does not migrate a legacy refresh token that belongs to another account', async () => {
    localStorage.setItem('accessToken', 'legacy-staff-access');
    localStorage.setItem('refreshToken', 'legacy-guest-refresh');
    mockGet.mockResolvedValue({
      data: { success: true, data: { user: staffUser, hotel: null } }
    });
    mockPost.mockRejectedValue({ response: { status: 401 } });

    renderAuth();

    expect(await screen.findByText('signed-out')).toBeInTheDocument();
    expect(localStorage.getItem(STAFF_SESSION_KEYS.accessToken)).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBe('legacy-guest-refresh');
  });

  it('logs out of the staff portal without clearing guest or legacy portal data', async () => {
    localStorage.setItem(STAFF_SESSION_KEYS.accessToken, 'staff-token');
    localStorage.setItem(STAFF_SESSION_KEYS.refreshToken, 'staff-refresh');
    localStorage.setItem('innkeeper.guest.accessToken', 'guest-token');
    localStorage.setItem('accessToken', 'legacy-guest-token');
    mockGet.mockResolvedValue({
      data: { success: true, data: { user: staffUser, hotel: null } }
    });
    mockPost.mockResolvedValue({ data: { success: true } });

    renderAuth();
    expect(await screen.findByText('staff@example.com')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Logout' }));

    await waitFor(() => {
      expect(screen.getByText('signed-out')).toBeInTheDocument();
      expect(localStorage.getItem(STAFF_SESSION_KEYS.accessToken)).toBeNull();
    });
    expect(localStorage.getItem('innkeeper.guest.accessToken')).toBe('guest-token');
    expect(localStorage.getItem('accessToken')).toBe('legacy-guest-token');
  });

  it('updates the displayed identity after another tab changes the staff token', async () => {
    localStorage.setItem(STAFF_SESSION_KEYS.sessionId, 'session-1');
    localStorage.setItem(STAFF_SESSION_KEYS.accessToken, 'first-token');
    mockGet
      .mockResolvedValueOnce({
        data: { success: true, data: { user: staffUser, hotel: null } }
      })
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: { user: { ...staffUser, id: 'staff-2', email: 'other@example.com' }, hotel: null }
        }
      });

    renderAuth();
    expect(await screen.findByText('staff@example.com')).toBeInTheDocument();

    await act(async () => {
      localStorage.setItem(STAFF_SESSION_KEYS.sessionId, 'session-2');
      localStorage.setItem(STAFF_SESSION_KEYS.accessToken, 'second-token');
      window.dispatchEvent(new StorageEvent('storage', {
        key: STAFF_SESSION_KEYS.accessToken,
        newValue: 'second-token'
      }));
    });

    expect(await screen.findByText('other@example.com')).toBeInTheDocument();
  });

  it('clears an invalid staff token after the backend rejects it', async () => {
    localStorage.setItem(STAFF_SESSION_KEYS.sessionId, 'invalid-session');
    localStorage.setItem(STAFF_SESSION_KEYS.accessToken, 'invalid-token');
    mockGet.mockRejectedValue({ response: { status: 401 } });

    renderAuth();

    expect(await screen.findByText('signed-out')).toBeInTheDocument();
    expect(localStorage.getItem(STAFF_SESSION_KEYS.accessToken)).toBeNull();
  });

  it('does not erase a valid session after a temporary backend error', async () => {
    localStorage.setItem(STAFF_SESSION_KEYS.sessionId, 'temporary-session');
    localStorage.setItem(STAFF_SESSION_KEYS.accessToken, 'staff-token');
    localStorage.setItem(STAFF_SESSION_KEYS.refreshToken, 'staff-refresh');
    mockGet.mockRejectedValue({ response: { status: 503 } });

    renderAuth();

    expect(await screen.findByText('signed-out')).toBeInTheDocument();
    expect(localStorage.getItem(STAFF_SESSION_KEYS.accessToken)).toBe('staff-token');
    expect(localStorage.getItem(STAFF_SESSION_KEYS.refreshToken)).toBe('staff-refresh');
  });
});
