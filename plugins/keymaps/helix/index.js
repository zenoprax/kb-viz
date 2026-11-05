// Helix keymap plugin.

import { defineKeymapPlugin } from '../../../src/plugin-api.js';
import { entryKey, mergeOverrides } from '../../../src/plugin-api.js';
import { parseHelixToml } from './parser.js';
import { helixActionLabel, classifyHelixAction, humanizeHelixGroup }
  from './adapter.js';

// Facet values for the Category facet (from categories.js)
const HELIX_CATEGORY_VALUES = {
  motion: { name: 'Motion' },
  edit: { name: 'Edit' },
  selection: { name: 'Selection' },
  view: { name: 'View' },
  mode: { name: 'Mode changes' },
  file: { name: 'Files' },
  other: { name: 'Other' },
};

// Identity function for Helix: mode + key sequence
function helixIdentity(entry) {
  return entryKey([entry.group].concat(entry.sequence));
}

// Parse TOML text into normalized entries
function readHelixEntries(text) {
  return parseHelixToml(text);
}

// Core resolve function handling all three shapes:
//
// - Default-only: { defaults: text, custom: null,
//   layers: { defaults: true, custom: false } }
// - Combined:    { defaults: text, custom: text|null,
//   layers: { defaults: true, custom: true } }
// - Custom-only: { defaults: null, custom: text,
//   layers: { defaults: false, custom: true } }
export function resolveHelix({ defaults, custom, layers }) {
  // Base entries from defaults when enabled
  const base = layers.defaults && defaults !== null
    ? readHelixEntries(defaults)
    : [];

  // If custom layer not enabled or no custom text, return base
  if (!layers.custom || custom === null) {
    return base;
  }

  // Custom entries from custom TOML
  const customEntries = readHelixEntries(custom);

  // Helix custom layer is additive: custom sequences replace default
  // sequences in the same mode; new sequences are added; other defaults remain
  return mergeOverrides(base, customEntries, helixIdentity);
}

export default defineKeymapPlugin({
  id: 'helix',
  name: 'Helix',
  shortName: 'Helix',
  defaultSourceUrl: new URL('./data/default.toml', import.meta.url),
  defaultSourceLabel: 'Helix default keymap',
  instructions: 'Helix defaults load automatically. Import a Helix'
    + ' <code>config.toml</code> or a <code>[keys.*]</code> fragment to add'
    + ' or replace bindings. Toggle <strong>Defaults</strong> and'
    + ' <strong>Custom</strong> to view either layer or both. Switch'
    + ' <strong>Filter by</strong> to <strong>Modes</strong> to isolate'
    + ' Normal, Select, or Insert.',
  file: {
    description: 'Helix config (TOML)',
    extensions: ['.toml'],
    accept: {
      'application/toml': ['.toml'],
      'text/plain': ['.toml'],
    },
    openLabel: 'Import TOML',
    dropLabel: 'Drop Helix .toml to import custom bindings',
  },
  facets: [
    // Category facet derived from action classification
    {
      id: 'category',
      name: 'Category',
      default: true,
      values: HELIX_CATEGORY_VALUES,
      valueOf: entry => classifyHelixAction(entry),
      closed: false,
    },
    // Mode facet (Normal, Select, Insert)
    {
      id: 'group',
      name: 'Modes',
      valueOf: entry => entry.group,
      labelOf: humanizeHelixGroup,
    },
  ],
  resolve: resolveHelix,
  actionLabel: helixActionLabel,
  groupLabel: entry => humanizeHelixGroup(entry.group),
});