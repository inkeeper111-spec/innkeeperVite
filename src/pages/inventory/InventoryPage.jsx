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
  BarChart3,
  Download,
  Search,
  Clock3,
  Tag
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer,
  Tooltip, XAxis, YAxis
} from 'recharts';

export const InventoryPage = () => {
  const { hotel, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const canManageInventory = ['hotel_admin', 'super_admin'].includes(user?.role);
  const { currencySymbol, formatCurrency } = useCurrency();
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
  const [items, setItems] = useState([]);
  const [units, setUnits] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [vendorPurchases, setVendorPurchases] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ amount: '', paymentMethod: 'bank_transfer', referenceNumber: '', invoiceNumber: '', notes: '' });
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [stockReceiptRequests, setStockReceiptRequests] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [departmentRequests, setDepartmentRequests] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [reorderSuggestions, setReorderSuggestions] = useState([]);
  const [report, setReport] = useState([]);
  const [verifications, setVerifications] = useState([]);
  const [verificationIntervalDays, setVerificationIntervalDays] = useState(1);
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
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isReceivingOpen, setIsReceivingOpen] = useState(false);
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
  const [isVerificationOpen, setIsVerificationOpen] = useState(false);
  const [isVendorHistoryOpen, setIsVendorHistoryOpen] = useState(false);
  const [isSupplierPaymentOpen, setIsSupplierPaymentOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
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
    notes: ''
  });
  const [receiptBatches, setReceiptBatches] = useState([]);
  const [receiptBatchesLoading, setReceiptBatchesLoading] = useState(false);

  const [moveForm, setMoveForm] = useState({
    movementType: 'receipt',
    quantity: 10,
    unit: 'pcs',
    department: '',
    location: 'Main Store',
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
    ingredients: [{ itemId: '', quantity: 1, unit: '', optional: false, substituteItemId: '', substituteQuantity: '', substituteUnit: '' }]
  });
  const [transferForm, setTransferForm] = useState({
    itemId: '',
    quantity: 1,
    unit: '',
    fromLocation: 'Main Store',
    toLocation: 'Kitchen Store',
    department: ''
  });
  const [adjustmentForm, setAdjustmentForm] = useState({
    itemId: '',
    quantity: 1,
    unit: '',
    reason: 'food_wastage',
    department: '',
    location: 'Main Store',
    remarks: ''
  });
  const [receivingLines, setReceivingLines] = useState([]);
  const [receivingLocation, setReceivingLocation] = useState('Main Store');
  const [menuItems, setMenuItems] = useState([]);
  const [minibarRooms, setMinibarRooms] = useState([]);
  const [minibarRoomId, setMinibarRoomId] = useState('');
  const [minibarData, setMinibarData] = useState(null);
  const [minibarCounts, setMinibarCounts] = useState({});
  const [isMinibarAssignOpen, setIsMinibarAssignOpen] = useState(false);
  const [minibarAssignForm, setMinibarAssignForm] = useState({ itemId: '', quantity: 1, unit: '', fromLocation: 'Main Store' });
  const [reportFilters, setReportFilters] = useState({
    from: '', to: '', category: 'all', itemId: ''
  });
  const [purchaseDate, setPurchaseDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [verificationForm, setVerificationForm] = useState({
    itemId: '',
    actualStock: '',
    unit: '',
    periodStart: dayjs().format('YYYY-MM-DD'),
    periodEnd: dayjs().format('YYYY-MM-DD'),
    consumptionQuantity: 0,
    wastageQuantity: 0,
    discrepancyReason: '',
    remarks: ''
  });

  const [message, setMessage] = useState('');

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const [itemsRes, vendorsRes, posRes, dashboardRes, ledgerRes, requestsRes, recipesRes, adjustmentsRes, suggestionsRes, unitsRes, verificationsRes, settingsRes, stockReceiptRequestsRes] = await Promise.all([
        api.get('/inventory/items', { params: { page: inventoryPage, limit: 100, includeInactive: canManageInventory ? 'true' : undefined } }),
        api.get('/inventory/vendors'),
        api.get('/inventory/purchase-orders'),
        api.get('/inventory/dashboard'),
        api.get('/inventory/ledger', { params: { limit: 30 } }),
        api.get('/inventory/department-requests'),
        api.get('/inventory/recipes'),
        api.get('/inventory/adjustments'),
        api.get('/inventory/reorder-suggestions'),
        api.get('/inventory/units', { params: canManageInventory ? { includeInactive: true } : {} }),
        api.get('/inventory/verifications'),
        api.get('/inventory/settings'),
        api.get('/inventory/stock-receipt-requests')
      ]);

      const rawMaterialsRes = await api.get('/inventory/raw-materials', {
        params: canManageInventory ? { includeInactive: true } : {}
      }).catch(() => null);
      if (itemsRes.data.success) {
        const regularItems = itemsRes.data.data || [];
        const rawData = rawMaterialsRes?.data?.data;
        const rawMaterials = rawMaterialsRes?.data?.success
          ? (Array.isArray(rawData) ? rawData : rawData?.materials || [])
          : [];
        const combined = new Map(regularItems.map((item) => [String(item._id), item]));
        rawMaterials.forEach((item) => combined.set(String(item._id), item));
        setItems([...combined.values()]);
      }
      if (unitsRes.data.success) setUnits(unitsRes.data.data || []);
      setInventoryPages(itemsRes.data.pagination?.pages || 1);
      if (vendorsRes.data.success) setVendors(vendorsRes.data.data);
      if (posRes.data.success) setPurchaseOrders(posRes.data.data);
      if (stockReceiptRequestsRes.data.success) setStockReceiptRequests(stockReceiptRequestsRes.data.data || []);
      if (dashboardRes.data.success) setDashboard(dashboardRes.data.data);
      if (ledgerRes.data.success) setLedger(ledgerRes.data.data);
      if (requestsRes.data.success) setDepartmentRequests(requestsRes.data.data);
      if (recipesRes.data.success) setRecipes(recipesRes.data.data);
      if (adjustmentsRes.data.success) setAdjustments(adjustmentsRes.data.data);
      if (suggestionsRes.data.success) setReorderSuggestions(suggestionsRes.data.data);
      if (verificationsRes.data.success) setVerifications(verificationsRes.data.data || []);
      if (settingsRes.data.success) setVerificationIntervalDays(settingsRes.data.data.verificationIntervalDays || 1);
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
    const tabByPath = {
      '/inventory/dashboard': 'dashboard',
      '/inventory/categories': 'categories',
      '/inventory/items': 'items',
      '/inventory/stock': 'ledger'
    };
    if (location.pathname === '/inventory/units') {
      navigate('/inventory/items', { replace: true });
    } else if (location.pathname === '/inventory') {
      setActiveTab(location.search.startsWith('?tab=') ? location.search.slice(5) : 'dashboard');
    } else if (tabByPath[location.pathname]) {
      setActiveTab(tabByPath[location.pathname]);
    }
  }, [location.pathname, location.search, navigate]);

  const selectInventoryTab = (tab) => {
    const pathByTab = {
      dashboard: '/inventory/dashboard',
      categories: '/inventory/categories',
      items: '/inventory/items',
      ledger: '/inventory/stock'
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
    if (activeTab !== 'recipes' || !canManageInventory) return;
    api.get('/restaurant/menu')
      .then(({ data }) => setMenuItems(data.data?.items || []))
      .catch((err) => showApiErrorToast(err, 'Could not load restaurant menu items'));
  }, [activeTab, canManageInventory]);

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
    setReceiptBatchesLoading(true);
    api.get('/inventory/batches', {
      params: { itemId: itemForm.itemId, location: itemForm.location || 'Main Store' }
    })
      .then(({ data }) => {
        if (active) setReceiptBatches(data.data || []);
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

  const handleCreateItem = async (e) => {
    e.preventDefault();
    try {
      const selectedMaterial = items.find((item) => item._id === itemForm.itemId);
      const selectedPurchaseUnit = rawMaterialPurchaseUnits(selectedMaterial)
        .find((unit) => unit.symbol === itemForm.unit);
      if (!selectedMaterial || !selectedPurchaseUnit) {
        throw new Error('Select a raw material and one of its configured purchase units.');
      }
      const purchaseQuantity = Number(itemForm.quantity);
      const purchasePrice = Number(itemForm.purchasePrice);
      if (!Number.isFinite(purchaseQuantity) || purchaseQuantity <= 0
        || !Number.isFinite(purchasePrice) || purchasePrice < 0) {
        throw new Error('Enter a positive quantity and a valid purchase price.');
      }
      const receiptPayload = {
        itemId: selectedMaterial._id,
        quantity: purchaseQuantity,
        unit: selectedPurchaseUnit.symbol,
        purchaseUnitPrice: purchasePrice,
        vendorId: itemForm.vendorId || null,
        department: itemForm.department,
        location: itemForm.location || 'Main Store',
        expiryDate: itemForm.expiryDate || null,
        notes: itemForm.notes
      };
      const previousAvailableQuantity = receiptBatches.reduce(
        (total, batch) => total + Math.max(0, Number(batch.remainingQuantity) || 0), 0
      );
      const requiresApproval = previousAvailableQuantity > 0;
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
      const wastageQuantity = itemForm.hasWastage === 'yes' ? Number(itemForm.wastageQuantity) : 0;
      if (itemForm.hasWastage === 'yes' && (!Number.isFinite(wastageQuantity) || wastageQuantity <= 0)) {
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
      const res = requiresApproval
        ? await api.post('/inventory/stock-receipt-requests', {
          ...receiptPayload,
          existingStockDeductionQuantity: enteredStockDeduction,
          existingStockDeductionUnit: itemForm.existingStockDeductionUnit || receiptBaseUnit,
          ...wastagePayload
        })
        : await api.post('/inventory/movements', {
          ...receiptPayload,
          movementType: 'receipt',
          autoGenerateBatchNumber: true,
          ...wastagePayload
        });
      if (res.data.success) {
        const batchNumber = res.data.data?.movement?.batchNumber;
        setIsAddItemOpen(false);
        setMessage(requiresApproval
          ? `${selectedMaterial.name} restock submitted for approval. The existing-stock deduction, fresh batch, and any wastage will be recorded after approval.`
          : `${selectedMaterial.name} stock added${batchNumber ? ` as batch ${batchNumber}` : ''}${wastageBaseQuantity ? `; ${formatReceiptQuantity(wastageBaseQuantity)} ${receiptBaseUnit} wastage recorded` : ''}.`);
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

  const openStockVerification = (item) => {
    const now = dayjs().format('YYYY-MM-DD');
    setVerificationForm({
      itemId: item?._id || items[0]?._id || '',
      actualStock: item?.currentStock ?? '',
      unit: item?.baseUnit || item?.unit || '',
      periodStart: dayjs(item?.lastVerifiedAt || item?.createdAt || now).format('YYYY-MM-DD'),
      periodEnd: now,
      consumptionQuantity: 0,
      wastageQuantity: 0,
      discrepancyReason: '',
      remarks: ''
    });
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
        wastageQuantity: Number(verificationForm.wastageQuantity || 0)
      });
      setIsVerificationOpen(false);
      setMessage(`Physical stock verification saved for ${item.name}.`);
      await fetchInventory();
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
      showApiErrorToast(err, 'Could not load supplier purchase history');
    }
  };

  const handleRecordSupplierPayment = async (e) => {
    e.preventDefault();
    if (!selectedVendor) return;
    try {
      await api.post(`/inventory/vendors/${selectedVendor._id}/payments`, {
        ...paymentForm,
        amount: Number(paymentForm.amount),
        idempotencyKey: `supplier-payment-${selectedVendor._id}-${Date.now()}`
      });
      setIsSupplierPaymentOpen(false);
      setMessage('Supplier payment recorded.');
      fetchInventory();
    } catch (err) {
      showApiErrorToast(err, 'Could not record supplier payment');
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

  const handleReceivePO = async (event) => {
    event.preventDefault();
    if (!selectedPO) return;
    try {
      await api.patch(`/inventory/purchase-orders/${selectedPO._id}/receive`, {
        items: receivingLines.filter((line) => Number(line.receivedQuantity) > 0),
        purchaseDate,
        invoiceNumber: event.currentTarget.invoiceNumber.value,
        invoiceAttachment: event.currentTarget.invoiceAttachment.value,
        location: receivingLocation,
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
      setMessage('Purchase order approved and issued to supplier.');
      fetchInventory();
    } catch (err) {
      showApiErrorToast(err, 'Purchase order approval failed');
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
      setMessage('Recipe version saved. Historical consumption remains unchanged.');
      fetchInventory();
    } catch (err) {
      showApiErrorToast(err, 'Could not save recipe');
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
      setMessage('Stock transfer recorded at both locations.');
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
      setMessage('Stock adjustment submitted for approval. Inventory will change only after approval.');
      fetchInventory();
    } catch (err) {
      showApiErrorToast(err, 'Could not submit stock adjustment');
    }
  };

  const handleReviewAdjustment = async (adjustment, decision) => {
    try {
      await api.patch(`/inventory/adjustments/${adjustment._id}/review`, { decision });
      setMessage(`Stock adjustment ${decision === 'approve' ? 'approved and posted' : 'rejected'}.`);
      fetchInventory();
    } catch (err) {
      showApiErrorToast(err, 'Could not review stock adjustment');
    }
  };

  const handleReviewStockReceiptRequest = async (request, decision) => {
    try {
      const { data } = await api.patch(`/inventory/stock-receipt-requests/${request._id}/review`, { decision });
      setMessage(decision === 'approve'
        ? `Restock approved for ${request.itemId?.name || 'raw material'}; new batch ${data.data?.batchNumber || ''} has been added.`
        : `Restock request rejected for ${request.itemId?.name || 'raw material'}.`);
      fetchInventory();
    } catch (err) {
      showApiErrorToast(err, 'Could not review restock request');
    }
  };

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
    try {
      const { data } = await api.get('/inventory/reports', {
        params: { type: reportType, ...reportFilters }
      });
      setReport(data.data || []);
    } catch (err) {
      showApiErrorToast(err, 'Could not load inventory report');
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
      if (reportType === 'financial') {
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
    if (reportType === 'financial') {
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
        row.transactionDate || row.receivedAt || row.verifiedAt || row.createdAt || '',
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
  const formatReceiptQuantity = (quantity) => new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 8
  }).format(Number(quantity) || 0);

  return (
    <div className="inventory-page w-full min-w-0 space-y-6">
      {/* Header */}
      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Inventory Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Consumables, linen stock, purchase orders, vendor directory, and movement audit logs
          </p>
        </div>

        <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:items-center lg:justify-end">
          <Button className="w-full sm:w-auto" variant="outline" size="sm" icon={ClipboardList} onClick={() => setIsDepartmentRequestOpen(true)}>
            Request Stock
          </Button>
          <Button className="w-full sm:w-auto" variant="outline" size="sm" icon={AlertTriangle} onClick={() => setIsAdjustmentOpen(true)}>
            Report Wastage
          </Button>
          <Button className="w-full sm:w-auto" variant="outline" size="sm" icon={ClipboardList} onClick={() => openStockVerification()}>
            Verify Stock
          </Button>
          {canManageInventory && (
            <>
              <Button className="w-full sm:w-auto" variant="outline" size="sm" icon={ArrowLeftRight} onClick={() => setIsTransferOpen(true)}>
                Transfer
              </Button>
              <Button className="w-full sm:w-auto" variant="outline" size="sm" icon={PackageCheck} onClick={() => setIsPurchaseOrderOpen(true)}>
                New Purchase
              </Button>
              <Button className="w-full sm:w-auto" variant="outline" size="sm" icon={Truck} onClick={() => setIsAddVendorOpen(true)}>
                Add Supplier
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

      {/* Tabs */}
      <nav className="rounded-2xl border border-[#eadfce] bg-white/80 p-2 shadow-sm shadow-[#3b241a]/5" aria-label="Inventory sections">
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'categories', label: 'Categories', icon: Tag },
            { id: 'items', label: `Inventory Items (${items.length})`, icon: Boxes },
            { id: 'ledger', label: 'Stock Management', icon: ArrowLeftRight },
            { id: 'verifications', label: `Stock Verification (${dashboard?.pendingStockVerifications || 0} pending)`, icon: ClipboardList },
            { id: 'vendors', label: `Suppliers (${vendors.length})`, icon: Truck },
            { id: 'pos', label: `Purchase Orders (${purchaseOrders.length})`, icon: PackageCheck },
            { id: 'requests', label: `Department Requests (${departmentRequests.length})`, icon: ClipboardList },
            { id: 'restock-approvals', label: `Restock Approvals (${stockReceiptRequests.filter((request) => request.status === 'pending').length})`, icon: PackageCheck },
            { id: 'adjustments', label: `Adjustments (${adjustments.length})`, icon: AlertTriangle },
            { id: 'recipes', label: `Recipes (${recipes.filter((recipe) => recipe.isActive).length})`, icon: Utensils },
            { id: 'minibar', label: 'Minibar', icon: PackageCheck },
            { id: 'reports', label: 'Reports', icon: BarChart3 }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => selectInventoryTab(id)}
              className={`flex min-w-0 items-center gap-2 rounded-xl px-2.5 py-3 text-left text-xs font-semibold transition-all sm:px-3 sm:text-sm ${
                activeTab === id
                  ? 'bg-[#f6efe3] text-[#3b241a] shadow-sm ring-1 ring-[#e8d2a6]'
                  : 'text-slate-600 hover:bg-[#faf7f0] hover:text-[#3b241a]'
              }`}
            >
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${activeTab === id ? 'bg-white text-[#a96f20]' : 'bg-slate-100 text-slate-500'}`}>
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 break-words leading-tight">{label}</span>
            </button>
          ))}
        </div>
      </nav>

      {activeTab === 'dashboard' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: 'Inventory Items', value: dashboard?.totalItems ?? items.length, icon: Boxes, tone: 'text-indigo-600 bg-indigo-50' },
              { label: 'Stock Valuation', value: formatCurrency(dashboard?.totalStockValue || 0), icon: BarChart3, tone: 'text-emerald-600 bg-emerald-50' },
              { label: 'Available Units', value: dashboard?.availableStock ?? 0, icon: PackageCheck, tone: 'text-sky-600 bg-sky-50' },
              { label: 'Low / Out of Stock', value: `${dashboard?.lowStockItems ?? 0} / ${dashboard?.outOfStockItems ?? 0}`, icon: AlertTriangle, tone: 'text-rose-600 bg-rose-50' },
              { label: 'Pending Purchase Orders', value: dashboard?.pendingPurchaseOrders ?? 0, icon: ClipboardList, tone: 'text-amber-600 bg-amber-50' },
              { label: 'Purchases This Month', value: formatCurrency(dashboard?.purchasesThisMonth || 0), icon: Truck, tone: 'text-violet-600 bg-violet-50' },
              { label: 'Consumption Cost This Month', value: formatCurrency(dashboard?.consumptionCostThisMonth || 0), icon: Utensils, tone: 'text-indigo-600 bg-indigo-50' },
              { label: 'Wastage This Month', value: formatCurrency(dashboard?.wastageCostThisMonth || 0), icon: AlertTriangle, tone: 'text-rose-600 bg-rose-50' },
              { label: 'Expiring Soon', value: dashboard?.expiringProducts?.length || 0, icon: Clock3, tone: 'text-orange-600 bg-orange-50' },
              { label: 'Open Requests', value: departmentRequests.filter((request) => request.status === 'pending').length, icon: ClipboardList, tone: 'text-cyan-600 bg-cyan-50' },
              { label: 'Pending Verification', value: dashboard?.pendingStockVerifications ?? 0, icon: ClipboardList, tone: 'text-orange-600 bg-orange-50' }
            ].map(({ label, value, icon: Icon, tone }) => (
              <Card key={label} className="!p-4 sm:!p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-slate-500">{label}</p>
                    <p className="mt-2 truncate text-xl font-black text-slate-900">{value}</p>
                  </div>
                  <span className={`rounded-xl p-2.5 ${tone}`}><Icon className="h-5 w-5" /></span>
                </div>
              </Card>
            ))}
          </div>
          {canManageInventory && (
            <Card title="Stock Verification Frequency" subtitle="Set how often staff should physically verify inventory">
              <div className="max-w-xs">
                <Select
                  label="Verify every"
                  value={verificationIntervalDays}
                  onChange={handleVerificationIntervalChange}
                  options={[
                    { label: 'Daily', value: 1 },
                    { label: 'Every 2 days', value: 2 },
                    { label: 'Every 3 days', value: 3 },
                    { label: 'Weekly', value: 7 },
                    { label: 'Monthly', value: 30 },
                    ...(![1, 2, 3, 7, 30].includes(Number(verificationIntervalDays))
                      ? [{ label: `Custom (${verificationIntervalDays} days)`, value: Number(verificationIntervalDays) }]
                      : [])
                  ]}
                />
                <div className="mt-3 flex items-end gap-2">
                  <Input
                    label="Custom interval in days"
                    type="number"
                    min="1"
                    max="365"
                    value={verificationIntervalDays}
                    onChange={(event) => setVerificationIntervalDays(event.target.value)}
                  />
                  <Button size="sm" onClick={() => handleVerificationIntervalChange({ target: { value: verificationIntervalDays } })}>Save</Button>
                </div>
              </div>
            </Card>
          )}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card title="Monthly Purchases" subtitle="Value of accepted stock receipts">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dashboard?.monthlyPurchases || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="_id.month" tickFormatter={(month) => dayjs().month(month - 1).format('MMM')} />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Area type="monotone" dataKey="total" stroke="#C58A32" fill="#E8D2A6" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              {!!reorderSuggestions.length && (
                <Card title="Automatic Reorder Suggestions" subtitle="Available stock accounts for expired batches and open purchase quantities">
                  <div className="divide-y divide-slate-100">
                    {reorderSuggestions.slice(0, 6).map((suggestion) => (
                      <div key={suggestion._id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-semibold text-slate-800">{suggestion.name} <span className="font-normal text-slate-500">({suggestion.code})</span></p>
                          <p className="text-xs text-slate-500">Available {suggestion.availableStock} · On order {suggestion.pendingPurchaseQuantity} · Suggested {suggestion.suggestedQuantity} {suggestion.unit}</p>
                        </div>
                        {canManageInventory && <Button size="sm" variant="outline" onClick={() => prepareSuggestedPurchase(suggestion)}>Prepare purchase</Button>}
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </Card>
            <Card title="Department Expenses" subtitle="Issued stock value by department">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboard?.departmentConsumption || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="_id" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Bar dataKey="expense" fill="#3B241A" radius={[5, 5, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card title="Department Consumption" subtitle="Quantity issued and consumed">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboard?.departmentConsumption || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="_id" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="quantity" fill="#759B83" radius={[5, 5, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card title="Recent Inventory Activity">
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
          {!!dashboard?.expiringProducts?.length && (
            <Card title="Expiring Products" subtitle="Accepted batches expiring within 30 days">
              <div className="overflow-x-auto">
                <table className="w-full min-w-0 table-fixed break-words whitespace-normal text-left text-sm">
                  <thead><tr className="border-b text-xs uppercase text-slate-400"><th className="pb-2">Item</th><th className="pb-2">Batch</th><th className="pb-2">Quantity</th><th className="pb-2">Expiry</th></tr></thead>
                  <tbody className="divide-y">
                    {dashboard.expiringProducts.map((batch, index) => (
                      <tr key={`${batch.item}-${index}`}><td className="py-2 font-semibold">{batch.item}</td><td>{batch.batchNumber || '—'}</td><td>{batch.quantity}</td><td>{dayjs(batch.expiryDate).format('MMM D, YYYY')}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
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
            <LoadingSpinner text="Loading inventory catalogue..." />
          ) : visibleItems.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No inventory items defined yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-0 table-fixed break-words whitespace-normal text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold">
                    <th className="pb-3">Item Name</th>
                    <th className="pb-3">SKU / Code</th>
                    <th className="pb-3">Category</th>
                    <th className="pb-3">Current Stock</th>
                    <th className="pb-3">Unit Cost</th>
                    <th className="pb-3">Stock Health</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleItems.map((it) => {
                    const availableStock = it.availableStock ?? it.currentStock;
                    const isLow = availableStock <= it.minStockThreshold;
                    return (
                      <tr key={it._id} className="hover:bg-slate-50 transition-colors">
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
                        <td className="py-3.5 text-slate-700 font-mono">{formatCurrency(it.unitCost)}<span className="ml-1 text-[10px] text-slate-400">/ {it.baseUnit || it.unit}</span></td>
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
                        <td className="py-3.5 text-right">
                          {canManageInventory && (
                            <div className="flex flex-wrap justify-end gap-1">
                              <Button size="sm" variant="outline" onClick={() => {
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
                                  trackExpiry: Boolean(it.trackExpiry),
                                  trackBatchNumber: Boolean(it.trackBatchNumber),
                                  isActive: Boolean(it.isActive)
                                });
                              }}>Edit</Button>
                              <Button size="sm" variant={it.isActive ? 'danger' : 'success'} onClick={() => toggleItemStatus(it)}>
                                {it.isActive ? 'Deactivate' : 'Activate'}
                              </Button>
                              {it.isActive && <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  setSelectedItemForMove(it);
                                  setMoveForm({
                                    ...moveForm,
                                    unit: it.baseUnit || it.unit,
                                    quantity: 0
                                  });
                                  setIsMovementOpen(true);
                                }}
                              >
                                Adjust Stock
                              </Button>}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
              {canManageInventory && <Button className="mt-4 w-full" size="sm" variant="outline" onClick={() => handleViewVendorPurchases(v)}>Purchase history</Button>}
              {canManageInventory && (
                <Button className="mt-2 w-full" size="sm" variant="secondary" onClick={() => {
                  setSelectedVendor(v);
                  setPaymentForm({ amount: '', paymentMethod: 'bank_transfer', referenceNumber: '', invoiceNumber: '', notes: '' });
                  setIsSupplierPaymentOpen(true);
                }}>
                  Record supplier payment
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'pos' && (
        <Card>
          {purchaseOrders.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No purchase orders recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-0 table-fixed break-words whitespace-normal text-left text-xs">
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
                      <td className="py-3 font-semibold text-slate-800">{po.vendorId?.name || 'Vendor'}</td>
                      <td className="py-3 font-black text-slate-900">{formatCurrency(po.totalAmount)}</td>
                      <td className="py-3">
                        <Badge variant={po.status}>{po.status}</Badge>
                      </td>
                      <td className="py-3 text-slate-500">{dayjs(po.createdAt).format('YYYY-MM-DD')}</td>
                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-2">
                          {canManageInventory && ['draft', 'pending_approval'].includes(po.status) && (
                            <Button size="sm" variant="success" onClick={() => handleApprovePurchaseOrder(po._id)}>
                              Approve
                            </Button>
                          )}
                          {canManageInventory && ['ordered', 'partially_received'].includes(po.status) && (
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
              </table>
            </div>
          )}
        </Card>
      )}

      {activeTab === 'ledger' && (
        <Card title="Stock Movement Ledger" subtitle="Auditable inventory movements across locations">
          <div className="overflow-x-auto">
            <table className="w-full min-w-0 table-fixed break-words whitespace-normal text-left text-xs">
              <thead><tr className="border-b border-slate-100 uppercase text-slate-400"><th className="pb-3">Date</th><th className="pb-3">Item</th><th className="pb-3">Movement</th><th className="pb-3">Quantity</th><th className="pb-3">Location</th><th className="pb-3">Department</th><th className="pb-3">Reference</th><th className="pb-3">Recorded by</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {ledger.map((movement) => (
                  <tr key={movement._id}>
                    <td className="py-3">{dayjs(movement.createdAt).format('YYYY-MM-DD HH:mm')}</td>
                    <td className="font-semibold">{movement.itemId?.name || 'Item'}</td>
                    <td className="capitalize">{movement.movementType.replace(/_/g, ' ')}</td>
                    <td>{movement.enteredQuantity ?? movement.quantity} {movement.enteredUnit || movement.baseUnit || movement.itemId?.baseUnit || movement.itemId?.unit}</td>
                    <td>{movement.location}{movement.destinationLocation ? ` → ${movement.destinationLocation}` : ''}</td>
                    <td>{movement.department || '—'}</td>
                    <td>{movement.referenceNumber || '—'}</td>
                    <td>{movement.recordedBy?.name || '—'}</td>
                  </tr>
                ))}
                {!ledger.length && <tr><td colSpan="8" className="py-10 text-center text-slate-400">No inventory movements recorded yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === 'verifications' && (
        <Card
          title="Physical Stock Verification"
          subtitle="Compare usable physical stock with expected stock and classify use, wastage, and discrepancies"
          action={<Button size="sm" icon={ClipboardList} onClick={() => openStockVerification()}>Record Verification</Button>}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-0 table-fixed break-words whitespace-normal text-left text-xs">
              <thead><tr className="border-b border-slate-100 uppercase text-slate-400"><th className="pb-3">Material</th><th className="pb-3">Expected</th><th className="pb-3">Actual usable</th><th className="pb-3">Used</th><th className="pb-3">Wasted</th><th className="pb-3">Discrepancy / Gain</th><th className="pb-3">Period</th><th className="pb-3">Verified by</th><th className="pb-3">Status</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {verifications.map((verification) => (
                  <tr key={verification._id}>
                    <td className="py-3 font-semibold">{verification.itemId?.name || 'Material'}</td>
                    <td>{formatInventoryQuantity(verification.expectedStock, verification.itemId || { unit: verification.unit })}</td>
                    <td>{formatInventoryQuantity(verification.actualStock, verification.itemId || { unit: verification.unit })}</td>
                    <td>{formatInventoryQuantity(verification.consumptionQuantity, verification.itemId || { unit: verification.unit })}</td>
                    <td>{formatInventoryQuantity(verification.wastageQuantity, verification.itemId || { unit: verification.unit })}</td>
                    <td>{verification.stockGain > 0 ? `Gain ${verification.stockGain}` : verification.discrepancyQuantity || 0}</td>
                    <td>{dayjs(verification.periodStart).format('MMM D')} – {dayjs(verification.periodEnd).format('MMM D, YYYY')}</td>
                    <td>{verification.verifiedBy?.name || 'Staff'}</td>
                    <td><Badge variant={verification.status}>{verification.status}</Badge></td>
                  </tr>
                ))}
                {!verifications.length && <tr><td colSpan="9" className="py-10 text-center text-slate-400">No physical stock verifications recorded yet.</td></tr>}
              </tbody>
            </table>
          </div>
          {!!dashboard?.pendingVerificationItems?.length && (
            <div className="mt-5 border-t border-slate-100 pt-4">
              <h3 className="mb-3 text-sm font-bold text-slate-800">Due for verification</h3>
              <div className="flex flex-wrap gap-2">
                {dashboard.pendingVerificationItems.map((item) => (
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
            <table className="w-full min-w-0 table-fixed break-words whitespace-normal text-left text-xs">
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
                      {canManageInventory && request.status === 'pending' && (
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
            </table>
          </div>
        </Card>
      )}

      {activeTab === 'adjustments' && (
        <Card title="Stock Adjustments & Wastage" subtitle="All adjustments require approval before stock is changed">
          <div className="overflow-x-auto">
            <table className="w-full min-w-0 table-fixed break-words whitespace-normal text-left text-xs">
              <thead><tr className="border-b border-slate-100 uppercase text-slate-400"><th className="pb-3">Date</th><th className="pb-3">Item</th><th className="pb-3">Quantity</th><th className="pb-3">Reason</th><th className="pb-3">Department</th><th className="pb-3">Reported by</th><th className="pb-3">Status</th><th className="pb-3 text-right">Action</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {adjustments.map((adjustment) => (
                  <tr key={adjustment._id}>
                    <td className="py-3">{dayjs(adjustment.createdAt).format('YYYY-MM-DD')}</td>
                    <td className="font-semibold">{adjustment.itemId?.name || 'Item'}</td>
                    <td>{adjustment.quantity} {adjustment.unit || adjustment.itemId?.baseUnit || adjustment.itemId?.unit}</td>
                    <td className="capitalize">{adjustment.reason.replace(/_/g, ' ')}</td>
                    <td>{adjustment.department || '—'}</td>
                    <td>{adjustment.reportedBy?.name || '—'}</td>
                    <td><Badge variant={adjustment.status}>{adjustment.status}</Badge></td>
                    <td className="text-right">
                      {canManageInventory && adjustment.status === 'pending' && (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="success" onClick={() => handleReviewAdjustment(adjustment, 'approve')}>Approve</Button>
                          <Button size="sm" variant="danger" onClick={() => handleReviewAdjustment(adjustment, 'reject')}>Reject</Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {!adjustments.length && <tr><td colSpan="8" className="py-10 text-center text-slate-400">No adjustments reported.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === 'restock-approvals' && (
        <Card title="Raw Material Restock Approvals" subtitle="Review the existing stock deduction and new receipt together. Both changes are applied only after approval.">
          <div className="overflow-x-auto">
            <table className="w-full min-w-0 table-fixed break-words whitespace-normal text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 uppercase text-slate-400">
                  <th className="pb-3">Date / Material</th>
                  <th className="pb-3">Existing stock / deduction</th>
                  <th className="pb-3">Requested restock</th>
                  <th className="pb-3">Vendor / Location</th>
                  <th className="pb-3">Requested by</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stockReceiptRequests.map((request) => (
                  <tr key={request._id}>
                    <td className="py-3">
                      <div className="font-semibold">{request.itemId?.name || 'Raw material'}</div>
                      <div className="text-slate-500">{dayjs(request.createdAt).format('YYYY-MM-DD')}</div>
                    </td>
                    <td>
                      <div className="font-semibold">
                        {formatReceiptQuantity(request.previousAvailableQuantity)} {request.itemId?.baseUnit || request.itemId?.unit}
                      </div>
                      <div className="mt-1 text-slate-600">
                        Deduct {formatReceiptQuantity(request.existingStockDeduction || 0)} {request.itemId?.baseUnit || request.itemId?.unit}
                      </div>
                      <div className="text-slate-500">
                        Remaining old stock: {formatReceiptQuantity(
                          request.remainingPreviousStockAfterDeduction
                            ?? Math.max(0, request.previousAvailableQuantity - (request.existingStockDeduction || 0))
                        )} {request.itemId?.baseUnit || request.itemId?.unit}
                      </div>
                      <details className="mt-1">
                        <summary className="cursor-pointer text-sky-700">Batch breakdown</summary>
                        <ul className="mt-1 space-y-1 text-slate-500">
                          {request.previousBatches.map((batch) => (
                            <li key={batch.batchId}>
                              {batch.batchNumber || 'Unnumbered'}: {formatReceiptQuantity(batch.remainingQuantity)} {request.itemId?.baseUnit || request.itemId?.unit}
                            </li>
                          ))}
                        </ul>
                      </details>
                    </td>
                    <td>
                      {formatReceiptQuantity(request.quantity)} {request.unit}
                      <div className="text-slate-500">{formatCurrency(request.quantity * request.purchaseUnitPrice)} total</div>
                      {request.wastageQuantity > 0 && (
                        <div className="mt-1 text-rose-700">
                          Wastage {formatReceiptQuantity(request.wastageQuantity)} {request.itemId?.baseUnit || request.itemId?.unit}
                          {request.wastageReason ? ` · ${request.wastageReason}` : ''}
                        </div>
                      )}
                    </td>
                    <td>{request.vendorId?.name || '—'}<div className="text-slate-500">{request.location}</div></td>
                    <td>{request.requestedBy?.name || '—'}</td>
                    <td><Badge variant={request.status}>{request.status}</Badge></td>
                    <td className="text-right">
                      {canManageInventory && request.status === 'pending' && (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="success" onClick={() => handleReviewStockReceiptRequest(request, 'approve')}>Approve & Receive</Button>
                          <Button size="sm" variant="danger" onClick={() => handleReviewStockReceiptRequest(request, 'reject')}>Reject</Button>
                        </div>
                      )}
                      {request.reviewedBy?.name && (
                        <div className="mt-1 text-slate-500">Reviewed by {request.reviewedBy.name}</div>
                      )}
                    </td>
                  </tr>
                ))}
                {!stockReceiptRequests.length && (
                  <tr><td colSpan="7" className="py-10 text-center text-slate-400">No raw material restock requests recorded.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === 'recipes' && (
        <Card
          title="Restaurant Recipes"
          subtitle="Active recipe versions deduct ingredients when a restaurant bill is finalized"
          action={canManageInventory ? <Button size="sm" icon={PlusCircle} onClick={() => setIsRecipeOpen(true)}>Add Recipe</Button> : null}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-0 table-fixed break-words whitespace-normal text-left text-xs">
              <thead><tr className="border-b border-slate-100 uppercase text-slate-400"><th className="pb-3">Menu item</th><th className="pb-3">Recipe version</th><th className="pb-3">Ingredients</th><th className="pb-3">Status</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {recipes.map((recipe) => (
                  <tr key={recipe._id}>
                    <td className="py-3 font-semibold">{recipe.menuItemId?.name || 'Menu item'}</td>
                    <td>v{recipe.version}</td>
                    <td>{recipe.ingredients.map((ingredient) => `${ingredient.itemId?.name || 'Item'} ${ingredient.quantity} ${ingredient.unit}${ingredient.optional ? ' (optional)' : ''}`).join(', ')}</td>
                    <td><Badge variant={recipe.isActive ? 'active' : 'inactive'}>{recipe.isActive ? 'Active' : 'Archived'}</Badge></td>
                  </tr>
                ))}
                {!recipes.length && <tr><td colSpan="4" className="py-10 text-center text-slate-400">No recipes configured.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
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
              <LoadingSpinner text="Loading room minibar..." />
            ) : (
              <form onSubmit={handleMinibarReconciliation} className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-0 table-fixed break-words whitespace-normal text-left text-xs">
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
                  </table>
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
        <Card title="Inventory Reports" subtitle="Filter and export stock, valuation, purchase, consumption, wastage, expiry and ledger records">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
            <Select
              label="Report"
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              options={[
                { label: 'Current Stock', value: 'stock' },
                { label: 'Stock Valuation', value: 'valuation' },
                { label: 'Purchase History', value: 'purchases' },
                { label: 'Inventory Financial Summary', value: 'financial' },
                { label: 'Physical Stock Verifications', value: 'verifications' },
                { label: 'Department Consumption', value: 'department-consumption' },
                { label: 'Recipe Consumption / Food Cost', value: 'recipe-consumption' },
                { label: 'Wastage', value: 'wastage' },
                { label: 'Expiry', value: 'expiry' },
                { label: 'Stock Transfers', value: 'transfers' },
                { label: 'Stock Adjustments', value: 'adjustments' },
                { label: 'Movement Ledger', value: 'ledger' }
              ]}
            />
            <Input label="From" type="date" value={reportFilters.from} onChange={(e) => setReportFilters({ ...reportFilters, from: e.target.value })} />
            <Input label="To" type="date" value={reportFilters.to} onChange={(e) => setReportFilters({ ...reportFilters, to: e.target.value })} />
            <Select
              label="Category"
              value={reportFilters.category}
              onChange={(e) => setReportFilters({ ...reportFilters, category: e.target.value })}
              options={[
                { label: 'All categories', value: 'all' },
                ...[...new Set(items.map((item) => item.category).filter(Boolean))]
                  .sort()
                  .map((category) => ({ label: category.replace(/_/g, ' '), value: category }))
              ]}
            />
            <Select
              label="Raw material"
              value={reportFilters.itemId}
              onChange={(e) => setReportFilters({ ...reportFilters, itemId: e.target.value })}
              options={[
                { label: 'All raw materials', value: '' },
                ...items.map((item) => ({ label: `${item.name} (${item.code})`, value: item._id }))
              ]}
            />
            <div className="flex items-end gap-2">
              <Button className="flex-1" size="sm" onClick={loadReport}>Run Report</Button>
              <Button variant="outline" size="sm" icon={Download} onClick={exportReport}>CSV</Button>
              <Button variant="outline" size="sm" disabled={!report.length} onClick={exportExcelReport}>Excel</Button>
              <Button variant="outline" size="sm" disabled={!report.length} onClick={exportPdfReport}>PDF</Button>
            </div>
          </div>
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
                  <table className="w-full text-left text-xs">
                    <thead><tr className="border-b border-slate-100 uppercase text-slate-400"><th className="pb-2">Vendor</th><th className="pb-2">Receipts</th><th className="pb-2 text-right">Purchase value</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {(report[0].vendorBreakdown || []).map((vendor) => (
                        <tr key={vendor.vendorId || 'unassigned'}><td className="py-2 font-semibold">{vendor.vendorName}</td><td>{vendor.receiptCount}</td><td className="text-right">{formatCurrency(vendor.totalPurchaseValue)}</td></tr>
                      ))}
                      {!report[0].vendorBreakdown?.length && <tr><td colSpan="3" className="py-5 text-center text-slate-400">No purchases in this period.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </Card>
              <Card title="Raw Material Expenses">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
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
                  </table>
                </div>
              </Card>
            </div>
            </>
          )}
          {reportType !== 'financial' && <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-0 table-fixed break-words whitespace-normal text-left text-xs">
              <thead><tr className="border-b border-slate-100 uppercase text-slate-400"><th className="pb-3">Date / Name</th><th className="pb-3">Item / Reference</th><th className="pb-3">Type / Quantity</th><th className="pb-3">Department / Supplier</th><th className="pb-3 text-right">Value</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {report.map((row, index) => (
                  <tr key={row._id || index}>
                    <td className="py-3">{row.name || row.poNumber || row.orderNumber || dayjs(row.createdAt || row.receivedAt).format('YYYY-MM-DD')}</td>
                    <td>{row.itemId?.name || row.code || row.referenceNumber || row.vendorId?.name || row.menuItemId?.name || '—'}</td>
                    <td>{row.movementType || (row.quantity !== undefined ? `${row.quantity} ${row.unit || ''}` : row.status || '—')}</td>
                    <td>{row.department || row.vendorId?.name || row.orderNumber || '—'}</td>
                    <td className="text-right">{row.stockValue !== undefined ? formatCurrency(row.stockValue) : row.totalAmount !== undefined ? formatCurrency(row.totalAmount) : row.totalCost !== undefined ? formatCurrency(row.totalCost) : '—'}</td>
                  </tr>
                ))}
                {!report.length && <tr><td colSpan="5" className="py-8 text-center text-slate-400">Choose filters and run a report.</td></tr>}
              </tbody>
            </table>
          </div>}
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
            value={moveForm.location}
            onChange={(e) => setMoveForm({ ...moveForm, location: e.target.value })}
            options={['Main Store', 'Kitchen Store', 'Restaurant Store', 'Housekeeping Store', 'Maintenance Store', 'Minibar Store'].map((location) => ({ label: location, value: location }))}
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
          <Input label="Storage location" value={itemEditForm.location || ''} onChange={(event) => setItemEditForm({ ...itemEditForm, location: event.target.value })} />
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
      >
        <form onSubmit={handleCreateItem} className="space-y-4">
          <p className="rounded-lg bg-[#faf7f0] p-3 text-xs leading-relaxed text-slate-700">
            Select the material and purchase unit first. Enter the quantity and price per purchase unit; stock and cost are converted to the material's base unit. If stock remains in an earlier batch, enter how much to deduct from it. An administrator must approve before the deduction and new receipt are applied.
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
                location: material?.location || 'Main Store'
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
                  info={`Enter a quantity to remove from existing batches. It will be converted to ${receiptBaseUnit} and deducted FIFO after administrator approval.`}
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
                ))} {receiptBaseUnit}. The deduction and new receipt are both applied only after administrator approval.
              </p>
            </div>
          )}
          {selectedRawMaterialForReceipt && (
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
              info="Select the supplier for this receipt if known. Leaving this blank does not prevent receiving stock."
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
              info="Choose where this delivery is placed. The stock ledger records the location."
              value={itemForm.location}
              onChange={(event) => setItemForm({ ...itemForm, location: event.target.value })}
              options={['Main Store', 'Kitchen Store', 'Restaurant Store', 'Housekeeping Store', 'Maintenance Store', 'Minibar Store'].map((location) => ({
                label: location,
                value: location
              }))}
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
                {canManageInventory && (
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
            {isUnitFormOpen && canManageInventory && (
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
              <Input label="Storage location" value={itemForm.location || 'Main Store'} onChange={(e) => setItemForm({ ...itemForm, location: e.target.value })} />
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

      <Modal isOpen={isPurchaseOrderOpen} onClose={() => setIsPurchaseOrderOpen(false)} title="New Purchase Order" subtitle="Submit a supplier order for administrator approval">
        <form onSubmit={handleCreatePurchaseOrder} className="space-y-4">
          <Select
            label="Supplier"
            required
            value={poForm.vendorId}
            onChange={(e) => setPoForm({ ...poForm, vendorId: e.target.value })}
            options={[{ label: 'Choose supplier', value: '' }, ...vendors.map((vendor) => ({ label: vendor.name, value: vendor._id }))]}
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
          <Select label="Receiving location" name="location" value={receivingLocation} onChange={(e) => setReceivingLocation(e.target.value)} options={[
            { label: 'Main Store', value: 'Main Store' },
            { label: 'Kitchen Store', value: 'Kitchen Store' },
            { label: 'Restaurant Store', value: 'Restaurant Store' },
            { label: 'Housekeeping Store', value: 'Housekeeping Store' },
            { label: 'Maintenance Store', value: 'Maintenance Store' },
            { label: 'Minibar Store', value: 'Minibar Store' }
          ]} />
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

      <Modal isOpen={isRecipeOpen} onClose={() => setIsRecipeOpen(false)} title="Create Recipe Version" subtitle="This version applies to future finalized restaurant sales">
        <form onSubmit={handleSaveRecipe} className="space-y-5">
          <Select label="Menu item" searchable searchPlaceholder="Search menu items..." required value={recipeForm.menuItemId} onChange={(e) => setRecipeForm({ ...recipeForm, menuItemId: e.target.value })} options={[{ label: 'Choose menu item', value: '' }, ...menuItems.map((menuItem) => ({ label: menuItem.name, value: menuItem._id }))]} />

          <div className="space-y-3">
            {recipeForm.ingredients.map((ingredient, index) => (
              <div key={index} className="rounded-xl border border-orvelle-border bg-orvelle-ivory/30 p-4">
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

          <Button type="button" size="sm" variant="outline" onClick={() => setRecipeForm({ ...recipeForm, ingredients: [...recipeForm.ingredients, { itemId: '', quantity: 1, unit: '', optional: false, substituteItemId: '', substituteQuantity: '', substituteUnit: '' }] })}>+ Add ingredient</Button>

          <div className="flex justify-end gap-2 border-t border-orvelle-border/40 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsRecipeOpen(false)}>Cancel</Button>
            <Button type="submit">Save recipe version</Button>
          </div>
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {['fromLocation', 'toLocation'].map((field) => (
              <Select key={field} label={field === 'fromLocation' ? 'From location' : 'To location'} value={transferForm[field]} onChange={(e) => setTransferForm({ ...transferForm, [field]: e.target.value })} options={['Main Store', 'Kitchen Store', 'Restaurant Store', 'Housekeeping Store', 'Maintenance Store', 'Minibar Store'].map((location) => ({ label: location, value: location }))} />
            ))}
          </div>
          <Input label="Department" value={transferForm.department} onChange={(e) => setTransferForm({ ...transferForm, department: e.target.value })} />
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
          <Select label="Issue from location" value={minibarAssignForm.fromLocation} onChange={(e) => setMinibarAssignForm({ ...minibarAssignForm, fromLocation: e.target.value })} options={['Main Store', 'Minibar Store'].map((location) => ({ label: location, value: location }))} />
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setIsMinibarAssignOpen(false)}>Cancel</Button><Button type="submit">Assign stock</Button></div>
        </form>
      </Modal>

      <Modal isOpen={isAdjustmentOpen} onClose={() => setIsAdjustmentOpen(false)} title="Report Stock Adjustment" subtitle="An administrator must approve this adjustment before it affects stock">
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label={adjustmentForm.reason === 'physical_mismatch' ? 'Physical count (new total)' : 'Quantity affected'} type="number" min="0.00000001" step="any" required value={adjustmentForm.quantity} onChange={(e) => setAdjustmentForm({ ...adjustmentForm, quantity: e.target.value })} />
            <Select label="Unit" searchable searchPlaceholder="Search supported units..." required value={adjustmentForm.unit} onChange={(e) => setAdjustmentForm({ ...adjustmentForm, unit: e.target.value })} options={unitChoicesForItem(items.find((item) => item._id === adjustmentForm.itemId), units)} />
          </div>
          <Input label="Department" value={adjustmentForm.department} onChange={(e) => setAdjustmentForm({ ...adjustmentForm, department: e.target.value })} />
          <Input label="Remarks" value={adjustmentForm.remarks} onChange={(e) => setAdjustmentForm({ ...adjustmentForm, remarks: e.target.value })} />
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setIsAdjustmentOpen(false)}>Cancel</Button><Button type="submit">Submit for approval</Button></div>
        </form>
      </Modal>

      <Modal isOpen={isVerificationOpen} onClose={() => setIsVerificationOpen(false)} title="Verify Physical Stock" subtitle="Enter usable stock, then classify reductions as used, wasted, or unexplained">
        <form onSubmit={handleStockVerification} className="space-y-4">
          <Select
            label="Raw material"
            info="Choose the material you counted. The expected quantity shown here is the current stock balance recorded by the system before this verification."
            searchable
            required
            value={verificationForm.itemId}
            onChange={(event) => {
              const item = items.find((entry) => entry._id === event.target.value);
              setVerificationForm({
                ...verificationForm,
                itemId: event.target.value,
                actualStock: item?.currentStock ?? '',
                unit: item?.baseUnit || item?.unit || ''
              });
            }}
            options={[{ label: 'Choose raw material', value: '' }, ...items.map((item) => ({
              label: `${item.name} · Expected ${formatInventoryQuantity(item.currentStock, item)}`,
              value: item._id
            }))]}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Period start"
              info="Start of the period being reconciled. Only include unrecorded consumption or waste that happened on or after this date."
              type="date"
              required
              value={verificationForm.periodStart}
              onChange={(event) => setVerificationForm({ ...verificationForm, periodStart: event.target.value })}
            />
            <Input
              label="Period end"
              info="End of the period being reconciled. This cannot be earlier than the period start."
              type="date"
              required
              value={verificationForm.periodEnd}
              onChange={(event) => setVerificationForm({ ...verificationForm, periodEnd: event.target.value })}
            />
          </div>
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Unrecorded consumption to reconcile"
              info="Enter stock used during this period that has not already been recorded as an issue or other inventory movement. Leave at zero if all use is already recorded."
              type="number"
              min="0"
              step="any"
              value={verificationForm.consumptionQuantity}
              onChange={(event) => setVerificationForm({ ...verificationForm, consumptionQuantity: event.target.value })}
            />
            <Input
              label="Wasted during period"
              info="Enter stock discarded, spoiled, or damaged during this period only if that waste has not already been recorded in inventory."
              type="number"
              min="0"
              step="any"
              value={verificationForm.wastageQuantity}
              onChange={(event) => setVerificationForm({ ...verificationForm, wastageQuantity: event.target.value })}
            />
          </div>
          <Input
            label="Discrepancy / gain reason (if applicable)"
            info="Explain any remaining difference between expected stock and the physical count after unrecorded consumption and waste are accounted for. A reason is required for an unexplained difference or stock gain."
            value={verificationForm.discrepancyReason}
            onChange={(event) => setVerificationForm({ ...verificationForm, discrepancyReason: event.target.value })}
          />
          <Input
            label="Remarks"
            info="Add any other context about the count, such as who counted it, where it was found, or a follow-up action. This does not change the quantities."
            value={verificationForm.remarks}
            onChange={(event) => setVerificationForm({ ...verificationForm, remarks: event.target.value })}
          />
          <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
            Expected stock already includes all previously recorded receipts, issues, and adjustments. Enter only unrecorded consumption and waste for the selected period. After those are accounted for, any remaining difference is posted as a stock discrepancy.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setIsVerificationOpen(false)}>Cancel</Button>
            <Button type="submit">Confirm verification</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isVendorHistoryOpen} onClose={() => setIsVendorHistoryOpen(false)} title={`${selectedVendor?.name || 'Supplier'} purchase history`}>
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
          {!vendorPurchases.length && <p className="py-8 text-center text-sm text-slate-400">No purchases found for this supplier.</p>}
        </div>
      </Modal>

      <Modal isOpen={isSupplierPaymentOpen} onClose={() => setIsSupplierPaymentOpen(false)} title={`Supplier payment · ${selectedVendor?.name || ''}`} subtitle={`Outstanding balance: ${formatCurrency(selectedVendor?.outstandingBalance || 0)}`}>
        <form onSubmit={handleRecordSupplierPayment} className="space-y-4">
          <Input label="Payment amount" type="number" min="0.01" max={selectedVendor?.outstandingBalance || undefined} step="0.01" required value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} />
          <Select label="Payment method" value={paymentForm.paymentMethod} onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })} options={['cash', 'card', 'bank_transfer', 'upi', 'cheque', 'other'].map((method) => ({ label: method.replace(/_/g, ' '), value: method }))} />
          <Input label="Payment reference" value={paymentForm.referenceNumber} onChange={(e) => setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })} />
          <Input label="Invoice number" value={paymentForm.invoiceNumber} onChange={(e) => setPaymentForm({ ...paymentForm, invoiceNumber: e.target.value })} />
          <Input label="Notes" value={paymentForm.notes} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} />
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setIsSupplierPaymentOpen(false)}>Cancel</Button><Button type="submit">Record payment</Button></div>
        </form>
      </Modal>
    </div>
  );
};
