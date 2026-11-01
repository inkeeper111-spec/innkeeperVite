import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useCurrency } from '../../hooks/useCurrency';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { PhoneInput } from '../../components/ui/PhoneInput';
import { Select } from '../../components/ui/Select';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useAuth } from '../../contexts/AuthContext';
import { Users, PlusCircle, Search, Phone, Mail, MapPin, Eye, CheckCircle2 } from 'lucide-react';
import dayjs from 'dayjs';

const EMPTY_GUEST_FORM = {
  name: '',
  phone: '',
  email: '',
  city: '',
  country: '',
  idDocumentType: '',
  idDocumentNumber: '',
  preferences: ''
};

export const GuestsPage = () => {
  const { formatCurrency } = useCurrency();
  const { hotel } = useAuth();
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [guestHistory, setGuestHistory] = useState({ reservations: [], invoices: [] });

  const [formData, setFormData] = useState(EMPTY_GUEST_FORM);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchGuests = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/guests?search=${search}`);
      if (res.data.success) {
        setGuests(res.data.data.guests);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuests();
  }, [search]);

  const handleCreateGuest = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { idDocumentType, ...guestData } = formData;
      const res = await api.post('/guests', {
        ...guestData,
        ...(idDocumentType ? { idDocumentType } : {})
      });
      if (res.data.success) {
        setIsAddOpen(false);
        setMessage(`Guest ${formData.name} added to directory.`);
        setFormData({ ...EMPTY_GUEST_FORM });
        fetchGuests();
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create guest.');
    }
  };

  const handleViewProfile = async (guestId) => {
    try {
      const res = await api.get(`/guests/${guestId}`);
      if (res.data.success) {
        setSelectedGuest(res.data.data.guest);
        setGuestHistory({
          reservations: res.data.data.reservations || [],
          invoices: res.data.data.invoices || []
        });
        setIsProfileOpen(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const openAddGuestModal = () => {
    setFormData({ ...EMPTY_GUEST_FORM });
    setError('');
    setIsAddOpen(true);
  };

  const closeAddGuestModal = () => {
    setIsAddOpen(false);
    setFormData({ ...EMPTY_GUEST_FORM });
    setError('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Guest Directory</h1>
          <p className="text-xs text-slate-500 mt-1">
            Maintain guest profiles, contact details, documents, and stay histories
          </p>
        </div>

        <Button variant="primary" icon={PlusCircle} onClick={openAddGuestModal}>
          Register New Guest
        </Button>
      </div>

      {message && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-200/80">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, phone, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        {loading ? (
          <LoadingSpinner text="Retrieving guest directory..." />
        ) : guests.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            No guests found matching search query.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold">
                  <th className="pb-3">Guest Name</th>
                  <th className="pb-3">Phone Number</th>
                  <th className="pb-3">Email</th>
                  <th className="pb-3">Location</th>
                  <th className="pb-3">ID Document</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {guests.map((g) => (
                  <tr key={g._id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 font-bold text-slate-900">{g.name}</td>
                    <td className="py-3.5 text-slate-600">{g.phone}</td>
                    <td className="py-3.5 text-slate-600">{g.email || '—'}</td>
                    <td className="py-3.5 text-slate-600">
                      {g.city ? `${g.city}, ` : ''}{g.country}
                    </td>
                    <td className="py-3.5">
                      <span className="font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        {g.idDocumentType.toUpperCase()}: {g.idDocumentNumber || 'N/A'}
                      </span>
                    </td>
                    <td className="py-3.5 text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={Eye}
                        onClick={() => handleViewProfile(g._id)}
                      >
                        Profile
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add Guest Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={closeAddGuestModal}
        title="Add Guest Profile"
        subtitle="Register guest contact and identification"
      >
        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
            {error}
          </div>
        )}
        <form onSubmit={handleCreateGuest} className="space-y-4">
          <Input
            label="Full Name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Arthur Pendelton"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <PhoneInput
              label="Phone Number"
              required
              value={formData.phone}
              defaultCountry={hotel?.country}
              onChange={(phone) => setFormData({ ...formData, phone })}
            />
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="arthur@example.com"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="City"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="Boston"
            />
            <Input
              label="Country"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              placeholder="United States"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="ID Document Type"
              required
              value={formData.idDocumentType}
              onChange={(e) => setFormData({ ...formData, idDocumentType: e.target.value })}
              options={[
                { label: 'Select document type', value: '' },
                { label: 'Passport', value: 'passport' },
                { label: 'Driver License', value: 'driver_license' },
                { label: 'National ID', value: 'national_id' }
              ]}
            />
            <Input
              label="Document Number"
              required
              value={formData.idDocumentNumber}
              onChange={(e) => setFormData({ ...formData, idDocumentNumber: e.target.value })}
              placeholder="P9842104"
            />
          </div>

          <Input
            label="Guest Preferences & Notes"
            value={formData.preferences}
            onChange={(e) => setFormData({ ...formData, preferences: e.target.value })}
            placeholder="Prefers high floor, allergy to goose feathers"
          />

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="secondary" type="button" onClick={closeAddGuestModal}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Guest
            </Button>
          </div>
        </form>
      </Modal>

      {/* Profile & History Modal */}
      <Modal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        title={`Guest Dossier: ${selectedGuest?.name}`}
        maxWidth="max-w-2xl"
      >
        {selectedGuest && (
          <div className="space-y-6 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-xl">
              <div>
                <p className="text-slate-400 font-semibold uppercase text-[10px]">Contact</p>
                <p className="font-bold text-slate-800 mt-0.5">{selectedGuest.phone}</p>
                <p className="text-slate-500">{selectedGuest.email || 'No email'}</p>
              </div>
              <div>
                <p className="text-slate-400 font-semibold uppercase text-[10px]">ID Document</p>
                <p className="font-bold text-slate-800 mt-0.5">{selectedGuest.idDocumentType.toUpperCase()}</p>
                <p className="text-slate-500 font-mono">{selectedGuest.idDocumentNumber || 'Not recorded'}</p>
              </div>
              <div>
                <p className="text-slate-400 font-semibold uppercase text-[10px]">Origin</p>
                <p className="font-bold text-slate-800 mt-0.5">{selectedGuest.city || 'N/A'}</p>
                <p className="text-slate-500">{selectedGuest.country}</p>
              </div>
            </div>

            {selectedGuest.preferences && (
              <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl">
                <span className="font-bold text-amber-900 block text-[11px] mb-1">Guest Preferences & Habits:</span>
                <p className="text-amber-800">{selectedGuest.preferences}</p>
              </div>
            )}

            <div>
              <h4 className="font-bold text-slate-800 text-sm mb-2">Past Stay History</h4>
              {guestHistory.reservations.length === 0 ? (
                <p className="text-slate-400 py-3 text-center">No past stays recorded.</p>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                  {guestHistory.reservations.map((r) => (
                    <div key={r._id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                      <div>
                        <p className="font-bold text-slate-900">{r.bookingReference}</p>
                        <p className="text-slate-500">
                          {dayjs(r.checkInDate).format('YYYY-MM-DD')} to {dayjs(r.checkOutDate).format('YYYY-MM-DD')}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant={r.status}>{r.status}</Badge>
                        <span className="block font-black text-slate-900 mt-1">{formatCurrency(r.totalAmount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
