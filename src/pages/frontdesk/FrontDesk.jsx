import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
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
  CheckCircle2
} from 'lucide-react';
import dayjs from 'dayjs';

export const FrontDesk = () => {
  const [activeTab, setActiveTab] = useState('arrivals'); // arrivals, inhouse, departures
  const [reservations, setReservations] = useState([]);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');

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
      const today = dayjs().format('YYYY-MM-DD');
      const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD');
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
  }, []);

  const handleCheckIn = async (reservationId) => {
    try {
      const res = await api.post(`/reservations/${reservationId}/check-in`);
      if (res.data.success) {
        setMessage('Guest checked in successfully! Room marked occupied.');
        fetchFrontDeskData();
        setTimeout(() => setMessage(''), 4000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Check-in failed');
    }
  };

  const handleCheckOut = async (reservationId) => {
    try {
      const res = await api.post(`/reservations/${reservationId}/check-out`);
      if (res.data.success) {
        setMessage('Guest checked out successfully! Housekeeping cleaning requested.');
        fetchFrontDeskData();
        setTimeout(() => setMessage(''), 4000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Check-out failed');
    }
  };

  const handleWalkInSubmit = async (e) => {
    e.preventDefault();
    try {
      const today = dayjs().startOf('day').toDate();
      const end = dayjs().add(Number(walkInData.nights), 'day').startOf('day').toDate();

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
        // Automatically check-in the walk-in guest immediately!
        await api.post(`/reservations/${res.data.data.reservation._id}/check-in`);
        setIsWalkInOpen(false);
        setMessage('Walk-in guest registered and checked in successfully!');
        fetchFrontDeskData();
        setTimeout(() => setMessage(''), 4000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Walk-in booking failed');
    }
  };

  // Filter lists based on operational status
  const todayStr = dayjs().format('YYYY-MM-DD');

  const arrivals = reservations.filter(
    (r) => ['approved', 'confirmed'].includes(r.status) && dayjs(r.checkInDate).format('YYYY-MM-DD') <= todayStr
  );

  const inHouse = reservations.filter((r) => r.status === 'checked_in');

  const departures = reservations.filter(
    (r) => r.status === 'checked_in' && dayjs(r.checkOutDate).format('YYYY-MM-DD') <= todayStr
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
            <table className="w-full text-left text-xs">
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
                    </td>
                    <td className="py-3">
                      {r.rooms?.map((rm) => (
                        <span key={rm.roomId} className="font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded border border-brand-200 mr-1">
                          Room {rm.roomNumber}
                        </span>
                      ))}
                    </td>
                    <td className="py-3 text-slate-600">
                      {dayjs(r.checkInDate).format('MMM D')} - {dayjs(r.checkOutDate).format('MMM D, YYYY')}
                    </td>
                    <td className="py-3">
                      <span className={`font-bold ${r.balanceAmount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        ${r.balanceAmount}
                      </span>
                      {r.balanceAmount > 0 && <span className="text-[10px] text-slate-400 block">due at desk</span>}
                    </td>
                    <td className="py-3 text-right">
                      {activeTab === 'arrivals' && (
                        <Button
                          size="sm"
                          variant="success"
                          icon={UserCheck}
                          onClick={() => handleCheckIn(r._id)}
                        >
                          Check In
                        </Button>
                      )}
                      {(activeTab === 'departures' || activeTab === 'inhouse') && (
                        <Button
                          size="sm"
                          variant={r.balanceAmount > 0 ? 'outline' : 'secondary'}
                          icon={UserMinus}
                          onClick={() => handleCheckOut(r._id)}
                        >
                          Check Out
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Express Walk-in Modal */}
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
            <Input
              label="Phone Number"
              required
              value={walkInData.guestPhone}
              onChange={(e) => setWalkInData({ ...walkInData, guestPhone: e.target.value })}
              placeholder="+1 (555) 000-0000"
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
                  Room {rm.roomNumber} - {rm.roomTypeId?.name} (${rm.roomTypeId?.basePrice}/night)
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
                ${Math.round(walkInData.ratePerNight * walkInData.nights * 1.10)}
              </span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="secondary" type="button" onClick={() => setIsWalkInOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={!walkInData.roomId}>
              Confirm & Check-In
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
