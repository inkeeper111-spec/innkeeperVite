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
  actions: ['view', 'read', 'create', 'update', 'delete'],
  roleDefaults: {
    receptionist: {
      'rooms.view': true,
      'rooms.read': true,
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

    const roomsSwitch = await screen.findByRole('switch', { name: 'Disable Rooms & Rates' });
    expect(roomsSwitch).toBeChecked();

    fireEvent.click(roomsSwitch);
    expect(roomsSwitch).not.toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Save permissions' }));

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        '/staff/user-1/permissions',
        {
          permissionOverrides: {
            'rooms.view': false,
            'rooms.read': false,
            'rooms.create': false,
            'rooms.update': false,
            'rooms.delete': false
          }
        },
        { skipSuccessToast: true }
      );
    });
  });

  it('lets an admin assign read access independently from write access', async () => {
    render(<RolesResponsibilitiesPage />);

    const accessLevel = await screen.findByRole('combobox', { name: 'Rooms & Rates access level' });
    fireEvent.change(accessLevel, { target: { value: 'read' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save permissions' }));

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        '/staff/user-1/permissions',
        {
          permissionOverrides: {
            'rooms.view': true,
            'rooms.read': true,
            'rooms.create': false,
            'rooms.update': false,
            'rooms.delete': false
          }
        },
        { skipSuccessToast: true }
      );
    });
  });
});
