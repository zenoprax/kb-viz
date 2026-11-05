// Keyboard-layout contract; see docs/public/reference/layout-plugin.md.

import { KEY_IDS } from './geometry.js';

export const BUILTIN_LAYOUT_ID = 'ansi-us';
export const LAYOUT_VARIANTS = Object.freeze(['ansi', 'iso']);
export const LAYOUT_KEY_IDS = Object.freeze([...KEY_IDS]);

const REQUIRED_FIELDS = ['id', 'name', 'variant', 'legends', 'chars'];
const PLUGIN_FIELDS = new Set([
  ...REQUIRED_FIELDS,
  'shiftChars',
  'altGrChars',
]);
const KEY_ID_SET = new Set(LAYOUT_KEY_IDS);

function assert(condition, message) {
  if (!condition) throw new Error('Invalid layout: ' + message);
}

function validateLegends(legends, id) {
  assert(legends && typeof legends === 'object' && !Array.isArray(legends),
    id + ' needs legends');
  for (const keyId of Object.keys(legends)) {
    assert(KEY_ID_SET.has(keyId),
      id + ' legends has unknown key id ' + keyId);
  }
}

function validateCharacters(map, id, name) {
  assert(map && typeof map === 'object' && !Array.isArray(map),
    id + ' needs ' + name);
  for (const [character, keyId] of Object.entries(map)) {
    assert(KEY_ID_SET.has(keyId),
      id + ' ' + name + ' maps ' + character
      + ' to unknown key id ' + keyId);
  }
}

export function defineLayout(definition) {
  const layout = {
    shiftChars: {},
    altGrChars: {},
    ...definition,
  };

  for (const field of REQUIRED_FIELDS) {
    assert(layout[field] !== undefined, 'missing ' + field);
  }
  assert(LAYOUT_VARIANTS.includes(layout.variant),
    layout.id + ' needs an ansi or iso variant');
  validateLegends(layout.legends, layout.id);
  validateCharacters(layout.chars, layout.id, 'chars');
  validateCharacters(layout.shiftChars, layout.id, 'shiftChars');
  validateCharacters(layout.altGrChars, layout.id, 'altGrChars');

  return Object.freeze(layout);
}

export function defineLayoutPlugin(definition) {
  assert(definition.id !== BUILTIN_LAYOUT_ID,
    BUILTIN_LAYOUT_ID + ' is the built-in layout id');
  for (const field of Object.keys(definition)) {
    assert(PLUGIN_FIELDS.has(field), 'unknown field ' + field);
  }
  return defineLayout(definition);
}
