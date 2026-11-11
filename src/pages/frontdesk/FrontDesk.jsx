import { PaginatedTable } from '../../components/ui/PaginatedTable';
import React, { useState, useEffect } from 'react';
import api, { showApiErrorToast } from '../../api/axios';
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
import {
  formatHotelDateTime,
  formatHotelTime,
  getExpectedCheckInAt,
  getExpectedCheckOutAt,
  isReservationOverstaying
} from '../../utils/reservationTime';
import { addDateDays, getHotelLocalDate } from '../../utils/hotelDate';
import {
  UserCheck,
  UserMinus,
  DoorOpen,
  Receipt,
  Search,
  PlusCircle,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import dayjs from 'dayjs';

export const FrontDesk = () => {
  const { user, hotel } = useAuth();
  const { formatCurrency } = useCurrency();
  const canCheckout = ['hotel_admin', 'receptionist'].includes(user?.role);
  const [activeTab, setActiveTab] = useState('arrivals'); // arrivals, inhouse, departures
  const [reservations, setReservations] = useState([]);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(() => dayjs());
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [checkoutBooking, setCheckoutBooking] = useState(null);
  const [checkInBooking, setCheckInBooking] = useState(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInError, setCheckInError] = useState('');

  // Walk-in Express Booking Modal
  const [isWalkInOpen, setIsWalkInOpen] = useState(false);
  const [walkInData, setWalkInData] = useState({
    guestName: '',
    guestPhone: '',
    guestEmail: '',
    roomId: '',
    roomTypeId: '',
    nights: 1,
    adultsCount: 1,
    ratePerNight: 0
  });

  const fetchFrontDeskData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/reservations?limit=100');
      if (res.data.success) {
        setReservations(res.data.data.reservations);
      }

      // Also get available rooms for walk-in
      const today = getHotelLocalDate(hotel?.timezone);
      const tomorrow = addDateDays(today, 1);
      const roomsRes = await api.get(`/rooms/availability?checkInDate=${today}&checkOutDate=${tomorrow}`);
      if (roomsRes.data.success) {
        setAvailableRooms(roomsRes.data.data.rooms);
      }
    } catch (e) {
      console.error('Front desk fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFrontDeskData();
  }, [hotel?.timezone]);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(dayjs()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const handleCheckIn = async () => {
    if (!checkInBooking) return;
    setCheckingIn(true);
    setCheckInError('');
    try {
      const res = await api.post(`/reservations/${checkInBooking._id}/check-in`, { confirmed: true });
      if (res.data.success) {
        setCheckInBooking(null);
        setMessage('Guest checked in successfully! Room marked occupied.');
        await fetchFrontDeskData();
        setTimeout(() => setMessage(''), 4000);
      }
    } catch (err) {
      setCheckInError(err.response?.data?.message || 'Check-in failed. Please try again.');
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckOut = async (reservationId, checkoutConfirmation) => {
    try {
      const response = await api.post(`/reservations/${reservationId}/check-out`, checkoutConfirmation);
      setCheckoutBooking(null);
      setMessage(response.data.message || 'Guest checked out successfully. Room cleaning tasks have been added to housekeeping.');
      await fetchFrontDeskData();
      setTimeout(() => setMessage(''), 4000);
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Check-out failed.');
    }
  };

  const handleWalkInSubmit = async (e) => {
    e.preventDefault();
    try {
      const today = getHotelLocalDate(hotel?.timezone);
      const end = addDateDays(today, Number(walkInData.nights));

      const res = await api.post('/reservations', {
        guestData: {
          name: walkInData.guestName,
          phone: walkInData.guestPhone,
          email: walkInData.guestEmail
        },
        checkInDate: today,
        checkOutDate: end,
        rooms: [{
          roomId: walkInData.roomId,
          roomTypeId: walkInData.roomTypeId
        }],
        adultsCount: walkInData.adultsCount,
        bookingSource: 'walk_in'
      });

      if (res.data.success) {
        setIsWalkInOpen(false);
        setCheckInError('');
        setCheckInBooking(res.data.data.reservation);
        await fetchFrontDeskData();
      }
    } catch (err) {
      showApiErrorToast(err, 'Walk-in booking failed');
    }
  };

  // Filter lists based on operational status
  const todayStr = getHotelLocalDate(hotel?.timezone);

  const arrivals = reservations.filter(
    (r) => ['approved', 'confirmed'].includes(r.status) && String(r.checkInDate).slice(0, 10) <= todayStr
  );

  const inHouse = reservations.filter((r) => r.status === 'checked_in');

  const departures = reservations.filter(
    (r) => isReservationOverstaying(r, hotel?.checkOutTime, currentTime, hotel?.timezone)
  );

  const displayedList =
    activeTab === 'arrivals' ? arrivals : activeTab === 'inhouse' ? inHouse : departures;

  const filteredDisplay = displayedList.filter(
    (r) =>
      r.guestName?.toLowerCase().includes(search.toLowerCase()) ||
      r.bookingReference?.toLowerCase().includes(search.toLowerCase()) ||
      r.rooms?.some((rm) => rm.roomNumber?.includes(search))
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Front Desk Operations</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time reception console for arrivals, departures, guest folios, and walk-ins
          </p>
        </div>

        <Button
          variant="primary"
          icon={PlusCircle}
          onClick={() => setIsWalkInOpen(true)}
          className="w-full sm:w-auto"
        >
          Express Walk-In Check-In
        </Button>
      </div>

      {message && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Tabs */}
      <nav className="overflow-x-auto border-b border-slate-200" aria-label="Front desk sections">
        <div className="flex min-w-max">
        <button
          onClick={() => setActiveTab('arrivals')}
          className={`flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-semibold transition-all sm:px-6 ${
            activeTab === 'arrivals'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Arrivals Queue</span>
          <span className="text-xs bg-brand-100 text-brand-700 font-bold px-2 py-0.5 rounded-full">
            {arrivals.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('inhouse')}
          className={`flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-semibold transition-all sm:px-6 ${
            activeTab === 'inhouse'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <DoorOpen className="w-4 h-4" />
          <span>In-House Guests</span>
          <span className="text-xs bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-full">
            {inHouse.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('departures')}
          className={`flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-semibold transition-all sm:px-6 ${
            activeTab === 'departures'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <UserMinus className="w-4 h-4" />
          <span>Departures / Checkout</span>
          <span className="text-xs bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full">
            {departures.length}
          </span>
        </button>
        </div>
      </nav>

      {/* Search Input */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            placeholder="Search by guest name, booking ref, or room..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* List Table */}
      <Card>
        {loading ? (
          <LoadingSpinner text="Retrieving guest records..." />
        ) : filteredDisplay.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            No reservations found in this queue.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <PaginatedTable tableClassName="w-full min-w-[820px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold">
                  <th className="pb-3">Reference</th>
                  <th className="pb-3">Guest</th>
                  <th className="pb-3">Assigned Room</th>
                  <th className="pb-3">Dates</th>
                  <th className="pb-3">Folio Balance</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDisplay.map((r) => (
                  <tr key={r._id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 font-bold text-slate-900">{r.bookingReference}</td>
                    <td className="py-3">
                      <p className="font-semibold text-slate-800">{r.guestName}</p>
                      <p className="text-[11px] text-slate-400">{r.guestPhone}</p>
                      {isReservationOverstaying(r, hotel?.checkOutTime, currentTime, hotel?.timezone) && (
                        <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700" role="status">
                          <AlertTriangle className="h-3 w-3" />
                          Overstaying — manual checkout required
                        </p>
                      )}
                    </td>
                    <td className="py-3">
                      {r.rooms?.map((rm) => (
                        <span key={rm.roomId} className="font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded border border-brand-200 mr-1">
                          Room {rm.roomNumber}
                        </span>
                      ))}
                    </td>
                    <td className="py-3 text-slate-600">
                      <div>{String(r.checkInDate).slice(0, 10)} - {String(r.checkOutDate).slice(0, 10)}</div>
                      <div className="mt-1 text-[10px] text-slate-500">
                        Check-in: {formatHotelDateTime(getExpectedCheckInAt(r, hotel), hotel?.timezone)}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Check-out: {formatHotelDateTime(getExpectedCheckOutAt(r, hotel), hotel?.timezone)}
                      </div>
                      {r.checkedInAt && (
                        <div className="text-[10px] text-emerald-700">
                          Actual check-in: {formatHotelDateTime(r.checkedInAt, hotel?.timezone)}
                        </div>
                      )}
                      {r.checkedOutAt && (
                        <div className="text-[10px] text-emerald-700">
                          Actual check-out: {formatHotelDateTime(r.checkedOutAt, hotel?.timezone)}
                        </div>
                      )}
                    </td>
                    <td className="py-3">
                      <span className={`font-bold ${r.balanceAmount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {formatCurrency(r.balanceAmount)}
                      </span>
                      {r.balanceAmount > 0 && <span className="text-[10px] text-slate-400 block">due at desk</span>}
                    </td>
                    <td className="py-3 text-right">
                      {activeTab === 'arrivals' && (
                        <Button
                          size="sm"
                          variant="success"
                          icon={UserCheck}
                          onClick={() => {
                            setCheckInError('');
                            setCheckInBooking(r);
                          }}
                        >
                          Check In
                        </Button>
                      )}
                      {canCheckout
                        && r.status === 'checked_in'
                        && r.paymentStatus !== 'unpaid'
                        && (activeTab === 'departures' || activeTab === 'inhouse') && (
                        <Button
                          size="sm"
                          variant={r.balanceAmount > 0 ? 'outline' : 'secondary'}
                          icon={UserMinus}
                          onClick={() => setCheckoutBooking(r)}
                        >
                          Checkout
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </PaginatedTable>
          </div>
        )}
      </Card>

      {/* Express Walk-in Modal */}
      <ReservationCheckoutModal
        reservation={checkoutBooking}
        onClose={() => setCheckoutBooking(null)}
        onComplete={handleCheckOut}
      />

      <Modal
        isOpen={Boolean(checkInBooking)}
        onClose={() => {
          if (!checkingIn) {
            setCheckInBooking(null);
            setCheckInError('');
          }
        }}
        title="Confirm Guest Check-In"
        subtitle="Check-in is recorded only after you confirm the guest's arrival."
      >
        {checkInBooking && (
          <div className="space-y-4">
            {checkInError && (
              <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                {checkInError}
              </p>
            )}
            <dl className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm sm:grid-cols-2">
              <div><dt className="text-xs text-slate-500">Guest</dt><dd className="mt-1 font-semibold text-slate-800">{checkInBooking.guestName}</dd></div>
              <div><dt className="text-xs text-slate-500">Room</dt><dd className="mt-1 font-semibold text-slate-800">{checkInBooking.rooms?.map((room) => room.roomNumber).join(', ') || 'Not assigned'}</dd></div>
              <div className="sm:col-span-2"><dt className="text-xs text-slate-500">Expected Check-In</dt><dd className="mt-1 font-semibold text-slate-800">{formatHotelDateTime(getExpectedCheckInAt(checkInBooking, hotel), hotel?.timezone)}</dd></div>
              <div className="sm:col-span-2"><dt className="text-xs text-slate-500">Expected Check-Out</dt><dd className="mt-1 font-semibold text-slate-800">{formatHotelDateTime(getExpectedCheckOutAt(checkInBooking, hotel), hotel?.timezone)}</dd></div>
            </dl>
            <p className="text-sm text-slate-600">
              Standard hotel times: check-in {formatHotelTime(hotel?.checkInTime || '12:00')} · check-out {formatHotelTime(hotel?.checkOutTime || '11:00')}.
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button className="w-full sm:w-auto" type="button" variant="outline" disabled={checkingIn} onClick={() => setCheckInBooking(null)}>Cancel</Button>
              <Button className="w-full sm:w-auto" type="button" loading={checkingIn} onClick={handleCheckIn}>Confirm Check-In</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isWalkInOpen}
        onClose={() => setIsWalkInOpen(false)}
        title="Express Walk-In Check-In"
        subtitle="Quick registration and instant room allocation"
      >
        <form onSubmit={handleWalkInSubmit} className="space-y-4">
          <Input
            label="Guest Full Name"
            required
            value={walkInData.guestName}
            onChange={(e) => setWalkInData({ ...walkInData, guestName: e.target.value })}
            placeholder="John Smith"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <PhoneInput
              label="Phone Number"
              required
              value={walkInData.guestPhone}
              defaultCountry={hotel?.country}
              onChange={(phone) => setWalkInData({ ...walkInData, guestPhone: phone })}
            />
            <Input
              label="Email"
              type="email"
              value={walkInData.guestEmail}
              onChange={(e) => setWalkInData({ ...walkInData, guestEmail: e.target.value })}
              placeholder="guest@example.com"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Select Available Room"
              required
              value={walkInData.roomId}
              onChange={(e) => {
                const selected = availableRooms.find((rm) => rm._id === e.target.value);
                if (selected) {
                  setWalkInData({
                    ...walkInData,
                    roomId: selected._id,
                    roomTypeId: selected.roomTypeId?._id,
                    ratePerNight: selected.roomTypeId?.basePrice || 150
                  });
                }
              }}
            >
              <option value="">-- Choose Ready Room --</option>
              {availableRooms.map((rm) => (
                <option key={rm._id} value={rm._id}>
                  Room {rm.roomNumber} - {rm.roomTypeId?.name} ({formatCurrency(rm.roomTypeId?.basePrice)}/night)
                </option>
              ))}
            </Select>

            <Input
              label="Length of Stay (Nights)"
              type="number"
              min="1"
              required
              value={walkInData.nights}
              onChange={(e) => setWalkInData({ ...walkInData, nights: e.target.value })}
            />
          </div>

          {walkInData.ratePerNight > 0 && (
            <div className="p-3 bg-brand-50 border border-brand-200 rounded-xl flex items-center justify-between text-xs">
              <span className="font-semibold text-brand-900">Estimated Total (Stay + 10% Tax):</span>
              <span className="font-bold text-brand-700 text-sm">
                {formatCurrency(Math.round(walkInData.ratePerNight * walkInData.nights * 1.10))}
              </span>
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 pt-3 sm:flex-row sm:justify-end">
            <Button className="w-full sm:w-auto" variant="secondary" type="button" onClick={() => setIsWalkInOpen(false)}>
              Cancel
            </Button>
            <Button className="w-full sm:w-auto" variant="primary" type="submit" disabled={!walkInData.roomId}>
              Create & Continue to Check-In
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
