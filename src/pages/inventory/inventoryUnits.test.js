import { describe, expect, it } from 'vitest';
import { formatInventoryQuantity, unitChoicesForItem } from './inventoryUnits';

describe('inventory unit display', () => {
  it('renders stock using a readable larger unit', () => {
    expect(formatInventoryQuantity(15500, { baseUnit: 'ml' })).toBe('15.5 L');
  });

  it('only offers package units configured for the item', () => {
    const activeUnits = [
      { _id: 'g-id', name: 'Gram', symbol: 'g', category: 'weight', isActive: true },
      { _id: 'kg-id', name: 'Kilogram', symbol: 'kg', category: 'weight', isActive: true },
      { _id: 'box-id', name: 'Box', symbol: 'box', category: 'quantity', isActive: true },
      { _id: 'bag-id', name: 'Bag', symbol: 'bag', category: 'quantity', isActive: true }
    ];
    const choices = unitChoicesForItem({
      baseUnit: 'g',
      baseUnitId: activeUnits[0],
      purchaseUnit: 'bag',
      purchaseUnitId: activeUnits[3],
      packagingOptions: [{ unit: 'box', unitId: activeUnits[2], conversionFactor: 100 }]
    }, activeUnits);

    expect(choices.map(({ value }) => value)).toContain('g');
    expect(choices.map(({ value }) => value)).toContain('kg');
    expect(choices.map(({ value }) => value)).toContain('bag');
    expect(choices.map(({ value }) => value)).toContain('box');
    expect(choices.map(({ value }) => value)).not.toContain('pcs');
  });

  it('does not offer inactive unconfigured units for transaction entry', () => {
    const choices = unitChoicesForItem({
      baseUnit: 'g',
      baseUnitId: { _id: 'g-id', name: 'Gram', symbol: 'g', category: 'weight', isActive: true }
    }, [
      { _id: 'g-id', name: 'Gram', symbol: 'g', category: 'weight', isActive: true },
      { _id: 'old-kg', name: 'Old Kilogram', symbol: 'kg-old', category: 'weight', isActive: false }
    ]);

    expect(choices.map(({ value }) => value)).toEqual(['g']);
  });
});
