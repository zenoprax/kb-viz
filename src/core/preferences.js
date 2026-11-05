// Preference schema and accessors.
//
// Unknown theme, layout, or Meta style ids are resolved by their consumers.

const PREFERENCE_VERSION = 1;
const PREFERENCE_KEY = 'preferences';
const DEFAULT_PREFERENCES = Object.freeze({
  version: PREFERENCE_VERSION,
  keymapId: null,
  themeId: 'system',
  layoutId: 'ansi-us',
  metaStyleId: 'generic',
  controlsExpanded: true,
  legendByKeymap: Object.freeze({}),
  colourByKeymap: Object.freeze({}),
  layersByKeymap: Object.freeze({}),
});

function defaults() {
  return {
    ...DEFAULT_PREFERENCES,
    legendByKeymap: {},
    colourByKeymap: {},
    layersByKeymap: {},
  };
}

function cleanDimensionMap(value) {
  const result = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return result;
  }
  for (const [keymapId, facetId] of Object.entries(value)) {
    if (typeof facetId === 'string' && facetId) {
      result[keymapId] = facetId;
    }
  }
  return result;
}

function cleanLayers(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return {
    defaults: value.defaults !== false,
    custom: value.custom === true,
  };
}

function cleanLayerMap(value) {
  const result = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return result;
  }
  for (const [keymapId, layers] of Object.entries(value)) {
    const cleaned = cleanLayers(layers);
    if (cleaned) result[keymapId] = cleaned;
  }
  return result;
}

function cleanPreferences(value) {
  const result = defaults();
  if (!value || typeof value !== 'object') return result;
  if (value.version !== PREFERENCE_VERSION) return result;

  if (typeof value.keymapId === 'string') result.keymapId = value.keymapId;
  if (typeof value.themeId === 'string') result.themeId = value.themeId;
  if (typeof value.layoutId === 'string') result.layoutId = value.layoutId;
  if (typeof value.metaStyleId === 'string') {
    result.metaStyleId = value.metaStyleId;
  }
  if (typeof value.controlsExpanded === 'boolean') {
    result.controlsExpanded = value.controlsExpanded;
  }
  result.legendByKeymap = cleanDimensionMap(value.legendByKeymap);
  result.colourByKeymap = cleanDimensionMap(value.colourByKeymap);
  result.layersByKeymap = cleanLayerMap(value.layersByKeymap);
  return result;
}

export function createPreferences(store) {
  let data = defaults();
  let writable = true;

  function save() {
    if (!writable) return false;
    try {
      writable = Boolean(store.set(PREFERENCE_KEY, JSON.stringify(data)));
    } catch {
      writable = false;
    }
    return writable;
  }

  return {
    load() {
      try {
        const raw = store.get(PREFERENCE_KEY);
        if (raw) data = cleanPreferences(JSON.parse(raw));
      } catch {
        data = defaults();
        writable = false;
      }
      return data;
    },
    snapshot() {
      return JSON.parse(JSON.stringify(data));
    },
    setKeymap(keymapId) {
      data.keymapId = keymapId;
      return save();
    },
    setTheme(themeId) {
      data.themeId = themeId;
      return save();
    },
    setLayout(layoutId) {
      data.layoutId = layoutId;
      return save();
    },
    setMetaStyle(metaStyleId) {
      data.metaStyleId = metaStyleId;
      return save();
    },
    setControlsExpanded(expanded) {
      data.controlsExpanded = expanded !== false;
      return save();
    },
    legendFor(keymapId) {
      return data.legendByKeymap[keymapId] || null;
    },
    setLegend(keymapId, facetId) {
      if (typeof facetId !== 'string' || !facetId) return false;
      data.legendByKeymap[keymapId] = facetId;
      return save();
    },
    colourFor(keymapId) {
      return data.colourByKeymap[keymapId] || null;
    },
    setColour(keymapId, facetId) {
      if (typeof facetId !== 'string' || !facetId) return false;
      data.colourByKeymap[keymapId] = facetId;
      return save();
    },
    layersFor(keymapId) {
      const layers = data.layersByKeymap[keymapId];
      return layers ? { ...layers } : null;
    },
    setLayers(keymapId, layers) {
      const cleaned = cleanLayers(layers);
      if (!cleaned) return false;
      data.layersByKeymap[keymapId] = cleaned;
      return save();
    },
    reset() {
      data = defaults();
      try {
        store.delete(PREFERENCE_KEY);
      } catch {
        writable = false;
      }
      return data;
    },
  };
}
