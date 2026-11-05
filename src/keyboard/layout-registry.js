// Keyboard-layout registry.

import { BUILTIN_LAYOUTS } from './builtin-layouts.js';
import {
  BUILTIN_LAYOUT_ID,
  defineLayout,
} from './layout-contract.js';

function assert(condition, message) {
  if (!condition) throw new Error('Invalid layout registry: ' + message);
}

function resolveLayoutList(layoutPlugins = []) {
  const builtinIds = new Set(BUILTIN_LAYOUTS.map(layout => layout.id));
  const extras = layoutPlugins.filter(layout =>
    layout && !builtinIds.has(layout.id));
  return [...BUILTIN_LAYOUTS, ...extras];
}

export function createLayoutRegistry(layoutPlugins = []) {
  const list = [];
  const byId = new Map();

  for (const candidate of resolveLayoutList(layoutPlugins)) {
    const layout = defineLayout(candidate);
    assert(!byId.has(layout.id), 'duplicate layout id ' + layout.id);
    byId.set(layout.id, layout);
    list.push(layout);
  }
  assert(byId.has(BUILTIN_LAYOUT_ID), 'built-in layout is missing');

  return Object.freeze({
    all: Object.freeze(list),
    ids: Object.freeze([...byId.keys()]),
    defaultId: BUILTIN_LAYOUT_ID,
    get(id) {
      return byId.get(id) || byId.get(BUILTIN_LAYOUT_ID);
    },
    has(id) {
      return byId.has(id);
    },
  });
}
