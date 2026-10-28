import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useAuth } from '../../contexts/AuthContext';
import {
  CalendarDays,
  PlusCircle,
  Search,
  CheckCircle2,
  XCircle,
  Eye,
  FileText,
  Check
} from 'lucide-react';
import dayjs from 'dayjs';

export const ReservationsPage = () => {
  const { user } = useAuth();
  const canReviewRequests = ['hotel_admin', 'receptionist'].includes(user?.role);
  const [reservations, setReservations] = useState([]);
  const [reservationRequests, setReservationRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [processingRequestId, setProcessingRequestId] = useState('');
  const [rejectingBooking, setRejectingBooking] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);

  // New Booking Form
  const [bookingForm, setBookingForm] = useState({
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

  const [availableRooms, setAvailableRooms] = useState([]);
  const [searchingRooms, setSearchingRooms] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchReservations = async () => {
    try {
      setLoading(true);
      const res = await api.get('/reservations?limit=50');
      if (res.data.success) {
        setReservations(res.data.data.reservations);
      }
    } catch (err) {
      console.error('Error fetching reservations:', err);
    } finally {
      setLoading(false);
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
    fetchReservations();
    fetchReservationRequests();
  }, [canReviewRequests]);

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
  }, [bookingForm.checkInDate, bookingForm.checkOutDate, isNewBookingOpen]);

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
        setIsNewBookingOpen(false);
        setMessage(`Reservation created! Ref: ${res.data.data.reservation.bookingReference}`);
        fetchReservations();
        setTimeout(() => setMessage(''), 4000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create reservation.');
    }
  };

  const handleCancelBooking = async (id) => {
    const reason = prompt('Please enter cancellation reason:');
    if (!reason) return;
    try {
      await api.post(`/reservations/${id}/cancel`, { reason });
      setMessage('Reservation cancelled.');
      fetchReservations();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      alert(err.response?.data?.message || 'Cancellation failed.');
    }
  };

  const filteredReservations = reservations.filter((r) => {
    const matchesSearch =
      r.bookingReference?.toLowerCase().includes(search.toLowerCase()) ||
      r.guestName?.toLowerCase().includes(search.toLowerCase()) ||
      r.guestPhone?.includes(search);
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: 'all', label: 'All Reservation Statuses' },
            { value: 'pending_approval', label: 'Pending Approval' },
            { value: 'approved', label: 'Approved' },
            { value: 'rejected', label: 'Rejected' },
            { value: 'confirmed', label: 'Confirmed' },
            { value: 'checked_in', label: 'Checked In' },
            { value: 'checked_out', label: 'Checked Out' },
            { value: 'cancelled', label: 'Cancelled' }
          ]}
        />
      </div>

      {/* Table */}
      <Card>
        {loading ? (
          <LoadingSpinner text="Retrieving reservations..." />
        ) : filteredReservations.length === 0 ? (
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
                  <th className="pb-3">Rooms</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Payment</th>
                  <th className="pb-3 text-right">Total</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReservations.map((resv) => (
                  <tr key={resv._id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 font-bold text-slate-900 font-mono">
                      {resv.bookingReference}
                    </td>
                    <td className="py-3.5">
                      <p className="font-semibold text-slate-800">{resv.guestName}</p>
                      <p className="text-[11px] text-slate-400">{resv.guestPhone}</p>
                    </td>
                    <td className="py-3.5 text-slate-600">
                      {dayjs(resv.checkInDate).format('MMM D')} - {dayjs(resv.checkOutDate).format('MMM D, YYYY')}
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
                    </td>
                    <td className="py-3.5">
                      <Badge variant={resv.paymentStatus}>{resv.paymentStatus}</Badge>
                    </td>
                    <td className="py-3.5 text-right font-black text-slate-900">
                      ${resv.totalAmount}
                    </td>
                    <td className="py-3.5 text-right space-x-1">
                      <button
                        onClick={() => {
                          setSelectedBooking(resv);
                          setIsDetailOpen(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {resv.status === 'confirmed' && (
                        <button
                          onClick={() => handleCancelBooking(resv._id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Cancel Reservation"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* New Reservation Modal */}
      <Modal
        isOpen={isNewBookingOpen}
        onClose={() => setIsNewBookingOpen(false)}
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
            <Input
              label="Phone Number"
              required
              value={bookingForm.guestPhone}
              onChange={(e) => setBookingForm({ ...bookingForm, guestPhone: e.target.value })}
              placeholder="+1 (555) 000-0000"
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
                Room #{rm.roomNumber} - {rm.roomTypeId?.name} (${rm.roomTypeId?.basePrice}/night)
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
            <Button variant="secondary" type="button" onClick={() => setIsNewBookingOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={!bookingForm.roomId}>
              Confirm Reservation
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
              <div className="flex justify-between">
                <span className="text-slate-500">Contact:</span>
                <span className="font-semibold text-slate-700">{selectedBooking.guestPhone} • {selectedBooking.guestEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Stay Duration:</span>
                <span className="font-semibold text-slate-700">
                  {dayjs(selectedBooking.checkInDate).format('YYYY-MM-DD')} to {dayjs(selectedBooking.checkOutDate).format('YYYY-MM-DD')}
                </span>
              </div>
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
                <span>${selectedBooking.totalAmount}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Paid to Date:</span>
                <span>${selectedBooking.paidAmount}</span>
              </div>
              <div className="flex justify-between text-rose-700 font-bold border-t border-brand-200/60 pt-2">
                <span>Remaining Balance:</span>
                <span>${selectedBooking.balanceAmount}</span>
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
          </div>
        )}
      </Modal>
    </div>
  );
};
