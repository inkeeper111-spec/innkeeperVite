import { describe, expect, it } from 'vitest';
import dayjs from 'dayjs';
import { getScheduledCheckoutAt, isReservationOverstaying } from '../utils/reservationTime';

describe('reservation checkout timing', () => {
  it('uses the hotel checkout time for the scheduled departure', () => {
    expect(getScheduledCheckoutAt('2026-11-01', '11:30').format('YYYY-MM-DD HH:mm'))
      .toBe('2026-11-01 11:30');
  });

  it('warns only checked-in guests after the scheduled checkout time', () => {
    const reservation = { status: 'checked_in', checkOutDate: '2026-11-01' };
    expect(isReservationOverstaying(reservation, '11:00', dayjs('2026-11-01T11:01:00'))).toBe(true);
    expect(isReservationOverstaying(reservation, '11:00', dayjs('2026-11-01T10:59:00'))).toBe(false);
    expect(isReservationOverstaying({ ...reservation, status: 'checked_out' }, '11:00', dayjs('2026-11-01T12:00:00'))).toBe(false);
    expect(isReservationOverstaying({ ...reservation, status: 'cancelled' }, '11:00', dayjs('2026-11-01T12:00:00'))).toBe(false);
  });
});
