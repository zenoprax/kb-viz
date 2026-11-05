// Built-in neutral keymap.

import { defineKeymap } from '../core/keymap-contract.js';
import { entryKey, mergeOverrides } from '../core/layers.js';
import {
  normalizeKeyName,
  normalizeModifier,
  splitPlusCombo,
  uniqueTokens,
} from '../lib/keys.js';

// The generic CSV header fixes the column order.
const BASE_HEADER = ['category', 'action', 'binding'];

// Declared order determines the accent slot. The facet stays open so a
// category from a custom CSV becomes a first-seen value with its own
// colour instead of being folded into Other.
const CATEGORY_FACET = {
  id: 'category',
  name: 'Category',
  default: true,
  values: {
    text: { name: 'Text' },
    navigation: { name: 'Navigation' },
    shell: { name: 'Shell' },
  },
  valueOf: entry => String(entry.group || '').toLowerCase(),
};

function comboTokens(combo) {
  return uniqueTokens(splitPlusCombo(combo).map(part =>
    normalizeModifier(part) || normalizeKeyName(part)
  ));
}

// Minimal RFC 4180 reader: quotes wrap a cell, and "" is one quote.
function splitCsvLine(line) {
  const cells = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (quoted) {
      if (char === '"' && line[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      cells.push(cell);
      cell = '';
    } else {
      cell += char;
    }
  }

  if (quoted) throw new Error('Unterminated quote in generic CSV');
  cells.push(cell);
  return cells.map(value => value.trim());
}

function parseBaseBindings(text) {
  const entries = [];
  let header = null;

  String(text).split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim();
    if (!line || line.startsWith('#')) return;

    const cells = splitCsvLine(line);

    if (!header) {
      header = cells.map(cell => cell.toLowerCase());
      if (header.join(',') !== BASE_HEADER.join(',')) {
        throw new Error(
          'Generic CSV header must be category,action,binding'
        );
      }
      return;
    }

    if (cells.length !== 3 || cells.some(cell => !cell)) {
      throw new Error('Bad generic binding on line ' + (index + 1));
    }

    const [category, action, binding] = cells;
    entries.push({
      combo: binding,
      group: category,
      action,
      tokens: comboTokens(binding),
    });
  });

  if (!header) throw new Error('Generic CSV has no header');
  return entries;
}

function resolveBase({ defaults, custom, layers }) {
  const base = layers.defaults && defaults !== null
    ? parseBaseBindings(defaults)
    : [];
  if (!layers.custom || custom === null) return base;
  return mergeOverrides(
    base,
    parseBaseBindings(custom),
    entry => entryKey([entry.combo])
  );
}

export const BASE_KEYMAP = defineKeymap({
  id: 'base',
  name: 'Base',
  defaultSourceUrl: new URL('./data/base.csv', import.meta.url),
  defaultSourceLabel: 'Generic shortcuts',
  instructions: 'No application keymap is loaded. These generic shortcuts'
    + ' keep the viewer usable. Import a <code>.csv</code> file with the'
    + ' header <code>category,action,binding</code> to add or replace'
    + ' bindings, and use <strong>Filter by</strong> to isolate'
    + ' Text, Navigation, or Shell shortcuts. Other category names get'
    + ' their own colour.',
  file: {
    description: 'Generic binding list',
    extensions: ['.csv'],
    accept: {
      'text/csv': ['.csv'],
      'text/plain': ['.csv'],
      'application/octet-stream': ['.csv'],
    },
  },
  facets: [CATEGORY_FACET],
  resolve: resolveBase,
});
