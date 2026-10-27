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
  DoorClosed,
  PlusCircle,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  BedDouble,
  DollarSign,
  Tag
} from 'lucide-react';

export const RoomsPage = () => {
  const { user } = useAuth();
  const canManageRooms = user?.role === 'hotel_admin' || user?.role === 'super_admin';
  const [activeTab, setActiveTab] = useState('rooms'); // 'rooms' or 'categories'
  const [rooms, setRooms] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [housekeepingFilter, setHousekeepingFilter] = useState('all');

  // Modals
  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
  const [isAddTypeOpen, setIsAddTypeOpen] = useState(false);
  const [roomFormData, setRoomFormData] = useState({
    roomNumber: '',
    roomTypeId: '',
    floor: '1',
    notes: ''
  });
  const [typeFormData, setTypeFormData] = useState({
    name: '',
    code: '',
    basePrice: '',
    maxOccupancy: 2,
    bedConfiguration: '1 King Bed',
    amenities: 'High-Speed Wi-Fi, Smart TV, Balcony, Minibar'
  });

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [roomsRes, typesRes] = await Promise.all([
        api.get('/rooms'),
        api.get('/room-types')
      ]);
      if (roomsRes.data.success) setRooms(roomsRes.data.data);
      if (typesRes.data.success) setRoomTypes(typesRes.data.data);
    } catch (err) {
      console.error('Error fetching rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await api.post('/rooms', roomFormData);
      if (res.data.success) {
        setIsAddRoomOpen(false);
        setMessage(`Room ${roomFormData.roomNumber} added successfully.`);
        setRoomFormData({ roomNumber: '', roomTypeId: '', floor: '1', notes: '' });
        fetchData();
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create room.');
    }
  };

  const handleCreateType = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const amenitiesArr = typeFormData.amenities.split(',').map((s) => s.trim());
      const res = await api.post('/room-types', {
        ...typeFormData,
        basePrice: Number(typeFormData.basePrice),
        amenities: amenitiesArr
      });
      if (res.data.success) {
        setIsAddTypeOpen(false);
        setActiveTab('categories');
        setMessage(`Category ${typeFormData.name} added.`);
        setTypeFormData({
          name: '',
          code: '',
          basePrice: '',
          maxOccupancy: 2,
          bedConfiguration: '1 King Bed',
          amenities: 'High-Speed Wi-Fi, Smart TV, Balcony, Minibar'
        });
        fetchData();
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create room category.');
    }
  };

  const handleStatusChange = async (roomId, newStatus) => {
    try {
      await api.patch(`/rooms/${roomId}/status`, { roomStatus: newStatus });
      fetchData();
    } catch (err) {
      alert('Failed to update room status.');
    }
  };

  const filteredRooms = rooms.filter((r) => {
    const matchesSearch =
      r.roomNumber.toLowerCase().includes(search.toLowerCase()) ||
      r.roomTypeId?.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.roomStatus === statusFilter;
    const matchesHK = housekeepingFilter === 'all' || r.housekeepingStatus === housekeepingFilter;
    return matchesSearch && matchesStatus && matchesHK;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Rooms & Rate Plans</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage inventory, categories, cleaning states, and room availability
          </p>
        </div>

        {canManageRooms && (
          <div className="flex items-center gap-2.5">
            <Button variant="outline" size="sm" icon={Tag} onClick={() => setIsAddTypeOpen(true)}>
              New Category
            </Button>
            <Button variant="primary" size="sm" icon={PlusCircle} onClick={() => setIsAddRoomOpen(true)}>
              Add Room
            </Button>
          </div>
        )}
      </div>

      {message && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('rooms')}
          className={`py-3 px-6 font-semibold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'rooms'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <DoorClosed className="w-4 h-4" />
          <span>All Rooms ({rooms.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`py-3 px-6 font-semibold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'categories'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <BedDouble className="w-4 h-4" />
          <span>Room Categories ({roomTypes.length})</span>
        </button>
      </div>

      {activeTab === 'rooms' && (
        <>
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/80">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by room # or type..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            <div className="flex items-center gap-2 min-w-[320px]">
              <Select
                size="sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All Room Statuses' },
                  { value: 'available', label: 'Available' },
                  { value: 'occupied', label: 'Occupied' },
                  { value: 'reserved', label: 'Reserved' },
                  { value: 'out_of_service', label: 'Out of Service' }
                ]}
              />
              <Select
                size="sm"
                value={housekeepingFilter}
                onChange={(e) => setHousekeepingFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All Housekeeping' },
                  { value: 'clean', label: 'Clean' },
                  { value: 'dirty', label: 'Dirty' },
                  { value: 'cleaning_in_progress', label: 'In Progress' },
                  { value: 'inspected', label: 'Inspected' }
                ]}
              />
            </div>
          </div>

          {/* Rooms Grid */}
          {loading ? (
            <LoadingSpinner text="Loading rooms..." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredRooms.map((room) => (
                <Card key={room._id} className="hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-black text-slate-900">
                          #{room.roomNumber}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                          Floor {room.floor}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-brand-700 mt-0.5">
                        {room.roomTypeId?.name || 'Standard'}
                      </p>
                    </div>

                    <Badge variant={room.roomStatus}>{room.roomStatus}</Badge>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        Housekeeping
                      </p>
                      <Badge variant={room.housekeepingStatus} size="sm" className="mt-1">
                        {room.housekeepingStatus}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        Nightly Rate
                      </p>
                      <span className="font-bold text-slate-900 text-sm">
                        ${room.roomTypeId?.basePrice || 0}
                      </span>
                    </div>
                  </div>

                  {/* Quick Status Toggle Menu */}
                  <div className="mt-4 pt-2 border-t border-slate-50 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-medium">Status:</span>
                    <Select
                      size="sm"
                      className="w-[150px]"
                      value={room.roomStatus}
                      onChange={(e) => handleStatusChange(room._id, e.target.value)}
                      options={[
                        { value: 'available', label: 'Available' },
                        { value: 'occupied', label: 'Occupied' },
                        { value: 'reserved', label: 'Reserved' },
                        { value: 'out_of_service', label: 'Out of Service' }
                      ]}
                    />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roomTypes.map((type) => (
            <Card key={type._id} className="overflow-hidden">
              {type.images?.[0] && (
                <div className="h-44 -mx-6 -mt-6 mb-4 overflow-hidden relative">
                  <img
                    src={type.images[0]}
                    alt={type.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-md text-white text-xs font-bold px-2.5 py-1 rounded-full">
                    ${type.basePrice} / night
                  </div>
                </div>
              )}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{type.name}</h3>
                  <span className="text-xs text-brand-600 font-mono font-semibold uppercase">
                    Code: {type.code}
                  </span>
                </div>
                {!type.images?.[0] && (
                  <span className="text-base font-black text-slate-900">
                    ${type.basePrice}
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-600 mt-2 line-clamp-2">{type.description}</p>

              <div className="mt-3 flex items-center gap-3 text-xs text-slate-500 font-medium">
                <span>Max: {type.maxOccupancy} Guests</span>
                <span>•</span>
                <span>{type.bedConfiguration}</span>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-1.5">
                {type.amenities?.map((am, i) => (
                  <span
                    key={i}
                    className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded"
                  >
                    {am}
                  </span>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Room Modal */}
      <Modal
        isOpen={isAddRoomOpen}
        onClose={() => setIsAddRoomOpen(false)}
        title="Add New Room"
        subtitle="Create an individual room unit"
      >
        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
            {error}
          </div>
        )}
        <form onSubmit={handleCreateRoom} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Room Number"
              required
              value={roomFormData.roomNumber}
              onChange={(e) => setRoomFormData({ ...roomFormData, roomNumber: e.target.value })}
              placeholder="e.g. 501"
            />
            <Input
              label="Floor Level"
              required
              value={roomFormData.floor}
              onChange={(e) => setRoomFormData({ ...roomFormData, floor: e.target.value })}
              placeholder="5"
            />
          </div>

          <Select
            label="Room Category"
            required
            value={roomFormData.roomTypeId}
            onChange={(e) => setRoomFormData({ ...roomFormData, roomTypeId: e.target.value })}
          >
            <option value="">-- Select Room Category --</option>
            {roomTypes.map((t) => (
              <option key={t._id} value={t._id}>
                {t.name} (${t.basePrice}/night)
              </option>
            ))}
          </Select>

          <Input
            label="Internal Notes / Features"
            value={roomFormData.notes}
            onChange={(e) => setRoomFormData({ ...roomFormData, notes: e.target.value })}
            placeholder="Corner unit, city view, adjoining door"
          />

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="secondary" type="button" onClick={() => setIsAddRoomOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={!roomFormData.roomTypeId}>
              Create Room
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Category Modal */}
      <Modal
        isOpen={isAddTypeOpen}
        onClose={() => setIsAddTypeOpen(false)}
        title="Add Room Category"
        subtitle="Define room specifications and baseline pricing"
      >
        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
            {error}
          </div>
        )}
        <form onSubmit={handleCreateType} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Category Name"
              required
              value={typeFormData.name}
              onChange={(e) => setTypeFormData({ ...typeFormData, name: e.target.value })}
              placeholder="Ocean Panoramic Suite"
            />
            <Input
              label="Category Code"
              required
              value={typeFormData.code}
              onChange={(e) => setTypeFormData({ ...typeFormData, code: e.target.value })}
              placeholder="OPS"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Base Price per Night ($)"
              type="number"
              required
              value={typeFormData.basePrice}
              onChange={(e) => setTypeFormData({ ...typeFormData, basePrice: e.target.value })}
              placeholder="250"
            />
            <Input
              label="Max Occupancy"
              type="number"
              value={typeFormData.maxOccupancy}
              onChange={(e) => setTypeFormData({ ...typeFormData, maxOccupancy: e.target.value })}
            />
          </div>

          <Input
            label="Bed Configuration"
            value={typeFormData.bedConfiguration}
            onChange={(e) => setTypeFormData({ ...typeFormData, bedConfiguration: e.target.value })}
            placeholder="1 California King Bed"
          />

          <Input
            label="Amenities (comma-separated)"
            value={typeFormData.amenities}
            onChange={(e) => setTypeFormData({ ...typeFormData, amenities: e.target.value })}
          />

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="secondary" type="button" onClick={() => setIsAddTypeOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Category
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
