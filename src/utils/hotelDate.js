const pad = (value) => String(value).padStart(2, '0');

export const getHotelLocalDate = (timeZone = 'UTC', now = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timeZone || 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(now);
  const dateParts = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
};

export const addDateDays = (dateString, days) => {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
};

export const validateReservationDateRange = (checkInDate, checkOutDate, timeZone = 'UTC', now = new Date()) => {
  const isValidDate = (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year
      && date.getUTCMonth() === month - 1
      && date.getUTCDate() === day;
  };

  if (!isValidDate(checkInDate) || !isValidDate(checkOutDate)) {
    return 'Please select a valid reservation date.';
  }
  if (checkInDate < getHotelLocalDate(timeZone, now) || checkOutDate < getHotelLocalDate(timeZone, now)) {
    return 'Past dates are not allowed.';
  }
  if (checkOutDate <= checkInDate) {
    return 'Check-out date must be later than check-in date.';
  }
  return '';
};
