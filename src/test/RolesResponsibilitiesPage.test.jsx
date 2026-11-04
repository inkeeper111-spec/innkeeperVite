import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api/axios';
import { RolesResponsibilitiesPage } from '../pages/staff/RolesResponsibilitiesPage';

vi.mock('../api/axios', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn()
  }
}));

vi.mock('../contexts/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() })
}));

const permissionData = {
  users: [{
    id: 'user-1',
    name: 'Taylor Reed',
    email: 'taylor@example.com',
    role: 'receptionist',
    isActive: true,
    permissionOverrides: {}
  }],
  modules: [{ key: 'rooms', label: 'Rooms & Rates' }],
  actions: ['view', 'create', 'update', 'delete'],
  roleDefaults: {
    receptionist: {
      'rooms.view': true,
      'rooms.create': false,
      'rooms.update': false,
      'rooms.delete': false
    }
  }
};

describe('RolesResponsibilitiesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: { data: permissionData } });
    api.put.mockResolvedValue({
      data: { data: { permissionOverrides: { 'rooms.view': false } } }
    });
  });

  it('shows role defaults and saves a per-user override', async () => {
    render(<RolesResponsibilitiesPage />);

    const viewRooms = await screen.findByRole('checkbox', { name: 'View Rooms & Rates' });
    expect(viewRooms).toBeChecked();

    fireEvent.click(viewRooms);
    expect(viewRooms).not.toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Save permissions' }));

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        '/staff/user-1/permissions',
        { permissionOverrides: { 'rooms.view': false } },
        { skipSuccessToast: true }
      );
    });
  });
});
