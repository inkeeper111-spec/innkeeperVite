import { describe, expect, it } from 'vitest';
import {
  formatInventoryQuantity,
  getUnitConversionFactor,
  isPackageUnit,
  packageConversionFactorToBase,
  supportedUnitConversionFactorToBase,
  unitChoicesForItem,
  unitIdForItemSymbol
} from './inventoryUnits';

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

  it('limits raw material purchase choices to configured units and resolves their ids', () => {
    const units = [
      { _id: 'g-id', name: 'Gram', symbol: 'g', category: 'weight', isActive: true },
      { _id: 'bag-id', name: 'Bag', symbol: 'bag', category: 'package', isActive: true },
      { _id: 'kg-id', name: 'Kilogram', symbol: 'kg', category: 'weight', isActive: true }
    ];
    const material = {
      baseUnitId: 'g-id',
      supportedUnits: [
        { unitId: 'bag-id', unitSymbolSnapshot: 'bag', isDefaultPurchaseUnit: true, isActive: true }
      ]
    };

    expect(unitChoicesForItem(material, units).map(({ value }) => value)).toEqual(['bag']);
    expect(unitIdForItemSymbol(material, 'bag', units)).toBe('bag-id');
    expect(unitIdForItemSymbol(material, 'g', units)).toBeUndefined();
  });

  it('uses configured unit conversion factors and recognizes legacy package symbols', () => {
    const units = [
      { _id: 'kg-id', name: 'Kilogram', symbol: 'kg', category: 'weight', isActive: true },
      { _id: 'bag-id', name: 'Bag', symbol: 'bag', category: 'quantity', isActive: true },
      { _id: 'g-id', name: 'Gram', symbol: 'g', category: 'weight', baseUnitId: 'kg-id', conversionFactor: 0.001, isActive: true }
    ];

    expect(getUnitConversionFactor(units[2], units[0], units)).toBe(0.001);
    expect(isPackageUnit(units[1])).toBe(true);
  });

  it('calculates nested package conversions independent of supported-unit ordering', () => {
    const units = [
      { _id: 'pcs', name: 'Piece', symbol: 'pcs', category: 'quantity', isActive: true },
      { _id: 'tray', name: 'Tray', symbol: 'tray', category: 'quantity', isActive: true },
      { _id: 'carton', name: 'Carton', symbol: 'carton', category: 'quantity', isActive: true }
    ];
    const carton = { unitId: 'carton', packageSize: 12, packageMeasurementUnitId: 'tray', isActive: true };
    const tray = { unitId: 'tray', packageSize: 30, packageMeasurementUnitId: 'pcs', isActive: true };
    const forward = [carton, tray];
    const reverse = [tray, carton];

    expect(supportedUnitConversionFactorToBase('carton', forward, 'pcs', units)).toBe(360);
    expect(supportedUnitConversionFactorToBase('carton', reverse, 'pcs', units)).toBe(360);
    expect(supportedUnitConversionFactorToBase('tray', reverse, 'pcs', units)).toBe(30);
  });

  it('uses the unit master conversion instead of a material-specific override', () => {
    const units = [
      { _id: 'g', name: 'Gram', symbol: 'g', category: 'weight', isActive: true },
      { _id: 'scoop', name: 'Scoop', symbol: 'scoop', category: 'weight', baseUnitId: 'g', conversionFactor: 2, isActive: true }
    ];

    expect(supportedUnitConversionFactorToBase(
      'scoop',
      [{ unitId: 'scoop', conversionFactorToBase: 25, isActive: true }],
      'g',
      units
    )).toBe(2);
  });

  it('calculates package quantities in base units and rejects incompatible measurements', () => {
    const units = [
      { _id: 'g', name: 'Gram', symbol: 'g', category: 'weight', isActive: true },
      { _id: 'kg', name: 'Kilogram', symbol: 'kg', category: 'weight', isActive: true },
      { _id: 'ml', name: 'Millilitre', symbol: 'ml', category: 'volume', isActive: true },
      { _id: 'l', name: 'Litre', symbol: 'L', category: 'volume', isActive: true },
      { _id: 'bag', name: 'Bag', symbol: 'bag', category: 'package', isActive: true }
    ];

    expect(packageConversionFactorToBase(5, 'kg', 'g', units)).toBe(5000);
    expect(packageConversionFactorToBase(5, 'l', 'ml', units)).toBe(5000);
    expect(packageConversionFactorToBase(5, 'ml', 'g', units)).toBeNull();
    expect(packageConversionFactorToBase(5, 'bag', 'g', units)).toBeNull();
  });

  it('rejects circular package measurements', () => {
    const units = [
      { _id: 'pcs', name: 'Piece', symbol: 'pcs', category: 'quantity', isActive: true },
      { _id: 'tray', name: 'Tray', symbol: 'tray', category: 'quantity', isActive: true },
      { _id: 'carton', name: 'Carton', symbol: 'carton', category: 'quantity', isActive: true }
    ];
    const supported = [
      { unitId: 'tray', packageSize: 2, packageMeasurementUnitId: 'carton', isActive: true },
      { unitId: 'carton', packageSize: 12, packageMeasurementUnitId: 'tray', isActive: true }
    ];

    expect(supportedUnitConversionFactorToBase('carton', supported, 'pcs', units)).toBeNull();
  });
});
