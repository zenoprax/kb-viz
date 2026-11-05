// The neutral viewer core.

import {
  createKeymapRegistry,
  resolveKeymapList,
} from './keymap-registry.js';
import { createAppState } from './state.js';
import { createPreferences } from './preferences.js';
import { CookieStore, IndexedDbStore } from './storage.js';
import { createFileStore } from './files.js';
import { collectElements } from './elements.js';
import { createKeymapData } from './keymap-data.js';
import { createRenderer } from './renderer.js';
import { createActions } from './actions.js';
import { bindEvents } from './events.js';
import {
  fillSelect,
  keymapOptionsMarkup,
  updateKeymapSelect,
} from './render/chrome.js';
import { createThemeRegistry } from '../theme/registry.js';
import {
  applyThemeChoice,
  loadThemeStylesheets,
} from '../theme/apply.js';
import { createLayoutRegistry } from '../keyboard/layout-registry.js';
import {
  META_KEY_STYLES,
  isMetaKeyId,
  resolveMetaStyle,
} from '../keyboard/meta-key.js';
import { createTokenIndex } from '../keyboard/token-index.js';
import { BASE_KEYMAP } from '../keyboard/base-keymap.js';

export async function createApp(options) {
  const documentRef = document;
  const windowRef = window;
  const configuredKeymaps = options.keymapPlugins || [];
  const keymapList = resolveKeymapList(configuredKeymaps, BASE_KEYMAP);
  const keymapRegistry = createKeymapRegistry(keymapList);
  const themeRegistry = createThemeRegistry(options.themePlugins);
  const layoutRegistry = createLayoutRegistry(options.layoutPlugins);
  const media = windowRef.matchMedia('(prefers-color-scheme: dark)');
  const preferences = createPreferences(new CookieStore({
    documentRef,
    locationRef: windowRef.location,
  }));
  const initialPreferences = preferences.load();
  const initialThemeId = themeRegistry.get(initialPreferences.themeId).id;
  const fileStore = createFileStore(new IndexedDbStore());
  const elements = collectElements(documentRef);

  const state = createAppState({
    layout: layoutRegistry.get(initialPreferences.layoutId),
    metaStyleId: resolveMetaStyle(initialPreferences.metaStyleId).id,
    controlsExpanded: initialPreferences.controlsExpanded,
  });
  const tokenIndexes = new Map();
  const keymapCounts = new Map();

  function tokenIndex() {
    if (!tokenIndexes.has(state.layout.id)) {
      tokenIndexes.set(state.layout.id, createTokenIndex(state.layout));
    }
    return tokenIndexes.get(state.layout.id);
  }

  function keyIdsOf(entry) {
    return tokenIndex().entryKeyIds(entry.tokens);
  }

  function metaLegend() {
    return resolveMetaStyle(state.metaStyleId).legend;
  }

  function keyLabel(keyId) {
    if (isMetaKeyId(keyId)) {
      return metaLegend();
    }
    const key = state.geometry
      ? state.geometry.keys.find(item => item.id === keyId)
      : null;
    return state.layout.legends[keyId] || (key ? key.legend : keyId);
  }

  const data = createKeymapData({ fileStore });
  const renderer = createRenderer({
    elements,
    state,
    counts: keymapCounts,
    services: { keyIdsOf, keyLabel, metaLegend },
  });
  const actions = createActions({
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
  });

  loadThemeStylesheets(documentRef, themeRegistry.all);
  applyThemeChoice(
    documentRef,
    themeRegistry,
    initialThemeId,
    media.matches
  );
  fillSelect(elements.metaSelect, META_KEY_STYLES, state.metaStyleId);
  fillSelect(elements.themeSelect, themeRegistry.all, initialThemeId);
  fillSelect(elements.layoutSelect, layoutRegistry.all, state.layout.id);

  const storedKeymap = keymapRegistry.get(initialPreferences.keymapId)
    ? initialPreferences.keymapId
    : keymapRegistry.ids[0];
  elements.keymapSelect.innerHTML = keymapOptionsMarkup(
    keymapRegistry,
    keymapCounts
  );

  bindEvents({
    documentRef,
    elements,
    state,
    preferences,
    actions,
    renderer,
    media,
  });

  void data.loadCounts(keymapRegistry.all, (id, count) => {
    keymapCounts.set(id, count);
    if (state.keymap) {
      updateKeymapSelect(elements.keymapSelect, state.keymap.id, keymapCounts);
    }
  });
  renderer.applyControlsExpanded();

  await actions.activateKeymap(storedKeymap, { force: true });
}
