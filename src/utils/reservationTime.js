import dayjs from 'dayjs';
import { getHotelLocalDate } from './hotelDate';

export const formatHotelDateTime = (date, timeZone = 'UTC') => {
  if (!date) return 'Not recorded';
  const parsedDate = new Date(date);
  if (!Number.isFinite(parsedDate.getTime())) return 'Not recorded';
  return new Intl.DateTimeFormat(undefined, {
    timeZone: timeZone || 'UTC',
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(parsedDate);
};

export const formatHotelTime = (time) => {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time || '')) return 'Not configured';
  const [hours, minutes] = time.split(':').map(Number);
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(2000, 0, 1, hours, minutes));
};

const combineHotelDateTime = (date, time, timeZone = 'UTC') => {
  const dateOnly = String(date || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time || '')) return null;
  const [year, month, day] = dateOnly.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  const targetUtc = Date.UTC(year, month - 1, day, hours, minutes);
  let timestamp = targetUtc;
  for (let iteration = 0; iteration < 3; iteration += 1) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timeZone || 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    }).formatToParts(new Date(timestamp));
    const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    timestamp += targetUtc - Date.UTC(
      Number(values.year),
      Number(values.month) - 1,
      Number(values.day),
      Number(values.hour),
      Number(values.minute)
    );
  }
  const resolved = new Date(timestamp);
  const resolvedParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timeZone || 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(resolved);
  const resolvedValues = Object.fromEntries(resolvedParts.map(({ type, value }) => [type, value]));
  if (
    Number(resolvedValues.year) !== year
    || Number(resolvedValues.month) !== month
    || Number(resolvedValues.day) !== day
    || Number(resolvedValues.hour) !== hours
    || Number(resolvedValues.minute) !== minutes
  ) return null;
  return resolved.toISOString();
};

export const getExpectedCheckInAt = (reservation, hotel) => reservation.expectedCheckInAt
  || combineHotelDateTime(
    reservation.checkInDate,
    reservation.expectedCheckInTime || hotel?.checkInTime || '12:00',
    hotel?.timezone
  );

export const getExpectedCheckOutAt = (reservation, hotel) => reservation.expectedCheckOutAt
  || combineHotelDateTime(
    reservation.checkOutDate,
    reservation.expectedCheckOutTime || hotel?.checkOutTime || '11:00',
    hotel?.timezone
  );

export const getScheduledCheckoutAt = (checkOutDate, checkOutTime = '11:00', timeZone = 'UTC') =>
  dayjs(combineHotelDateTime(checkOutDate, checkOutTime, timeZone));

export const isReservationOverstaying = (reservation, checkOutTime, now = dayjs(), timeZone = 'UTC') => {
  const scheduledCheckout = reservation.expectedCheckOutAt
    ? dayjs(reservation.expectedCheckOutAt)
    : reservation.expectedCheckOutTime
      ? dayjs(combineHotelDateTime(reservation.checkOutDate, reservation.expectedCheckOutTime, timeZone))
      : getScheduledCheckoutAt(reservation.checkOutDate, checkOutTime || '11:00', timeZone);
  return reservation.status === 'checked_in' && scheduledCheckout.isValid() && now.isAfter(scheduledCheckout);
};

export const getHotelToday = (timeZone = 'UTC', now = new Date()) => getHotelLocalDate(timeZone, now);
