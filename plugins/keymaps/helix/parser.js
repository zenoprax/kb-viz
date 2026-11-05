// Helix keymap support.
//
// A Helix config expresses keymaps as nested TOML tables:
//
//   [keys.normal]
//   h = "move_char_left"
//   "C-s" = ":write"
//
//   [keys.normal.g]
//   g = "goto_file_start"
//
// Each table below keys.<mode> adds one key to the sequence, so the last
// example binds "g g". A value may also be an array of commands.

import {
  entryKey,
  mergeOverrides,
  normalizeKeyName,
  uniqueTokens,
} from '../../../src/plugin-api.js';
import { parseToml, tomlTables } from './toml.js';

export const HELIX_MODIFIERS = {
  C: 'CTRL',
  CTRL: 'CTRL',
  CONTROL: 'CTRL',
  S: 'SHIFT',
  SHIFT: 'SHIFT',
  A: 'ALT',
  ALT: 'ALT',
  M: 'META',
  META: 'META',
  SUPER: 'META',
};

const HELIX_KEY_LABELS = {
  ESC: 'Esc',
  RETURN: 'Ret',
  SPACE: 'Space',
  TAB: 'Tab',
  BACKSPACE: 'Backspace',
  DELETE: 'Del',
  INSERT: 'Ins',
  HOME: 'Home',
  END: 'End',
  PAGEUP: 'PgUp',
  PAGEDOWN: 'PgDn',
  UP: '\u2191',
  DOWN: '\u2193',
  LEFT: '\u2190',
  RIGHT: '\u2192',
};

const HELIX_MODE_NAMES = {
  normal: 'Normal',
  select: 'Select',
  insert: 'Insert',
};

export function helixModeLabel(mode) {
  const key = String(mode).toLowerCase();
  if (HELIX_MODE_NAMES[key]) return HELIX_MODE_NAMES[key];
  return key.charAt(0).toUpperCase() + key.slice(1);
}

// Parses one key string, e.g. "C-S-x", "space", or "A-_".
// Returns logical tokens plus the label used in the binding column.
export function parseHelixKey(raw) {
  const text = String(raw);
  const modifiers = [];
  let keyPart = text;
  let match;

  // Modifiers are a prefix chain. Scanning rather than splitting keeps a
  // trailing lone "-" as the minus key, so "C--" is Ctrl and minus.
  while ((match = keyPart.match(/^([A-Za-z]+)-/))) {
    const modifier = HELIX_MODIFIERS[match[1].toUpperCase()];
    if (!modifier) break;
    modifiers.push(modifier);
    keyPart = keyPart.slice(match[0].length);
  }

  const single = [...keyPart].length === 1;
  const token = normalizeKeyName(keyPart);
  const label = HELIX_KEY_LABELS[token] || keyPart;
  const shifted = single && /^[A-Z]$/.test(keyPart);

  const tokens = modifiers.slice();
  if (shifted) tokens.push('SHIFT');
  tokens.push(token);

  return {
    token,
    label,
    shift: shifted,
    tokens: uniqueTokens(tokens),
  };
}

// Formats a key as it appears in the binding column. Helix notation is kept
// for modified keys ("A-minus", "C-w"); standalone named keys get a title.
export function formatHelixKey(raw) {
  const text = String(raw);
  if (text === '-') return '-';
  const parts = text.split('-');
  if (parts.length > 1) return text;
  const token = normalizeKeyName(text);
  return HELIX_KEY_LABELS[token] || text;
}

export function parseHelixToml(text) {
  const document = parseToml(text);
  const keys = document.keys;
  const entries = [];

  if (!tomlTables(keys)) {
    throw new Error('No [keys.*] tables found in this TOML file.');
  }

  const modes = Object.keys(keys).filter(mode => tomlTables(keys[mode]));
  if (!modes.length) {
    throw new Error('No [keys.*] tables found in this TOML file.');
  }

  function walk(mode, node, prefix) {
    for (const key of Object.keys(node)) {
      const value = node[key];
      const sequence = prefix.concat(key);

      if (tomlTables(value)) {
        walk(mode, value, sequence);
        continue;
      }

      const commands = (Array.isArray(value) ? value : [value])
        .map(command => String(command))
        .filter(command => command.trim() !== '');

      if (!commands.length) continue;

      const parsed = sequence.map(parseHelixKey);
      const tokens = [];
      for (const keyInfo of parsed) {
        for (const token of keyInfo.tokens) {
          if (!tokens.includes(token)) tokens.push(token);
        }
      }

      entries.push({
        group: mode,
        action: commands.join(' + '),
        combo: sequence.map(formatHelixKey).join(' '),
        tokens,
        commands,
        sequence,
      });
    }
  }

  for (const mode of modes) walk(mode, keys[mode], []);
  return entries;
}

// Helix custom layers are additive. A custom sequence replaces a default
// sequence in the same mode; every other default binding remains available.
function helixIdentity(entry) {
  return entryKey([entry.group].concat(entry.sequence));
}

export function mergeHelixBindings(baseEntries, customText) {
  const customEntries = parseHelixToml(customText);
  return mergeOverrides(baseEntries, customEntries, helixIdentity);
}
