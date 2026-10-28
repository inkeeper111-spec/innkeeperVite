import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Settings, Building2, User, Key, CheckCircle2 } from 'lucide-react';

export const SettingsPage = () => {
  const { user, hotel, refreshUser } = useAuth();

  const [hotelForm, setHotelForm] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: 'United States',
    postalCode: '',
    taxNumber: '',
    currency: 'USD',
    timezone: 'UTC',
    checkInTime: '15:00',
    checkOutTime: '11:00',
    cancellationPolicy: '',
    invoicePrefix: 'INV',
    attendanceLocation: { latitude: '', longitude: '' }
  });

  const [hotelBaseline, setHotelBaseline] = useState(hotelForm);

  const [profileForm, setProfileForm] = useState({
    name: '',
    phone: '',
    currentPassword: '',
    newPassword: ''
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (hotel) {
      const nextHotelForm = {
        name: hotel.name || '',
        phone: hotel.phone || '',
        address: hotel.address || '',
        city: hotel.city || '',
        state: hotel.state || '',
        country: hotel.country || 'United States',
        postalCode: hotel.postalCode || '',
        taxNumber: hotel.taxNumber || '',
        currency: hotel.currency || 'USD',
        timezone: hotel.timezone || 'UTC',
        checkInTime: hotel.checkInTime || '15:00',
        checkOutTime: hotel.checkOutTime || '11:00',
        cancellationPolicy: hotel.cancellationPolicy || '',
        invoicePrefix: hotel.invoicePrefix || 'INV',
        attendanceLocation: {
          latitude: hotel.attendanceLocation?.latitude ?? '',
          longitude: hotel.attendanceLocation?.longitude ?? ''
        }
      };
      setHotelForm(nextHotelForm);
      setHotelBaseline(nextHotelForm);
    }
    if (user) {
      setProfileForm({
        name: user.name || '',
        phone: user.phone || '',
        currentPassword: '',
        newPassword: ''
      });
    }
  }, [hotel, user]);

  const handleUpdateHotel = async (e) => {
    e.preventDefault();
    setError('');

    const latitude = hotelForm.attendanceLocation.latitude;
    const longitude = hotelForm.attendanceLocation.longitude;
    const latitudeChanged = String(latitude) !== String(hotelBaseline.attendanceLocation.latitude);
    const longitudeChanged = String(longitude) !== String(hotelBaseline.attendanceLocation.longitude);
    const locationChanged = latitudeChanged || longitudeChanged;
    const payload = {};

    Object.keys(hotelForm).forEach((field) => {
      if (field === 'attendanceLocation') return;
      if (hotelForm[field] !== hotelBaseline[field]) payload[field] = hotelForm[field];
    });
    if (locationChanged) {
      payload.attendanceLocation = {
        latitude,
        longitude
      };
    }

    const latitudeEmpty = latitude === '' || latitude === null || latitude === undefined;
    const longitudeEmpty = longitude === '' || longitude === null || longitude === undefined;
    if (locationChanged && latitudeEmpty !== longitudeEmpty) {
      setError('Enter both hotel latitude and longitude, or leave both coordinates empty.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.put('/hotels', payload);
      if (res.data.success) {
        setMessage('Hotel property configuration saved successfully.');
        await refreshUser();
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update hotel settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.put('/auth/profile', profileForm);
      if (res.data.success) {
        setMessage('Your personal user profile updated successfully.');
        setProfileForm({ ...profileForm, currentPassword: '', newPassword: '' });
        refreshUser();
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update user profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Organization & Profile Settings</h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage hospitality operational policies, tax registration numbers, invoice formats, and account credentials
        </p>
      </div>

      {message && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl">
          {error}
        </div>
      )}

      {/* Hotel Settings Form */}
      {user?.role === 'hotel_admin' && (
        <Card title="Hotel Profile & Operational Policies">
          <form onSubmit={handleUpdateHotel} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Hotel / Resort Name"
                required
                value={hotelForm.name}
                onChange={(e) => setHotelForm({ ...hotelForm, name: e.target.value })}
              />
              <Input
                label="Public Phone Contact"
                required
                value={hotelForm.phone}
                onChange={(e) => setHotelForm({ ...hotelForm, phone: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Street Address"
                required
                value={hotelForm.address}
                onChange={(e) => setHotelForm({ ...hotelForm, address: e.target.value })}
              />
              <Input
                label="City"
                required
                value={hotelForm.city}
                onChange={(e) => setHotelForm({ ...hotelForm, city: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="State / Province"
                value={hotelForm.state}
                onChange={(e) => setHotelForm({ ...hotelForm, state: e.target.value })}
              />
              <Input
                label="Country"
                value={hotelForm.country}
                onChange={(e) => setHotelForm({ ...hotelForm, country: e.target.value })}
              />
              <Input
                label="Postal Code"
                value={hotelForm.postalCode}
                onChange={(e) => setHotelForm({ ...hotelForm, postalCode: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <Input
                label="Tax Registration Number"
                value={hotelForm.taxNumber}
                onChange={(e) => setHotelForm({ ...hotelForm, taxNumber: e.target.value })}
                placeholder="US-TAX-893201"
              />
              <Input
                label="Invoice Number Prefix"
                value={hotelForm.invoicePrefix}
                onChange={(e) => setHotelForm({ ...hotelForm, invoicePrefix: e.target.value })}
                placeholder="REGAL"
              />
              <Select
                label="Base Currency"
                value={hotelForm.currency}
                onChange={(e) => setHotelForm({ ...hotelForm, currency: e.target.value })}
                options={[
                  { label: 'USD ($)', value: 'USD' },
                  { label: 'EUR (€)', value: 'EUR' },
                  { label: 'GBP (£)', value: 'GBP' },
                  { label: 'INR (₹)', value: 'INR' },
                  { label: 'CAD ($)', value: 'CAD' }
                ]}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <Input
                label="Standard Check-In Time"
                type="time"
                value={hotelForm.checkInTime}
                onChange={(e) => setHotelForm({ ...hotelForm, checkInTime: e.target.value })}
              />
              <Input
                label="Standard Check-Out Time"
                type="time"
                value={hotelForm.checkOutTime}
                onChange={(e) => setHotelForm({ ...hotelForm, checkOutTime: e.target.value })}
              />
            </div>

            <Input
              label="Standard Cancellation Policy"
              value={hotelForm.cancellationPolicy}
              onChange={(e) => setHotelForm({ ...hotelForm, cancellationPolicy: e.target.value })}
              placeholder="Full refund 24 hours prior to arrival"
            />

            <div className="border-t border-slate-100 pt-4 space-y-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Attendance Location</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Employees can check in and out within 50 meters of this location. GPS accuracy must be 25 meters or better.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Hotel Latitude"
                  type="number"
                  min="-90"
                  max="90"
                  step="any"
                  value={hotelForm.attendanceLocation.latitude}
                  onChange={(e) => setHotelForm({
                    ...hotelForm,
                    attendanceLocation: { ...hotelForm.attendanceLocation, latitude: e.target.value }
                  })}
                  placeholder="e.g. 25.7617"
                />
                <Input
                  label="Hotel Longitude"
                  type="number"
                  min="-180"
                  max="180"
                  step="any"
                  value={hotelForm.attendanceLocation.longitude}
                  onChange={(e) => setHotelForm({
                    ...hotelForm,
                    attendanceLocation: { ...hotelForm.attendanceLocation, longitude: e.target.value }
                  })}
                  placeholder="e.g. -80.1918"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Leave both coordinates empty to disable GPS attendance until the hotel location is configured.
              </p>
            </div>

            <div className="flex justify-end pt-3">
              <Button type="submit" variant="primary" loading={loading}>
                Save Hotel Settings
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* User Personal Profile */}
      <Card title="Personal Account Credentials">
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              required
              value={profileForm.name}
              onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
            />
            <Input
              label="Mobile Number"
              value={profileForm.phone}
              onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
            />
          </div>

          <div className="border-t border-slate-100 pt-4">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Change Security Password</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Current Password"
                type="password"
                value={profileForm.currentPassword}
                onChange={(e) => setProfileForm({ ...profileForm, currentPassword: e.target.value })}
                placeholder="Leave blank to keep current"
              />
              <Input
                label="New Password"
                type="password"
                value={profileForm.newPassword}
                onChange={(e) => setProfileForm({ ...profileForm, newPassword: e.target.value })}
                placeholder="Minimum 6 characters"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <Button type="submit" variant="secondary" loading={loading}>
              Update User Profile
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
