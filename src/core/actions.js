// Application actions.
//
// Actions own state transitions, preference writes, and data loading. The
// event layer decides when to call them; the renderer only reflects the
// resulting state.

import { createFacetModel, facetValues } from './facets.js';
import { normalizeLayers } from './layers.js';
import { readFileText } from './files.js';
import { fillSelect } from './render/chrome.js';
import { resolveMetaStyle } from '../keyboard/meta-key.js';
import { applyThemeChoice } from '../theme/apply.js';

export function createActions(options) {
  const {
    state,
    elements,
    preferences,
    data,
    fileStore,
    renderer,
    keymapRegistry,
    layoutRegistry,
    themeRegistry,
    media,
    documentRef,
    windowRef,
  } = options;

  function resolveFacetId(model, requested) {
    if (requested && model.byId.has(requested)) return requested;
    return model.defaultFacetId;
  }

  function refreshFacetValues() {
    const values = new Map();
    if (state.facetModel) {
      for (const facet of state.facetModel.facets) {
        values.set(facet.id, facetValues(facet, state.entries));
      }
    }
    state.facetValues = values;
  }

  function clearSearchText() {
    state.actionQuery = '';
    state.bindingQuery = '';
    elements.search.value = '';
    elements.bindingSearch.value = '';
    renderer.updateSearchReset();
  }

  function clearFilterState() {
    state.filters = {};
    state.traced = null;
    state.keyFilter = null;
    clearSearchText();
  }

  function resolveEntries(keymap, options) {
    const entries = keymap.resolve(options);
    if (!Array.isArray(entries)) {
      throw new Error('Resolve returned no list.');
    }
    return entries;
  }

  function checkCustom(keymap, text) {
    resolveEntries(keymap, {
      defaults: null,
      custom: text,
      layers: { defaults: false, custom: true },
    });
  }

  function failIngest(message) {
    clearFilterState();
    state.entries = [];
    refreshFacetValues();
    state.loadError = message;
    renderer.renderChrome();
    renderer.renderAll();
  }

  function recompose() {
    if (!state.keymap) {
      state.entries = [];
      refreshFacetValues();
      return;
    }

    try {
      const entries = resolveEntries(state.keymap, {
        defaults: state.defaultText,
        custom: state.customSource ? state.customSource.text : null,
        layers: state.layers,
      });
      entries.forEach((entry, index) => {
        entry.index = index;
      });
      state.entries = entries;
    } catch (error) {
      state.entries = [];
      state.notice = 'Could not combine bindings: ' + error.message;
    }
    refreshFacetValues();
  }

  function applyLayers(nextLayers) {
    if (!state.keymap) return false;
    const layers = normalizeLayers(
      nextLayers,
      Boolean(state.customSource)
    );
    state.layers = layers;
    state.notice = '';
    preferences.setLayers(state.keymap.id, layers);
    clearFilterState();
    recompose();
    renderer.renderChrome();
    renderer.renderAll();
    return true;
  }

  function toggleLayer(layer) {
    if (layer === 'custom' && !state.customSource) return false;
    if (layer !== 'defaults' && layer !== 'custom') return false;
    return applyLayers({
      ...state.layers,
      [layer]: !state.layers[layer],
    });
  }

  async function activateKeymap(id, activateOptions = {}) {
    const keymap = keymapRegistry.get(id);
    if (!keymap) return false;
    if (state.keymap && state.keymap.id === id && !activateOptions.force) {
      return true;
    }

    const request = ++state.requestId;
    const storedLayers = preferences.layersFor(id);
    state.keymap = keymap;
    state.facetModel = createFacetModel(keymap);
    state.legendFacet = resolveFacetId(
      state.facetModel,
      preferences.legendFor(id)
    );
    state.colourFacet = resolveFacetId(
      state.facetModel,
      preferences.colourFor(id)
    );
    state.facetValues = new Map();
    fillSelect(
      elements.colourSelect,
      state.facetModel.facets,
      state.colourFacet
    );
    clearFilterState();
    state.defaultText = null;
    state.customSource = null;
    state.hasSavedCustom = false;
    state.entries = [];
    state.loadError = '';
    state.notice = '';
    state.layers = normalizeLayers(storedLayers || {}, false);
    preferences.setKeymap(id);
    renderer.renderChrome();
    renderer.renderAll();

    try {
      const loaded = await data.load(keymap);
      if (request !== state.requestId) return false;

      state.defaultText = loaded.text;
      state.hasSavedCustom = Boolean(loaded.saved);

      if (loaded.saved) {
        try {
          checkCustom(keymap, loaded.saved.text);
          state.customSource = {
            text: loaded.saved.text,
            label: loaded.saved.fileName,
          };
        } catch (error) {
          state.customSource = null;
          state.notice = 'Saved custom file could not be read: '
            + error.message;
        }
      }

      // No layer record means this keymap was used before, or a custom
      // file outlived its preferences. Showing defaults plus that file
      // keeps the two layers visible together.
      const baseLayers = storedLayers || {
        defaults: true,
        custom: Boolean(state.customSource),
      };
      state.layers = normalizeLayers(
        baseLayers,
        Boolean(state.customSource)
      );

      recompose();
      renderer.renderChrome();
      renderer.renderAll();
      return true;
    } catch (error) {
      if (request !== state.requestId) return false;
      state.notice = '';
      failIngest('Could not load ' + keymap.name + ': ' + error.message);
      return false;
    }
  }

  async function importCustom(text, label) {
    if (!state.keymap) return false;

    try {
      checkCustom(state.keymap, text);
    } catch (error) {
      state.notice = 'Could not import ' + label + ': ' + error.message;
      renderer.renderChrome();
      return false;
    }

    try {
      await fileStore.save({
        keymapId: state.keymap.id,
        fileName: label,
        text,
      });
    } catch {
      // A failed save leaves the imported layer usable for this session.
    }

    state.customSource = { text, label };
    state.hasSavedCustom = true;
    state.notice = '';
    state.loadError = '';
    state.layers = normalizeLayers(
      { ...state.layers, custom: true },
      true
    );
    preferences.setLayers(state.keymap.id, state.layers);
    clearFilterState();
    recompose();
    renderer.renderChrome();
    renderer.renderAll();
    return true;
  }

  async function clearCustom() {
    if (!state.keymap) return false;
    if (!state.hasSavedCustom && !state.customSource) return false;
    const keymapId = state.keymap.id;

    try {
      await fileStore.clear(keymapId);
    } catch (error) {
      state.notice = 'Could not clear the saved file: ' + error.message;
      renderer.renderChrome();
      return false;
    }

    if (!state.keymap || state.keymap.id !== keymapId) return false;

    state.customSource = null;
    state.hasSavedCustom = false;
    state.notice = '';
    state.layers = normalizeLayers(
      { ...state.layers, custom: false },
      false
    );
    preferences.setLayers(keymapId, state.layers);
    clearFilterState();
    recompose();
    renderer.renderChrome();
    renderer.renderAll();
    return true;
  }

  async function loadFile(file) {
    const target = keymapRegistry.byFileName(file.name);
    if (target && (!state.keymap || target.id !== state.keymap.id)) {
      const activated = await activateKeymap(target.id);
      if (!activated) return;
    }

    try {
      const text = await readFileText(file);
      await importCustom(text, file.name);
    } catch (error) {
      state.notice = 'Could not read ' + file.name + ': ' + error.message;
      renderer.renderChrome();
    }
  }

  async function openFile() {
    if (windowRef.showOpenFilePicker) {
      try {
        const [handle] = await windowRef.showOpenFilePicker({
          startIn: 'downloads',
          types: [{
            description: state.keymap.file.description,
            accept: state.keymap.file.accept,
          }],
        });
        await loadFile(await handle.getFile());
        return;
      } catch (error) {
        if (error.name === 'AbortError') return;
      }
    }
    elements.fileInput.click();
  }

  function selectKey(keyId) {
    if (state.keyFilter && state.keyFilter.keyId === keyId) {
      state.keyFilter = null;
    } else {
      state.keyFilter = { keyId };
    }
    state.traced = null;
    renderer.renderAll();
  }

  function toggleFacetFilter(facetId, valueId) {
    const current = state.filters[facetId] || new Set();
    const next = new Set(current);
    if (next.has(valueId)) next.delete(valueId);
    else next.add(valueId);

    const filters = { ...state.filters };
    if (next.size) filters[facetId] = next;
    else delete filters[facetId];
    state.filters = filters;
    state.traced = null;
  }

  function clearFilters() {
    state.filters = {};
    state.traced = null;
    renderer.renderAll();
  }

  function clearKeyFilter() {
    state.keyFilter = null;
    renderer.renderAll();
  }

  function selectTrace(index) {
    state.traced = state.traced === index ? null : index;
    renderer.renderResults();
  }

  function setLegendFacet(id) {
    if (!state.keymap || !state.facetModel) return false;
    state.legendFacet = resolveFacetId(state.facetModel, id);
    preferences.setLegend(state.keymap.id, state.legendFacet);
    renderer.renderChrome();
    renderer.renderAll();
    return true;
  }

  function setColourFacet(id) {
    if (!state.keymap || !state.facetModel) return false;
    state.colourFacet = resolveFacetId(state.facetModel, id);
    preferences.setColour(state.keymap.id, state.colourFacet);
    renderer.renderAll();
    return true;
  }

  function setMetaStyle(id) {
    const style = resolveMetaStyle(id);
    state.metaStyleId = style.id;
    elements.metaSelect.value = style.id;
    preferences.setMetaStyle(style.id);
    renderer.renderAll();
  }

  function setTheme(id) {
    preferences.setTheme(id);
    applyThemeChoice(documentRef, themeRegistry, id, media.matches);
  }

  function applySystemTheme(prefersDark) {
    applyThemeChoice(documentRef, themeRegistry, 'system', prefersDark);
  }

  function setLayout(id) {
    preferences.setLayout(id);
    state.layout = layoutRegistry.get(id);
    elements.layoutSelect.value = state.layout.id;
    state.geometry = null;
    state.keyFilter = null;
    renderer.renderAll();
  }

  function setControlsExpanded(expanded) {
    state.controlsExpanded = expanded;
    preferences.setControlsExpanded(expanded);
    renderer.applyControlsExpanded();
  }

  function applySearch() {
    renderer.updateSearchReset();
    renderer.renderResults();
  }

  function setActionQuery(value) {
    state.actionQuery = value;
    state.traced = null;
    applySearch();
  }

  function setBindingQuery(value) {
    state.bindingQuery = value;
    state.traced = null;
    applySearch();
  }

  function clearSearch() {
    if (elements.searchReset.disabled) return false;
    clearSearchText();
    renderer.renderResults();
    return true;
  }

  function escape() {
    if (state.actionQuery) {
      state.actionQuery = '';
      elements.search.value = '';
    } else if (state.bindingQuery) {
      state.bindingQuery = '';
      elements.bindingSearch.value = '';
    } else if (state.keyFilter) {
      state.keyFilter = null;
    } else if (state.traced !== null) {
      state.traced = null;
    } else if (Object.keys(state.filters).length) {
      state.filters = {};
    } else {
      return false;
    }
    renderer.updateSearchReset();
    renderer.renderAll();
    return true;
  }

  async function resetEverything() {
    if (windowRef.confirm && !windowRef.confirm(
      'Reset the app? This clears all preferences and uploaded files.'
    )) {
      return false;
    }

    preferences.reset();
    await fileStore.clear();
    data.clear();
    state.layout = layoutRegistry.get(layoutRegistry.defaultId);
    elements.layoutSelect.value = state.layout.id;
    state.metaStyleId = resolveMetaStyle('generic').id;
    elements.metaSelect.value = state.metaStyleId;
    elements.themeSelect.value = 'system';
    state.geometry = null;
    applyThemeChoice(documentRef, themeRegistry, 'system', media.matches);
    state.controlsExpanded = true;
    renderer.applyControlsExpanded();
    await activateKeymap(keymapRegistry.ids[0], { force: true });
    // activateKeymap records the keymap id, so clear the cookie again to
    // make Reset app remove the preference rather than replace it.
    preferences.reset();
    return true;
  }

  return {
    activateKeymap,
    applySystemTheme,
    clearCustom,
    clearFilters,
    clearKeyFilter,
    clearSearch,
    escape,
    loadFile,
    openFile,
    resetEverything,
    selectKey,
    selectTrace,
    setActionQuery,
    setBindingQuery,
    setColourFacet,
    setControlsExpanded,
    setLayout,
    setLegendFacet,
    setMetaStyle,
    setTheme,
    toggleFacetFilter,
    toggleLayer,
  };
}
