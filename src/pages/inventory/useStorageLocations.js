import { useCallback, useEffect, useState } from 'react';
import api, { showApiErrorToast } from '../../api/axios';

export const useStorageLocations = ({ includeInactive = false } = {}) => {
  const [storageLocations, setStorageLocations] = useState([]);
  const [storageLocationsLoading, setStorageLocationsLoading] = useState(true);

  const loadStorageLocations = useCallback(async () => {
    setStorageLocationsLoading(true);
    try {
      const response = await api.get('/inventory/storage-locations', {
        params: includeInactive ? { includeInactive: 'true' } : undefined
      });
      setStorageLocations(response.data.data || []);
    } catch (error) {
      showApiErrorToast(error, 'Failed to load storage locations');
    } finally {
      setStorageLocationsLoading(false);
    }
  }, [includeInactive]);

  useEffect(() => {
    loadStorageLocations();
  }, [loadStorageLocations]);

  const storageLocationOptions = storageLocations.map((location) => ({
    label: `${location.locationName} · ${location.locationTypeId?.name || 'Storage'}`,
    value: String(location._id)
  }));
  const storageLocationById = (id) => storageLocations.find(
    (location) => String(location._id) === String(id)
  );

  return {
    storageLocations,
    storageLocationsLoading,
    storageLocationOptions,
    storageLocationById,
    loadStorageLocations
  };
};
