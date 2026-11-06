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
const UNIT_ALIASES = new Map([
  ['liter', 'L'], ['litre', 'L'], ['liters', 'L'], ['litres', 'L'],
  ['pieces', 'pcs'], ['piece', 'pcs'], ['boxes', 'box'],
  ['packets', 'packet'], ['bottles', 'bottle'], ['meters', 'm'], ['metres', 'm']
]);
const normalizeUnit = (unit = '') => UNIT_ALIASES.get(String(unit).toLowerCase()) || unit;

export const unitChoicesForItem = (item, availableUnits = []) => {
  if (!item) return [];
  const baseUnit = normalizeUnit(item.baseUnit || item.unit);
  const referenceUnit = (reference) => {
    if (reference && typeof reference === 'object') return reference;
    return availableUnits.find((unit) => String(unit._id) === String(reference)) || null;
  };
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
  const eligible = availableUnits.filter((unit) => unit.isActive && (
    (baseReference
      && unit.category === baseReference.category
      && baseDefinition?.category.toLowerCase() === baseReference.category
      && unitDefinitions.get(unit.symbol)?.factor
      && baseDefinition.factor)
    || configuredIds.has(String(unit._id))
    || configuredSymbols.has(unit.symbol)
  ));
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
