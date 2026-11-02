import { afterEach, describe, expect, it } from 'vitest';
import api from '../api/axios';

describe('API success toast controls', () => {
  const originalAdapter = api.defaults.adapter;

  afterEach(() => {
    api.defaults.adapter = originalAdapter;
  });

  it('suppresses success toasts only when explicitly requested', async () => {
    api.defaults.adapter = async (config) => ({
      data: { success: true },
      status: 200,
      statusText: 'OK',
      headers: {},
      config
    });
    const toasts = [];
    const listener = (event) => toasts.push(event.detail);
    window.addEventListener('innkeeper:toast', listener);

    try {
      await api.patch('/notifications/notification-1/read', {}, { skipSuccessToast: true });
      expect(toasts).toHaveLength(0);

      await api.patch('/other-resource', {});
      expect(toasts).toHaveLength(1);
      expect(toasts[0]).toMatchObject({ type: 'success', message: 'Data saved successfully.' });
    } finally {
      window.removeEventListener('innkeeper:toast', listener);
    }
  });
});
