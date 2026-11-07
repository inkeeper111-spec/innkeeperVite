export const INVENTORY_UNITS = [
  {
    category: 'Weight',
    units: [
      { unit: 'kg', label: 'Kilogram (kg)', factor: 1000 },
      { unit: 'g', label: 'Gram (g)', factor: 1 },
      { unit: 'mg', label: 'Milligram (mg)', factor: 0.001 },
      { unit: 'MT', label: 'Metric tonne (MT)', factor: 1000000 }
    ]
  },
  {
    category: 'Volume',
    units: [
      { unit: 'L', label: 'Litre (L)', factor: 1000 },
      { unit: 'ml', label: 'Millilitre (ml)', factor: 1 },
      { unit: 'KL', label: 'Kilolitre (KL)', factor: 1000000 }
    ]
  },
  {
    category: 'Quantity',
    units: [
      { unit: 'pcs', label: 'Piece (pcs)', factor: 1 },
      { unit: 'box', label: 'Box', factor: null },
      { unit: 'packet', label: 'Packet', factor: null },
      { unit: 'carton', label: 'Carton', factor: null },
      { unit: 'tray', label: 'Tray', factor: null },
      { unit: 'dozen', label: 'Dozen', factor: 12 },
      { unit: 'set', label: 'Set', factor: null },
      { unit: 'pair', label: 'Pair', factor: 2 },
      { unit: 'bottle', label: 'Bottle', factor: null },
      { unit: 'can', label: 'Can', factor: null },
      { unit: 'bag', label: 'Bag', factor: null },
      { unit: 'roll', label: 'Roll', factor: null }
    ]
  },
  {
    category: 'Length',
    units: [
      { unit: 'm', label: 'Metre (m)', factor: 1000 },
      { unit: 'cm', label: 'Centimetre (cm)', factor: 10 },
      { unit: 'mm', label: 'Millimetre (mm)', factor: 1 }
    ]
  },
  {
    category: 'Area',
    units: [
      { unit: 'm²', label: 'Square metre (m²)', factor: 1 },
      { unit: 'sq.ft', label: 'Square foot (sq.ft)', factor: 0.09290304 }
    ]
  }
];

const unitDefinitions = new Map(INVENTORY_UNITS.flatMap(({ category, units }) =>
  units.map((entry) => [entry.unit, { ...entry, category }])
));
const PACKAGE_UNIT_SYMBOLS = new Set([
  'bag', 'box', 'bottle', 'can', 'carton', 'packet', 'roll', 'set', 'tray'
]);
const UNIT_ALIASES = new Map([
  ['liter', 'L'], ['litre', 'L'], ['liters', 'L'], ['litres', 'L'],
  ['pieces', 'pcs'], ['piece', 'pcs'], ['boxes', 'box'],
  ['packets', 'packet'], ['bottles', 'bottle'], ['meters', 'm'], ['metres', 'm']
]);
const normalizeUnit = (unit = '') => UNIT_ALIASES.get(String(unit).toLowerCase()) || unit;

const resolveUnit = (reference, availableUnits) => {
  if (reference && typeof reference === 'object') return reference;
  return availableUnits.find((unit) => String(unit._id) === String(reference)
    || unit.symbol === reference) || null;
};

const conversionFactorFromUnitRecords = (from, to) => {
  if (!from || !to || from.category !== to.category) return null;
  const fromBaseId = String(from.baseUnitId?._id || from.baseUnitId || '');
  const toBaseId = String(to.baseUnitId?._id || to.baseUnitId || '');
  const fromFactor = Number(from.conversionFactor);
  const toFactor = Number(to.conversionFactor);
  if (fromBaseId && fromBaseId === String(to._id) && fromFactor > 0) return fromFactor;
  if (toBaseId && toBaseId === String(from._id) && toFactor > 0) return 1 / toFactor;
  if (fromBaseId && fromBaseId === toBaseId && fromFactor > 0 && toFactor > 0) {
    return fromFactor / toFactor;
  }
  if (from._id && to._id && String(from._id) === String(to._id)) return 1;
  return null;
};

export const isPackageUnit = (unit) => Boolean(
  unit && (unit.category === 'package' || (
    unit.category === 'quantity' && PACKAGE_UNIT_SYMBOLS.has(String(unit.symbol || '').toLowerCase())
  ))
);

export const getUnitConversionFactor = (fromReference, toReference, availableUnits = []) => {
  const fromUnit = resolveUnit(fromReference, availableUnits);
  const toUnit = resolveUnit(toReference, availableUnits);
  const configuredFactor = conversionFactorFromUnitRecords(fromUnit, toUnit);
  if (configuredFactor) return configuredFactor;
  const fromSymbol = typeof fromReference === 'object' ? fromReference?.symbol : fromReference;
  const toSymbol = typeof toReference === 'object' ? toReference?.symbol : toReference;
  const from = unitDefinitions.get(normalizeUnit(fromSymbol));
  const to = unitDefinitions.get(normalizeUnit(toSymbol));
  if (!from || !to || from.category !== to.category || !from.factor || !to.factor) return null;
  return from.factor / to.factor;
};

export const packageConversionFactorToBase = (packageSize, measurementUnitId, baseUnitId, availableUnits = []) => {
  const quantity = Number(packageSize);
  const measurementUnit = resolveUnit(measurementUnitId, availableUnits);
  const baseUnit = resolveUnit(baseUnitId, availableUnits);
  if (!Number.isFinite(quantity) || quantity <= 0
    || !measurementUnit || !baseUnit
    || isPackageUnit(measurementUnit)
    || measurementUnit.category !== baseUnit.category) return null;
  const measurementFactor = getUnitConversionFactor(measurementUnit, baseUnit, availableUnits);
  return measurementFactor > 0 ? quantity * measurementFactor : null;
};

export const supportedUnitConversionFactorToBase = (
  purchaseUnitId,
  supportedUnits = [],
  baseUnitId,
  availableUnits = [],
  visiting = new Set()
) => {
  const purchaseId = String(purchaseUnitId || '');
  const baseId = String(typeof baseUnitId === 'object' ? baseUnitId?._id : baseUnitId || '');
  if (!purchaseId || !baseId) return null;
  if (purchaseId === baseId) return 1;
  if (visiting.has(purchaseId)) return null;
  const unit = availableUnits.find((entry) => String(entry._id) === purchaseId);
  if (!unit || unit.isActive === false) return null;

  const configured = supportedUnits.find((entry) => {
    const ref = typeof entry.unitId === 'object' ? entry.unitId?._id : entry.unitId;
    return String(ref || '') === purchaseId && entry.isActive !== false;
  });
  if (isPackageUnit(unit)) {
    if (!configured || !(Number(configured.packageSize) > 0) || !configured.packageMeasurementUnitId) return null;
    const nextVisiting = new Set(visiting);
    nextVisiting.add(purchaseId);
    const factor = supportedUnitConversionFactorToBase(
      typeof configured.packageMeasurementUnitId === 'object'
        ? configured.packageMeasurementUnitId?._id
        : configured.packageMeasurementUnitId,
      supportedUnits,
      baseId,
      availableUnits,
      nextVisiting
    );
    return factor ? factor * Number(configured.packageSize) : null;
  }
  const base = availableUnits.find((entry) => String(entry._id) === baseId);
  return getUnitConversionFactor(unit, base, availableUnits);
};

export const unitChoicesForItem = (item, availableUnits = []) => {
  if (!item) return [];
  const baseUnit = normalizeUnit(item.baseUnit || item.unit);
  const referenceUnit = (reference) => {
    if (reference && typeof reference === 'object') return reference;
    return availableUnits.find((unit) => String(unit._id) === String(reference)) || null;
  };
  if (Array.isArray(item.supportedUnits)) {
    const supportedChoices = item.supportedUnits
      .filter((entry) => entry?.isActive !== false)
      .map((entry) => {
        const unit = typeof entry.unitId === 'object' ? entry.unitId : referenceUnit(entry.unitId);
        const symbol = entry.unitSymbolSnapshot || unit?.symbol || entry.symbol;
        if (!symbol || unit?.isActive === false) return null;
        return {
          group: unit?.category
            ? unit.category.charAt(0).toUpperCase() + unit.category.slice(1)
            : 'Purchase',
          label: `${unit?.name || entry.unitNameSnapshot || symbol} (${symbol})`,
          value: symbol
        };
      })
      .filter(Boolean);
    return supportedChoices.filter((choice, index, choices) =>
      choices.findIndex((entry) => entry.value === choice.value) === index
    );
  }
  const baseReference = referenceUnit(item.baseUnitId)
    || availableUnits.find((unit) => unit.symbol === baseUnit)
    || null;
  const configuredReferences = [
    referenceUnit(item.purchaseUnitId),
    ...(item.additionalPackagingOptions || []).map((option) => referenceUnit(option.unitId)),
    ...(item.packagingOptions || []).map((option) => referenceUnit(option.unitId))
  ].filter(Boolean);
  const configuredIds = new Set(configuredReferences.map((unit) => String(unit._id)));
  const configuredSymbols = new Set([
    item.purchaseUnit,
    ...Object.keys(item.unitConversions || {}),
    ...(item.packagingOptions || []).map((option) => option.unit)
  ].filter(Boolean));
  const baseDefinition = unitDefinitions.get(baseUnit);
  const eligible = availableUnits.filter((unit) => {
    const compatible = baseReference
      && unit.category === baseReference.category
      && ((baseDefinition?.category.toLowerCase() === baseReference.category
        && unitDefinitions.get(unit.symbol)?.factor
        && baseDefinition.factor)
        || getUnitConversionFactor(unit, baseReference, availableUnits));
    return unit.isActive && (
      compatible
    || configuredIds.has(String(unit._id))
    || configuredSymbols.has(unit.symbol)
    );
  });
  const allChoices = [...eligible, ...[baseReference, ...configuredReferences].filter(Boolean)]
    .filter((unit, index, units) => units.findIndex((entry) => String(entry._id) === String(unit._id)) === index);
  const legacySymbols = [baseUnit, ...configuredSymbols].filter((symbol) => (
    symbol && !allChoices.some((unit) => unit.symbol === symbol)
  ));
  const historicalChoices = legacySymbols.map((symbol) => ({
    _id: `legacy:${symbol}`,
    category: 'historical reference',
    name: symbol,
    symbol,
    isActive: false
  }));
  return [...allChoices, ...historicalChoices]
    .sort((left, right) => left.category.localeCompare(right.category) || left.name.localeCompare(right.name))
    .map((unit) => ({
      group: unit.category.charAt(0).toUpperCase() + unit.category.slice(1),
      label: `${unit.name} (${unit.symbol})`,
      value: unit.symbol
    }));
};

export const unitIdForItemSymbol = (item, symbol, availableUnits = []) => {
  if (!item || !symbol) return undefined;
  const configured = item.supportedUnits?.find((entry) => {
    const unit = typeof entry.unitId === 'object'
      ? entry.unitId
      : availableUnits.find((candidate) => String(candidate._id) === String(entry.unitId));
    return (entry.unitSymbolSnapshot || unit?.symbol || entry.symbol) === symbol
      && entry.isActive !== false
      && unit?.isActive !== false;
  });
  if (configured) {
    const unitId = typeof configured.unitId === 'object'
      ? configured.unitId._id
      : configured.unitId;
    return unitId ? String(unitId) : undefined;
  }
  if (item.supportedUnits) return undefined;
  return String(item.baseUnitId?._id || item.baseUnitId || '') || undefined;
};

export const formatInventoryQuantity = (quantity, item) => {
  const baseUnit = normalizeUnit(item?.baseUnit || item?.unit || '');
  const base = unitDefinitions.get(baseUnit);
  if (!base || !Number.isFinite(Number(quantity))) {
    return `${Number(quantity || 0)} ${baseUnit}`.trim();
  }
  const preferred = INVENTORY_UNITS.flatMap((group) => group.units)
    .filter((entry) => {
      const definition = unitDefinitions.get(entry.unit);
      return definition.category === base.category
        && entry.factor
        && base.factor
        && entry.factor > base.factor
        && Number(quantity) >= entry.factor / base.factor;
    })
    .sort((left, right) => right.factor - left.factor)[0];
  if (!preferred) return `${Number(quantity)} ${baseUnit}`.trim();
  const converted = Number(quantity) * base.factor / preferred.factor;
  const rounded = Number(converted.toPrecision(6));
  return `${rounded} ${preferred.unit}`;
};
