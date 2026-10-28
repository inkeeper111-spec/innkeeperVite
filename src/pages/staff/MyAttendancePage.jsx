import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { LogIn, LogOut, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import dayjs from 'dayjs';

const calculateDistanceMeters = (latitudeA, longitudeA, latitudeB, longitudeB) => {
  const radians = (degrees) => degrees * (Math.PI / 180);
  const earthRadiusMeters = 6371000;
  const latitudeDelta = radians(latitudeB - latitudeA);
  const longitudeDelta = radians(longitudeB - longitudeA);
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(latitudeA))
    * Math.cos(radians(latitudeB))
    * Math.sin(longitudeDelta / 2) ** 2;
  const boundedHaversine = Math.min(1, Math.max(0, haversine));
  return earthRadiusMeters * 2 * Math.atan2(
    Math.sqrt(boundedHaversine),
    Math.sqrt(1 - boundedHaversine)
  );
};

export const MyAttendancePage = () => {
  const { hotel } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [locationStatus, setLocationStatus] = useState('Not requested');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [distanceMeters, setDistanceMeters] = useState(null);
  const [checking, setChecking] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const attRes = await api.get('/staff/attendance/me');
      if (attRes.data.success) setData(attRes.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load attendance.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const flash = (ok, msg) => {
    if (ok) { setMessage(msg); setTimeout(() => setMessage(''), 3000); }
    else { setError(msg); setTimeout(() => setError(''), 3000); }
  };

  const handleCheck = async (type) => {
    let locationAcquired = false;
    setError('');
    setMessage('');
    setChecking(true);
    setLocationStatus('Requesting device location...');
    try {
      if (!navigator.geolocation) {
        setLocationStatus('Location unavailable');
        throw new Error('This device or browser does not support GPS location. Try a supported mobile browser.');
      }

      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        });
      });
      const coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracyMeters: position.coords.accuracy
      };
      setCurrentLocation(coords);
      locationAcquired = true;
      setLocationStatus('Location acquired');
      const registeredLocation = hotel?.attendanceLocation;
      const measuredDistance = registeredLocation
        ? calculateDistanceMeters(
          coords.latitude,
          coords.longitude,
          Number(registeredLocation.latitude),
          Number(registeredLocation.longitude)
        )
        : null;
      setDistanceMeters(measuredDistance);

      const res = await api.post(`/staff/attendance/${type}`, coords);
      flash(true, res.data.message);
      load();
    } catch (err) {
      if (err.code === 1) {
        setLocationStatus('Permission denied');
        flash(false, 'Location permission was denied. Allow location access in your browser settings and retry over HTTPS.');
      } else if (err.code === 2) {
        setLocationStatus('Location unavailable');
        flash(false, 'Your device could not determine a location. Move to an area with a better GPS signal and retry.');
      } else if (err.code === 3) {
        setLocationStatus('Location timed out');
        flash(false, 'GPS did not respond in time. Retry when the device has a clearer view of the sky.');
      } else {
        const reportedDistance = err.response?.data?.data?.distanceMeters;
        if (Number.isFinite(reportedDistance)) setDistanceMeters(reportedDistance);
        setLocationStatus(locationAcquired ? 'Location acquired' : 'Location unavailable');
        flash(false, err.response?.data?.message || err.message || 'Action failed.');
      }
    } finally {
      setChecking(false);
    }
  };

  if (loading && !data) return <LoadingSpinner text="Loading your attendance..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">My Attendance</h1>
        <p className="text-xs text-slate-500 mt-1">Daily check-in/out and working hours</p>
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex gap-2 items-center">
          <CheckCircle2 className="w-4 h-4" />{message}
        </div>
      )}
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex gap-2 items-center">
          <AlertTriangle className="w-4 h-4" />{error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <p className="text-[10px] uppercase font-bold text-slate-400">Today</p>
          <p className="text-lg font-black mt-1 capitalize">{data?.today?.status || 'Not marked'}</p>
          <p className="text-xs text-slate-500">{data?.today?.checkInTime || '—'} → {data?.today?.checkOutTime || '—'}</p>
        </Card>
        <Card>
          <p className="text-[10px] uppercase font-bold text-slate-400">Present days</p>
          <p className="text-2xl font-black text-emerald-700 mt-1">{data?.totals?.present || 0}</p>
        </Card>
        <Card>
          <p className="text-[10px] uppercase font-bold text-slate-400">Hours this month</p>
          <p className="text-2xl font-black text-brand-700 mt-1">{Math.round(data?.totals?.hours || 0)}</p>
        </Card>
        <Card>
          <p className="text-[10px] uppercase font-bold text-slate-400">Leave days</p>
          <p className="text-2xl font-black text-purple-700 mt-1">{data?.totals?.leave || 0}</p>
        </Card>
      </div>

      <Card title="Location verification" subtitle="GPS is validated by the server before each attendance punch">
        <div className="space-y-2 text-xs text-slate-600">
          <p>Permission / fix status: <span className="font-semibold">{locationStatus}</span></p>
          <p>
            Registered hotel location:{' '}
            {hotel?.attendanceLocation
              ? `${Number(hotel.attendanceLocation.latitude).toFixed(6)}, ${Number(hotel.attendanceLocation.longitude).toFixed(6)}`
              : 'Not configured'}
          </p>
          <p>Permitted radius: {hotel?.attendanceLocation?.radiusMeters ?? 50} meters</p>
          <p>Current GPS accuracy: {currentLocation ? `${Math.round(currentLocation.accuracyMeters)} meters` : 'Not available'}</p>
          <p>Distance to hotel: {Number.isFinite(distanceMeters) ? `${Math.round(distanceMeters)} meters` : 'Not available'}</p>
          {hotel?.attendanceLocation?.latitude == null && (
            <p className="font-semibold text-amber-700">
              Hotel location is not configured. Ask your Hotel Admin to set the attendance location in Hotel Settings.
            </p>
          )}
        </div>
      </Card>

      <div className="flex gap-3">
        <Button icon={LogIn} onClick={() => handleCheck('check-in')} disabled={checking || Boolean(data?.today?.checkInTime)}>
          {checking ? 'Verifying location...' : 'Check In'}
        </Button>
        <Button variant="outline" icon={LogOut} onClick={() => handleCheck('check-out')} disabled={checking || !data?.today?.checkInTime || Boolean(data?.today?.checkOutTime)}>
          {checking ? 'Verifying location...' : 'Check Out'}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card title="This month" subtitle="Clock records and approved leave">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 uppercase border-b border-slate-100">
                  <th className="pb-2">Date</th>
                  <th className="pb-2">In</th>
                  <th className="pb-2">Out</th>
                  <th className="pb-2">Hours</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(data?.records || []).map((r) => (
                  <tr key={r._id}>
                    <td className="py-2">{dayjs(r.date).format('MMM D')}</td>
                    <td className="py-2 font-mono">{r.checkInTime || '—'}</td>
                    <td className="py-2 font-mono">{r.checkOutTime || '—'}</td>
                    <td className="py-2">{r.workingHours || 0}</td>
                    <td className="py-2 capitalize"><Badge variant={r.status}>{r.status?.replace(/_/g, ' ')}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};
