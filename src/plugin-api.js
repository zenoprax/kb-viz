// Public plugin API, version 1.
//
// A plugin is an optional keymap, theme, or layout. Built-in components are
// not plugins and live in src/. Plugin code may import shared definitions and
// helpers only from this file. Everything else in src/ is private.
//
// The exact export list is locked by tools/check.mjs.
// Additions need a version decision; renames or removals are breaking.

// One version covers every plugin type.
export const PLUGIN_API_VERSION = 1;

// Keymap plugins.
export { defineKeymapPlugin } from './core/keymap-contract.js';

export {
  entryKey,
  mergeOverrides,
  removeEntries,
} from './core/layers.js';

export {
  MODIFIER_TOKENS,
  isModifierToken,
  normalizeKeyName,
  normalizeModifier,
  splitPlusCombo,
  uniqueTokens,
} from './lib/keys.js';

// Theme plugins.
export {
  THEME_VARIABLES,
  defineThemePlugin,
} from './theme/contract.js';

// Layout plugins.
export {
  LAYOUT_KEY_IDS,
  LAYOUT_VARIANTS,
  defineLayoutPlugin,
} from './keyboard/layout-contract.js';
