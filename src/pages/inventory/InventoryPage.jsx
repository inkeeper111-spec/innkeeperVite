import { PaginatedTable } from '../../components/ui/PaginatedTable';
import React, { useState, useEffect, useRef } from 'react';
import api, { showApiErrorToast } from '../../api/axios';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { PhoneInput } from '../../components/ui/PhoneInput';
import { Select } from '../../components/ui/Select';
import { DataSkeleton } from '../../components/ui/DataSkeleton';
import { useAuth } from '../../contexts/AuthContext';
import { useCurrency } from '../../hooks/useCurrency';
import {
  INVENTORY_UNITS,
  formatInventoryQuantity,
  getUnitConversionFactor,
  isPackageUnit,
  unitChoicesForItem,
  unitIdForItemSymbol
} from './inventoryUnits';
import {
  Boxes,
  AlertTriangle,
  PlusCircle,
  Truck,
  CheckCircle2,
  PackageCheck,
  LayoutDashboard,
  ArrowLeftRight,
  ClipboardList,
  Utensils,
  Receipt,
  BarChart3,
  Download,
  Search,
  Clock3,
  Tag,
  Pencil,
  Power,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis
} from 'recharts';
import { useStorageLocations } from './useStorageLocations';

const getDateInTimeZone = (timeZone = 'UTC') => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());
  const dateParts = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
};

export const InventoryPage = () => {
  const { hotel, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const canManageInventory = ['hotel_admin', 'super_admin'].includes(user?.role);
  const canWriteModule = (moduleKey) => canManageInventory
    || user?.permissions?.[`${moduleKey}.create`] === true
    || user?.permissions?.[`${moduleKey}.update`] === true;
  const canReadModule = (moduleKey) => canManageInventory
    || user?.permissions?.[`${moduleKey}.read`] === true;
  const canReadRecipes = canManageInventory || user?.permissions?.['restaurant_recipes.read'] === true;
  const {
    storageLocations,
    storageLocationOptions,
    storageLocationById
  } = useStorageLocations();
  const storageLocationIdForName = (name) => String(
    storageLocations.find((entry) => entry.locationName.toLocaleLowerCase() === String(name || '').toLocaleLowerCase())?._id || ''
  );
  const storageLocationNameForId = (id) => storageLocationById(id)?.locationName || '';
  const { currency, currencySymbol, formatCurrency } = useCurrency();
  const defaultConversionFactor = (baseUnit, purchaseUnit) => {
    const units = INVENTORY_UNITS.flatMap((group) =>
      group.units.map((entry) => ({ ...entry, category: group.category }))
    );
    const base = units.find((entry) => entry.unit === baseUnit);
    const purchase = units.find((entry) => entry.unit === purchaseUnit);
    return base?.factor && purchase?.factor && base.category === purchase.category
      ? purchase.factor / base.factor
      : '';
  };
  const rawMaterialPurchaseUnits = (item) => (item?.supportedUnits || [])
    .filter((entry) => entry.isActive !== false
      && Number(entry.conversionFactorToBase) > 0)
    .map((entry) => {
      const unit = typeof entry.unitId === 'object'
        ? entry.unitId
        : units.find((candidate) => String(candidate._id) === String(entry.unitId));
      const symbol = entry.unitSymbolSnapshot || unit?.symbol;
      const measurementUnit = typeof entry.packageMeasurementUnitId === 'object'
        ? entry.packageMeasurementUnitId
        : units.find((candidate) => String(candidate._id) === String(entry.packageMeasurementUnitId));
      if (!symbol || unit?.isActive === false) return null;
      return {
        symbol,
        label: `${entry.packageName
          ? `${entry.packageName}${entry.packageSize && (measurementUnit?.symbol || entry.packageMeasurementUnitSymbolSnapshot)
            ? ` (${entry.packageSize} ${measurementUnit?.symbol || entry.packageMeasurementUnitSymbolSnapshot})`
            : ''}`
          : entry.unitNameSnapshot || unit?.name || symbol} (${symbol})`,
        factor: Number(entry.conversionFactorToBase),
        isDefault: entry.isDefaultPurchaseUnit === true
      };
    })
    .filter(Boolean);
  const conversionFactorForItem = (item, unit) => {
    if (!item || !unit) return 1;
    if (unit === (item.baseUnit || item.unit)) return 1;
    const supportedUnit = item.supportedUnits?.find((entry) => (
      (entry.unitSymbolSnapshot || entry.unitId?.symbol) === unit
      && entry.isActive !== false
    ));
    if (Number(supportedUnit?.conversionFactorToBase) > 0) {
      return Number(supportedUnit.conversionFactorToBase);
    }
    const configuredUnit = units.find((entry) => entry.symbol === unit);
    const baseUnit = units.find((entry) => entry._id === String(item.baseUnitId?._id || item.baseUnitId))
      || units.find((entry) => entry.symbol === (item.baseUnit || item.unit));
    const dynamicFactor = getUnitConversionFactor(configuredUnit, baseUnit, units);
    if (dynamicFactor) return dynamicFactor;
    const configured = item.unitConversions?.[unit]
      ?? item.packagingOptions?.find((option) => option.unit === unit)?.conversionFactor;
    return Number(configured) > 0 ? Number(configured) : defaultConversionFactor(item.baseUnit || item.unit, unit);
  };
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedInventorySection, setSelectedInventorySection] = useState('overview');
  const [items, setItems] = useState([]);
  const [units, setUnits] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [vendorPurchases, setVendorPurchases] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ amount: '', paymentMethod: 'bank_transfer', referenceNumber: '', invoiceNumber: '', notes: '' });
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [departmentRequests, setDepartmentRequests] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [reorderSuggestions, setReorderSuggestions] = useState([]);
  const [expandedBatchItemId, setExpandedBatchItemId] = useState('');
  const [expandedReportBatchItemId, setExpandedReportBatchItemId] = useState('');
  const [batchesByItem, setBatchesByItem] = useState({});
  const [loadingBatchesByItem, setLoadingBatchesByItem] = useState({});
  const [batchErrorsByItem, setBatchErrorsByItem] = useState({});
  const [preparedFoodBatches, setPreparedFoodBatches] = useState([]);
  const [preparedFoodMovements, setPreparedFoodMovements] = useState([]);
  const [directInventoryUsage, setDirectInventoryUsage] = useState([]);
  const [preparedFoodBatchesLoading, setPreparedFoodBatchesLoading] = useState(false);
  const [preparedFoodCountOpen, setPreparedFoodCountOpen] = useState(false);
  const [preparedFoodCountSaving, setPreparedFoodCountSaving] = useState(false);
  const [preparedFoodCountError, setPreparedFoodCountError] = useState('');
  const [preparedFoodCountMode, setPreparedFoodCountMode] = useState('unrecorded_consumption');
  const [preparedFoodCountTargetType, setPreparedFoodCountTargetType] = useState('batch');
  const [preparedFoodCountForm, setPreparedFoodCountForm] = useState({
    batchId: '',
    actualQuantity: '',
    reason: '',
    location: 'Main Store'
  });
  const [report, setReport] = useState([]);
  const [verifications, setVerifications] = useState([]);
  const [verificationIntervalDays, setVerificationIntervalDays] = useState(1);
  const [recipeDeductionStage, setRecipeDeductionStage] = useState('prepared');
  const [reportType, setReportType] = useState('stock');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [inventoryPage, setInventoryPage] = useState(1);
  const [inventoryPages, setInventoryPages] = useState(1);
  const [isUnitFormOpen, setIsUnitFormOpen] = useState(false);
  const [unitForm, setUnitForm] = useState({
    name: '',
    symbol: '',
    category: 'weight',
    baseUnitId: '',
    conversionFactor: '',
    description: '',
    isActive: true
  });
  const unitFormIsPackage = isPackageUnit({ category: unitForm.category, symbol: unitForm.symbol });

  // Modals
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemEditForm, setItemEditForm] = useState({});
  const [isMovementOpen, setIsMovementOpen] = useState(false);
  const [isAddVendorOpen, setIsAddVendorOpen] = useState(false);
  const [isPurchaseOrderOpen, setIsPurchaseOrderOpen] = useState(false);
  const [isDepartmentRequestOpen, setIsDepartmentRequestOpen] = useState(false);
  const [isRecipeOpen, setIsRecipeOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isReceivingOpen, setIsReceivingOpen] = useState(false);
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
  const [isVerificationOpen, setIsVerificationOpen] = useState(false);
  const [isVendorHistoryOpen, setIsVendorHistoryOpen] = useState(false);
  const [isVendorPaymentOpen, setIsVendorPaymentOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [selectedAutomaticPO, setSelectedAutomaticPO] = useState(null);
  const [automaticPOReviewForm, setAutomaticPOReviewForm] = useState({ vendorId: '', quantity: '' });
  const [selectedItemForMove, setSelectedItemForMove] = useState(null);

  const [itemForm, setItemForm] = useState({
    itemId: '',
    department: '',
    unit: '',
    quantity: '',
    existingStockDeduction: '0',
    existingStockDeductionUnit: '',
    hasWastage: 'no',
    wastageQuantity: '',
    wastageUnit: '',
    wastageReason: '',
    purchasePrice: '',
    vendorId: '',
    expiryDate: '',
    location: 'Main Store',
    locationId: '',
    notes: ''
  });
  const [receiptBatches, setReceiptBatches] = useState([]);
  const [receiptBatchesLoading, setReceiptBatchesLoading] = useState(false);
  const [verificationBatches, setVerificationBatches] = useState([]);
  const [verificationBalances, setVerificationBalances] = useState([]);
  const [verificationLocations, setVerificationLocations] = useState([]);
  const [verificationBatchesLoading, setVerificationBatchesLoading] = useState(false);

  const [moveForm, setMoveForm] = useState({
    movementType: 'receipt',
    quantity: 10,
    unit: 'pcs',
    department: '',
    location: 'Main Store',
    locationId: '',
    notes: ''
  });

  const [vendorForm, setVendorForm] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    taxNumber: '',
    paymentTerms: 'Net 30'
  });
  const [poForm, setPoForm] = useState({
    vendorId: '',
    department: '',
    expectedDeliveryDate: '',
    taxAmount: 0,
    discountAmount: 0,
    notes: '',
    items: [{ itemId: '', quantity: 1, unit: '', unitCost: 0 }]
  });
  const [departmentForm, setDepartmentForm] = useState({
    department: 'Housekeeping',
    notes: '',
    lines: [{ itemId: '', quantity: 1, unit: '' }]
  });
  const [recipeForm, setRecipeForm] = useState({
    menuItemId: '',
    recipeName: '',
    description: '',
    servingSize: '1 serving',
    locationId: storageLocationIdForName('Restaurant Store')
      || storageLocationIdForName('Kitchen Store'),
    preparationTimeMinutes: 0,
    productionMode: 'made_to_order',
    expectedProductionYield: 1,
    expectedPreparationLossPercent: 0,
    ingredients: [{ itemId: '', quantity: 1, unit: '', optional: false, substituteItemId: '', substituteQuantity: '', substituteUnit: '' }]
  });
  const [transferForm, setTransferForm] = useState({
    itemId: '',
    quantity: 1,
    unit: '',
    transferMode: 'location',
    fromLocation: 'Main Store',
    toLocation: 'Kitchen Store',
    fromLocationId: '',
    toLocationId: '',
    department: '',
    fromDepartment: 'Kitchen',
    toDepartment: 'Restaurant'
  });
  const [adjustmentForm, setAdjustmentForm] = useState({
    itemId: '',
    quantity: 1,
    unit: '',
    reason: 'food_wastage',
    department: '',
    location: 'Main Store',
    locationId: '',
    remarks: ''
  });
  const [receivingLines, setReceivingLines] = useState([]);
  const [receivingLocation, setReceivingLocation] = useState('Main Store');
  const [receivingLocationId, setReceivingLocationId] = useState('');
  const [menuItems, setMenuItems] = useState([]);
  const [minibarRooms, setMinibarRooms] = useState([]);
  const [minibarRoomId, setMinibarRoomId] = useState('');
  const [minibarData, setMinibarData] = useState(null);
  const [minibarCounts, setMinibarCounts] = useState({});
  const [isMinibarAssignOpen, setIsMinibarAssignOpen] = useState(false);
  const [minibarAssignForm, setMinibarAssignForm] = useState({ itemId: '', quantity: 1, unit: '', fromLocation: 'Main Store', fromLocationId: '' });
  const [reportFilters, setReportFilters] = useState({
    from: '', to: '', category: 'all', itemId: ''
  });
  const [profitLossDateMode, setProfitLossDateMode] = useState('range');
  const [reportDateError, setReportDateError] = useState('');
  const [loadingReport, setLoadingReport] = useState(false);
  const reportRequestVersion = useRef(0);
  const [hasRunReport, setHasRunReport] = useState(false);
  const [purchaseDate, setPurchaseDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [verificationForm, setVerificationForm] = useState({
    itemId: '',
    location: '',
    locationId: '',
    actualStock: '',
    unit: '',
    periodStart: dayjs().format('YYYY-MM-DD'),
    periodEnd: dayjs().format('YYYY-MM-DD'),
    hasUnrecordedConsumption: 'no',
    consumptionQuantity: '',
    consumptionUnit: '',
    consumptionReason: '',
    consumptionDepartment: '',
    hasWastage: 'no',
    wastageQuantity: '',
    wastageUnit: '',
    wastageReason: '',
    remarks: ''
  });

  const [message, setMessage] = useState('');

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const request = (moduleKey, path, config) => (
        canReadModule(moduleKey) ? api.get(path, config) : Promise.resolve(null)
      );
      const [itemsRes, vendorsRes, posRes, dashboardRes, ledgerRes, requestsRes, recipesRes, adjustmentsRes, suggestionsRes, unitsRes, verificationsRes, settingsRes] = await Promise.all([
        request('raw_materials', '/inventory/items', { params: { page: inventoryPage, limit: 100, includeInactive: canManageInventory ? 'true' : undefined } }),
        request('raw_materials', '/inventory/vendors'),
        request('raw_materials', '/inventory/purchase-orders'),
        request('inventory_dashboard', '/inventory/dashboard'),
        request('stock_verification', '/inventory/ledger', { params: { limit: 30 } }),
        request('raw_materials', '/inventory/department-requests'),
        request('restaurant_recipes', '/inventory/recipes'),
        request('stock_verification', '/inventory/adjustments'),
        request('raw_materials', '/inventory/reorder-suggestions'),
        request('raw_materials', '/inventory/units', { params: canManageInventory ? { includeInactive: true } : {} }),
        request('stock_verification', '/inventory/verifications'),
        request('inventory', '/inventory/settings')
      ]);

      const rawMaterialsRes = await request('raw_materials', '/inventory/raw-materials', {
        params: canManageInventory ? { includeInactive: true } : {}
      });
      if (itemsRes?.data.success) {
        const regularItems = itemsRes.data.data || [];
        const rawData = rawMaterialsRes?.data?.data;
        const rawMaterials = rawMaterialsRes?.data?.success
          ? (Array.isArray(rawData) ? rawData : rawData?.materials || [])
          : [];
        const combined = new Map(regularItems.map((item) => [String(item._id), item]));
        rawMaterials.forEach((item) => combined.set(String(item._id), {
          ...combined.get(String(item._id)),
          ...item
        }));
        setItems([...combined.values()]);
      }
      if (unitsRes?.data.success) setUnits(unitsRes.data.data || []);
      if (itemsRes?.data.success) setInventoryPages(itemsRes.data.pagination?.pages || 1);
      if (vendorsRes?.data.success) setVendors(vendorsRes.data.data);
      if (posRes?.data.success) setPurchaseOrders(posRes.data.data);
      if (dashboardRes?.data.success) setDashboard(dashboardRes.data.data);
      if (ledgerRes?.data.success) setLedger(ledgerRes.data.data);
      if (requestsRes?.data.success) setDepartmentRequests(requestsRes.data.data);
      if (recipesRes?.data.success) setRecipes(recipesRes.data.data);
      if (adjustmentsRes?.data.success) setAdjustments(adjustmentsRes.data.data);
      if (suggestionsRes?.data.success) setReorderSuggestions(suggestionsRes.data.data);
      if (verificationsRes?.data.success) setVerifications(verificationsRes.data.data || []);
      if (settingsRes?.data.success) {
        setVerificationIntervalDays(settingsRes.data.data.verificationIntervalDays || 1);
        setRecipeDeductionStage(settingsRes.data.data.recipeDeductionStage || 'prepared');
      }
    } catch (err) {
      showApiErrorToast(err, 'Could not load inventory data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [inventoryPage, canManageInventory]);

  useEffect(() => {
    if (!storageLocations.length) return;
    const resolveId = (name, fallback = '') => (
      storageLocationIdForName(name) || storageLocationIdForName(fallback) || String(storageLocations[0]._id)
    );
    setItemForm((current) => ({ ...current, locationId: current.locationId || resolveId(current.location, 'Main Store') }));
    setMoveForm((current) => ({ ...current, locationId: current.locationId || resolveId(current.location, 'Main Store') }));
    setAdjustmentForm((current) => ({ ...current, locationId: current.locationId || resolveId(current.location, 'Main Store') }));
    setTransferForm((current) => ({
      ...current,
      fromLocationId: current.fromLocationId || resolveId(current.fromLocation, 'Main Store'),
      toLocationId: current.toLocationId || resolveId(current.toLocation, 'Kitchen Store')
    }));
    setReceivingLocationId((current) => current || resolveId(receivingLocation, 'Main Store'));
    setMinibarAssignForm((current) => ({
      ...current,
      fromLocationId: current.fromLocationId || resolveId(current.fromLocation, 'Main Store')
    }));
    setRecipeForm((current) => ({
      ...current,
      locationId: current.locationId || resolveId('Restaurant Store', 'Kitchen Store')
    }));
  }, [storageLocations]);

  useEffect(() => {
    const tabByPath = {
      '/inventory/dashboard': 'dashboard',
      '/inventory/categories': 'categories',
      '/inventory/items': 'items',
      '/inventory/stock': 'ledger',
      '/inventory/recipes': 'recipes'
    };
    if (location.pathname === '/inventory/units') {
      navigate('/inventory/items', { replace: true });
    } else if (location.pathname === '/inventory') {
      setActiveTab(location.search.startsWith('?tab=') ? location.search.slice(5) : 'dashboard');
    } else if (tabByPath[location.pathname]) {
      setActiveTab(tabByPath[location.pathname]);
    }
  }, [location.pathname, location.search, navigate]);

  useEffect(() => {
    const sectionByTab = {
      dashboard: 'overview',
      categories: 'stock',
      items: 'stock',
      ledger: 'stock',
      verifications: 'stock',
      'prepared-food': 'kitchen',
      vendors: 'purchasing',
      pos: 'purchasing',
      requests: 'purchasing',
      adjustments: 'kitchen',
      recipes: 'kitchen',
      minibar: 'kitchen',
      reports: 'reports'
    };
    setSelectedInventorySection(sectionByTab[activeTab] || 'overview');
  }, [activeTab]);

  const selectInventoryTab = (tab) => {
    const pathByTab = {
      dashboard: '/inventory/dashboard',
      categories: '/inventory/categories',
      items: '/inventory/items',
      ledger: '/inventory/stock',
      recipes: '/inventory/recipes'
    };
    if (pathByTab[tab]) {
      navigate(pathByTab[tab]);
    } else {
      navigate(`/inventory?tab=${encodeURIComponent(tab)}`);
    }
  };

  const unitChoices = (category) => units
    .filter((unit) => unit.isActive && (!category || unit.category === category))
    .sort((left, right) => left.category.localeCompare(right.category) || left.name.localeCompare(right.name))
    .map((unit) => ({
      group: unit.category.charAt(0).toUpperCase() + unit.category.slice(1),
      label: `${unit.name} (${unit.symbol})`,
      value: unit._id
    }));
  const getUnit = (id) => units.find((unit) => unit._id === id);
  const defaultSupportedUnitForItem = (item) => {
    const directUnits = (item?.supportedUnits || []).filter((entry) => {
      if (entry.isActive === false) return false;
      const unit = typeof entry.unitId === 'object'
        ? entry.unitId
        : units.find((candidate) => String(candidate._id) === String(entry.unitId));
      return !isPackageUnit(unit || { symbol: entry.unitSymbolSnapshot })
        && !(Number(entry.packageSize) > 0 && entry.packageMeasurementUnitId);
    });
    return directUnits.find((entry) => entry.isDefaultPurchaseUnit) || directUnits[0];
  };
  const defaultPurchaseUnitForItem = (item) => {
    const configured = defaultSupportedUnitForItem(item);
    const configuredUnit = configured?.unitId;
    return configured?.unitSymbolSnapshot
      || (typeof configuredUnit === 'object' ? configuredUnit.symbol : null)
      || units.find((unit) => unit._id === String(configuredUnit))?.symbol
      || item?.purchaseUnit
      || item?.baseUnit
      || item?.unit
      || '';
  };
  const purchaseUnitChoicesForItem = (item) => {
    if (item?.inventoryType !== 'raw_material' || !Array.isArray(item.supportedUnits)) {
      return unitChoicesForItem(item, units);
    }
    return item.supportedUnits.filter((entry) => {
      if (entry.isActive === false) return false;
      const unit = typeof entry.unitId === 'object'
        ? entry.unitId
        : units.find((candidate) => String(candidate._id) === String(entry.unitId));
      return !isPackageUnit(unit || { symbol: entry.unitSymbolSnapshot })
        && !(Number(entry.packageSize) > 0 && entry.packageMeasurementUnitId);
    }).map((entry) => {
      const configuredUnitId = typeof entry.unitId === 'object' ? entry.unitId?._id : entry.unitId;
      return {
        group: 'Units',
        label: `${entry.unitNameSnapshot || entry.unitSymbolSnapshot} (${entry.unitSymbolSnapshot})`,
        value: `unit:${configuredUnitId}`
      };
    });
  };
  const directUnitChoicesForItem = (item) => {
    if (item?.inventoryType !== 'raw_material' || !Array.isArray(item.supportedUnits)) {
      return unitChoicesForItem(item, units);
    }
    return item.supportedUnits.filter((entry) => {
      if (entry.isActive === false) return false;
      const unit = typeof entry.unitId === 'object'
        ? entry.unitId
        : units.find((candidate) => String(candidate._id) === String(entry.unitId));
      return !isPackageUnit(unit || { symbol: entry.unitSymbolSnapshot })
        && !(Number(entry.packageSize) > 0 && entry.packageMeasurementUnitId);
    }).map((entry) => ({
      group: 'Units',
      label: `${entry.unitNameSnapshot || entry.unitSymbolSnapshot} (${entry.unitSymbolSnapshot})`,
      value: entry.unitSymbolSnapshot
    }));
  };

  useEffect(() => {
    if (activeTab !== 'recipes' || !canReadRecipes) return;
    api.get('/restaurant/menu')
      .then(({ data }) => setMenuItems(data.data?.items || []))
      .catch((err) => showApiErrorToast(err, 'Could not load restaurant menu items'));
  }, [activeTab, canReadRecipes]);

  useEffect(() => {
    if (activeTab !== 'minibar') return;
    api.get('/inventory/minibar/rooms')
      .then(({ data }) => setMinibarRooms(data.data || []))
      .catch((err) => showApiErrorToast(err, 'Could not load minibar rooms'));
  }, [activeTab]);

  useEffect(() => {
    if (!isAddItemOpen || !itemForm.itemId) {
      setReceiptBatches([]);
      setReceiptBatchesLoading(false);
      return;
    }
    let active = true;
    setReceiptBatches([]);
    setReceiptBatchesLoading(true);
    api.get('/inventory/batches', {
      params: { itemId: itemForm.itemId, locationId: itemForm.locationId }
    })
      .then(({ data }) => {
        if (active) {
          const batches = data.data || [];
          setReceiptBatches(batches);
          if (batches.length === 0) {
            setItemForm((current) => ({
              ...current,
              hasWastage: 'no',
              wastageQuantity: '',
              wastageReason: ''
            }));
          }
        }
      })
      .catch((error) => {
        if (active) showApiErrorToast(error, 'Could not load batch history');
      })
      .finally(() => {
        if (active) setReceiptBatchesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isAddItemOpen, itemForm.itemId, itemForm.location]);

  useEffect(() => {
    if (!isVerificationOpen || !verificationForm.itemId) {
      setVerificationBatches([]);
      setVerificationBalances([]);
      setVerificationLocations([]);
      setVerificationBatchesLoading(false);
      return;
    }
    let active = true;
    setVerificationBatchesLoading(true);
    Promise.all([
      api.get('/inventory/batches', { params: { itemId: verificationForm.itemId } }),
      api.get('/inventory/locations', { params: { itemId: verificationForm.itemId } })
    ])
      .then(([batchResponse, balanceResponse]) => {
        if (!active) return;
        const batches = batchResponse.data.data || [];
        const itemBalances = (balanceResponse.data.data || []).filter((balance) => (
          String(balance.itemId?._id || balance.itemId) === String(verificationForm.itemId)
        ));
        const item = items.find((entry) => entry._id === verificationForm.itemId);
        const locations = [...new Set([
          ...itemBalances.map((balance) => balance.location),
          ...batches.map((batch) => batch.location),
          ...verifications
            .filter((verification) => (
              String(verification.itemId?._id || verification.itemId) === String(verificationForm.itemId)
            ))
            .map((verification) => verification.location || 'Main Store'),
          item?.location
        ].filter(Boolean))];
        if (!locations.length) locations.push('Main Store');
        const selectedBalance = itemBalances.find((balance) => (
          String(balance.locationId?._id || balance.locationId || '') === String(verificationForm.locationId)
          || balance.location === verificationForm.location
        ));
        const selectedBatch = batches.find((batch) => (
          String(batch.locationId?._id || batch.locationId || '') === String(verificationForm.locationId)
          || batch.location === verificationForm.location
        ));
        const selectedLocationHasStock = Number(selectedBalance?.quantity) > 0
          || Number(selectedBatch?.remainingQuantity) > 0;
        const firstStockBalance = itemBalances.find((balance) => Number(balance.quantity) > 0);
        const firstStockBatch = batches.find((batch) => Number(batch.remainingQuantity) > 0);
        const fallbackLocation = locations.includes(verificationForm.location)
          ? verificationForm.location
          : item?.location && locations.includes(item.location)
            ? item.location
            : locations[0];
        const locationId = selectedLocationHasStock
          ? String(selectedBalance?.locationId?._id || selectedBalance?.locationId
            || selectedBatch?.locationId?._id || selectedBatch?.locationId || verificationForm.locationId)
          : String(firstStockBalance?.locationId?._id || firstStockBalance?.locationId
            || firstStockBatch?.locationId?._id || firstStockBatch?.locationId
            || storageLocationIdForName(fallbackLocation));
        const location = storageLocationNameForId(locationId)
          || (selectedLocationHasStock ? verificationForm.location : fallbackLocation);
        const balance = itemBalances.find((entry) => (
          String(entry.locationId?._id || entry.locationId || '') === locationId
          || entry.location === location
        ));
        const expectedStock = balance?.quantity ?? (
          storageLocationById(locationId)?.locationTypeId?.key === 'main_store' || location === 'Main Store'
            ? item?.currentStock ?? 0
            : 0
        );
        const lastVerified = verifications
          .filter((verification) => (
            String(verification.itemId?._id || verification.itemId) === String(verificationForm.itemId)
            && (
              String(verification.locationId?._id || verification.locationId || '') === locationId
              || (verification.location || 'Main Store') === location
            )
          ))
          .sort((left, right) => new Date(right.verifiedAt) - new Date(left.verifiedAt))[0];
        setVerificationBatches(batches);
        setVerificationBalances(itemBalances);
        setVerificationLocations(locations);
        setVerificationForm((current) => ({
          ...current,
          location,
          locationId,
          periodStart: getVerificationPeriodStart(item, lastVerified),
          actualStock: current.actualStock === ''
            ? String(expectedStock)
            : current.actualStock
        }));
      })
      .catch((error) => {
        if (active) showApiErrorToast(error, 'Could not load batch history');
      })
      .finally(() => {
        if (active) setVerificationBatchesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isVerificationOpen, verificationForm.itemId, storageLocations]);

  const handleCreateItem = async (e) => {
    e.preventDefault();
    try {
      const selectedMaterial = items.find((item) => item._id === itemForm.itemId);
      const selectedPurchaseUnit = rawMaterialPurchaseUnits(selectedMaterial)
        .find((unit) => unit.symbol === itemForm.unit);
      if (!selectedMaterial || !selectedPurchaseUnit) {
        throw new Error('Select a raw material and one of its configured purchase units.');
      }
      if (receiptBatchesLoading) {
        throw new Error('Wait for the batch history to finish loading before receiving stock.');
      }
      const purchaseQuantity = Number(itemForm.quantity);
      const purchasePrice = Number(itemForm.purchasePrice);
      if (!Number.isFinite(purchaseQuantity) || purchaseQuantity <= 0
        || !Number.isFinite(purchasePrice) || purchasePrice < 0) {
        throw new Error('Enter a positive quantity and valid purchase price.');
      }
      const receiptPayload = {
        itemId: selectedMaterial._id,
        quantity: purchaseQuantity,
        unit: selectedPurchaseUnit.symbol,
        purchaseUnitPrice: purchasePrice,
        vendorId: itemForm.vendorId || null,
        department: itemForm.department,
        location: itemForm.location || 'Main Store',
        locationId: itemForm.locationId,
        expiryDate: itemForm.expiryDate || null,
        notes: itemForm.notes
      };
      const previousAvailableQuantity = receiptBatches.reduce(
        (total, batch) => total + Math.max(0, Number(batch.remainingQuantity) || 0), 0
      );
      const enteredStockDeduction = itemForm.existingStockDeduction === ''
        ? 0
        : Number(itemForm.existingStockDeduction);
      if (!Number.isFinite(enteredStockDeduction) || enteredStockDeduction < 0
        || (enteredStockDeduction > 0 && !receiptDeductionUnit)) {
        throw new Error('Enter a non-negative existing-stock deduction and select its unit.');
      }
      const existingStockDeduction = enteredStockDeduction * (receiptDeductionUnit?.factor || 1);
      if (existingStockDeduction > previousAvailableQuantity) {
        throw new Error(`The deduction cannot exceed ${formatReceiptQuantity(previousAvailableQuantity)} ${receiptBaseUnit} available.`);
      }
      const hasExistingBatchHistory = receiptBatches.length > 0;
      const wastageQuantity = hasExistingBatchHistory && itemForm.hasWastage === 'yes'
        ? Number(itemForm.wastageQuantity)
        : 0;
      if (hasExistingBatchHistory && itemForm.hasWastage === 'yes'
        && (!Number.isFinite(wastageQuantity) || wastageQuantity <= 0)) {
        throw new Error('Enter a positive wastage quantity.');
      }
      const wastageBaseQuantity = wastageQuantity * (receiptWastageUnit?.factor || 0);
      if (wastageQuantity > 0 && !receiptWastageUnit) {
        throw new Error('Select a configured wastage unit.');
      }
      if (wastageBaseQuantity > receiptWastageAvailableQuantity) {
        throw new Error(`Wastage cannot exceed the ${formatReceiptQuantity(receiptWastageAvailableQuantity)} ${receiptBaseUnit} available in the batches eligible for wastage.`);
      }
      if (wastageQuantity > 0 && !itemForm.wastageReason.trim()) {
        throw new Error('Enter a reason for the wastage.');
      }
      const wastagePayload = wastageQuantity > 0 ? {
        wastageQuantity,
        wastageUnit: itemForm.wastageUnit,
        wastageReason: itemForm.wastageReason.trim()
      } : {};
      const res = await api.post('/inventory/movements', {
        ...receiptPayload,
        movementType: 'receipt',
        autoGenerateBatchNumber: true,
        existingStockDeductionQuantity: enteredStockDeduction,
        existingStockDeductionUnit: itemForm.existingStockDeductionUnit || receiptBaseUnit,
        ...wastagePayload
      });
      if (res.data.success) {
        const batchNumber = res.data.data?.movement?.batchNumber;
        setIsAddItemOpen(false);
        setMessage(`${selectedMaterial.name} stock added${batchNumber ? ` as batch ${batchNumber}` : ''}${existingStockDeduction ? `; ${formatReceiptQuantity(existingStockDeduction)} ${receiptBaseUnit} existing stock deducted` : ''}${wastageBaseQuantity ? `; ${formatReceiptQuantity(wastageBaseQuantity)} ${receiptBaseUnit} wastage recorded` : ''}.`);
        setItemForm({
          itemId: '',
          department: '',
          unit: '',
          quantity: '',
          existingStockDeduction: '0',
          existingStockDeductionUnit: '',
          hasWastage: 'no',
          wastageQuantity: '',
          wastageUnit: '',
          wastageReason: '',
          purchasePrice: '',
          vendorId: '',
          expiryDate: '',
          location: 'Main Store',
          locationId: '',
          notes: ''
        });
        fetchInventory();
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (err) {
      showApiErrorToast(err, 'Failed to receive raw material stock');
    }
  };

  const handleUpdateItem = async (event) => {
    event.preventDefault();
    if (!editingItem) return;
    try {
      await api.patch(`/inventory/items/${editingItem._id}`, {
        ...itemEditForm,
        minStockThreshold: Number(itemEditForm.minStockThreshold),
        maxStockLevel: itemEditForm.maxStockLevel === '' ? null : Number(itemEditForm.maxStockLevel),
        reorderQuantity: Number(itemEditForm.reorderQuantity),
        stockVerificationIntervalDays: itemEditForm.stockVerificationIntervalDays === ''
          ? null
          : Number(itemEditForm.stockVerificationIntervalDays)
      });
      setEditingItem(null);
      setMessage(`Raw material ${itemEditForm.name} updated.`);
      fetchInventory();
    } catch (err) {
      showApiErrorToast(err, 'Could not update raw material');
    }
  };

  const toggleItemStatus = async (item) => {
    try {
      await api.patch(`/inventory/items/${item._id}`, { isActive: !item.isActive });
      setMessage(`${item.name} ${item.isActive ? 'deactivated' : 'activated'}.`);
      fetchInventory();
    } catch (err) {
      showApiErrorToast(err, 'Could not change raw material status');
    }
  };

  const handleSaveUnit = async (event) => {
    event?.preventDefault?.();
    if (!unitFormIsPackage && unitForm.baseUnitId
      && !(Number(unitForm.conversionFactor) > 0)) {
      showApiErrorToast(new Error('Enter a positive conversion factor'), 'Conversion factor must be greater than zero');
      return;
    }
    try {
      const { data } = await api.post('/inventory/units', {
        ...unitForm,
        baseUnitId: unitFormIsPackage ? null : unitForm.baseUnitId || null,
        conversionFactor: unitFormIsPackage || !unitForm.baseUnitId
          ? null
          : Number(unitForm.conversionFactor)
      });
      setUnits((current) => [...current.filter((unit) => unit._id !== data.data._id), data.data]);
      setMessage(`Unit ${unitForm.name} is ready to use for this raw material.`);
      setIsUnitFormOpen(false);
      setUnitForm({ name: '', symbol: '', category: 'weight', baseUnitId: '', conversionFactor: '', description: '', isActive: true });
    } catch (error) {
      showApiErrorToast(error, 'Could not add unit');
    }
  };

  const getLastVerificationForItem = (itemId, location = 'Main Store', locationId = '') => verifications
    .filter((verification) => (
      String(verification.itemId?._id || verification.itemId) === String(itemId)
      && (
        (locationId && String(verification.locationId?._id || verification.locationId || '') === String(locationId))
        || (verification.location || 'Main Store') === location
      )
    ))
    .sort((left, right) => new Date(right.verifiedAt) - new Date(left.verifiedAt))[0];

  const getVerificationPeriodStart = (item, lastVerified) => {
    const lastVerifiedPeriodEnd = lastVerified?.periodEnd;
    return lastVerifiedPeriodEnd
      ? String(lastVerifiedPeriodEnd).slice(0, 10)
      : dayjs(item?.createdAt || dayjs()).format('YYYY-MM-DD');
  };

  const handleVerificationLocationChange = (locationId) => {
    const location = storageLocationNameForId(locationId);
    const item = items.find((entry) => entry._id === verificationForm.itemId);
    const balance = verificationBalances.find((entry) => (
      String(entry.locationId?._id || entry.locationId || '') === String(locationId)
      || entry.location === location
    ));
    const expectedStock = balance?.quantity ?? (
      storageLocationById(locationId)?.locationTypeId?.key === 'main_store' || location === 'Main Store'
        ? item?.currentStock ?? 0
        : 0
    );
    const lastVerified = item?._id ? getLastVerificationForItem(item._id, location, locationId) : null;
    const unitFactor = conversionFactorForItem(item, verificationForm.unit) || 1;
    setVerificationForm((current) => ({
      ...current,
      location,
      locationId,
      actualStock: String(expectedStock / unitFactor),
      periodStart: getVerificationPeriodStart(item, lastVerified)
    }));
  };

  const openStockVerification = (item) => {
    const now = dayjs().format('YYYY-MM-DD');
    const selectedItem = item || items[0];
    const location = '';
    const lastVerified = selectedItem?._id
      ? getLastVerificationForItem(selectedItem._id, location || 'Main Store', storageLocationIdForName(location || 'Main Store'))
      : null;
    setVerificationForm({
      itemId: selectedItem?._id || '',
      location,
      locationId: storageLocationIdForName(location),
      actualStock: '',
      unit: selectedItem?.baseUnit || selectedItem?.unit || '',
      periodStart: getVerificationPeriodStart(selectedItem, lastVerified) || now,
      periodEnd: now,
      hasUnrecordedConsumption: 'no',
      consumptionQuantity: '',
      consumptionUnit: selectedItem?.baseUnit || selectedItem?.unit || '',
      consumptionReason: '',
      consumptionDepartment: '',
      hasWastage: 'no',
      wastageQuantity: '',
      wastageUnit: selectedItem?.baseUnit || selectedItem?.unit || '',
      wastageReason: '',
      remarks: ''
    });
    setVerificationBatches([]);
    setVerificationBalances([]);
    setVerificationLocations([]);
    setIsVerificationOpen(true);
  };

  const handleStockVerification = async (event) => {
    event.preventDefault();
    const item = items.find((entry) => entry._id === verificationForm.itemId);
    if (!item) return;
    if (!window.confirm('Finalize this physical count and post the classified stock changes?')) return;
    try {
      await api.post('/inventory/verifications', {
        ...verificationForm,
        actualStock: Number(verificationForm.actualStock),
        consumptionQuantity: Number(verificationForm.consumptionQuantity || 0),
        wastageQuantity: Number(verificationForm.wastageQuantity || 0),
        consumptionUnit: verificationForm.consumptionUnit || verificationForm.unit,
        wastageUnit: verificationForm.wastageUnit || verificationForm.unit,
        timezoneOffsetMinutes: new Date().getTimezoneOffset()
      });
      setIsVerificationOpen(false);
      setMessage(`Physical stock verification saved for ${item.name}.`);
      await fetchInventory();
      await refreshBatchLedger(item._id);
    } catch (err) {
      showApiErrorToast(err, 'Could not save stock verification');
    }
  };

  const handleVerificationIntervalChange = async (event) => {
    const value = Number(event.target.value);
    if (!Number.isInteger(value) || value < 1 || value > 365) {
      showApiErrorToast(null, 'Enter a whole number from 1 to 365 days.');
      return;
    }
    try {
      await api.patch('/inventory/settings', { verificationIntervalDays: value });
      setVerificationIntervalDays(value);
      await fetchInventory();
    } catch (err) {
      showApiErrorToast(err, 'Could not update verification frequency');
    }
  };

  const handleRecipeDeductionStageChange = async (event) => {
    const stage = event.target.value;
    try {
      await api.patch('/inventory/settings', { recipeDeductionStage: stage });
      setRecipeDeductionStage(stage);
      setMessage(`Recipe ingredients will be deducted when orders are ${stage === 'prepared' ? 'prepared' : 'served'}.`);
    } catch (err) {
      showApiErrorToast(err, 'Could not update recipe deduction stage');
    }
  };

  const handleCreateDefaultUnits = async () => {
    try {
      const { data } = await api.post('/inventory/units/defaults');
      setUnits(data.data || []);
      setMessage(`${data.addedCount} standard units added.`);
    } catch (error) {
      showApiErrorToast(error, 'Could not add standard units');
    }
  };

  const handleRecordMovement = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/inventory/movements', {
        itemId: selectedItemForMove._id,
        movementType: moveForm.movementType,
        quantity: Number(moveForm.quantity),
        unit: moveForm.unit,
        department: moveForm.department,
        location: moveForm.location,
        locationId: moveForm.locationId,
        notes: moveForm.notes
      });
      if (res.data.success) {
        setIsMovementOpen(false);
        setMessage('Stock movement ledger recorded.');
        fetchInventory();
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (err) {
      showApiErrorToast(err, 'Movement record failed');
    }
  };

  const handleCreateVendor = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/inventory/vendors', vendorForm);
      if (res.data.success) {
        setIsAddVendorOpen(false);
        setMessage(`Vendor ${vendorForm.name} registered.`);
        fetchInventory();
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (err) {
      showApiErrorToast(err, 'Failed to add vendor');
    }
  };

  const handleViewVendorPurchases = async (vendor) => {
    try {
      const { data } = await api.get(`/inventory/vendors/${vendor._id}/purchases`);
      setSelectedVendor(vendor);
      setVendorPurchases(data.data || []);
      setIsVendorHistoryOpen(true);
    } catch (err) {
      showApiErrorToast(err, 'Could not load vendor purchase history');
    }
  };

  const handleRecordVendorPayment = async (e) => {
    e.preventDefault();
    if (!selectedVendor) return;
    try {
      await api.post(`/inventory/vendors/${selectedVendor._id}/payments`, {
        ...paymentForm,
        amount: Number(paymentForm.amount),
        idempotencyKey: `vendor-payment-${selectedVendor._id}-${Date.now()}`
      });
      setIsVendorPaymentOpen(false);
      setMessage('Vendor payment recorded.');
      fetchInventory();
    } catch (err) {
      showApiErrorToast(err, 'Could not record vendor payment');
    }
  };

  const handleCreatePurchaseOrder = async (e) => {
    e.preventDefault();
    try {
      await api.post('/inventory/purchase-orders', {
        ...poForm,
        submitForApproval: true,
        taxAmount: Number(poForm.taxAmount),
        discountAmount: Number(poForm.discountAmount),
        items: poForm.items.map((line) => ({
          ...line,
          quantity: Number(line.quantity),
          unit: line.unit,
          unitCost: Number(line.unitCost),
          ...(unitIdForItemSymbol(
            items.find((item) => String(item._id) === String(line.itemId)),
            line.unit,
            units
          ) ? {
            unitId: unitIdForItemSymbol(
              items.find((item) => String(item._id) === String(line.itemId)),
              line.unit,
              units
            )
          } : {})
        }))
      });
      setIsPurchaseOrderOpen(false);
      setMessage('Purchase order submitted for approval.');
      fetchInventory();
    } catch (err) {
      showApiErrorToast(err, 'Could not create purchase order');
    }
  };

  const prepareSuggestedPurchase = (item) => {
    setPoForm({
      vendorId: item.vendorId || '',
      department: '',
      expectedDeliveryDate: '',
      taxAmount: 0,
      discountAmount: 0,
      notes: `Suggested reorder for ${item.code}`,
      items: [{
        itemId: item._id,
        quantity: item.suggestedQuantity,
        unit: item.suggestedUnit || defaultPurchaseUnitForItem(item),
        unitId: unitIdForItemSymbol(item, item.suggestedUnit || defaultPurchaseUnitForItem(item), units),
        purchasePackageId: item.suggestedUnit ? null : defaultSupportedUnitForItem(item)?._id || null,
        unitCost: item.purchasePrice ?? Number(item.unitCost || 0) * Number(item.purchaseConversionFactor || 1)
      }]
    });
    setIsPurchaseOrderOpen(true);
  };

  const refreshBatchLedger = async (itemId) => {
    setLoadingBatchesByItem((current) => ({ ...current, [itemId]: true }));
    setBatchErrorsByItem((current) => ({ ...current, [itemId]: '' }));
    try {
      const { data } = await api.get('/inventory/batches', { params: { itemId } });
      setBatchesByItem((current) => ({ ...current, [itemId]: data.data || [] }));
    } catch (error) {
      setBatchErrorsByItem((current) => ({
        ...current,
        [itemId]: 'Could not load batch details. Please try again.'
      }));
      showApiErrorToast(error, 'Could not load inventory batches');
    } finally {
      setLoadingBatchesByItem((current) => ({ ...current, [itemId]: false }));
    }
  };

  const toggleItemBatches = async (item) => {
    if (expandedBatchItemId === item._id) {
      setExpandedBatchItemId('');
      return;
    }

    setExpandedBatchItemId(item._id);
    if (Object.prototype.hasOwnProperty.call(batchesByItem, item._id) && !batchErrorsByItem[item._id]) {
      return;
    }
    await refreshBatchLedger(item._id);
  };

  const loadPreparedFoodBatchHistory = async () => {
    setPreparedFoodBatchesLoading(true);
    try {
      const [productionResponse, usageResponse] = await Promise.all([
        api.get('/inventory/production', { params: { limit: 500 } }),
        api.get('/inventory/usage', { params: { limit: 1000 } })
      ]);
      setPreparedFoodBatches(productionResponse.data.data?.batches || []);
      setPreparedFoodMovements(productionResponse.data.data?.movements || []);
      setDirectInventoryUsage(usageResponse.data.data || []);
    } catch (error) {
      showApiErrorToast(error, 'Could not load prepared-food batches');
    } finally {
      setPreparedFoodBatchesLoading(false);
    }
  };

  const openPreparedFoodCount = async (movementType = 'unrecorded_consumption') => {
    setPreparedFoodCountMode(movementType);
    setPreparedFoodCountTargetType('batch');
    setPreparedFoodCountForm({ batchId: '', actualQuantity: '', reason: '', location: 'Main Store' });
    setPreparedFoodCountError('');
    setPreparedFoodCountOpen(true);
    await loadPreparedFoodBatchHistory();
  };

  const submitPreparedFoodCount = async (event) => {
    event.preventDefault();
    const additionalUsedQuantity = Number(preparedFoodCountForm.actualQuantity);
    const isBatchUsage = preparedFoodCountTargetType === 'batch';
    const batch = isBatchUsage
      ? preparedFoodBatches.find((entry) => String(entry._id) === preparedFoodCountForm.batchId)
      : null;
    const rawMaterial = preparedFoodCountTargetType === 'raw_material'
      ? items.find((entry) => String(entry._id) === preparedFoodCountForm.batchId)
      : null;
    const menuRecipe = preparedFoodCountTargetType === 'menu_item'
      ? recipes.find((entry) => String(entry._id) === preparedFoodCountForm.batchId)
      : null;
    const target = batch || rawMaterial || menuRecipe;
    const recordedUsedQuantity = Number(batch?.soldQuantity || 0)
      + Number(batch?.wastedQuantity || 0)
      + Number(batch?.complimentaryQuantity || 0)
      + Number(batch?.unrecordedQuantity || 0)
      + Number(batch?.staffConsumptionQuantity || 0);
    const maximumQuantity = batch
      ? Number(batch.availableQuantity || 0)
      : Number.POSITIVE_INFINITY;
    if (!target || !String(preparedFoodCountForm.actualQuantity).trim()
      || !Number.isFinite(additionalUsedQuantity)
      || additionalUsedQuantity <= 0
      || additionalUsedQuantity > maximumQuantity) {
      setPreparedFoodCountError(
        isBatchUsage
          ? `Enter additional portions used greater than zero and up to ${Number(batch?.availableQuantity || 0)} available portions.`
          : 'Enter a quantity greater than zero.'
      );
      return;
    }
    const reason = preparedFoodCountForm.reason.trim();
    if (!reason) {
      setPreparedFoodCountError(
        preparedFoodCountMode === 'complimentary'
          ? 'Enter a reason for the complimentary serving.'
          : 'Enter a reason for the unrecorded prepared-food use.'
      );
      return;
    }
    setPreparedFoodCountSaving(true);
    setPreparedFoodCountError('');
    try {
      if (isBatchUsage) {
        await api.post(`/inventory/production/${batch._id}/movements`, {
          movementType: preparedFoodCountMode,
          quantity: additionalUsedQuantity,
          reason,
          notes: preparedFoodCountMode === 'complimentary'
            ? `Complimentary prepared-food serving: ${additionalUsedQuantity} portion(s). Previously recorded used: ${recordedUsedQuantity}.`
            : `Additional unrecorded prepared-food use: ${additionalUsedQuantity} portion(s). Previously recorded used: ${recordedUsedQuantity}.`,
          idempotencyKey: globalThis.crypto?.randomUUID?.()
            || `prepared-count-${batch._id}-${Date.now()}`
        });
      } else {
        await api.post('/inventory/usage', {
          usageType: preparedFoodCountMode,
          targetType: preparedFoodCountTargetType,
          targetId: rawMaterial?._id || menuRecipe?._id,
          quantity: additionalUsedQuantity,
          reason,
          location: preparedFoodCountForm.location,
          idempotencyKey: globalThis.crypto?.randomUUID?.()
            || `direct-usage-${Date.now()}-${Math.random().toString(36).slice(2)}`
        });
      }
      setPreparedFoodCountOpen(false);
      setPreparedFoodCountForm({ batchId: '', actualQuantity: '', reason: '', location: 'Main Store' });
      setMessage(
        `${preparedFoodCountMode === 'complimentary' ? 'Complimentary use' : 'Unrecorded use'} recorded for ${
          batch?.menuItemName || rawMaterial?.name || menuRecipe?.menuItemId?.name || 'the selected item'
        }.`
      );
      await loadPreparedFoodBatchHistory();
    } catch (error) {
      setPreparedFoodCountError(error.response?.data?.message || 'Could not record prepared-food use.');
      showApiErrorToast(error, 'Could not record prepared-food use');
    } finally {
      setPreparedFoodCountSaving(false);
    }
  };

  const toggleReportItemBatches = async (item) => {
    if (expandedReportBatchItemId === item._id) {
      setExpandedReportBatchItemId('');
      return;
    }

    setExpandedReportBatchItemId(item._id);
    if (Object.prototype.hasOwnProperty.call(batchesByItem, item._id) && !batchErrorsByItem[item._id]) {
      return;
    }
    await refreshBatchLedger(item._id);
  };

  const handleReceivePO = async (event) => {
    event.preventDefault();
    if (!selectedPO) return;
    try {
      await api.patch(`/inventory/purchase-orders/${selectedPO._id}/receive`, {
        items: receivingLines.filter((line) => Number(line.receivedQuantity) > 0),
        purchaseDate,
        invoiceNumber: event.currentTarget.invoiceNumber.value,
        invoiceAttachment: event.currentTarget.invoiceAttachment.value,
        location: storageLocationNameForId(receivingLocationId) || receivingLocation,
        locationId: receivingLocationId,
        notes: event.currentTarget.notes.value,
        idempotencyKey: `grn-${selectedPO._id}-${Date.now()}`
      });
      setIsReceivingOpen(false);
      setSelectedPO(null);
      setMessage('Goods receipt saved. Only accepted quantities were added to stock.');
      fetchInventory();
    } catch (err) {
      showApiErrorToast(err, 'Goods receipt failed');
    }
  };

  const handleApprovePurchaseOrder = async (poId) => {
    try {
      await api.patch(`/inventory/purchase-orders/${poId}/approve`);
      setMessage('Purchase order approved and issued to vendor.');
      fetchInventory();
    } catch (err) {
      showApiErrorToast(err, 'Purchase order approval failed');
    }
  };

  const openAutomaticPOReview = (po) => {
    const line = po.items?.[0];
    setSelectedAutomaticPO(po);
    setAutomaticPOReviewForm({
      vendorId: po.vendorId?._id || po.vendorId || '',
      quantity: line?.quantity ?? ''
    });
  };

  const handleReviewAutomaticPO = async (event, approve = false) => {
    event.preventDefault();
    if (!selectedAutomaticPO) return;
    try {
      await api.patch(`/inventory/purchase-orders/${selectedAutomaticPO._id}/review`, {
        vendorId: automaticPOReviewForm.vendorId,
        quantity: Number(automaticPOReviewForm.quantity)
      });
      if (approve) {
        await api.patch(`/inventory/purchase-orders/${selectedAutomaticPO._id}/approve`);
      }
      setSelectedAutomaticPO(null);
      setMessage(approve ? 'Automatic reorder approved and submitted to the supplier.' : 'Automatic reorder review saved.');
      fetchInventory();
    } catch (error) {
      showApiErrorToast(error, approve ? 'Could not approve automatic reorder' : 'Could not save automatic reorder review');
    }
  };

  const handleCreateDepartmentRequest = async (e) => {
    e.preventDefault();
    try {
      await api.post('/inventory/department-requests', {
        ...departmentForm,
        lines: departmentForm.lines.map((line) => ({ ...line, quantity: Number(line.quantity), unit: line.unit }))
      });
      setIsDepartmentRequestOpen(false);
      setMessage('Department stock request submitted.');
      fetchInventory();
    } catch (err) {
      showApiErrorToast(err, 'Could not submit stock request');
    }
  };

  const handleReviewDepartmentRequest = async (request, decision) => {
    try {
      await api.patch(`/inventory/department-requests/${request._id}/review`, { decision });
      setMessage(decision === 'approve' ? 'Stock request approved and issued.' : 'Stock request rejected.');
      fetchInventory();
    } catch (err) {
      showApiErrorToast(err, 'Could not review stock request');
    }
  };

  const handleSaveRecipe = async (e) => {
    e.preventDefault();
    try {
      await api.post('/inventory/recipes', {
        ...recipeForm,
        ingredients: recipeForm.ingredients.map((ingredient) => ({
          itemId: ingredient.itemId,
          quantity: Number(ingredient.quantity),
          unit: ingredient.unit,
          optional: ingredient.optional,
          substitutions: ingredient.substituteItemId ? [{
            itemId: ingredient.substituteItemId,
            ...(ingredient.substituteQuantity ? { quantity: Number(ingredient.substituteQuantity) } : {}),
            ...(ingredient.substituteUnit ? { unit: ingredient.substituteUnit } : {})
          }] : []
        }))
      });
      setIsRecipeOpen(false);
      setEditingRecipe(null);
      setRecipeForm({
        menuItemId: '',
        recipeName: '',
        description: '',
        servingSize: '1 serving',
        locationId: storageLocationIdForName('Restaurant Store')
          || storageLocationIdForName('Kitchen Store'),
        preparationTimeMinutes: 0,
        productionMode: 'made_to_order',
        expectedProductionYield: 1,
        expectedPreparationLossPercent: 0,
        ingredients: [{ itemId: '', quantity: 1, unit: '', optional: false, substituteItemId: '', substituteQuantity: '', substituteUnit: '' }]
      });
      setMessage('Recipe version saved. Historical consumption remains unchanged.');
      fetchInventory();
    } catch (err) {
      showApiErrorToast(err, 'Could not save recipe');
    }
  };

  const handleEditRecipe = (recipe) => {
    setEditingRecipe(recipe);
    setRecipeForm({
      menuItemId: String(recipe.menuItemId?._id || recipe.menuItemId || ''),
      recipeName: recipe.recipeName || '',
      description: recipe.description || '',
      servingSize: recipe.servingSize || '1 serving',
      preparationTimeMinutes: recipe.preparationTimeMinutes || 0,
      productionMode: recipe.productionMode || 'made_to_order',
      expectedProductionYield: recipe.expectedProductionYield || 1,
      expectedPreparationLossPercent: recipe.expectedPreparationLossPercent || 0,
      ingredients: recipe.ingredients.map((ingredient) => {
        const substitute = ingredient.substitutions?.[0];
        return {
          itemId: String(ingredient.itemId?._id || ingredient.itemId || ''),
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          optional: Boolean(ingredient.optional),
          substituteItemId: String(substitute?.itemId?._id || substitute?.itemId || ''),
          substituteQuantity: substitute?.quantity ?? '',
          substituteUnit: substitute?.unit || ''
        };
      })
    });
    setIsRecipeOpen(true);
  };

  const handleRecipeStatusChange = async (recipe) => {
    try {
      await api.patch(`/inventory/recipes/${recipe._id}/status`, { isActive: !recipe.isActive });
      setMessage(`Recipe ${recipe.isActive ? 'deactivated' : 'activated'}.`);
      await fetchInventory();
    } catch (err) {
      showApiErrorToast(err, 'Could not update recipe status');
    }
  };

  const handleTransferStock = async (e) => {
    e.preventDefault();
    try {
      await api.post('/inventory/transfers', {
        ...transferForm,
        quantity: Number(transferForm.quantity),
        idempotencyKey: `transfer-${Date.now()}`
      });
      setIsTransferOpen(false);
      setMessage(transferForm.transferMode === 'department'
        ? 'Stock transfer recorded between departments.'
        : 'Stock transfer recorded at both locations.');
      fetchInventory();
    } catch (err) {
      showApiErrorToast(err, 'Stock transfer failed');
    }
  };

  const handleCreateAdjustment = async (e) => {
    e.preventDefault();
    try {
      await api.post('/inventory/adjustments', {
        ...adjustmentForm,
        quantity: Number(adjustmentForm.quantity)
      });
      setIsAdjustmentOpen(false);
      setMessage('Stock adjustment recorded and inventory updated.');
      fetchInventory();
    } catch (err) {
      showApiErrorToast(err, 'Could not submit stock adjustment');
    }
  };

  const adjustmentRows = adjustments.flatMap((entry) => {
    const movement = entry.recordType === 'wastage' ? entry : entry.movementId;
    const allocations = movement?.batchAllocations?.length
      ? movement.batchAllocations
      : [null];
    return allocations.map((allocation, index) => ({
      id: `${entry._id}-${index}`,
      entry,
      movement,
      allocation,
      quantity: allocation?.quantity ?? movement?.quantity ?? entry.quantity,
      unit: movement?.baseUnit || entry.baseUnit || entry.unit || entry.itemId?.baseUnit || entry.itemId?.unit,
      batchNumber: allocation
        ? allocation.batchId?.batchNumber || (allocation.source === 'legacy' ? 'Legacy stock' : 'Unknown batch')
        : movement?.batchNumber || '—',
      loggedAt: movement?.createdAt || entry.createdAt
    }));
  });

  const loadMinibarRoom = async (roomId) => {
    setMinibarRoomId(roomId);
    setMinibarData(null);
    if (!roomId) return;
    try {
      const { data } = await api.get(`/inventory/minibar/rooms/${roomId}`);
      setMinibarData(data.data);
      setMinibarCounts(Object.fromEntries((data.data.stock || []).map((entry) => [entry.itemId._id, {
        consumedQuantity: 0,
        complimentaryQuantity: 0,
        damagedQuantity: 0,
        missingQuantity: 0,
        unit: entry.itemId.baseUnit || entry.itemId.unit
      }])));
    } catch (err) {
      showApiErrorToast(err, 'Could not load room minibar stock');
    }
  };

  const handleMinibarAssignment = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/inventory/minibar/rooms/${minibarRoomId}/stock`, {
        items: [{ ...minibarAssignForm, quantity: Number(minibarAssignForm.quantity) }],
        idempotencyKey: `minibar-restock-${Date.now()}`
      });
      setIsMinibarAssignOpen(false);
      setMessage('Room minibar replenished and stock transfer recorded.');
      loadMinibarRoom(minibarRoomId);
      fetchInventory();
    } catch (err) {
      showApiErrorToast(err, 'Minibar replenishment failed');
    }
  };

  const handleMinibarReconciliation = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/inventory/minibar/rooms/${minibarRoomId}/reconcile`, {
        items: Object.entries(minibarCounts).map(([itemId, quantities]) => ({ itemId, ...quantities })),
        idempotencyKey: `minibar-checkout-${minibarRoomId}-${Date.now()}`
      });
      setMessage('Minibar reconciliation recorded and guest charges posted to the room folio.');
      loadMinibarRoom(minibarRoomId);
      fetchInventory();
    } catch (err) {
      showApiErrorToast(err, 'Minibar reconciliation failed');
    }
  };

  const loadReport = async () => {
    if (reportType === 'profit-loss') {
      if (!reportFilters.from || !reportFilters.to) {
        setReportDateError(profitLossDateMode === 'day'
          ? 'Choose a day to view its profit and loss.'
          : 'Choose both dates to view profit and loss for a period.');
        return;
      }
      if (reportFilters.from > reportFilters.to) {
        setReportDateError('The start date must be on or before the end date.');
        return;
      }
    }
    setReportDateError('');
    const requestVersion = reportRequestVersion.current + 1;
    reportRequestVersion.current = requestVersion;
    setLoadingReport(true);
    setReport([]);
    setHasRunReport(false);
    try {
      const { data } = await api.get('/inventory/reports', {
        params: { type: reportType, ...reportFilters }
      });
      if (requestVersion === reportRequestVersion.current) {
        setReport(data.data || []);
        setHasRunReport(true);
      }
    } catch (err) {
      if (requestVersion === reportRequestVersion.current) {
        showApiErrorToast(err, 'Could not load inventory report');
      }
    } finally {
      if (requestVersion === reportRequestVersion.current) {
        setLoadingReport(false);
      }
    }
  };

  const updateReportFilters = (updates) => {
    reportRequestVersion.current += 1;
    setReportFilters((current) => ({ ...current, ...updates }));
    setReport([]);
    setReportDateError('');
    setLoadingReport(false);
    setHasRunReport(false);
  };

  const changeReportType = (type) => {
    reportRequestVersion.current += 1;
    setReportType(type);
    setReport([]);
    setReportDateError('');
    setLoadingReport(false);
    setHasRunReport(false);
    if (type === 'profit-loss') {
      const today = getDateInTimeZone(hotel?.timezone);
      setProfitLossDateMode('day');
      setReportFilters((current) => ({ ...current, from: today, to: today }));
    }
  };

  const exportReport = async () => {
    try {
      const response = await api.get('/inventory/reports/export', {
        params: { type: reportType, ...reportFilters },
        responseType: 'blob'
      });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `inventory-${reportType}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      showApiErrorToast(err, 'Could not export inventory report');
    }
  };

  const exportExcelReport = async () => {
    if (!report.length) return;
    try {
      const XLSX = await import('@e965/xlsx');
      const workbook = XLSX.utils.book_new();
      if (reportType === 'profit-loss') {
        const summary = report[0];
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([
          { Metric: 'Paid sales revenue (excludes tax)', Value: summary.salesRevenue },
          { Metric: 'Recorded food cost', Value: summary.costOfGoodsSold },
          { Metric: 'Uncosted paid sales', Value: summary.uncostedSalesRevenue },
          { Metric: 'Gross profit / (loss)', Value: summary.grossProfit },
          { Metric: 'Raw material wastage and expiry', Value: summary.stockWastageCost },
          { Metric: 'Prepared food wastage', Value: summary.preparedWastageCost },
          { Metric: 'Unrecorded raw-material consumption', Value: summary.unrecordedConsumptionCost },
          { Metric: 'Unrecorded prepared-food consumption', Value: summary.unrecordedFoodCost },
          { Metric: 'Complimentary food cost', Value: summary.complimentaryCost },
          { Metric: 'Staff consumption cost', Value: summary.staffConsumptionCost },
          { Metric: 'Total losses and non-sale cost', Value: summary.inventoryLoss },
          { Metric: 'Total inventory expenses', Value: summary.totalInventoryExpenses },
          { Metric: 'Net profit / (loss)', Value: summary.netProfit },
          { Metric: 'Stock purchases (inventory asset)', Value: summary.stockPurchasesNotExpensed }
        ]), 'Profit and Loss');
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summary.menuItemBreakdown || []), 'Menu Item Profitability');
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summary.stockWastageBreakdown || []), 'Raw Material Wastage');
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summary.preparedWastageBreakdown || []), 'Prepared Food Wastage');
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summary.unrecordedConsumption || []), 'Unrecorded Consumption');
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summary.unrecordedFoodBreakdown || []), 'Unrecorded Prepared Food');
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summary.complimentaryBreakdown || []), 'Complimentary');
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summary.complimentaryRawMaterialBreakdown || []), 'Complimentary Ingredients');
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summary.unrecordedFoodRawMaterialBreakdown || []), 'Unrecorded Food Ingredients');
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summary.staffConsumptionBreakdown || []), 'Staff Consumption');
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summary.topSellingItems || []), 'Top Selling');
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summary.topProfitItems || []), 'Top Profit');
      } else if (reportType === 'financial') {
        const summary = report[0];
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([
          { Metric: 'Total purchase value', Value: summary.totalPurchaseValue },
          { Metric: 'Total consumption cost', Value: summary.totalConsumptionCost },
          { Metric: 'Total wastage loss', Value: summary.totalWastageLoss },
          { Metric: 'Closing inventory value', Value: summary.closingInventoryValue },
          { Metric: 'Stock adjustment value', Value: summary.stockAdjustmentValue },
          { Metric: 'Total raw material cost', Value: summary.totalRawMaterialCost }
        ]), 'Summary');
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summary.vendorBreakdown || []), 'Vendor Purchases');
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summary.itemBreakdown || []), 'Raw Materials');
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summary.monthlyTrend || []), 'Monthly Trend');
      } else {
        const rows = report.map((row) => Object.fromEntries(
          Object.entries(row).map(([key, value]) => [
            key,
            value && typeof value === 'object' && !(value instanceof Date)
              ? JSON.stringify(value)
              : value
          ])
        ));
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Inventory Report');
      }
      XLSX.writeFile(workbook, `inventory-${reportType}-${dayjs().format('YYYY-MM-DD')}.xlsx`);
    } catch (err) {
      showApiErrorToast(err, 'Could not export Excel report');
    }
  };

  const exportPdfReport = async () => {
    if (!report.length) return;
    try {
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable')
    ]);
    const document = new jsPDF({ orientation: 'landscape' });
    document.setFontSize(16);
    document.text(`Inventory ${reportType.replace(/-/g, ' ')} report`, 14, 16);
    document.setFontSize(9);
    document.text(`Generated ${dayjs().format('YYYY-MM-DD HH:mm')}`, 14, 22);
    if (reportType === 'profit-loss') {
      const summary = report[0];
      autoTable(document, {
        startY: 28,
        head: [['Profit & Loss', 'Amount']],
        body: [
          ['Paid sales revenue (excludes tax)', formatCurrency(summary.salesRevenue || 0)],
          ['Recorded food cost', formatCurrency(summary.costOfGoodsSold || 0)],
          ['Uncosted paid sales', formatCurrency(summary.uncostedSalesRevenue || 0)],
          ['Gross profit / (loss)', summary.grossProfit == null ? 'Not available' : formatCurrency(summary.grossProfit)],
          ['Raw material wastage and expiry', formatCurrency(summary.stockWastageCost || 0)],
          ['Prepared food wastage', formatCurrency(summary.preparedWastageCost || 0)],
          ['Unrecorded raw-material consumption', formatCurrency(summary.unrecordedConsumptionCost || 0)],
          ['Unrecorded prepared-food consumption', formatCurrency(summary.unrecordedFoodCost || 0)],
          ['Complimentary food cost', formatCurrency(summary.complimentaryCost || 0)],
          ['Staff consumption cost', formatCurrency(summary.staffConsumptionCost || 0)],
          ['Total losses and non-sale cost', formatCurrency(summary.inventoryLoss || 0)],
          ['Total inventory expenses', formatCurrency(summary.totalInventoryExpenses || 0)],
          ['Net profit / (loss)', summary.netProfit == null ? 'Not available' : formatCurrency(summary.netProfit)],
          ['Stock purchases (inventory asset; not expensed)', formatCurrency(summary.stockPurchasesNotExpensed || 0)]
        ]
      });
      autoTable(document, {
        startY: document.lastAutoTable.finalY + 8,
        head: [['Menu item', 'Quantity sold', 'AC qty', 'Non-AC qty', 'Net sales', 'Recipe cost', 'Gross profit / (loss)', 'Gross margin']],
        body: (summary.menuItemBreakdown || []).map((item) => [
          item.name,
          item.quantitySold,
          item.acQuantitySold || 0,
          item.nonAcQuantitySold || 0,
          formatCurrency(item.salesRevenue),
          item.foodCost == null ? 'Not available' : formatCurrency(item.foodCost),
          item.grossProfit == null ? 'Not available' : formatCurrency(item.grossProfit),
          item.grossMarginPercent == null ? '—' : `${item.grossMarginPercent}%`
        ])
      });
      autoTable(document, {
        startY: document.lastAutoTable.finalY + 8,
        head: [['Wasted item / product', 'Type', 'Quantity', 'Cost', 'Department / location', 'Reason']],
        body: [
          ...(summary.stockWastageBreakdown || []).map((entry) => [
            entry.itemName, entry.movementType, `${entry.quantity} ${entry.unit}`, formatCurrency(entry.cost),
            entry.department, entry.reason
          ]),
          ...(summary.preparedWastageBreakdown || []).map((entry) => [
            entry.itemName, entry.movementType, `${entry.quantity} ${entry.unit}`, formatCurrency(entry.cost),
            entry.location, entry.reason
          ])
        ]
      });
      autoTable(document, {
        startY: document.lastAutoTable.finalY + 8,
        head: [['Unrecorded material', 'Quantity', 'Cost', 'Department', 'Reference', 'Reason']],
        body: (summary.unrecordedConsumption || []).map((entry) => [
          entry.itemName, `${entry.quantity} ${entry.unit}`, formatCurrency(entry.cost),
          entry.department, entry.reference, entry.reason
        ])
      });
      autoTable(document, {
        startY: document.lastAutoTable.finalY + 8,
        head: [['Unrecorded prepared food', 'Quantity', 'Cost', 'Location', 'Reason']],
        body: (summary.unrecordedFoodBreakdown || []).map((entry) => [
          entry.itemName, `${entry.quantity} ${entry.unit}`, formatCurrency(entry.cost),
          entry.location, entry.reason
        ])
      });
      autoTable(document, {
        startY: document.lastAutoTable.finalY + 8,
        head: [['Complimentary ingredient', 'Menu item', 'Quantity', 'Cost', 'Location']],
        body: (summary.complimentaryRawMaterialBreakdown || []).map((entry) => [
          entry.itemName, entry.menuItemName, `${entry.quantity} ${entry.unit}`,
          formatCurrency(entry.cost), entry.location
        ])
      });
      autoTable(document, {
        startY: document.lastAutoTable.finalY + 8,
        head: [['Unrecorded-use ingredient', 'Menu item', 'Quantity', 'Cost', 'Location']],
        body: (summary.unrecordedFoodRawMaterialBreakdown || []).map((entry) => [
          entry.itemName, entry.menuItemName, `${entry.quantity} ${entry.unit}`,
          formatCurrency(entry.cost), entry.location
        ])
      });
      autoTable(document, {
        startY: document.lastAutoTable.finalY + 8,
        head: [['Complimentary item', 'Quantity', 'Cost', 'Location', 'Reason']],
        body: (summary.complimentaryBreakdown || []).map((entry) => [
          entry.itemName, `${entry.quantity} ${entry.unit}`, formatCurrency(entry.cost),
          entry.location, entry.reason
        ])
      });
    } else if (reportType === 'financial') {
      const summary = report[0];
      autoTable(document, {
        startY: 28,
        head: [['Metric', 'Value']],
        body: [
          ['Total purchase value', formatCurrency(summary.totalPurchaseValue || 0)],
          ['Total consumption cost', formatCurrency(summary.totalConsumptionCost || 0)],
          ['Total wastage loss', formatCurrency(summary.totalWastageLoss || 0)],
          ['Closing inventory value', formatCurrency(summary.closingInventoryValue || 0)],
          ['Stock adjustment value', formatCurrency(summary.stockAdjustmentValue || 0)],
          ['Total raw material cost', formatCurrency(summary.totalRawMaterialCost || 0)]
        ]
      });
      autoTable(document, {
        startY: document.lastAutoTable.finalY + 8,
        head: [['Vendor', 'Receipts', 'Purchase value']],
        body: (summary.vendorBreakdown || []).map((vendor) => [
          vendor.vendorName,
          vendor.receiptCount,
          formatCurrency(vendor.totalPurchaseValue)
        ])
      });
      autoTable(document, {
        startY: document.lastAutoTable.finalY + 8,
        head: [['Raw material', 'Purchased', 'Consumed', 'Wasted', 'Purchase value', 'Consumption cost', 'Wastage cost']],
        body: (summary.itemBreakdown || []).map((item) => [
          `${item.name} (${item.code})`,
          `${item.purchasedQuantity} ${item.unit}`,
          `${item.consumedQuantity} ${item.unit}`,
          `${item.wastedQuantity} ${item.unit}`,
          formatCurrency(item.purchaseValue),
          formatCurrency(item.consumptionCost),
          formatCurrency(item.wastageCost)
        ])
      });
    } else {
      const rows = report.map((row) => [
        row.date || row.month || row.transactionDate || row.receivedAt || row.verifiedAt || row.createdAt || '',
        row.name || row.poNumber || row.itemId?.name || row.itemName || '',
        row.movementType || row.status || '',
        row.quantity !== undefined ? `${row.quantity} ${row.unit || row.itemId?.unit || ''}` : '',
        row.vendorId?.name || row.department || '',
        formatCurrency(row.stockValue ?? row.totalAmount ?? row.totalCost ?? row.totalValue ?? 0)
      ]);
      autoTable(document, {
        startY: 28,
        head: [['Date', 'Item / Reference', 'Type / Status', 'Quantity', 'Vendor / Department', 'Value']],
        body: rows
      });
    }
    document.save(`inventory-${reportType}-${dayjs().format('YYYY-MM-DD')}.pdf`);
    } catch (err) {
      showApiErrorToast(err, 'Could not export PDF report');
    }
  };

  const visibleItems = items.filter((item) => {
    const matchesSearch = `${item.name} ${item.code} ${item.barcode || ''}`.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (categoryFilter === 'all' || item.category === categoryFilter);
  });
  const inventoryCategories = [...new Set(items.map((item) => item.category).filter(Boolean))]
    .map((category) => ({
      category,
      count: items.filter((item) => item.category === category).length
    }));
  const rawMaterialsForReceipt = items.filter((item) => item.inventoryType === 'raw_material' && item.isActive !== false);
  const selectedRawMaterialForReceipt = rawMaterialsForReceipt.find((item) => item._id === itemForm.itemId);
  const receiptPurchaseUnits = rawMaterialPurchaseUnits(selectedRawMaterialForReceipt);
  const selectedReceiptPurchaseUnit = receiptPurchaseUnits.find((unit) => unit.symbol === itemForm.unit);
  const receiptBaseUnit = selectedRawMaterialForReceipt?.baseUnit || selectedRawMaterialForReceipt?.unit || '';
  const receiptDeductionUnit = receiptPurchaseUnits.find((unit) => unit.symbol === itemForm.existingStockDeductionUnit);
  const receiptBasePrice = selectedReceiptPurchaseUnit && itemForm.purchasePrice !== ''
    && Number.isFinite(Number(itemForm.purchasePrice)) && Number(itemForm.purchasePrice) >= 0
    ? Number(itemForm.purchasePrice) / selectedReceiptPurchaseUnit.factor
    : null;
  const receiptWastageUnit = receiptPurchaseUnits.find((unit) => unit.symbol === itemForm.wastageUnit);
  const receiptPreviousAvailable = receiptBatches.reduce(
    (total, batch) => total + Math.max(0, Number(batch.remainingQuantity) || 0), 0
  );
  const receiptDeductionQuantity = (Number(itemForm.existingStockDeduction) || 0)
    * (receiptDeductionUnit?.factor || 1);
  const receiptDeductionMaximum = receiptDeductionUnit
    ? receiptPreviousAvailable / receiptDeductionUnit.factor
    : receiptPreviousAvailable;
  const receiptNewBaseQuantity = selectedReceiptPurchaseUnit && Number(itemForm.quantity) > 0
    ? Number(itemForm.quantity) * selectedReceiptPurchaseUnit.factor
    : 0;
  const receiptRemainingAfterReceipt = Math.max(
    0,
    receiptPreviousAvailable - receiptDeductionQuantity + receiptNewBaseQuantity
  );
  const receiptWastageAvailableQuantity = receiptNewBaseQuantity
    + (receiptDeductionQuantity > 0
      ? Math.max(0, receiptPreviousAvailable - receiptDeductionQuantity)
      : 0);
  const receiptWastageBaseQuantity = itemForm.hasWastage === 'yes'
    && receiptWastageUnit && Number(itemForm.wastageQuantity) > 0
    ? Number(itemForm.wastageQuantity) * receiptWastageUnit.factor
    : 0;
  const receiptRemainingAfterWastage = Math.max(
    0,
    receiptRemainingAfterReceipt - receiptWastageBaseQuantity
  );
  const selectedVerificationItem = items.find((item) => item._id === verificationForm.itemId);
  const verificationBaseUnit = selectedVerificationItem?.baseUnit || selectedVerificationItem?.unit || '';
  const verificationUnitFactor = conversionFactorForItem(selectedVerificationItem, verificationForm.unit);
  const verificationLocationBalance = verificationBalances.find((balance) => (
    String(balance.locationId?._id || balance.locationId || '') === String(verificationForm.locationId)
    || balance.location === verificationForm.location
  ));
  const verificationLocationBatches = verificationBatches.filter((batch) => (
    String(batch.locationId?._id || batch.locationId || '') === String(verificationForm.locationId)
    || (batch.location || 'Main Store') === verificationForm.location
  ));
  const verificationLocationOptions = storageLocationOptions;
  const verificationExpectedStock = Number(
    verificationLocationBalance?.quantity
      ?? (storageLocationById(verificationForm.locationId)?.locationTypeId?.key === 'main_store'
        || verificationForm.location === 'Main Store' ? selectedVerificationItem?.currentStock : 0)
  ) || 0;
  const verificationActualStock = Math.max(0, Number(verificationForm.actualStock) || 0) * verificationUnitFactor;
  const verificationConsumption = Math.max(0, Number(verificationForm.consumptionQuantity) || 0)
    * conversionFactorForItem(selectedVerificationItem, verificationForm.consumptionUnit || verificationForm.unit);
  const verificationWastage = Math.max(0, Number(verificationForm.wastageQuantity) || 0)
    * conversionFactorForItem(selectedVerificationItem, verificationForm.wastageUnit || verificationForm.unit);
  const verificationReduction = Math.max(0, verificationExpectedStock - verificationActualStock);
  const verificationDiscrepancy = Math.max(
    0,
    verificationReduction - verificationConsumption - verificationWastage
  );
  const verificationGain = Math.max(0, verificationActualStock - verificationExpectedStock);
  const formatReceiptQuantity = (quantity) => new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 8
  }).format(Number(quantity) || 0);
  const formatInventoryUnitCost = (amount) => {
    const value = Number(amount);
    if (!Number.isFinite(value)) return formatCurrency(0);
    return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(value);
  };
  const movementTrendByDate = new Map(
    (dashboard?.movementTrend || []).map((entry) => [entry._id, entry])
  );
  const preparedFoodUnrecordedByDate = new Map();
  preparedFoodMovements
    .filter((movement) => movement.movementType === 'unrecorded_consumption')
    .forEach((movement) => {
      const dateKey = dayjs(movement.createdAt).format('YYYY-MM-DD');
      preparedFoodUnrecordedByDate.set(
        dateKey,
        (preparedFoodUnrecordedByDate.get(dateKey) || 0) + (Number(movement.totalCost) || 0)
      );
    });
  const inventoryMovementTrend = Array.from({ length: 14 }, (_, index) => {
    const date = dayjs().startOf('day').subtract(13 - index, 'day');
    const dateKey = date.format('YYYY-MM-DD');
    const entry = movementTrendByDate.get(dateKey) || {};
    return {
      date: dateKey,
      incoming: Number(entry.incoming) || 0,
      wastage: Number(entry.wastage) || 0,
      unrecordedUsage: (Number(entry.unrecordedUsage) || 0)
        + (preparedFoodUnrecordedByDate.has(dateKey)
          ? preparedFoodUnrecordedByDate.get(dateKey)
          : Number(entry.preparedFoodUnrecordedUsage) || 0),
      recordedUsage: Number(entry.recordedUsage) || 0
    };
  });
  const reportTableConfig = (() => {
    if (reportType === 'stock' || reportType === 'valuation') {
      return {
        headers: [
          'Inventory item',
          'Item code',
          reportType === 'stock' ? 'Available stock' : 'On hand',
          'Restock level',
          ...(reportType === 'valuation' ? ['Stock value'] : []),
          'Batch details'
        ],
        rows: report.map((row) => ({
          key: row._id,
          item: row,
          cells: [
            row.name || 'Inventory item',
            row.code || '—',
            formatInventoryQuantity(reportType === 'stock' ? row.availableStock : row.currentStock, row),
            formatInventoryQuantity(row.minStockThreshold, row),
            ...(reportType === 'valuation' ? [formatCurrency(row.stockValue || 0)] : [])
          ]
        }))
      };
    }
    if (reportType === 'purchases') {
      return {
        headers: ['Received on', 'Receipt / purchase order', 'Raw material', 'Accepted quantity', 'Received value'],
        rows: report.flatMap((receipt) => (receipt.lines || []).map((line, index) => ({
          key: `${receipt._id}-${index}`,
          cells: [
            receipt.receivedAt ? dayjs(receipt.receivedAt).format('DD MMM YYYY') : '—',
            `${receipt.receiptNumber || 'Received order'} · ${receipt.purchaseOrderId?.poNumber || '—'}`,
            line.itemId?.name || 'Inventory item',
            `${formatInventoryQuantity(line.acceptedQuantity, { unit: line.baseUnit || line.itemId?.baseUnit || line.unit })} ${line.baseUnit || line.itemId?.baseUnit || line.unit || ''}`,
            formatCurrency((Number(line.acceptedQuantity) || 0) * (Number(line.taxInclusiveUnitCost ?? line.unitCost) || 0) + (Number(line.purchaseTaxAmount) || 0))
          ]
        })))
      };
    }
    if (reportType === 'verifications') {
      return {
        headers: ['Date checked', 'Inventory item', 'Expected / actual', 'Location', 'Difference'],
        rows: report.map((row) => ({
          key: row._id,
          cells: [
            row.verifiedAt ? dayjs(row.verifiedAt).format('DD MMM YYYY, h:mm A') : '—',
            row.itemId?.name || 'Inventory item',
            `${formatInventoryQuantity(row.expectedStock, row.itemId || {})} / ${formatInventoryQuantity(row.actualStock, row.itemId || {})}`,
            row.location || '—',
            `${formatInventoryQuantity(row.actualStock - row.expectedStock, row.itemId || {})} ${row.unit || row.itemId?.unit || ''}`
          ]
        }))
      };
    }
    if (reportType === 'recipe-consumption') {
      const rows = report.flatMap((consumption) => (consumption.ingredients || []).map((ingredient, index) => ({
        key: `${consumption._id}-${index}`,
        cells: [
          consumption.deductedAt ? dayjs(consumption.deductedAt).format('DD MMM YYYY, h:mm A') : '—',
          ingredient.itemId?.name || ingredient.menuItemName || 'Ingredient',
          `${formatInventoryQuantity(ingredient.quantity, { unit: ingredient.baseUnit || ingredient.unit })} ${ingredient.baseUnit || ingredient.unit || ''}`,
          `${ingredient.menuItemName || 'Menu item'} · ${consumption.orderNumber || '—'}`,
          formatCurrency(ingredient.totalCost || 0)
        ]
      })));
      return { headers: ['Date used', 'Ingredient', 'Quantity', 'Menu item / order', 'Food cost'], rows };
    }
    if (reportType === 'recipe-usage' || reportType === 'recipe-monthly-usage') {
      return {
        headers: [reportType === 'recipe-usage' ? 'Date used' : 'Month', 'Ingredient', 'Menu item', 'Orders', 'Quantity / cost'],
        rows: report.map((row) => ({
          key: `${row.date || row.month}-${row.itemId}-${row.menuItemId}`,
          cells: [
            row.date ? dayjs(row.date).format('DD MMM YYYY') : row.month || '—',
            `${row.itemName || 'Ingredient'}${row.code ? ` (${row.code})` : ''}`,
            row.menuItemName || '—',
            row.orderCount || 0,
            `${formatInventoryQuantity(row.quantity, { unit: row.unit })} ${row.unit || ''} · ${formatCurrency(row.totalCost || 0)}`
          ]
        }))
      };
    }
    if (reportType === 'expiry') {
      return {
        headers: ['Expiry date', 'Inventory item', 'Batch', 'Accepted quantity', 'Receipt'],
        rows: report.map((row, index) => ({
          key: `${row.receiptNumber}-${row.batchNumber}-${index}`,
          cells: [
            row.expiryDate ? dayjs(row.expiryDate).format('DD MMM YYYY') : '—',
            `${row.itemName || 'Inventory item'}${row.code ? ` (${row.code})` : ''}`,
            row.batchNumber || '—',
            `${formatInventoryQuantity(row.quantity, { unit: row.unit })} ${row.unit || ''}`,
            row.receiptNumber || '—'
          ]
        }))
      };
    }
    return {
      headers: ['Date', 'Inventory item', 'Movement / quantity', 'Department / reference', 'Recorded value'],
      rows: report.map((row, index) => ({
        key: row._id || index,
        cells: [
          row.date || row.month || (row.transactionDate || row.createdAt ? dayjs(row.transactionDate || row.createdAt).format('DD MMM YYYY') : '—'),
          row.itemId?.name || row.itemName || row.menuItemId?.name || row.name || '—',
          row.movementType
            ? `${String(row.movementType).replace(/_/g, ' ')} · ${formatInventoryQuantity(Math.abs(Number(row.quantity) || 0), row.itemId || {})} ${row.itemId?.baseUnit || row.itemId?.unit || row.unit || ''}`
            : row.quantity !== undefined
              ? `${formatInventoryQuantity(row.quantity, { unit: row.unit })} ${row.unit || ''}`
              : String(row.status || row.poNumber || '—').replace(/_/g, ' '),
          row.department || row.vendorId?.name || row.orderNumber || row.menuItemName || (row.orderCount ? `${row.orderCount} order(s)` : '—'),
          row.totalValue !== undefined ? formatCurrency(row.totalValue)
            : row.stockValue !== undefined ? formatCurrency(row.stockValue)
              : row.totalAmount !== undefined ? formatCurrency(row.totalAmount)
                : row.totalCost !== undefined ? formatCurrency(row.totalCost)
                  : '—'
        ]
      }))
    };
  })();

  useEffect(() => {
    if (['dashboard', 'prepared-food'].includes(activeTab)) loadPreparedFoodBatchHistory();
  }, [activeTab]);

  const preparedFoodBatchById = new Map(
    preparedFoodBatches.map((batch) => [String(batch._id), batch])
  );
  const preparedFoodUsageRows = preparedFoodMovements
    .filter((movement) => ['unrecorded_consumption', 'complimentary'].includes(movement.movementType))
    .map((movement) => {
      const batch = preparedFoodBatchById.get(String(movement.productionBatchId));
      const portionRatio = Number(batch?.acceptedQuantity) > 0
        ? Number(movement.quantity || 0) / Number(batch.acceptedQuantity)
        : 0;
      return {
        ...movement,
        batchNumber: batch?.batchNumber || 'Batch details unavailable',
        rawMaterials: (batch?.ingredients || []).map((ingredient) => ({
          itemName: ingredient.itemName || 'Raw material',
          quantity: Number(ingredient.actualQuantity || 0) * portionRatio,
          unit: ingredient.unit || '',
          cost: Number(ingredient.totalCost || 0) * portionRatio
        }))
      };
    })
    .concat(directInventoryUsage.map((usage) => ({
      ...usage,
      directUsage: true,
      itemName: usage.targetName,
      menuItemId: { name: usage.targetName },
      batchNumber: usage.targetType === 'menu_item' ? 'Made-to-order menu item' : 'Direct raw material use',
      movementType: usage.usageType,
      quantity: usage.targetQuantity,
      totalCost: usage.totalCost,
      rawMaterials: usage.ingredients || []
    })));
  const selectedPreparedFoodBatch = preparedFoodBatches.find(
    (batch) => preparedFoodCountTargetType === 'batch'
      && String(batch._id) === preparedFoodCountForm.batchId
  );
  const selectedDirectMenuRecipe = recipes.find(
    (recipe) => preparedFoodCountTargetType === 'menu_item'
      && String(recipe._id) === preparedFoodCountForm.batchId
      && recipe.isActive !== false
      && recipe.productionMode === 'made_to_order'
  );
  const selectedDirectRawMaterial = items.find(
    (item) => preparedFoodCountTargetType === 'raw_material'
      && String(item._id) === preparedFoodCountForm.batchId
      && item.inventoryType === 'raw_material'
      && item.isActive !== false
  );
  const selectedDirectTarget = selectedDirectMenuRecipe || selectedDirectRawMaterial;
  const selectedDirectUnitCost = selectedDirectRawMaterial
    ? Number(selectedDirectRawMaterial.unitCost) || 0
    : Number(selectedDirectMenuRecipe?.costPerServing ?? selectedDirectMenuRecipe?.estimatedRecipeCost) || 0;
  const directUsageUnit = selectedDirectMenuRecipe
    ? selectedDirectMenuRecipe.servingSize || 'portion'
    : selectedDirectRawMaterial?.baseUnit || selectedDirectRawMaterial?.unit || 'unit';
  const preparedFoodRecordedUsed = selectedPreparedFoodBatch
    ? Number(selectedPreparedFoodBatch.soldQuantity || 0)
      + Number(selectedPreparedFoodBatch.wastedQuantity || 0)
      + Number(selectedPreparedFoodBatch.complimentaryQuantity || 0)
      + Number(selectedPreparedFoodBatch.unrecordedQuantity || 0)
      + Number(selectedPreparedFoodBatch.staffConsumptionQuantity || 0)
    : 0;
  const preparedFoodAdditionalUsed = Number(preparedFoodCountForm.actualQuantity) || 0;
  const preparedFoodCountDifference = preparedFoodAdditionalUsed;
  const preparedFoodTotalUsed = preparedFoodRecordedUsed + preparedFoodAdditionalUsed;
  const preparedFoodCountExceedsAvailable = preparedFoodCountForm.actualQuantity !== ''
    && preparedFoodCountTargetType === 'batch'
    && preparedFoodAdditionalUsed > Number(selectedPreparedFoodBatch?.availableQuantity || 0);
  const preparedFoodCountCost = preparedFoodCountDifference
    * (Number(selectedPreparedFoodBatch?.costPerPortion) || selectedDirectUnitCost);

  return (
    <div className="inventory-page w-full min-w-0 space-y-6">
      {/* Header */}
      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Inventory Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            A clear view of your stock, purchases, kitchen usage, and reports.
          </p>
        </div>

        <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:items-center lg:justify-end">
          {canWriteModule('raw_materials') && (
            <Button className="w-full sm:w-auto" variant="outline" size="sm" icon={ClipboardList} onClick={() => setIsDepartmentRequestOpen(true)}>
              Request Stock
            </Button>
          )}
          {canWriteModule('stock_verification') && (
            <Button className="w-full sm:w-auto" variant="outline" size="sm" icon={AlertTriangle} onClick={() => setIsAdjustmentOpen(true)}>
              Report Wastage
            </Button>
          )}
          {canWriteModule('stock_verification') && (
            <Button className="w-full sm:w-auto" variant="outline" size="sm" icon={ClipboardList} onClick={() => openStockVerification()}>
              Verify Stock
            </Button>
          )}
          {canWriteModule('stock_verification') && (
            <>
              <Button className="w-full sm:w-auto" variant="outline" size="sm" icon={ArrowLeftRight} onClick={() => setIsTransferOpen(true)}>
                Transfer
              </Button>
            </>
          )}
          {canWriteModule('raw_materials') && (
            <>
              <Button className="w-full sm:w-auto" variant="outline" size="sm" icon={PackageCheck} onClick={() => setIsPurchaseOrderOpen(true)}>
                New Purchase
              </Button>
              <Button className="w-full sm:w-auto" variant="outline" size="sm" icon={Truck} onClick={() => setIsAddVendorOpen(true)}>
                Add Vendor
              </Button>
              <Button className="w-full sm:w-auto" variant="primary" size="sm" icon={PlusCircle} onClick={() => setIsAddItemOpen(true)}>
                Receive Raw Material
              </Button>
            </>
          )}
        </div>
      </div>

      {message && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Inventory navigation */}
      {(() => {
        const sections = [
          {
            id: 'overview',
            label: 'Overview',
            icon: LayoutDashboard,
            links: [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }]
          },
          {
            id: 'stock',
            label: 'Stock',
            icon: Boxes,
            links: [
              { id: 'items', label: `Items${items.length ? ` (${items.length})` : ''}`, icon: Boxes },
              { id: 'categories', label: 'Categories', icon: Tag },
              { id: 'ledger', label: 'Stock movements', icon: ArrowLeftRight },
              { id: 'verifications', label: `Stock checks${dashboard?.pendingStockVerifications ? ` (${dashboard.pendingStockVerifications} due)` : ''}`, icon: ClipboardList }
            ]
          },
          {
            id: 'purchasing',
            label: 'Purchasing',
            icon: Truck,
            links: [
              { id: 'pos', label: `Purchase orders${purchaseOrders.length ? ` (${purchaseOrders.length})` : ''}`, icon: PackageCheck },
              { id: 'vendors', label: `Vendors${vendors.length ? ` (${vendors.length})` : ''}`, icon: Truck },
              { id: 'requests', label: 'Department requests', icon: ClipboardList }
            ]
          },
          {
            id: 'kitchen',
            label: 'Kitchen & usage',
            icon: Utensils,
            links: [
              { id: 'recipes', label: 'Recipes', icon: Utensils },
              { id: 'prepared-food', label: 'Prepared food usage', icon: Receipt },
              { id: 'adjustments', label: 'Wastage & adjustments', icon: AlertTriangle },
              { id: 'minibar', label: 'Minibar', icon: PackageCheck }
            ]
          },
          {
            id: 'reports',
            label: 'Reports',
            icon: BarChart3,
            links: [{ id: 'reports', label: 'Reports & analytics', icon: BarChart3 }]
          }
        ];
        const selectedSection = sections.find((section) => section.id === selectedInventorySection) || sections[0];

        return (
          <nav className="overflow-hidden rounded-2xl border border-[#eadfce] bg-white shadow-sm shadow-[#3b241a]/5" aria-label="Inventory sections">
            <div className="flex gap-1 overflow-x-auto border-b border-[#f0e8dc] p-2 sm:p-3">
              {sections.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelectedInventorySection(id)}
                  aria-pressed={selectedInventorySection === id}
                  className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors sm:px-4 ${
                    selectedInventorySection === id
                      ? 'bg-[#3b241a] text-white shadow-sm'
                      : 'text-slate-600 hover:bg-[#faf7f0] hover:text-[#3b241a]'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                  {id === 'stock' && (dashboard?.lowStockItems || 0) + (dashboard?.outOfStockItems || 0) > 0 && (
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      selectedInventorySection === id ? 'bg-white/15 text-white' : 'bg-rose-50 text-rose-700'
                    }`}>
                      {(dashboard?.lowStockItems || 0) + (dashboard?.outOfStockItems || 0)}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="flex min-h-16 flex-wrap items-center gap-2 bg-[#fdfbf8] px-3 py-3 sm:px-4">
              <span className="mr-1 hidden text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:inline">
                {selectedSection.label}
              </span>
              {selectedSection.links.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => selectInventoryTab(id)}
                  aria-current={activeTab === id ? 'page' : undefined}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-all sm:text-sm ${
                    activeTab === id
                      ? 'border-[#e8d2a6] bg-white text-[#3b241a] shadow-sm'
                      : 'border-transparent text-slate-600 hover:border-[#eadfce] hover:bg-white hover:text-[#3b241a]'
                  }`}
                >
                  <Icon className="h-4 w-4 text-[#9a6b32]" />
                  {label}
                </button>
              ))}
            </div>
          </nav>
        );
      })()}

      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <section className="rounded-3xl bg-gradient-to-br from-[#3b241a] to-[#69442d] p-5 text-white shadow-lg shadow-[#3b241a]/10 sm:p-7">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#e8d2a6]">Your inventory overview</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Stock status, at a glance.</h2>
            <p className="mt-2 max-w-2xl text-sm text-white/75">See what you have, what it is worth, and what needs attention.</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                { label: 'Items tracked', value: dashboard?.totalItems ?? items.length, note: 'Active inventory items', icon: Boxes },
                { label: 'Items to restock', value: (dashboard?.lowStockItems || 0) + (dashboard?.outOfStockItems || 0), note: 'Low or out of stock', icon: AlertTriangle },
                { label: 'Stock value', value: formatCurrency(dashboard?.totalStockValue || 0), note: 'Estimated value of current stock', icon: BarChart3 }
              ].map(({ label, value, note, icon: Icon }) => (
                <div key={label} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                  <div>
                    <p className="text-xs font-semibold text-white/70">{label}</p>
                    <p className="mt-1 text-2xl font-black">{value}</p>
                    <p className="mt-1 text-xs text-white/60">{note}</p>
                  </div>
                  <span className="rounded-xl bg-white/10 p-3 text-[#f2d89f]"><Icon className="h-5 w-5" /></span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-[#eadfce] bg-white p-4 shadow-sm sm:p-6">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <h2 className="text-lg font-black text-slate-900">What needs attention?</h2>
                <p className="mt-1 text-sm text-slate-500">Choose an item to go straight to the next step.</p>
              </div>
              <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${
                (dashboard?.lowStockItems || 0) + (dashboard?.outOfStockItems || 0) + (dashboard?.pendingStockVerifications || 0) > 0
                  ? 'bg-amber-50 text-amber-800'
                  : 'bg-emerald-50 text-emerald-700'
              }`}>
                {(dashboard?.lowStockItems || 0) + (dashboard?.outOfStockItems || 0) + (dashboard?.pendingStockVerifications || 0) > 0
                  ? 'Action may be needed'
                  : 'You’re all caught up'}
              </span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: 'Low or out of stock',
                  value: (dashboard?.lowStockItems || 0) + (dashboard?.outOfStockItems || 0),
                  detail: `${dashboard?.lowStockItems || 0} running low · ${dashboard?.outOfStockItems || 0} out`,
                  icon: AlertTriangle,
                  action: 'View inventory',
                  tab: 'items',
                  tone: 'rose'
                },
                {
                  label: 'Expiring in 30 days',
                  value: dashboard?.expiringProducts?.length || 0,
                  detail: 'Check batches before they expire',
                  icon: Clock3,
                  action: 'View batches',
                  tab: 'items',
                  tone: 'amber'
                },
                {
                  label: 'Stock checks due',
                  value: dashboard?.pendingStockVerifications || 0,
                  detail: 'Items waiting for a physical count',
                  icon: ClipboardList,
                  action: 'Verify stock',
                  tab: 'verifications',
                  tone: 'violet'
                },
                {
                  label: 'Requests to review',
                  value: departmentRequests.filter((request) => request.status === 'pending').length,
                  detail: 'Pending requests from departments',
                  icon: ClipboardList,
                  action: 'Review requests',
                  tab: 'requests',
                  tone: 'sky'
                }
              ].map(({ label, value, detail, icon: Icon, action, tab, tone }) => (
                <div key={label} className="rounded-2xl border border-slate-200 p-4 transition hover:border-slate-300">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{label}</p>
                      <p className={`mt-2 text-3xl font-black ${
                        value > 0 ? (tone === 'rose' || tone === 'amber' ? 'text-rose-700' : 'text-slate-900') : 'text-emerald-700'
                      }`}>{value}</p>
                    </div>
                    <span className={`rounded-xl p-2.5 ${
                      tone === 'rose' ? 'bg-rose-50 text-rose-600'
                        : tone === 'amber' ? 'bg-amber-50 text-amber-700'
                          : tone === 'violet' ? 'bg-violet-50 text-violet-700'
                            : 'bg-sky-50 text-sky-700'
                    }`}><Icon className="h-5 w-5" /></span>
                  </div>
                  <p className="mt-1 min-h-8 text-xs leading-5 text-slate-500">{detail}</p>
                  <button type="button" onClick={() => selectInventoryTab(tab)} className="mt-3 text-xs font-bold text-[#8a5a21] hover:text-[#3b241a]">
                    {action} <span aria-hidden="true">→</span>
                  </button>
                </div>
              ))}
            </div>
          </section>

          <details className="group rounded-2xl border border-[#eadfce] bg-white shadow-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 sm:p-5 [&::-webkit-details-marker]:hidden">
              <span>
                <span className="block font-bold text-slate-900">More inventory insights</span>
                <span className="mt-1 block text-xs text-slate-500">Monthly spending, department usage, activity and verification settings</span>
              </span>
              <ChevronDown className="h-5 w-5 shrink-0 text-slate-500 transition group-open:rotate-180" />
            </summary>
            <div className="space-y-5 border-t border-slate-100 p-4 sm:p-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
                {[
                  {
                    label: 'Pending purchase orders',
                    value: dashboard?.pendingPurchaseOrders ?? 0,
                    note: 'Awaiting action',
                    icon: ClipboardList,
                    tone: 'text-amber-700 bg-amber-50'
                  },
                  {
                    label: 'Purchases this month',
                    value: formatCurrency(dashboard?.purchasesThisMonth || 0),
                    note: `${dashboard?.purchaseCountThisMonth || 0} stock receipts`,
                    icon: Truck,
                    tone: 'text-violet-700 bg-violet-50'
                  },
                  {
                    label: 'Recorded consumption cost',
                    value: formatCurrency(dashboard?.consumptionCostThisMonth || 0),
                    note: 'Recorded stock usage this month',
                    icon: Utensils,
                    tone: 'text-indigo-700 bg-indigo-50'
                  },
                  {
                    label: 'Unrecorded consumption',
                    value: formatCurrency(dashboard?.unrecordedConsumptionCostThisMonth || 0),
                    note: `Raw materials ${formatCurrency(dashboard?.unrecordedRawMaterialCostThisMonth || 0)} · Prepared food ${dashboard?.unrecordedPreparedFoodQuantityThisMonth || 0} ${(dashboard?.unrecordedPreparedFoodQuantityThisMonth || 0) === 1 ? 'portion' : 'portions'} (${formatCurrency(dashboard?.unrecordedPreparedFoodCostThisMonth || 0)})`,
                    icon: ClipboardList,
                    tone: 'text-sky-700 bg-sky-50'
                  },
                  {
                    label: 'Wastage this month',
                    value: formatCurrency(dashboard?.wastageCostThisMonth || 0),
                    note: 'Wastage and expiry, shown separately',
                    icon: AlertTriangle,
                    tone: 'text-rose-700 bg-rose-50'
                  }
                ].map(({ label, value, note, icon: Icon, tone }) => (
                  <div
                    key={label}
                    className="group min-w-0 rounded-2xl border border-[#eadfce] bg-gradient-to-br from-white to-[#fcfaf6] p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[#d9bd87] hover:shadow-md sm:p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold leading-5 text-slate-500">{label}</p>
                        <p className="mt-2 break-words text-xl font-black tracking-tight text-slate-900 sm:text-2xl">{value}</p>
                      </div>
                      <span className={`shrink-0 rounded-xl p-2.5 ${tone}`}><Icon className="h-4 w-4" /></span>
                    </div>
                    <p className="mt-3 min-h-8 text-[11px] leading-4 text-slate-500">{note}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <Card
                  className="xl:col-span-2"
                  title="Inventory movement costs"
                  subtitle="Daily costs for the last 14 days. Unrecorded raw-material and prepared-food use are combined as losses, separate from wastage and expiry."
                >
                  <div className="h-64 min-w-0 sm:h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={inventoryMovementTrend} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(date) => dayjs(date).format('MMM D')}
                          minTickGap={24}
                          tick={{ fontSize: 11 }}
                        />
                        <YAxis tickFormatter={(value) => formatCurrency(value)} width={76} tick={{ fontSize: 11 }} />
                        <Tooltip
                          labelFormatter={(date) => dayjs(date).format('MMM D, YYYY')}
                          formatter={(value) => formatCurrency(value)}
                          contentStyle={{ borderRadius: 12, borderColor: '#eadfce', boxShadow: '0 12px 30px rgba(59, 36, 26, 0.12)' }}
                        />
                        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                        <Line type="monotone" dataKey="incoming" name="Raw material incoming" stroke="#C58A32" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                        <Line type="monotone" dataKey="recordedUsage" name="Recorded usage" stroke="#547CA5" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                        <Line type="monotone" dataKey="unrecordedUsage" name="Unrecorded use (loss)" stroke="#8B5CF6" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                        <Line type="monotone" dataKey="wastage" name="Wastage & expiry" stroke="#D75C5C" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Unrecorded use includes raw-material stock discrepancies and unrecorded prepared-food portions; both are losses, separate from wastage and expiry.
                  </p>
                </Card>
                <Card title="Recent stock activity">
                  <div className="divide-y divide-slate-100">
                    {(dashboard?.recentActivities || []).map((activity) => (
                      <div key={activity._id} className="flex items-center justify-between gap-3 py-3 text-sm">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-800">{activity.itemId?.name || 'Inventory item'}</p>
                          <p className="text-xs capitalize text-slate-500">{activity.movementType.replace(/_/g, ' ')} · {activity.location}</p>
                        </div>
                        <span className="whitespace-nowrap text-xs text-slate-500">{dayjs(activity.createdAt).format('MMM D, h:mm A')}</span>
                      </div>
                    ))}
                    {!dashboard?.recentActivities?.length && <p className="py-8 text-center text-sm text-slate-400">No stock movements recorded.</p>}
                  </div>
                </Card>
              </div>

              {!!reorderSuggestions.length && (
                <Card title="Suggested reorders" subtitle="Recommendations account for expired stock and open purchase quantities">
                  <div className="divide-y divide-slate-100">
                    {reorderSuggestions.slice(0, 6).map((suggestion) => (
                      <div key={suggestion._id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-semibold text-slate-800">{suggestion.name} <span className="font-normal text-slate-500">({suggestion.code})</span></p>
                          <p className="text-xs text-slate-500">Available {suggestion.availableStock} · On order {suggestion.pendingPurchaseQuantity} · Suggested {suggestion.suggestedQuantity} {suggestion.unit}</p>
                        </div>
                        {canWriteModule('raw_materials') && <Button size="sm" variant="outline" onClick={() => prepareSuggestedPurchase(suggestion)}>Prepare purchase</Button>}
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {!!dashboard?.expiringProducts?.length && (
                <Card title="Products expiring soon" subtitle="Accepted batches expiring within 30 days">
                  <div className="overflow-x-auto">
                    <PaginatedTable tableClassName="w-full min-w-0 table-fixed break-words whitespace-normal text-left text-sm">
                      <thead><tr className="border-b text-xs uppercase text-slate-400"><th className="pb-2">Item</th><th className="pb-2">Batch</th><th className="pb-2">Quantity</th><th className="pb-2">Expiry</th></tr></thead>
                      <tbody className="divide-y">
                        {dashboard.expiringProducts.map((batch, index) => (
                          <tr key={`${batch.item}-${index}`}><td className="py-2 font-semibold">{batch.item}</td><td>{batch.batchNumber || '—'}</td><td>{batch.quantity}</td><td>{dayjs(batch.expiryDate).format('MMM D, YYYY')}</td></tr>
                        ))}
                      </tbody>
                    </PaginatedTable>
                  </div>
                </Card>
              )}
            </div>
          </details>
        </div>
      )}

      {activeTab === 'categories' && (
        <Card title="Inventory Categories" subtitle="Browse categories used by your saved inventory items">
          {inventoryCategories.length ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {inventoryCategories.map(({ category, count }) => (
                <button
                  type="button"
                  key={category}
                  onClick={() => {
                    setCategoryFilter(category);
                    selectInventoryTab('items');
                  }}
                  className="rounded-2xl border border-[#eadfce] bg-white p-4 text-left transition hover:border-[#d9bd87] hover:bg-[#faf7f0]"
                >
                  <p className="font-semibold capitalize text-slate-800">{category.replace(/_/g, ' ')}</p>
                  <p className="mt-1 text-xs text-slate-500">{count} item{count === 1 ? '' : 's'}</p>
                </button>
              ))}
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-slate-500">Categories will appear here as inventory items are added.</p>
          )}
        </Card>
      )}

      {activeTab === 'items' && (
        <>
        {!units.some((unit) => unit.isActive) && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            No active units are available yet. Add standard units while creating your first raw material.
          </div>
        )}
        <Card>
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Search inventory" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, SKU, barcode" />
            <Select
              label="Category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              options={[
                { label: 'All categories', value: 'all' },
                { label: 'Vegetables', value: 'vegetables' },
                { label: 'Fruits', value: 'fruits' },
                { label: 'Groceries', value: 'groceries' },
                { label: 'Dairy Products', value: 'dairy_products' },
                { label: 'Meat', value: 'meat' },
                { label: 'Seafood', value: 'seafood' },
                { label: 'Food & Ingredients', value: 'food_ingredients' },
                { label: 'Beverages', value: 'beverages' },
                { label: 'Toiletries', value: 'toiletries' },
                { label: 'Housekeeping Supplies', value: 'housekeeping_supplies' },
                { label: 'Cleaning Materials', value: 'cleaning_materials' },
                { label: 'Maintenance Materials', value: 'maintenance_materials' },
                { label: 'Electrical Items', value: 'electrical_items' },
                { label: 'Stationery', value: 'stationery' },
                { label: 'Minibar Products', value: 'minibar_products' },
                { label: 'Linen & Laundry', value: 'linen_laundry' },
                { label: 'Other', value: 'other' }
              ]}
            />
          </div>
          {loading ? (
            <DataSkeleton rows={6} columns={5} label="Loading inventory catalogue" />
          ) : visibleItems.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No inventory items defined yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <PaginatedTable tableClassName="w-full min-w-[900px] table-fixed break-words whitespace-normal text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold">
                    <th className="pb-3">Item Name</th>
                    <th className="pb-3">SKU / Code</th>
                    <th className="pb-3">Category</th>
                    <th className="pb-3">Current Stock</th>
                    <th className="pb-3">Stock Health</th>
                    <th className="w-[250px] pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleItems.map((it) => {
                    const availableStock = it.availableStock ?? it.currentStock;
                    const isLow = availableStock <= it.minStockThreshold;
                    const itemBatches = batchesByItem[it._id] || [];
                    const openBatchCount = itemBatches.filter((batch) => batch.remainingQuantity > 0).length;
                    return (
                      <React.Fragment key={it._id}>
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="py-3.5 font-bold text-slate-900">
                            {it.name}
                            {!it.isActive && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">Inactive</span>}
                          </td>
                          <td className="py-3.5 font-mono text-slate-500">{it.code}</td>
                          <td className="py-3.5 capitalize text-slate-600">
                            {it.category.replace(/_/g, ' ')}
                          </td>
                          <td className="py-3.5 font-bold text-slate-900">
                            {formatInventoryQuantity(availableStock, it)}
                          </td>
                          <td className="py-3.5">
                            {isLow ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                                <AlertTriangle className="w-3 h-3 text-rose-600" />
                                Low Stock (&le; {it.minStockThreshold} {it.baseUnit || it.unit})
                              </span>
                            ) : (
                              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                Adequate Stock
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 pr-1">
                            <div className={`grid ${canManageInventory ? 'grid-cols-2' : 'grid-cols-1'} gap-2`}>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-9 w-full whitespace-nowrap px-2"
                                icon={expandedBatchItemId === it._id ? ChevronUp : ChevronDown}
                                aria-expanded={expandedBatchItemId === it._id}
                                onClick={() => toggleItemBatches(it)}
                              >
                                {expandedBatchItemId === it._id ? 'Hide batches' : 'Batches'}
                              </Button>
                              {canWriteModule('raw_materials') && (
                                <>
                                  <Button size="sm" variant="outline" className="h-9 w-full px-2" icon={Pencil} onClick={() => {
                                    setEditingItem(it);
                                    setItemEditForm({
                                      name: it.name || '',
                                      code: it.code || '',
                                      category: it.category || 'other',
                                      description: it.description || '',
                                      minStockThreshold: it.minStockThreshold ?? 0,
                                      maxStockLevel: it.maxStockLevel ?? '',
                                      reorderQuantity: it.reorderQuantity ?? 0,
                                      stockVerificationIntervalDays: it.stockVerificationIntervalDays ?? '',
                                      location: it.location || 'Main Store',
                                      locationId: String(it.locationId?._id || it.locationId || storageLocationIdForName(it.location)),
                                      trackExpiry: Boolean(it.trackExpiry),
                                      trackBatchNumber: Boolean(it.trackBatchNumber),
                                      isActive: Boolean(it.isActive)
                                    });
                                  }}>
                                    Edit
                                  </Button>
                                  <Button size="sm" variant={it.isActive ? 'danger' : 'success'} className="h-9 w-full px-2" icon={Power} onClick={() => toggleItemStatus(it)}>
                                    {it.isActive ? 'Deactivate' : 'Activate'}
                                  </Button>
                                  {it.isActive && <Button
                                    size="sm"
                                    variant="secondary"
                                    className="h-9 w-full px-2"
                                    icon={SlidersHorizontal}
                                    onClick={() => {
                                      setSelectedItemForMove(it);
                                      setMoveForm({
                                        ...moveForm,
                                        unit: it.baseUnit || it.unit,
                                        quantity: 0,
                                        location: it.location || 'Main Store',
                                        locationId: String(it.locationId?._id || it.locationId || storageLocationIdForName(it.location))
                                      });
                                      setIsMovementOpen(true);
                                    }}
                                  >
                                    Adjust
                                  </Button>}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                        {expandedBatchItemId === it._id && (
                          <tr>
                            <td colSpan={6} className="bg-[#f8f5ef] p-3 sm:p-5">
                              <div className="overflow-hidden rounded-2xl border border-[#e8ddcc] bg-gradient-to-br from-[#fffdfa] via-white to-[#faf7f0] shadow-[0_8px_28px_rgba(59,36,26,0.06)]">
                                <div className="flex flex-col gap-3 border-b border-[#eee5d8] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                                  <div className="flex items-center gap-3">
                                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f3eadb] text-[#9a6b2f]">
                                      <PackageCheck className="h-5 w-5" />
                                    </span>
                                    <div>
                                      <p className="text-sm font-bold tracking-wide text-[#3b241a]">Batch ledger</p>
                                      <p className="mt-0.5 text-xs text-slate-500">
                                        Batch purchases, consumption, wastage, sales revenue, and loss · Base unit: {it.baseUnit || it.unit}
                                      </p>
                                    </div>
                                  </div>
                                  {!loadingBatchesByItem[it._id] && !batchErrorsByItem[it._id] && (
                                    <div className="flex flex-wrap gap-2 text-xs">
                                      <span className="rounded-full border border-[#eadfce] bg-white px-3 py-1.5 font-medium text-slate-600">
                                        {itemBatches.length} {itemBatches.length === 1 ? 'batch' : 'batches'}
                                      </span>
                                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-800">
                                        {openBatchCount} open
                                      </span>
                                    </div>
                                  )}
                                </div>
                              {loadingBatchesByItem[it._id] ? (
                                <div className="grid gap-3 p-4 md:grid-cols-2 sm:p-5">
                                  {[0, 1].map((placeholder) => (
                                    <div key={placeholder} className="animate-pulse rounded-xl border border-[#eee5d8] bg-white p-4">
                                      <div className="h-4 w-1/3 rounded bg-slate-100" />
                                      <div className="mt-4 grid grid-cols-2 gap-3">
                                        <div className="h-12 rounded-lg bg-slate-50" />
                                        <div className="h-12 rounded-lg bg-slate-50" />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : batchErrorsByItem[it._id] ? (
                                <div className="m-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 sm:m-5">
                                  {batchErrorsByItem[it._id]}
                                </div>
                              ) : !itemBatches.length ? (
                                <div className="px-4 py-10 text-center sm:px-5">
                                  <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-[#f6f0e5] text-[#9a6b2f]">
                                    <PackageCheck className="h-5 w-5" />
                                  </span>
                                  <p className="mt-3 text-sm font-semibold text-slate-700">No batch history yet</p>
                                  <p className="mt-1 text-xs text-slate-500">Received batches will appear here with their purchase and cost details.</p>
                                </div>
                              ) : (
                                <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3 sm:p-5">
                                  {itemBatches.map((batch, batchIndex) => (
                                    <article key={batch._id} className="group overflow-hidden rounded-xl border border-[#e9e0d3] bg-white shadow-[0_3px_12px_rgba(59,36,26,0.035)] transition duration-200 hover:-translate-y-0.5 hover:border-[#d9c5a5] hover:shadow-[0_10px_24px_rgba(59,36,26,0.09)]">
                                      <div className="flex items-start justify-between gap-3 border-b border-[#f0ebe3] px-4 py-3.5">
                                        <div className="flex min-w-0 items-center gap-3">
                                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#f8f2e8] text-xs font-bold text-[#8b612b]">
                                            {String(batchIndex + 1).padStart(2, '0')}
                                          </span>
                                          <div className="min-w-0">
                                            <p className="truncate text-sm font-bold text-[#3b241a]">{batch.batchNumber || 'Unnumbered batch'}</p>
                                            <p className="mt-0.5 text-[11px] text-slate-500">
                                              {batch.location || 'Main Store'}
                                              {batch.receivedAt && ` · ${dayjs(batch.receivedAt).format('MMM D, YYYY')}`}
                                            </p>
                                          </div>
                                        </div>
                                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                                          batch.remainingQuantity > 0
                                            ? 'bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200'
                                            : 'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200'
                                        }`}>
                                          {batch.remainingQuantity > 0 ? 'Open' : 'Exhausted'}
                                        </span>
                                      </div>
                                      <div className="grid grid-cols-2 gap-2.5 p-3.5">
                                        <div className="rounded-lg bg-[#faf7f1] p-3">
                                          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Actual usable</p>
                                          <p className="mt-1 text-sm font-bold text-[#3b241a]">
                                            {formatInventoryQuantity(batch.actualUsableStock ?? batch.remainingQuantity, it)}
                                          </p>
                                        </div>
                                        <div className="rounded-lg bg-[#faf7f1] p-3">
                                          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Cost / base unit</p>
                                          <p className="mt-1 text-sm font-bold text-[#3b241a]">{formatInventoryUnitCost(batch.unitCost)} <span className="text-xs font-medium text-slate-500">/ {it.baseUnit || it.unit}</span></p>
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-2 gap-2 px-3.5 pb-3.5 sm:grid-cols-3">
                                        {[
                                          ['Material', batch.materialName || it.name],
                                          ['Expected', formatInventoryQuantity(batch.expectedStock ?? batch.uploadedQuantity ?? batch.quantity, it)],
                                          ['Unrecorded consumption', formatInventoryQuantity(batch.unrecordedConsumptionQuantity ?? batch.consumedQuantity ?? 0, it)],
                                          ['Wasted', formatInventoryQuantity(batch.wastageQuantity || 0, it)],
                                          ['Consumed profitably / gain', formatInventoryQuantity(batch.consumedProfitablyQuantity ?? batch.unrecordedQuantity ?? 0, it)],
                                          ['Sales revenue', formatCurrency(batch.salesRevenue || 0)],
                                          ['Loss (wastage + unrecorded)', formatCurrency(batch.loss || 0)]
                                        ].map(([label, value]) => (
                                          <div key={label} className="rounded-lg border border-[#eee7dc] bg-white p-2.5">
                                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
                                            <p className="mt-1 text-xs font-bold text-[#3b241a]">{value}</p>
                                          </div>
                                        ))}
                                      </div>
                                      <div className="px-4 pb-4">
                                        <div className="rounded-lg border border-[#eee7dc]">
                                          <div className="grid grid-cols-2 divide-x divide-[#eee7dc]">
                                            <div className="p-3">
                                              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Purchased as</p>
                                              <p className="mt-1 text-xs font-semibold text-slate-800">
                                            {batch.purchaseQuantity != null
                                              && Number.isFinite(Number(batch.purchaseQuantity))
                                              && batch.purchaseUnit
                                              ? `${batch.purchaseQuantity} ${batch.purchaseUnit}`
                                              : `Base units (${it.baseUnit || it.unit})`}
                                              </p>
                                            </div>
                                            <div className="p-3">
                                              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Purchase price</p>
                                              <p className="mt-1 text-xs font-semibold text-slate-800">
                                            {batch.purchaseUnitCost != null
                                              && Number.isFinite(Number(batch.purchaseUnitCost))
                                              && batch.purchaseUnit
                                              ? `${formatCurrency(batch.purchaseUnitCost)} / ${batch.purchaseUnit}`
                                              : 'Purchase price not recorded'}
                                              </p>
                                            </div>
                                          </div>
                                          <div className="grid grid-cols-2 divide-x border-t border-[#eee7dc] divide-[#eee7dc]">
                                            <div className="p-3">
                                              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Purchase total</p>
                                              <p className="mt-1 text-xs font-bold text-[#3b241a]">
                                            {batch.purchaseAmount != null
                                              ? formatCurrency(batch.purchaseAmount)
                                              : 'Purchase total not recorded'}
                                              </p>
                                            </div>
                                            <div className="p-3">
                                              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Vendor</p>
                                              <p className="mt-1 truncate text-xs font-semibold text-slate-800">{batch.vendorId?.name || '—'}</p>
                                            </div>
                                          </div>
                                        </div>
                                        {(batch.invoiceNumber || batch.expiryDate) && (
                                          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                                            {batch.invoiceNumber && <span>Invoice {batch.invoiceNumber}</span>}
                                            {batch.expiryDate && <span>Expires {dayjs(batch.expiryDate).format('MMM D, YYYY')}</span>}
                                          </div>
                                        )}
                                      </div>
                                    </article>
                                  ))}
                                </div>
                              )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </PaginatedTable>
            </div>
          )}
          {inventoryPages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500">
              <span>Page {inventoryPage} of {inventoryPages}</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={inventoryPage <= 1} onClick={() => setInventoryPage((page) => page - 1)}>Previous</Button>
                <Button size="sm" variant="outline" disabled={inventoryPage >= inventoryPages} onClick={() => setInventoryPage((page) => page + 1)}>Next</Button>
              </div>
            </div>
          )}
        </Card>
        </>
      )}

      {activeTab === 'vendors' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vendors.map((v) => (
            <Card key={v._id}>
              <h3 className="font-bold text-slate-900 text-sm">{v.name}</h3>
              <p className="mt-0.5 break-words text-xs text-slate-500">Contact: {v.contactPerson || 'Representative'}</p>
              <div className="mt-3 pt-3 border-t border-slate-100 space-y-1 text-xs text-slate-600">
                <p className="break-words">Phone: {v.phone}</p>
                <p className="break-words">Email: {v.email || 'N/A'}</p>
                <p className="break-words">Address: {v.address || 'N/A'}</p>
                <p className="break-words">GST / Tax: {v.taxNumber || 'N/A'}</p>
                <p className="break-words">Terms: {v.paymentTerms || 'N/A'} · Balance: {formatCurrency(v.outstandingBalance || 0)}</p>
                <p>Supplied items: {v.suppliedItems?.map((item) => item.name).join(', ') || 'Not specified'}</p>
              </div>
              {canReadModule('raw_materials') && <Button className="mt-4 w-full" size="sm" variant="outline" onClick={() => handleViewVendorPurchases(v)}>Purchase history</Button>}
              {canWriteModule('raw_materials') && (
                <Button className="mt-2 w-full" size="sm" variant="secondary" onClick={() => {
                  setSelectedVendor(v);
                  setPaymentForm({ amount: '', paymentMethod: 'bank_transfer', referenceNumber: '', invoiceNumber: '', notes: '' });
                  setIsVendorPaymentOpen(true);
                }}>
                  Record vendor payment
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'pos' && (
        <div className="space-y-4">
          <Card title={`Below-threshold items (${reorderSuggestions.length})`} subtitle="Items below their minimum stock level, excluding expired stock and quantities already on open purchase orders">
            {reorderSuggestions.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-500">No items are currently below their stock threshold.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {reorderSuggestions.map((suggestion) => (
                  <div key={suggestion._id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-slate-800">{suggestion.name} <span className="font-normal text-slate-500">({suggestion.code})</span></p>
                      <p className="text-xs text-slate-600">
                        Available {formatInventoryQuantity(suggestion.availableStock, suggestion)}
                        {' / Threshold '}
                        {formatInventoryQuantity(suggestion.reorderLevel || suggestion.minStockThreshold, suggestion)}
                        {Number(suggestion.maxStockLevel) > 0 && (
                          <> · Desired {formatInventoryQuantity(suggestion.maxStockLevel, suggestion)}</>
                        )}
                        {' · On order '}
                        {formatInventoryQuantity(suggestion.pendingPurchaseQuantity, suggestion)}
                        {' · Suggested '}
                        {suggestion.suggestedQuantity} {suggestion.suggestedUnit}
                      </p>
                    </div>
                    {canWriteModule('raw_materials') && (
                      <Button size="sm" variant="outline" onClick={() => prepareSuggestedPurchase(suggestion)}>
                        Create purchase order
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card>
            {purchaseOrders.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No purchase orders recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <PaginatedTable tableClassName="w-full min-w-0 table-fixed break-words whitespace-normal text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold">
                      <th className="pb-3">PO Number</th>
                      <th className="pb-3">Vendor</th>
                      <th className="pb-3">Total Cost</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3">Date</th>
                      <th className="pb-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {purchaseOrders.map((po) => (
                      <tr key={po._id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 font-mono font-bold text-slate-900">{po.poNumber}</td>
                        <td className="py-3 font-semibold text-slate-800">{po.vendorId?.name || (po.autoGenerated ? 'Select supplier' : 'Vendor')}</td>
                        <td className="py-3 font-black text-slate-900">{formatCurrency(po.totalAmount)}</td>
                        <td className="py-3">
                          {po.autoGenerated ? (
                            <div className="flex flex-col items-start gap-1">
                              <Badge variant="active">Auto Generated</Badge>
                              <Badge variant={po.status === 'draft' ? 'pending_approval' : po.status}>
                                {po.status === 'draft' ? 'Pending Review' : po.status}
                              </Badge>
                            </div>
                          ) : <Badge variant={po.status}>{po.status}</Badge>}
                        </td>
                        <td className="py-3 text-slate-500">{dayjs(po.createdAt).format('YYYY-MM-DD')}</td>
                        <td className="py-3 text-right">
                          <div className="flex justify-end gap-2">
                            {canWriteModule('raw_materials') && po.autoGenerated && ['draft', 'pending_approval'].includes(po.status) && (
                              <Button size="sm" variant="outline" onClick={() => openAutomaticPOReview(po)}>
                                Review
                              </Button>
                            )}
                            {canWriteModule('raw_materials') && ['draft', 'pending_approval'].includes(po.status)
                              && (!po.autoGenerated || po.status === 'pending_approval') && (
                              <Button size="sm" variant="success" onClick={() => handleApprovePurchaseOrder(po._id)}>
                                Approve
                              </Button>
                            )}
                            {canWriteModule('raw_materials') && ['ordered', 'partially_received'].includes(po.status) && (
                              <Button
                                size="sm"
                                variant="success"
                                icon={PackageCheck}
                                onClick={() => {
                                  setSelectedPO(po);
                                  setPurchaseDate(dayjs().format('YYYY-MM-DD'));
                                  setReceivingLines(po.items.map((line) => ({
                                    itemId: line.itemId?._id || line.itemId,
                                    name: line.itemName,
                                    unit: line.unit || line.itemId?.unit || '',
                                    conversionFactor: line.conversionFactor || 1,
                                    remaining: Math.max(0, line.quantity - (line.receivedQuantity || 0)),
                                    receivedQuantity: Math.max(0, line.quantity - (line.receivedQuantity || 0)),
                                    acceptedQuantity: Math.max(0, line.quantity - (line.receivedQuantity || 0)),
                                    damagedQuantity: 0,
                                    rejectedQuantity: 0,
                                    batchNumber: '',
                                    expiryDate: ''
                                  })));
                                  setIsReceivingOpen(true);
                                }}
                              >
                                Receive Goods
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </PaginatedTable>
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'ledger' && (
        <Card title="Stock Movement Ledger" subtitle="Auditable inventory movements across locations">
          <div className="overflow-x-auto">
            <PaginatedTable tableClassName="w-full min-w-0 table-fixed break-words whitespace-normal text-left text-xs">
              <thead><tr className="border-b border-slate-100 uppercase text-slate-400"><th className="pb-3">Date</th><th className="pb-3">Item</th><th className="pb-3">Movement</th><th className="pb-3">Quantity</th><th className="pb-3">Location</th><th className="pb-3">Department</th><th className="pb-3">Reference</th><th className="pb-3">Recorded by</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {ledger.map((movement) => (
                  <tr key={movement._id}>
                    <td className="py-3">{dayjs(movement.createdAt).format('YYYY-MM-DD HH:mm')}</td>
                    <td className="font-semibold">{movement.itemId?.name || 'Item'}</td>
                    <td className="capitalize">{movement.movementType.replace(/_/g, ' ')}</td>
                    <td>{movement.enteredQuantity ?? movement.quantity} {movement.enteredUnit || movement.baseUnit || movement.itemId?.baseUnit || movement.itemId?.unit}</td>
                    <td>{movement.location}{movement.destinationLocation ? ` → ${movement.destinationLocation}` : ''}</td>
                    <td>{movement.sourceDepartment && movement.destinationDepartment
                      ? `${movement.sourceDepartment} → ${movement.destinationDepartment}`
                      : movement.department || '—'}</td>
                    <td>{movement.referenceNumber || '—'}</td>
                    <td>{movement.recordedBy?.name || '—'}</td>
                  </tr>
                ))}
                {!ledger.length && <tr><td colSpan="8" className="py-10 text-center text-slate-400">No inventory movements recorded yet.</td></tr>}
              </tbody>
            </PaginatedTable>
          </div>
        </Card>
      )}

      {activeTab === 'prepared-food' && (
        <Card
          title="Prepared food usage & complimentary"
          subtitle="Reconcile finished portions and review complimentary servings with their allocated ingredient use."
          action={canWriteModule('food_production') && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" icon={Utensils} onClick={() => openPreparedFoodCount('complimentary')}>
                Record complimentary
              </Button>
              <Button size="sm" icon={ClipboardList} onClick={() => openPreparedFoodCount('unrecorded_consumption')}>
                Reconcile food usage
              </Button>
            </div>
          )}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                title: 'Unrecorded prepared food',
                movementType: 'unrecorded_consumption',
                description: 'Physical count difference × batch cost per portion',
                color: 'border-amber-200 bg-amber-50/70 text-amber-900'
              },
              {
                title: 'Complimentary servings',
                movementType: 'complimentary',
                description: 'Recorded portions × batch cost per portion',
                color: 'border-violet-200 bg-violet-50/70 text-violet-900'
              }
            ].map((summary) => {
              const entries = preparedFoodUsageRows.filter((movement) => movement.movementType === summary.movementType);
              const quantity = entries.reduce((sum, movement) => sum + Number(movement.quantity || 0), 0);
              const cost = entries.reduce((sum, movement) => sum + Number(movement.totalCost || 0), 0);
              return (
                <div key={summary.movementType} className={`rounded-2xl border p-4 ${summary.color}`}>
                  <p className="text-sm font-bold">{summary.title}</p>
                  <p className="mt-1 text-xs opacity-80">{summary.description}</p>
                  <div className="mt-4 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-xs opacity-75">Portions</p>
                      <p className="text-2xl font-black tabular-nums">{quantity.toLocaleString(undefined, { maximumFractionDigits: 3 })}</p>
                    </div>
                    {canManageInventory && (
                      <div className="text-right">
                        <p className="text-xs opacity-75">Recorded cost</p>
                        <p className="text-lg font-bold tabular-nums">{formatCurrency(cost)}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-5">
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Food item & raw-material detail</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Ingredient quantity and cost are allocated by recorded portions ÷ batch accepted yield. They explain the prepared-food cost and are not added a second time.
                </p>
              </div>
              {preparedFoodBatchesLoading && <span className="text-xs text-slate-500">Refreshing…</span>}
            </div>
            {preparedFoodUsageRows.length ? (
              <div className="space-y-3">
                {preparedFoodUsageRows.map((movement) => (
                  <article key={movement._id} className="overflow-hidden rounded-xl border border-[#eee5d8] bg-white">
                    <div className="grid gap-3 bg-[#fdfbf8] p-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] md:items-center">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-slate-900">{movement.menuItemId?.name || 'Prepared food'}</p>
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                            movement.movementType === 'complimentary'
                              ? 'bg-violet-100 text-violet-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {movement.movementType === 'complimentary' ? 'Complimentary' : 'Unrecorded use'}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {movement.batchNumber} · {movement.location || 'Location unavailable'} · {dayjs(movement.createdAt).format('DD MMM YYYY, h:mm A')}
                        </p>
                      </div>
                      <p className="text-sm font-medium text-slate-700">
                        {Number(movement.quantity || 0).toLocaleString(undefined, { maximumFractionDigits: 3 })} portions
                        {movement.reason ? <span className="mt-1 block text-xs font-normal text-slate-500">{movement.reason}</span> : null}
                      </p>
                      {canManageInventory && (
                        <p className="text-left text-sm font-bold text-rose-700 md:text-right">{formatCurrency(movement.totalCost || 0)}</p>
                      )}
                    </div>
                    <div className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3">
                      {movement.rawMaterials.length ? movement.rawMaterials.map((ingredient, index) => (
                        <div key={`${movement._id}-${ingredient.itemName}-${index}`} className="rounded-lg border border-[#eee7dc] px-3 py-2.5">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Allocated raw material</p>
                          <p className="mt-1 text-sm font-semibold text-slate-800">{ingredient.itemName}</p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {ingredient.quantity.toLocaleString(undefined, { maximumFractionDigits: 4 })} {ingredient.unit}
                            {canManageInventory ? ` · ${formatCurrency(ingredient.cost)}` : ''}
                          </p>
                        </div>
                      )) : (
                        <p className="px-2 py-2 text-xs text-slate-500">
                          Raw-material allocation is unavailable for this batch.
                        </p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[#d9c8b3] bg-[#fdfbf8] px-4 py-8 text-center">
                <p className="text-sm font-semibold text-slate-700">
                  {preparedFoodBatchesLoading ? 'Loading prepared-food movements…' : 'No unrecorded or complimentary prepared-food movements'}
                </p>
                <p className="mt-1 text-xs text-slate-500">Recorded entries will show the food item, portion count, related ingredients, and cost details here.</p>
              </div>
            )}
          </div>
        </Card>
      )}
      {activeTab === 'verifications' && (
        <Card
          title="Physical Stock Verification"
          subtitle="Compare usable physical stock with expected stock and classify use, wastage, and discrepancies"
          action={canWriteModule('stock_verification') && <Button size="sm" icon={ClipboardList} onClick={() => openStockVerification()}>Record Verification</Button>}
        >
          <div className="overflow-x-auto">
            <PaginatedTable tableClassName="w-full min-w-0 table-fixed break-words whitespace-normal text-left text-xs">
              <thead><tr className="border-b border-slate-100 uppercase text-slate-400"><th className="pb-3">Material</th><th className="pb-3">Location</th><th className="pb-3">Expected</th><th className="pb-3">Actual usable</th><th className="pb-3">Unrecorded consumption</th><th className="pb-3">Wasted</th><th className="pb-3">Consumed profitably / gain</th><th className="pb-3">Period</th><th className="pb-3">Verified by</th><th className="pb-3">Status</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {verifications.map((verification) => (
                  <tr key={verification._id}>
                    <td className="py-3 font-semibold">{verification.itemId?.name || 'Material'}</td>
                    <td>{verification.location || 'Main Store'}</td>
                    <td>{formatInventoryQuantity(verification.expectedStock, verification.itemId || { unit: verification.unit })}</td>
                    <td>{formatInventoryQuantity(verification.actualStock, verification.itemId || { unit: verification.unit })}</td>
                    <td>{formatInventoryQuantity(verification.consumptionQuantity, verification.itemId || { unit: verification.unit })}</td>
                    <td>{formatInventoryQuantity(verification.wastageQuantity, verification.itemId || { unit: verification.unit })}</td>
                    <td>
                      {verification.stockGain > 0
                        ? `Gain ${formatInventoryQuantity(verification.stockGain, verification.itemId || { unit: verification.unit })}`
                        : `Consumed profitably ${formatInventoryQuantity(verification.discrepancyQuantity || 0, verification.itemId || { unit: verification.unit })}`}
                    </td>
                    <td>{dayjs(verification.periodStart).format('MMM D')} – {dayjs(verification.periodEnd).format('MMM D, YYYY')}</td>
                    <td>{verification.verifiedBy?.name || 'Staff'}</td>
                    <td>
                      <Badge variant={['pending', 'verified'].includes(verification.status) ? 'approved' : verification.status}>
                        {['pending', 'verified'].includes(verification.status) ? 'Approved' : verification.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {!verifications.length && <tr><td colSpan="10" className="py-10 text-center text-slate-400">No physical stock verifications recorded yet.</td></tr>}
              </tbody>
            </PaginatedTable>
          </div>
          {!!dashboard?.pendingVerificationItems?.length && (
            <div className="mt-5 border-t border-slate-100 pt-4">
              <h3 className="mb-3 text-sm font-bold text-slate-800">Due for verification</h3>
              <div className="flex flex-wrap gap-2">
                {canWriteModule('stock_verification') && dashboard.pendingVerificationItems.map((item) => (
                  <Button key={item._id} size="sm" variant="outline" onClick={() => openStockVerification(item)}>
                    Verify {item.name}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {activeTab === 'requests' && (
        <Card title="Department Stock Requests" subtitle="Requests are approved and issued against available store stock">
          <div className="overflow-x-auto">
            <PaginatedTable tableClassName="w-full min-w-0 table-fixed break-words whitespace-normal text-left text-xs">
              <thead><tr className="border-b border-slate-100 uppercase text-slate-400"><th className="pb-3">Department</th><th className="pb-3">Requested items</th><th className="pb-3">Requested by</th><th className="pb-3">Status</th><th className="pb-3">Date</th><th className="pb-3 text-right">Action</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {departmentRequests.map((request) => (
                  <tr key={request._id}>
                    <td className="py-3 font-semibold">{request.department}</td>
                    <td>{request.lines.map((line) => `${line.itemId?.name || 'Item'} × ${line.quantity}`).join(', ')}</td>
                    <td>{request.requestedBy?.name || 'Staff'}</td>
                    <td><Badge variant={request.status}>{request.status.replace(/_/g, ' ')}</Badge></td>
                    <td>{dayjs(request.createdAt).format('YYYY-MM-DD')}</td>
                    <td className="text-right">
                      {canWriteModule('raw_materials') && request.status === 'pending' && (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="success" onClick={() => handleReviewDepartmentRequest(request, 'approve')}>Approve & Issue</Button>
                          <Button size="sm" variant="danger" onClick={() => handleReviewDepartmentRequest(request, 'reject')}>Reject</Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {!departmentRequests.length && <tr><td colSpan="6" className="py-10 text-center text-slate-400">No department requests recorded.</td></tr>}
              </tbody>
            </PaginatedTable>
          </div>
        </Card>
      )}

      {activeTab === 'adjustments' && (
        <Card title="Stock Adjustments & Wastage" subtitle="Authorized adjustments update stock immediately; wastage shows its batch and time">
          <div className="overflow-x-auto">
            <PaginatedTable tableClassName="w-full min-w-[1100px] table-fixed break-words whitespace-normal text-left text-xs">
              <thead><tr className="border-b border-slate-100 uppercase text-slate-400"><th className="pb-3">Logged at</th><th className="pb-3">Item</th><th className="pb-3">Batch</th><th className="pb-3">Quantity</th><th className="pb-3">Reason</th><th className="pb-3">Department</th><th className="pb-3">Reported / logged by</th><th className="pb-3">Status</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {adjustmentRows.map(({ id, entry, movement, quantity, unit, batchNumber, loggedAt }) => {
                  const isWastageMovement = entry.recordType === 'wastage';
                  const reason = entry.reason
                    || movement?.metadata?.reason
                    || movement?.notes
                    || (movement?.movementType === 'expiry' ? 'expired' : 'wastage');
                  const reporter = isWastageMovement ? movement?.recordedBy : entry.reportedBy;
                  const status = isWastageMovement || ['pending', 'logged'].includes(entry.status)
                    ? 'Approved'
                    : entry.status;
                  return (
                  <tr key={id}>
                    <td className="py-3">{dayjs(loggedAt).format('YYYY-MM-DD HH:mm:ss')}</td>
                    <td className="font-semibold">{entry.itemId?.name || 'Item'}</td>
                    <td>{batchNumber}</td>
                    <td>{quantity} {unit}</td>
                    <td className="capitalize">{String(reason).replace(/_/g, ' ')}</td>
                    <td>{entry.department || movement?.department || '—'}</td>
                    <td>{reporter?.name || '—'}</td>
                    <td><Badge variant={status.toLowerCase()}>{status === 'approved' ? 'Approved' : status}</Badge></td>
                  </tr>
                  );
                })}
                {!adjustmentRows.length && <tr><td colSpan="8" className="py-10 text-center text-slate-400">No adjustments reported.</td></tr>}
              </tbody>
            </PaginatedTable>
          </div>
        </Card>
      )}

      {activeTab === 'recipes' && (
        <div className="space-y-4">
          {canWriteModule('inventory') && (
            <Card title="Recipe Deduction Stage" subtitle="Choose when a kitchen order consumes its recipe ingredients">
              <div className="max-w-sm">
                <Select
                  label="Deduct ingredients when the order is"
                  value={recipeDeductionStage}
                  onChange={handleRecipeDeductionStageChange}
                  options={[
                    { label: 'Prepared (default)', value: 'prepared' },
                    { label: 'Served', value: 'served' }
                  ]}
                />
              </div>
            </Card>
          )}
          <Card
            title="Restaurant Recipes"
            subtitle="Recipe versions retain ingredient history and show yield-aware cost and profit estimates"
            action={canWriteModule('restaurant_recipes') ? (
              <Button size="sm" icon={PlusCircle} onClick={() => {
                setEditingRecipe(null);
                setRecipeForm({
                  menuItemId: '',
                  recipeName: '',
                  description: '',
                  servingSize: '1 serving',
                  locationId: storageLocationIdForName('Restaurant Store')
                    || storageLocationIdForName('Kitchen Store'),
                  preparationTimeMinutes: 0,
                  productionMode: 'made_to_order',
                  expectedProductionYield: 1,
                  expectedPreparationLossPercent: 0,
                  ingredients: [{ itemId: '', quantity: 1, unit: '', optional: false, substituteItemId: '', substituteQuantity: '', substituteUnit: '' }]
                });
                setIsRecipeOpen(true);
              }}>Add Recipe</Button>
            ) : null}
          >
          <div className="space-y-3">
            <div className="hidden lg:block">
              <div className="divide-y divide-slate-100">
                {recipes.map((recipe) => (
                  <article key={recipe._id} className="space-y-3 py-4">
                    <div className="grid grid-cols-12 items-start gap-3">
                      <div className="col-span-4 min-w-0">
                        <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">Recipe / menu item</p>
                        <p className="mt-1 break-words font-semibold">{recipe.recipeName || recipe.menuItemId?.name || 'Recipe'}</p>
                        <p className="break-words text-slate-500">
                          {recipe.menuItemId?.name || 'Menu item'} · {recipe.servingSize || '1 serving'}
                          {' · '}{recipe.productionMode === 'batch_production' ? 'Bulk production' : 'Made to order'}
                        </p>
                        {recipe.preparationTimeMinutes > 0 && <p className="text-slate-400">{recipe.preparationTimeMinutes} min prep</p>}
                      </div>
                      <div className="col-span-1 min-w-0">
                        <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">Version</p>
                        <p className="mt-1">v{recipe.version}</p>
                      </div>
                      <div className="col-span-3 min-w-0">
                        <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">Ingredients</p>
                        <p className="mt-1 break-words">{recipe.ingredients.map((ingredient) => `${ingredient.itemId?.name || 'Item'} ${ingredient.quantity} ${ingredient.unit}${ingredient.optional ? ' (optional)' : ''}`).join(', ')}</p>
                      </div>
                      <div className="col-span-2 min-w-0 text-right">
                        <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">Total recipe cost</p>
                        <p className="mt-1 break-words">{recipe.totalRecipeCost == null ? 'Cost Pending' : formatCurrency(recipe.totalRecipeCost)}</p>
                        <p className="text-slate-400">full recipe</p>
                      </div>
                      <div className="col-span-2 min-w-0 text-right">
                        <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">Cost / serving</p>
                        <p className="mt-1 break-words">{recipe.costPerServing == null ? 'Cost Pending' : formatCurrency(recipe.costPerServing)}</p>
                        <p className="text-slate-400">usable serving</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-12 items-start gap-3 border-t border-slate-100 pt-3">
                      <div className="col-span-2 min-w-0">
                        <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">Selling price / serving</p>
                        {[
                          ['AC', recipe.diningTypePricing?.ac],
                          ['Non-AC', recipe.diningTypePricing?.nonAc]
                        ].filter(([, pricing]) => pricing?.enabled).map(([label, pricing]) => (
                          <p key={label} className="mt-1 break-words">
                            <span className="text-slate-500">{label}: </span>
                            {pricing.sellingPrice == null ? 'Cost Pending' : formatCurrency(pricing.sellingPrice)}
                          </p>
                        ))}
                      </div>
                      <div className="col-span-3 min-w-0">
                        <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">Expected preparation loss</p>
                        <p className="mt-1">{Number(recipe.expectedPreparationLossPercent || 0)}%</p>
                        <p className="break-words text-slate-500">
                          {recipe.expectedPreparationLossQuantity == null
                            ? 'Cost Pending'
                            : `${recipe.expectedPreparationLossQuantity.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${recipe.expectedPreparationLossQuantity === 1 ? 'serving' : 'servings'} lost`}
                        </p>
                        <p className="break-words text-slate-400">
                          {recipe.expectedUsableQuantity == null
                            ? 'Usable yield pending'
                            : `${recipe.expectedUsableQuantity.toLocaleString(undefined, { maximumFractionDigits: 2 })} usable ${recipe.expectedUsableQuantity === 1 ? 'serving' : 'servings'}`}
                        </p>
                      </div>
                      <div className="col-span-3 min-w-0">
                        <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">Estimated gross profit</p>
                        {[
                          ['AC', recipe.diningTypePricing?.ac],
                          ['Non-AC', recipe.diningTypePricing?.nonAc]
                        ].filter(([, pricing]) => pricing?.enabled).map(([label, pricing]) => (
                          <div key={label} className="mt-1">
                            <p className={pricing.estimatedGrossProfit == null
                              ? 'text-slate-500'
                              : pricing.estimatedGrossProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                              {label}: {pricing.estimatedGrossProfit == null
                                ? 'Cost Pending'
                                : `${formatCurrency(pricing.estimatedGrossProfit)} / serving`}
                            </p>
                            <p className={`break-words ${pricing.estimatedProfitWhole == null
                              ? 'text-slate-500'
                              : pricing.estimatedProfitWhole >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                              {pricing.estimatedProfitWhole == null
                                ? 'Cost Pending'
                                : `${formatCurrency(pricing.estimatedProfitWhole)} total`}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="col-span-1 min-w-0">
                        <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">Food cost</p>
                        <p className="mt-1 break-words">{recipe.foodCostPercent == null ? 'Cost Pending' : `${recipe.foodCostPercent.toFixed(1)}%`}</p>
                      </div>
                      <div className="col-span-1 min-w-0">
                        <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">Status</p>
                        <div className="mt-1"><Badge variant={recipe.isActive ? 'active' : 'inactive'}>{recipe.isActive ? 'Active' : 'Inactive'}</Badge></div>
                      </div>
                      <div className="col-span-2 min-w-0">
                        <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">Actions</p>
                        {canWriteModule('restaurant_recipes') && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            <Button size="sm" variant="outline" icon={Pencil} onClick={() => handleEditRecipe(recipe)}>Edit</Button>
                            <Button size="sm" variant="outline" onClick={() => handleRecipeStatusChange(recipe)}>{recipe.isActive ? 'Deactivate' : 'Activate'}</Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="space-y-3 lg:hidden">
              {recipes.map((recipe) => (
                <article key={recipe._id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words font-semibold">{recipe.recipeName || recipe.menuItemId?.name || 'Recipe'}</p>
                      <p className="break-words text-xs text-slate-500">
                        {recipe.menuItemId?.name || 'Menu item'} · {recipe.servingSize || '1 serving'}
                        {' · '}{recipe.productionMode === 'batch_production' ? 'Bulk production' : 'Made to order'}
                      </p>
                      {recipe.preparationTimeMinutes > 0 && <p className="text-xs text-slate-400">{recipe.preparationTimeMinutes} min prep</p>}
                    </div>
                    <Badge variant={recipe.isActive ? 'active' : 'inactive'}>{recipe.isActive ? 'Active' : 'Inactive'}</Badge>
                  </div>
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Version {recipe.version} · Ingredients</p>
                    <p className="mt-1 break-words text-xs">
                      {recipe.ingredients.map((ingredient) => `${ingredient.itemId?.name || 'Item'} ${ingredient.quantity} ${ingredient.unit}${ingredient.optional ? ' (optional)' : ''}`).join(', ')}
                    </p>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-slate-100 pt-3 text-xs">
                    <div className="min-w-0">
                      <dt className="text-slate-400">Total recipe cost</dt>
                      <dd className="mt-0.5 break-words font-medium">{recipe.totalRecipeCost == null ? 'Cost Pending' : formatCurrency(recipe.totalRecipeCost)}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-slate-400">Cost / usable serving</dt>
                      <dd className="mt-0.5 break-words font-medium">{recipe.costPerServing == null ? 'Cost Pending' : formatCurrency(recipe.costPerServing)}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-slate-400">Selling price / serving</dt>
                      {[
                        ['AC', recipe.diningTypePricing?.ac],
                        ['Non-AC', recipe.diningTypePricing?.nonAc]
                      ].filter(([, pricing]) => pricing?.enabled).map(([label, pricing]) => (
                        <dd key={label} className="mt-0.5 break-words font-medium">
                          {label}: {pricing.sellingPrice == null ? 'Cost Pending' : formatCurrency(pricing.sellingPrice)}
                        </dd>
                      ))}
                    </div>
                    <div className="min-w-0">
                      <dt className="text-slate-400">Food cost</dt>
                      <dd className="mt-0.5 break-words font-medium">{recipe.foodCostPercent == null ? 'Cost Pending' : `${recipe.foodCostPercent.toFixed(1)}%`}</dd>
                    </div>
                    <div className="col-span-2 min-w-0">
                      <dt className="text-slate-400">Expected preparation loss</dt>
                      <dd className="mt-0.5 break-words font-medium">{Number(recipe.expectedPreparationLossPercent || 0)}%</dd>
                      <dd className="break-words text-slate-500">
                        {recipe.expectedPreparationLossQuantity == null
                          ? 'Cost Pending'
                          : `${recipe.expectedPreparationLossQuantity.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${recipe.expectedPreparationLossQuantity === 1 ? 'serving' : 'servings'} lost`}
                      </dd>
                      <dd className="break-words text-slate-400">
                        {recipe.expectedUsableQuantity == null
                          ? 'Usable yield pending'
                          : `${recipe.expectedUsableQuantity.toLocaleString(undefined, { maximumFractionDigits: 2 })} usable ${recipe.expectedUsableQuantity === 1 ? 'serving' : 'servings'}`}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-slate-400">Estimated gross profit / serving</dt>
                      {[
                        ['AC', recipe.diningTypePricing?.ac],
                        ['Non-AC', recipe.diningTypePricing?.nonAc]
                      ].filter(([, pricing]) => pricing?.enabled).map(([label, pricing]) => (
                        <dd key={label} className={`mt-0.5 break-words font-medium ${pricing.estimatedGrossProfit == null
                          ? 'text-slate-500'
                          : pricing.estimatedGrossProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {label}: {pricing.estimatedGrossProfit == null
                            ? 'Cost Pending'
                            : formatCurrency(pricing.estimatedGrossProfit)}
                        </dd>
                      ))}
                    </div>
                    <div className="min-w-0">
                      <dt className="text-slate-400">Total estimated gross profit</dt>
                      {[
                        ['AC', recipe.diningTypePricing?.ac],
                        ['Non-AC', recipe.diningTypePricing?.nonAc]
                      ].filter(([, pricing]) => pricing?.enabled).map(([label, pricing]) => (
                        <dd key={label} className={`mt-0.5 break-words font-medium ${pricing.estimatedProfitWhole == null
                          ? 'text-slate-500'
                          : pricing.estimatedProfitWhole >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {label}: {pricing.estimatedProfitWhole == null
                            ? 'Cost Pending'
                            : formatCurrency(pricing.estimatedProfitWhole)}
                        </dd>
                      ))}
                    </div>
                  </dl>
                  {canWriteModule('restaurant_recipes') && (
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                      <Button size="sm" variant="outline" icon={Pencil} onClick={() => handleEditRecipe(recipe)}>Edit</Button>
                      <Button size="sm" variant="outline" onClick={() => handleRecipeStatusChange(recipe)}>{recipe.isActive ? 'Deactivate' : 'Activate'}</Button>
                    </div>
                  )}
                </article>
              ))}
            </div>
            {!recipes.length && <p className="py-10 text-center text-sm text-slate-400">No recipes configured.</p>}
          </div>
          </Card>
        </div>
      )}

      {activeTab === 'minibar' && (
        <div className="space-y-4">
          <Card
            title="Room Minibar"
            subtitle="Room replenishment transfers stock from the store; consumption is charged to the checked-in guest folio"
            action={minibarRoomId ? <Button size="sm" icon={PlusCircle} onClick={() => setIsMinibarAssignOpen(true)}>Replenish Room</Button> : null}
          >
            <div className="mb-5 max-w-sm">
              <Select
                label="Select room"
                value={minibarRoomId}
                onChange={(e) => loadMinibarRoom(e.target.value)}
                options={[{ label: 'Choose a room', value: '' }, ...minibarRooms.map((room) => ({ label: `Room ${room.roomNumber} · ${room.roomStatus.replace(/_/g, ' ')}`, value: room._id }))]}
              />
            </div>
            {!minibarRoomId ? (
              <p className="py-8 text-center text-sm text-slate-400">Choose a room to view or reconcile minibar stock.</p>
            ) : !minibarData ? (
              <DataSkeleton variant="cards" rows={4} label="Loading room minibar" />
            ) : (
              <form onSubmit={handleMinibarReconciliation} className="space-y-4">
                <div className="overflow-x-auto">
                  <PaginatedTable tableClassName="w-full min-w-0 table-fixed break-words whitespace-normal text-left text-xs">
                    <thead><tr className="border-b border-slate-100 uppercase text-slate-400"><th className="pb-3">Product</th><th className="pb-3">Available</th><th className="pb-3">Unit</th><th className="pb-3">Consumed</th><th className="pb-3">Complimentary</th><th className="pb-3">Damaged</th><th className="pb-3">Missing</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {minibarData.stock.map((entry) => (
                        <tr key={entry._id}>
                          <td className="py-3 font-semibold">{entry.itemId.name}</td>
                          <td>{formatInventoryQuantity(entry.quantity, entry.itemId)}</td>
                          <td className="w-28 py-2">
                            <Select
                              value={minibarCounts[entry.itemId._id]?.unit || entry.itemId.baseUnit || entry.itemId.unit}
                              searchable
                              searchPlaceholder="Search supported units..."
                              onChange={(e) => setMinibarCounts({
                                ...minibarCounts,
                                [entry.itemId._id]: { ...minibarCounts[entry.itemId._id], unit: e.target.value }
                              })}
                              options={unitChoicesForItem(entry.itemId, units)}
                            />
                          </td>
                          {['consumedQuantity', 'complimentaryQuantity', 'damagedQuantity', 'missingQuantity'].map((field) => (
                            <td key={field} className="w-28 py-2">
                              <Input type="number" min="0" max={entry.quantity / Number(conversionFactorForItem(entry.itemId, minibarCounts[entry.itemId._id]?.unit || entry.itemId.baseUnit || entry.itemId.unit) || 1)} step="any" value={minibarCounts[entry.itemId._id]?.[field] || 0} onChange={(e) => setMinibarCounts({
                                ...minibarCounts,
                                [entry.itemId._id]: { ...minibarCounts[entry.itemId._id], [field]: e.target.value }
                              })} />
                            </td>
                          ))}
                        </tr>
                      ))}
                      {!minibarData.stock.length && <tr><td colSpan="7" className="py-8 text-center text-slate-400">No minibar products are assigned to this room.</td></tr>}
                    </tbody>
                  </PaginatedTable>
                </div>
                <div className="flex justify-end"><Button type="submit" disabled={!minibarData.stock.length}>Save reconciliation</Button></div>
              </form>
            )}
          </Card>
          {!!minibarData?.transactions?.length && (
            <Card title="Room Minibar History">
              <div className="divide-y divide-slate-100">
                {minibarData.transactions.map((transaction) => (
                  <div key={transaction._id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <span>{transaction.itemId?.name} · {transaction.enteredQuantity ?? transaction.quantity} {transaction.unit || transaction.itemId?.unit} · {transaction.type}</span>
                    <span className="text-xs text-slate-500">{transaction.chargeAmount ? formatCurrency(transaction.chargeAmount) : 'No charge'} · {dayjs(transaction.createdAt).format('MMM D, YYYY')}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'reports' && (
        <Card
          title="Inventory reports"
          subtitle="Choose what you want to understand, set the period, then run the report."
        >
          <div className="mb-5 rounded-2xl border border-[#eadfce] bg-gradient-to-r from-[#faf7f0] to-white p-4 sm:p-5">
            <p className="text-sm font-bold text-[#3b241a]">
              {reportType === 'profit-loss'
                ? 'Profit & loss'
                : ({
                  stock: 'Current stock',
                  valuation: 'Stock valuation',
                  purchases: 'Purchase history',
                  financial: 'Inventory financial summary',
                  verifications: 'Physical stock checks',
                  'department-consumption': 'Department usage',
                  'recipe-consumption': 'Recipe food cost',
                  'recipe-usage': 'Daily ingredient usage',
                  'recipe-monthly-usage': 'Monthly ingredient usage',
                  wastage: 'Wastage',
                  expiry: 'Expired stock',
                  transfers: 'Stock transfers',
                  adjustments: 'Stock adjustments',
                  ledger: 'Movement history'
                })[reportType] || 'Inventory report'}
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              {reportType === 'profit-loss'
                ? 'See paid restaurant sales, ingredient cost, gross profit, and recorded losses for one day or a date range.'
                : 'Use the filters below to narrow results. Leave a filter unchanged to include all matching records.'}
            </p>
          </div>
          <div className="rounded-2xl border border-[#eadfce] bg-white p-4 shadow-sm sm:p-5">
            <div className={`grid grid-cols-1 gap-x-4 gap-y-5 md:grid-cols-2 ${
              reportType === 'profit-loss' || !['stock', 'valuation', 'financial'].includes(reportType)
                ? 'xl:grid-cols-4'
                : 'xl:grid-cols-5'
            }`}>
            <Select
              label="What do you want to see?"
              value={reportType}
              onChange={(e) => changeReportType(e.target.value)}
              options={[
                { label: 'Current Stock', value: 'stock' },
                { label: 'Stock Valuation', value: 'valuation' },
                { label: 'Purchase History', value: 'purchases' },
                { label: 'Inventory Financial Summary', value: 'financial' },
                { label: 'Inventory Profit & Loss', value: 'profit-loss' },
                { label: 'Physical Stock Verifications', value: 'verifications' },
                { label: 'Department Consumption', value: 'department-consumption' },
                { label: 'Recipe food cost details', value: 'recipe-consumption' },
                { label: 'Daily ingredient usage', value: 'recipe-usage' },
                { label: 'Monthly ingredient usage', value: 'recipe-monthly-usage' },
                { label: 'Wastage', value: 'wastage' },
                { label: 'Expiry', value: 'expiry' },
                { label: 'Stock Transfers', value: 'transfers' },
                { label: 'Stock Adjustments', value: 'adjustments' },
                { label: 'Movement Ledger', value: 'ledger' }
              ]}
            />
            {reportType === 'profit-loss' ? (
              <>
                <Select
                  label="Report period"
                  value={profitLossDateMode}
                  onChange={(event) => {
                    setProfitLossDateMode(event.target.value);
                    setReportDateError('');
                    if (event.target.value === 'day') {
                      const selectedDate = reportFilters.from || reportFilters.to || getDateInTimeZone(hotel?.timezone);
                      updateReportFilters({ from: selectedDate, to: selectedDate });
                    } else {
                      reportRequestVersion.current += 1;
                      setReport([]);
                      setLoadingReport(false);
                      setHasRunReport(false);
                    }
                  }}
                  options={[
                    { label: 'Date range', value: 'range' },
                    { label: 'Single day', value: 'day' }
                  ]}
                />
                {profitLossDateMode === 'day' ? (
                  <Input
                    label="Report date"
                    type="date"
                    value={reportFilters.from}
                    onChange={(event) => {
                      const selectedDate = event.target.value;
                      updateReportFilters({ from: selectedDate, to: selectedDate });
                    }}
                  />
                ) : (
                  <>
                    <Input
                      label="Start date"
                      type="date"
                      value={reportFilters.from}
                      onChange={(event) => {
                        updateReportFilters({ from: event.target.value });
                      }}
                    />
                    <Input
                      label="End date"
                      type="date"
                      value={reportFilters.to}
                      onChange={(event) => {
                        updateReportFilters({ to: event.target.value });
                      }}
                    />
                  </>
                )}
              </>
            ) : (
              <>
                {!['stock', 'valuation'].includes(reportType) && (
                  <>
                    <Input label="Start date (optional)" type="date" value={reportFilters.from} onChange={(e) => updateReportFilters({ from: e.target.value })} />
                    <Input label="End date (optional)" type="date" value={reportFilters.to} onChange={(e) => updateReportFilters({ to: e.target.value })} />
                  </>
                )}
                {['stock', 'valuation', 'financial'].includes(reportType) && (
                  <Select
                    label="Category"
                    value={reportFilters.category}
                    onChange={(e) => updateReportFilters({ category: e.target.value })}
                    options={[
                      { label: 'All categories', value: 'all' },
                      ...[...new Set(items.map((item) => item.category).filter(Boolean))]
                        .sort()
                        .map((category) => ({ label: category.replace(/_/g, ' '), value: category }))
                    ]}
                  />
                )}
                {['stock', 'valuation', 'financial', 'purchases', 'verifications', 'recipe-usage', 'recipe-monthly-usage', 'wastage', 'department-consumption', 'ledger', 'transfers', 'adjustments'].includes(reportType) && (
                  <Select
                    label="Raw material"
                    value={reportFilters.itemId}
                    onChange={(e) => updateReportFilters({ itemId: e.target.value })}
                    options={[
                      { label: 'All raw materials', value: '' },
                      ...items.map((item) => ({ label: `${item.name} (${item.code})`, value: item._id }))
                    ]}
                  />
                )}
              </>
            )}
            <div className="mt-1 flex flex-col gap-3 border-t border-[#eee5d8] pt-4 sm:flex-row sm:items-center sm:justify-end xl:col-span-full">
              <Button className="min-h-10 w-full sm:w-auto sm:min-w-44" size="sm" disabled={loadingReport} onClick={loadReport}>
                {loadingReport ? 'Preparing report…' : 'Run report'}
              </Button>
              <div className="grid grid-cols-3 gap-2 sm:flex">
                <Button className="min-h-10 justify-center" variant="outline" size="sm" icon={Download} disabled={!report.length || loadingReport} onClick={exportReport}>CSV</Button>
                <Button className="min-h-10 justify-center" variant="outline" size="sm" disabled={!report.length || loadingReport} onClick={exportExcelReport}>Excel</Button>
                <Button className="min-h-10 justify-center" variant="outline" size="sm" disabled={!report.length || loadingReport} onClick={exportPdfReport}>PDF</Button>
              </div>
            </div>
          </div>
          </div>
          {reportDateError && reportType === 'profit-loss' && (
            <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800" role="alert">{reportDateError}</p>
          )}
          {loadingReport && (
            <div className="mt-5 rounded-2xl border border-[#eadfce] bg-[#faf7f0]" role="status">
              <DataSkeleton rows={4} columns={4} label="Preparing inventory report" />
            </div>
          )}
          {!loadingReport && !report.length && (
            <div className="mt-5 rounded-2xl border border-dashed border-[#d9c8b3] bg-[#fdfbf8] px-5 py-10 text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#f3eadc] text-[#8a5a21]">
                <BarChart3 className="h-6 w-6" />
              </div>
              <h3 className="mt-3 text-base font-bold text-slate-900">
                {hasRunReport ? 'No records found for these filters' : 'Your report will appear here'}
              </h3>
              <p className="mx-auto mt-1 max-w-lg text-sm leading-6 text-slate-500">
                {hasRunReport
                  ? reportType === 'purchases'
                    ? 'No accepted purchases were found in this date range. Try widening the dates or clear the raw material filter.'
                    : 'Try a wider date range or remove a filter, then run the report again.'
                  : <>Choose a report and any filters you need, then select <strong>Run report</strong>. You can export the results once they are ready.</>}
              </p>
            </div>
          )}
          {reportType === 'profit-loss' && report[0] && (
            <div className="mt-5 space-y-5">
              <div className="flex flex-col gap-1 rounded-xl border border-[#eadfce] bg-[#faf7f0] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-[#3b241a]">
                    {report[0].period?.from === report[0].period?.to
                      ? `Profit & loss for ${dayjs(report[0].period.from).format('MMMM D, YYYY')}`
                      : `Profit & loss · ${report[0].period?.from ? dayjs(report[0].period.from).format('MMM D, YYYY') : 'All dates'} – ${report[0].period?.to ? dayjs(report[0].period.to).format('MMM D, YYYY') : 'Present'}`}
                  </p>
                  <p className="text-xs text-slate-500">
                    Dates follow hotel local time ({report[0].period?.timeZone || 'UTC'}). Results below summarize only this period.
                  </p>
                </div>
                {report[0].period?.from && report[0].period?.to && (
                  <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-[#eadfce]">
                {report[0].settledOrderCount || 0} paid bills
                  </span>
                )}
              </div>
              {(report[0].settledOrderCount || 0) === 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
                  No paid restaurant sales were found for this period. Losses and stock receipts can still appear below if they were recorded during these dates.
                </div>
              )}
              {(report[0].uncostedSalesCount || 0) > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
                  Food cost is missing for {report[0].uncostedSalesCount} paid menu line(s), representing {formatCurrency(report[0].uncostedSalesRevenue || 0)} in sales. Gross and net profit are shown as unavailable rather than estimated. Complete the recipe or production cost records to calculate them.
                </div>
              )}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  {
                    label: 'Paid sales',
                    amount: report[0].salesRevenue,
                    note: 'After discounts; tax excluded',
                    tone: 'text-sky-800',
                    icon: Receipt
                  },
                  {
                    label: 'Food cost',
                    amount: report[0].costOfGoodsSold,
                    note: report[0].uncostedSalesCount
                      ? 'Recorded costs only; some sold items are missing costs'
                      : 'Recorded ingredients for paid sold items',
                    tone: 'text-amber-800',
                    icon: Utensils
                  },
                  {
                    label: 'Gross profit',
                    amount: report[0].grossProfit,
                    note: report[0].grossProfit == null ? 'Unavailable until every sale has a recorded cost' : 'Paid sales minus food cost',
                    tone: report[0].grossProfit == null ? 'text-slate-500' : report[0].grossProfit >= 0 ? 'text-emerald-700' : 'text-rose-700',
                    icon: BarChart3
                  },
                  {
                    label: 'Net after tracked losses',
                    amount: report[0].netProfit,
                    note: report[0].netProfit == null ? 'Unavailable until every sale has a recorded cost' : 'Gross profit minus recorded losses',
                    tone: report[0].netProfit == null ? 'text-slate-500' : report[0].netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700',
                    icon: AlertTriangle
                  }
                ].map(({ label, amount, note, tone, icon: Icon }) => (
                  <div key={label} className="relative overflow-hidden rounded-2xl border border-[#eadfce] bg-white p-4 shadow-sm">
                    <span className="absolute right-4 top-4 rounded-xl bg-[#faf7f0] p-2 text-[#9a6b32]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <p className="pr-10 text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
                    <p className={`mt-3 text-2xl font-black ${tone}`}>{amount == null ? 'Not available' : formatCurrency(amount)}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{note}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <Card title="How profit is calculated" subtitle="Only costed paid sales can produce a profit figure">
                  <div className="divide-y divide-slate-100">
                    {[
                      { label: 'Paid sales (after discounts; tax excluded)', amount: report[0].salesRevenue, tone: 'text-slate-900' },
                      { label: 'Sales with recorded food cost', amount: report[0].costedSalesRevenue, tone: 'text-slate-900' },
                      { label: 'Less: ingredient cost of sold items', amount: -report[0].costOfGoodsSold, tone: 'text-rose-700' },
                      { label: 'Gross profit', amount: report[0].grossProfit, tone: report[0].grossProfit == null ? 'text-slate-500' : report[0].grossProfit >= 0 ? 'text-emerald-700' : 'text-rose-700', strong: true },
                      { label: 'Less: recorded wastage, unrecorded use, complimentary & staff food', amount: -report[0].inventoryLoss, tone: 'text-rose-700' },
                      { label: 'Net after tracked losses', amount: report[0].netProfit, tone: report[0].netProfit == null ? 'text-slate-500' : report[0].netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700', strong: true }
                    ].map(({ label, amount, tone, strong }) => (
                      <div key={label} className={`flex items-start justify-between gap-4 py-3 ${strong ? 'font-bold' : ''}`}>
                        <span className="max-w-[72%] text-sm text-slate-600">{label}</span>
                        <span className={`shrink-0 text-sm ${tone}`}>
                          {amount == null
                            ? 'Not available'
                            : amount < 0 ? `− ${formatCurrency(Math.abs(amount))}` : formatCurrency(amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
                <Card title="Recorded losses by type" subtitle="Cost of recorded wastage, missing usage, and non-sale portions">
                  <div className="h-72 min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={[
                          { name: 'Raw material wastage', amount: report[0].stockWastageCost || 0 },
                          { name: 'Prepared food wastage', amount: report[0].preparedWastageCost || 0 },
                          { name: 'Unrecorded consumption', amount: report[0].unrecordedConsumptionCost || 0 },
                          { name: 'Complimentary food cost', amount: report[0].complimentaryCost || 0 },
                          { name: 'Staff consumption', amount: report[0].staffConsumptionCost || 0 }
                        ]}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" width={145} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                        <Bar dataKey="amount" name="Recorded cost" fill="#D75C5C" radius={[0, 5, 5, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
                <Card title="Highest-selling menu items" subtitle="Ranked by portions sold during the selected period">
                  <div className="h-72 min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart layout="vertical" data={report[0].topSellingItems || []}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(value) => `${Number(value).toLocaleString()} portions`} />
                        <Bar dataKey="quantitySold" name="Portions sold" fill="#547CA5" radius={[0, 5, 5, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
                <Card title="Most profitable menu items" subtitle="Ranked by gross profit after recorded recipe or batch food cost">
                  <div className="h-72 min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart layout="vertical" data={report[0].topProfitItems || []}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                        <Bar dataKey="grossProfit" name="Gross profit" fill="#4B8F72" radius={[0, 5, 5, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  ['Top seller', report[0].topSellingItems?.[0]
                    ? `${report[0].topSellingItems[0].name} · ${report[0].topSellingItems[0].quantitySold} portions`
                    : 'No recorded sales'],
                  ['Highest gross profit', report[0].topProfitItems?.[0]
                    ? `${report[0].topProfitItems[0].name} · ${formatCurrency(report[0].topProfitItems[0].grossProfit)}`
                    : 'No costed menu sales']
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">{label}</p>
                    <p className="mt-1 break-words font-semibold text-slate-900">{value}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
                <Card title="Inventory Profit & Loss" subtitle={`${report[0].settledOrderCount || 0} paid restaurant bill(s) in this period`}>
                  <div className="divide-y divide-[#eee7dc] text-sm">
                    <div className="flex items-center justify-between gap-4 py-3">
                      <span className="text-slate-600">Net sales revenue <span className="text-xs text-slate-400">(tax excluded)</span></span>
                      <strong className="text-slate-900">{formatCurrency(report[0].salesRevenue || 0)}</strong>
                    </div>
                    <div className="flex items-center justify-between gap-4 py-3">
                      <span className="text-slate-600">Less: recipe ingredient cost</span>
                      <strong className="text-rose-700">− {formatCurrency(report[0].costOfGoodsSold || 0)}</strong>
                    </div>
                    <div className="flex items-center justify-between gap-4 border-t border-[#e8ddcc] py-3 font-bold">
                      <span className="text-[#3b241a]">Gross profit / (loss)</span>
                      <strong className={report[0].grossProfit == null ? 'text-slate-500' : report[0].grossProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                        {report[0].grossProfit == null ? 'Not available' : formatCurrency(report[0].grossProfit)}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between gap-4 py-3">
                      <span className="text-slate-600">Less: inventory wastage and expiry</span>
                      <strong className="text-rose-700">− {formatCurrency(report[0].inventoryLoss || 0)}</strong>
                    </div>
                    <div className="flex items-center justify-between gap-4 border-t border-[#e8ddcc] py-3 text-base font-black">
                      <span className="text-[#3b241a]">Net inventory profit / (loss)</span>
                      <strong className={report[0].netProfit == null ? 'text-slate-500' : report[0].netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                        {report[0].netProfit == null ? 'Not available' : formatCurrency(report[0].netProfit)}
                      </strong>
                    </div>
                  </div>
                </Card>
                <div className="space-y-4">
                  <Card title="Margin">
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className="text-xs text-slate-500">Gross margin</p>
                        <p className="mt-1 text-2xl font-black text-[#3b241a]">
                          {report[0].grossMarginPercent == null ? '—' : `${report[0].grossMarginPercent}%`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">Net margin</p>
                        <p className={`mt-1 text-2xl font-black ${report[0].netProfit == null ? 'text-slate-500' : report[0].netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {report[0].netMarginPercent == null ? '—' : `${report[0].netMarginPercent}%`}
                        </p>
                      </div>
                    </div>
                  </Card>
                  <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-xs leading-relaxed text-sky-950">
                    Sales include paid portions only, exclude tax, and reflect discounts and refunds. Profit is unavailable for any sales without a recorded recipe or production cost. Inventory purchases ({formatCurrency(report[0].stockPurchasesNotExpensed || 0)}) are shown as stock investment, not as an immediate expense.
                  </div>
                </div>
              </div>
              {[
                {
                  title: 'Raw material wastage & expiry',
                  entries: report[0].stockWastageBreakdown || [],
                  empty: 'No raw material wastage or expiry recorded.',
                  location: (entry) => entry.department || '—'
                },
                {
                  title: 'Prepared food wasted',
                  entries: report[0].preparedWastageBreakdown || [],
                  empty: 'No prepared food was recorded as wasted.',
                  location: (entry) => entry.location || '—'
                },
                {
                  title: 'Unrecorded material consumption',
                  entries: report[0].unrecordedConsumption || [],
                  empty: 'No unrecorded consumption was reported in this period.',
                  location: (entry) => entry.department || '—'
                },
                {
                  title: 'Unrecorded prepared-food use',
                  entries: report[0].unrecordedFoodBreakdown || [],
                  empty: 'No unrecorded prepared-food use was reported in this period.',
                  location: (entry) => entry.location || '—'
                },
                {
                  title: 'Complimentary servings',
                  entries: report[0].complimentaryBreakdown || [],
                  empty: 'No complimentary servings were recorded.',
                  location: (entry) => entry.location || '—'
                },
                {
                  title: 'Raw materials allocated to complimentary servings',
                  subtitle: 'Ingredient quantities and costs are allocated from production-batch recipe snapshots for traceability. This is included in complimentary food cost above and is not counted twice.',
                  entries: report[0].complimentaryRawMaterialBreakdown || [],
                  empty: 'No complimentary ingredient allocation is available for this period.',
                  location: (entry) => entry.location || '—',
                  isAllocation: true
                },
                {
                  title: 'Raw materials allocated to unrecorded prepared food',
                  subtitle: 'Ingredient quantities and costs are allocated from production-batch recipe snapshots for traceability. This is included in unrecorded prepared-food cost above and is not counted twice.',
                  entries: report[0].unrecordedFoodRawMaterialBreakdown || [],
                  empty: 'No unrecorded prepared-food ingredient allocation is available for this period.',
                  location: (entry) => entry.location || '—',
                  isAllocation: true
                },
                {
                  title: 'Staff consumption',
                  entries: report[0].staffConsumptionBreakdown || [],
                  empty: 'No staff consumption was recorded.',
                  location: (entry) => entry.location || '—'
                }
              ].map((section) => (
                <Card
                  key={section.title}
                  title={section.title}
                  subtitle={section.subtitle || (section.entries.length ? `${section.entries.length} recorded transaction(s)` : undefined)}
                >
                  {!section.entries.length ? (
                    <p className="py-3 text-sm text-slate-500">{section.empty}</p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {section.entries.map((entry, index) => (
                        <div key={`${entry.itemName}-${entry.date}-${index}`} className="grid gap-2 py-3 text-sm sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] sm:items-center">
                          <div className="min-w-0">
                            <p className="break-words font-semibold text-slate-900">{entry.itemName}{entry.code ? ` (${entry.code})` : ''}</p>
                            {entry.menuItemName && <p className="mt-0.5 text-xs text-slate-500">Prepared item: {entry.menuItemName}</p>}
                            <p className="text-xs text-slate-500">
                              {entry.date ? dayjs(entry.date).format('DD MMM YYYY, h:mm A') : 'Date unavailable'}
                              {entry.reference ? ` · ${entry.reference}` : ''}
                            </p>
                          </div>
                          <div className="text-slate-600">
                            <p>{Number(entry.quantity || 0).toLocaleString(undefined, { maximumFractionDigits: 3 })} {entry.unit || 'portion'} · {section.location(entry)}</p>
                            {entry.reason && <p className="break-words text-xs text-slate-500">Reason: {entry.reason}</p>}
                          </div>
                          <p className={`font-bold ${section.isAllocation ? 'text-slate-700' : 'text-rose-700'}`}>
                            {formatCurrency(entry.cost || 0)}
                            {section.isAllocation && <span className="mt-0.5 block text-[10px] font-medium text-slate-500">Traceability only</span>}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
              <Card title="Menu Item Profitability" subtitle="Net sales compared with recorded recipe ingredient costs">
                <div className="overflow-x-auto">
                  <PaginatedTable tableClassName="w-full min-w-[700px] text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 uppercase text-slate-400">
                        <th className="pb-3">Menu item</th>
                        <th className="pb-3">Qty sold</th>
                        <th className="pb-3">AC / Non-AC</th>
                        <th className="pb-3 text-right">Net sales</th>
                        <th className="pb-3 text-right">Food cost</th>
                        <th className="pb-3 text-right">Gross profit / (loss)</th>
                        <th className="pb-3 text-right">Margin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(report[0].menuItemBreakdown || []).map((entry) => (
                        <tr key={entry.menuItemId}>
                          <td className="py-3 font-semibold text-slate-800">{entry.name}</td>
                          <td>{entry.quantitySold}</td>
                          <td>{entry.acQuantitySold || 0} / {entry.nonAcQuantitySold || 0}</td>
                          <td className="text-right">{formatCurrency(entry.salesRevenue)}</td>
                          <td className="text-right">{entry.foodCost == null ? 'Not available' : formatCurrency(entry.foodCost)}</td>
                          <td className={`text-right font-semibold ${entry.grossProfit == null ? 'text-slate-500' : entry.grossProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {entry.grossProfit == null ? 'Not available' : formatCurrency(entry.grossProfit)}
                          </td>
                          <td className="text-right">{entry.grossMarginPercent == null ? '—' : `${entry.grossMarginPercent}%`}</td>
                        </tr>
                      ))}
                      {!report[0].menuItemBreakdown?.length && (
                        <tr><td colSpan="7" className="py-8 text-center text-slate-500">No paid restaurant sales in this period.</td></tr>
                      )}
                    </tbody>
                  </PaginatedTable>
                </div>
              </Card>
            </div>
          )}
          {reportType === 'financial' && report[0] && (
            <>
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {[
                ['Purchases received', report[0].totalPurchaseValue],
                ['Consumption cost', report[0].totalConsumptionCost],
                ['Wastage loss', report[0].totalWastageLoss],
                ['Closing stock value', report[0].closingInventoryValue],
                ['Stock adjustments', report[0].stockAdjustmentValue],
                ['Total raw material cost', report[0].totalRawMaterialCost]
              ].map(([label, amount]) => (
                <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs font-medium text-slate-500">{label}</p>
                  <p className="mt-2 text-lg font-black text-slate-900">{formatCurrency(amount || 0)}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-3">
              <Card title="Monthly Inventory Expenses">
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={report[0].monthlyTrend || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Bar dataKey="purchaseValue" name="Purchases" fill="#C58A32" />
                      <Bar dataKey="consumptionCost" name="Consumption" fill="#4B8F72" />
                      <Bar dataKey="wastageCost" name="Wastage" fill="#D75C5C" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
              <Card title="Vendor-wise Purchase Cost">
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={report[0].vendorBreakdown || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="vendorName" hide />
                      <YAxis />
                      <Tooltip labelFormatter={(label) => label} formatter={(value) => formatCurrency(value)} />
                      <Bar dataKey="totalPurchaseValue" name="Purchase value" fill="#6784C2" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
              <Card title="Raw Material Wastage">
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={(report[0].itemBreakdown || []).filter((entry) => entry.wastageCost > 0)}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="code" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Bar dataKey="wastageCost" name="Wastage cost" fill="#D75C5C" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <Card title="Vendor-wise Purchase Expenses">
                <div className="overflow-x-auto">
                  <PaginatedTable tableClassName="w-full text-left text-xs">
                    <thead><tr className="border-b border-slate-100 uppercase text-slate-400"><th className="pb-2">Vendor</th><th className="pb-2">Receipts</th><th className="pb-2 text-right">Purchase value</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {(report[0].vendorBreakdown || []).map((vendor) => (
                        <tr key={vendor.vendorId || 'unassigned'}><td className="py-2 font-semibold">{vendor.vendorName}</td><td>{vendor.receiptCount}</td><td className="text-right">{formatCurrency(vendor.totalPurchaseValue)}</td></tr>
                      ))}
                      {!report[0].vendorBreakdown?.length && <tr><td colSpan="3" className="py-5 text-center text-slate-400">No purchases in this period.</td></tr>}
                    </tbody>
                  </PaginatedTable>
                </div>
              </Card>
              <Card title="Raw Material Expenses">
                <div className="overflow-x-auto">
                  <PaginatedTable tableClassName="w-full text-left text-xs">
                    <thead><tr className="border-b border-slate-100 uppercase text-slate-400"><th className="pb-2">Material</th><th className="pb-2">Purchased</th><th className="pb-2">Consumed</th><th className="pb-2">Wasted</th><th className="pb-2 text-right">Purchase value</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {(report[0].itemBreakdown || []).map((entry) => (
                        <tr key={entry.itemId}>
                          <td className="py-2 font-semibold">{entry.name} <span className="text-slate-400">({entry.code})</span></td>
                          <td>{entry.purchasedQuantity} {entry.unit}</td>
                          <td>{entry.consumedQuantity} {entry.unit}</td>
                          <td>{entry.wastedQuantity} {entry.unit}</td>
                          <td className="text-right">{formatCurrency(entry.purchaseValue)}</td>
                        </tr>
                      ))}
                      {!report[0].itemBreakdown?.length && <tr><td colSpan="5" className="py-5 text-center text-slate-400">No raw material transactions in this period.</td></tr>}
                    </tbody>
                  </PaginatedTable>
                </div>
              </Card>
            </div>
            </>
          )}
          {reportType !== 'financial' && reportType !== 'profit-loss' && reportTableConfig.rows.length > 0 && (
            <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
              <PaginatedTable
                groupRows={reportType === 'stock' || reportType === 'valuation'}
                tableClassName="w-full min-w-[720px] text-left text-sm"
              >
                <thead className="bg-[#faf7f0]">
                  <tr className="border-b border-[#eadfce] text-[11px] uppercase tracking-wide text-slate-500">
                    {reportTableConfig.headers.map((header, index) => (
                      <th
                        key={header}
                        className={`px-4 py-3 ${
                          reportType === 'valuation'
                            ? index === reportTableConfig.headers.length - 2 ? 'text-right' : ''
                            : reportType !== 'stock' && index === reportTableConfig.headers.length - 1
                              ? 'text-right'
                              : ''
                        }`}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportTableConfig.rows.map((row) => (
                    <React.Fragment key={row.key}>
                      <tr className="transition-colors hover:bg-[#fdfbf8]">
                        {row.cells.map((cell, index) => {
                          const rightAligned = reportType === 'valuation'
                            ? index === row.cells.length - 1
                            : reportType !== 'stock' && index === row.cells.length - 1;
                          return (
                            <td
                              key={`${row.key}-${index}`}
                              className={`px-4 py-3 ${index === 0 ? 'font-semibold text-slate-900' : 'text-slate-600'} ${rightAligned ? 'text-right font-semibold tabular-nums' : ''}`}
                            >
                              {cell}
                            </td>
                          );
                        })}
                        {(reportType === 'stock' || reportType === 'valuation') && (
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              aria-expanded={expandedReportBatchItemId === String(row.item._id)}
                              onClick={() => toggleReportItemBatches(row.item)}
                              className="inline-flex items-center gap-2 rounded-lg border border-[#e8ddcc] bg-white px-3 py-2 text-xs font-semibold text-[#704522] transition hover:border-[#caa879] hover:bg-[#faf7f0] focus:outline-none focus:ring-2 focus:ring-[#caa879]/50"
                            >
                              {expandedReportBatchItemId === String(row.item._id) ? 'Hide batches' : 'View batches'}
                              {expandedReportBatchItemId === String(row.item._id)
                                ? <ChevronUp className="h-3.5 w-3.5" />
                                : <ChevronDown className="h-3.5 w-3.5" />}
                            </button>
                          </td>
                        )}
                      </tr>
                      {(reportType === 'stock' || reportType === 'valuation')
                        && expandedReportBatchItemId === String(row.item._id) && (
                          <tr>
                            <td colSpan={reportTableConfig.headers.length} className="bg-[#fbf8f2] p-3 sm:p-5">
                              <div className="overflow-hidden rounded-2xl border border-[#e8ddcc] bg-white shadow-sm">
                                <div className="flex flex-col gap-2 border-b border-[#eee5d8] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                                  <div>
                                    <h3 className="text-sm font-bold text-[#3b241a]">{row.item.name} · Batch details</h3>
                                    <p className="mt-1 text-xs text-slate-500">
                                      Individual batch quantities, purchase details, and batch-specific costs.
                                    </p>
                                  </div>
                                  {!loadingBatchesByItem[row.key] && !batchErrorsByItem[row.key] && (
                                    <span className="w-fit rounded-full border border-[#eadfce] bg-[#faf7f0] px-3 py-1.5 text-xs font-semibold text-slate-600">
                                      {(batchesByItem[row.key] || []).length} {(batchesByItem[row.key] || []).length === 1 ? 'batch' : 'batches'}
                                    </span>
                                  )}
                                </div>
                                {loadingBatchesByItem[row.key] ? (
                                  <div className="p-5">
                                    <DataSkeleton rows={3} columns={4} label="Loading batch details" />
                                  </div>
                                ) : batchErrorsByItem[row.key] ? (
                                  <div className="m-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                                    {batchErrorsByItem[row.key]}
                                  </div>
                                ) : !(batchesByItem[row.key] || []).length ? (
                                  <div className="px-4 py-9 text-center">
                                    <PackageCheck className="mx-auto h-6 w-6 text-[#9a6b2f]" />
                                    <p className="mt-2 text-sm font-semibold text-slate-700">No batch records</p>
                                    <p className="mt-1 text-xs text-slate-500">
                                      This item may have legacy stock without batch-level purchase details.
                                    </p>
                                  </div>
                                ) : (
                                  <div className="grid gap-3 p-3 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">
                                    {(batchesByItem[row.key] || []).map((batch, batchIndex) => (
                                      <article key={batch._id} className="overflow-hidden rounded-xl border border-[#e9e0d3] bg-[#fffdfa]">
                                        <div className="flex items-start justify-between gap-3 border-b border-[#f0ebe3] px-4 py-3">
                                          <div className="min-w-0">
                                            <p className="truncate text-sm font-bold text-[#3b241a]">
                                              {batch.batchNumber || `Batch ${batchIndex + 1}`}
                                            </p>
                                            <p className="mt-1 text-[11px] text-slate-500">
                                              {batch.location || 'Main Store'}
                                              {batch.receivedAt && ` · Received ${dayjs(batch.receivedAt).format('MMM D, YYYY')}`}
                                            </p>
                                          </div>
                                          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                                            batch.remainingQuantity > 0
                                              ? 'bg-emerald-50 text-emerald-800'
                                              : 'bg-slate-100 text-slate-600'
                                          }`}>
                                            {batch.remainingQuantity > 0 ? 'Open' : 'Exhausted'}
                                          </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 p-3">
                                          {[
                                            ['Remaining', `${formatInventoryQuantity(batch.actualUsableStock ?? batch.remainingQuantity, row.item)} ${row.item.baseUnit || row.item.unit || ''}`],
                                            ['Received', `${formatInventoryQuantity(batch.quantity, row.item)} ${row.item.baseUnit || row.item.unit || ''}`],
                                            [`Cost / ${row.item.baseUnit || row.item.unit || 'unit'}`, formatInventoryUnitCost(batch.unitCost)],
                                            ['Batch value remaining', formatCurrency((Number(batch.remainingQuantity) || 0) * (Number(batch.unitCost) || 0))],
                                            ['Wasted', `${formatInventoryQuantity(batch.wastageQuantity || 0, row.item)} ${row.item.baseUnit || row.item.unit || ''}`],
                                            ['Unrecorded use', `${formatInventoryQuantity(batch.unrecordedConsumptionQuantity || 0, row.item)} ${row.item.baseUnit || row.item.unit || ''}`]
                                          ].map(([label, value]) => (
                                            <div key={label} className="rounded-lg border border-[#eee7dc] bg-white p-2.5">
                                              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                                              <p className="mt-1 text-xs font-bold text-[#3b241a]">{value}</p>
                                            </div>
                                          ))}
                                        </div>
                                        <div className="mx-3 mb-3 rounded-lg border border-[#eee7dc] bg-white">
                                          <div className="grid grid-cols-2 divide-x divide-[#eee7dc]">
                                            <div className="p-3">
                                              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Purchased as</p>
                                              <p className="mt-1 text-xs font-semibold text-slate-800">
                                                {batch.purchaseQuantity != null && batch.purchaseUnit
                                                  ? `${batch.purchaseQuantity} ${batch.purchaseUnit}`
                                                  : 'Base units'}
                                              </p>
                                            </div>
                                            <div className="p-3">
                                              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Purchase price</p>
                                              <p className="mt-1 text-xs font-semibold text-slate-800">
                                                {batch.purchaseUnitCost != null && batch.purchaseUnit
                                                  ? `${formatCurrency(batch.purchaseUnitCost)} / ${batch.purchaseUnit}`
                                                  : 'Not recorded'}
                                              </p>
                                            </div>
                                          </div>
                                          <div className="grid grid-cols-2 divide-x divide-[#eee7dc] border-t border-[#eee7dc]">
                                            <div className="p-3">
                                              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Vendor / invoice</p>
                                              <p className="mt-1 truncate text-xs font-semibold text-slate-800">
                                                {batch.vendorId?.name || '—'}{batch.invoiceNumber ? ` · ${batch.invoiceNumber}` : ''}
                                              </p>
                                            </div>
                                            <div className="p-3">
                                              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Expiry</p>
                                              <p className="mt-1 text-xs font-semibold text-slate-800">
                                                {batch.expiryDate ? dayjs(batch.expiryDate).format('MMM D, YYYY') : 'Not tracked'}
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                      </article>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                    </React.Fragment>
                  ))}
                </tbody>
              </PaginatedTable>
            </div>
          )}
        </Card>
      )}

      {/* Record Stock Movement Modal */}
      <Modal
        isOpen={isMovementOpen}
        onClose={() => setIsMovementOpen(false)}
        title={`Adjust Stock: ${selectedItemForMove?.name}`}
        subtitle={`Current Stock: ${selectedItemForMove ? formatInventoryQuantity(selectedItemForMove.currentStock, selectedItemForMove) : ''}`}
      >
        <form onSubmit={handleRecordMovement} className="space-y-4">
          <Select
            label="Movement Ledger Type"
            value={moveForm.movementType}
            onChange={(e) => setMoveForm({ ...moveForm, movementType: e.target.value })}
            options={[
              { label: 'Stock Receipt (Add stock)', value: 'receipt' },
              { label: 'Stock Issue (Consume stock in department)', value: 'issue' },
              { label: 'Wastage / Spoiled Goods', value: 'wastage' },
              { label: 'Inventory Audit Adjustment (Direct set)', value: 'adjustment' }
            ]}
          />

          <Input
            label="Quantity to Move / Set"
            type="number"
            min="0"
            step="any"
            required
            value={moveForm.quantity}
            onChange={(e) => setMoveForm({ ...moveForm, quantity: e.target.value })}
          />
          <Select
            label="Quantity unit"
            searchable
            searchPlaceholder="Search supported units..."
            value={moveForm.unit || selectedItemForMove?.baseUnit || selectedItemForMove?.unit}
            onChange={(e) => setMoveForm({ ...moveForm, unit: e.target.value })}
            options={directUnitChoicesForItem(selectedItemForMove)}
          />

          <Input
            label="Notes / Reason"
            value={moveForm.notes}
            onChange={(e) => setMoveForm({ ...moveForm, notes: e.target.value })}
            placeholder="Restock shipment from distributor"
          />
          {moveForm.movementType === 'issue' && (
            <Input
              label="Department"
              required
              value={moveForm.department}
              onChange={(e) => setMoveForm({ ...moveForm, department: e.target.value })}
              placeholder="Kitchen"
            />
          )}
          <Select
            label="Stock location"
            required
            searchable
            value={moveForm.locationId}
            onChange={(event) => {
              const selected = storageLocationById(event.target.value);
              setMoveForm({ ...moveForm, locationId: event.target.value, location: selected?.locationName || '' });
            }}
            options={storageLocationOptions}
          />

          <div className="flex flex-col-reverse gap-3 pt-3 sm:flex-row sm:justify-end">
            <Button className="w-full sm:w-auto" variant="secondary" type="button" onClick={() => setIsMovementOpen(false)}>
              Cancel
            </Button>
            <Button className="w-full sm:w-auto" variant="primary" type="submit">
              Record Movement
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(editingItem)}
        onClose={() => setEditingItem(null)}
        title="Edit Raw Material"
        subtitle="Update catalogue details and stock controls without changing historical units or movements"
      >
        <form onSubmit={handleUpdateItem} className="space-y-4">
          <Input label="Raw material name" required value={itemEditForm.name || ''} onChange={(event) => setItemEditForm({ ...itemEditForm, name: event.target.value })} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="SKU / Code" required value={itemEditForm.code || ''} onChange={(event) => setItemEditForm({ ...itemEditForm, code: event.target.value })} />
            <Select
              label="Category"
              value={itemEditForm.category || 'other'}
              onChange={(event) => setItemEditForm({ ...itemEditForm, category: event.target.value })}
              options={[
                { label: 'Vegetables', value: 'vegetables' },
                { label: 'Fruits', value: 'fruits' },
                { label: 'Groceries', value: 'groceries' },
                { label: 'Dairy Products', value: 'dairy_products' },
                { label: 'Meat', value: 'meat' },
                { label: 'Seafood', value: 'seafood' },
                { label: 'Food & Ingredients', value: 'food_ingredients' },
                { label: 'Beverages', value: 'beverages' },
                { label: 'Toiletries', value: 'toiletries' },
                { label: 'Housekeeping Supplies', value: 'housekeeping_supplies' },
                { label: 'Cleaning Materials', value: 'cleaning_materials' },
                { label: 'Maintenance Materials', value: 'maintenance_materials' },
                { label: 'Electrical Items', value: 'electrical_items' },
                { label: 'Stationery', value: 'stationery' },
                { label: 'Minibar Products', value: 'minibar_products' },
                { label: 'Linen & Laundry', value: 'linen_laundry' },
                { label: 'Other', value: 'other' }
              ]}
            />
          </div>
          <Input label="Description" value={itemEditForm.description || ''} onChange={(event) => setItemEditForm({ ...itemEditForm, description: event.target.value })} />
          <Select
            label="Storage location"
            searchable
            value={itemEditForm.locationId || ''}
            onChange={(event) => {
              const selected = storageLocationById(event.target.value);
              setItemEditForm({
                ...itemEditForm,
                locationId: event.target.value,
                location: selected?.locationName || ''
              });
            }}
            options={storageLocationOptions}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Minimum stock threshold" type="number" min="0" step="any" value={itemEditForm.minStockThreshold ?? ''} onChange={(event) => setItemEditForm({ ...itemEditForm, minStockThreshold: event.target.value })} />
            <Input label="Maximum stock level (optional)" type="number" min="0" step="any" value={itemEditForm.maxStockLevel ?? ''} onChange={(event) => setItemEditForm({ ...itemEditForm, maxStockLevel: event.target.value })} />
            <Input label="Reorder quantity" type="number" min="0" step="any" value={itemEditForm.reorderQuantity ?? ''} onChange={(event) => setItemEditForm({ ...itemEditForm, reorderQuantity: event.target.value })} />
            <Input label="Verification interval override (days, optional)" type="number" min="1" max="365" step="1" value={itemEditForm.stockVerificationIntervalDays ?? ''} onChange={(event) => setItemEditForm({ ...itemEditForm, stockVerificationIntervalDays: event.target.value })} />
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-slate-700">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={Boolean(itemEditForm.trackExpiry)} onChange={(event) => setItemEditForm({ ...itemEditForm, trackExpiry: event.target.checked })} />
              Track expiry by batch
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={Boolean(itemEditForm.trackBatchNumber)} onChange={(event) => setItemEditForm({ ...itemEditForm, trackBatchNumber: event.target.checked })} />
              Track batch numbers
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={Boolean(itemEditForm.isActive)} onChange={(event) => setItemEditForm({ ...itemEditForm, isActive: event.target.checked })} />
              Active raw material
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setEditingItem(null)}>Cancel</Button>
            <Button type="submit">Save changes</Button>
          </div>
        </form>
      </Modal>

      {/* Add Item Modal */}
      <Modal
        isOpen={isAddItemOpen}
        onClose={() => setIsAddItemOpen(false)}
        title="Add Raw Material Stock"
        subtitle="Receive stock against an existing raw material"
        maxWidth="max-w-4xl"
      >
        <form onSubmit={handleCreateItem} className="space-y-4">
          <p className="rounded-lg bg-[#faf7f0] p-3 text-xs leading-relaxed text-slate-700">
            Select the material and purchase unit first. Enter the quantity and price per purchase unit; stock and cost are converted to the material's base unit. Earlier batches can be deducted and wastage recorded as part of this receipt.
          </p>
          <Select
            label="Raw material"
            info="Select a raw material already set up in Raw Material Master. Its configured base unit and purchase units determine how this receipt is converted and stored."
            searchable
            searchPlaceholder="Search raw materials..."
            required
            value={itemForm.itemId}
            onChange={(event) => {
              const material = rawMaterialsForReceipt.find((item) => item._id === event.target.value);
              const purchaseUnits = rawMaterialPurchaseUnits(material);
              const defaultUnit = purchaseUnits.find((unit) => unit.isDefault) || purchaseUnits[0];
              setItemForm({
                ...itemForm,
                itemId: event.target.value,
                unit: defaultUnit?.symbol || '',
                quantity: '',
                existingStockDeduction: '0',
                existingStockDeductionUnit: material?.baseUnit || material?.unit || '',
                hasWastage: 'no',
                wastageQuantity: '',
                wastageUnit: material?.baseUnit || material?.unit || defaultUnit?.symbol || '',
                wastageReason: '',
                purchasePrice: '',
                vendorId: '',
                expiryDate: '',
                location: material?.location || 'Main Store',
                locationId: String(material?.locationId?._id || material?.locationId || storageLocationIdForName(material?.location))
              });
            }}
            options={[
              { label: 'Select raw material', value: '' },
              ...rawMaterialsForReceipt.map((item) => ({
                label: `${item.name} (${item.baseUnit || item.unit})`,
                value: item._id
              }))
            ]}
          />
          {!rawMaterialsForReceipt.length && (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              No raw materials are available. Add a raw material before receiving stock.
            </p>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select
              label="Receiving department"
              info="Choose the department this stock is being received for. This is recorded with the stock movement for reporting."
              required
              value={itemForm.department}
              onChange={(event) => setItemForm({ ...itemForm, department: event.target.value })}
              options={[
                { label: 'Select department', value: '' },
                ...['Kitchen', 'Restaurant', 'Housekeeping', 'Maintenance', 'Minibar'].map((department) => ({
                  label: department,
                  value: department
                }))
              ]}
            />
          </div>
          {selectedRawMaterialForReceipt && (
            <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
              Stock is stored in <strong>{receiptBaseUnit}</strong>
              {selectedReceiptPurchaseUnit && (
                <span> · 1 {selectedReceiptPurchaseUnit.symbol} = {new Intl.NumberFormat(undefined, { maximumFractionDigits: 8 }).format(selectedReceiptPurchaseUnit.factor)} {receiptBaseUnit}</span>
              )}
            </p>
          )}
          {selectedRawMaterialForReceipt && (
            <details className="rounded-lg border border-slate-200 bg-white">
              <summary className="cursor-pointer px-3 py-2.5 text-sm font-medium text-slate-800">
                Batch history ({receiptBatches.length})
              </summary>
              <div className="space-y-2 border-t border-slate-100 p-3">
                {receiptBatchesLoading ? (
                  <p className="text-sm text-slate-500">Loading batch history…</p>
                ) : receiptBatches.length === 0 ? (
                  <p className="text-sm text-slate-500">No batches have been received for this material yet.</p>
                ) : receiptBatches.map((batch) => (
                  <div key={batch._id} className="rounded-md bg-slate-50 p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong className="text-slate-800">{batch.batchNumber || 'Unnumbered batch'}</strong>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        batch.status === 'open' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {batch.status === 'open' ? 'Open' : 'Exhausted'}
                      </span>
                    </div>
                    <p className="mt-1 text-slate-600">
                      Received {new Intl.NumberFormat(undefined, { maximumFractionDigits: 8 }).format(batch.quantity)} {receiptBaseUnit}
                      {' · '}Remaining {new Intl.NumberFormat(undefined, { maximumFractionDigits: 8 }).format(batch.remainingQuantity)} {receiptBaseUnit}
                    </p>
                    <p className="text-xs text-slate-500">
                      {batch.purchaseQuantity != null && batch.purchaseUnit
                        ? `Purchased ${new Intl.NumberFormat(undefined, { maximumFractionDigits: 8 }).format(batch.purchaseQuantity)} ${batch.purchaseUnit}`
                        : 'Purchase quantity not recorded'}
                      {batch.purchaseAmount != null && ` · ${currencySymbol}${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(batch.purchaseAmount)}`}
                      {batch.receivedAt && ` · ${new Date(batch.receivedAt).toLocaleDateString()}`}
                      {batch.location && ` · ${batch.location}`}
                      {batch.vendorId?.name && ` · ${batch.vendorId.name}`}
                    </p>
                  </div>
                ))}
                <p className="text-xs text-slate-500">
                  Stock is issued from the oldest open batch first within each location. A batch is exhausted automatically when its remaining quantity reaches zero; receiving new stock does not close an older batch.
                </p>
              </div>
            </details>
          )}
          {selectedRawMaterialForReceipt && receiptPreviousAvailable > 0 && (
            <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm text-amber-900">
                <strong>{formatReceiptQuantity(receiptPreviousAvailable)} {receiptBaseUnit}</strong> is recorded in earlier batches at this location.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  label="Quantity to deduct"
                  info={`Enter a quantity to remove from existing batches. It will be converted to ${receiptBaseUnit} and deducted FIFO as part of this receipt.`}
                  type="number"
                  min="0"
                  max={receiptDeductionMaximum}
                  step="any"
                  required
                  value={itemForm.existingStockDeduction}
                  onChange={(event) => setItemForm({ ...itemForm, existingStockDeduction: event.target.value })}
                />
                <Select
                  label="Purchase unit (units)"
                  required
                  value={itemForm.existingStockDeductionUnit}
                  onChange={(event) => setItemForm({ ...itemForm, existingStockDeductionUnit: event.target.value })}
                  options={[
                    { label: 'Select unit', value: '' },
                    ...receiptPurchaseUnits.map((unit) => ({ label: unit.label, value: unit.symbol }))
                  ]}
                />
              </div>
              <p className="text-xs text-amber-900">
                Deduction: {formatReceiptQuantity(receiptDeductionQuantity)} {receiptBaseUnit}. Existing stock remaining after deduction: {formatReceiptQuantity(Math.max(
                  0,
                  receiptPreviousAvailable - receiptDeductionQuantity
                ))} {receiptBaseUnit}. The deduction is applied immediately with this receipt.
              </p>
            </div>
          )}
          {selectedRawMaterialForReceipt && !receiptBatchesLoading && receiptBatches.length > 0 && (
            <div className="space-y-3 rounded-lg border border-slate-200 p-3">
              <Select
                label="Is there any wastage in the remaining stock?"
                value={itemForm.hasWastage}
                onChange={(event) => setItemForm({
                  ...itemForm,
                  hasWastage: event.target.value,
                  wastageQuantity: event.target.value === 'yes' ? itemForm.wastageQuantity : '',
                  wastageUnit: itemForm.wastageUnit || receiptBaseUnit
                })}
                options={[
                  { label: 'No', value: 'no' },
                  { label: 'Yes', value: 'yes' }
                ]}
              />
              {itemForm.hasWastage === 'yes' && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Input
                    label="Wastage quantity"
                    type="number"
                    min="0.00000001"
                    step="any"
                    required
                    value={itemForm.wastageQuantity}
                    onChange={(event) => setItemForm({ ...itemForm, wastageQuantity: event.target.value })}
                  />
                  <Select
                    label="Wastage unit"
                    required
                    value={itemForm.wastageUnit}
                    onChange={(event) => setItemForm({ ...itemForm, wastageUnit: event.target.value })}
                    options={[
                      { label: 'Select unit', value: '' },
                      ...receiptPurchaseUnits.map((unit) => ({ label: unit.label, value: unit.symbol }))
                    ]}
                  />
                  <div className="sm:col-span-2">
                    <Input
                      label="Wastage reason"
                      required
                      value={itemForm.wastageReason}
                      onChange={(event) => setItemForm({ ...itemForm, wastageReason: event.target.value })}
                      placeholder="e.g. spoiled during storage"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
          {selectedRawMaterialForReceipt && !receiptPurchaseUnits.length && (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              This raw material has no configured purchase units. Select compatible purchase units in its raw material settings first.
            </p>
          )}
          {selectedRawMaterialForReceipt?.trackExpiry && (
            <Input
              label="Expiry date"
              info="Enter the expiry date printed on the received stock. This is required because expiry tracking is enabled for this raw material."
              type="date"
              required
              value={itemForm.expiryDate}
              onChange={(event) => setItemForm({ ...itemForm, expiryDate: event.target.value })}
            />
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Input
              label="Purchased quantity"
              info="Enter the amount received in the selected configured purchase unit for this raw material."
              type="number"
              min="0.00000001"
              step="any"
              required
              value={itemForm.quantity}
              onChange={(event) => setItemForm({ ...itemForm, quantity: event.target.value })}
            />
            <Select
              label="Purchase unit"
              info="Choose a purchase unit configured for this raw material. The saved conversion is used to calculate stock in the base unit."
              required
              value={itemForm.unit}
              onChange={(event) => setItemForm({ ...itemForm, unit: event.target.value, purchasePrice: '' })}
              options={[
                { label: 'Select unit', value: '' },
                ...receiptPurchaseUnits.map((unit) => ({ label: unit.label, value: unit.symbol }))
              ]}
            />
            <Input
              label={itemForm.unit ? `Purchase price / ${itemForm.unit} (${currencySymbol})` : `Purchase price (${currencySymbol})`}
              info="Enter the total cost for one selected purchase unit, not the cost per base unit. The system divides it by the unit conversion to calculate base-unit cost."
              type="number"
              min="0"
              step="any"
              required
              value={itemForm.purchasePrice}
              onChange={(event) => setItemForm({ ...itemForm, purchasePrice: event.target.value })}
            />
          </div>
          {selectedReceiptPurchaseUnit && itemForm.purchasePrice !== '' && Number.isFinite(receiptBasePrice) && (
            <p className="text-xs text-slate-600">
              Base-unit cost: {currencySymbol}{new Intl.NumberFormat(undefined, { maximumFractionDigits: 6 }).format(receiptBasePrice)} per {receiptBaseUnit}
              {itemForm.quantity && ` · Stock added: ${new Intl.NumberFormat(undefined, { maximumFractionDigits: 8 }).format(Number(itemForm.quantity) * selectedReceiptPurchaseUnit.factor)} ${receiptBaseUnit}`}
            </p>
          )}
          {selectedRawMaterialForReceipt && (
            <div className="space-y-1 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-950">
              <p className="font-semibold">Stock calculation preview ({receiptBaseUnit})</p>
              <p>Previous available: {formatReceiptQuantity(receiptPreviousAvailable)}</p>
              <p>Existing stock deduction: −{formatReceiptQuantity(receiptDeductionQuantity)}</p>
              <p>Fresh receipt: +{formatReceiptQuantity(receiptNewBaseQuantity)}</p>
              <p>Stock eligible for wastage: {formatReceiptQuantity(receiptWastageAvailableQuantity)}</p>
              <p>Wastage: −{formatReceiptQuantity(receiptWastageBaseQuantity)}</p>
              <p className="border-t border-sky-200 pt-1 font-bold">
                Remaining after receipt: {formatReceiptQuantity(receiptRemainingAfterWastage)} {receiptBaseUnit}
              </p>
              {receiptWastageBaseQuantity > receiptWastageAvailableQuantity && (
                <p className="font-medium text-rose-700">Wastage cannot exceed the eligible stock. Earlier batches are only included when an existing-stock deduction is entered.</p>
              )}
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select
              label="Vendor (optional)"
              info="Select the vendor for this receipt if known. Leaving this blank does not prevent receiving stock."
              searchable
              searchPlaceholder="Search vendors..."
              value={itemForm.vendorId}
              onChange={(event) => setItemForm({ ...itemForm, vendorId: event.target.value })}
              options={[
                { label: 'No vendor selected', value: '' },
                ...vendors.filter((vendor) => vendor.status === 'active').map((vendor) => ({
                  label: vendor.name,
                  value: vendor._id
                }))
              ]}
            />
            <Select
              label="Stock location"
              searchable
              info="Choose where this delivery is placed. The stock ledger records the location."
              value={itemForm.locationId}
              onChange={(event) => {
                const selected = storageLocationById(event.target.value);
                setItemForm({
                  ...itemForm,
                  locationId: event.target.value,
                  location: selected?.locationName || ''
                });
              }}
              options={storageLocationOptions}
            />
          </div>
          <Input
            label="Notes (optional)"
            info="Add an invoice reference or other details that will help identify this receipt later."
            value={itemForm.notes}
            onChange={(event) => setItemForm({ ...itemForm, notes: event.target.value })}
          />
          <div className="flex flex-col-reverse gap-3 pt-3 sm:flex-row sm:justify-end">
            <Button className="w-full sm:w-auto" variant="secondary" type="button" onClick={() => setIsAddItemOpen(false)}>
              Cancel
            </Button>
            <Button
              className="w-full sm:w-auto"
              variant="primary"
              type="submit"
              disabled={!rawMaterialsForReceipt.length || !receiptPurchaseUnits.length || receiptBatchesLoading}
            >
              {receiptBatchesLoading ? 'Checking previous stock…' : 'Receive Stock'}
            </Button>
          </div>
        </form>
        {false && (
        <form onSubmit={handleCreateItem} className="space-y-4">
          <Input
            label="Item Description"
            required
            value={itemForm.name}
            onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
            placeholder="Artisan Espresso Pods (Dark Roast)"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="SKU / Stock Code"
              required
              value={itemForm.code}
              onChange={(e) => setItemForm({ ...itemForm, code: e.target.value })}
              placeholder="FNB-COF-01"
            />

            <Select
              label="Category"
              value={itemForm.category}
              onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
              options={[
                { label: 'Vegetables', value: 'vegetables' },
                { label: 'Fruits', value: 'fruits' },
                { label: 'Groceries', value: 'groceries' },
                { label: 'Dairy Products', value: 'dairy_products' },
                { label: 'Meat', value: 'meat' },
                { label: 'Seafood', value: 'seafood' },
                { label: 'Food & Ingredients', value: 'food_ingredients' },
                { label: 'Beverages', value: 'beverages' },
                { label: 'Toiletries', value: 'toiletries' },
                { label: 'Housekeeping Supplies', value: 'housekeeping_supplies' },
                { label: 'Cleaning Materials', value: 'cleaning_materials' },
                { label: 'Maintenance Materials', value: 'maintenance_materials' },
                { label: 'Electrical Items', value: 'electrical_items' },
                { label: 'Stationery', value: 'stationery' },
                { label: 'Minibar Products', value: 'minibar_products' },
                { label: 'Linen & Laundry', value: 'linen_laundry' }
              ]}
            />
          </div>

          <div className="rounded-2xl border border-[#eadfce] bg-[#faf7f0]/70 p-4">
            <div className="mb-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Units for this raw material</h3>
                  <p className="mt-1 text-xs text-slate-500">Choose the stock unit and purchase packages here. Quantities are converted to the base unit.</p>
                </div>
                {canWriteModule('raw_materials') && (
                  <div className="flex flex-wrap gap-2">
                    {!units.some((unit) => unit.isActive) && (
                      <Button type="button" size="sm" variant="outline" onClick={handleCreateDefaultUnits}>Add standard units</Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setUnitForm({ name: '', symbol: '', category: 'weight', baseUnitId: '', conversionFactor: '', description: '', isActive: true });
                        setIsUnitFormOpen((open) => !open);
                      }}
                    >
                      {isUnitFormOpen ? 'Cancel new unit' : 'Create a unit'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
            {isUnitFormOpen && canWriteModule('raw_materials') && (
              <div className="mb-4 rounded-xl border border-[#eadfce] bg-white p-3">
                <p className="mb-3 text-xs font-semibold text-slate-700">Add a reusable unit</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Input label="Unit name" required maxLength={80} value={unitForm.name} onChange={(event) => setUnitForm({ ...unitForm, name: event.target.value })} placeholder="Kilogram" />
                  <Input label="Unit symbol" required maxLength={24} value={unitForm.symbol} onChange={(event) => setUnitForm({ ...unitForm, symbol: event.target.value })} placeholder="kg" />
                  <Select
                    label="Unit type"
                    required
                    value={unitForm.category}
                    onChange={(event) => setUnitForm({ ...unitForm, category: event.target.value, baseUnitId: '', conversionFactor: '' })}
                    options={['weight', 'volume', 'quantity', 'package', 'length', 'area', 'other'].map((category) => ({
                      label: category[0].toUpperCase() + category.slice(1),
                      value: category
                    }))}
                  />
                  {['weight', 'volume', 'quantity'].includes(unitForm.category) && !unitFormIsPackage && (
                    <>
                      <Select
                        label="Conversion base unit (optional)"
                        value={unitForm.baseUnitId}
                        onChange={(event) => setUnitForm({ ...unitForm, baseUnitId: event.target.value, conversionFactor: '' })}
                        options={[
                          { label: 'No global conversion', value: '' },
                          ...units.filter((unit) => unit.isActive && unit.category === unitForm.category && !isPackageUnit(unit)).map((unit) => ({
                            label: `${unit.name} (${unit.symbol})`,
                            value: unit._id
                          }))
                        ]}
                      />
                      {unitForm.baseUnitId && (
                        <Input
                          label={`Conversion factor (1 ${unitForm.symbol || 'unit'} equals how many ${getUnit(unitForm.baseUnitId)?.symbol || 'base units'}?)`}
                          type="number"
                          min="0.00000001"
                          step="any"
                          required
                          value={unitForm.conversionFactor}
                          onChange={(event) => setUnitForm({ ...unitForm, conversionFactor: event.target.value })}
                        />
                      )}
                    </>
                  )}
                  {unitFormIsPackage && (
                    <p className="sm:col-span-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                      Package-size conversions are configured per raw material. This unit will not have a global base unit or conversion factor.
                    </p>
                  )}
                  <Input label="Description (optional)" value={unitForm.description} onChange={(event) => setUnitForm({ ...unitForm, description: event.target.value })} />
                </div>
                <div className="mt-3 flex justify-end">
                  <Button type="button" size="sm" onClick={handleSaveUnit}>Save unit</Button>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Select
                label="Base unit"
                searchable
                searchPlaceholder="Search units..."
                required
                value={itemForm.baseUnitId}
                onChange={(e) => {
                  const unit = getUnit(e.target.value);
                  setItemForm({
                    ...itemForm,
                    unit: unit?.symbol || '',
                    baseUnit: unit?.symbol || '',
                    baseUnitId: e.target.value,
                    purchaseUnit: unit?.symbol || '',
                    purchaseUnitId: e.target.value,
                    purchaseConversionFactor: 1,
                    conversionFactor: 1,
                    packagingOptions: []
                  });
                }}
                options={unitChoices()}
              />
              <Select
                label="Storage location"
                required
                searchable
                value={itemForm.locationId}
                onChange={(event) => {
                  const selected = storageLocationById(event.target.value);
                  setItemForm({ ...itemForm, locationId: event.target.value, location: selected?.locationName || '' });
                }}
                options={storageLocationOptions}
              />
              <Select
                label="Purchase unit"
                searchable
                searchPlaceholder="Search units..."
                required
                value={itemForm.purchaseUnitId}
                onChange={(e) => {
                  const unit = getUnit(e.target.value);
                  const configured = itemForm.packagingOptions.find((option) => option.unitId === e.target.value)?.conversionFactor;
                  const sameUnit = e.target.value === itemForm.baseUnitId;
                  setItemForm({
                    ...itemForm,
                    purchaseUnit: unit?.symbol || '',
                    purchaseUnitId: e.target.value,
                    purchaseConversionFactor: sameUnit
                      ? 1
                      : configured || defaultConversionFactor(itemForm.baseUnit, unit?.symbol),
                    packagingOptions: itemForm.packagingOptions.filter((option) => option.unitId !== e.target.value)
                  });
                }}
                options={unitChoices()}
              />
              <Input
                label={`1 ${getUnit(itemForm.purchaseUnitId)?.name || 'purchase unit'} equals how many ${getUnit(itemForm.baseUnitId)?.name || 'base units'}?`}
                type="number"
                min="0.000000001"
                step="any"
                required={itemForm.purchaseUnitId !== itemForm.baseUnitId}
                value={itemForm.purchaseConversionFactor}
                onChange={(e) => setItemForm({ ...itemForm, purchaseConversionFactor: e.target.value })}
              />
            </div>
            {!units.some((unit) => unit.isActive) && (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                Add standard units or create a unit above to configure this raw material.
              </div>
            )}
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-slate-700">Additional packaging options</p>
                  <p className="text-[11px] text-slate-500">Configure a factor for each package to convert it into the base unit.</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!units.some((unit) => unit.isActive)}
                  onClick={() => setItemForm({
                    ...itemForm,
                    packagingOptions: [...itemForm.packagingOptions, { unitId: '', conversionFactor: '' }]
                  })}
                >Add unit</Button>
              </div>
              {itemForm.packagingOptions.map((option, index) => (
                <div key={`${index}-${option.unitId}`} className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[1fr_1fr_auto]">
                  <Select
                    label={index === 0 ? 'Package unit' : ''}
                    searchable
                    searchPlaceholder="Search existing units..."
                    required
                    value={option.unitId}
                    onChange={(e) => {
                      const unit = getUnit(e.target.value);
                      setItemForm({
                        ...itemForm,
                        packagingOptions: itemForm.packagingOptions.map((entry, row) => row === index
                          ? { ...entry, unitId: e.target.value, conversionFactor: defaultConversionFactor(itemForm.baseUnit, unit?.symbol) }
                          : entry)
                      });
                    }}
                    options={unitChoices().filter((unit) => (
                      unit.value !== itemForm.baseUnitId
                      && unit.value !== itemForm.purchaseUnitId
                      && !itemForm.packagingOptions.some((entry, row) => row !== index && entry.unitId === unit.value)
                    ))}
                  />
                  <Input
                    label={index === 0 ? `1 ${getUnit(option.unitId)?.name || 'package'} equals how many ${getUnit(itemForm.baseUnitId)?.name || 'base units'}?` : ''}
                    type="number"
                    min="0.000000001"
                    step="any"
                    required
                    value={option.conversionFactor}
                    onChange={(e) => setItemForm({
                      ...itemForm,
                      packagingOptions: itemForm.packagingOptions.map((entry, row) => row === index
                        ? { ...entry, conversionFactor: e.target.value }
                        : entry)
                    })}
                  />
                  <Button type="button" size="sm" variant="danger" onClick={() => setItemForm({
                    ...itemForm,
                    packagingOptions: itemForm.packagingOptions.filter((_, row) => row !== index)
                  })}>Remove</Button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label={`Opening stock (${itemForm.baseUnit})`}
              type="number"
              required
              min="0"
              step="any"
              value={itemForm.currentStock}
              onChange={(e) => setItemForm({ ...itemForm, currentStock: e.target.value })}
            />
            <Input
              label={`Min Threshold (${itemForm.baseUnit})`}
              type="number"
              required
              min="0"
              step="any"
              value={itemForm.minStockThreshold}
              onChange={(e) => setItemForm({ ...itemForm, minStockThreshold: e.target.value })}
            />
            <Input
              label={`Purchase price / ${itemForm.purchaseUnit} (${currencySymbol})`}
              type="number"
              step="0.01"
              required
              min="0"
              value={itemForm.purchasePrice}
              onChange={(e) => setItemForm({ ...itemForm, purchasePrice: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label={`Maximum stock level (${itemForm.baseUnit})`} type="number" min="0" step="any" value={itemForm.maxStockLevel} onChange={(e) => setItemForm({ ...itemForm, maxStockLevel: e.target.value })} />
            <Input label={`Reorder quantity (${itemForm.baseUnit})`} type="number" min="0" step="any" value={itemForm.reorderQuantity} onChange={(e) => setItemForm({ ...itemForm, reorderQuantity: e.target.value })} />
            <Input label="Verification interval override (days, optional)" type="number" min="1" max="365" step="1" value={itemForm.stockVerificationIntervalDays} onChange={(e) => setItemForm({ ...itemForm, stockVerificationIntervalDays: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={itemForm.trackExpiry} onChange={(e) => setItemForm({ ...itemForm, trackExpiry: e.target.checked })} />
              Track expiry by batch
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={itemForm.trackBatchNumber} onChange={(e) => setItemForm({ ...itemForm, trackBatchNumber: e.target.checked })} />
              Require batch number
            </label>
          </div>
          {Number(itemForm.currentStock) > 0 && (itemForm.trackExpiry || itemForm.trackBatchNumber) && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {itemForm.trackBatchNumber && <Input label="Opening batch number" required value={itemForm.openingBatchNumber} onChange={(e) => setItemForm({ ...itemForm, openingBatchNumber: e.target.value })} />}
              {itemForm.trackExpiry && <Input label="Opening batch expiry" type="date" required value={itemForm.openingExpiryDate} onChange={(e) => setItemForm({ ...itemForm, openingExpiryDate: e.target.value })} />}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 pt-3 sm:flex-row sm:justify-end">
            <Button className="w-full sm:w-auto" variant="secondary" type="button" onClick={() => setIsAddItemOpen(false)}>
              Cancel
            </Button>
            <Button className="w-full sm:w-auto" variant="primary" type="submit">
              Save Item
            </Button>
          </div>
        </form>
        )}
      </Modal>

      {/* Add Vendor Modal */}
      <Modal
        isOpen={isAddVendorOpen}
        onClose={() => setIsAddVendorOpen(false)}
        title="Register Vendor"
      >
        <form onSubmit={handleCreateVendor} className="space-y-4">
          <Input
            label="Company Name"
            required
            value={vendorForm.name}
            onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
            placeholder="Coastal Linen Logistics LLC"
          />
          <Input
            label="Contact Person"
            value={vendorForm.contactPerson}
            onChange={(e) => setVendorForm({ ...vendorForm, contactPerson: e.target.value })}
            placeholder="John Rogers"
          />
          <PhoneInput
            label="Phone"
            required
            value={vendorForm.phone}
            defaultCountry={hotel?.country}
            onChange={(phone) => setVendorForm({ ...vendorForm, phone })}
          />
          <Input label="Email" type="email" value={vendorForm.email} onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })} />
          <Input label="GST / Tax number" value={vendorForm.taxNumber} onChange={(e) => setVendorForm({ ...vendorForm, taxNumber: e.target.value })} />
          <Input label="Address" value={vendorForm.address} onChange={(e) => setVendorForm({ ...vendorForm, address: e.target.value })} />
          <Input label="Payment terms" value={vendorForm.paymentTerms} onChange={(e) => setVendorForm({ ...vendorForm, paymentTerms: e.target.value })} placeholder="Net 30" />
          <div className="flex flex-col-reverse gap-3 pt-3 sm:flex-row sm:justify-end">
            <Button className="w-full sm:w-auto" variant="secondary" type="button" onClick={() => setIsAddVendorOpen(false)}>
              Cancel
            </Button>
            <Button className="w-full sm:w-auto" variant="primary" type="submit">
              Register Vendor
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isPurchaseOrderOpen} onClose={() => setIsPurchaseOrderOpen(false)} title="New Purchase Order" subtitle="Submit a vendor order for administrator approval">
        <form onSubmit={handleCreatePurchaseOrder} className="space-y-4">
          <Select
            label="Vendor"
            required
            value={poForm.vendorId}
            onChange={(e) => setPoForm({ ...poForm, vendorId: e.target.value })}
            options={[{ label: 'Choose vendor', value: '' }, ...vendors.map((vendor) => ({ label: vendor.name, value: vendor._id }))]}
          />
          <Input label="Department" value={poForm.department} onChange={(e) => setPoForm({ ...poForm, department: e.target.value })} placeholder="Kitchen" />
          <Input label="Expected delivery" type="date" value={poForm.expectedDeliveryDate} onChange={(e) => setPoForm({ ...poForm, expectedDeliveryDate: e.target.value })} />
          <div className="space-y-3">
            {poForm.items.map((line, index) => (
              <div key={index} className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[2fr_0.8fr_1fr_1fr_auto]">
                <Select
                  label={index === 0 ? 'Item' : ''}
                  searchable
                  searchPlaceholder="Search inventory items..."
                  required
                  value={line.itemId}
                  onChange={(e) => {
                    const selected = items.find((item) => item._id === e.target.value);
                    const configured = defaultSupportedUnitForItem(selected);
                    const configuredUnitId = typeof configured?.unitId === 'object'
                      ? configured.unitId?._id
                      : configured?.unitId;
                    const purchaseUnit = configured?.unitSymbolSnapshot
                      || (typeof configured?.unitId === 'object' ? configured.unitId.symbol : null)
                      || defaultPurchaseUnitForItem(selected);
                    setPoForm({ ...poForm, items: poForm.items.map((entry, row) => row === index ? {
                      ...entry,
                      itemId: e.target.value,
                      unit: purchaseUnit,
                      unitId: configuredUnitId || unitIdForItemSymbol(selected, purchaseUnit, units),
                      purchasePackageId: null,
                      unitCost: selected
                        ? selected.purchasePrice ?? Number(selected.unitCost || 0) * Number(configured?.conversionFactorToBase || selected.purchaseConversionFactor || 1)
                        : entry.unitCost
                    } : entry) });
                  }}
                  options={[{ label: 'Choose item', value: '' }, ...items.map((item) => ({ label: `${item.name} (${item.baseUnit || item.unit})`, value: item._id }))]}
                />
                <Input label={index === 0 ? 'Quantity' : ''} type="number" min="0.00000001" step="any" required value={line.quantity} onChange={(e) => setPoForm({ ...poForm, items: poForm.items.map((entry, row) => row === index ? { ...entry, quantity: e.target.value } : entry) })} />
                <Select
                  label={index === 0 ? 'Purchase unit' : ''}
                  searchable
                  searchPlaceholder="Search supported units..."
                  required
                  value={line.purchasePackageId ? `package:${line.purchasePackageId}` : line.unitId ? `unit:${line.unitId}` : line.unit}
                  onChange={(e) => {
                    const selected = items.find((item) => item._id === line.itemId);
                    const choice = e.target.value;
                    const [choiceType, choiceId] = choice.includes(':') ? choice.split(':', 2) : ['', ''];
                    const configured = selected?.supportedUnits?.find((entry) => (
                      choiceType === 'unit'
                      && String(typeof entry.unitId === 'object' ? entry.unitId?._id : entry.unitId) === choiceId
                    ));
                    const unit = configured?.unitSymbolSnapshot || (typeof configured?.unitId === 'object' ? configured.unitId.symbol : null) || choice;
                    const factor = Number(configured?.conversionFactorToBase) || conversionFactorForItem(selected, unit);
                    const configuredUnitId = typeof configured?.unitId === 'object' ? configured.unitId?._id : configured?.unitId;
                    setPoForm({ ...poForm, items: poForm.items.map((entry, row) => row === index
                      ? {
                        ...entry,
                        unit,
                        unitId: configuredUnitId || unitIdForItemSymbol(selected, unit, units),
                        purchasePackageId: null,
                        unitCost: Number(selected?.unitCost || 0) * Number(factor || 1)
                      }
                      : entry) });
                  }}
                  options={purchaseUnitChoicesForItem(items.find((item) => item._id === line.itemId))}
                />
                <Input label={index === 0 ? 'Price / unit' : ''} type="number" min="0" step="0.01" required value={line.unitCost} onChange={(e) => setPoForm({ ...poForm, items: poForm.items.map((entry, row) => row === index ? { ...entry, unitCost: e.target.value } : entry) })} />
                {poForm.items.length > 1 && <Button type="button" size="sm" variant="danger" onClick={() => setPoForm({ ...poForm, items: poForm.items.filter((_, row) => row !== index) })}>Remove</Button>}
              </div>
            ))}
            <Button type="button" size="sm" variant="outline" onClick={() => setPoForm({ ...poForm, items: [...poForm.items, { itemId: '', quantity: 1, unit: '', unitCost: 0 }] })}>Add another item</Button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Tax amount" type="number" min="0" step="0.01" value={poForm.taxAmount} onChange={(e) => setPoForm({ ...poForm, taxAmount: e.target.value })} />
            <Input label="Discount amount" type="number" min="0" step="0.01" value={poForm.discountAmount} onChange={(e) => setPoForm({ ...poForm, discountAmount: e.target.value })} />
          </div>
          <Input label="Notes" value={poForm.notes} onChange={(e) => setPoForm({ ...poForm, notes: e.target.value })} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setIsPurchaseOrderOpen(false)}>Cancel</Button>
            <Button type="submit" icon={PackageCheck}>Submit for approval</Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(selectedAutomaticPO)}
        onClose={() => setSelectedAutomaticPO(null)}
        title="Review automatic reorder"
        subtitle="Confirm the supplier and quantity before the order is submitted."
      >
        <form onSubmit={handleReviewAutomaticPO} className="space-y-4">
          <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
            {selectedAutomaticPO?.items?.[0]?.itemName}
            {' · '}{selectedAutomaticPO?.items?.[0]?.unit || ''}
          </div>
          <Select
            label="Supplier"
            required
            value={automaticPOReviewForm.vendorId}
            onChange={(event) => setAutomaticPOReviewForm((current) => ({ ...current, vendorId: event.target.value }))}
            options={[
              { label: 'Choose supplier', value: '' },
              ...vendors.filter((vendor) => vendor.status === 'active').map((vendor) => ({
                label: vendor.name,
                value: vendor._id
              }))
            ]}
          />
          <Input
            label={`Order quantity (${selectedAutomaticPO?.items?.[0]?.unit || 'purchase unit'})`}
            type="number"
            min="0.00000001"
            step="any"
            required
            value={automaticPOReviewForm.quantity}
            onChange={(event) => setAutomaticPOReviewForm((current) => ({ ...current, quantity: event.target.value }))}
          />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setSelectedAutomaticPO(null)}>Cancel</Button>
            <Button type="submit" variant="outline">Save review</Button>
            <Button type="button" variant="success" onClick={(event) => handleReviewAutomaticPO(event, true)}>
              Approve &amp; submit
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isReceivingOpen} onClose={() => setIsReceivingOpen(false)} title={`Receive ${selectedPO?.poNumber || 'Purchase Order'}`} subtitle="Only accepted goods will update on-hand stock">
        <form onSubmit={handleReceivePO} className="space-y-4">
          <div className="space-y-3">
            {receivingLines.map((line, index) => (
              <div key={`${line.itemId}-${index}`} className="rounded-xl border border-slate-200 p-3">
                <p className="mb-2 text-sm font-bold">{line.name} <span className="text-xs font-normal text-slate-500">({line.remaining} {line.unit} remaining)</span></p>
                <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                  {['receivedQuantity', 'acceptedQuantity', 'damagedQuantity', 'rejectedQuantity'].map((field) => (
                    <Input
                      key={field}
                      label={field.replace('Quantity', '')}
                      type="number"
                      min="0"
                      max={line.remaining}
                      step="any"
                      value={line[field]}
                      onChange={(e) => setReceivingLines(receivingLines.map((entry, row) => row === index ? { ...entry, [field]: e.target.value } : entry))}
                    />
                  ))}
                  <Input label="Batch number" value={line.batchNumber} onChange={(e) => setReceivingLines(receivingLines.map((entry, row) => row === index ? { ...entry, batchNumber: e.target.value } : entry))} />
                  <Input label="Expiry date" type="date" value={line.expiryDate} onChange={(e) => setReceivingLines(receivingLines.map((entry, row) => row === index ? { ...entry, expiryDate: e.target.value } : entry))} />
                </div>
              </div>
            ))}
          </div>
          <Input label="Purchase / invoice date" type="date" value={purchaseDate} onChange={(event) => setPurchaseDate(event.target.value)} required />
          <Input label="Invoice number" name="invoiceNumber" />
          <Input label="Invoice attachment URL" name="invoiceAttachment" placeholder="https://..." />
          <Select
            label="Receiving location"
            name="location"
            searchable
            required
            value={receivingLocationId}
            onChange={(event) => {
              const selected = storageLocationById(event.target.value);
              setReceivingLocationId(event.target.value);
              setReceivingLocation(selected?.locationName || '');
            }}
            options={storageLocationOptions}
          />
          <Input label="Receiving notes" name="notes" />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setIsReceivingOpen(false)}>Cancel</Button>
            <Button type="submit" icon={PackageCheck}>Confirm goods receipt</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isDepartmentRequestOpen} onClose={() => setIsDepartmentRequestOpen(false)} title="Request Department Stock">
        <form onSubmit={handleCreateDepartmentRequest} className="space-y-4">
          <Select label="Department" value={departmentForm.department} onChange={(e) => setDepartmentForm({ ...departmentForm, department: e.target.value })} options={['Housekeeping', 'Maintenance', 'Restaurant', 'Kitchen', 'Minibar'].map((name) => ({ label: name, value: name }))} />
          {departmentForm.lines.map((line, index) => (
            <div key={index} className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[1.5fr_0.7fr_1fr_auto]">
              <Select label={index === 0 ? 'Item' : ''} searchable searchPlaceholder="Search inventory items..." required value={line.itemId} onChange={(e) => {
                const item = items.find((entry) => entry._id === e.target.value);
                setDepartmentForm({ ...departmentForm, lines: departmentForm.lines.map((entry, row) => row === index
                  ? { ...entry, itemId: e.target.value, unit: item?.baseUnit || item?.unit || '' }
                  : entry) });
              }} options={[{ label: 'Choose item', value: '' }, ...items.map((item) => ({ label: `${item.name} (${item.baseUnit || item.unit})`, value: item._id }))]} />
              <Input label={index === 0 ? 'Quantity' : ''} type="number" min="0.00000001" step="any" required value={line.quantity} onChange={(e) => setDepartmentForm({ ...departmentForm, lines: departmentForm.lines.map((entry, row) => row === index ? { ...entry, quantity: e.target.value } : entry) })} />
              <Select label={index === 0 ? 'Unit' : ''} searchable searchPlaceholder="Search supported units..." required value={line.unit} onChange={(e) => setDepartmentForm({ ...departmentForm, lines: departmentForm.lines.map((entry, row) => row === index ? { ...entry, unit: e.target.value } : entry) })} options={unitChoicesForItem(items.find((item) => item._id === line.itemId), units)} />
              {departmentForm.lines.length > 1 && <Button type="button" size="sm" variant="danger" onClick={() => setDepartmentForm({ ...departmentForm, lines: departmentForm.lines.filter((_, row) => row !== index) })}>Remove</Button>}
            </div>
          ))}
          <Button type="button" size="sm" variant="outline" onClick={() => setDepartmentForm({ ...departmentForm, lines: [...departmentForm.lines, { itemId: '', quantity: 1, unit: '' }] })}>Add item</Button>
          <Input label="Request notes" value={departmentForm.notes} onChange={(e) => setDepartmentForm({ ...departmentForm, notes: e.target.value })} />
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setIsDepartmentRequestOpen(false)}>Cancel</Button><Button type="submit">Submit request</Button></div>
        </form>
      </Modal>

      <Modal
        isOpen={isRecipeOpen}
        onClose={() => setIsRecipeOpen(false)}
        title={editingRecipe ? 'Edit Recipe' : 'Create Recipe'}
        subtitle="Saving creates a new version and keeps historical order costs unchanged"
        maxWidth="max-w-6xl"
        maxHeight="max-h-[100dvh] sm:max-h-[calc(100dvh-2rem)]"
        footer={(
          <>
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={() => {
                setIsRecipeOpen(false);
                setEditingRecipe(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="inventory-recipe-form"
              className="w-full sm:w-auto"
            >
              {editingRecipe ? 'Save new version' : 'Create recipe'}
            </Button>
          </>
        )}
      >
        <form id="inventory-recipe-form" onSubmit={handleSaveRecipe} className="space-y-6">
          <section className="rounded-2xl border border-orvelle-border/70 bg-gradient-to-br from-white to-orvelle-ivory/50 p-4 shadow-sm sm:p-5">
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-orvelle-primary">Recipe details</h4>
              <p className="mt-1 text-xs text-orvelle-muted">Choose the menu item, then define the serving and production workflow.</p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Select label="Menu item" searchable searchPlaceholder="Search menu items..." required value={recipeForm.menuItemId} onChange={(e) => {
                const menuItem = menuItems.find((entry) => entry._id === e.target.value);
                setRecipeForm({
                  ...recipeForm,
                  menuItemId: e.target.value,
                  recipeName: recipeForm.recipeName || menuItem?.name || ''
                });
              }} options={[{ label: 'Choose menu item', value: '' }, ...menuItems.map((menuItem) => ({ label: menuItem.name, value: menuItem._id }))]} />
              <Input label="Recipe name" required value={recipeForm.recipeName} onChange={(event) => setRecipeForm({ ...recipeForm, recipeName: event.target.value })} />
              <label className="block text-sm font-medium text-slate-700 md:col-span-2">
                Description
                <textarea
                  value={recipeForm.description}
                  onChange={(event) => setRecipeForm({ ...recipeForm, description: event.target.value })}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-orvelle-border bg-white px-3 py-2.5 text-sm shadow-sm transition focus:border-orvelle-champagne focus:outline-none focus:ring-2 focus:ring-orvelle-champagne/20"
                />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-orvelle-border/70 bg-white p-4 shadow-sm sm:p-5">
            <h4 className="mb-4 text-sm font-semibold text-orvelle-primary">Serving & production</h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <Input label="Serving size" required value={recipeForm.servingSize} onChange={(event) => setRecipeForm({ ...recipeForm, servingSize: event.target.value })} />
              <Input label="Preparation time (minutes)" type="number" min="0" step="1" value={recipeForm.preparationTimeMinutes} onChange={(event) => setRecipeForm({ ...recipeForm, preparationTimeMinutes: event.target.value })} />
              <Select
                label="Production workflow"
                value={recipeForm.productionMode}
                onChange={(event) => setRecipeForm({ ...recipeForm, productionMode: event.target.value })}
                options={[
                  { label: 'Made to order (existing workflow)', value: 'made_to_order' },
                  { label: 'Bulk production with prepared portions', value: 'batch_production' }
                ]}
              />
              <Select
                label="Ingredient issue location"
                required
                searchable
                value={recipeForm.locationId}
                onChange={(event) => setRecipeForm({ ...recipeForm, locationId: event.target.value })}
                options={storageLocationOptions}
                helperText="Ingredients for this recipe are deducted from this location."
              />
              <Input
                label="Expected recipe yield (portions)"
                type="number"
                min="0.00000001"
                step="any"
                value={recipeForm.expectedProductionYield}
                onChange={(event) => setRecipeForm({ ...recipeForm, expectedProductionYield: event.target.value })}
              />
              <Input
                label="Expected preparation loss (%)"
                type="number"
                min="0"
                max="100"
                step="any"
                value={recipeForm.expectedPreparationLossPercent}
                onChange={(event) => setRecipeForm({ ...recipeForm, expectedPreparationLossPercent: event.target.value })}
              />
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-orvelle-border/70 bg-orvelle-ivory/25 p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="text-sm font-semibold text-orvelle-primary">Ingredients</h4>
                <p className="mt-1 text-xs text-orvelle-muted">Set quantities per serving and any optional substitutes.</p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => setRecipeForm({ ...recipeForm, ingredients: [...recipeForm.ingredients, { itemId: '', quantity: 1, unit: '', optional: false, substituteItemId: '', substituteQuantity: '', substituteUnit: '' }] })}
              >
                + Add ingredient
              </Button>
            </div>
            <div className="space-y-3">
              {recipeForm.ingredients.map((ingredient, index) => (
                <div key={index} className="rounded-xl border border-orvelle-border/80 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5">
                {/* Header with ingredient number and remove button */}
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-orvelle-muted">Ingredient {index + 1}</span>
                  {recipeForm.ingredients.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setRecipeForm({ ...recipeForm, ingredients: recipeForm.ingredients.filter((_, row) => row !== index) })}
                      className="rounded-md px-2 py-0.5 text-xs text-rose-500 transition-colors hover:bg-rose-50 hover:text-rose-700"
                    >
                      Remove
                    </button>
                  )}
                </div>

                {/* Main ingredient fields */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto]">
                  <Select label="Ingredient" searchable searchPlaceholder="Search inventory items..." required value={ingredient.itemId} onChange={(e) => {
                    const item = items.find((entry) => entry._id === e.target.value);
                    setRecipeForm({ ...recipeForm, ingredients: recipeForm.ingredients.map((entry, row) => row === index ? { ...entry, itemId: e.target.value, unit: item?.baseUnit || item?.unit || '' } : entry) });
                  }} options={[{ label: 'Choose ingredient', value: '' }, ...items.map((item) => ({ label: `${item.name} (${item.baseUnit || item.unit})`, value: item._id }))]} />
                  <div className="w-full sm:w-24">
                    <Input label="Quantity" type="number" min="0.00000001" step="any" required value={ingredient.quantity} onChange={(e) => setRecipeForm({ ...recipeForm, ingredients: recipeForm.ingredients.map((entry, row) => row === index ? { ...entry, quantity: e.target.value } : entry) })} />
                  </div>
                  <div className="w-full sm:w-36">
                    <Select label="Unit" searchable searchPlaceholder="Search supported units..." required value={ingredient.unit} onChange={(e) => setRecipeForm({ ...recipeForm, ingredients: recipeForm.ingredients.map((entry, row) => row === index ? { ...entry, unit: e.target.value } : entry) })} options={unitChoicesForItem(items.find((item) => item._id === ingredient.itemId), units)} />
                  </div>
                </div>

                {/* Substitute section */}
                <div className="mt-3 rounded-lg border border-dashed border-slate-200 bg-white/60 p-3">
                  <div className="mb-2 flex items-center gap-3">
                    <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600">
                      <input
                        type="checkbox"
                        checked={ingredient.optional}
                        onChange={(e) => setRecipeForm({ ...recipeForm, ingredients: recipeForm.ingredients.map((entry, row) => row === index ? { ...entry, optional: e.target.checked } : entry) })}
                        className="rounded border-slate-300 text-orvelle-champagne focus:ring-orvelle-champagne/30"
                      />
                      Optional ingredient
                    </label>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto]">
                    <Select label="Allowed substitute" searchable searchPlaceholder="Search inventory items..." value={ingredient.substituteItemId} onChange={(e) => {
                      const item = items.find((entry) => entry._id === e.target.value);
                      setRecipeForm({ ...recipeForm, ingredients: recipeForm.ingredients.map((entry, row) => row === index ? { ...entry, substituteItemId: e.target.value, substituteUnit: item?.baseUnit || item?.unit || '' } : entry) });
                    }} options={[{ label: 'No substitute', value: '' }, ...items.filter((item) => item._id !== ingredient.itemId).map((item) => ({ label: `${item.name} (${item.baseUnit || item.unit})`, value: item._id }))]} />
                    <div className="w-full sm:w-24">
                      <Input label="Sub. qty" type="number" min="0.00000001" step="any" value={ingredient.substituteQuantity} onChange={(e) => setRecipeForm({ ...recipeForm, ingredients: recipeForm.ingredients.map((entry, row) => row === index ? { ...entry, substituteQuantity: e.target.value } : entry) })} />
                    </div>
                    <div className="w-full sm:w-36">
                      <Select label="Sub. unit" searchable searchPlaceholder="Search supported units..." value={ingredient.substituteUnit} onChange={(e) => setRecipeForm({ ...recipeForm, ingredients: recipeForm.ingredients.map((entry, row) => row === index ? { ...entry, substituteUnit: e.target.value } : entry) })} options={unitChoicesForItem(items.find((item) => item._id === ingredient.substituteItemId), units)} />
                    </div>
                  </div>
                </div>
                </div>
              ))}
            </div>
          </section>
        </form>
      </Modal>

      <Modal isOpen={isTransferOpen} onClose={() => setIsTransferOpen(false)} title="Transfer Stock" subtitle="The source and destination ledgers update together">
        <form onSubmit={handleTransferStock} className="space-y-4">
          <Select label="Item" searchable searchPlaceholder="Search inventory items..." required value={transferForm.itemId} onChange={(e) => {
            const item = items.find((entry) => entry._id === e.target.value);
            setTransferForm({ ...transferForm, itemId: e.target.value, unit: item?.baseUnit || item?.unit || '' });
          }} options={[{ label: 'Choose item', value: '' }, ...items.map((item) => ({ label: `${item.name} (${formatInventoryQuantity(item.currentStock, item)})`, value: item._id }))]} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Quantity" type="number" min="0.00000001" step="any" required value={transferForm.quantity} onChange={(e) => setTransferForm({ ...transferForm, quantity: e.target.value })} />
            <Select label="Unit" searchable searchPlaceholder="Search supported units..." required value={transferForm.unit} onChange={(e) => setTransferForm({ ...transferForm, unit: e.target.value })} options={unitChoicesForItem(items.find((item) => item._id === transferForm.itemId), units)} />
          </div>
          <Select
            label="Transfer type"
            value={transferForm.transferMode}
            onChange={(e) => setTransferForm({ ...transferForm, transferMode: e.target.value })}
            options={[
              { label: 'Between locations', value: 'location' },
              { label: 'Between departments', value: 'department' }
            ]}
          />
          {transferForm.transferMode === 'department' ? (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {['fromDepartment', 'toDepartment'].map((field) => (
                  <Select
                    key={field}
                    label={field === 'fromDepartment' ? 'From department' : 'To department'}
                    value={transferForm[field]}
                    onChange={(e) => setTransferForm({ ...transferForm, [field]: e.target.value })}
                    options={['Kitchen', 'Restaurant', 'Housekeeping', 'Maintenance', 'Minibar'].map((name) => ({ label: name, value: name }))}
                  />
                ))}
              </div>
              <p className="text-xs text-slate-500">
                Department transfers use the matching department stock locations and preserve batch details.
              </p>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {['fromLocation', 'toLocation'].map((field) => (
                  <Select
                    key={field}
                    label={field === 'fromLocation' ? 'From location' : 'To location'}
                    required
                    searchable
                    value={field === 'fromLocation' ? transferForm.fromLocationId : transferForm.toLocationId}
                    onChange={(event) => {
                      const selected = storageLocationById(event.target.value);
                      setTransferForm({
                        ...transferForm,
                        [field === 'fromLocation' ? 'fromLocationId' : 'toLocationId']: event.target.value,
                        [field]: selected?.locationName || ''
                      });
                    }}
                    options={storageLocationOptions}
                  />
                ))}
              </div>
              <Input label="Department" value={transferForm.department} onChange={(e) => setTransferForm({ ...transferForm, department: e.target.value })} />
            </>
          )}
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setIsTransferOpen(false)}>Cancel</Button><Button type="submit">Confirm transfer</Button></div>
        </form>
      </Modal>

      <Modal isOpen={isMinibarAssignOpen} onClose={() => setIsMinibarAssignOpen(false)} title={`Replenish Room ${minibarData?.room?.roomNumber || ''}`}>
        <form onSubmit={handleMinibarAssignment} className="space-y-4">
          <Select label="Product" searchable searchPlaceholder="Search inventory items..." required value={minibarAssignForm.itemId} onChange={(e) => {
            const item = items.find((entry) => entry._id === e.target.value);
            setMinibarAssignForm({ ...minibarAssignForm, itemId: e.target.value, unit: item?.baseUnit || item?.unit || '' });
          }} options={[{ label: 'Choose product', value: '' }, ...items.map((item) => ({ label: `${item.name} (${formatInventoryQuantity(item.currentStock, item)})`, value: item._id }))]} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Quantity" type="number" min="0.00000001" step="any" required value={minibarAssignForm.quantity} onChange={(e) => setMinibarAssignForm({ ...minibarAssignForm, quantity: e.target.value })} />
            <Select label="Unit" searchable searchPlaceholder="Search supported units..." required value={minibarAssignForm.unit} onChange={(e) => setMinibarAssignForm({ ...minibarAssignForm, unit: e.target.value })} options={unitChoicesForItem(items.find((item) => item._id === minibarAssignForm.itemId), units)} />
          </div>
          <Select
            label="Issue from location"
            searchable
            value={minibarAssignForm.fromLocationId}
            onChange={(event) => {
              const selected = storageLocationById(event.target.value);
              setMinibarAssignForm({
                ...minibarAssignForm,
                fromLocationId: event.target.value,
                fromLocation: selected?.locationName || ''
              });
            }}
            options={storageLocationOptions}
          />
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setIsMinibarAssignOpen(false)}>Cancel</Button><Button type="submit">Assign stock</Button></div>
        </form>
      </Modal>

      <Modal isOpen={isAdjustmentOpen} onClose={() => setIsAdjustmentOpen(false)} title="Report Stock Adjustment" subtitle="This adjustment is recorded immediately and updates inventory">
        <form onSubmit={handleCreateAdjustment} className="space-y-4">
          <Select label="Item" searchable searchPlaceholder="Search inventory items..." required value={adjustmentForm.itemId} onChange={(e) => {
            const item = items.find((entry) => entry._id === e.target.value);
            setAdjustmentForm({ ...adjustmentForm, itemId: e.target.value, unit: item?.baseUnit || item?.unit || '' });
          }} options={[{ label: 'Choose item', value: '' }, ...items.map((item) => ({ label: `${item.name} (${formatInventoryQuantity(item.currentStock, item)})`, value: item._id }))]} />
          <Select label="Reason" value={adjustmentForm.reason} onChange={(e) => setAdjustmentForm({ ...adjustmentForm, reason: e.target.value })} options={[
            { label: 'Expired products', value: 'expired' },
            { label: 'Damaged products', value: 'damaged' },
            { label: 'Food wastage', value: 'food_wastage' },
            { label: 'Spillage', value: 'spillage' },
            { label: 'Missing stock', value: 'missing' },
            { label: 'Physical stock mismatch (enter counted total)', value: 'physical_mismatch' },
            { label: 'Internal usage', value: 'internal_usage' }
          ]} />
          <Select
            label="Stock location"
            required
            searchable
            value={adjustmentForm.locationId}
            onChange={(event) => {
              const selected = storageLocationById(event.target.value);
              setAdjustmentForm({
                ...adjustmentForm,
                locationId: event.target.value,
                location: selected?.locationName || ''
              });
            }}
            options={storageLocationOptions}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label={adjustmentForm.reason === 'physical_mismatch' ? 'Physical count (new total)' : 'Quantity affected'} type="number" min="0.00000001" step="any" required value={adjustmentForm.quantity} onChange={(e) => setAdjustmentForm({ ...adjustmentForm, quantity: e.target.value })} />
            <Select label="Unit" searchable searchPlaceholder="Search supported units..." required value={adjustmentForm.unit} onChange={(e) => setAdjustmentForm({ ...adjustmentForm, unit: e.target.value })} options={unitChoicesForItem(items.find((item) => item._id === adjustmentForm.itemId), units)} />
          </div>
          <Select
            label="Department"
            required
            value={adjustmentForm.department}
            onChange={(event) => setAdjustmentForm({ ...adjustmentForm, department: event.target.value })}
            options={[
              { label: 'Choose department', value: '' },
              ...['Kitchen', 'Restaurant', 'Production', 'Housekeeping', 'Maintenance', 'Minibar']
                .map((department) => ({ label: department, value: department }))
            ]}
          />
          <Input label="Remarks" value={adjustmentForm.remarks} onChange={(e) => setAdjustmentForm({ ...adjustmentForm, remarks: e.target.value })} />
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setIsAdjustmentOpen(false)}>Cancel</Button><Button type="submit">Record adjustment</Button></div>
        </form>
      </Modal>

      <Modal
        isOpen={preparedFoodCountOpen}
        onClose={() => !preparedFoodCountSaving && setPreparedFoodCountOpen(false)}
        title={preparedFoodCountMode === 'complimentary' ? 'Record complimentary use' : 'Record unrecorded use'}
        subtitle={preparedFoodCountMode === 'complimentary'
          ? 'Record complimentary portions or raw-material use. Inventory is deducted at recorded cost and shown in complimentary reporting.'
          : 'Record usage that was not entered earlier. Choose a prepared batch, made-to-order menu item, or raw material.'}
        maxWidth="max-w-2xl"
        footer={
          <>
            <Button type="button" variant="outline" disabled={preparedFoodCountSaving} onClick={() => setPreparedFoodCountOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="prepared-food-count-form"
              disabled={
                preparedFoodCountSaving
                || !preparedFoodCountForm.batchId
                || preparedFoodCountDifference <= 0
                || preparedFoodCountExceedsAvailable
              }
            >
              {preparedFoodCountSaving ? 'Recording…' : 'Record usage'}
            </Button>
          </>
        }
      >
        <form id="prepared-food-count-form" className="space-y-4" onSubmit={submitPreparedFoodCount}>
          <Select
          label="Usage source"
            required
          value={preparedFoodCountTargetType}
          onChange={(event) => {
            setPreparedFoodCountTargetType(event.target.value);
            setPreparedFoodCountForm((current) => ({ ...current, batchId: '', actualQuantity: '' }));
            setPreparedFoodCountError('');
          }}
          options={[
            { label: 'Prepared food batch', value: 'batch' },
            { label: 'Made-to-order menu item', value: 'menu_item' },
            { label: 'Raw material', value: 'raw_material' }
          ]}
          />
          <Select
          label={preparedFoodCountTargetType === 'batch'
            ? 'Prepared-food batch'
            : preparedFoodCountTargetType === 'menu_item'
              ? 'Made-to-order menu item'
              : 'Raw material'}
          required
          searchable
          placeholder={preparedFoodBatchesLoading ? 'Loading inventory…' : 'Choose an item'}
          value={preparedFoodCountForm.batchId}
          onChange={(event) => {
            setPreparedFoodCountForm((current) => ({
              ...current,
              batchId: event.target.value,
              actualQuantity: ''
            }));
            setPreparedFoodCountError('');
          }}
          options={preparedFoodCountTargetType === 'batch'
            ? preparedFoodBatches
              .filter((batch) => Number(batch.availableQuantity) > 0)
              .map((batch) => ({
                value: batch._id,
                label: `${batch.menuItemName || 'Prepared food'} · ${batch.batchNumber} · ${Number(batch.availableQuantity).toLocaleString()} portions`
              }))
            : preparedFoodCountTargetType === 'menu_item'
              ? recipes
                .filter((recipe) => recipe.isActive !== false && recipe.productionMode === 'made_to_order')
                .map((recipe) => ({
                  value: recipe._id,
                  label: `${recipe.menuItemId?.name || recipe.recipeName || 'Menu item'} · Made to order`
                }))
              : items
                .filter((item) => item.inventoryType === 'raw_material' && item.isActive !== false)
                .map((item) => ({
                  value: item._id,
                  label: `${item.name} · ${item.baseUnit || item.unit || 'unit'}`
                }))}
          />
          {preparedFoodCountTargetType === 'raw_material' && selectedDirectRawMaterial && (
            <Select
              label="Stock location"
              required
              value={preparedFoodCountForm.location}
              onChange={(event) => setPreparedFoodCountForm((current) => ({
                ...current,
                location: event.target.value
              }))}
              options={storageLocations.filter((entry) => entry.isActive !== false).length
                ? storageLocations
                  .filter((entry) => entry.isActive !== false)
                  .map((entry) => ({
                    value: entry.locationName,
                    label: entry.locationName
                  }))
                : [{ value: 'Main Store', label: 'Main Store' }]}
            />
          )}
          {selectedPreparedFoodBatch && (
            <div className="grid gap-3 rounded-xl border border-[#eee5d8] bg-[#fdfbf8] p-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Batch production</p>
                <p className="mt-1 text-xl font-black text-slate-900 tabular-nums">
                  {Number(selectedPreparedFoodBatch.acceptedQuantity || 0).toLocaleString(undefined, { maximumFractionDigits: 3 })} portions
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Already recorded as used</p>
                <p className="mt-1 text-xl font-black text-slate-900 tabular-nums">
                  {preparedFoodRecordedUsed.toLocaleString(undefined, { maximumFractionDigits: 3 })} portions
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cost per portion</p>
                <p className="mt-1 text-lg font-bold text-slate-900 tabular-nums">
                  {!canManageInventory
                    ? 'Admin only'
                    : selectedPreparedFoodBatch.costPerPortion != null
                      ? formatCurrency(selectedPreparedFoodBatch.costPerPortion)
                      : 'Not available'}
                </p>
              </div>
            </div>
          )}
          {selectedDirectTarget && (
            <div className="grid gap-3 rounded-xl border border-[#eee5d8] bg-[#fdfbf8] p-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {preparedFoodCountTargetType === 'menu_item' ? 'Menu item' : 'Raw material'}
                </p>
                <p className="mt-1 text-lg font-bold text-slate-900">
                  {preparedFoodCountTargetType === 'menu_item'
                    ? selectedDirectMenuRecipe.menuItemId?.name || selectedDirectMenuRecipe.recipeName
                    : selectedDirectRawMaterial.name}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {preparedFoodCountTargetType === 'menu_item' ? 'Recipe cost / serving' : `Current unit cost / ${directUsageUnit}`}
                </p>
                <p className="mt-1 text-lg font-bold text-slate-900">
                  {canManageInventory && selectedDirectUnitCost > 0
                    ? formatCurrency(selectedDirectUnitCost)
                    : 'Cost calculated from stock'}
                </p>
              </div>
              {preparedFoodCountTargetType === 'menu_item' && (
                <p className="text-xs text-slate-500 sm:col-span-2">
                  Ingredient usage will be deducted using the active made-to-order recipe. Batch-production recipes should be recorded against a prepared batch.
                </p>
              )}
            </div>
          )}
          <Input
            label={preparedFoodCountTargetType === 'raw_material'
              ? preparedFoodCountMode === 'complimentary' ? 'Complimentary raw-material quantity' : 'Additional raw-material quantity used'
              : preparedFoodCountMode === 'complimentary' ? 'Complimentary portions' : 'Additional portions used'}
            type="number"
            min="0"
            max={selectedPreparedFoodBatch ? Number(selectedPreparedFoodBatch.availableQuantity || 0) : undefined}
            step="0.001"
            required
            disabled={!selectedPreparedFoodBatch && !selectedDirectTarget}
            value={preparedFoodCountForm.actualQuantity}
            onChange={(event) => setPreparedFoodCountForm((current) => ({ ...current, actualQuantity: event.target.value }))}
            helperText={preparedFoodCountTargetType === 'batch'
              ? preparedFoodCountMode === 'complimentary'
                ? `Enter complimentary portions to record. Up to ${Number(selectedPreparedFoodBatch?.availableQuantity || 0)} portions remain available.`
                : `Enter only extra portions not recorded yet. Entering 1 adds one to the ${preparedFoodRecordedUsed} already recorded. Up to ${Number(selectedPreparedFoodBatch?.availableQuantity || 0)} remain.`
              : `Enter the quantity to record in ${directUsageUnit}. Inventory will be deducted from the item's configured recipe or raw-material stock.`}
          />
          {(selectedPreparedFoodBatch || selectedDirectTarget) && preparedFoodCountForm.actualQuantity !== '' && (
            <div className={`rounded-xl border p-4 ${
              preparedFoodCountExceedsAvailable
                ? 'border-rose-200 bg-rose-50'
                : preparedFoodCountDifference > 0
                ? 'border-amber-200 bg-amber-50'
                : 'border-emerald-200 bg-emerald-50'
            }`}>
              {preparedFoodCountExceedsAvailable ? (
                <p className="text-sm font-semibold text-rose-900">
                  Additional use cannot exceed the {Number(selectedPreparedFoodBatch.availableQuantity || 0)} portions currently available.
                </p>
              ) : preparedFoodCountDifference > 0 ? (
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                      {preparedFoodCountMode === 'complimentary' ? 'Complimentary portions to record' : 'Additional unrecorded use'}
                    </p>
                    <p className="mt-1 text-2xl font-black text-amber-950 tabular-nums">
                      {preparedFoodCountDifference.toLocaleString(undefined, { maximumFractionDigits: 3 })}
                    </p>
                  </div>
                  {canManageInventory && (selectedPreparedFoodBatch?.costPerPortion != null || selectedDirectUnitCost > 0) && (
                    <div className="text-left sm:text-right">
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Estimated cost</p>
                      <p className="mt-1 text-lg font-bold text-amber-950">{formatCurrency(preparedFoodCountCost)}</p>
                    </div>
                  )}
                  {selectedPreparedFoodBatch && (
                    <p className="text-sm font-semibold text-amber-950">
                      Total used after posting: {preparedFoodTotalUsed.toLocaleString(undefined, { maximumFractionDigits: 3 })} portions
                    </p>
                  )}
                  <p className="w-full text-xs leading-relaxed text-amber-900">
                    {selectedPreparedFoodBatch
                      ? preparedFoodCountMode === 'complimentary'
                        ? 'These portions will be deducted from the batch and included in complimentary food cost.'
                        : 'This difference will reduce available batch portions and appear as unrecorded prepared-food cost in Profit & Loss.'
                      : preparedFoodCountMode === 'complimentary'
                        ? 'Raw-material stock will be deducted and the cost will appear in complimentary reporting.'
                        : 'Raw-material stock will be deducted and the cost will appear as unrecorded use, separate from wastage.'}
                  </p>
                </div>
              ) : (
                <p className="text-sm font-semibold text-emerald-900">
                  {preparedFoodCountMode === 'complimentary'
                    ? 'Enter the number of portions to provide as complimentary.'
                    : `Enter the additional portions used. This will be added to the ${preparedFoodRecordedUsed} already recorded.`}
                </p>
              )}
            </div>
          )}
          <Input
            label={preparedFoodCountMode === 'complimentary' ? 'Reason for complimentary serving' : 'Reason for discrepancy'}
            required
            maxLength={500}
            value={preparedFoodCountForm.reason}
            onChange={(event) => setPreparedFoodCountForm((current) => ({ ...current, reason: event.target.value }))}
            placeholder={preparedFoodCountMode === 'complimentary'
              ? 'For example: guest recovery or management approval'
              : 'For example: unrecorded serving during shift'}
          />
          {preparedFoodCountError && (
            <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {preparedFoodCountError}
            </p>
          )}
        </form>
      </Modal>
      <Modal isOpen={isVerificationOpen} onClose={() => setIsVerificationOpen(false)} title="Verify Physical Stock" subtitle="Enter usable stock, then classify reductions as consumed or wasted">
        <form onSubmit={handleStockVerification} className="space-y-4">
          <Select
            label="Raw material"
            info="Choose the material and stock location you counted. Expected stock is calculated from that location's recorded balance."
            searchable
            required
            value={verificationForm.itemId}
            onChange={(event) => {
              const item = items.find((entry) => entry._id === event.target.value);
              const location = '';
              const lastVerified = item?._id ? getLastVerificationForItem(item._id, location || 'Main Store') : null;
              setVerificationForm({
                ...verificationForm,
                itemId: event.target.value,
                location,
                actualStock: '',
                unit: item?.baseUnit || item?.unit || '',
                hasUnrecordedConsumption: 'no',
                consumptionQuantity: '',
                consumptionUnit: item?.baseUnit || item?.unit || '',
                consumptionReason: '',
                hasWastage: 'no',
                wastageQuantity: '',
                wastageUnit: item?.baseUnit || item?.unit || '',
                wastageReason: '',
                periodStart: getVerificationPeriodStart(item, lastVerified),
                periodEnd: dayjs().format('YYYY-MM-DD')
              });
              setVerificationBatches([]);
              setVerificationBalances([]);
              setVerificationLocations([]);
            }}
            options={[{ label: 'Choose raw material', value: '' }, ...items.map((item) => ({
              label: item.name,
              value: item._id
            }))]}
          />
          {selectedVerificationItem && (
            <Select
              label="Stock location"
              required
              searchable
              value={verificationForm.locationId}
              onChange={(event) => handleVerificationLocationChange(event.target.value)}
              options={verificationLocationOptions}
            />
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Period start"
              info="Fixed to the selected material's last physical verification date."
              type="date"
              required
              disabled
              value={verificationForm.periodStart}
            />
            <Input
              label="Period end"
              info="Fixed to today's date."
              type="date"
              required
              disabled
              value={verificationForm.periodEnd}
            />
          </div>
          {selectedVerificationItem && (
            <p className="rounded-lg bg-[#faf7f0] p-3 text-sm text-slate-700">
              Stock is stored in <strong>{verificationBaseUnit}</strong>
              {verificationForm.unit && (
                <span> · 1 {verificationForm.unit} = {formatReceiptQuantity(verificationUnitFactor)} {verificationBaseUnit}</span>
              )}
            </p>
          )}
          {selectedVerificationItem && (
            <details className="rounded-lg border border-slate-200 bg-white">
              <summary className="cursor-pointer px-3 py-2.5 text-sm font-medium text-slate-800">
                Batch history ({verificationLocationBatches.length})
              </summary>
              <div className="space-y-2 border-t border-slate-100 p-3">
                {verificationBatchesLoading ? (
                  <p className="text-sm text-slate-500">Loading batch history…</p>
                ) : verificationLocationBatches.length === 0 ? (
                  <p className="text-sm text-slate-500">No batches have been received for this material at {verificationForm.location}.</p>
                ) : verificationLocationBatches.map((batch) => (
                  <div key={batch._id} className="rounded-md bg-slate-50 p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong className="text-slate-800">{batch.batchNumber || 'Unnumbered batch'}</strong>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        batch.status === 'open' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {batch.status === 'open' ? 'Open' : 'Exhausted'}
                      </span>
                    </div>
                    <p className="mt-1 text-slate-600">
                      Received {formatReceiptQuantity(batch.quantity)} {verificationBaseUnit}
                      {' · '}Remaining {formatReceiptQuantity(batch.remainingQuantity)} {verificationBaseUnit}
                    </p>
                    <p className="text-xs text-slate-500">
                      {batch.receivedAt && `Received ${dayjs(batch.receivedAt).format('MMM D, YYYY')}`}
                      {batch.expiryDate && ` · Expires ${dayjs(batch.expiryDate).format('MMM D, YYYY')}`}
                      {batch.location && ` · ${batch.location}`}
                      {batch.vendorId?.name && ` · ${batch.vendorId.name}`}
                    </p>
                  </div>
                ))}
                <p className="text-xs text-slate-500">
                  Compare the count with the recorded batches at {verificationForm.location}. Report only consumption and wastage that have not already been recorded.
                </p>
              </div>
            </details>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Actual usable stock"
              info="Enter the quantity physically counted that is still usable. Do not include stock that has expired, spoiled, or otherwise been discarded."
              type="number"
              min="0"
              step="any"
              required
              value={verificationForm.actualStock}
              onChange={(event) => setVerificationForm({ ...verificationForm, actualStock: event.target.value })}
            />
            <Select
              label="Unit"
              info="Choose the unit used for your physical count. The system converts this quantity to the material's inventory base unit."
              searchable
              required
              value={verificationForm.unit}
              onChange={(event) => setVerificationForm({ ...verificationForm, unit: event.target.value })}
              options={unitChoicesForItem(items.find((item) => item._id === verificationForm.itemId), units)}
            />
          </div>
          <div className="space-y-3">
            <div className="space-y-3 rounded-lg border border-[#e7d4c0] p-3">
              <Select
                label="Is there any unrecorded consumption in the remaining stock?"
                value={verificationForm.hasUnrecordedConsumption}
                onChange={(event) => setVerificationForm({
                  ...verificationForm,
                  hasUnrecordedConsumption: event.target.value,
                  consumptionQuantity: event.target.value === 'yes' ? verificationForm.consumptionQuantity : '',
                  consumptionUnit: verificationForm.consumptionUnit || verificationBaseUnit,
                  consumptionReason: event.target.value === 'yes' ? verificationForm.consumptionReason : '',
                  consumptionDepartment: event.target.value === 'yes' ? verificationForm.consumptionDepartment : ''
                })}
                options={[
                  { label: 'No', value: 'no' },
                  { label: 'Yes', value: 'yes' }
                ]}
              />
              {verificationForm.hasUnrecordedConsumption === 'yes' && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Input
                    label="Consumption quantity"
                    info="Enter only stock used during this period that has not already been recorded as an issue or other inventory movement."
                    type="number"
                    min="0.00000001"
                    step="any"
                    required
                    value={verificationForm.consumptionQuantity}
                    onChange={(event) => setVerificationForm({ ...verificationForm, consumptionQuantity: event.target.value })}
                  />
                  <Select
                    label="Consumption unit"
                    required
                    searchable
                    value={verificationForm.consumptionUnit}
                    onChange={(event) => setVerificationForm({ ...verificationForm, consumptionUnit: event.target.value })}
                    options={unitChoicesForItem(selectedVerificationItem, units)}
                  />
                  <Select
                    label="Department"
                    required
                    value={verificationForm.consumptionDepartment}
                    onChange={(event) => setVerificationForm({ ...verificationForm, consumptionDepartment: event.target.value })}
                    options={[
                      { label: 'Choose department', value: '' },
                      ...['Kitchen', 'Restaurant', 'Production', 'Housekeeping', 'Maintenance', 'Minibar']
                        .map((department) => ({ label: department, value: department }))
                    ]}
                  />
                  <div className="sm:col-span-2">
                    <Input
                      label="Consumption reason"
                      required
                      value={verificationForm.consumptionReason}
                      onChange={(event) => setVerificationForm({ ...verificationForm, consumptionReason: event.target.value })}
                      placeholder="e.g. used for staff meals"
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-3 rounded-lg border border-[#e7d4c0] p-3">
              <Select
                label="Is there any wastage in the remaining stock?"
                value={verificationForm.hasWastage}
                onChange={(event) => setVerificationForm({
                  ...verificationForm,
                  hasWastage: event.target.value,
                  wastageQuantity: event.target.value === 'yes' ? verificationForm.wastageQuantity : '',
                  wastageUnit: verificationForm.wastageUnit || verificationBaseUnit,
                  wastageReason: event.target.value === 'yes' ? verificationForm.wastageReason : ''
                })}
                options={[
                  { label: 'No', value: 'no' },
                  { label: 'Yes', value: 'yes' }
                ]}
              />
              {verificationForm.hasWastage === 'yes' && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Input
                    label="Wastage quantity"
                    info="Enter stock discarded, spoiled, or damaged during this period only if it has not already been recorded in inventory."
                    type="number"
                    min="0.00000001"
                    step="any"
                    required
                    value={verificationForm.wastageQuantity}
                    onChange={(event) => setVerificationForm({ ...verificationForm, wastageQuantity: event.target.value })}
                  />
                  <Select
                    label="Wastage unit"
                    required
                    searchable
                    value={verificationForm.wastageUnit}
                    onChange={(event) => setVerificationForm({ ...verificationForm, wastageUnit: event.target.value })}
                    options={unitChoicesForItem(selectedVerificationItem, units)}
                  />
                  <div className="sm:col-span-2">
                    <Input
                      label="Wastage reason"
                      required
                      value={verificationForm.wastageReason}
                      onChange={(event) => setVerificationForm({ ...verificationForm, wastageReason: event.target.value })}
                      placeholder="e.g. spoiled during storage"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          {selectedVerificationItem && (
            <div className="space-y-1 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-950">
              <p className="font-semibold">Stock calculation preview ({verificationBaseUnit})</p>
              <p>Last available stock: {formatReceiptQuantity(verificationExpectedStock)}</p>
              <p>Actual usable stock: {formatReceiptQuantity(verificationActualStock)}</p>
              <p>Unrecorded consumption: −{formatReceiptQuantity(verificationConsumption)}</p>
              <p>Wastage: −{formatReceiptQuantity(verificationWastage)}</p>
              <p>Profitably consumed: {formatReceiptQuantity(verificationDiscrepancy)}</p>
              {verificationGain > 0 && <p>Stock gain: +{formatReceiptQuantity(verificationGain)}</p>}
              {verificationConsumption + verificationWastage > verificationReduction && (
                <p className="font-medium text-rose-700">
                  Consumption and wastage cannot exceed the difference between expected and actual stock.
                </p>
              )}
            </div>
          )}
          <Input
            label="Remarks"
            info="Add any other context about the count, such as who counted it, where it was found, or a follow-up action. This does not change the quantities."
            value={verificationForm.remarks}
            onChange={(event) => setVerificationForm({ ...verificationForm, remarks: event.target.value })}
          />
          <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
            Last available stock already includes all previously recorded receipts, issues, and adjustments. Enter only unrecorded consumption and waste for the selected period. Any remaining reduction is recorded as profitably consumed; no additional reason is needed.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setIsVerificationOpen(false)}>Cancel</Button>
            <Button type="submit">Confirm verification</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isVendorHistoryOpen} onClose={() => setIsVendorHistoryOpen(false)} title={`${selectedVendor?.name || 'Vendor'} purchase history`}>
        <div className="space-y-3">
          {vendorPurchases.map((po) => (
            <div key={po._id} className="rounded-lg border p-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div><p className="font-semibold">{po.poNumber}</p><p className="text-xs text-slate-500">{dayjs(po.createdAt).format('MMM D, YYYY')} · {po.status}</p></div>
                <span className="font-bold">{formatCurrency(po.totalAmount)}</span>
              </div>
              <div className="mt-3 space-y-1 border-t pt-2">
                {(po.items || []).map((line, index) => (
                  <div key={`${po._id}-${line.itemId || index}`} className="flex items-start justify-between gap-3 text-xs">
                    <span>{line.itemName || 'Raw material'} · {line.quantity} {line.unit}</span>
                    <span className="shrink-0 text-right">{formatCurrency(line.unitCost)} / {line.unit}<br />{formatCurrency(line.totalAmount)} total</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {!vendorPurchases.length && <p className="py-8 text-center text-sm text-slate-400">No purchases found for this vendor.</p>}
        </div>
      </Modal>

      <Modal isOpen={isVendorPaymentOpen} onClose={() => setIsVendorPaymentOpen(false)} title={`Vendor payment · ${selectedVendor?.name || ''}`} subtitle={`Outstanding balance: ${formatCurrency(selectedVendor?.outstandingBalance || 0)}`}>
        <form onSubmit={handleRecordVendorPayment} className="space-y-4">
          <Input label="Payment amount" type="number" min="0.01" max={selectedVendor?.outstandingBalance || undefined} step="0.01" required value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} />
          <Select label="Payment method" value={paymentForm.paymentMethod} onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })} options={['cash', 'card', 'bank_transfer', 'upi', 'cheque', 'other'].map((method) => ({ label: method.replace(/_/g, ' '), value: method }))} />
          <Input label="Payment reference" value={paymentForm.referenceNumber} onChange={(e) => setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })} />
          <Input label="Invoice number" value={paymentForm.invoiceNumber} onChange={(e) => setPaymentForm({ ...paymentForm, invoiceNumber: e.target.value })} />
          <Input label="Notes" value={paymentForm.notes} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} />
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setIsVendorPaymentOpen(false)}>Cancel</Button><Button type="submit">Record payment</Button></div>
        </form>
      </Modal>
    </div>
  );
};
