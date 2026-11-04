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
  Clock3
} from 'lucide-react';
import dayjs from 'dayjs';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer,
  Tooltip, XAxis, YAxis
} from 'recharts';

export const InventoryPage = () => {
  const { hotel, user } = useAuth();
  const canManageInventory = ['hotel_admin', 'super_admin'].includes(user?.role);
  const { currencySymbol, formatCurrency } = useCurrency();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [items, setItems] = useState([]);
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
  const [report, setReport] = useState([]);
  const [reportType, setReportType] = useState('stock');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [inventoryPage, setInventoryPage] = useState(1);
  const [inventoryPages, setInventoryPages] = useState(1);

  // Modals
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isMovementOpen, setIsMovementOpen] = useState(false);
  const [isAddVendorOpen, setIsAddVendorOpen] = useState(false);
  const [isPurchaseOrderOpen, setIsPurchaseOrderOpen] = useState(false);
  const [isDepartmentRequestOpen, setIsDepartmentRequestOpen] = useState(false);
  const [isRecipeOpen, setIsRecipeOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isReceivingOpen, setIsReceivingOpen] = useState(false);
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
  const [isVendorHistoryOpen, setIsVendorHistoryOpen] = useState(false);
  const [isSupplierPaymentOpen, setIsSupplierPaymentOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [selectedItemForMove, setSelectedItemForMove] = useState(null);

  const [itemForm, setItemForm] = useState({
    name: '',
    code: '',
    category: 'food_ingredients',
    unit: 'pcs',
    currentStock: 10,
    minStockThreshold: 15,
    maxStockLevel: '',
    reorderQuantity: 0,
    unitCost: 5,
    trackExpiry: false,
    trackBatchNumber: false,
    openingBatchNumber: '',
    openingExpiryDate: ''
  });

  const [moveForm, setMoveForm] = useState({
    movementType: 'receipt',
    quantity: 10,
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
    items: [{ itemId: '', quantity: 1, unitCost: 0 }]
  });
  const [departmentForm, setDepartmentForm] = useState({
    department: 'Housekeeping',
    notes: '',
    lines: [{ itemId: '', quantity: 1 }]
  });
  const [recipeForm, setRecipeForm] = useState({
    menuItemId: '',
    ingredients: [{ itemId: '', quantity: 1, unit: '', optional: false, substituteItemId: '', substituteQuantity: '', substituteUnit: '' }]
  });
  const [transferForm, setTransferForm] = useState({
    itemId: '',
    quantity: 1,
    fromLocation: 'Main Store',
    toLocation: 'Kitchen Store',
    department: ''
  });
  const [adjustmentForm, setAdjustmentForm] = useState({
    itemId: '',
    quantity: 1,
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
  const [minibarAssignForm, setMinibarAssignForm] = useState({ itemId: '', quantity: 1, fromLocation: 'Main Store' });
  const [reportFilters, setReportFilters] = useState({ from: '', to: '' });

  const [message, setMessage] = useState('');

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const [itemsRes, vendorsRes, posRes, dashboardRes, ledgerRes, requestsRes, recipesRes, adjustmentsRes, suggestionsRes] = await Promise.all([
        api.get('/inventory/items', { params: { page: inventoryPage, limit: 100 } }),
        api.get('/inventory/vendors'),
        api.get('/inventory/purchase-orders'),
        api.get('/inventory/dashboard'),
        api.get('/inventory/ledger', { params: { limit: 30 } }),
        api.get('/inventory/department-requests'),
        api.get('/inventory/recipes'),
        api.get('/inventory/adjustments'),
        api.get('/inventory/reorder-suggestions')
      ]);

      if (itemsRes.data.success) setItems(itemsRes.data.data);
      setInventoryPages(itemsRes.data.pagination?.pages || 1);
      if (vendorsRes.data.success) setVendors(vendorsRes.data.data);
      if (posRes.data.success) setPurchaseOrders(posRes.data.data);
      if (dashboardRes.data.success) setDashboard(dashboardRes.data.data);
      if (ledgerRes.data.success) setLedger(ledgerRes.data.data);
      if (requestsRes.data.success) setDepartmentRequests(requestsRes.data.data);
      if (recipesRes.data.success) setRecipes(recipesRes.data.data);
      if (adjustmentsRes.data.success) setAdjustments(adjustmentsRes.data.data);
      if (suggestionsRes.data.success) setReorderSuggestions(suggestionsRes.data.data);
    } catch (err) {
      showApiErrorToast(err, 'Could not load inventory data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [inventoryPage]);

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

  const handleCreateItem = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/inventory/items', {
        ...itemForm,
        currentStock: Number(itemForm.currentStock),
        minStockThreshold: Number(itemForm.minStockThreshold),
        maxStockLevel: itemForm.maxStockLevel ? Number(itemForm.maxStockLevel) : null,
        reorderQuantity: Number(itemForm.reorderQuantity),
        unitCost: Number(itemForm.unitCost)
      });
      if (res.data.success) {
        setIsAddItemOpen(false);
        setMessage(`Item ${itemForm.name} added to inventory.`);
        fetchInventory();
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (err) {
      showApiErrorToast(err, 'Failed to create item');
    }
  };

  const handleRecordMovement = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/inventory/movements', {
        itemId: selectedItemForMove._id,
        movementType: moveForm.movementType,
        quantity: Number(moveForm.quantity),
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
          unitCost: Number(line.unitCost)
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
      items: [{ itemId: item._id, quantity: item.suggestedQuantity, unitCost: item.unitCost }]
    });
    setIsPurchaseOrderOpen(true);
  };

  const handleReceivePO = async (event) => {
    event.preventDefault();
    if (!selectedPO) return;
    try {
      await api.patch(`/inventory/purchase-orders/${selectedPO._id}/receive`, {
        items: receivingLines.filter((line) => Number(line.receivedQuantity) > 0),
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
        lines: departmentForm.lines.map((line) => ({ ...line, quantity: Number(line.quantity) }))
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
        missingQuantity: 0
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

  const visibleItems = items.filter((item) => {
    const matchesSearch = `${item.name} ${item.code} ${item.barcode || ''}`.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (categoryFilter === 'all' || item.category === categoryFilter);
  });

  return (
    <div className="inventory-page w-full min-w-0 space-y-6">
      {/* Header */}
      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Inventory & Procurement</h1>
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
                Add Stock Item
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
            { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
            { id: 'items', label: `Stock Items (${items.length})`, icon: Boxes },
            { id: 'vendors', label: `Suppliers (${vendors.length})`, icon: Truck },
            { id: 'pos', label: `Purchase Orders (${purchaseOrders.length})`, icon: PackageCheck },
            { id: 'ledger', label: 'Stock Ledger', icon: ArrowLeftRight },
            { id: 'requests', label: `Department Requests (${departmentRequests.length})`, icon: ClipboardList },
            { id: 'adjustments', label: `Adjustments (${adjustments.length})`, icon: AlertTriangle },
            { id: 'recipes', label: `Recipes (${recipes.filter((recipe) => recipe.isActive).length})`, icon: Utensils },
            { id: 'minibar', label: 'Minibar', icon: PackageCheck },
            { id: 'reports', label: 'Reports', icon: BarChart3 }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
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
              { label: 'Expiring Soon', value: dashboard?.expiringProducts?.length || 0, icon: Clock3, tone: 'text-orange-600 bg-orange-50' },
              { label: 'Open Requests', value: departmentRequests.filter((request) => request.status === 'pending').length, icon: ClipboardList, tone: 'text-cyan-600 bg-cyan-50' }
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

      {activeTab === 'items' && (
        <Card>
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Search inventory" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, SKU, barcode" />
            <Select
              label="Category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              options={[
                { label: 'All categories', value: 'all' },
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
                        <td className="py-3.5 font-bold text-slate-900">{it.name}</td>
                        <td className="py-3.5 font-mono text-slate-500">{it.code}</td>
                        <td className="py-3.5 capitalize text-slate-600">
                          {it.category.replace(/_/g, ' ')}
                        </td>
                        <td className="py-3.5 font-bold text-slate-900">
                          {availableStock} {it.unit}
                        </td>
                        <td className="py-3.5 text-slate-700 font-mono">{formatCurrency(it.unitCost)}</td>
                        <td className="py-3.5">
                          {isLow ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              Low Stock (&le; {it.minStockThreshold})
                            </span>
                          ) : (
                            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              Adequate Stock
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 text-right">
                          {canManageInventory && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setSelectedItemForMove(it);
                              setIsMovementOpen(true);
                            }}
                          >
                            Adjust Stock
                          </Button>
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
                                setReceivingLines(po.items.map((line) => ({
                                  itemId: line.itemId?._id || line.itemId,
                                  name: line.itemName,
                                  unit: line.unit || line.itemId?.unit || '',
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
                    <td>{movement.quantity} {movement.itemId?.unit}</td>
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
                    <td>{adjustment.quantity} {adjustment.itemId?.unit}</td>
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
                    <thead><tr className="border-b border-slate-100 uppercase text-slate-400"><th className="pb-3">Product</th><th className="pb-3">Available</th><th className="pb-3">Consumed</th><th className="pb-3">Complimentary</th><th className="pb-3">Damaged</th><th className="pb-3">Missing</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {minibarData.stock.map((entry) => (
                        <tr key={entry._id}>
                          <td className="py-3 font-semibold">{entry.itemId.name}</td>
                          <td>{entry.quantity} {entry.itemId.unit}</td>
                          {['consumedQuantity', 'complimentaryQuantity', 'damagedQuantity', 'missingQuantity'].map((field) => (
                            <td key={field} className="w-28 py-2">
                              <Input type="number" min="0" max={entry.quantity} step="0.001" value={minibarCounts[entry.itemId._id]?.[field] || 0} onChange={(e) => setMinibarCounts({
                                ...minibarCounts,
                                [entry.itemId._id]: { ...minibarCounts[entry.itemId._id], [field]: e.target.value }
                              })} />
                            </td>
                          ))}
                        </tr>
                      ))}
                      {!minibarData.stock.length && <tr><td colSpan="6" className="py-8 text-center text-slate-400">No minibar products are assigned to this room.</td></tr>}
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
                    <span>{transaction.itemId?.name} · {transaction.quantity} · {transaction.type}</span>
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
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <Select
              label="Report"
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              options={[
                { label: 'Current Stock', value: 'stock' },
                { label: 'Stock Valuation', value: 'valuation' },
                { label: 'Purchase History', value: 'purchases' },
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
            <div className="flex items-end gap-2">
              <Button className="flex-1" size="sm" onClick={loadReport}>Run Report</Button>
              <Button variant="outline" size="sm" icon={Download} onClick={exportReport}>Export CSV</Button>
            </div>
          </div>
          <div className="mt-5 overflow-x-auto">
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
          </div>
        </Card>
      )}

      {/* Record Stock Movement Modal */}
      <Modal
        isOpen={isMovementOpen}
        onClose={() => setIsMovementOpen(false)}
        title={`Adjust Stock: ${selectedItemForMove?.name}`}
        subtitle={`Current Stock: ${selectedItemForMove?.currentStock} ${selectedItemForMove?.unit}`}
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
            required
            value={moveForm.quantity}
            onChange={(e) => setMoveForm({ ...moveForm, quantity: e.target.value })}
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

      {/* Add Item Modal */}
      <Modal
        isOpen={isAddItemOpen}
        onClose={() => setIsAddItemOpen(false)}
        title="Add Inventory Item"
        subtitle="Catalog a consumable or hotel supply"
      >
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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select
              label="Unit"
              value={itemForm.unit}
              onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
              options={['kg', 'g', 'liter', 'ml', 'pcs', 'box', 'packet'].map((unit) => ({ label: unit, value: unit }))}
            />
            <Input label="Storage location" value={itemForm.location || 'Main Store'} onChange={(e) => setItemForm({ ...itemForm, location: e.target.value })} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Current Stock"
              type="number"
              required
              value={itemForm.currentStock}
              onChange={(e) => setItemForm({ ...itemForm, currentStock: e.target.value })}
            />
            <Input
              label="Min Threshold"
              type="number"
              required
              value={itemForm.minStockThreshold}
              onChange={(e) => setItemForm({ ...itemForm, minStockThreshold: e.target.value })}
            />
            <Input
              label={`Unit Cost (${currencySymbol})`}
              type="number"
              step="0.01"
              required
              value={itemForm.unitCost}
              onChange={(e) => setItemForm({ ...itemForm, unitCost: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Maximum stock level" type="number" min="0" step="0.001" value={itemForm.maxStockLevel} onChange={(e) => setItemForm({ ...itemForm, maxStockLevel: e.target.value })} />
            <Input label="Reorder quantity" type="number" min="0" step="0.001" value={itemForm.reorderQuantity} onChange={(e) => setItemForm({ ...itemForm, reorderQuantity: e.target.value })} />
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
              <div key={index} className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[2fr_1fr_1fr_auto]">
                <Select
                  label={index === 0 ? 'Item' : ''}
                  required
                  value={line.itemId}
                  onChange={(e) => {
                    const selected = items.find((item) => item._id === e.target.value);
                    setPoForm({ ...poForm, items: poForm.items.map((entry, row) => row === index ? { ...entry, itemId: e.target.value, unitCost: selected?.unitCost || entry.unitCost } : entry) });
                  }}
                  options={[{ label: 'Choose item', value: '' }, ...items.map((item) => ({ label: `${item.name} (${item.unit})`, value: item._id }))]}
                />
                <Input label={index === 0 ? 'Quantity' : ''} type="number" min="0.001" step="0.001" required value={line.quantity} onChange={(e) => setPoForm({ ...poForm, items: poForm.items.map((entry, row) => row === index ? { ...entry, quantity: e.target.value } : entry) })} />
                <Input label={index === 0 ? 'Unit price' : ''} type="number" min="0" step="0.01" required value={line.unitCost} onChange={(e) => setPoForm({ ...poForm, items: poForm.items.map((entry, row) => row === index ? { ...entry, unitCost: e.target.value } : entry) })} />
                {poForm.items.length > 1 && <Button type="button" size="sm" variant="danger" onClick={() => setPoForm({ ...poForm, items: poForm.items.filter((_, row) => row !== index) })}>Remove</Button>}
              </div>
            ))}
            <Button type="button" size="sm" variant="outline" onClick={() => setPoForm({ ...poForm, items: [...poForm.items, { itemId: '', quantity: 1, unitCost: 0 }] })}>Add another item</Button>
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
                <p className="mb-2 text-sm font-bold">{line.name} <span className="text-xs font-normal text-slate-500">({line.remaining} remaining)</span></p>
                <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                  {['receivedQuantity', 'acceptedQuantity', 'damagedQuantity', 'rejectedQuantity'].map((field) => (
                    <Input
                      key={field}
                      label={field.replace('Quantity', '')}
                      type="number"
                      min="0"
                      max={line.remaining}
                      step="0.001"
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
            <div key={index} className="grid grid-cols-[2fr_1fr_auto] items-end gap-2">
              <Select label={index === 0 ? 'Item' : ''} required value={line.itemId} onChange={(e) => setDepartmentForm({ ...departmentForm, lines: departmentForm.lines.map((entry, row) => row === index ? { ...entry, itemId: e.target.value } : entry) })} options={[{ label: 'Choose item', value: '' }, ...items.map((item) => ({ label: `${item.name} (${item.unit})`, value: item._id }))]} />
              <Input label={index === 0 ? 'Quantity' : ''} type="number" min="0.001" step="0.001" required value={line.quantity} onChange={(e) => setDepartmentForm({ ...departmentForm, lines: departmentForm.lines.map((entry, row) => row === index ? { ...entry, quantity: e.target.value } : entry) })} />
              {departmentForm.lines.length > 1 && <Button type="button" size="sm" variant="danger" onClick={() => setDepartmentForm({ ...departmentForm, lines: departmentForm.lines.filter((_, row) => row !== index) })}>Remove</Button>}
            </div>
          ))}
          <Button type="button" size="sm" variant="outline" onClick={() => setDepartmentForm({ ...departmentForm, lines: [...departmentForm.lines, { itemId: '', quantity: 1 }] })}>Add item</Button>
          <Input label="Request notes" value={departmentForm.notes} onChange={(e) => setDepartmentForm({ ...departmentForm, notes: e.target.value })} />
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setIsDepartmentRequestOpen(false)}>Cancel</Button><Button type="submit">Submit request</Button></div>
        </form>
      </Modal>

      <Modal isOpen={isRecipeOpen} onClose={() => setIsRecipeOpen(false)} title="Create Recipe Version" subtitle="This version applies to future finalized restaurant sales">
        <form onSubmit={handleSaveRecipe} className="space-y-5">
          <Select label="Menu item" required value={recipeForm.menuItemId} onChange={(e) => setRecipeForm({ ...recipeForm, menuItemId: e.target.value })} options={[{ label: 'Choose menu item', value: '' }, ...menuItems.map((menuItem) => ({ label: menuItem.name, value: menuItem._id }))]} />

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
                  <Select label="Ingredient" required value={ingredient.itemId} onChange={(e) => {
                    const item = items.find((entry) => entry._id === e.target.value);
                    setRecipeForm({ ...recipeForm, ingredients: recipeForm.ingredients.map((entry, row) => row === index ? { ...entry, itemId: e.target.value, unit: item?.unit || '' } : entry) });
                  }} options={[{ label: 'Choose ingredient', value: '' }, ...items.map((item) => ({ label: `${item.name} (${item.unit})`, value: item._id }))]} />
                  <div className="w-full sm:w-24">
                    <Input label="Quantity" type="number" min="0.001" step="0.001" required value={ingredient.quantity} onChange={(e) => setRecipeForm({ ...recipeForm, ingredients: recipeForm.ingredients.map((entry, row) => row === index ? { ...entry, quantity: e.target.value } : entry) })} />
                  </div>
                  <div className="w-full sm:w-28">
                    <Input label="Unit" required value={ingredient.unit} onChange={(e) => setRecipeForm({ ...recipeForm, ingredients: recipeForm.ingredients.map((entry, row) => row === index ? { ...entry, unit: e.target.value } : entry) })} placeholder="kg, g, pcs..." />
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
                    <Select label="Allowed substitute" value={ingredient.substituteItemId} onChange={(e) => {
                      const item = items.find((entry) => entry._id === e.target.value);
                      setRecipeForm({ ...recipeForm, ingredients: recipeForm.ingredients.map((entry, row) => row === index ? { ...entry, substituteItemId: e.target.value, substituteUnit: item?.unit || '' } : entry) });
                    }} options={[{ label: 'No substitute', value: '' }, ...items.filter((item) => item._id !== ingredient.itemId).map((item) => ({ label: `${item.name} (${item.unit})`, value: item._id }))]} />
                    <div className="w-full sm:w-24">
                      <Input label="Sub. qty" type="number" min="0.001" step="0.001" value={ingredient.substituteQuantity} onChange={(e) => setRecipeForm({ ...recipeForm, ingredients: recipeForm.ingredients.map((entry, row) => row === index ? { ...entry, substituteQuantity: e.target.value } : entry) })} />
                    </div>
                    <div className="w-full sm:w-28">
                      <Input label="Sub. unit" value={ingredient.substituteUnit} onChange={(e) => setRecipeForm({ ...recipeForm, ingredients: recipeForm.ingredients.map((entry, row) => row === index ? { ...entry, substituteUnit: e.target.value } : entry) })} />
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
          <Select label="Item" required value={transferForm.itemId} onChange={(e) => setTransferForm({ ...transferForm, itemId: e.target.value })} options={[{ label: 'Choose item', value: '' }, ...items.map((item) => ({ label: `${item.name} (${item.currentStock} ${item.unit})`, value: item._id }))]} />
          <Input label="Quantity" type="number" min="0.001" step="0.001" required value={transferForm.quantity} onChange={(e) => setTransferForm({ ...transferForm, quantity: e.target.value })} />
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
          <Select label="Product" required value={minibarAssignForm.itemId} onChange={(e) => setMinibarAssignForm({ ...minibarAssignForm, itemId: e.target.value })} options={[{ label: 'Choose product', value: '' }, ...items.map((item) => ({ label: `${item.name} (${item.currentStock} ${item.unit})`, value: item._id }))]} />
          <Input label="Quantity" type="number" min="0.001" step="0.001" required value={minibarAssignForm.quantity} onChange={(e) => setMinibarAssignForm({ ...minibarAssignForm, quantity: e.target.value })} />
          <Select label="Issue from location" value={minibarAssignForm.fromLocation} onChange={(e) => setMinibarAssignForm({ ...minibarAssignForm, fromLocation: e.target.value })} options={['Main Store', 'Minibar Store'].map((location) => ({ label: location, value: location }))} />
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setIsMinibarAssignOpen(false)}>Cancel</Button><Button type="submit">Assign stock</Button></div>
        </form>
      </Modal>

      <Modal isOpen={isAdjustmentOpen} onClose={() => setIsAdjustmentOpen(false)} title="Report Stock Adjustment" subtitle="An administrator must approve this adjustment before it affects stock">
        <form onSubmit={handleCreateAdjustment} className="space-y-4">
          <Select label="Item" required value={adjustmentForm.itemId} onChange={(e) => setAdjustmentForm({ ...adjustmentForm, itemId: e.target.value })} options={[{ label: 'Choose item', value: '' }, ...items.map((item) => ({ label: `${item.name} (${item.currentStock} ${item.unit})`, value: item._id }))]} />
          <Select label="Reason" value={adjustmentForm.reason} onChange={(e) => setAdjustmentForm({ ...adjustmentForm, reason: e.target.value })} options={[
            { label: 'Expired products', value: 'expired' },
            { label: 'Damaged products', value: 'damaged' },
            { label: 'Food wastage', value: 'food_wastage' },
            { label: 'Spillage', value: 'spillage' },
            { label: 'Missing stock', value: 'missing' },
            { label: 'Physical stock mismatch (enter counted total)', value: 'physical_mismatch' },
            { label: 'Internal usage', value: 'internal_usage' }
          ]} />
          <Input label={adjustmentForm.reason === 'physical_mismatch' ? 'Physical count (new total)' : 'Quantity affected'} type="number" min="0.001" step="0.001" required value={adjustmentForm.quantity} onChange={(e) => setAdjustmentForm({ ...adjustmentForm, quantity: e.target.value })} />
          <Input label="Department" value={adjustmentForm.department} onChange={(e) => setAdjustmentForm({ ...adjustmentForm, department: e.target.value })} />
          <Input label="Remarks" value={adjustmentForm.remarks} onChange={(e) => setAdjustmentForm({ ...adjustmentForm, remarks: e.target.value })} />
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setIsAdjustmentOpen(false)}>Cancel</Button><Button type="submit">Submit for approval</Button></div>
        </form>
      </Modal>

      <Modal isOpen={isVendorHistoryOpen} onClose={() => setIsVendorHistoryOpen(false)} title={`${selectedVendor?.name || 'Supplier'} purchase history`}>
        <div className="space-y-3">
          {vendorPurchases.map((po) => (
            <div key={po._id} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
              <div><p className="font-semibold">{po.poNumber}</p><p className="text-xs text-slate-500">{dayjs(po.createdAt).format('MMM D, YYYY')} · {po.status}</p></div>
              <span className="font-bold">{formatCurrency(po.totalAmount)}</span>
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
