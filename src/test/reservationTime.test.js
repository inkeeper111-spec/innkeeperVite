import { describe, expect, it } from 'vitest';
import dayjs from 'dayjs';
import {
  formatHotelDateTime,
  getExpectedCheckInAt,
  getExpectedCheckOutAt,
  getScheduledCheckoutAt,
  isReservationOverstaying
} from '../utils/reservationTime';

describe('reservation checkout timing', () => {
  it('uses the hotel checkout time for the scheduled departure', () => {
    expect(getScheduledCheckoutAt('2026-11-01', '11:30', 'America/New_York').toISOString())
      .toBe('2026-11-01T16:30:00.000Z');
  });

  it('warns only checked-in guests after the scheduled checkout time', () => {
    const reservation = { status: 'checked_in', checkOutDate: '2026-11-01' };
    expect(isReservationOverstaying(
      reservation,
      '11:00',
      dayjs('2026-11-01T16:01:00.000Z'),
      'America/New_York'
    )).toBe(true);
    expect(isReservationOverstaying(
      reservation,
      '11:00',
      dayjs('2026-11-01T15:59:00.000Z'),
      'America/New_York'
    )).toBe(false);
    expect(isReservationOverstaying(
      { ...reservation, status: 'checked_out' },
      '11:00',
      dayjs('2026-11-01T17:00:00.000Z'),
      'America/New_York'
    )).toBe(false);
    expect(isReservationOverstaying(
      { ...reservation, status: 'cancelled' },
      '11:00',
      dayjs('2026-11-01T17:00:00.000Z'),
      'America/New_York'
    )).toBe(false);
  });

  it('uses the saved expected checkout timestamp instead of current hotel settings', () => {
    const reservation = {
      status: 'checked_in',
      checkOutDate: '2026-11-01',
      expectedCheckOutAt: '2026-11-01T16:00:00.000Z'
    };
    expect(isReservationOverstaying(
      reservation,
      '09:00',
      dayjs('2026-11-01T16:01:00.000Z'),
      'America/New_York'
    )).toBe(true);
    expect(formatHotelDateTime(
      reservation.expectedCheckOutAt,
      'America/New_York'
    )).toContain('11:00 AM');
  });

  it('combines legacy reservation dates with hotel-local configured times', () => {
    const reservation = { checkInDate: '2026-11-02T00:00:00.000Z', checkOutDate: '2026-11-03T00:00:00.000Z' };
    const hotel = { timezone: 'America/New_York', checkInTime: '12:00', checkOutTime: '11:00' };
    expect(getExpectedCheckInAt(reservation, hotel)).toBe('2026-11-02T17:00:00.000Z');
    expect(getExpectedCheckOutAt(reservation, hotel)).toBe('2026-11-03T16:00:00.000Z');
  });

  it('does not invent a scheduled time during a daylight-saving gap', () => {
    const reservation = { status: 'checked_in', checkOutDate: '2026-03-08' };
    expect(isReservationOverstaying(
      reservation,
      '02:30',
      dayjs('2026-03-08T08:00:00.000Z'),
      'America/New_York'
    )).toBe(false);
  });
});
