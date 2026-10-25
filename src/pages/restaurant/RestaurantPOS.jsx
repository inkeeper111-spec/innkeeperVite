import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import {
  UtensilsCrossed,
  Plus,
  Minus,
  Trash2,
  Receipt,
  CheckCircle2,
  Clock,
  Send,
  Building2,
  DollarSign
} from 'lucide-react';

export const RestaurantPOS = () => {
  const [activeView, setActiveView] = useState('pos'); // 'pos' or 'kitchen'
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedCat, setSelectedCat] = useState('all');
  const [orders, setOrders] = useState([]);
  const [inHouseReservations, setInHouseReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Cart State
  const [cart, setCart] = useState([]);
  const [orderType, setOrderType] = useState('dine_in'); // dine_in, room_service, takeaway
  const [tableNumber, setTableNumber] = useState('Table 1');
  const [selectedReservationId, setSelectedReservationId] = useState('');
  const [message, setMessage] = useState('');
  const [isFolioModalOpen, setIsFolioModalOpen] = useState(false);
  const [selectedOrderForFolio, setSelectedOrderForFolio] = useState(null);

  const fetchMenuAndOrders = async () => {
    try {
      setLoading(true);
      const [menuRes, ordersRes, resvRes] = await Promise.all([
        api.get('/restaurant/menu'),
        api.get('/restaurant/orders'),
        api.get('/reservations?status=checked_in')
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
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenuAndOrders();
  }, []);

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

      const payload = {
        orderType,
        tableNumber: orderType === 'dine_in' ? tableNumber : '',
        roomId: selectedResv?.rooms?.[0]?.roomId?._id,
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
          setMessage(`Order #${order.orderNumber} placed & transferred to Room ${selectedResv?.rooms?.[0]?.roomNumber} Folio!`);
        } else {
          setMessage(`Order #${order.orderNumber} sent to kitchen!`);
        }

        clearCart();
        fetchMenuAndOrders();
        setTimeout(() => setMessage(''), 4000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to place order');
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      await api.patch(`/restaurant/orders/${orderId}/status`, { status: newStatus });
      fetchMenuAndOrders();
    } catch (err) {
      alert('Failed to update status');
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
      alert(err.response?.data?.message || 'Transfer failed');
    }
  };

  const filteredItems = menuItems.filter(
    (i) => selectedCat === 'all' || i.categoryId?._id === selectedCat || i.categoryId === selectedCat
  );

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
        <div className="flex bg-slate-200/80 p-1 rounded-xl">
          <button
            onClick={() => setActiveView('pos')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeView === 'pos' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Terminal POS
          </button>
          <button
            onClick={() => setActiveView('kitchen')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeView === 'kitchen' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Kitchen Display (KDS)
          </button>
        </div>
      </div>

      {message && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {activeView === 'pos' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Menu Catalog (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
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
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filteredItems.map((item) => (
                  <button
                    key={item._id}
                    onClick={() => addToCart(item)}
                    className="p-4 bg-white rounded-xl border border-slate-200/80 hover:border-brand-500 hover:shadow-md transition-all text-left flex flex-col justify-between group h-36"
                  >
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs line-clamp-1 group-hover:text-brand-600 transition-colors">
                        {item.name}
                      </h4>
                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                        {item.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between w-full pt-2 border-t border-slate-100">
                      <span className="font-black text-slate-900 text-sm">
                        ${item.price}
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
            <Card className="sticky top-20">
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

              {/* Order Type Toggle */}
              <div className="grid grid-cols-3 gap-1.5 my-3 bg-slate-100 p-1 rounded-xl">
                {['dine_in', 'room_service', 'takeaway'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setOrderType(type)}
                    className={`py-1 rounded-lg text-[11px] font-bold capitalize transition-all ${
                      orderType === type ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    {type.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>

              {/* Service Destination */}
              {orderType === 'dine_in' && (
                <div className="mb-3">
                  <Input
                    label="Table Number"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    placeholder="Table 4"
                  />
                </div>
              )}

              {orderType === 'room_service' && (
                <div className="mb-3">
                  <Select
                    label="Deliver to Room / Guest"
                    value={selectedReservationId}
                    onChange={(e) => setSelectedReservationId(e.target.value)}
                  >
                    <option value="">-- Choose In-House Room --</option>
                    {inHouseReservations.map((r) => (
                      <option key={r._id} value={r._id}>
                        Room {r.rooms?.[0]?.roomNumber} - {r.guestName}
                      </option>
                    ))}
                  </Select>
                </div>
              )}

              {/* Cart Line Items */}
              <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 my-3">
                {cart.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    Cart is empty. Click menu items to add.
                  </div>
                ) : (
                  cart.map((i) => (
                    <div key={i._id} className="py-2.5 flex items-center justify-between text-xs">
                      <div className="pr-2 min-w-0">
                        <p className="font-semibold text-slate-800 truncate">{i.name}</p>
                        <p className="text-[11px] text-slate-400">${i.price} each</p>
                      </div>

                      <div className="flex items-center gap-2">
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
                          ${i.price * i.quantity}
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
                  <span className="font-mono font-medium">${subtotal}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>F&B Tax (5%):</span>
                  <span className="font-mono font-medium">${tax}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-slate-900 border-t border-slate-100 pt-2">
                  <span>Order Total:</span>
                  <span className="font-mono">${total}</span>
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
                    Transfer ${total} to Room Folio
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    className="w-full"
                    disabled={cart.length === 0}
                    onClick={() => handlePlaceOrder(true)}
                  >
                    Send to Kitchen (${total})
                  </Button>
                )}
              </div>
            </Card>
          </div>
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
                                {o.orderType.replace(/_/g, ' ')}{' '}
                                {o.roomNumber ? `(Room ${o.roomNumber})` : o.tableNumber}
                              </span>
                            </div>
                            <Badge variant={o.status}>{o.status}</Badge>
                          </div>

                          <div className="my-2.5 pt-2 border-t border-slate-100 space-y-1">
                            {o.items?.map((it, idx) => (
                              <div key={idx} className="flex justify-between text-xs">
                                <span className="text-slate-800 font-medium">
                                  {it.quantity}x {it.name}
                                </span>
                                <span className="text-slate-400 font-mono">${it.amount}</span>
                              </div>
                            ))}
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-900">${o.totalAmount}</span>

                            <div className="flex gap-1.5">
                              {o.status === 'pending' && (
                                <Button
                                  size="sm"
                                  variant="primary"
                                  onClick={() => handleUpdateOrderStatus(o._id, 'preparing')}
                                >
                                  Cook
                                </Button>
                              )}
                              {o.status === 'preparing' && (
                                <Button
                                  size="sm"
                                  variant="success"
                                  onClick={() => handleUpdateOrderStatus(o._id, 'ready')}
                                >
                                  Ready
                                </Button>
                              )}
                              {o.status === 'ready' && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => handleUpdateOrderStatus(o._id, 'served')}
                                >
                                  Serve
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
    </div>
  );
};

