// Facet model.
//
// Facet values receive palette slots in declaration or first-seen order.
// The core does not name colours or categories; themes own the palette.

const ACCENT_SLOTS = Object.freeze([
  'accent-1', 'accent-2', 'accent-3',
  'accent-4', 'accent-5', 'accent-6',
]);

const NEUTRAL_SLOT = 'neutral';

// Closed facets reserve an implicit other value for undeclared data.
function closedValue(values, value) {
  return values[value] ? value : 'other';
}

function normalizeFacet(declared) {
  const values = declared.values ? { ...declared.values } : null;
  const closed = declared.closed === true;
  if (closed && !values.other) values.other = { name: 'Other' };

  const rawValueOf = declared.valueOf;
  const valueOf = closed
    ? entry => {
      const raw = rawValueOf(entry);
      if (!declared.multiple) {
        const value = Array.isArray(raw) ? raw[0] : raw;
        return closedValue(values, String(value));
      }
      const list = Array.isArray(raw) ? raw : [raw];
      return list.map(value => closedValue(values, String(value)));
    }
    : rawValueOf;

  return {
    id: declared.id,
    name: declared.name,
    multiple: declared.multiple === true,
    closed,
    default: declared.default === true,
    values,
    valueOf,
    rawValueOf,
    labelOf: declared.labelOf || null,
  };
}

function fallbackFacet() {
  return {
    id: 'all',
    name: 'All',
    multiple: false,
    closed: false,
    default: true,
    values: {
      all: { name: 'All bindings' },
    },
    valueOf: () => 'all',
    rawValueOf: () => 'all',
  };
}

// Builds the facet list for one keymap. The default facet drives the
// filter, colour, and sort dimension; the first facet is default when
// none is marked.
export function createFacetModel(keymap) {
  const facets = [];
  for (const declared of keymap.facets || []) {
    facets.push(normalizeFacet(declared));
  }
  if (!facets.length) facets.push(fallbackFacet());

  const byId = new Map();
  for (const facet of facets) {
    if (byId.has(facet.id)) {
      throw new Error('Duplicate facet id ' + facet.id);
    }
    byId.set(facet.id, facet);
  }

  const chosen = facets.find(facet => facet.default);
  return {
    facets,
    byId,
    defaultFacetId: chosen ? chosen.id : facets[0].id,
  };
}

function rawIds(raw, multiple) {
  const list = multiple
    ? (Array.isArray(raw) ? raw : [raw])
    : [Array.isArray(raw) ? raw[0] : raw];
  const values = list
    .filter(value => value !== null && value !== undefined && value !== '')
    .map(value => String(value));
  return [...new Set(values)];
}

export function facetValueIds(facet, entry) {
  if (!facet || typeof facet.valueOf !== 'function') return ['other'];
  const values = rawIds(facet.valueOf(entry), facet.multiple);
  return values.length ? values : ['other'];
}

// Raw values before closed-facet coercion, so checks can reject undeclared
// data instead of silently counting it as other.
export function facetRawValueIds(facet, entry) {
  if (!facet || typeof facet.rawValueOf !== 'function') return [];
  return rawIds(facet.rawValueOf(entry), facet.multiple);
}

function accentSlot(index) {
  return ACCENT_SLOTS[index % ACCENT_SLOTS.length];
}

function dynamicValue(facet, id, palette) {
  const fallbackName = id === 'other' ? 'Other' : id;
  const label = facet.labelOf ? facet.labelOf(id) : fallbackName;
  return {
    id,
    name: label || fallbackName,
    palette,
  };
}

export function facetValues(facet, entries) {
  const values = [];
  const seen = new Set();
  let accentIndex = 0;

  for (const [id, declared] of Object.entries(facet.values || {})) {
    const palette = id === 'other'
      ? NEUTRAL_SLOT
      : accentSlot(accentIndex++);
    values.push({
      id,
      name: declared && declared.name ? declared.name : id,
      palette,
    });
    seen.add(id);
  }

  for (const entry of entries) {
    for (const id of facetValueIds(facet, entry)) {
      if (seen.has(id)) continue;
      const palette = id === 'other'
        ? NEUTRAL_SLOT
        : accentSlot(accentIndex++);
      values.push(dynamicValue(facet, id, palette));
      seen.add(id);
    }
  }

  return values;
}

function facetValue(id, values = []) {
  return values.find(value => value.id === id) || null;
}

export function facetPalette(id, values = []) {
  const value = facetValue(id, values);
  return value && value.palette ? value.palette : NEUTRAL_SLOT;
}
