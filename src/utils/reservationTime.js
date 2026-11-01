import dayjs from 'dayjs';

export const getScheduledCheckoutAt = (checkOutDate, checkOutTime = '11:00') => {
  const [hours, minutes] = String(checkOutTime).split(':').map(Number);
  return dayjs(checkOutDate)
    .hour(Number.isFinite(hours) ? hours : 11)
    .minute(Number.isFinite(minutes) ? minutes : 0)
    .second(0)
    .millisecond(0);
};

export const isReservationOverstaying = (reservation, checkOutTime, now = dayjs()) =>
  reservation.status === 'checked_in'
  && now.isAfter(getScheduledCheckoutAt(reservation.checkOutDate, checkOutTime));
