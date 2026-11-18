import React, { useEffect, useId, useState } from 'react';
import api from '../../api/axios';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { useCurrency } from '../../hooks/useCurrency';

const createEmptyForm = (categories) => ({
  name: '',
  description: '',
  categoryId: categories[0]?._id || '',
  price: '',
  nonAcPricingEnabled: true,
  acPricingEnabled: false,
  acPrice: '',
  taxPercent: 5,
  discountType: 'none',
  discountValue: '',
  isAvailable: true,
  preparationTime: 15,
  tags: ''
});

const formForItem = (item) => ({
  name: item.name,
  description: item.description || '',
  categoryId: item.categoryId?._id || item.categoryId || '',
  price: item.nonAcPrice ?? item.price,
  nonAcPricingEnabled: item.nonAcPricingEnabled !== false,
  acPricingEnabled: item.acPricingEnabled === true,
  acPrice: item.acPrice ?? '',
  taxPercent: item.taxPercent ?? item.taxRate ?? 5,
  discountType: item.discountType || 'none',
  discountValue: item.discountValue ?? '',
  isAvailable: item.isAvailable,
  preparationTime: item.preparationTime ?? 15,
  tags: (item.tags || []).join(', ')
});

export const MenuItemModal = ({ isOpen, onClose, categories, item = null, onSaved }) => {
  const { currencySymbol } = useCurrency();
  const availabilityId = useId();
  const [itemForm, setItemForm] = useState(() => createEmptyForm(categories));
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setItemForm(item ? formForItem(item) : createEmptyForm(categories));
    setError('');
  }, [isOpen, item]);

  useEffect(() => {
    if (!isOpen || item || itemForm.categoryId || !categories.length) return;
    setItemForm((current) => ({ ...current, categoryId: categories[0]._id }));
  }, [categories, isOpen, item, itemForm.categoryId]);

  const handleSaveItem = async (event) => {
    event.preventDefault();
    setError('');
    const payload = {
      ...itemForm,
      price: itemForm.price !== ''
        ? Number(itemForm.price)
        : (Number(itemForm.acPrice) || 0),
      nonAcPrice: itemForm.nonAcPricingEnabled ? Number(itemForm.price) : undefined,
      acPrice: itemForm.acPricingEnabled ? Number(itemForm.acPrice) : undefined,
      taxPercent: Number(itemForm.taxPercent),
      discountValue: itemForm.discountType === 'none' ? 0 : Number(itemForm.discountValue),
      preparationTime: Number(itemForm.preparationTime),
      tags: itemForm.tags ? itemForm.tags.split(',').map((tag) => tag.trim()).filter(Boolean) : []
    };

    try {
      const { data } = item
        ? await api.patch(`/restaurant/items/${item._id}`, payload)
        : await api.post('/restaurant/items', payload);
      onClose();
      onSaved({ item: data.data, name: payload.name, wasEditing: Boolean(item) });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save menu item.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={item ? `Edit: ${item.name}` : 'Add Menu Item'}
      subtitle="Set pricing, category, and kitchen details"
    >
      {error && (
        <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          {error}
        </div>
      )}
      <form onSubmit={handleSaveItem} className="space-y-4">
        <Input
          label="Item Name"
          required
          value={itemForm.name}
          onChange={(event) => setItemForm({ ...itemForm, name: event.target.value })}
          placeholder="e.g. Truffle Arancini"
        />
        <Input
          label="Description"
          value={itemForm.description}
          onChange={(event) => setItemForm({ ...itemForm, description: event.target.value })}
          placeholder="Short description for guests"
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select
            label="Category"
            required
            value={itemForm.categoryId}
            onChange={(event) => setItemForm({ ...itemForm, categoryId: event.target.value })}
          >
            <option value="">-- Select Category --</option>
            {categories.map((category) => (
              <option key={category._id} value={category._id}>{category.name}</option>
            ))}
          </Select>
          <Input
            label={`Non-AC Price (${currencySymbol})`}
            type="number"
            step="0.01"
            min="0"
            required={itemForm.nonAcPricingEnabled}
            disabled={!itemForm.nonAcPricingEnabled}
            value={itemForm.price}
            onChange={(event) => setItemForm({ ...itemForm, price: event.target.value })}
            placeholder="0.00"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700">
            <input
              type="checkbox"
              checked={itemForm.nonAcPricingEnabled}
              onChange={(event) => setItemForm({ ...itemForm, nonAcPricingEnabled: event.target.checked })}
              className="rounded border-slate-300 text-brand-600"
            />
            Enable Non-AC pricing
          </label>
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700">
            <input
              type="checkbox"
              checked={itemForm.acPricingEnabled}
              onChange={(event) => setItemForm({ ...itemForm, acPricingEnabled: event.target.checked })}
              className="rounded border-slate-300 text-brand-600"
            />
            Enable AC pricing
          </label>
        </div>

        {itemForm.acPricingEnabled && (
          <Input
            label={`AC Price (${currencySymbol})`}
            type="number"
            min="0"
            step="0.01"
            required
            value={itemForm.acPrice}
            onChange={(event) => setItemForm({ ...itemForm, acPrice: event.target.value })}
            placeholder="0.00"
          />
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select
            label="Menu discount"
            value={itemForm.discountType}
            onChange={(event) => setItemForm({
              ...itemForm,
              discountType: event.target.value,
              discountValue: event.target.value === 'none' ? '' : itemForm.discountValue
            })}
          >
            <option value="none">No discount</option>
            <option value="percentage">Percentage</option>
            <option value="flat">Flat amount</option>
          </Select>
          {itemForm.discountType !== 'none' ? (
            <Input
              label={itemForm.discountType === 'percentage' ? 'Discount (%)' : `Discount per item (${currencySymbol})`}
              type="number"
              min="0"
              max={itemForm.discountType === 'percentage' ? '100' : undefined}
              step="0.01"
              required
              value={itemForm.discountValue}
              onChange={(event) => setItemForm({ ...itemForm, discountValue: event.target.value })}
              placeholder={itemForm.discountType === 'percentage' ? '10' : '0.00'}
            />
          ) : (
            <div className="flex items-center rounded-xl bg-slate-50 px-3 text-xs text-slate-500">
              No automatic discount will be applied to this item.
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            label="Tax Rate (%)"
            type="number"
            min="0"
            max="100"
            value={itemForm.taxPercent}
            onChange={(event) => setItemForm({ ...itemForm, taxPercent: event.target.value })}
          />
          <Input
            label="Prep Time (minutes)"
            type="number"
            min="1"
            value={itemForm.preparationTime}
            onChange={(event) => setItemForm({ ...itemForm, preparationTime: event.target.value })}
          />
        </div>

        <Input
          label="Tags (comma-separated)"
          value={itemForm.tags}
          onChange={(event) => setItemForm({ ...itemForm, tags: event.target.value })}
          placeholder="vegan, gluten-free, chef's special"
        />

        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id={availabilityId}
            checked={itemForm.isAvailable}
            onChange={(event) => setItemForm({ ...itemForm, isAvailable: event.target.checked })}
            className="rounded border-slate-300 text-brand-600"
          />
          <label htmlFor={availabilityId} className="text-xs font-medium text-slate-700">
            Item is currently available for ordering
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-3">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={!itemForm.categoryId}>
            {item ? 'Save Changes' : 'Add to Menu'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
