import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ClipboardList, CookingPot, Plus, RefreshCw, Trash2 } from 'lucide-react';
import dayjs from 'dayjs';
import api, { showApiErrorToast } from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import { useCurrency } from '../../hooks/useCurrency';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Select } from '../../components/ui/Select';
import { useNavigate } from 'react-router-dom';

const createRequestKey = () => globalThis.crypto?.randomUUID?.()
  || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const numeric = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
const currency = (value, formatCurrency) => formatCurrency(numeric(value));
const quantity = (value) => Number(numeric(value).toFixed(3));

export const ProductionPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();
  const canViewFinancials = ['hotel_admin', 'super_admin'].includes(user?.role);
  const [recipes, setRecipes] = useState([]);
  const [batches, setBatches] = useState([]);
  const [totals, setTotals] = useState({});
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [from, setFrom] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [to, setTo] = useState(dayjs().format('YYYY-MM-DD'));
  const [form, setForm] = useState({
    recipeId: '',
    productionQuantity: '',
    location: 'Kitchen Store',
    rawMaterialLocation: 'Main Store',
    productionDate: dayjs().format('YYYY-MM-DD'),
    expiryDate: ''
  });
  const [requestKey, setRequestKey] = useState('');
  const [closing, setClosing] = useState(null);
  const [closingType, setClosingType] = useState('wastage');
  const [closingForm, setClosingForm] = useState({ quantity: '', reason: '' });
  const [closingRequestKey, setClosingRequestKey] = useState('');
  const [transferBatch, setTransferBatch] = useState(null);
  const [transferForm, setTransferForm] = useState({ quantity: '', destinationLocation: '', notes: '' });
  const [transferRequestKey, setTransferRequestKey] = useState('');

  const selectedRecipe = useMemo(
    () => recipes.find((recipe) => String(recipe._id) === String(form.recipeId)),
    [form.recipeId, recipes]
  );
  const batchRecipes = useMemo(
    () => recipes.filter((recipe) => recipe.isActive && recipe.productionMode === 'batch_production'),
    [recipes]
  );
  const rawMaterialUsage = useMemo(() => {
    const totalsByItem = new Map();
    for (const batch of batches) {
      for (const ingredient of batch.ingredients || []) {
        const key = String(ingredient.itemId);
        const aggregate = totalsByItem.get(key) || {
          itemName: ingredient.itemName,
          unit: ingredient.unit,
          theoreticalQuantity: 0,
          actualQuantity: 0,
          wastageQuantity: 0,
          totalCost: 0,
          wastageCost: 0
        };
        aggregate.theoreticalQuantity += numeric(ingredient.theoreticalQuantity);
        aggregate.actualQuantity += numeric(ingredient.actualQuantity);
        aggregate.wastageQuantity += numeric(ingredient.wastageQuantity);
        aggregate.totalCost += numeric(ingredient.totalCost);
        aggregate.wastageCost += numeric(ingredient.wastageCost);
        totalsByItem.set(key, aggregate);
      }
    }
    return [...totalsByItem.values()];
  }, [batches]);

  const loadProductionData = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    setError('');
    try {
      const [recipeResponse, productionResponse] = await Promise.all([
        api.get('/inventory/recipes'),
        api.get('/inventory/production', { params: { from, to, limit: 200 } })
      ]);
      setRecipes(recipeResponse.data.data || []);
      setBatches(productionResponse.data.data?.batches || []);
      setTotals(productionResponse.data.data?.totals || {});
      setMovements(productionResponse.data.data?.movements || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load food production records.');
      showApiErrorToast(requestError, 'Unable to load food production records.');
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    loadProductionData(true);
  }, [loadProductionData]);

  useEffect(() => {
    const currentRecipeIsAvailable = batchRecipes.some(
      (recipe) => String(recipe._id) === String(form.recipeId)
    );
    if (currentRecipeIsAvailable) return;
    setForm((current) => ({
      ...current,
      recipeId: batchRecipes.length === 1 ? String(batchRecipes[0]._id) : ''
    }));
  }, [batchRecipes, form.recipeId]);

  useEffect(() => {
    if (!selectedRecipe) return;
    setForm((current) => ({
      ...current,
      productionQuantity: String(selectedRecipe.expectedProductionYield || 1)
    }));
  }, [selectedRecipe]);

  const submitProduction = async (event) => {
    event.preventDefault();
    if (!selectedRecipe) {
      setError('Select an active batch-production recipe.');
      return;
    }
    setSaving(true);
    setError('');
    const activeRequestKey = requestKey || createRequestKey();
    setRequestKey(activeRequestKey);
    try {
      await api.post('/inventory/production', {
        ...form,
        idempotencyKey: activeRequestKey,
        productionMethod: 'recipe_based',
        productionQuantity: Number(form.productionQuantity),
        acceptedQuantity: Number(form.productionQuantity),
        ingredients: [],
        wastage: []
      }, { headers: { 'Idempotency-Key': activeRequestKey } });
      setForm((current) => ({
        ...current,
        productionQuantity: ''
      }));
      setRequestKey('');
      await loadProductionData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to record food production.');
      showApiErrorToast(requestError, 'Unable to record food production.');
    } finally {
      setSaving(false);
    }
  };

  const submitKitchenClose = async (event) => {
    event.preventDefault();
    if (!closing) return;
    const activeRequestKey = closingRequestKey || createRequestKey();
    setClosingRequestKey(activeRequestKey);
    try {
      await api.post(`/inventory/production/${closing._id}/movements`, {
        movementType: closingType,
        quantity: Number(closingForm.quantity),
        reason: closingForm.reason,
        idempotencyKey: activeRequestKey
      });
      setClosing(null);
      setClosingForm({ quantity: '', reason: '' });
      setClosingRequestKey('');
      await loadProductionData();
    } catch (requestError) {
      showApiErrorToast(requestError, 'Unable to record prepared-food wastage.');
    }
  };

  const submitTransfer = async (event) => {
    event.preventDefault();
    if (!transferBatch) return;
    const activeRequestKey = transferRequestKey || createRequestKey();
    setTransferRequestKey(activeRequestKey);
    try {
      await api.post(`/inventory/production/${transferBatch._id}/transfer`, {
        ...transferForm,
        quantity: Number(transferForm.quantity),
        idempotencyKey: activeRequestKey
      });
      setTransferBatch(null);
      setTransferForm({ quantity: '', destinationLocation: '', notes: '' });
      setTransferRequestKey('');
      await loadProductionData();
    } catch (requestError) {
      showApiErrorToast(requestError, 'Unable to transfer prepared portions.');
    }
  };

  const cancelProduction = async (batch) => {
    if (!window.confirm(`Cancel ${batch.batchNumber} and restore its raw material deductions? This is only allowed before the portions are used.`)) return;
    try {
      await api.post(`/inventory/production/${batch._id}/cancel`, {
        idempotencyKey: createRequestKey()
      });
      await loadProductionData();
    } catch (requestError) {
      showApiErrorToast(requestError, 'Unable to cancel the production batch.');
    }
  };

  const metricCards = [
    ['Portions produced', totals.acceptedQuantity, ''],
    ['Reserved for open orders', totals.reservedQuantity, ''],
    ['Portions sold', totals.soldQuantity, ''],
    ['Wastage', totals.wastedQuantity, ''],
    ['Transferred out', totals.transferredOutQuantity, ''],
    ['Remaining portions', totals.availableQuantity, '']
  ];

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><LoadingSpinner /></div>;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CookingPot className="h-6 w-6 text-orvelle-champagne" />
            <h1 className="text-2xl font-bold text-orvelle-primary">Food Production & Kitchen Closing</h1>
          </div>
          <p className="mt-1 text-sm text-orvelle-muted">Record bulk production, raw ingredient use, prepared-food sales and kitchen wastage.</p>
        </div>
        <Button variant="outline" onClick={() => loadProductionData(true)} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      {error && <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map(([label, value]) => (
          <Card key={label} title={label}>
            <p className="text-2xl font-bold text-orvelle-primary">{quantity(value)}</p>
          </Card>
        ))}
      </div>

      {canViewFinancials && (
        <Card title="Production financial summary" subtitle="Bulk-production revenue is recognized after the restaurant bill is paid.">
          {batches.some((batch) => (
            !batch.isTransferBatch
            && Number(batch.productionCost) === 0
            && (batch.ingredients || []).some((ingredient) => Number(ingredient.actualQuantity) > 0)
          )) && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              One or more batches have zero recorded production cost. Check the raw-material batch costs; gross profit will be overstated until ingredient costs are recorded.
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ['Production cost', totals.productionCost],
              ['Raw material wastage', totals.rawMaterialWastageCost],
              ['Sales revenue', totals.salesRevenue],
              ['Gross profit on sold portions', totals.grossProfit],
              ['Prepared-food wastage cost', totals.wastageCost],
              ['Complimentary cost', totals.complimentaryCost],
              ['Staff consumption cost', totals.staffConsumptionCost],
              ['Remaining inventory value', totals.remainingInventoryValue],
              ['Food cost % of sales', `${numeric(totals.foodCostPercent)}%`],
              ['Raw material wastage %', `${numeric(totals.rawMaterialWastagePercent)}%`]
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg bg-orvelle-ivory p-3">
                <p className="text-xs text-orvelle-muted">{label}</p>
                <p className="mt-1 font-semibold text-orvelle-primary">
                  {label.includes('%') ? value : currency(value, formatCurrency)}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card
        title="Batch-production products"
        subtitle="Active menu recipes configured for bulk production appear here. Select a product to record a production batch."
        action={(
          <Button variant="outline" onClick={() => navigate('/inventory/recipes')}>
            Manage recipes
          </Button>
        )}
      >
        {batchRecipes.length ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {batchRecipes.map((recipe) => (
              <div key={recipe._id} className="flex flex-col justify-between gap-4 rounded-xl border border-orvelle-border bg-white p-4">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-orvelle-primary">
                        {recipe.menuItemId?.name || recipe.recipeName || 'Menu product'}
                      </h3>
                      <p className="mt-1 text-xs text-orvelle-muted">
                        {recipe.recipeName || 'Recipe'} · v{recipe.version}
                      </p>
                    </div>
                    <Badge variant={recipe.isActive ? 'active' : 'inactive'}>
                      {recipe.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm text-orvelle-primary">
                    Expected yield: {quantity(recipe.expectedProductionYield || 1)} portions
                  </p>
                  <p className="mt-1 text-xs text-orvelle-muted">
                    {recipe.expectedPreparationLossPercent || 0}% expected preparation loss · {recipe.ingredients.filter((ingredient) => !ingredient.optional).length} ingredients
                  </p>
                  {canViewFinancials && (
                    <p className="mt-2 text-xs text-orvelle-muted">
                      Selling price: {currency(recipe.sellingPrice, formatCurrency)} / portion
                      {' · '}Estimated cost: {currency(recipe.estimatedRecipeCost, formatCurrency)} / portion
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant={String(form.recipeId) === String(recipe._id) ? 'primary' : 'outline'}
                  onClick={() => {
                    setForm((current) => ({ ...current, recipeId: String(recipe._id) }));
                    document.getElementById('record-production-form')?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'center'
                    });
                  }}
                >
                  {String(form.recipeId) === String(recipe._id) ? 'Selected for production' : 'Produce this product'}
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-orvelle-border bg-orvelle-ivory/50 p-5">
            <p className="font-medium text-orvelle-primary">No active batch-production products found.</p>
            <p className="mt-1 text-sm text-orvelle-muted">
              In Recipe Management, create or edit a recipe, choose “Bulk production with prepared portions,” and keep the recipe active. It will appear here automatically.
            </p>
            <Button className="mt-4" variant="outline" onClick={() => navigate('/inventory/recipes')}>
              Open Recipe Management
            </Button>
          </div>
        )}
      </Card>

      <Card
        title="Record production"
        subtitle="Production portions default to the recipe yield. Recording production deducts recipe quantities; Served orders count sold portions and food cost. Paid bills add revenue."
      >
        <form id="record-production-form" className="space-y-5" onSubmit={submitProduction}>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Select
              label="Batch-production recipe"
              required
              value={form.recipeId}
              onChange={(event) => setForm({ ...form, recipeId: event.target.value })}
              options={[
                { label: 'Select recipe', value: '' },
                ...batchRecipes.map((recipe) => ({
                  label: `${recipe.menuItemId?.name || recipe.recipeName} · ${recipe.recipeName || 'Recipe'} v${recipe.version}`,
                  value: recipe._id
                }))
              ]}
            />
            <Input label="Production portions" required type="number" min="0.00000001" step="any" value={form.productionQuantity} onChange={(event) => setForm({ ...form, productionQuantity: event.target.value })} helperText="Accepted portions will match this quantity." />
            <Input label="Kitchen location" required value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} />
            <Input label="Raw material stock location" required value={form.rawMaterialLocation} onChange={(event) => setForm({ ...form, rawMaterialLocation: event.target.value })} helperText="Inventory batches are deducted from this location." />
            <Input label="Production date" required type="date" value={form.productionDate} onChange={(event) => setForm({ ...form, productionDate: event.target.value })} />
            <Input label="Use-by date" type="date" value={form.expiryDate} onChange={(event) => setForm({ ...form, expiryDate: event.target.value })} />
          </div>

          {selectedRecipe && (
            <div className="space-y-4 rounded-lg border border-orvelle-border p-4">
              <div>
                <h3 className="font-semibold text-orvelle-primary">{selectedRecipe.menuItemId?.name || selectedRecipe.recipeName}</h3>
                <p className="text-xs text-orvelle-muted">
                  Expected yield {selectedRecipe.expectedProductionYield || 1} · preparation loss {selectedRecipe.expectedPreparationLossPercent || 0}% · serving {selectedRecipe.servingSize || '1 serving'}
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={saving || !batchRecipes.length}>
              <Plus className="mr-2 h-4 w-4" /> {saving ? 'Recording…' : 'Record production'}
            </Button>
          </div>
        </form>
      </Card>

      <Card
        title="Production batches"
        subtitle="Portions are reserved when ordered, marked sold when served, and revenue is recorded when the bill is paid. Available excludes portions reserved for open orders."
        action={
          <div className="flex gap-2">
            <Input aria-label="From date" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
            <Input aria-label="To date" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </div>
        }
      >
        {batches.length === 0 ? (
          <div className="py-8 text-center text-sm text-orvelle-muted">No production batches in this date range.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="text-xs uppercase text-orvelle-muted">
                <tr>
                  <th className="px-3 py-2">Batch / production</th>
                  <th className="px-3 py-2">Portions</th>
                  <th className="px-3 py-2">Reserved</th>
                  <th className="px-3 py-2">Sold</th>
                  <th className="px-3 py-2">Wasted</th>
                  <th className="px-3 py-2">Available</th>
                  {canViewFinancials && <th className="px-3 py-2">Production cost / portion cost</th>}
                  {canViewFinancials && <th className="px-3 py-2">Revenue / profit</th>}
                  <th className="px-3 py-2">Use by / location</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-orvelle-border/70">
                {batches.map((batch) => (
                  <tr key={batch._id}>
                    <td className="px-3 py-3">
                      <p className="font-medium text-orvelle-primary">{batch.menuItemName}</p>
                      <p className="text-xs text-orvelle-muted">{batch.batchNumber} · {dayjs(batch.productionDate).format('DD MMM YYYY')} · {batch.productionMethod === 'actual_consumption' ? 'Actual use' : 'Recipe based'}</p>
                    </td>
                    <td className="px-3 py-3">{quantity(batch.acceptedQuantity)}</td>
                    <td className="px-3 py-3">{quantity(batch.reservedQuantity)}</td>
                    <td className="px-3 py-3">{quantity(batch.soldQuantity)}</td>
                    <td className="px-3 py-3">{quantity(batch.wastedQuantity)}</td>
                    <td className="px-3 py-3"><Badge variant={numeric(batch.availableQuantity) > 0 ? 'available' : 'default'}>{quantity(batch.availableQuantity)}</Badge></td>
                    {canViewFinancials && (
                      <td className="px-3 py-3">
                        {currency(batch.productionCost, formatCurrency)}
                        <p className="text-xs text-orvelle-muted">
                          {currency(batch.costPerPortion, formatCurrency)} / portion
                        </p>
                      </td>
                    )}
                    {canViewFinancials && <td className="px-3 py-3">{currency(batch.salesRevenue, formatCurrency)} / {currency(batch.grossProfit, formatCurrency)}</td>}
                    <td className="px-3 py-3">{batch.expiryDate ? dayjs(batch.expiryDate).format('DD MMM YYYY') : 'No use-by'}<p className="text-xs text-orvelle-muted">{batch.location}</p></td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" disabled={numeric(batch.availableQuantity) <= 0} onClick={() => { setClosing(batch); setClosingType('wastage'); setClosingForm({ quantity: '', reason: '' }); setClosingRequestKey(''); }}>
                          Kitchen close
                        </Button>
                        <Button size="sm" variant="outline" disabled={numeric(batch.availableQuantity) <= 0} onClick={() => {
                          setTransferBatch(batch);
                          setTransferForm({ quantity: String(batch.availableQuantity), destinationLocation: '', notes: '' });
                          setTransferRequestKey('');
                        }}>
                          Transfer
                        </Button>
                        {canViewFinancials && !batch.isTransferBatch && numeric(batch.soldQuantity) === 0 && numeric(batch.wastedQuantity) === 0
                          && numeric(batch.complimentaryQuantity) === 0 && numeric(batch.staffConsumptionQuantity) === 0
                          && numeric(batch.transferredOutQuantity) === 0 && (
                            <Button size="sm" variant="outline" onClick={() => cancelProduction(batch)}>Cancel production</Button>
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

      {canViewFinancials && (
        <Card title="Raw material consumption report" subtitle={`Ingredient use for batches produced from ${from} through ${to}; preparation wastage is tracked separately.`}>
          {rawMaterialUsage.length === 0 ? (
            <p className="py-6 text-center text-sm text-orvelle-muted">No ingredient consumption recorded in this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-xs uppercase text-orvelle-muted">
                  <tr><th className="px-3 py-2">Raw material</th><th className="px-3 py-2">Theoretical</th><th className="px-3 py-2">Actual used</th><th className="px-3 py-2">Additional wastage</th><th className="px-3 py-2">Consumption cost</th><th className="px-3 py-2">Wastage cost</th></tr>
                </thead>
                <tbody className="divide-y divide-orvelle-border/70">
                  {rawMaterialUsage.map((ingredient) => (
                    <tr key={ingredient.itemName}>
                      <td className="px-3 py-3 font-medium text-orvelle-primary">{ingredient.itemName}</td>
                      <td className="px-3 py-3">{quantity(ingredient.theoreticalQuantity)} {ingredient.unit}</td>
                      <td className="px-3 py-3">{quantity(ingredient.actualQuantity)} {ingredient.unit}</td>
                      <td className="px-3 py-3">{quantity(ingredient.wastageQuantity)} {ingredient.unit}</td>
                      <td className="px-3 py-3">{currency(ingredient.totalCost, formatCurrency)}</td>
                      <td className="px-3 py-3">{currency(ingredient.wastageCost, formatCurrency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      <Card title="Recent prepared-food movements" subtitle="Portions are reserved when ordered, marked sold when served, and revenue is recorded after payment; recipe raw-material use is not counted as wastage.">
        {movements.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-orvelle-muted"><ClipboardList className="h-4 w-4" />No movements recorded.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-xs uppercase text-orvelle-muted"><tr><th className="px-3 py-2">Time</th><th className="px-3 py-2">Item / batch</th><th className="px-3 py-2">Movement</th><th className="px-3 py-2">Quantity</th><th className="px-3 py-2">Reference / reason</th></tr></thead>
              <tbody className="divide-y divide-orvelle-border/70">
                {movements.map((movement) => {
                  const batch = batches.find((entry) => String(entry._id) === String(movement.productionBatchId));
                  return (
                    <tr key={movement._id}>
                      <td className="px-3 py-3">{dayjs(movement.createdAt).format('DD MMM YYYY, h:mm A')}</td>
                      <td className="px-3 py-3">{batch?.menuItemName || 'Prepared food'}<p className="text-xs text-orvelle-muted">{batch?.batchNumber || 'Production batch'}</p></td>
                      <td className="px-3 py-3 capitalize">{movement.movementType.replaceAll('_', ' ')}</td>
                      <td className="px-3 py-3">{quantity(movement.quantity)}</td>
                      <td className="px-3 py-3">{movement.orderNumber || movement.reason || movement.notes || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {closing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="dialog" aria-modal="true" aria-labelledby="kitchen-close-title">
          <Card className="w-full max-w-lg" title="Kitchen closing adjustment">
            <form onSubmit={submitKitchenClose} className="space-y-4">
              <p id="kitchen-close-title" className="text-sm text-orvelle-muted">
                Record a prepared-food adjustment for {closing.batchNumber}. The remaining balance is {quantity(closing.availableQuantity)}.
              </p>
              <Select
                label="Closing movement"
                value={closingType}
                onChange={(event) => setClosingType(event.target.value)}
                options={[
                  { label: 'Wastage / discarded', value: 'wastage' },
                  { label: 'Complimentary servings', value: 'complimentary' },
                  { label: 'Staff consumption', value: 'staff_consumption' }
                ]}
              />
              <Input label={`${closingType === 'wastage' ? 'Wasted' : closingType === 'complimentary' ? 'Complimentary' : 'Staff consumption'} portions`} required type="number" min="0.00000001" max={closing.availableQuantity} step="any" value={closingForm.quantity} onChange={(event) => setClosingForm({ ...closingForm, quantity: event.target.value })} />
              <Input label="Reason / reference" required={closingType === 'wastage'} value={closingForm.reason} onChange={(event) => setClosingForm({ ...closingForm, reason: event.target.value })} />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setClosing(null)}>Cancel</Button>
                <Button type="submit"><Trash2 className="mr-2 h-4 w-4" />Record {closingType.replaceAll('_', ' ')}</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
      {transferBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="dialog" aria-modal="true" aria-labelledby="production-transfer-title">
          <Card className="w-full max-w-lg" title="Transfer prepared portions">
            <form onSubmit={submitTransfer} className="space-y-4">
              <p id="production-transfer-title" className="text-sm text-orvelle-muted">
                Move portions of {transferBatch.menuItemName} from {transferBatch.location}. Transfers preserve batch cost and expiry.
              </p>
              <Input label="Transfer quantity" required type="number" min="0.00000001" max={transferBatch.availableQuantity} step="any" value={transferForm.quantity} onChange={(event) => setTransferForm({ ...transferForm, quantity: event.target.value })} />
              <Input label="Destination location" required value={transferForm.destinationLocation} onChange={(event) => setTransferForm({ ...transferForm, destinationLocation: event.target.value })} />
              <Input label="Transfer notes" value={transferForm.notes} onChange={(event) => setTransferForm({ ...transferForm, notes: event.target.value })} />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setTransferBatch(null)}>Cancel</Button>
                <Button type="submit">Transfer portions</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
