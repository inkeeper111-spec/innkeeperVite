import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Modal } from './Modal';
import { Button } from './Button';

export const ReservationCheckoutModal = ({
  reservation,
  onClose,
  onComplete
}) => {
  const [step, setStep] = useState('confirm');
  const [keyReturned, setKeyReturned] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (reservation) {
      setStep('confirm');
      setKeyReturned(false);
      setSubmitting(false);
      setError('');
    }
  }, [reservation?._id]);

  const close = () => {
    setStep('confirm');
    setKeyReturned(false);
    setError('');
    onClose();
  };

  const completeCheckout = async () => {
    if (!keyReturned) {
      setError('Confirm that the guest returned the room key before completing checkout.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onComplete(reservation._id, { keyReturned });
    } catch (submitError) {
      setError(submitError.message || 'Checkout could not be completed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={Boolean(reservation)}
      onClose={close}
      title={step === 'confirm' ? 'Confirm Guest Checkout' : 'Verify Room Key Return'}
      subtitle={step === 'confirm'
        ? 'Review this stay before proceeding to key submission.'
        : 'Checkout cannot be completed until the room key return is confirmed.'}
    >
      {reservation && (
        <div className="space-y-5">
          {step === 'confirm' ? (
            <>
              <dl className="grid grid-cols-1 gap-3 rounded-xl border border-orvelle-border bg-orvelle-ivory/50 p-4 text-sm sm:grid-cols-2">
                <div><dt className="text-xs text-orvelle-muted">Booking Reference</dt><dd className="mt-1 font-semibold text-orvelle-primary">{reservation.bookingReference}</dd></div>
                <div><dt className="text-xs text-orvelle-muted">Guest</dt><dd className="mt-1 font-semibold text-orvelle-primary">{reservation.guestName}</dd></div>
                <div><dt className="text-xs text-orvelle-muted">Room</dt><dd className="mt-1 font-semibold text-orvelle-primary">{reservation.rooms?.map((room) => room.roomNumber).join(', ') || 'Not assigned'}</dd></div>
                <div><dt className="text-xs text-orvelle-muted">Check-in</dt><dd className="mt-1 font-semibold text-orvelle-primary">{dayjs(reservation.checkInDate).format('MMM D, YYYY')}</dd></div>
                <div className="sm:col-span-2"><dt className="text-xs text-orvelle-muted">Scheduled Checkout</dt><dd className="mt-1 font-semibold text-orvelle-primary">{dayjs(reservation.checkOutDate).format('MMM D, YYYY')}</dd></div>
              </dl>
              <p className="text-sm text-orvelle-text">Confirm that you are starting manual checkout for this guest.</p>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={close}>Cancel</Button>
                <Button type="button" onClick={() => setStep('key')}>Confirm Checkout</Button>
              </div>
            </>
          ) : (
            <>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-orvelle-border bg-orvelle-ivory/50 p-4 text-sm text-orvelle-text">
                <input
                  type="checkbox"
                  checked={keyReturned}
                  onChange={(event) => {
                    setKeyReturned(event.target.checked);
                    setError('');
                  }}
                  className="mt-0.5 h-4 w-4 accent-amber-700"
                />
                <span>I confirm that the guest has returned the room key.</span>
              </label>
              {error && <p role="alert" className="text-sm font-medium text-rose-600">{error}</p>}
              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="outline" disabled={submitting} onClick={() => { setStep('confirm'); setError(''); }}>Back</Button>
                <Button type="button" variant="outline" disabled={submitting} onClick={close}>Cancel</Button>
                <Button type="button" loading={submitting} onClick={completeCheckout}>Complete Checkout</Button>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  );
};
