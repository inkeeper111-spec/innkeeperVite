import { describe, expect, it } from 'vitest';
import { addDateDays, getHotelLocalDate, validateReservationDateRange } from '../utils/hotelDate';

describe('hotel-local reservation dates', () => {
  it('uses the hotel timezone when determining today', () => {
    const now = new Date('2026-11-02T05:30:00.000Z');
    expect(getHotelLocalDate('America/New_York', now)).toBe('2026-11-02');
    expect(getHotelLocalDate('America/Los_Angeles', now)).toBe('2026-11-01');
  });

  it('adds calendar days without depending on the browser timezone', () => {
    expect(addDateDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('validates past dates and requires checkout after check-in', () => {
    const now = new Date('2026-11-02T12:00:00.000Z');
    expect(validateReservationDateRange('2026-11-01', '2026-11-03', 'UTC', now))
      .toBe('Past dates are not allowed.');
    expect(validateReservationDateRange('2026-11-02', '2026-11-02', 'UTC', now))
      .toBe('Check-out date must be later than check-in date.');
    expect(validateReservationDateRange('2026-02-30', '2026-03-02', 'UTC', now))
      .toBe('Please select a valid reservation date.');
  });
});
