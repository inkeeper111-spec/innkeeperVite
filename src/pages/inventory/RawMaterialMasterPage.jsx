import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, FolderPlus, Pencil, Plus, Search, ToggleLeft, ToggleRight } from 'lucide-react';
import api, { showApiErrorToast } from '../../api/axios';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { useAuth } from '../../contexts/AuthContext';
import { getUnitConversionFactor, isPackageUnit, supportedUnitConversionFactorToBase } from './inventoryUnits';
import dayjs from 'dayjs';

const EMPTY_CATEGORY = { name: '', categoryCode: '', description: '', isActive: true };
const EMPTY_SUBCATEGORY = { categoryId: '', name: '', isActive: true };
const EMPTY_MATERIAL = {
  name: '',
  categoryId: '',
  subcategoryId: '',
  description: '',
  storageType: '',
  location: 'Main Store',
  isActive: true,
  minimumStockLevel: 0,
  reorderLevel: 0,
  desiredStockLevel: '',
  minimumStockUnitId: '',
  reorderLevelUnitId: '',
  desiredStockUnitId: '',
  preferredSupplierId: '',
  baseUnitId: '',
  supportedUnits: []
};
const MEASUREMENT_CATEGORIES = ['weight', 'volume', 'quantity'];
const listFrom = (response, key) => {
  const data = response?.data?.data;
  if (Array.isArray(data)) return data;
  return data?.[key] || [];
};
const unitId = (unit) => String(unit?._id || unit?.id || unit || '');
const supportedUnitRef = (entry) => typeof entry?.unitId === 'object'
  ? entry.unitId?._id || entry.unitId?.id
  : entry?.unitId;

const getSupportedUnit = (entry, units) => {
  const id = String(supportedUnitRef(entry) || '');
  const unit = units.find((candidate) => unitId(candidate) === id);
  return unit || (typeof entry?.unitId === 'object' ? entry.unitId : null);
};

const normalizeMaterialForm = (material, units = []) => {
  const baseUnitId = String(material.baseUnitId?._id || material.baseUnitId || '');
  const supportedUnits = (material.supportedUnits || []).filter((entry) => {
    const unit = getSupportedUnit(entry, units);
    return !isPackageUnit(unit)
      && !isPackageUnit({ symbol: entry?.unitSymbolSnapshot });
  }).map((entry) => ({
    _id: entry._id,
    unitId: String(supportedUnitRef(entry) || ''),
    conversionFactorToBase: entry.conversionFactorToBase ?? '',
    isDefaultPurchaseUnit: Boolean(entry.isDefaultPurchaseUnit),
    isActive: entry.isActive !== false
  }));
  const defaultStockUnit = supportedUnits.find((entry) => (
    entry.isActive !== false && entry.isDefaultPurchaseUnit && entry.unitId !== baseUnitId
  )) || supportedUnits.find((entry) => (
    entry.isActive !== false && entry.unitId !== baseUnitId
  ));
  const stockUnitId = defaultStockUnit?.unitId || '';
  const storedFactor = Number(material.supportedUnits?.find((entry) => (
    String(supportedUnitRef(entry) || '') === stockUnitId && entry.isActive !== false
  ))?.conversionFactorToBase);
  const factorToBase = stockUnitId
    ? (storedFactor > 0 ? storedFactor : null)
      || getUnitConversionFactor(getSupportedUnit({ unitId: stockUnitId }, units), getSupportedUnit({ unitId: baseUnitId }, units), units)
      || supportedUnitConversionFactorToBase(stockUnitId, material.supportedUnits || [], baseUnitId, units)
    : null;
  const baseMinimum = material.minimumStockLevel ?? material.minStockThreshold ?? 0;
  const baseReorder = material.reorderLevel ?? material.reorderQuantity ?? 0;
  return {
    ...EMPTY_MATERIAL,
    ...material,
    categoryId: String(material.categoryId?._id || material.categoryId || ''),
    subcategoryId: String(material.subcategoryId?._id || material.subcategoryId || ''),
    baseUnitId,
    location: material.location || 'Main Store',
    minimumStockLevel: factorToBase > 0 ? Number(baseMinimum) / factorToBase : baseMinimum,
    reorderLevel: factorToBase > 0 ? Number(baseReorder) / factorToBase : baseReorder,
    desiredStockLevel: factorToBase > 0
      ? Number(material.maxStockLevel || 0) / factorToBase
      : Number(material.maxStockLevel || 0),
    minimumStockUnitId: stockUnitId,
    reorderLevelUnitId: stockUnitId,
    desiredStockUnitId: stockUnitId,
    preferredSupplierId: String(material.vendorId?._id || material.vendorId || ''),
    supportedUnits
  };
};

export const RawMaterialMasterPage = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const canManage = ['hotel_admin', 'super_admin'].includes(user?.role);
  const isCategoriesPage = location.pathname.endsWith('/raw-material-categories');
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [units, setUnits] = useState([]);
  const [expandedMaterialId, setExpandedMaterialId] = useState('');
  const [batchesByMaterial, setBatchesByMaterial] = useState({});
  const [loadingBatchesByMaterial, setLoadingBatchesByMaterial] = useState({});
  const [batchErrorsByMaterial, setBatchErrorsByMaterial] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [categoryForm, setCategoryForm] = useState(EMPTY_CATEGORY);
  const [subcategoryForm, setSubcategoryForm] = useState(EMPTY_SUBCATEGORY);
  const [materialForm, setMaterialForm] = useState(EMPTY_MATERIAL);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingSubcategory, setEditingSubcategory] = useState(null);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [subcategoryModalOpen, setSubcategoryModalOpen] = useState(false);
  const [materialModalOpen, setMaterialModalOpen] = useState(false);
  const [unitModalOpen, setUnitModalOpen] = useState(false);
  const [unitSaving, setUnitSaving] = useState(false);
  const [unitForm, setUnitForm] = useState({
    name: '',
    symbol: '',
    category: 'weight',
    baseUnitId: '',
    conversionFactor: '',
    description: ''
  });

  const baseUnit = units.find((unit) => unitId(unit) === String(materialForm.baseUnitId));
  const validBaseUnits = units.filter((unit) => unit.isActive
    && MEASUREMENT_CATEGORIES.includes(unit.category)
    && !isPackageUnit(unit));
  const validPurchaseUnits = units.filter((unit) => (
    unit.isActive
      && !isPackageUnit(unit)
      && baseUnit
      && MEASUREMENT_CATEGORIES.includes(unit.category)
      && getUnitConversionFactor(unit, baseUnit, units) > 0
  ));
  const visibleMaterials = useMemo(() => {
    const query = search.trim().toLowerCase();
    return materials.filter((material) => !query || [
      material.name,
      material.categoryId?.name,
      material.subcategoryId?.name,
      material.description
    ].some((value) => String(value || '').toLowerCase().includes(query)));
  }, [materials, search]);

  const loadSubcategories = async (categoryId) => {
    if (!categoryId) {
      setSubcategories([]);
      return [];
    }
    try {
      const { data } = await api.get('/inventory/raw-materials/subcategories', {
        params: { categoryId, ...(canManage ? { includeInactive: true } : {}) }
      });
      const rows = listFrom({ data }, 'subcategories');
      setSubcategories(rows);
      return rows;
    } catch (error) {
      showApiErrorToast(error, 'Could not load subcategories');
      return [];
    }
  };

  const loadMasterData = async () => {
    setLoading(true);
    try {
      const [categoryResponse, materialResponse, unitResponse, vendorResponse] = await Promise.all([
        api.get('/inventory/raw-materials/categories', { params: canManage ? { includeInactive: true } : {} }),
        api.get('/inventory/raw-materials', { params: canManage ? { includeInactive: true } : {} }),
        api.get('/inventory/units', { params: { includeInactive: true } }),
        api.get('/inventory/vendors')
      ]);
      setCategories(listFrom(categoryResponse, 'categories'));
      setMaterials(listFrom(materialResponse, 'materials'));
      setVendors(listFrom(vendorResponse, 'vendors'));
      let availableUnits = listFrom(unitResponse, 'units');
      if (!availableUnits.length && canManage) {
        try {
          const defaultsResponse = await api.post('/inventory/units/defaults');
          availableUnits = listFrom(defaultsResponse, 'units');
          if (!availableUnits.length) {
            const refreshedUnits = await api.get('/inventory/units', { params: { includeInactive: true } });
            availableUnits = listFrom(refreshedUnits, 'units');
          }
        } catch (error) {
          showApiErrorToast(error, 'Could not provision standard inventory units');
        }
      }
      setUnits(availableUnits);
    } catch (error) {
      showApiErrorToast(error, 'Could not load raw material master');
    } finally {
      setLoading(false);
    }
  };

  const loadMaterialBatches = async (materialId) => {
    setLoadingBatchesByMaterial((current) => ({ ...current, [materialId]: true }));
    setBatchErrorsByMaterial((current) => ({ ...current, [materialId]: '' }));
    try {
      const { data } = await api.get('/inventory/batches', { params: { itemId: materialId } });
      setBatchesByMaterial((current) => ({ ...current, [materialId]: data.data || [] }));
    } catch (error) {
      setBatchErrorsByMaterial((current) => ({
        ...current,
        [materialId]: 'Could not load batch details. Please try again.'
      }));
      showApiErrorToast(error, 'Could not load raw material batches');
    } finally {
      setLoadingBatchesByMaterial((current) => ({ ...current, [materialId]: false }));
    }
  };

  const toggleMaterialBatches = (materialId) => {
    if (expandedMaterialId === materialId) {
      setExpandedMaterialId('');
      return;
    }
    setExpandedMaterialId(materialId);
    if (!Object.prototype.hasOwnProperty.call(batchesByMaterial, materialId) || batchErrorsByMaterial[materialId]) {
      loadMaterialBatches(materialId);
    }
  };

  useEffect(() => {
    loadMasterData();
  }, [canManage]);

  useEffect(() => {
    if (!materialForm.categoryId) {
      setSubcategories([]);
      return;
    }
    loadSubcategories(materialForm.categoryId);
  }, [materialForm.categoryId, canManage]);

  const resetCategory = () => {
    setEditingCategory(null);
    setCategoryForm(EMPTY_CATEGORY);
    setCategoryModalOpen(false);
  };

  const resetSubcategory = () => {
    setEditingSubcategory(null);
    setSubcategoryForm(EMPTY_SUBCATEGORY);
    setSubcategoryModalOpen(false);
  };

  const openNewMaterial = () => {
    setEditingMaterial(null);
    setMaterialForm(EMPTY_MATERIAL);
    setMaterialModalOpen(true);
  };

  const openEditMaterial = async (material) => {
    setEditingMaterial(material);
    setMaterialForm(normalizeMaterialForm(material, units));
    setMaterialModalOpen(true);
    await loadSubcategories(String(material.categoryId?._id || material.categoryId || ''));
  };

  const saveCategory = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (editingCategory) {
        await api.patch(`/inventory/raw-materials/categories/${editingCategory._id}`, categoryForm);
      } else {
        await api.post('/inventory/raw-materials/categories', categoryForm);
      }
      resetCategory();
      await loadMasterData();
    } catch (error) {
      showApiErrorToast(error, 'Could not save category');
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = async (category) => {
    try {
      await api.patch(`/inventory/raw-materials/categories/${category._id}`, { isActive: !category.isActive });
      await loadMasterData();
    } catch (error) {
      showApiErrorToast(error, 'Could not update category status');
    }
  };

  const saveSubcategory = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = { ...subcategoryForm, categoryId: subcategoryForm.categoryId || selectedCategoryId };
      if (editingSubcategory) {
        await api.patch(`/inventory/raw-materials/subcategories/${editingSubcategory._id}`, payload);
      } else {
        await api.post('/inventory/raw-materials/subcategories', payload);
      }
      resetSubcategory();
      await loadSubcategories(payload.categoryId);
    } catch (error) {
      showApiErrorToast(error, 'Could not save subcategory');
    } finally {
      setSaving(false);
    }
  };

  const toggleSubcategory = async (subcategory) => {
    try {
      await api.patch(`/inventory/raw-materials/subcategories/${subcategory._id}`, { isActive: !subcategory.isActive });
      await loadSubcategories(String(subcategory.categoryId?._id || subcategory.categoryId || selectedCategoryId));
    } catch (error) {
      showApiErrorToast(error, 'Could not update subcategory status');
    }
  };

  const setMaterialCategory = (categoryId) => {
    setMaterialForm((current) => ({ ...current, categoryId, subcategoryId: '' }));
    setSubcategories([]);
  };

  const togglePurchaseUnit = (selectedUnit) => {
    const selectedId = unitId(selectedUnit);
    setMaterialForm((current) => {
      const updateThresholdUnits = (supportedUnits) => {
        const preferredUnitId = supportedUnits.find((entry) => (
          entry.isActive !== false && entry.isDefaultPurchaseUnit && entry.unitId !== current.baseUnitId
        ))?.unitId || supportedUnits.find((entry) => (
          entry.isActive !== false && entry.unitId !== current.baseUnitId
        ))?.unitId || '';
        const next = { ...current, supportedUnits };
        for (const [valueKey, unitKey] of [
          ['minimumStockLevel', 'minimumStockUnitId'],
          ['reorderLevel', 'reorderLevelUnitId'],
          ['desiredStockLevel', 'desiredStockUnitId']
        ]) {
          const currentUnitAvailable = supportedUnits.some((entry) => (
            entry.unitId === current[unitKey] && entry.isActive !== false
          ));
          if (currentUnitAvailable || current[unitKey] === '') {
            next[unitKey] = current[unitKey] || preferredUnitId;
            continue;
          }
          const nextUnitId = preferredUnitId;
          const previousFactor = thresholdUnitFactor(current[unitKey], current.supportedUnits, current.baseUnitId);
          const nextFactor = thresholdUnitFactor(nextUnitId, supportedUnits, current.baseUnitId);
          if (previousFactor > 0 && nextFactor > 0 && current[valueKey] !== ''
            && Number.isFinite(Number(current[valueKey]))) {
            next[valueKey] = Number(current[valueKey]) * previousFactor / nextFactor;
          }
          next[unitKey] = nextUnitId;
        }
        return next;
      };
      const alreadySelected = current.supportedUnits.some((entry) => (
        entry.unitId === selectedId && entry.isActive !== false
      ));
      if (alreadySelected) {
        const remaining = current.supportedUnits.filter((entry) => entry.unitId !== selectedId);
        const updatedUnits = remaining.some((entry) => entry.isDefaultPurchaseUnit && entry.isActive !== false)
            ? remaining
            : remaining.map((entry, index) => ({
              ...entry,
              isDefaultPurchaseUnit: entry.isActive !== false
                && remaining.findIndex((candidate) => candidate.isActive !== false) === index
            }));
        return updateThresholdUnits(updatedUnits);
      }
      const hasActiveDefault = current.supportedUnits.some((entry) => (
        entry.isDefaultPurchaseUnit && entry.isActive !== false
      ));
      const inactiveEntry = current.supportedUnits.find((entry) => entry.unitId === selectedId);
      if (inactiveEntry) {
        return updateThresholdUnits(current.supportedUnits.map((entry) => entry === inactiveEntry ? {
            ...entry,
            conversionFactorToBase: getUnitConversionFactor(selectedUnit, baseUnit, units) ?? '',
            isDefaultPurchaseUnit: !hasActiveDefault,
            isActive: true
          } : entry));
      }
      const nextEntry = {
        unitId: selectedId,
        conversionFactorToBase: getUnitConversionFactor(selectedUnit, baseUnit, units) ?? '',
        isDefaultPurchaseUnit: !hasActiveDefault,
        isActive: true
      };
      return updateThresholdUnits([...current.supportedUnits, nextEntry]);
    });
  };

  const saveUnit = async (event) => {
    event.preventDefault();
    if (unitForm.baseUnitId && !(Number(unitForm.conversionFactor) > 0)) {
      showApiErrorToast(new Error('Enter a positive conversion factor'), 'Conversion factor must be greater than zero');
      return;
    }
    setUnitSaving(true);
    try {
      const { data } = await api.post('/inventory/units', {
        ...unitForm,
        baseUnitId: unitForm.baseUnitId || null,
        conversionFactor: unitForm.baseUnitId ? Number(unitForm.conversionFactor) : null
      });
      setUnits((current) => [...current.filter((unit) => unitId(unit) !== unitId(data.data)), data.data]);
      setUnitModalOpen(false);
      setUnitForm({ name: '', symbol: '', category: 'weight', baseUnitId: '', conversionFactor: '', description: '' });
    } catch (error) {
      showApiErrorToast(error, 'Could not create inventory unit');
    } finally {
      setUnitSaving(false);
    }
  };

  const computedFactor = (entry) => {
    if (!baseUnit) return null;
    const selectedUnit = units.find((unit) => unitId(unit) === String(entry.unitId));
    return getUnitConversionFactor(selectedUnit, baseUnit, units)
      || supportedUnitConversionFactorToBase(entry.unitId, materialForm.supportedUnits, materialForm.baseUnitId, units);
  };

  const thresholdUnitFactor = (selectedUnitId, supportedUnits = materialForm.supportedUnits, baseUnitId = materialForm.baseUnitId) => {
    if (!selectedUnitId || !baseUnitId) return null;
    const configuredFactor = Number(supportedUnits.find((entry) => (
      String(entry.unitId) === String(selectedUnitId) && entry.isActive !== false
    ))?.conversionFactorToBase);
    if (configuredFactor > 0) return configuredFactor;
    const selectedUnit = units.find((unit) => unitId(unit) === String(selectedUnitId));
    const selectedBaseUnit = units.find((unit) => unitId(unit) === String(baseUnitId));
    return getUnitConversionFactor(selectedUnit, selectedBaseUnit, units)
      || supportedUnitConversionFactorToBase(selectedUnitId, supportedUnits, baseUnitId, units);
  };

  const changeThresholdUnit = (valueKey, unitKey, nextUnitId) => {
    setMaterialForm((current) => {
      const previousFactor = thresholdUnitFactor(current[unitKey], current.supportedUnits, current.baseUnitId);
      const nextFactor = thresholdUnitFactor(nextUnitId, current.supportedUnits, current.baseUnitId);
      const quantity = current[valueKey];
      return {
        ...current,
        [valueKey]: previousFactor > 0 && nextFactor > 0 && quantity !== ''
          ? Number(quantity) * previousFactor / nextFactor
          : quantity,
        [unitKey]: nextUnitId
      };
    });
  };

  const saveMaterial = async (event) => {
    event.preventDefault();
    if (!materialForm.supportedUnits.some((entry) => (
      entry.isDefaultPurchaseUnit && entry.isActive !== false
    ))) {
      showApiErrorToast(new Error('Choose a default purchase unit'), 'A default purchase unit is required');
      return;
    }
    if (materialForm.supportedUnits.some((entry) => !(computedFactor(entry) > 0))) {
      showApiErrorToast(new Error('Configure valid conversions for every purchase unit'), 'Complete each purchase-unit conversion without circular measurements');
      return;
    }
    if (!(thresholdUnitFactor(materialForm.minimumStockUnitId) > 0)
      || !(thresholdUnitFactor(materialForm.reorderLevelUnitId) > 0)
      || (Number(materialForm.desiredStockLevel) > 0 && !(thresholdUnitFactor(materialForm.desiredStockUnitId) > 0))) {
      showApiErrorToast(new Error('Choose a valid purchase unit for each stock threshold'), 'Select a compatible purchase unit for minimum stock and reorder level');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: materialForm.name.trim(),
        categoryId: materialForm.categoryId,
        subcategoryId: materialForm.subcategoryId || null,
        description: materialForm.description.trim(),
        storageType: materialForm.storageType,
        location: materialForm.location,
        isActive: Boolean(materialForm.isActive),
        minimumStockLevel: Number(materialForm.minimumStockLevel || 0)
          * thresholdUnitFactor(materialForm.minimumStockUnitId),
        reorderLevel: Number(materialForm.reorderLevel || 0)
          * thresholdUnitFactor(materialForm.reorderLevelUnitId),
        maxStockLevel: Number(materialForm.desiredStockLevel || 0)
          * (thresholdUnitFactor(materialForm.desiredStockUnitId) || 1),
        vendorId: materialForm.preferredSupplierId || null,
        baseUnitId: materialForm.baseUnitId,
        supportedUnits: materialForm.supportedUnits.map((entry) => ({
          ...(entry._id ? { _id: entry._id } : {}),
          unitId: entry.unitId,
          conversionFactorToBase: Number(computedFactor(entry)),
          isDefaultPurchaseUnit: Boolean(entry.isDefaultPurchaseUnit),
          isActive: Boolean(entry.isActive)
        }))
      };
      if (editingMaterial) {
        await api.patch(`/inventory/raw-materials/${editingMaterial._id}`, payload);
      } else {
        await api.post('/inventory/raw-materials', payload);
      }
      setMaterialModalOpen(false);
      setEditingMaterial(null);
      await loadMasterData();
    } catch (error) {
      showApiErrorToast(error, 'Could not save raw material');
    } finally {
      setSaving(false);
    }
  };

  const toggleMaterial = async (material) => {
    try {
      await api.patch(`/inventory/raw-materials/${material._id}`, { isActive: !material.isActive });
      await loadMasterData();
    } catch (error) {
      showApiErrorToast(error, 'Could not update raw material status');
    }
  };

  if (loading) return <LoadingSpinner text="Loading raw material master..." />;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <button type="button" onClick={() => navigate('/inventory/dashboard')} aria-label="Back to inventory dashboard" className="mt-1 rounded-lg p-2 text-slate-500 hover:bg-white hover:text-slate-900">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">Inventory setup</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">{isCategoriesPage ? 'Raw Material Categories' : 'Raw Materials'}</h1>
            <p className="mt-1 text-sm text-slate-500">Manage categories, stock units, and purchase conversions.</p>
          </div>
        </div>
        {canManage && (isCategoriesPage
          ? <Button icon={FolderPlus} onClick={() => { setEditingCategory(null); setCategoryForm(EMPTY_CATEGORY); setCategoryModalOpen(true); }}>Add category</Button>
          : <Button icon={Plus} onClick={openNewMaterial}>Add raw material</Button>)}
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        <button type="button" onClick={() => navigate('/inventory/raw-materials')} className={`border-b-2 px-4 py-2 text-sm font-semibold ${!isCategoriesPage ? 'border-amber-600 text-amber-800' : 'border-transparent text-slate-500'}`}>Raw materials</button>
        {canManage && <button type="button" onClick={() => navigate('/inventory/raw-material-categories')} className={`border-b-2 px-4 py-2 text-sm font-semibold ${isCategoriesPage ? 'border-amber-600 text-amber-800' : 'border-transparent text-slate-500'}`}>Categories</button>}
      </div>

      {isCategoriesPage ? (
        <Card title="Categories and subcategories" subtitle="Keep category codes and activation status consistent across purchasing and stock records.">
          <div className="space-y-4">
            {categories.map((category) => (
              <section key={category._id} className="rounded-xl border border-slate-200">
                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <button type="button" onClick={async () => {
                    if (selectedCategoryId === category._id) {
                      setSelectedCategoryId('');
                      setSubcategories([]);
                    } else {
                      setSelectedCategoryId(category._id);
                      await loadSubcategories(category._id);
                    }
                  }} className="min-w-0 text-left">
                    <span className="flex flex-wrap items-center gap-2 font-semibold text-slate-900">{category.name}<Badge variant={category.isActive ? 'active' : 'default'}>{category.isActive ? 'Active' : 'Inactive'}</Badge></span>
                    <span className="mt-1 block text-xs text-slate-500">{category.categoryCode || 'No code'}{category.description ? ` · ${category.description}` : ''}</span>
                  </button>
                  {canManage && <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" icon={Plus} onClick={() => {
                      setSelectedCategoryId(category._id);
                      setEditingSubcategory(null);
                      setSubcategoryForm({ ...EMPTY_SUBCATEGORY, categoryId: category._id });
                      setSubcategoryModalOpen(true);
                    }}>Subcategory</Button>
                    <Button size="sm" variant="outline" icon={Pencil} onClick={() => {
                      setEditingCategory(category);
                      setCategoryForm({ name: category.name || '', categoryCode: category.categoryCode || '', description: category.description || '', isActive: category.isActive !== false });
                      setCategoryModalOpen(true);
                    }}>Edit</Button>
                    <Button size="sm" variant="ghost" icon={category.isActive ? ToggleRight : ToggleLeft} onClick={() => toggleCategory(category)}>{category.isActive ? 'Deactivate' : 'Activate'}</Button>
                  </div>}
                </div>
                {selectedCategoryId === category._id && <div className="border-t border-slate-100 px-4 py-3">
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Subcategories</h3>
                  {subcategories.length ? <ul className="divide-y divide-slate-100">{subcategories.map((subcategory) => (
                    <li key={subcategory._id} className="flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between">
                      <span className="flex items-center gap-2 text-sm font-medium">{subcategory.name}<Badge variant={subcategory.isActive ? 'active' : 'default'}>{subcategory.isActive ? 'Active' : 'Inactive'}</Badge></span>
                      {canManage && <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => {
                          setEditingSubcategory(subcategory);
                          setSubcategoryForm({ categoryId: category._id, name: subcategory.name || '', isActive: subcategory.isActive !== false });
                          setSubcategoryModalOpen(true);
                        }}>Edit</Button>
                        <Button size="sm" variant="ghost" icon={subcategory.isActive ? ToggleRight : ToggleLeft} onClick={() => toggleSubcategory(subcategory)}>{subcategory.isActive ? 'Deactivate' : 'Activate'}</Button>
                      </div>}
                    </li>
                  ))}</ul> : <p className="py-2 text-sm text-slate-400">No subcategories yet.</p>}
                </div>}
              </section>
            ))}
            {!categories.length && <p className="py-8 text-center text-sm text-slate-500">No raw material categories found.</p>}
          </div>
        </Card>
      ) : (
        <Card
          title="Raw material master"
          subtitle="Configured purchase units are enforced in purchase entry and stock transactions."
          action={<div className="relative w-full sm:w-64"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search raw materials" placeholder="Search materials..." className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-amber-500 focus:outline-none" /></div>}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead><tr className="border-b border-slate-100 text-xs uppercase text-slate-400"><th className="pb-3">Material</th><th className="pb-3">Category</th><th className="pb-3">Base unit</th><th className="pb-3">Purchase units</th><th className="pb-3">Stock settings</th><th className="pb-3">Status</th>{canManage && <th className="pb-3 text-right">Actions</th>}</tr></thead>
              <tbody className="divide-y divide-slate-100">
                {visibleMaterials.map((material) => {
                  const base = units.find((entry) => unitId(entry) === String(material.baseUnitId?._id || material.baseUnitId));
                  const batches = batchesByMaterial[material._id] || [];
                  const isExpanded = expandedMaterialId === material._id;
                  const batchPanelId = `raw-material-batches-${material._id}`;
                  return <React.Fragment key={material._id}>
                    <tr>
                      <td className="py-3 pr-3">
                        <div className="flex items-start gap-2">
                          <button
                            type="button"
                            onClick={() => toggleMaterialBatches(material._id)}
                            aria-expanded={isExpanded}
                            aria-controls={batchPanelId}
                            aria-label={`${isExpanded ? 'Hide' : 'Show'} batches for ${material.name}`}
                            className="mt-0.5 rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          >
                            <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>
                          <span className="min-w-0">
                            <span className="font-semibold text-slate-900">{material.name}</span>
                            {material.description && <span className="block max-w-xs truncate text-xs text-slate-500">{material.description}</span>}
                          </span>
                        </div>
                      </td>
                      <td className="py-3">{material.categoryId?.name || categories.find((entry) => entry._id === String(material.categoryId))?.name || '—'}{material.subcategoryId?.name && <span className="block text-xs text-slate-500">{material.subcategoryId.name}</span>}</td>
                      <td className="py-3">{base ? `${base.name} (${base.symbol})` : material.baseUnit || '—'}</td>
                      <td className="py-3">{(material.supportedUnits || []).filter((entry) => (
                        !isPackageUnit(getSupportedUnit(entry, units))
                          && !isPackageUnit({ symbol: entry.unitSymbolSnapshot })
                      )).map((entry) => {
                        const unit = getSupportedUnit(entry, units);
                        return <span key={entry._id || supportedUnitRef(entry)} className="mr-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                          {unit?.symbol || entry.unitSymbolSnapshot || 'Unit'}
                          {entry.isDefaultPurchaseUnit ? ' · default' : ''}
                        </span>;
                      })}</td>
                      <td className="py-3 text-xs text-slate-600">
                        Min {material.minimumStockLevel ?? material.minStockThreshold ?? 0} {base?.symbol || ''}
                        {' · Reorder '}{material.reorderLevel ?? material.reorderQuantity ?? 0} {base?.symbol || ''}
                        {Number(material.maxStockLevel) > 0 && <> · Desired {material.maxStockLevel} {base?.symbol || ''}</>}
                      </td>
                      <td className="py-3"><Badge variant={material.isActive ? 'active' : 'default'}>{material.isActive ? 'Active' : 'Inactive'}</Badge></td>
                      {canManage && <td className="py-3 text-right"><div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" icon={Pencil} onClick={() => openEditMaterial(material)}>Edit</Button>
                        <Button size="sm" variant="ghost" icon={material.isActive ? ToggleRight : ToggleLeft} aria-label={`${material.isActive ? 'Deactivate' : 'Activate'} ${material.name}`} onClick={() => toggleMaterial(material)} />
                      </div></td>}
                    </tr>
                    {isExpanded && <tr id={batchPanelId}>
                      <td colSpan={canManage ? 7 : 6} className="bg-slate-50 px-4 py-4">
                        <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Batch details · {material.name}</h3>
                        {loadingBatchesByMaterial[material._id] ? (
                          <p className="text-sm text-slate-500">Loading batches...</p>
                        ) : batchErrorsByMaterial[material._id] ? (
                          <div className="flex flex-wrap items-center gap-3 text-sm text-rose-700">
                            <span>{batchErrorsByMaterial[material._id]}</span>
                            <Button size="sm" variant="outline" onClick={() => loadMaterialBatches(material._id)}>Retry</Button>
                          </div>
                        ) : batches.length ? (
                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[600px] text-left text-sm">
                              <thead>
                                <tr className="border-b border-slate-200 text-xs uppercase text-slate-400">
                                  <th className="pb-2 pr-3">Batch number</th>
                                  <th className="pb-2 pr-3">Quantity</th>
                                  <th className="pb-2 pr-3">Expiry date</th>
                                  <th className="pb-2">Location</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200">
                                {batches.map((batch) => (
                                  <tr key={batch._id}>
                                    <td className="py-2 pr-3 font-medium text-slate-800">{batch.batchNumber || '—'}</td>
                                    <td className="py-2 pr-3 text-slate-700">
                                      {new Intl.NumberFormat(undefined, { maximumFractionDigits: 4 }).format(Number(batch.remainingQuantity) || 0)} {base?.symbol || ''}
                                      <span className="block text-xs text-slate-500">
                                        Received {new Intl.NumberFormat(undefined, { maximumFractionDigits: 4 }).format(Number(batch.quantity) || 0)} {base?.symbol || ''}
                                      </span>
                                    </td>
                                    <td className="py-2 pr-3 text-slate-700">
                                      {batch.expiryDate && dayjs(batch.expiryDate).isValid() ? dayjs(batch.expiryDate).format('MMM D, YYYY') : 'No expiry'}
                                    </td>
                                    <td className="py-2 text-slate-700">{batch.location || '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500">No batches recorded for this raw material.</p>
                        )}
                      </td>
                    </tr>}
                  </React.Fragment>;
                })}
                {!visibleMaterials.length && <tr><td colSpan={canManage ? 7 : 6} className="py-10 text-center text-slate-400">No raw materials match your search.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal isOpen={categoryModalOpen} onClose={resetCategory} title={editingCategory ? 'Edit category' : 'Add category'}>
        <form onSubmit={saveCategory} className="space-y-4">
          <Input label="Category name" required value={categoryForm.name} onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })} />
          <Input label="Category code" value={categoryForm.categoryCode} onChange={(event) => setCategoryForm({ ...categoryForm, categoryCode: event.target.value })} />
          <Input label="Description" value={categoryForm.description} onChange={(event) => setCategoryForm({ ...categoryForm, description: event.target.value })} />
          {editingCategory && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={categoryForm.isActive} onChange={(event) => setCategoryForm({ ...categoryForm, isActive: event.target.checked })} /> Active</label>}
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={resetCategory}>Cancel</Button><Button type="submit" loading={saving}>Save category</Button></div>
        </form>
      </Modal>

      <Modal isOpen={subcategoryModalOpen} onClose={resetSubcategory} title={editingSubcategory ? 'Edit subcategory' : 'Add subcategory'}>
        <form onSubmit={saveSubcategory} className="space-y-4">
          <Select label="Category" required value={subcategoryForm.categoryId || selectedCategoryId} onChange={(event) => setSubcategoryForm({ ...subcategoryForm, categoryId: event.target.value })} options={[{ label: 'Choose category', value: '' }, ...categories.map((category) => ({ label: category.name, value: category._id }))]} />
          <Input label="Subcategory name" required value={subcategoryForm.name} onChange={(event) => setSubcategoryForm({ ...subcategoryForm, name: event.target.value })} />
          {editingSubcategory && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={subcategoryForm.isActive} onChange={(event) => setSubcategoryForm({ ...subcategoryForm, isActive: event.target.checked })} /> Active</label>}
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={resetSubcategory}>Cancel</Button><Button type="submit" loading={saving}>Save subcategory</Button></div>
        </form>
      </Modal>

      <Modal isOpen={materialModalOpen} onClose={() => setMaterialModalOpen(false)} title={editingMaterial ? 'Edit raw material' : 'Add raw material'} subtitle="Set the stockkeeping unit and supported purchase packs." maxWidth="max-w-3xl">
        <form onSubmit={saveMaterial} className="space-y-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Material name" required value={materialForm.name} onChange={(event) => setMaterialForm({ ...materialForm, name: event.target.value })} />
            <Select label="Category" required value={materialForm.categoryId} onChange={(event) => setMaterialCategory(event.target.value)} options={[{ label: 'Choose category', value: '' }, ...categories.filter((entry) => entry.isActive || entry._id === materialForm.categoryId).map((entry) => ({ label: entry.name, value: entry._id }))]} />
            <Select label="Subcategory" value={materialForm.subcategoryId} disabled={!materialForm.categoryId} onChange={(event) => setMaterialForm({ ...materialForm, subcategoryId: event.target.value })} options={[{ label: 'No subcategory', value: '' }, ...subcategories.filter((entry) => entry.isActive || entry._id === materialForm.subcategoryId).map((entry) => ({ label: entry.name, value: entry._id }))]} />
            <Input label="Storage type" value={materialForm.storageType} onChange={(event) => setMaterialForm({ ...materialForm, storageType: event.target.value })} placeholder="Ambient, chilled, frozen..." />
            <Select
              label="Preferred supplier"
              value={materialForm.preferredSupplierId}
              onChange={(event) => setMaterialForm({ ...materialForm, preferredSupplierId: event.target.value })}
              options={[
                { label: 'Choose when reviewing the purchase order', value: '' },
                ...vendors.filter((vendor) => vendor.status === 'active'
                  || vendor._id === materialForm.preferredSupplierId).map((vendor) => ({
                  label: `${vendor.name}${vendor.status === 'active' ? '' : ' (inactive)'}`,
                  value: vendor._id
                }))
              ]}
            />
            <label className="flex items-center gap-2 self-end pb-3 text-sm"><input type="checkbox" checked={materialForm.isActive} onChange={(event) => setMaterialForm({ ...materialForm, isActive: event.target.checked })} /> Active material</label>
          </div>
          <Input label="Description" value={materialForm.description} onChange={(event) => setMaterialForm({ ...materialForm, description: event.target.value })} />
          <section className="rounded-xl border border-orvelle-border bg-white p-3 sm:p-4">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-orvelle-primary">Units for this raw material</h3>
                <p className="mt-1 text-xs text-orvelle-muted">Choose the stock unit and all purchase units accepted for this material.</p>
              </div>
              {canManage && <Button type="button" size="sm" variant="outline" onClick={() => setUnitModalOpen(true)}>Create a unit</Button>}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Select label="Base unit" required value={materialForm.baseUnitId} onChange={(event) => {
                const nextBase = units.find((unit) => unitId(unit) === event.target.value);
                setMaterialForm((current) => ({
                  ...current,
                  baseUnitId: event.target.value,
                  supportedUnits: current.supportedUnits.filter((entry) => {
                    const purchaseUnit = units.find((unit) => unitId(unit) === entry.unitId);
                    return !isPackageUnit(purchaseUnit)
                      && nextBase
                      && getUnitConversionFactor(purchaseUnit, nextBase, units) > 0;
                  }).map((entry) => {
                    const purchaseUnit = units.find((unit) => unitId(unit) === entry.unitId);
                    return {
                      ...entry,
                      conversionFactorToBase: getUnitConversionFactor(purchaseUnit, nextBase, units) ?? ''
                    };
                  })
                }));
              }} options={[{ label: 'Select', value: '' }, ...validBaseUnits.map((entry) => ({ label: `${entry.name} (${entry.symbol})`, value: unitId(entry) }))]} />
              <Input label="Storage location" value={materialForm.location} onChange={(event) => setMaterialForm({ ...materialForm, location: event.target.value })} placeholder="Main Store" />
              <fieldset className="sm:col-span-2">
                <legend className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-orvelle-primary">
                  Purchase units <span className="text-orvelle-error">*</span>
                </legend>
                <p className="mb-2 text-xs text-orvelle-muted">Select all compatible units you accept for this material.</p>
                <div className="grid max-h-48 grid-cols-1 gap-2 overflow-y-auto rounded-lg border border-slate-300 p-3 sm:grid-cols-2">
                  {validPurchaseUnits.map((unit) => {
                    const selected = materialForm.supportedUnits.some((entry) => (
                      entry.unitId === unitId(unit) && entry.isActive !== false
                    ));
                    return <label key={unitId(unit)} className="flex cursor-pointer items-center gap-2 text-sm text-orvelle-text">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => togglePurchaseUnit(unit)}
                        className="rounded border-slate-300 text-orvelle-champagne focus:ring-orvelle-champagne"
                      />
                      <span>{unit.name} ({unit.symbol})</span>
                    </label>;
                  })}
                  {!validPurchaseUnits.length && <span className="text-sm text-orvelle-muted">Select a base unit to see compatible purchase units.</span>}
                </div>
                {materialForm.supportedUnits.some((entry) => entry.isDefaultPurchaseUnit) && (
                  <p className="mt-2 text-xs text-orvelle-muted">
                    Default purchase unit: {(() => {
                      const selected = materialForm.supportedUnits.find((entry) => entry.isDefaultPurchaseUnit);
                      const selectedUnit = units.find((unit) => unitId(unit) === selected.unitId);
                      return `${selectedUnit?.name} (${selectedUnit?.symbol})`;
                    })()}
                  </p>
                )}
              </fieldset>
            </div>
          </section>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid grid-cols-2 items-end gap-2">
              <Input
                label="Minimum stock"
                type="number"
                min="0"
                step="any"
                value={materialForm.minimumStockLevel}
                onChange={(event) => setMaterialForm((current) => ({ ...current, minimumStockLevel: event.target.value }))}
              />
              <Select
                label="Unit"
                required
                value={materialForm.minimumStockUnitId}
                onChange={(event) => changeThresholdUnit('minimumStockLevel', 'minimumStockUnitId', event.target.value)}
                options={[
                  { label: 'Select unit', value: '' },
                  ...materialForm.supportedUnits.filter((entry) => entry.isActive !== false).flatMap((entry) => {
                    const unit = units.find((candidate) => unitId(candidate) === String(entry.unitId));
                    return unit && !isPackageUnit(unit)
                      ? [{ label: `${unit.name} (${unit.symbol})`, value: unitId(unit) }]
                      : [];
                  })
                ]}
              />
            </div>
            <div className="grid grid-cols-2 items-end gap-2">
              <Input
                label="Reorder level"
                type="number"
                min="0"
                step="any"
                value={materialForm.reorderLevel}
                onChange={(event) => setMaterialForm((current) => ({ ...current, reorderLevel: event.target.value }))}
              />
              <Select
                label="Unit"
                required
                value={materialForm.reorderLevelUnitId}
                onChange={(event) => changeThresholdUnit('reorderLevel', 'reorderLevelUnitId', event.target.value)}
                options={[
                  { label: 'Select unit', value: '' },
                  ...materialForm.supportedUnits.filter((entry) => entry.isActive !== false).flatMap((entry) => {
                    const unit = units.find((candidate) => unitId(candidate) === String(entry.unitId));
                    return unit && !isPackageUnit(unit)
                      ? [{ label: `${unit.name} (${unit.symbol})`, value: unitId(unit) }]
                      : [];
                  })
                ]}
              />
            </div>
            <div className="grid grid-cols-2 items-end gap-2 sm:col-span-2">
              <Input
                label="Desired stock level"
                type="number"
                min="0"
                step="any"
                value={materialForm.desiredStockLevel}
                onChange={(event) => setMaterialForm((current) => ({ ...current, desiredStockLevel: event.target.value }))}
              />
              <Select
                label="Unit"
                value={materialForm.desiredStockUnitId}
                onChange={(event) => changeThresholdUnit('desiredStockLevel', 'desiredStockUnitId', event.target.value)}
                options={[
                  { label: 'Select unit', value: '' },
                  ...materialForm.supportedUnits.filter((entry) => entry.isActive !== false).flatMap((entry) => {
                    const unit = units.find((candidate) => unitId(candidate) === String(entry.unitId));
                    return unit && !isPackageUnit(unit)
                      ? [{ label: `${unit.name} (${unit.symbol})`, value: unitId(unit) }]
                      : [];
                  })
                ]}
              />
            </div>
            <p className="text-xs text-orvelle-muted sm:col-span-2">
              Desired stock controls automatic reorder quantities. Values are converted and stored in {baseUnit?.symbol || 'the base unit'}.
            </p>
          </div>
          {!units.length && <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Units are not provisioned yet. Contact an administrator to configure inventory units.</div>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="secondary" onClick={() => setMaterialModalOpen(false)}>Cancel</Button><Button type="submit" loading={saving} disabled={!materialForm.supportedUnits.length}>Save raw material</Button></div>
        </form>
      </Modal>
      <Modal
        isOpen={unitModalOpen}
        onClose={() => setUnitModalOpen(false)}
        title="Create an inventory unit"
        subtitle="Add a measurement unit for compatible inventory conversions."
      >
        <form onSubmit={saveUnit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Unit name" required value={unitForm.name} onChange={(event) => setUnitForm({ ...unitForm, name: event.target.value })} placeholder="Kilogram" />
            <Input label="Symbol" required value={unitForm.symbol} onChange={(event) => setUnitForm({ ...unitForm, symbol: event.target.value })} placeholder="kg" />
            <Select
              label="Unit type"
              required
              value={unitForm.category}
              onChange={(event) => setUnitForm({ ...unitForm, category: event.target.value, baseUnitId: '', conversionFactor: '' })}
              options={[
                { label: 'Weight', value: 'weight' },
                { label: 'Volume', value: 'volume' },
                { label: 'Quantity', value: 'quantity' }
              ]}
            />
            {(
              <>
                <Select
                  label="Conversion base unit (optional)"
                  value={unitForm.baseUnitId}
                  onChange={(event) => setUnitForm({ ...unitForm, baseUnitId: event.target.value, conversionFactor: '' })}
                  options={[
                    { label: 'Select base unit', value: '' },
                    ...units.filter((unit) => unit.isActive && unit.category === unitForm.category && !isPackageUnit(unit)).map((unit) => ({
                      label: `${unit.name} (${unit.symbol})`,
                      value: unitId(unit)
                    }))
                  ]}
                />
                {unitForm.baseUnitId && <Input
                  label={`1 ${unitForm.name || 'unit'} equals how many ${units.find((unit) => unitId(unit) === unitForm.baseUnitId)?.name || 'base units'}?`}
                  type="number"
                  min="0.000000001"
                  step="any"
                  required
                  value={unitForm.conversionFactor}
                  onChange={(event) => setUnitForm({ ...unitForm, conversionFactor: event.target.value })}
                />}
              </>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setUnitModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={unitSaving}>Create unit</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default RawMaterialMasterPage;
