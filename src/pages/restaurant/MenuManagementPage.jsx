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
  PlusCircle,
  Tag,
  Pencil,
  ToggleLeft,
  ToggleRight,
  CheckCircle2,
  Search,
  Layers
} from 'lucide-react';

export const MenuManagementPage = () => {
  const [activeTab, setActiveTab] = useState('items'); // 'items' | 'categories'
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // ── Category modal ──
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [catForm, setCatForm] = useState({ name: '', description: '', displayOrder: 1 });

  // ── Item modal ──
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemForm, setItemForm] = useState({
    name: '',
    description: '',
    categoryId: '',
    price: '',
    taxRate: 5,
    isAvailable: true,
    preparationTime: 15,
    tags: ''
  });

  const fetchMenu = async () => {
    try {
      setLoading(true);
      const res = await api.get('/restaurant/menu');
      if (res.data.success) {
        setCategories(res.data.data.categories);
        setItems(res.data.data.items);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMenu(); }, []);

  const showSuccess = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3500);
  };

  // ── Category CRUD ──
  const openNewCat = () => {
    setEditingCat(null);
    setCatForm({ name: '', description: '', displayOrder: categories.length + 1 });
    setError('');
    setIsCatModalOpen(true);
  };

  const openEditCat = (cat) => {
    setEditingCat(cat);
    setCatForm({ name: cat.name, description: cat.description || '', displayOrder: cat.displayOrder || 1 });
    setError('');
    setIsCatModalOpen(true);
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editingCat) {
        await api.patch(`/restaurant/categories/${editingCat._id}`, catForm);
        showSuccess(`Category "${catForm.name}" updated.`);
      } else {
        await api.post('/restaurant/categories', catForm);
        showSuccess(`Category "${catForm.name}" created.`);
      }
      setIsCatModalOpen(false);
      fetchMenu();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save category.');
    }
  };

  // ── Item CRUD ──
  const openNewItem = () => {
    setEditingItem(null);
    setItemForm({
      name: '', description: '', categoryId: categories[0]?._id || '',
      price: '', taxRate: 5, isAvailable: true, preparationTime: 15, tags: ''
    });
    setError('');
    setIsItemModalOpen(true);
  };

  const openEditItem = (item) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      description: item.description || '',
      categoryId: item.categoryId?._id || item.categoryId || '',
      price: item.price,
      taxRate: item.taxRate ?? 5,
      isAvailable: item.isAvailable,
      preparationTime: item.preparationTime ?? 15,
      tags: (item.tags || []).join(', ')
    });
    setError('');
    setIsItemModalOpen(true);
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    setError('');
    const payload = {
      ...itemForm,
      price: Number(itemForm.price),
      taxRate: Number(itemForm.taxRate),
      preparationTime: Number(itemForm.preparationTime),
      tags: itemForm.tags ? itemForm.tags.split(',').map((t) => t.trim()).filter(Boolean) : []
    };
    try {
      if (editingItem) {
        await api.patch(`/restaurant/items/${editingItem._id}`, payload);
        showSuccess(`"${payload.name}" updated.`);
      } else {
        await api.post('/restaurant/items', payload);
        showSuccess(`"${payload.name}" added to menu.`);
      }
      setIsItemModalOpen(false);
      fetchMenu();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save menu item.');
    }
  };

  const handleToggleAvailability = async (item) => {
    try {
      await api.patch(`/restaurant/items/${item._id}`, { isAvailable: !item.isAvailable });
      showSuccess(`"${item.name}" marked as ${!item.isAvailable ? 'available' : 'unavailable'}.`);
      fetchMenu();
    } catch (err) {
      alert('Failed to toggle availability.');
    }
  };

  const filteredItems = items.filter((it) => {
    const matchSearch = it.name.toLowerCase().includes(search.toLowerCase()) ||
      it.description?.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === 'all' || it.categoryId?._id === catFilter || it.categoryId === catFilter;
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <UtensilsCrossed className="w-6 h-6 text-brand-600" />
            Menu Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Build and maintain the restaurant menu — categories, items, pricing, and availability
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'categories' ? (
            <Button variant="primary" size="sm" icon={PlusCircle} onClick={openNewCat}>
              Add Category
            </Button>
          ) : (
            <>
              <Button variant="outline" size="sm" icon={Layers} onClick={() => setActiveTab('categories')}>
                Manage Categories
              </Button>
              <Button variant="primary" size="sm" icon={PlusCircle} onClick={openNewItem}>
                Add Menu Item
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Success / Error banners */}
      {message && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          {message}
        </div>
      )}

      {/* Tabs */}
      <nav className="overflow-x-auto border-b border-slate-200" aria-label="Menu sections">
        <div className="flex min-w-max">
        {[
          { key: 'items',      label: `Menu Items (${items.length})`,       icon: UtensilsCrossed },
          { key: 'categories', label: `Categories (${categories.length})`,  icon: Tag }
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-semibold transition-all sm:px-6 ${
              activeTab === key
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
        </div>
      </nav>

      {/* ── MENU ITEMS TAB ── */}
      {activeTab === 'items' && (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-xl border border-slate-200/80">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search items..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <Select
              size="sm"
              className="max-w-xs"
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Categories' },
                ...categories.map((c) => ({ value: c._id, label: c.name }))
              ]}
            />
          </div>

          <Card>
            {loading ? (
              <LoadingSpinner text="Loading menu items..." />
            ) : filteredItems.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No menu items found. Add your first item to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold">
                      <th className="pb-3">Item Name</th>
                      <th className="pb-3">Category</th>
                      <th className="pb-3">Price</th>
                      <th className="pb-3">Tax</th>
                      <th className="pb-3">Prep Time</th>
                      <th className="pb-3">Availability</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredItems.map((item) => (
                      <tr key={item._id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5">
                          <p className="font-bold text-slate-900">{item.name}</p>
                          <p className="text-[11px] text-slate-400 max-w-xs truncate">{item.description}</p>
                        </td>
                        <td className="py-3.5">
                          <span className="text-[11px] font-semibold bg-brand-50 text-brand-700 px-2 py-0.5 rounded border border-brand-200">
                            {item.categoryId?.name || '—'}
                          </span>
                        </td>
                        <td className="py-3.5 font-black text-slate-900">${item.price}</td>
                        <td className="py-3.5 text-slate-500">{item.taxRate ?? 5}%</td>
                        <td className="py-3.5 text-slate-500">{item.preparationTime ?? 15} min</td>
                        <td className="py-3.5">
                          <button
                            onClick={() => handleToggleAvailability(item)}
                            className={`flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full border transition-colors ${
                              item.isAvailable
                                ? 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                                : 'text-slate-500 bg-slate-100 border-slate-200 hover:bg-slate-200'
                            }`}
                          >
                            {item.isAvailable
                              ? <><ToggleRight className="w-3.5 h-3.5" /> Available</>
                              : <><ToggleLeft className="w-3.5 h-3.5" /> Unavailable</>
                            }
                          </button>
                        </td>
                        <td className="py-3.5 text-right">
                          <Button
                            size="sm"
                            variant="secondary"
                            icon={Pencil}
                            onClick={() => openEditItem(item)}
                          >
                            Edit
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {/* ── CATEGORIES TAB ── */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-3"><LoadingSpinner text="Loading categories..." /></div>
          ) : categories.length === 0 ? (
            <div className="col-span-3 py-12 text-center text-slate-400 text-xs bg-white rounded-xl border border-slate-200">
              No categories yet. Add your first category.
            </div>
          ) : (
            categories.map((cat) => {
              const itemCount = items.filter(
                (i) => i.categoryId?._id === cat._id || i.categoryId === cat._id
              ).length;
              return (
                <Card key={cat._id} className="flex flex-col justify-between hover:border-slate-300 transition-all">
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 border border-brand-200 flex items-center justify-center">
                        <Tag className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Order #{cat.displayOrder}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-900 text-base mt-3">{cat.name}</h3>
                    <p className="text-xs text-slate-500 mt-1 min-h-[2rem]">{cat.description || 'No description'}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600">
                      {itemCount} item{itemCount !== 1 ? 's' : ''}
                    </span>
                    <Button size="sm" variant="secondary" icon={Pencil} onClick={() => openEditCat(cat)}>
                      Edit
                    </Button>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* ── Category Modal ── */}
      <Modal
        isOpen={isCatModalOpen}
        onClose={() => setIsCatModalOpen(false)}
        title={editingCat ? 'Edit Category' : 'Add Menu Category'}
        subtitle="Group related menu items together"
      >
        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">{error}</div>
        )}
        <form onSubmit={handleSaveCategory} className="space-y-4">
          <Input
            label="Category Name"
            required
            value={catForm.name}
            onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
            placeholder="e.g. Signature Cocktails"
          />
          <Input
            label="Description"
            value={catForm.description}
            onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
            placeholder="Short description shown on menus"
          />
          <Input
            label="Display Order"
            type="number"
            min="1"
            value={catForm.displayOrder}
            onChange={(e) => setCatForm({ ...catForm, displayOrder: Number(e.target.value) })}
          />
          <div className="flex justify-end gap-3 pt-3">
            <Button variant="secondary" type="button" onClick={() => setIsCatModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit">
              {editingCat ? 'Save Changes' : 'Create Category'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Menu Item Modal ── */}
      <Modal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        title={editingItem ? `Edit: ${editingItem.name}` : 'Add Menu Item'}
        subtitle="Set pricing, category, and kitchen details"
      >
        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">{error}</div>
        )}
        <form onSubmit={handleSaveItem} className="space-y-4">
          <Input
            label="Item Name"
            required
            value={itemForm.name}
            onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
            placeholder="e.g. Truffle Arancini"
          />
          <Input
            label="Description"
            value={itemForm.description}
            onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
            placeholder="Short description for guests"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Category"
              required
              value={itemForm.categoryId}
              onChange={(e) => setItemForm({ ...itemForm, categoryId: e.target.value })}
            >
              <option value="">-- Select Category --</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </Select>
            <Input
              label="Price ($)"
              type="number"
              step="0.01"
              required
              value={itemForm.price}
              onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
              placeholder="0.00"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Tax Rate (%)"
              type="number"
              min="0"
              max="100"
              value={itemForm.taxRate}
              onChange={(e) => setItemForm({ ...itemForm, taxRate: e.target.value })}
            />
            <Input
              label="Prep Time (minutes)"
              type="number"
              min="1"
              value={itemForm.preparationTime}
              onChange={(e) => setItemForm({ ...itemForm, preparationTime: e.target.value })}
            />
          </div>

          <Input
            label="Tags (comma-separated)"
            value={itemForm.tags}
            onChange={(e) => setItemForm({ ...itemForm, tags: e.target.value })}
            placeholder="vegan, gluten-free, chef's special"
          />

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="availCheck"
              checked={itemForm.isAvailable}
              onChange={(e) => setItemForm({ ...itemForm, isAvailable: e.target.checked })}
              className="rounded border-slate-300 text-brand-600"
            />
            <label htmlFor="availCheck" className="text-xs text-slate-700 font-medium">
              Item is currently available for ordering
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="secondary" type="button" onClick={() => setIsItemModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={!itemForm.categoryId}>
              {editingItem ? 'Save Changes' : 'Add to Menu'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
