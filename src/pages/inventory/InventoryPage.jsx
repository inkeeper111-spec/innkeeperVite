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
  Boxes,
  AlertTriangle,
  PlusCircle,
  Truck,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  PackageCheck
} from 'lucide-react';
import dayjs from 'dayjs';

export const InventoryPage = () => {
  const [activeTab, setActiveTab] = useState('items'); // 'items', 'vendors', 'pos'
  const [items, setItems] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isMovementOpen, setIsMovementOpen] = useState(false);
  const [isAddVendorOpen, setIsAddVendorOpen] = useState(false);
  const [selectedItemForMove, setSelectedItemForMove] = useState(null);

  const [itemForm, setItemForm] = useState({
    name: '',
    code: '',
    category: 'food_beverage',
    unit: 'pieces',
    currentStock: 10,
    minStockThreshold: 15,
    unitCost: 5
  });

  const [moveForm, setMoveForm] = useState({
    movementType: 'receipt',
    quantity: 10,
    notes: ''
  });

  const [vendorForm, setVendorForm] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: ''
  });

  const [message, setMessage] = useState('');

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const [itemsRes, vendorsRes, posRes] = await Promise.all([
        api.get('/inventory/items'),
        api.get('/inventory/vendors'),
        api.get('/inventory/purchase-orders')
      ]);

      if (itemsRes.data.success) setItems(itemsRes.data.data);
      if (vendorsRes.data.success) setVendors(vendorsRes.data.data);
      if (posRes.data.success) setPurchaseOrders(posRes.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleCreateItem = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/inventory/items', {
        ...itemForm,
        currentStock: Number(itemForm.currentStock),
        minStockThreshold: Number(itemForm.minStockThreshold),
        unitCost: Number(itemForm.unitCost)
      });
      if (res.data.success) {
        setIsAddItemOpen(false);
        setMessage(`Item ${itemForm.name} added to inventory.`);
        fetchInventory();
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create item');
    }
  };

  const handleRecordMovement = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/inventory/movements', {
        itemId: selectedItemForMove._id,
        movementType: moveForm.movementType,
        quantity: Number(moveForm.quantity),
        notes: moveForm.notes
      });
      if (res.data.success) {
        setIsMovementOpen(false);
        setMessage('Stock movement ledger recorded.');
        fetchInventory();
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Movement record failed');
    }
  };

  const handleReceivePO = async (poId) => {
    try {
      const res = await api.patch(`/inventory/purchase-orders/${poId}/receive`);
      if (res.data.success) {
        setMessage('Purchase order goods received and inventory auto-stocked!');
        fetchInventory();
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Receive failed');
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
      alert('Failed to add vendor');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Inventory & Procurement</h1>
          <p className="text-xs text-slate-500 mt-1">
            Consumables, linen stock, purchase orders, vendor directory, and movement audit logs
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" icon={Truck} onClick={() => setIsAddVendorOpen(true)}>
            Add Vendor
          </Button>
          <Button variant="primary" size="sm" icon={PlusCircle} onClick={() => setIsAddItemOpen(true)}>
            Add Stock Item
          </Button>
        </div>
      </div>

      {message && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Tabs */}
      <nav className="overflow-x-auto border-b border-slate-200" aria-label="Inventory sections">
        <div className="flex min-w-max">
        <button
          onClick={() => setActiveTab('items')}
          className={`flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-semibold transition-all sm:px-6 ${
            activeTab === 'items'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Stock Items ({items.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('vendors')}
          className={`flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-semibold transition-all sm:px-6 ${
            activeTab === 'vendors'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Vendors ({vendors.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('pos')}
          className={`flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-semibold transition-all sm:px-6 ${
            activeTab === 'pos'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <PackageCheck className="w-4 h-4" />
          <span>Purchase Orders ({purchaseOrders.length})</span>
        </button>
        </div>
      </nav>

      {activeTab === 'items' && (
        <Card>
          {loading ? (
            <LoadingSpinner text="Loading inventory catalogue..." />
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No inventory items defined yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
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
                  {items.map((it) => {
                    const isLow = it.currentStock <= it.minStockThreshold;
                    return (
                      <tr key={it._id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 font-bold text-slate-900">{it.name}</td>
                        <td className="py-3.5 font-mono text-slate-500">{it.code}</td>
                        <td className="py-3.5 capitalize text-slate-600">
                          {it.category.replace(/_/g, ' ')}
                        </td>
                        <td className="py-3.5 font-bold text-slate-900">
                          {it.currentStock} {it.unit}
                        </td>
                        <td className="py-3.5 text-slate-700 font-mono">${it.unitCost}</td>
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
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {activeTab === 'vendors' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vendors.map((v) => (
            <Card key={v._id}>
              <h3 className="font-bold text-slate-900 text-sm">{v.name}</h3>
              <p className="text-xs text-slate-500 mt-0.5">Contact: {v.contactPerson || 'Representative'}</p>
              <div className="mt-3 pt-3 border-t border-slate-100 space-y-1 text-xs text-slate-600">
                <p>Phone: {v.phone}</p>
                <p>Email: {v.email || 'N/A'}</p>
                <p>Address: {v.address || 'N/A'}</p>
              </div>
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
              <table className="w-full text-left text-xs">
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
                      <td className="py-3 font-black text-slate-900">${po.totalAmount}</td>
                      <td className="py-3">
                        <Badge variant={po.status}>{po.status}</Badge>
                      </td>
                      <td className="py-3 text-slate-500">{dayjs(po.createdAt).format('YYYY-MM-DD')}</td>
                      <td className="py-3 text-right">
                        {po.status === 'ordered' && (
                          <Button
                            size="sm"
                            variant="success"
                            icon={PackageCheck}
                            onClick={() => handleReceivePO(po._id)}
                          >
                            Receive Goods
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="secondary" type="button" onClick={() => setIsMovementOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
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
                { label: 'Food & Beverage', value: 'food_beverage' },
                { label: 'Toiletries & Amenities', value: 'toiletries' },
                { label: 'Linen & Cleaning Materials', value: 'linen_cleaning' },
                { label: 'Maintenance & Hardware', value: 'maintenance' },
                { label: 'Stationery & Office', value: 'stationery' }
              ]}
            />
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
              label="Unit Cost ($)"
              type="number"
              step="0.01"
              required
              value={itemForm.unitCost}
              onChange={(e) => setItemForm({ ...itemForm, unitCost: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="secondary" type="button" onClick={() => setIsAddItemOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
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
          <Input
            label="Phone"
            required
            value={vendorForm.phone}
            onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })}
            placeholder="+1 (555) 888-9999"
          />
          <div className="flex justify-end gap-3 pt-3">
            <Button variant="secondary" type="button" onClick={() => setIsAddVendorOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Register Vendor
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

