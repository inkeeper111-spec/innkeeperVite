import React, { useState, useEffect } from 'react';
import api, { showApiErrorToast } from '../../api/axios';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useAuth } from '../../contexts/AuthContext';
import { useCurrency } from '../../hooks/useCurrency';
import {
  UtensilsCrossed,
  Plus,
  Minus,
  Trash2,
  Receipt,
  IndianRupee,
  CheckCircle2,
  Clock,
  Send,
  Building2,
  DollarSign,
  Pencil,
  History,
  Archive,
  CalendarDays,
  Filter,
  Printer
} from 'lucide-react';

const getTableLabel = (table, nameFallback = '') => {
  const name = table?.name?.trim() || nameFallback?.trim();
  return name ? `Table · ${name}` : 'Table';
};

const getLocalDateValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const BILLS_PER_PAGE = 10;

export const RestaurantPOS = () => {
  const { user, hotel } = useAuth();
  const { currencySymbol, formatCurrency } = useCurrency();
  const canManageTables = user?.role === 'hotel_admin' || user?.role === 'super_admin';
  const canArchiveBills = user?.role === 'hotel_admin';
  const [activeView, setActiveView] = useState('pos'); // 'pos' or 'kitchen'
  const [showTableManagement, setShowTableManagement] = useState(false);
  const [categories, setCategories] = useState([]);
  const [tables, setTables] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedCat, setSelectedCat] = useState('all');
  const [orders, setOrders] = useState([]);
  const [inHouseReservations, setInHouseReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Cart State
  const [cart, setCart] = useState([]);
  const [orderType, setOrderType] = useState('dine_in'); // dine_in, room_service, takeaway
  const [selectedTableId, setSelectedTableId] = useState('');
  const [selectedReservationId, setSelectedReservationId] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [message, setMessage] = useState('');
  const [isFolioModalOpen, setIsFolioModalOpen] = useState(false);
  const [selectedOrderForFolio, setSelectedOrderForFolio] = useState(null);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [tableForm, setTableForm] = useState({ name: '', capacity: 4, status: 'available' });
  const [tableError, setTableError] = useState('');
  const [billEdit, setBillEdit] = useState(null);
  const [billSaving, setBillSaving] = useState(false);
  const [billError, setBillError] = useState('');
  const [openModification, setOpenModification] = useState(null);
  const [selectedBill, setSelectedBill] = useState(null);
  const [billTableFilter, setBillTableFilter] = useState('all');
  const [billStartDate, setBillStartDate] = useState('');
  const [billEndDate, setBillEndDate] = useState('');
  const [billPage, setBillPage] = useState(1);
  const [showArchivedBills, setShowArchivedBills] = useState(false);
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);
  const [archiveBusy, setArchiveBusy] = useState(false);
  const [archiveError, setArchiveError] = useState('');
  const [updatingOrderIds, setUpdatingOrderIds] = useState(() => new Set());

  useEffect(() => {
    setBillPage(1);
  }, [billTableFilter, billStartDate, billEndDate, showArchivedBills]);

  const fetchMenuAndOrders = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const [menuRes, ordersRes, resvRes, tablesRes] = await Promise.all([
        api.get('/restaurant/menu'),
        api.get('/restaurant/orders'),
        api.get('/reservations?status=checked_in&limit=100'),
        api.get(`/restaurant/tables${canManageTables ? '?includeInactive=true' : ''}`)
      ]);

      if (menuRes.data.success) {
        setCategories(menuRes.data.data.categories);
        setMenuItems(menuRes.data.data.items);
      }
      if (ordersRes.data.success) {
        setOrders(ordersRes.data.data);
      }
      if (resvRes.data.success) {
        setInHouseReservations(resvRes.data.data.reservations);
      }
      if (tablesRes.data.success) {
        setTables(tablesRes.data.data);
      }
      return ordersRes.data.success ? ordersRes.data.data : null;
    } catch (e) {
      console.error(e);
      return null;
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenuAndOrders();
    const refreshInterval = window.setInterval(() => fetchMenuAndOrders(false), 15010);
    return () => window.clearInterval(refreshInterval);
  }, [canManageTables]);

  const addToCart = (item) => {
    setCart((prev) => {
      const existing = prev.find((i) => i._id === item._id);
      if (existing) {
        return prev.map((i) => (i._id === item._id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateCartQuantity = (itemId, delta) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i._id === itemId) {
            const newQty = i.quantity + delta;
            return newQty > 0 ? { ...i, quantity: newQty } : null;
          }
          return i;
        })
        .filter(Boolean)
    );
  };

  const clearCart = () => setCart([]);

  const subtotal = cart.reduce((acc, i) => acc + i.price * i.quantity, 0);
  const tax = Math.round(subtotal * 0.05 * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;

  const handlePlaceOrder = async (payDirectly = true) => {
    if (cart.length === 0) return;

    try {
      const selectedResv = inHouseReservations.find((r) => r._id === selectedReservationId);
      const selectedRoom = selectedResv?.rooms?.find((room) => (
        String(room.roomId?._id || room.roomId) === String(selectedRoomId)
      ));

      const payload = {
        orderType,
        tableId: orderType === 'dine_in' ? selectedTableId : undefined,
        roomId: selectedRoom?.roomId?._id || selectedRoom?.roomId,
        reservationId: selectedResv?._id,
        items: cart.map((i) => ({
          menuItemId: i._id,
          quantity: i.quantity
        }))
      };

      const res = await api.post('/restaurant/orders', payload);

      if (res.data.success) {
        const order = res.data.data;

        // If Room Service and guest requested transfer to room folio:
        if (orderType === 'room_service' && selectedReservationId) {
          await api.post('/restaurant/orders/transfer-to-folio', {
            orderId: order._id,
            reservationId: selectedReservationId
          });
          setMessage(`Order #${order.orderNumber} placed & transferred to Room ${selectedRoom?.roomNumber} Folio!`);
        } else {
          setMessage(`Order #${order.orderNumber} sent to kitchen!`);
        }

        clearCart();
        const tableLabel = tables.find((table) => table._id === selectedTableId);
        if (orderType === 'dine_in' && tableLabel) {
          const displayTableLabel = getTableLabel(tableLabel);
          setMessage(
            tableLabel.activeOrderId
              ? `Added to ${displayTableLabel}. You can keep adding items.`
              : `Order #${order.orderNumber} sent to ${displayTableLabel}. You can add another round.`
          );
        }
        fetchMenuAndOrders();
        setTimeout(() => setMessage(''), 4000);
      }
    } catch (err) {
      showApiErrorToast(err, 'Failed to place order');
    }
  };

  const handleSaveTable = async (e) => {
    e.preventDefault();
    setTableError('');
    try {
      if (editingTable) {
        await api.patch(`/restaurant/tables/${editingTable._id}`, {
          name: tableForm.name,
          capacity: Number(tableForm.capacity),
          status: tableForm.status
        });
      } else {
        await api.post('/restaurant/tables', {
          name: tableForm.name,
          capacity: Number(tableForm.capacity)
        });
      }
      setIsTableModalOpen(false);
      setEditingTable(null);
      setTableForm({ name: '', capacity: 4, status: 'available' });
      fetchMenuAndOrders();
    } catch (err) {
      setTableError(err.response?.data?.message || 'Failed to save table.');
    }
  };

  const handleToggleTable = async (table) => {
    try {
      await api.patch(`/restaurant/tables/${table._id}`, { isActive: !table.isActive });
      fetchMenuAndOrders();
    } catch (err) {
      showApiErrorToast(err, 'Failed to update table.');
    }
  };

  const handleSettleOrder = async (orderId) => {
    try {
      const res = await api.patch(`/restaurant/orders/${orderId}/settle`, { paymentMethod: 'cash' });
      setOrders((current) => current.map((order) => order._id === orderId ? res.data.data : order));
      setSelectedBill(res.data.data);
      setBillEdit(null);
      setBillError('');
      setActiveView('bills');
      setShowTableManagement(false);
      setMessage(res.data.message);
      fetchMenuAndOrders();
      setTimeout(() => setMessage(''), 4000);
    } catch (err) {
      showApiErrorToast(err, 'Failed to settle order.');
    }
  };

  const handlePrintReceipt = () => {
    const receipt = document.getElementById('printable-restaurant-receipt');
    if (!receipt) return;

    const printCopy = receipt.cloneNode(true);
    printCopy.id = 'printable-restaurant-receipt-print';
    document.body.appendChild(printCopy);

    const printPageStyle = document.createElement('style');
    printPageStyle.textContent = `
      @page { size: 80mm auto; margin: 4mm; }
      @media print {
        body > *:not(#printable-restaurant-receipt-print) { display: none !important; }
        #printable-restaurant-receipt { display: none !important; }
        #printable-restaurant-receipt-print {
          display: block !important;
          position: static !important;
          width: 72mm !important;
          max-width: 72mm !important;
          margin: 0 !important;
          padding: 2mm !important;
          background: white !important;
          color: black !important;
          font: 10pt/1.4 Arial, Helvetica, sans-serif !important;
        }
        #printable-restaurant-receipt-print,
        #printable-restaurant-receipt-print * { visibility: visible !important; }
      }
    `;
    document.head.appendChild(printPageStyle);

    const cleanup = () => {
      printCopy.remove();
      printPageStyle.remove();
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    window.print();
  };

  const handleArchivePreviousDayBills = async () => {
    setArchiveBusy(true);
    setArchiveError('');
    const now = new Date();
    const beforeDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    try {
      const { data } = await api.post('/restaurant/orders/archive-previous-day', { beforeDate });
      setMessage(data.message);
      setIsArchiveConfirmOpen(false);
      setShowArchivedBills(false);
      await fetchMenuAndOrders(false);
      setTimeout(() => setMessage(''), 4000);
    } catch (error) {
      setArchiveError(error.response?.data?.message || error.message || 'Unable to archive previous bills.');
    } finally {
      setArchiveBusy(false);
    }
  };

  const handleRestoreBill = async (orderId) => {
    try {
      const { data } = await api.patch(`/restaurant/orders/${orderId}/restore`);
      setOrders((current) => current.map((order) => order._id === orderId ? data.data : order));
      setSelectedBill(data.data);
      setMessage(data.message);
      setShowArchivedBills(false);
      setTimeout(() => setMessage(''), 4000);
    } catch (error) {
      showApiErrorToast(error, 'Unable to restore the archived bill.');
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    const requestId = String(orderId);
    if (updatingOrderIds.has(requestId)) return;
    setUpdatingOrderIds((current) => new Set(current).add(requestId));
    try {
      const { data } = await api.patch(`/restaurant/orders/${orderId}/status`, { status: newStatus });
      setOrders((current) => current.map((order) => order._id === orderId ? data.data : order));
      setSelectedBill((current) => current?._id === orderId ? data.data : current);
      fetchMenuAndOrders();
    } catch (err) {
      const latestOrders = await fetchMenuAndOrders(false);
      const latestOrder = latestOrders?.find((order) => String(order._id) === requestId);
      if (latestOrder?.status === newStatus) {
        setSelectedBill((current) => current?._id === requestId ? latestOrder : current);
        setMessage(`Order #${latestOrder.orderNumber} is ${newStatus}.`);
        setTimeout(() => setMessage(''), 4000);
      } else {
        showApiErrorToast(err, 'Failed to update order status. The latest order state has been loaded.');
      }
    } finally {
      setUpdatingOrderIds((current) => {
        const next = new Set(current);
        next.delete(requestId);
        return next;
      });
    }
  };

  const startBillEdit = (order) => {
    setBillError('');
    setOpenModification(null);
    setBillEdit({
      orderId: order._id,
      itemUnitPrices: Object.fromEntries(order.items.map((item, index) => [index, String(item.unitPrice)])),
      discountAmount: String(order.discountAmount || 0),
      reason: ''
    });
  };

  const cancelBillEdit = () => {
    setBillEdit(null);
    setBillError('');
  };

  const saveBillEdit = async (order) => {
    if (!billEdit?.reason.trim()) {
      setBillError('Enter a reason for the bill modification.');
      return;
    }

    const itemUnitPrices = {};
    for (const [index, item] of order.items.entries()) {
      const revised = Number(billEdit.itemUnitPrices[index]);
      if (!Number.isFinite(revised) || revised < 0) {
        setBillError(`Enter a valid unit price for ${item.name}.`);
        return;
      }
      itemUnitPrices[index] = revised;
    }
    if (!Number.isFinite(Number(billEdit.discountAmount)) || Number(billEdit.discountAmount) < 0) {
      setBillError('Enter a valid discount amount.');
      return;
    }

    setBillSaving(true);
    setBillError('');
    try {
      const response = await api.patch(`/restaurant/orders/${order._id}/bill-amounts`, {
        itemUnitPrices,
        discountAmount: Number(billEdit.discountAmount),
        reason: billEdit.reason.trim()
      });
      setOrders((current) => current.map((entry) => entry._id === order._id ? response.data.data : entry));
      setBillEdit(null);
      setMessage('Table bill amounts saved and audited.');
      setTimeout(() => setMessage(''), 4000);
    } catch (error) {
      setBillError(error.response?.data?.message || error.message || 'Unable to save bill changes.');
    } finally {
      setBillSaving(false);
    }
  };

  const handleTransferFolioDirect = async () => {
    if (!selectedOrderForFolio || !selectedReservationId) return;
    try {
      const res = await api.post('/restaurant/orders/transfer-to-folio', {
        orderId: selectedOrderForFolio._id,
        reservationId: selectedReservationId
      });
      if (res.data.success) {
        setIsFolioModalOpen(false);
        setMessage('Order charges transferred to Guest Room Folio.');
        fetchMenuAndOrders();
        setTimeout(() => setMessage(''), 4000);
      }
    } catch (err) {
      showApiErrorToast(err, 'Transfer failed');
    }
  };

  const filteredItems = menuItems.filter(
    (i) => selectedCat === 'all' || i.categoryId?._id === selectedCat || i.categoryId === selectedCat
  );
  const activeTables = tables.filter((table) => table.isActive);
  const occupiedRoomOptions = inHouseReservations.flatMap((reservation) => (
    (reservation.rooms || [])
      .filter((room) => room.roomId?.roomStatus === 'occupied')
      .map((room) => ({
        roomId: String(room.roomId._id),
        reservationId: reservation._id,
        roomNumber: room.roomNumber || room.roomId.roomNumber,
        guestName: reservation.guestName
      }))
  ));
  const selectedTable = activeTables.find((table) => table._id === selectedTableId) || null;
  const openTableOrder = selectedTable?.activeOrderId
    ? orders.find((order) => (
      String(order._id) === String(selectedTable.activeOrderId) && order.status !== 'cancelled'
    ))
    : null;
  const showTableFloor = orderType === 'dine_in' && !selectedTable;
  const tableBills = orders.filter((order) => (
    order.orderType === 'dine_in'
    && order.status !== 'cancelled'
  )).sort((first, second) => {
    const tableDifference = Number(first.tableId?.tableNumber || first.tableNumber?.match(/\d+/)?.[0] || 0)
      - Number(second.tableId?.tableNumber || second.tableNumber?.match(/\d+/)?.[0] || 0);
    return tableDifference || new Date(first.createdAt) - new Date(second.createdAt);
  });
  const filteredTableBills = tableBills.filter((order) => {
    if (!showArchivedBills && order.archivedAt) return false;
    if (showArchivedBills && !order.archivedAt) return false;
    if (billTableFilter !== 'all' && String(order.tableId?._id || order.tableId) !== billTableFilter) return false;
    const orderDate = getLocalDateValue(new Date(order.createdAt));
    if (billStartDate && orderDate < billStartDate) return false;
    if (billEndDate && orderDate > billEndDate) return false;
    return true;
  });
  const billPageCount = Math.ceil(filteredTableBills.length / BILLS_PER_PAGE);
  const currentBillPage = Math.min(billPage, Math.max(1, billPageCount));
  const visibleTableBills = filteredTableBills.slice(
    (currentBillPage - 1) * BILLS_PER_PAGE,
    currentBillPage * BILLS_PER_PAGE
  );
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const previousDayClosedBillCount = tableBills.filter((order) => (
    !order.archivedAt
    && ['paid', 'transferred_to_folio'].includes(order.paymentStatus)
    && new Date(order.createdAt) < todayStart
  )).length;
  const ModificationIndicator = ({ order, field, itemIndex }) => {
    const modifications = (order.amountModifications || []).filter((entry) => (
      entry.field === field && (itemIndex === undefined || entry.itemIndex === itemIndex)
    ));
    if (!modifications.length) return null;
    const latest = modifications.at(-1);
    const tooltipId = `amount-modification-${order._id}-${field}-${itemIndex ?? 'discount'}`;
    const isOpen = openModification === tooltipId;

    return (
      <span className="relative inline-flex align-middle">
        <button
          type="button"
          aria-label={`Amount modified from ${formatCurrency(latest.originalAmount)} to ${formatCurrency(latest.revisedAmount)}`}
          aria-describedby={isOpen ? tooltipId : undefined}
          onMouseEnter={() => setOpenModification(tooltipId)}
          onMouseLeave={() => setOpenModification((current) => current === tooltipId ? null : current)}
          onFocus={() => setOpenModification(tooltipId)}
          onBlur={() => setOpenModification((current) => current === tooltipId ? null : current)}
          onClick={(event) => {
            event.stopPropagation();
            setOpenModification((current) => current === tooltipId ? null : tooltipId);
          }}
          className="ml-1 rounded p-0.5 text-amber-600 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-300"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        {isOpen && (
          <span
            role="tooltip"
            id={tooltipId}
            className="absolute bottom-full left-1/2 z-30 mb-2 w-64 -translate-x-1/2 rounded-lg bg-slate-900 p-3 text-left text-[11px] normal-case leading-relaxed text-white shadow-xl"
          >
            <strong className="block text-xs">Amount modified</strong>
            <span>{formatCurrency(latest.originalAmount)} → {formatCurrency(latest.revisedAmount)}</span>
            <span className="block">by {latest.editorName || 'Authorized staff'}</span>
            {latest.reason && <span className="mt-1 block text-slate-300">Reason: {latest.reason}</span>}
            {latest.timestamp && <span className="mt-1 block text-slate-400">{new Date(latest.timestamp).toLocaleString()}</span>}
          </span>
        )}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Restaurant POS & Kitchen Display</h1>
          <p className="text-xs text-slate-500 mt-1">
            Table management, room service orders, kitchen display system (KDS), and direct room folio charging
          </p>
        </div>

        {/* View Switcher */}
        <div className="grid w-full grid-cols-1 gap-1 rounded-xl bg-slate-200/80 p-1 sm:w-auto sm:grid-cols-3">
          <button
            onClick={() => {
              setActiveView('pos');
              setShowTableManagement(false);
              setOrderType('dine_in');
              setSelectedReservationId('');
              setSelectedRoomId('');
            }}
            className={`rounded-lg px-4 py-2 text-center text-xs font-bold transition-all ${
              activeView === 'pos' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Terminal POS
          </button>
          <button
            onClick={() => setActiveView('bills')}
            className={`rounded-lg px-4 py-2 text-center text-xs font-bold transition-all ${
              activeView === 'bills' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Table Bills
          </button>
          <button
            onClick={() => setActiveView('kitchen')}
            className={`rounded-lg px-4 py-2 text-center text-xs font-bold transition-all ${
              activeView === 'kitchen' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Kitchen Display (KDS)
          </button>
        </div>
      </div>

      {canManageTables && (
        <div className="flex justify-end">
          <Button
            variant={showTableManagement ? 'secondary' : 'outline'}
            onClick={() => setShowTableManagement((visible) => !visible)}
          >
            {showTableManagement ? 'Back to POS' : 'Manage Tables'}
          </Button>
        </div>
      )}

      {message && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {showTableManagement && canManageTables ? (
        <Card>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Restaurant Tables</h2>
              <p className="text-xs text-slate-500">Table numbers are assigned automatically.</p>
            </div>
            <Button
              variant="primary"
              icon={Plus}
              onClick={() => {
                setEditingTable(null);
                setTableForm({ name: '', capacity: 4, status: 'available' });
                setTableError('');
                setIsTableModalOpen(true);
              }}
            >
              Add Table
            </Button>
          </div>
          {loading ? (
            <LoadingSpinner text="Loading restaurant tables..." />
          ) : tables.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No tables configured for this restaurant.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {tables.map((table) => {
                const activeOrder = orders.find((order) => String(order._id) === String(table.activeOrderId));
                return (
                  <div key={table._id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4">
                    <div>
                      <p className="font-bold text-slate-900">{getTableLabel(table)}</p>
                      <p className="text-xs capitalize text-slate-500">Capacity {table.capacity} · {table.currentStatus}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {table.currentStatus === 'occupied' && activeOrder && (
                        <Button
                          size="sm"
                          variant="gold"
                          icon={Receipt}
                          onClick={() => {
                            setSelectedBill(activeOrder);
                            setBillEdit(null);
                            setBillError('');
                            setActiveView('bills');
                            setShowTableManagement(false);
                          }}
                        >
                          Settle / generate bill
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingTable(table);
                          setTableForm({
                            name: table.name || '',
                            capacity: table.capacity,
                            status: table.status
                          });
                          setTableError('');
                          setIsTableModalOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant={table.isActive ? 'danger' : 'success'}
                        disabled={table.currentStatus === 'occupied'}
                        onClick={() => handleToggleTable(table)}
                      >
                        {table.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      ) : activeView === 'pos' && (
        <div className="space-y-4">
          <div className="grid max-w-lg grid-cols-3 gap-1.5 rounded-xl bg-slate-100 p-1">
            {['dine_in', 'room_service', 'takeaway'].map((type) => (
              <button
                key={type}
                onClick={() => setOrderType(type)}
                className={`rounded-lg py-2 text-[11px] font-bold capitalize transition-all ${
                  orderType === type ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                }`}
              >
                {type.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          {showTableFloor ? (
            <Card>
              <div className="mb-4">
                <h2 className="text-lg font-black text-slate-900">Select a table</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Tap any open or occupied table. The menu opens for that table, and you can keep adding items to it.
                </p>
              </div>
              {loading ? (
                <LoadingSpinner text="Loading restaurant tables..." />
              ) : activeTables.length === 0 ? (
                <p className="py-8 text-center text-sm text-rose-600">No active restaurant tables are configured.</p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {activeTables.map((table) => {
                    const occupied = table.currentStatus === 'occupied';
                    const reserved = table.currentStatus === 'reserved';
                    return (
                      <button
                        key={table._id}
                        type="button"
                        disabled={reserved}
                        onClick={() => setSelectedTableId(table._id)}
                        className={`rounded-2xl border p-4 text-left transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                          occupied
                            ? 'border-amber-300 bg-amber-50 hover:border-amber-500 hover:shadow-md'
                            : 'border-slate-200 bg-white hover:border-brand-500 hover:shadow-md'
                        }`}
                      >
                        <span className="block text-lg font-black text-slate-900">
                          {getTableLabel(table)}
                        </span>
                        <span className="mt-1 block text-xs capitalize text-slate-500">
                          {table.currentStatus} · {table.capacity} seats
                        </span>
                        <span className={`mt-3 block text-xs font-bold ${occupied ? 'text-amber-800' : 'text-brand-700'}`}>
                          {occupied ? 'Open menu and add more items' : reserved ? 'Reserved' : 'Open menu'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </Card>
          ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Menu Catalog (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            {orderType === 'dine_in' && selectedTable && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div>
                  <p className="text-sm font-black text-slate-900">
                    {getTableLabel(selectedTable)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {openTableOrder
                      ? `Bill #${openTableOrder.orderNumber} is open. Add another round whenever you need to.`
                      : 'Choose items and send them to this table. You can add more after the first round.'}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    clearCart();
                    setSelectedTableId('');
                  }}
                >
                  All tables
                </Button>
              </div>
            )}
            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-2 pb-2">
              <button
                onClick={() => setSelectedCat('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedCat === 'all'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                All Menu Items
              </button>
              {categories.map((c) => (
                <button
                  key={c._id}
                  onClick={() => setSelectedCat(c._id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedCat === c._id
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>

            {/* Menu Items Grid */}
            {loading ? (
              <LoadingSpinner text="Loading culinary menu..." />
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filteredItems.map((item) => (
                  <button
                    key={item._id}
                    onClick={() => addToCart(item)}
                    disabled={item.fulfillmentSource === 'batch_production' && Number(item.availablePreparedPortions || 0) <= 0}
                    className="p-4 bg-white rounded-xl border border-slate-200/80 hover:border-brand-500 hover:shadow-md transition-all text-left flex flex-col justify-between group h-36 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs line-clamp-1 group-hover:text-brand-600 transition-colors">
                        {item.name}
                      </h4>
                      {item.fulfillmentSource === 'batch_production' && (
                        <span className="mt-1 inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-800 ring-1 ring-amber-200">
                          {Number(item.availablePreparedPortions || 0) > 0
                            ? `From bulk production · ${Number(item.availablePreparedPortions)} available`
                            : 'Bulk production depleted'}
                        </span>
                      )}
                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                        {item.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between w-full pt-2 border-t border-slate-100">
                      <span className="font-black text-slate-900 text-sm">
                        {formatCurrency(item.price)}
                      </span>
                      <span className="w-6 h-6 rounded-lg bg-brand-50 group-hover:bg-brand-600 text-brand-600 group-hover:text-white flex items-center justify-center transition-colors">
                        <Plus className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* POS Cart Sidebar (1 col) */}
          <div>
            <Card className="lg:sticky lg:top-20">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-sm">Active Order Ticket</h3>
                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-xs text-rose-500 hover:text-rose-700 font-semibold"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {orderType === 'dine_in' && selectedTable && (
                <div className="my-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-bold text-slate-900">
                    Assigning to {getTableLabel(selectedTable)}
                  </p>
                  <p className="mt-0.5 text-[11px] capitalize text-slate-500">
                    {selectedTable.currentStatus} · {selectedTable.capacity} seats
                  </p>
                </div>
              )}

              {openTableOrder && orderType === 'dine_in' && (
                <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-amber-900">
                    Already on this table
                  </p>
                  <div className="mt-2 space-y-1">
                    {openTableOrder.items.map((item, index) => (
                      <div key={`${openTableOrder._id}-${index}`} className="flex justify-between text-xs text-slate-700">
                        <span>{item.quantity}x {item.name}</span>
                        <span className="font-mono">{formatCurrency(item.amount)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex justify-between border-t border-amber-200 pt-2 text-xs font-bold text-amber-950">
                    <span>Open bill</span>
                    <span>{formatCurrency(openTableOrder.totalAmount)}</span>
                  </div>
                </div>
              )}

              {orderType === 'room_service' && (
                <div className="mb-3 mt-3">
                  <Select
                    label="Deliver to Room / Guest"
                    value={selectedRoomId}
                    onChange={(e) => {
                      const roomOption = occupiedRoomOptions.find((room) => room.roomId === e.target.value);
                      setSelectedRoomId(roomOption?.roomId || '');
                      setSelectedReservationId(roomOption?.reservationId || '');
                    }}
                  >
                    <option value="">-- Choose In-House Room --</option>
                    {occupiedRoomOptions.map((room) => (
                      <option key={room.roomId} value={room.roomId}>
                        Room {room.roomNumber} - {room.guestName}
                      </option>
                    ))}
                  </Select>
                </div>
              )}

              {orderType === 'dine_in' && openTableOrder && (
                <p className="mt-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">New round</p>
              )}

              {/* Cart Line Items */}
              <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 my-3">
                {cart.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    {orderType === 'dine_in'
                      ? 'Tap menu items to assign them to this table.'
                      : 'Cart is empty. Click menu items to add.'}
                  </div>
                ) : (
                  cart.map((i) => (
                    <div key={i._id} className="flex items-center justify-between gap-2 py-2.5 text-xs">
                      <div className="min-w-0 flex-1 pr-1">
                        <p className="font-semibold text-slate-800 truncate">{i.name}</p>
                        <p className="text-[11px] text-slate-400">{formatCurrency(i.price)} each</p>
                        {i.fulfillmentSource === 'batch_production' && (
                          <p className="text-[10px] font-semibold text-amber-700">Fulfilled from bulk production</p>
                        )}
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-0.5 rounded-lg">
                          <button
                            onClick={() => updateCartQuantity(i._id, -1)}
                            className="text-slate-500 hover:text-slate-800"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-bold text-slate-800 px-1">{i.quantity}</span>
                          <button
                            onClick={() => updateCartQuantity(i._id, 1)}
                            className="text-slate-500 hover:text-slate-800"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="font-bold text-slate-900 w-12 text-right">
                          {formatCurrency(i.price * i.quantity)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Bill Totals */}
              <div className="border-t border-slate-100 pt-3 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal:</span>
                  <span className="font-mono font-medium">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>F&B Tax (5%):</span>
                  <span className="font-mono font-medium">{formatCurrency(tax)}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-slate-900 border-t border-slate-100 pt-2">
                  <span>Order Total:</span>
                  <span className="font-mono">{formatCurrency(total)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 space-y-2">
                {orderType === 'room_service' && selectedReservationId ? (
                  <Button
                    variant="gold"
                    className="w-full"
                    disabled={cart.length === 0}
                    onClick={() => handlePlaceOrder(false)}
                  >
                    Transfer {formatCurrency(total)} to Room Folio
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    className="w-full"
                    disabled={cart.length === 0 || (orderType === 'dine_in' && !selectedTable)}
                    onClick={() => handlePlaceOrder(true)}
                  >
                    {orderType === 'dine_in' && selectedTable
                      ? `${openTableOrder ? 'Add to' : 'Send to'} ${getTableLabel(selectedTable)} (${formatCurrency(total)})`
                      : `Send to Kitchen (${formatCurrency(total)})`}
                  </Button>
                )}
                {orderType === 'dine_in' && selectedTable && (
                  <p className="text-center text-[11px] text-slate-500">
                    The menu stays on this table, so you can send another round right away.
                  </p>
                )}
              </div>
            </Card>
          </div>
        </div>
          )}
        </div>
      )}

      {/* Table-wise Restaurant Billing */}
      {activeView === 'bills' && !showTableManagement && (
        <div className="space-y-4">
          {loading ? (
            <LoadingSpinner text="Loading table bills..." />
          ) : (
            <>
              <Card className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <Select
                    className="[&>div>button]:h-[50px]"
                    label="Filter by table"
                    value={billTableFilter}
                    onChange={(event) => setBillTableFilter(event.target.value)}
                  >
                    <option value="all">All tables</option>
                    {tables.map((table) => (
                      <option key={table._id} value={table._id}>
                        {getTableLabel(table, `Table ${table.tableNumber}`)}
                      </option>
                    ))}
                  </Select>
                  <Input
                    label="From date"
                    type="date"
                    className="h-[50px]"
                    value={billStartDate}
                    onChange={(event) => setBillStartDate(event.target.value)}
                  />
                  <Input
                    label="To date"
                    type="date"
                    className="h-[50px]"
                    value={billEndDate}
                    min={billStartDate || undefined}
                    onChange={(event) => setBillEndDate(event.target.value)}
                  />
                  <div className="flex items-end">
                    <Button
                      className="h-[50px] w-full"
                      variant={showArchivedBills ? 'secondary' : 'outline'}
                      icon={Filter}
                      onClick={() => setShowArchivedBills((visible) => !visible)}
                    >
                      {showArchivedBills ? 'Showing archived' : 'Show archived'}
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col gap-3 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-slate-500">
                    {filteredTableBills.length} {showArchivedBills ? 'archived' : 'active'} table bill{filteredTableBills.length === 1 ? '' : 's'}
                  </p>
                  {canArchiveBills && !showArchivedBills && (
                    <Button
                      size="sm"
                      variant="outline"
                      icon={Archive}
                      disabled={previousDayClosedBillCount === 0}
                      onClick={() => {
                        setArchiveError('');
                        setIsArchiveConfirmOpen(true);
                      }}
                    >
                      Clear previous day bills ({previousDayClosedBillCount})
                    </Button>
                  )}
                </div>
              </Card>

              {filteredTableBills.length === 0 ? (
                <Card className="py-12 text-center">
                  <IndianRupee className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                  <p className="text-sm font-semibold text-slate-500">
                    {showArchivedBills ? 'No archived table bills match these filters' : 'No table bills match these filters'}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {tableBills.length === 0
                      ? 'A table bill appears here as soon as the first dine-in order is sent to the kitchen.'
                      : 'Change the selected table or date range to see other bills.'}
                  </p>
                </Card>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {visibleTableBills.map((order) => (
                      <Card key={order._id} className="h-full border-slate-200 transition-shadow hover:shadow-md">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBill(order);
                            setBillEdit(null);
                            setBillError('');
                          }}
                          className="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h2 className="truncate text-base font-black text-slate-900">
                                {getTableLabel(order.tableId, order.tableNameSnapshot)}
                              </h2>
                              <p className="mt-1 truncate text-[11px] text-slate-500">Bill #{order.orderNumber}</p>
                            </div>
                            <div className="flex shrink-0 flex-wrap justify-end gap-1">
                              <Badge variant={order.status}>{order.status}</Badge>
                              <Badge variant={order.archivedAt ? 'default' : order.paymentStatus}>
                                {order.archivedAt ? 'archived' : order.paymentStatus === 'transferred_to_folio' ? 'folio' : order.paymentStatus}
                              </Badge>
                            </div>
                          </div>
                          <div className="mt-4 flex items-end justify-between gap-3 border-t border-slate-100 pt-3">
                            <div className="min-w-0 text-[11px] text-slate-500">
                              <p>Opened {new Date(order.createdAt).toLocaleString()}</p>
                              <p className="mt-1">{order.items.length} item line{order.items.length === 1 ? '' : 's'} · {order.items.reduce((sum, item) => sum + item.quantity, 0)} total items</p>
                            </div>
                            <span className="shrink-0 text-lg font-black text-slate-900">{formatCurrency(order.totalAmount)}</span>
                          </div>
                          <p className="mt-3 text-xs font-semibold text-amber-800">Open detailed bill</p>
                        </button>
                      </Card>
                    ))}
                  </div>
                  {billPageCount > 1 && (
                    <div
                      className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between"
                      role="navigation"
                      aria-label="Table bill pagination"
                    >
                      <span>
                        Showing {(currentBillPage - 1) * BILLS_PER_PAGE + 1}–{Math.min(currentBillPage * BILLS_PER_PAGE, filteredTableBills.length)} of {filteredTableBills.length} table bills
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={currentBillPage <= 1}
                          onClick={() => setBillPage(Math.max(1, currentBillPage - 1))}
                        >
                          Previous
                        </Button>
                        <span className="min-w-20 text-center">Page {currentBillPage} of {billPageCount}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={currentBillPage >= billPageCount}
                          onClick={() => setBillPage(Math.min(billPageCount, currentBillPage + 1))}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}

              <Modal
                isOpen={Boolean(selectedBill)}
                onClose={() => {
                  setSelectedBill(null);
                  setBillEdit(null);
                  setBillError('');
                }}
                title={selectedBill ? `${getTableLabel(selectedBill.tableId, selectedBill.tableNameSnapshot)} · Bill #${selectedBill.orderNumber}` : 'Table bill'}
                subtitle={selectedBill ? `Opened ${new Date(selectedBill.createdAt).toLocaleString()}` : undefined}
                maxWidth="max-w-3xl"
              >
                {selectedBill && (
                  <div className="grid grid-cols-1 gap-4">
                    {[selectedBill].map((order) => {
                const editing = billEdit?.orderId === order._id;
                const canEdit = order.paymentStatus === 'unpaid'
                  && !['cancelled', 'served'].includes(order.status);
                const isClosed = ['paid', 'transferred_to_folio'].includes(order.paymentStatus);
                const nextStatus = {
                  pending: { status: 'preparing', label: 'Start preparation' },
                  preparing: { status: 'ready', label: 'Mark ready' },
                  ready: { status: 'served', label: 'Mark served' }
                }[order.status];
                const lifecycleStages = ['pending', 'preparing', 'ready', 'served', 'closed'];
                const currentStage = isClosed ? lifecycleStages.length - 1 : lifecycleStages.indexOf(order.status);
                const tableLabel = getTableLabel(order.tableId, order.tableNameSnapshot);

                return (
                  <Card key={order._id} className="h-fit border-slate-200">
                    {isClosed ? (
                      <>
                        <div className="print:hidden mb-3 flex justify-end">
                          <Button size="sm" variant="outline" icon={Printer} onClick={handlePrintReceipt}>
                            Print receipt
                          </Button>
                        </div>
                        <div id="printable-restaurant-receipt" className="restaurant-print-receipt mx-auto w-full max-w-[360px] bg-white px-5 py-5 font-mono text-xs text-slate-900">
                          <header className="border-b border-dashed border-slate-400 pb-3 text-center">
                            <h1 className="break-words text-lg font-black tracking-wide">{hotel?.name || 'Hotel'}</h1>
                            <h2 className="mt-1 text-sm font-bold tracking-wider">RESTAURANT RECEIPT</h2>
                            <p className="mt-1">{tableLabel}</p>
                          </header>
                          <div className="space-y-1 border-b border-dashed border-slate-400 py-3">
                            <p className="flex justify-between gap-2"><span>Bill</span><span>#{order.orderNumber}</span></p>
                            <p className="flex justify-between gap-2"><span>Opened</span><span>{new Date(order.createdAt).toLocaleString()}</span></p>
                            <p className="flex justify-between gap-2"><span>Payment</span><span>{order.paymentStatus === 'paid' ? `Paid · ${order.paymentMethod || 'cash'}` : 'Transferred to folio'}</span></p>
                          </div>
                          <div className="space-y-3 border-b border-dashed border-slate-400 py-3">
                            {order.items.map((item, index) => (
                              <div key={`${order._id}-receipt-${index}`}>
                                <p className="break-words font-semibold">{item.name}</p>
                                <div className="mt-0.5 flex justify-between gap-2 text-[11px]">
                                  <span>{item.quantity} × {formatCurrency(item.unitPrice)}</span>
                                  <span>{formatCurrency(item.amount)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="space-y-1.5 border-b border-dashed border-slate-400 py-3">
                            <p className="flex justify-between gap-2"><span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span></p>
                            <p className="flex justify-between gap-2"><span>Tax</span><span>{formatCurrency(order.taxAmount)}</span></p>
                            {order.discountAmount > 0 && (
                              <p className="flex justify-between gap-2"><span>Discount</span><span>−{formatCurrency(order.discountAmount)}</span></p>
                            )}
                            <p className="flex justify-between gap-2 pt-1 text-sm font-black"><span>Total</span><span>{formatCurrency(order.totalAmount)}</span></p>
                          </div>
                          <footer className="pt-3 text-center text-[10px]">
                            <p>{new Date(order.updatedAt).toLocaleString()}</p>
                            <p className="mt-1">Thank you. Please visit again.</p>
                          </footer>
                        </div>
                      </>
                    ) : (
                    <>
                    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                      <div>
                        <h2 className="text-lg font-black text-slate-900">{tableLabel}</h2>
                        <p className="text-[11px] text-slate-500">
                          Bill #{order.orderNumber} · Opened {new Date(order.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <Badge variant={order.status}>{order.status}</Badge>
                        <Badge variant={isClosed ? 'paid' : order.paymentStatus}>{isClosed ? 'closed' : 'unpaid'}</Badge>
                      </div>
                    </div>

                    <ol aria-label={`Bill progress for ${tableLabel}`} className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
                      {['Opened', 'Preparing', 'Ready', 'Served', 'Closed'].map((stage, index) => {
                        const completed = index <= currentStage;
                        const stageTime = index === 0 ? order.createdAt
                          : index === lifecycleStages.length - 1 && isClosed ? order.updatedAt
                            : null;
                        return (
                          <li
                            key={stage}
                            className={`min-w-0 border-l-2 px-2 py-1 ${
                              completed ? 'border-emerald-500 text-emerald-800' : 'border-slate-200 text-slate-400'
                            }`}
                          >
                            <span className="block text-[10px] font-bold uppercase tracking-wide">{stage}</span>
                            {stageTime && (
                              <time className="mt-0.5 block truncate text-[9px] text-slate-500" dateTime={new Date(stageTime).toISOString()}>
                                {new Date(stageTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                              </time>
                            )}
                          </li>
                        );
                      })}
                    </ol>

                    {editing && billError && (
                      <div role="alert" className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">
                        {billError}
                      </div>
                    )}

                    <div className="mt-3 table-scroll sm:hidden">
                      <div className="space-y-2">
                        {order.items.map((item, index) => (
                          <div key={`${order._id}-mobile-${index}`} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs">
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-800">{item.name}</p>
                              <p className="text-slate-500">Qty {item.quantity}</p>
                            </div>
                            {editing ? (
                              <div className="flex w-28 items-center rounded border border-slate-200 bg-white px-2">
                                <span className="text-[10px] font-semibold text-slate-400">{currencySymbol}</span>
                                <input
                                  aria-label={`Unit price for ${item.name} on mobile`}
                                  type="number" min="0" step="0.01"
                                  value={billEdit.itemUnitPrices[index] ?? ''}
                                  onChange={(event) => setBillEdit((current) => ({
                                    ...current,
                                    itemUnitPrices: {
                                      ...current.itemUnitPrices,
                                      [index]: event.target.value
                                    }
                                  }))}
                                  className="h-8 min-w-0 flex-1 text-right text-xs outline-none" />
                              </div>
                            ) : (
                              <span className="shrink-0 font-mono font-semibold text-slate-800">{formatCurrency(item.amount)}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="mt-3 hidden overflow-x-auto sm:block">
                      <table className="w-full min-w-[520px] text-left">
                        <thead>
                          <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            <th className="pb-2 pr-3">Item</th>
                            <th className="pb-2 px-2 text-right">Qty</th>
                            <th className="pb-2 px-2 text-right">Unit price</th>
                            <th className="pb-2 pl-2 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {order.items.map((item, index) => {
                            const unitPriceModifications = (order.amountModifications || []).filter((entry) => (
                              entry.field === 'unitPrice' && entry.itemIndex === index
                            ));
                            const displayedUnitPrice = editing
                              ? billEdit.itemUnitPrices[index]
                              : item.unitPrice;
                            const validUnitPrice = Number(displayedUnitPrice);
                            const lineAmount = Number.isFinite(validUnitPrice)
                              ? validUnitPrice * item.quantity
                              : item.amount;

                            return (
                              <tr key={`${order._id}-${index}`} className="border-b border-slate-50 text-xs">
                                <td className="py-3 pr-3 font-semibold text-slate-800">
                                  {item.name}
                                  {item.fulfillmentSource === 'batch_production' && (
                                    <span className="mt-1 block text-[10px] font-semibold text-amber-700">From bulk production</span>
                                  )}
                                </td>
                                <td className="px-2 py-3 text-right text-slate-600">{item.quantity}</td>
                                <td className="px-2 py-3 text-right">
                                  {editing ? (
                                    <div className="ml-auto flex items-center justify-end">
                                      <IndianRupee className="h-3 w-3 text-slate-400" />
                                      <input
                                        aria-label={`Unit price for ${item.name}`}
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={billEdit.itemUnitPrices[index]}
                                        onChange={(event) => setBillEdit((current) => ({
                                          ...current,
                                          itemUnitPrices: {
                                            ...current.itemUnitPrices,
                                            [index]: event.target.value
                                          }
                                        }))}
                                        className="h-8 w-24 rounded-lg border border-slate-300 px-2 text-right text-xs font-semibold outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                                      />
                                    </div>
                                  ) : (
                                    <span className="inline-flex items-center justify-end font-mono font-medium text-slate-700">
                                      {formatCurrency(item.unitPrice)}
                                      {unitPriceModifications.length > 0 && (
                                        <ModificationIndicator order={order} field="unitPrice" itemIndex={index} />
                                      )}
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 pl-2 text-right font-mono font-bold text-slate-900">
                                  {formatCurrency(lineAmount)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="ml-auto mt-4 w-full max-w-xs space-y-2 text-xs">
                      <div className="flex items-center justify-between text-slate-500">
                        <span>Subtotal</span>
                        <span className="font-mono font-medium">
                          {formatCurrency(editing
                            ? order.items.reduce((sum, item) => sum + (Number(billEdit.itemUnitPrices[order.items.indexOf(item)]) || 0) * item.quantity, 0)
                            : order.subtotal)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-500">
                        <span>Tax (5%)</span>
                        <span className="font-mono font-medium">
                          {formatCurrency(editing
                            ? (order.items.reduce((sum, item) => sum + (Number(billEdit.itemUnitPrices[order.items.indexOf(item)]) || 0) * item.quantity, 0) * 0.05)
                            : order.taxAmount)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-500">
                        <span>Discount</span>
                        {editing ? (
                          <div className="flex items-center">
                            <IndianRupee className="h-3 w-3 text-slate-400" />
                            <input
                              aria-label="Bill discount"
                              type="number"
                              min="0"
                              step="0.01"
                              value={billEdit.discountAmount}
                              onChange={(event) => setBillEdit((current) => ({ ...current, discountAmount: event.target.value }))}
                              className="h-8 w-24 rounded-lg border border-slate-300 px-2 text-right text-xs font-semibold outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                            />
                          </div>
                        ) : (
                          <span className="inline-flex items-center font-mono font-medium">
                            −{formatCurrency(order.discountAmount)}
                            {(order.amountModifications || []).some((entry) => entry.field === 'discountAmount') && (
                              <ModificationIndicator order={order} field="discountAmount" />
                            )}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-base font-black text-slate-900">
                        <span>Grand total</span>
                        <span className="font-mono">
                          {formatCurrency(editing
                            ? (() => {
                                const previewSubtotal = order.items.reduce((sum, item) => sum + (Number(billEdit.itemUnitPrices[order.items.indexOf(item)]) || 0) * item.quantity, 0);
                                return Math.max(0, previewSubtotal - (Number(billEdit.discountAmount) || 0) + previewSubtotal * 0.05);
                              })()
                            : order.totalAmount)}
                        </span>
                      </div>
                    </div>

                    {editing ? (
                      <div className="mt-4 border-t border-slate-100 pt-3">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500" htmlFor={`bill-reason-${order._id}`}>
                          Reason for modification
                        </label>
                        <input
                          id={`bill-reason-${order._id}`}
                          value={billEdit.reason}
                          onChange={(event) => setBillEdit((current) => ({ ...current, reason: event.target.value }))}
                          placeholder="e.g. Manager-approved complimentary correction"
                          className="mt-1.5 h-9 w-full rounded-lg border border-slate-300 px-3 text-xs outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                        />
                        <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                          <Button size="sm" variant="secondary" disabled={billSaving} onClick={cancelBillEdit}>Cancel</Button>
                          <Button size="sm" variant="primary" disabled={billSaving} onClick={() => saveBillEdit(order)}>
                            {billSaving ? 'Saving…' : 'Save changes'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
                        {canEdit && (
                          <Button size="sm" variant="outline" icon={Pencil} onClick={() => startBillEdit(order)}>
                            Edit amounts
                          </Button>
                        )}
                        {nextStatus && order.paymentStatus === 'unpaid' && (
                          <Button size="sm" variant="primary" onClick={() => handleUpdateOrderStatus(order._id, nextStatus.status)}>
                            {nextStatus.label}
                          </Button>
                        )}
                        {order.status === 'served' && order.paymentStatus === 'unpaid' && (
                          <Button size="sm" variant="primary" icon={Receipt} onClick={() => handleSettleOrder(order._id)}>
                            Close bill · Settle {formatCurrency(order.totalAmount)}
                          </Button>
                        )}
                        {isClosed && (
                          <span className="text-[11px] font-semibold text-emerald-700">
                            {order.paymentStatus === 'paid'
                              ? `Closed ${order.paymentMethod ? `· ${order.paymentMethod}` : ''} · ${new Date(order.updatedAt).toLocaleString()}`
                              : 'Transferred to guest folio · Closed'}
                          </span>
                        )}
                        {order.archivedAt && canArchiveBills && (
                          <Button size="sm" variant="outline" icon={Archive} onClick={() => handleRestoreBill(order._id)}>
                            Restore to active bills
                          </Button>
                        )}
                        {!canEdit && !nextStatus && !isClosed && order.paymentStatus === 'unpaid' && (
                          <span className="text-[11px] font-semibold text-slate-400">Finalized billing is read-only</span>
                        )}
                      </div>
                    )}

                    {(order.amountModifications || []).length > 0 && (
                      <details className="mt-3 rounded-lg border border-amber-100 bg-amber-50/60 p-3">
                        <summary className="flex cursor-pointer items-center gap-1.5 text-[11px] font-bold text-amber-800">
                          <History className="h-3.5 w-3.5" /> Modification audit ({order.amountModifications.length})
                        </summary>
                        <div className="mt-2 space-y-2">
                          {[...order.amountModifications].reverse().map((entry, index) => (
                            <div key={`${entry.timestamp}-${index}`} className="text-[10px] leading-relaxed text-slate-600">
                              <strong>{entry.field === 'unitPrice' ? `Item ${entry.itemIndex + 1} unit price` : 'Discount'}</strong>
                              : {formatCurrency(entry.originalAmount)} → {formatCurrency(entry.revisedAmount)} by {entry.editorName || 'Authorized staff'}
                              {entry.reason && <span className="block">Reason: {entry.reason}</span>}
                              {entry.timestamp && <span className="block text-slate-400">{new Date(entry.timestamp).toLocaleString()}</span>}
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                    </>
                    )}
                  </Card>
                );
              })}
            </div>
                )}
              </Modal>

              <Modal
                isOpen={isArchiveConfirmOpen}
                onClose={() => {
                  if (!archiveBusy) setIsArchiveConfirmOpen(false);
                }}
                title="Clear previous day bills?"
                subtitle="This archives closed bills from the active list. It does not delete financial records."
                closeOnEscape={!archiveBusy}
                footer={
                  <>
                    <Button
                      variant="secondary"
                      disabled={archiveBusy}
                      onClick={() => setIsArchiveConfirmOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      icon={Archive}
                      loading={archiveBusy}
                      onClick={handleArchivePreviousDayBills}
                    >
                      Archive {previousDayClosedBillCount} closed bills
                    </Button>
                  </>
                }
              >
                {archiveError && (
                  <div role="alert" className="mb-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                    {archiveError}
                  </div>
                )}
                <div className="space-y-3 text-sm text-slate-600">
                  <p>
                    Archive {previousDayClosedBillCount} paid or folio-settled dine-in bill{previousDayClosedBillCount === 1 ? '' : 's'} opened before today?
                  </p>
                  <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
                    Unpaid and open bills will remain in the active list. Archived bills are retained and can be found with the “Show archived” filter.
                  </p>
                </div>
              </Modal>
            </>
          )}
        </div>
      )}

      {/* Kitchen Display System (KDS) */}
      {activeView === 'kitchen' && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {['pending', 'preparing', 'ready', 'served'].map((status) => {
              const statusOrders = orders.filter((o) => o.status === status);
              return (
                <div key={status} className="bg-slate-100/70 p-3.5 rounded-2xl flex flex-col gap-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="font-bold text-xs uppercase tracking-wider text-slate-700 capitalize">
                      {status}
                    </span>
                    <span className="text-xs font-bold bg-white text-slate-700 px-2 py-0.5 rounded-full shadow-sm">
                      {statusOrders.length}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {statusOrders.length === 0 ? (
                      <p className="text-center py-8 text-slate-400 text-xs">No orders in {status}</p>
                    ) : (
                      statusOrders.map((o) => (
                        <Card key={o._id} className="p-3 bg-white">
                          <div className="flex items-start justify-between">
                            <div>
                              <span className="font-black text-sm text-slate-900">
                                #{o.orderNumber}
                              </span>
                              <span className="text-[11px] text-slate-500 block capitalize">
                                {o.orderType.replace(/_/g, ' ')}
                              </span>
                              {o.orderType === 'dine_in' && (
                                <span className="mt-1 block rounded bg-amber-100 px-2 py-1 text-sm font-black text-amber-900">
                                  {o.tableId?.tableNumber
                                    ? getTableLabel(o.tableId, o.tableNameSnapshot)
                                    : getTableLabel(null, o.tableNameSnapshot)}
                                </span>
                              )}
                              {o.orderType === 'room_service' && o.roomNumber && (
                                <span className="text-[11px] text-slate-500 block">Room {o.roomNumber}</span>
                              )}
                            </div>
                            <Badge variant={o.status}>{o.status}</Badge>
                          </div>

                          <div className="my-2.5 pt-2 border-t border-slate-100 space-y-1">
                            {o.items?.map((it, idx) => (
                              <div key={idx} className="flex justify-between text-xs">
                                <span className="text-slate-800 font-medium">
                                  {it.quantity}x {it.name}
                                  {it.fulfillmentSource === 'batch_production' && (
                                    <span className="ml-1 rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-800 ring-1 ring-amber-200">
                                      Bulk production
                                    </span>
                                  )}
                                </span>
                                <span className="text-slate-400 font-mono">{formatCurrency(it.amount)}</span>
                              </div>
                            ))}
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-900">{formatCurrency(o.totalAmount)}</span>

                            <div className="flex flex-wrap justify-end gap-1.5">
                              {o.status === 'pending' && (
                                <Button
                                  size="sm"
                                  variant="primary"
                                  disabled={updatingOrderIds.has(String(o._id))}
                                  onClick={() => handleUpdateOrderStatus(o._id, 'preparing')}
                                >
                                  Cook
                                </Button>
                              )}
                              {o.status === 'preparing' && (
                                <Button
                                  size="sm"
                                  variant="success"
                                  disabled={updatingOrderIds.has(String(o._id))}
                                  onClick={() => handleUpdateOrderStatus(o._id, 'ready')}
                                >
                                  Ready
                                </Button>
                              )}
                              {o.status === 'ready' && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  disabled={updatingOrderIds.has(String(o._id))}
                                  onClick={() => handleUpdateOrderStatus(o._id, 'served')}
                                >
                                  Serve
                                </Button>
                              )}
                              {['pending', 'preparing', 'ready'].includes(o.status) && (
                                <Button
                                  size="sm"
                                  variant="danger"
                                  disabled={updatingOrderIds.has(String(o._id))}
                                  onClick={() => handleUpdateOrderStatus(o._id, 'cancelled')}
                                >
                                  Cancel
                                </Button>
                              )}
                              {o.status === 'served' && o.paymentStatus === 'unpaid' && (
                                <Button
                                  size="sm"
                                  variant="gold"
                                  onClick={() => handleSettleOrder(o._id)}
                                >
                                  Settle
                                </Button>
                              )}
                            </div>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Modal
        isOpen={isTableModalOpen}
        onClose={() => {
          setIsTableModalOpen(false);
          setTableError('');
        }}
        title={editingTable ? `Edit ${getTableLabel(editingTable)}` : 'Add Restaurant Table'}
        subtitle={editingTable ? 'Update table details and availability.' : 'The next sequential table number will be assigned automatically.'}
      >
        {tableError && (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            {tableError}
          </div>
        )}
        <form onSubmit={handleSaveTable} className="space-y-4">
          <Input
            label="Optional Table Name"
            value={tableForm.name}
            onChange={(e) => setTableForm({ ...tableForm, name: e.target.value })}
            placeholder="Patio, Window, Booth 1"
          />
          <Input
            label="Capacity"
            type="number"
            min="1"
            required
            value={tableForm.capacity}
            onChange={(e) => setTableForm({ ...tableForm, capacity: e.target.value })}
          />
          {editingTable && (
            <Select
              label="Status"
              value={tableForm.status}
              onChange={(e) => setTableForm({ ...tableForm, status: e.target.value })}
            >
              <option value="available">Available</option>
              <option value="reserved">Reserved</option>
            </Select>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsTableModalOpen(false);
                setTableError('');
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">Save Table</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
