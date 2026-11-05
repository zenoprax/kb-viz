// Derived view state.
//
// These selectors read the mutable viewer state but never touch the DOM,
// so the renderer and the event layer can share one definition of what is
// visible, sorted, or filtered.

import { filterEntries, sortEntries } from './filters.js';
import { facetValueIds } from './facets.js';

export function visibleRows(state, keyIdsOf) {
  return filterEntries(state.entries, {
    filters: state.filters,
    facets: state.facetModel ? state.facetModel.byId : null,
    keyFilter: state.keyFilter,
    actionQuery: state.actionQuery,
    bindingQuery: state.bindingQuery,
    actionLabel: state.keymap.actionLabel,
    groupLabel: state.keymap.groupLabel,
    keyIdsOf,
  });
}

function sortFacet(state) {
  if (!state.facetModel) return null;
  return state.facetModel.byId.get(state.facetModel.defaultFacetId)
    || state.facetModel.facets[0];
}

export function sortedRows(state, keyIdsOf) {
  const facet = sortFacet(state);
  const values = facet ? state.facetValues.get(facet.id) || [] : [];
  return sortEntries(visibleRows(state, keyIdsOf), {
    order: values.map(value => value.id),
    valueOf: entry => facet ? facetValueIds(facet, entry)[0] : '',
    actionLabel: state.keymap.actionLabel,
  });
}

function activeColourFacet(state) {
  if (!state.facetModel || !state.colourFacet) return null;
  return state.facetModel.byId.get(state.colourFacet) || null;
}

export function activeColourValues(state) {
  if (!state.facetModel || !state.colourFacet) return [];
  return state.facetValues.get(state.colourFacet) || [];
}

export function colourValueIds(state, entry) {
  const facet = activeColourFacet(state);
  return facet ? facetValueIds(facet, entry) : ['other'];
}

export function hasFacetFilters(state) {
  return Object.values(state.filters)
    .some(selected => selected && selected.size > 0);
}

// True when any control is narrowing the keyboard, so unbound keys can dim.
export function hasVisibleFilters(state) {
  return hasFacetFilters(state)
    || Boolean(state.keyFilter)
    || Boolean(state.actionQuery.trim())
    || Boolean(state.bindingQuery.trim());
}
