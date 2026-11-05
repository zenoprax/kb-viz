// Filtering, sorting, and count labels.

import { facetValueIds } from './facets.js';

function keyIdSet(value) {
  if (value instanceof Set) return value;
  if (Array.isArray(value)) return new Set(value);
  if (value === null || value === undefined) return new Set();
  return new Set([value]);
}

function omitFacet(filters, facetId) {
  const result = {};
  for (const [id, selected] of Object.entries(filters || {})) {
    if (id !== facetId) result[id] = selected;
  }
  return result;
}

function facetById(facets, id) {
  if (!facets) return null;
  if (facets instanceof Map) return facets.get(id) || null;
  return facets[id] || null;
}

export function filterEntries(entries, options) {
  const {
    filters = {},
    facets = null,
    keyFilter = null,
    actionQuery = '',
    bindingQuery = '',
    actionLabel,
    groupLabel,
    keyIdsOf,
  } = options;
  const actionNeedle = String(actionQuery).trim().toLowerCase();
  const bindingNeedle = String(bindingQuery).trim().toLowerCase();

  return entries.filter(entry => {
    for (const [facetId, selected] of Object.entries(filters)) {
      const values = keyIdSet(selected);
      if (!values.size) continue;
      const facet = facetById(facets, facetId);
      if (!facet) continue;
      const entryValues = facetValueIds(facet, entry);
      if (!entryValues.some(value => values.has(value))) return false;
    }

    if (keyFilter) {
      const ids = keyIdSet(keyIdsOf ? keyIdsOf(entry) : []);
      if (!ids.has(keyFilter.keyId)) return false;
    }

    if (actionNeedle) {
      const haystack = [
        entry.action,
        entry.group || '',
        String(entry.action || '').replace(/[_\-]+/g, ' '),
        actionLabel(entry),
        groupLabel(entry),
      ].join(' ').toLowerCase();
      if (!haystack.includes(actionNeedle)) return false;
    }

    if (bindingNeedle) {
      const haystack = String(entry.combo || '').toLowerCase();
      if (!haystack.includes(bindingNeedle)) return false;
    }

    return true;
  });
}

// Counts a facet's values after every filter except that facet's own
// selection. This keeps the legend useful while a facet is being multi-picked.
export function countFacetValues(entries, options) {
  const { facet, filters = {}, ...rest } = options;
  if (!facet) return {};

  const rows = filterEntries(entries, {
    ...rest,
    filters: omitFacet(filters, facet.id),
  });
  const counts = {};

  for (const entry of rows) {
    for (const value of facetValueIds(facet, entry)) {
      counts[value] = (counts[value] || 0) + 1;
    }
  }

  return counts;
}

export function sortEntries(rows, options) {
  const {
    order = [],
    valueOf = () => '',
    actionLabel,
  } = options;
  const position = value => {
    const index = order.indexOf(value);
    return index === -1 ? order.length : index;
  };

  return rows.slice().sort((left, right) => {
    const leftValue = valueOf(left);
    const rightValue = valueOf(right);
    if (leftValue !== rightValue) {
      return position(leftValue) - position(rightValue);
    }
    return actionLabel(left).localeCompare(actionLabel(right));
  });
}
