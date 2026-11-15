import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MapPin, Pencil, Plus, ToggleLeft, ToggleRight } from 'lucide-react';
import api, { showApiErrorToast } from '../../api/axios';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';

const EMPTY_FORM = { locationName: '', locationTypeId: '', description: '' };

export const StorageLocationMasterPage = () => {
  const [types, setTypes] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [typeResponse, locationResponse] = await Promise.all([
        api.get('/inventory/storage-location-types'),
        api.get('/inventory/storage-locations', { params: { includeInactive: 'true' } })
      ]);
      setTypes(typeResponse.data.data || []);
      setLocations(locationResponse.data.data || []);
    } catch (error) {
      showApiErrorToast(error, 'Failed to load storage location master');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visibleLocations = useMemo(() => locations.filter((location) => {
    const matchesType = !typeFilter || String(location.locationTypeId?._id) === typeFilter;
    const searchText = `${location.locationName} ${location.description || ''} ${location.locationTypeId?.name || ''}`.toLowerCase();
    return matchesType && searchText.includes(search.trim().toLowerCase());
  }), [locations, search, typeFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, locationTypeId: typeFilter || types[0]?._id || '' });
    setModalOpen(true);
  };

  const openEdit = (location) => {
    setEditing(location);
    setForm({
      locationName: location.locationName,
      locationTypeId: String(location.locationTypeId?._id || ''),
      description: location.description || ''
    });
    setModalOpen(true);
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/inventory/storage-locations/${editing._id}`, form);
      } else {
        await api.post('/inventory/storage-locations', form);
      }
      setModalOpen(false);
      await load();
    } catch (error) {
      showApiErrorToast(error, 'Failed to save storage location');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (location) => {
    try {
      await api.patch(`/inventory/storage-locations/${location._id}`, { isActive: !location.isActive });
      await load();
    } catch (error) {
      showApiErrorToast(error, 'Failed to update storage location');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-orvelle-champagne">
            <MapPin size={16} /> Inventory settings
          </div>
          <h1 className="text-2xl font-bold text-orvelle-primary sm:text-3xl">Storage locations</h1>
          <p className="mt-1 max-w-2xl text-sm text-orvelle-muted">
            Manage hotel storage areas once and select them consistently across stock, purchasing, verification, and production.
          </p>
        </div>
        <Button onClick={openCreate} disabled={!types.length}>
          <Plus size={16} className="mr-2" /> Add location
        </Button>
      </header>

      <Card className="space-y-4 p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_260px]">
          <Input
            label="Search locations"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, type, or description"
          />
          <Select
            label="Location type"
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            options={[
              { label: 'All types', value: '' },
              ...types.map((type) => ({ label: type.name, value: String(type._id) }))
            ]}
          />
        </div>
      </Card>

      {visibleLocations.length === 0 ? (
        <Card className="p-10 text-center">
          <MapPin className="mx-auto mb-3 text-orvelle-champagne" size={28} />
          <h2 className="font-semibold text-orvelle-primary">No storage locations found</h2>
          <p className="mt-1 text-sm text-orvelle-muted">Create a location or adjust your search filters.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleLocations.map((location) => (
            <Card key={location._id} className="flex min-w-0 flex-col gap-4 p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="rounded-xl bg-orvelle-champagne/10 p-2.5 text-orvelle-champagne">
                    <MapPin size={18} />
                  </span>
                  <div className="min-w-0">
                    <h2 className="break-words font-semibold text-orvelle-primary">{location.locationName}</h2>
                    <p className="mt-0.5 text-sm text-orvelle-muted">{location.locationTypeId?.name || 'Storage'}</p>
                  </div>
                </div>
                <Badge variant={location.isActive ? 'success' : 'neutral'}>{location.isActive ? 'Active' : 'Inactive'}</Badge>
              </div>
              <p className="min-h-10 break-words text-sm text-orvelle-muted">
                {location.description || 'No description provided.'}
              </p>
              <div className="mt-auto flex flex-wrap justify-end gap-2 border-t border-orvelle-border/60 pt-3">
                <Button variant="outline" size="sm" onClick={() => openEdit(location)}>
                  <Pencil size={14} className="mr-1.5" /> Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => toggleActive(location)}>
                  {location.isActive ? <ToggleRight size={15} className="mr-1.5" /> : <ToggleLeft size={15} className="mr-1.5" />}
                  {location.isActive ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit storage location' : 'Add storage location'}
        subtitle="Location types are predefined and shared across the hotel."
      >
        <form onSubmit={save} className="space-y-4">
          <Select
            label="Location type"
            required
            searchable
            value={form.locationTypeId}
            onChange={(event) => setForm({ ...form, locationTypeId: event.target.value })}
            options={types.map((type) => ({ label: type.name, value: String(type._id) }))}
          />
          <Input
            label="Location name"
            required
            maxLength={120}
            value={form.locationName}
            onChange={(event) => setForm({ ...form, locationName: event.target.value })}
            placeholder="e.g. Kitchen Store - Ground Floor"
          />
          <Input
            label="Description"
            maxLength={500}
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            placeholder="Optional notes about this location"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : editing ? 'Save changes' : 'Create location'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
