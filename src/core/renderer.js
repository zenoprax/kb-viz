// DOM renderer.
//
// The renderer reads the current state and writes the chrome, legend, action
// list, and keyboard. It never loads data or changes preferences; the actions
// layer owns those transitions.

import { countFacetValues } from './filters.js';
import { esc } from './dom.js';
import {
  renderFacetSwitch,
  updateKeymapSelect,
  updateFileChrome,
  updateLayerSwitch,
} from './render/chrome.js';
import { renderLegend } from './render/legend.js';
import { renderList } from './render/list.js';
import { renderKeyboard } from './render/keyboard.js';
import { buildKeyboardGeometry } from '../keyboard/geometry.js';
import {
  activeColourValues,
  colourValueIds,
  hasFacetFilters,
  hasVisibleFilters,
  sortedRows,
  visibleRows,
} from './view.js';

export function createRenderer(options) {
  const {
    elements,
    state,
    services,
    counts,
  } = options;

  function updateClearFilters() {
    elements.clearFiltersBtn.hidden = !hasFacetFilters(state);
  }

  function updateClearButton() {
    elements.clearBtn.disabled = !state.hasSavedCustom
      && !state.customSource;
  }

  let shownNotice = '';
  let noticeTimer = null;

  function renderNotice() {
    if (state.notice === shownNotice) return;
    shownNotice = state.notice;
    if (noticeTimer !== null) {
      clearTimeout(noticeTimer);
      noticeTimer = null;
    }
    if (!state.notice) {
      elements.notice.hidden = true;
      elements.notice.textContent = '';
      return;
    }
    elements.notice.hidden = false;
    elements.notice.textContent = state.notice;
    noticeTimer = setTimeout(() => {
      noticeTimer = null;
      state.notice = '';
      shownNotice = '';
      elements.notice.hidden = true;
      elements.notice.textContent = '';
      if (state.keymap) renderChrome();
    }, 6000);
  }

  function applyControlsExpanded() {
    const expanded = state.controlsExpanded;
    elements.keymapIntro.hidden = !expanded;
    elements.keymapControlsBody.hidden = !expanded;
    elements.controlsToggle.setAttribute('aria-expanded', String(expanded));
    elements.controlsToggleLabel.textContent = expanded
      ? 'Hide controls'
      : 'Show controls';
  }

  function updateSearchReset() {
    elements.searchReset.disabled = !state.actionQuery
      && !state.bindingQuery;
  }

  function sourceState() {
    return {
      layers: state.layers,
      custom: state.customSource,
      notice: state.notice,
    };
  }

  function renderChrome() {
    renderNotice();
    if (!state.keymap) return;
    updateFileChrome(elements, state.keymap, sourceState());
    updateLayerSwitch(elements, state.layers, Boolean(state.customSource));
    updateClearButton();
    if (state.facetModel) {
      const hasFacetChoices = state.facetModel.facets.length > 1;
      elements.facetGroup.hidden = !hasFacetChoices;
      elements.colourGroup.hidden = !hasFacetChoices;
      renderFacetSwitch(
        elements.legendSwitch,
        state.facetModel.facets,
        state.legendFacet,
        state.facetValues
      );
      elements.colourSelect.value = state.colourFacet;
    }
    updateKeymapSelect(elements.keymapSelect, state.keymap.id, counts);
    updateClearFilters();
    updateSearchReset();
  }

  function renderLegendEl() {
    if (!state.keymap || !state.facetModel) return;
    const facet = state.facetModel.byId.get(state.legendFacet);
    if (!facet) return;
    const values = state.facetValues.get(state.legendFacet) || [];
    const selected = state.filters[state.legendFacet] || new Set();
    const facetCounts = countFacetValues(state.entries, {
      facet,
      filters: state.filters,
      facets: state.facetModel.byId,
      keyFilter: state.keyFilter,
      actionQuery: state.actionQuery,
      bindingQuery: state.bindingQuery,
      actionLabel: state.keymap.actionLabel,
      groupLabel: state.keymap.groupLabel,
      keyIdsOf: services.keyIdsOf,
    });

    elements.legend.innerHTML = renderLegend({
      values,
      counts: facetCounts,
      selected,
      showSwatches: state.legendFacet === state.colourFacet,
    });
  }

  function renderListEl() {
    if (!state.keymap) return;
    const rows = sortedRows(state, services.keyIdsOf);
    elements.list.innerHTML = renderList({
      rows,
      traced: state.traced,
      loadError: state.loadError,
      actionLabel: state.keymap.actionLabel,
      groupLabel: state.keymap.groupLabel,
      colourValues: activeColourValues(state),
      valueIdsOf: entry => colourValueIds(state, entry),
    });
    elements.resultStatus.textContent = state.loadError
      ? state.loadError
      : rows.length + ' of ' + state.entries.length + ' bindings shown';
  }

  function renderKeyboardEl() {
    if (!state.keymap) return;
    if (!state.geometry || state.geometry.variant !== state.layout.variant) {
      state.geometry = buildKeyboardGeometry(state.layout.variant);
    }

    renderKeyboard({
      svg: elements.keyboard,
      geometry: state.geometry,
      layout: state.layout,
      rows: visibleRows(state, services.keyIdsOf),
      entries: state.entries,
      traced: state.traced,
      narrowed: hasVisibleFilters(state),
      colourValues: activeColourValues(state),
      actionLabel: state.keymap.actionLabel,
      keyIdsOf: services.keyIdsOf,
      valueIdsOf: entry => colourValueIds(state, entry),
      keyFilter: state.keyFilter,
      metaKeyLabel: services.metaLegend(),
    });
    elements.boardNone.textContent = state.layers.defaults
      || state.layers.custom
      ? 'No bindings in this view.'
      : 'No bindings selected.';
    elements.boardNone.hidden = state.entries.length > 0;
  }

  function renderKeyFilterEl() {
    if (!state.keyFilter) {
      elements.keyFilter.hidden = true;
      elements.keyFilter.innerHTML = '';
      return;
    }
    elements.keyFilter.hidden = false;
    elements.keyFilter.innerHTML = '<span>Key '
      + esc(services.keyLabel(state.keyFilter.keyId)) + '</span>'
      + '<button type="button" data-clear>clear</button>';
  }

  function renderResults() {
    renderLegendEl();
    renderListEl();
    renderKeyboardEl();
  }

  function renderAll() {
    renderResults();
    renderKeyFilterEl();
    updateClearFilters();
  }

  return {
    applyControlsExpanded,
    renderAll,
    renderChrome,
    renderResults,
    updateSearchReset,
  };
}
