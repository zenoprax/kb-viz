// DOM event wiring.
//
// Every listener delegates from a stable container, so re-rendering the
// legend, list, or keyboard does not require re-binding. The returned
// function removes everything the viewer registered.

import { on } from './dom.js';
import { watchSystemTheme } from '../theme/apply.js';

function focusButton(container, attribute, value) {
  const match = [...container.querySelectorAll('[' + attribute + ']')]
    .find(button => button.getAttribute(attribute) === value);
  if (match) match.focus();
}

export function bindEvents(options) {
  const {
    documentRef,
    elements,
    state,
    preferences,
    actions,
    renderer,
    media,
  } = options;
  const stops = [];

  function listen(target, eventName, handler) {
    stops.push(on(target, eventName, handler));
  }

  listen(elements.keymapSelect, 'change', () => {
    void actions.activateKeymap(elements.keymapSelect.value);
  });

  listen(elements.legend, 'click', event => {
    const button = event.target.closest('[data-value]');
    if (!button) return;
    const value = button.dataset.value;
    actions.toggleFacetFilter(state.legendFacet, value);
    renderer.renderAll();
    focusButton(elements.legend, 'data-value', value);
  });

  listen(elements.legendSwitch, 'click', event => {
    const button = event.target.closest('[data-facet]');
    if (!button || button.dataset.facet === state.legendFacet) return;
    const facetId = button.dataset.facet;
    actions.setLegendFacet(facetId);
    focusButton(elements.legendSwitch, 'data-facet', facetId);
  });

  listen(elements.clearFiltersBtn, 'click', () => {
    actions.clearFilters();
  });

  listen(elements.colourSelect, 'change', () => {
    actions.setColourFacet(elements.colourSelect.value);
  });

  listen(elements.layerSwitch, 'click', event => {
    const button = event.target.closest('[data-layer]');
    if (!button || button.disabled) return;
    actions.toggleLayer(button.dataset.layer);
  });

  listen(elements.list, 'click', event => {
    const row = event.target.closest('[data-idx]');
    if (!row) return;
    actions.selectTrace(Number(row.dataset.idx));
  });

  listen(elements.keyboard, 'click', event => {
    const group = event.target.closest('[data-bound]');
    if (group) actions.selectKey(group.dataset.key);
  });

  listen(elements.keyboard, 'keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const group = event.target.closest('[data-bound]');
    if (!group) return;
    event.preventDefault();
    actions.selectKey(group.dataset.key);
  });

  listen(elements.keyFilter, 'click', event => {
    if (event.target.closest('[data-clear]')) actions.clearKeyFilter();
  });

  listen(elements.importBtn, 'click', () => {
    void actions.openFile();
  });

  listen(elements.fileInput, 'change', () => {
    const file = elements.fileInput.files[0];
    if (file) void actions.loadFile(file);
    elements.fileInput.value = '';
  });

  let dragDepth = 0;
  const hasFiles = event => Boolean(event.dataTransfer)
    && [...event.dataTransfer.types].includes('Files');

  listen(documentRef, 'dragenter', event => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    dragDepth += 1;
    documentRef.body.classList.add('dragging');
  });

  listen(documentRef, 'dragover', event => {
    if (!hasFiles(event)) return;
    event.preventDefault();
  });

  listen(documentRef, 'dragleave', event => {
    if (!hasFiles(event)) return;
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) documentRef.body.classList.remove('dragging');
  });

  listen(documentRef, 'drop', event => {
    event.preventDefault();
    dragDepth = 0;
    documentRef.body.classList.remove('dragging');
    const file = event.dataTransfer.files[0];
    if (file) void actions.loadFile(file);
  });

  listen(elements.controlsToggle, 'click', () => {
    actions.setControlsExpanded(!state.controlsExpanded);
  });

  listen(elements.metaSelect, 'change', () => {
    actions.setMetaStyle(elements.metaSelect.value);
  });

  listen(elements.themeSelect, 'change', () => {
    actions.setTheme(elements.themeSelect.value);
  });

  listen(elements.layoutSelect, 'change', () => {
    actions.setLayout(elements.layoutSelect.value);
  });

  listen(elements.clearBtn, 'click', () => {
    void actions.clearCustom();
  });

  listen(elements.resetAppBtn, 'click', () => {
    void actions.resetEverything();
  });

  listen(elements.search, 'input', () => {
    actions.setActionQuery(elements.search.value);
  });

  listen(elements.bindingSearch, 'input', () => {
    actions.setBindingQuery(elements.bindingSearch.value);
  });

  listen(elements.searchReset, 'click', () => {
    actions.clearSearch();
  });

  listen(documentRef, 'keydown', event => {
    if (event.key === 'Escape') actions.escape();
  });

  stops.push(watchSystemTheme(media, prefersDark => {
    if (preferences.snapshot().themeId !== 'system') return;
    actions.applySystemTheme(prefersDark);
  }));

  return () => {
    for (const stop of stops) stop();
    stops.length = 0;
  };
}
