import React, { useState, useEffect, useRef } from 'react';
import api from '../../api/axios';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { PhoneInput } from '../../components/ui/PhoneInput';
import { Select } from '../../components/ui/Select';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ReservationCheckoutModal } from '../../components/ui/ReservationCheckoutModal';
import { useAuth } from '../../contexts/AuthContext';
import { useCurrency } from '../../hooks/useCurrency';
import { getScheduledCheckoutAt, isReservationOverstaying } from '../../utils/reservationTime';
import {
  CalendarDays,
  PlusCircle,
  Search,
  CheckCircle2,
  LogOut,
  AlertTriangle,
  XCircle,
  Eye,
  FileText,
  Check
} from 'lucide-react';
import dayjs from 'dayjs';

const createInitialBookingForm = () => ({
  guestName: '',
  guestEmail: '',
  guestPhone: '',
  checkInDate: dayjs().format('YYYY-MM-DD'),
  checkOutDate: dayjs().add(2, 'day').format('YYYY-MM-DD'),
  roomId: '',
  roomTypeId: '',
  adultsCount: 2,
  childrenCount: 0,
  specialRequests: ''
});

export const ReservationsPage = () => {
  const { user, hotel } = useAuth();
  const { formatCurrency } = useCurrency();
  const canReviewRequests = ['hotel_admin', 'receptionist'].includes(user?.role);
  const canCheckout = ['hotel_admin', 'receptionist'].includes(user?.role);
  const [reservations, setReservations] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 0, limit: 20 });
  const reservationRequestVersion = useRef(0);
  const [reservationRequests, setReservationRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [processingRequestId, setProcessingRequestId] = useState('');
  const [rejectingBooking, setRejectingBooking] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(() => dayjs());
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  // Modals
  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [cancellationBooking, setCancellationBooking] = useState(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [cancellationError, setCancellationError] = useState('');
  const [returnToDetailsAfterCancellation, setReturnToDetailsAfterCancellation] = useState(false);
  const [cancellingReservation, setCancellingReservation] = useState(false);
  const [checkoutBooking, setCheckoutBooking] = useState(null);
  const [availabilityRefreshToken, setAvailabilityRefreshToken] = useState(0);

  // New Booking Form
  const [bookingForm, setBookingForm] = useState(createInitialBookingForm);

  const [availableRooms, setAvailableRooms] = useState([]);
  const [searchingRooms, setSearchingRooms] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const closeNewReservationModal = () => {
    setBookingForm(createInitialBookingForm());
    setAvailableRooms([]);
    setError('');
    setIsNewBookingOpen(false);
  };

  const fetchReservations = async (requestedPage = page, requestedStatus = statusFilter, requestedSearch = debouncedSearch) => {
    const requestVersion = ++reservationRequestVersion.current;
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(requestedPage),
        limit: String(pagination.limit),
        status: requestedStatus,
        search: requestedSearch
      });
      const res = await api.get(`/reservations?${params}`);
      if (res.data.success && requestVersion === reservationRequestVersion.current) {
        setReservations(res.data.data.reservations);
        setPagination(res.data.data.pagination);
      }
    } catch (err) {
      if (requestVersion === reservationRequestVersion.current) {
        console.error('Error fetching reservations:', err);
      }
    } finally {
      if (requestVersion === reservationRequestVersion.current) setLoading(false);
    }
  };

  const fetchReservationRequests = async () => {
    if (!canReviewRequests) return;
    try {
      setLoadingRequests(true);
      setRequestError('');
      const res = await api.get('/reservations/requests');
      if (res.data.success) {
        setReservationRequests(res.data.data.reservations);
      }
    } catch (err) {
      setRequestError(err.response?.data?.message || 'Unable to retrieve reservation requests.');
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchReservations(page, statusFilter, debouncedSearch);
  }, [page, statusFilter, debouncedSearch]);

  useEffect(() => {
    fetchReservationRequests();
  }, [canReviewRequests]);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(dayjs()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const handleCheckout = async (reservationId, checkoutConfirmation) => {
    const booking = checkoutBooking;
    const response = await api.post(`/reservations/${reservationId}/check-out`, checkoutConfirmation);
    setCheckoutBooking(null);
    setAvailabilityRefreshToken((current) => current + 1);
    setMessage(response.data.message || 'Guest checked out successfully. Room cleaning tasks have been added to housekeeping.');
    const availabilityRefresh = booking
      ? api.get(`/rooms/availability?checkInDate=${dayjs(booking.checkInDate).format('YYYY-MM-DD')}&checkOutDate=${dayjs(booking.checkOutDate).format('YYYY-MM-DD')}`)
      : Promise.resolve();
    const results = await Promise.allSettled([fetchReservations(), availabilityRefresh]);
    if (results[1].status === 'rejected') {
      setMessage('Checkout completed, but room availability could not be refreshed. Reload the page to see the latest availability.');
    }
    window.setTimeout(() => setMessage(''), 4000);
  };

  const handleApproveRequest = async (id) => {
    setProcessingRequestId(id);
    setRequestError('');
    try {
      const res = await api.post(`/reservations/${id}/approve`);
      setMessage(res.data.message || 'Reservation approved successfully.');
      await Promise.all([fetchReservationRequests(), fetchReservations()]);
      setTimeout(() => setMessage(''), 4000);
    } catch (err) {
      setRequestError(err.response?.data?.message || 'Failed to approve reservation.');
    } finally {
      setProcessingRequestId('');
    }
  };

  const handleRejectRequest = async (e) => {
    e.preventDefault();
    if (!rejectingBooking || !rejectionReason.trim()) return;

    setProcessingRequestId(rejectingBooking._id);
    setRequestError('');
    try {
      const res = await api.post(`/reservations/${rejectingBooking._id}/reject`, {
        reason: rejectionReason.trim()
      });
      setRejectingBooking(null);
      setRejectionReason('');
      setMessage(res.data.message || 'Reservation rejected successfully.');
      await Promise.all([fetchReservationRequests(), fetchReservations()]);
      setTimeout(() => setMessage(''), 4000);
    } catch (err) {
      setRequestError(err.response?.data?.message || 'Failed to reject reservation.');
    } finally {
      setProcessingRequestId('');
    }
  };

  // Check availability when dates change in modal
  useEffect(() => {
    const checkAvailability = async () => {
      if (!isNewBookingOpen) return;
      if (bookingForm.checkInDate && bookingForm.checkOutDate) {
        try {
          setSearchingRooms(true);
          const res = await api.get(
            `/rooms/availability?checkInDate=${bookingForm.checkInDate}&checkOutDate=${bookingForm.checkOutDate}`
          );
          if (res.data.success) {
            setAvailableRooms(res.data.data.rooms);
          }
        } catch (e) {
          console.error(e);
        } finally {
          setSearchingRooms(false);
        }
      }
    };
    checkAvailability();
  }, [bookingForm.checkInDate, bookingForm.checkOutDate, isNewBookingOpen, availabilityRefreshToken]);

  const handleCreateReservation = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await api.post('/reservations', {
        guestData: {
          name: bookingForm.guestName,
          email: bookingForm.guestEmail,
          phone: bookingForm.guestPhone
        },
        checkInDate: bookingForm.checkInDate,
        checkOutDate: bookingForm.checkOutDate,
        rooms: [{
          roomId: bookingForm.roomId,
          roomTypeId: bookingForm.roomTypeId
        }],
        adultsCount: bookingForm.adultsCount,
        childrenCount: bookingForm.childrenCount,
        specialRequests: bookingForm.specialRequests,
        bookingSource: 'manual'
      });

      if (res.data.success) {
        closeNewReservationModal();
        setMessage(`Reservation created! Ref: ${res.data.data.reservation.bookingReference}`);
        fetchReservations();
        setTimeout(() => setMessage(''), 4000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create reservation.');
    }
  };

  const openCancellationModal = (reservation, returnToDetails = false) => {
    setCancellationBooking(reservation);
    setCancellationReason('');
    setCancellationError('');
    setReturnToDetailsAfterCancellation(returnToDetails);
    if (returnToDetails) setIsDetailOpen(false);
  };

  const closeCancellationModal = () => {
    setCancellationBooking(null);
    setCancellationReason('');
    setCancellationError('');
    if (returnToDetailsAfterCancellation) setIsDetailOpen(true);
    setReturnToDetailsAfterCancellation(false);
  };

  const handleCancelBooking = async (e) => {
    e.preventDefault();
    const reason = cancellationReason.trim();
    if (!cancellationBooking || !reason) {
      setCancellationError('Please enter a cancellation reason.');
      return;
    }

    setCancellingReservation(true);
    setCancellationError('');
    let response;
    try {
      response = await api.post(`/reservations/${cancellationBooking._id}/cancel`, { reason });
    } catch (err) {
      setCancellationError(err.response?.data?.message || 'Cancellation failed.');
      return;
    } finally {
      setCancellingReservation(false);
    }

    const cancelledBooking = cancellationBooking;
    setCancellationBooking(null);
    setCancellationReason('');
    setReturnToDetailsAfterCancellation(false);
    setIsDetailOpen(false);
    setMessage(response.data.message || 'Reservation cancelled.');

    const refreshTasks = [
      fetchReservations(),
      fetchReservationRequests(),
      api.get(`/rooms/availability?checkInDate=${dayjs(cancelledBooking.checkInDate).format('YYYY-MM-DD')}&checkOutDate=${dayjs(cancelledBooking.checkOutDate).format('YYYY-MM-DD')}`)
    ];
    const refreshResults = await Promise.allSettled(refreshTasks);
    if (refreshResults[2].status === 'rejected') {
      setMessage('Reservation cancelled, but room availability could not be refreshed. Reload the page to see the latest availability.');
    }
    setTimeout(() => setMessage(''), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Reservation Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Centralized booking engine with real-time overlap & double-booking prevention
          </p>
        </div>

        <Button
          variant="primary"
          icon={PlusCircle}
          onClick={() => {
            setBookingForm(createInitialBookingForm());
            setAvailableRooms([]);
            setIsNewBookingOpen(true);
            setError('');
          }}
        >
          Create Reservation
        </Button>
      </div>

      {message && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {canReviewRequests && (
        <Card>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Reservation Requests</h2>
                <p className="text-xs text-slate-500 mt-1">Review pending requests for this hotel.</p>
              </div>
              <Badge variant="pending_approval">{reservationRequests.length} Pending</Badge>
            </div>

            {requestError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                {requestError}
              </div>
            )}

            {loadingRequests ? (
              <LoadingSpinner text="Loading reservation requests..." />
            ) : reservationRequests.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs">No pending reservation requests.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold">
                      <th className="pb-3">Reference</th>
                      <th className="pb-3">Guest</th>
                      <th className="pb-3">Room Type</th>
                      <th className="pb-3">Stay Dates</th>
                      <th className="pb-3">Payment</th>
                      <th className="pb-3">Availability</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reservationRequests.map((request) => (
                      <tr key={request._id}>
                        <td className="py-3 font-bold font-mono text-slate-900">{request.bookingReference}</td>
                        <td className="py-3">
                          <p className="font-semibold text-slate-800">{request.guestName}</p>
                          <p className="text-[11px] text-slate-400">{request.guestEmail}</p>
                        </td>
                        <td className="py-3 text-slate-600">
                          {request.rooms?.map((room) => room.roomTypeId?.name || 'Room').join(', ')}
                        </td>
                        <td className="py-3 text-slate-600 whitespace-nowrap">
                          {dayjs(request.checkInDate).format('MMM D, YYYY')} - {dayjs(request.checkOutDate).format('MMM D, YYYY')}
                        </td>
                        <td className="py-3"><Badge variant={request.paymentStatus}>{request.paymentStatus}</Badge></td>
                        <td className="py-3">
                          <Badge variant={request.isRoomAvailable ? 'available' : 'out_of_service'}>
                            {request.isRoomAvailable ? 'Available' : 'Unavailable'}
                          </Badge>
                        </td>
                        <td className="py-3"><Badge variant={request.status}>{request.status}</Badge></td>
                        <td className="py-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedBooking(request);
                              setIsDetailOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-slate-100 rounded-lg"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {request.status === 'pending_approval' && (
                            <>
                              <Button
                                size="sm"
                                variant="success"
                                icon={Check}
                                loading={processingRequestId === request._id}
                                disabled={Boolean(processingRequestId)}
                                onClick={() => handleApproveRequest(request._id)}
                                className="ml-1"
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                icon={XCircle}
                                disabled={Boolean(processingRequestId)}
                                onClick={() => {
                                  setRejectingBooking(request);
                                  setRejectionReason('');
                                }}
                                className="ml-1"
                              >
                                Reject
                              </Button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/80">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by ref #, guest name, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>

        <Select
          size="sm"
          className="max-w-xs"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          options={[
            { value: 'all', label: 'All Reservation Statuses' },
            { value: 'confirmed', label: 'Confirmed' },
            { value: 'cancelled', label: 'Cancelled' },
            { value: 'checked_in', label: 'Checked In' },
            { value: 'checked_out', label: 'Checked Out' }
          ]}
        />
      </div>

      {/* Table */}
      <Card>
        {loading ? (
          <LoadingSpinner text="Retrieving reservations..." />
        ) : reservations.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            No reservations found matching criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold">
                  <th className="pb-3">Reference</th>
                  <th className="pb-3">Guest Information</th>
                  <th className="pb-3">Stay Dates</th>
                  <th className="pb-3">Checkout Date &amp; Time</th>
                  <th className="pb-3">Rooms</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Payment</th>
                  <th className="pb-3 text-right">Total</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reservations.map((resv) => (
                  <tr key={resv._id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 font-bold text-slate-900 font-mono">
                      {resv.bookingReference}
                    </td>
                    <td className="py-3.5">
                      <p className="font-semibold text-slate-800">{resv.guestName}</p>
                      <p className="text-[11px] text-slate-400">{resv.guestPhone}</p>
                    </td>
                    <td className="py-3.5 text-slate-600">
                      <div>{dayjs(resv.checkInDate).format('MMM D')} - {dayjs(resv.checkOutDate).format('MMM D, YYYY')}</div>
                    </td>
                    <td className="py-3.5 text-slate-600">
                      {resv.checkedOutAt ? (
                        <span className="font-medium text-emerald-700">
                          {dayjs(resv.checkedOutAt).format('MMM D, YYYY h:mm A')}
                        </span>
                      ) : (
                        <span className="text-slate-500">
                          Scheduled: {getScheduledCheckoutAt(resv.checkOutDate, hotel?.checkOutTime).format('MMM D, YYYY h:mm A')}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5">
                      {resv.rooms?.map((rm) => (
                        <span key={rm.roomId} className="font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200 mr-1">
                          Room {rm.roomNumber}
                        </span>
                      ))}
                    </td>
                    <td className="py-3.5">
                      <Badge variant={resv.status}>{resv.status}</Badge>
                      {isReservationOverstaying(resv, hotel?.checkOutTime, currentTime) && (
                        <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-800" role="status">
                          <AlertTriangle className="h-3 w-3" />
                          Overstaying — checkout required
                        </div>
                      )}
                    </td>
                    <td className="py-3.5">
                      <Badge variant={resv.paymentStatus}>{resv.paymentStatus}</Badge>
                    </td>
                    <td className="py-3.5 text-right font-black text-slate-900">
                      {formatCurrency(resv.totalAmount)}
                    </td>
                    <td className="py-3.5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedBooking(resv);
                          setIsDetailOpen(true);
                        }}
                        className="mr-1 inline-flex rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                        title="View Details"
                        aria-label={`View reservation ${resv.bookingReference}`}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={resv.status !== 'confirmed'}
                        onClick={() => openCancellationModal(resv)}
                        className="mr-1 inline-flex rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-500/30 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                        title={resv.status === 'confirmed'
                          ? 'Cancel Reservation'
                          : 'Only confirmed reservations can be cancelled'}
                        aria-label={`Cancel reservation ${resv.bookingReference}`}
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={!canCheckout
                          || !['confirmed', 'checked_in'].includes(resv.status)
                          || resv.paymentStatus === 'unpaid'}
                        onClick={() => setCheckoutBooking(resv)}
                        className="inline-flex rounded-lg p-1.5 text-emerald-700 transition-colors hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                        title={!canCheckout
                          ? 'Checkout is restricted to hotel admins and receptionists'
                          : resv.paymentStatus === 'unpaid'
                            ? 'Checkout is unavailable while the reservation is unpaid'
                            : !['confirmed', 'checked_in'].includes(resv.status)
                              ? 'Only confirmed or checked-in reservations can be checked out'
                              : 'Checkout Reservation'}
                        aria-label={`Checkout reservation ${resv.bookingReference}`}
                      >
                        <LogOut className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && pagination.pages > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500">
            <span>
              Showing {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} reservations
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </Button>
              <span>Page {pagination.page} of {pagination.pages}</span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={page >= pagination.pages}
                onClick={() => setPage((current) => Math.min(pagination.pages, current + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* New Reservation Modal */}
      <Modal
        isOpen={isNewBookingOpen}
        onClose={closeNewReservationModal}
        closeOnEscape={false}
        title="Create New Reservation"
        subtitle="Reserve room dates with automatic conflict validation"
      >
        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
            {error}
          </div>
        )}
        <form onSubmit={handleCreateReservation} className="space-y-4">
          <Input
            label="Guest Full Name"
            required
            value={bookingForm.guestName}
            onChange={(e) => setBookingForm({ ...bookingForm, guestName: e.target.value })}
            placeholder="Victoria Adams"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <PhoneInput
              label="Phone Number"
              required
              value={bookingForm.guestPhone}
              defaultCountry={hotel?.country}
              onChange={(phone) => setBookingForm({ ...bookingForm, guestPhone: phone })}
            />
            <Input
              label="Email Address"
              type="email"
              value={bookingForm.guestEmail}
              onChange={(e) => setBookingForm({ ...bookingForm, guestEmail: e.target.value })}
              placeholder="victoria@example.com"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Check-In Date"
              type="date"
              required
              value={bookingForm.checkInDate}
              onChange={(e) => setBookingForm({ ...bookingForm, checkInDate: e.target.value })}
            />
            <Input
              label="Check-Out Date"
              type="date"
              required
              value={bookingForm.checkOutDate}
              onChange={(e) => setBookingForm({ ...bookingForm, checkOutDate: e.target.value })}
            />
          </div>

          <Select
            label="Allocated Room (Conflict-Free)"
            required
            value={bookingForm.roomId}
            onChange={(e) => {
              const selected = availableRooms.find((r) => r._id === e.target.value);
              if (selected) {
                setBookingForm({
                  ...bookingForm,
                  roomId: selected._id,
                  roomTypeId: selected.roomTypeId?._id
                });
              }
            }}
          >
            <option value="">
              {searchingRooms ? 'Searching available rooms...' : availableRooms.length === 0 ? 'No rooms free for dates' : '-- Select Available Room --'}
            </option>
            {availableRooms.map((rm) => (
              <option key={rm._id} value={rm._id}>
                Room #{rm.roomNumber} - {rm.roomTypeId?.name} ({formatCurrency(rm.roomTypeId?.basePrice)}/night)
              </option>
            ))}
          </Select>

          <Input
            label="Special Requests / Dietary / Room Notes"
            value={bookingForm.specialRequests}
            onChange={(e) => setBookingForm({ ...bookingForm, specialRequests: e.target.value })}
            placeholder="Early check-in, high floor, quiet room"
          />

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="secondary" type="button" onClick={closeNewReservationModal}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={!bookingForm.roomId}>
              Confirm Reservation
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(cancellationBooking)}
        onClose={closeCancellationModal}
        title="Cancel Reservation"
        subtitle={cancellationBooking?.bookingReference}
      >
        {cancellationError && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            {cancellationError}
          </div>
        )}
        <form onSubmit={handleCancelBooking} className="space-y-4">
          <label className="block text-xs font-semibold text-slate-700">
            Cancellation reason <span className="text-rose-600">*</span>
            <textarea
              required
              autoFocus
              rows={4}
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              placeholder="Please explain why this reservation is being cancelled."
              className="mt-1.5 w-full rounded-lg border border-slate-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </label>
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              type="button"
              onClick={closeCancellationModal}
              disabled={cancellingReservation}
            >
              Go Back
            </Button>
            <Button
              variant="danger"
              type="submit"
              loading={cancellingReservation}
              disabled={!cancellationReason.trim()}
            >
              Confirm Cancellation
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(rejectingBooking)}
        onClose={() => {
          setRejectingBooking(null);
          setRejectionReason('');
        }}
        title="Reject Reservation Request"
        subtitle={rejectingBooking?.bookingReference}
      >
        {requestError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
            {requestError}
          </div>
        )}
        <form onSubmit={handleRejectRequest} className="space-y-4">
          <label className="block text-xs font-semibold text-slate-700">
            Rejection reason <span className="text-rose-600">*</span>
            <textarea
              required
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
              className="mt-1.5 w-full rounded-lg border border-slate-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              placeholder="Explain why this reservation request is being rejected."
            />
          </label>
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                setRejectingBooking(null);
                setRejectionReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              type="submit"
              loading={processingRequestId === rejectingBooking?._id}
              disabled={!rejectionReason.trim()}
            >
              Reject Request
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reservation Details Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={`Reservation Details: ${selectedBooking?.bookingReference}`}
      >
        {selectedBooking && (
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-xl space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Guest Name:</span>
                <span className="font-bold text-slate-800">{selectedBooking.guestName}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="shrink-0 text-slate-500">Phone:</span>
                <span className="break-all text-right font-semibold text-slate-700">{selectedBooking.guestPhone || 'Not provided'}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="shrink-0 text-slate-500">Email:</span>
                <span className="break-all text-right font-semibold text-slate-700">{selectedBooking.guestEmail || 'Not provided'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Stay Duration:</span>
                <span className="font-semibold text-slate-700">
                  {dayjs(selectedBooking.checkInDate).format('YYYY-MM-DD')} to {dayjs(selectedBooking.checkOutDate).format('YYYY-MM-DD')}
                </span>
              </div>
              {selectedBooking.status === 'checked_out' && (
                <>
                  <div className="flex justify-between gap-4">
                    <span className="shrink-0 text-slate-500">Actual Checkout:</span>
                    <span className="text-right font-semibold text-emerald-700">
                      {selectedBooking.checkedOutAt
                        ? dayjs(selectedBooking.checkedOutAt).format('MMM D, YYYY h:mm A')
                        : 'Not recorded'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="shrink-0 text-slate-500">Checked Out By:</span>
                    <span className="text-right font-semibold text-slate-700">
                      {selectedBooking.checkedOutBy?.name || 'Not recorded'}
                    </span>
                  </div>
                </>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Room Type:</span>
                <span className="font-semibold text-slate-700">
                  {selectedBooking.rooms?.map((room) => room.roomTypeId?.name || 'Room').join(', ')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Status:</span>
                <Badge variant={selectedBooking.paymentStatus}>{selectedBooking.paymentStatus}</Badge>
              </div>
            </div>

            {selectedBooking.status === 'rejected' && selectedBooking.rejectionReason && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                <span className="font-bold text-rose-800">Rejection Reason:</span>
                <p className="mt-1 text-rose-700">{selectedBooking.rejectionReason}</p>
              </div>
            )}

            <div className="p-4 bg-brand-50/50 rounded-xl space-y-2 border border-brand-100">
              <div className="flex justify-between text-sm font-bold">
                <span>Total Amount:</span>
                <span>{formatCurrency(selectedBooking.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Paid to Date:</span>
                <span>{formatCurrency(selectedBooking.paidAmount)}</span>
              </div>
              <div className="flex justify-between text-rose-700 font-bold border-t border-brand-200/60 pt-2">
                <span>Remaining Balance:</span>
                <span>{formatCurrency(selectedBooking.balanceAmount)}</span>
              </div>
            </div>

            {selectedBooking.specialRequests && (
              <div>
                <span className="font-bold text-slate-700">Special Requests:</span>
                <p className="mt-1 text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  {selectedBooking.specialRequests}
                </p>
              </div>
            )}
            {selectedBooking.status === 'cancelled' && selectedBooking.cancellationReason && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                <span className="font-bold text-rose-800">Cancellation Reason:</span>
                <p className="mt-1 text-rose-700">{selectedBooking.cancellationReason}</p>
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2">
              {selectedBooking.status === 'confirmed' && (
                <Button
                  variant="danger"
                  type="button"
                  onClick={() => openCancellationModal(selectedBooking, true)}
                >
                  Cancel Reservation
                </Button>
              )}
              {canCheckout
                && ['confirmed', 'checked_in'].includes(selectedBooking.status)
                && selectedBooking.paymentStatus !== 'unpaid' && (
                <Button
                  variant="success"
                  type="button"
                  onClick={() => {
                    setCheckoutBooking(selectedBooking);
                    setIsDetailOpen(false);
                  }}
                >
                  Checkout
                </Button>
              )}
              <Button variant="secondary" type="button" onClick={() => setIsDetailOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
      <ReservationCheckoutModal
        reservation={checkoutBooking}
        onClose={() => setCheckoutBooking(null)}
        onComplete={handleCheckout}
      />
    </div>
  );
};
