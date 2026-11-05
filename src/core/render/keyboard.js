// Keyboard SVG rendering.
//
// Each bound key gets a small bar segmented by the values it has in the
// chosen colour facet. A single-value facet keeps one colour per key; a
// multiple facet splits the bar by value.

import { esc } from '../dom.js';
import { facetPalette } from '../facets.js';
import { MODIFIER_KEY_IDS } from '../../keyboard/geometry.js';
import { isMetaKeyId } from '../../keyboard/meta-key.js';

function valuePosition(order, value) {
  const index = order.indexOf(value);
  return index === -1 ? order.length : index;
}

function valueSet(matches, valueIdsOf, order) {
  const found = new Set();
  for (const entry of matches) {
    for (const value of valueIdsOf(entry)) found.add(value);
  }
  return [...found]
    .sort((left, right) =>
      valuePosition(order, left) - valuePosition(order, right));
}

function titleFor(matches, actionLabel) {
  if (!matches.length) return '';
  const lines = matches.slice(0, 6)
    .map(entry => actionLabel(entry) + ' (' + entry.combo + ')');
  if (matches.length > 6) lines.push('+' + (matches.length - 6) + ' more');
  return '<title>' + esc(lines.join('\n')) + '</title>';
}

function facetBar(options) {
  const {
    key, x, y, valueIds, values,
  } = options;
  if (!valueIds.length) return '';
  const barX = x + 3;
  const barWidth = Math.max(2, key.w - 6);
  const step = barWidth / valueIds.length;

  return valueIds.map((value, index) =>
    '<rect class="facet-bar" x="' + (barX + index * step) + '"'
    + ' y="' + (y + key.h - 4) + '"'
    + ' width="' + step + '" height="4"'
    + ' data-palette="' + facetPalette(value, values) + '"/>'
  ).join('');
}

function keyMarkup(options) {
  const {
    key, matches, x, y, layout, values, order, narrowed,
    tracedEntry, keyFilter, actionLabel, valueIdsOf, metaKeyLabel,
  } = options;
  const bound = matches.length > 0;
  const valuesOnKey = valueSet(matches, valueIdsOf, order);
  const traced = Boolean(tracedEntry) && matches.includes(tracedEntry);
  const selected = Boolean(keyFilter) && keyFilter.keyId === key.id;
  const modifier = MODIFIER_KEY_IDS.has(key.id);
  const label = isMetaKeyId(key.id)
    ? metaKeyLabel
    : (layout.legends[key.id] || key.legend);
  const flags = [];

  if (bound) flags.push('data-bound');
  if (bound && modifier) flags.push('data-mod');
  if (!bound && narrowed) flags.push('data-dim');
  if (traced) flags.push('data-trace');
  if (selected) flags.push('data-selected');

  const title = titleFor(matches, actionLabel);
  const size = label.length > 2 ? 11 : 13;
  const count = bound && matches.length > 1
    ? '<text class="count" x="' + (x + key.w - 6) + '"'
      + ' y="' + (y + key.h - 9) + '">' + matches.length + '</text>'
    : '';
  const role = bound ? ' tabindex="0" role="button"' : '';
  const aria = bound
    ? ' aria-label="' + esc(label + ', ' + matches.length + ' bindings') + '"'
    : '';

  return '<g data-key="' + key.id + '"'
    + (flags.length ? ' ' + flags.join(' ') : '')
    + role + aria + '>' + title
    + '<rect class="cap" x="' + x + '" y="' + y + '"'
    + ' width="' + key.w + '" height="' + key.h + '" rx="2"/>'
    + '<text class="label" x="' + (x + 6) + '" y="' + (y + 16) + '"'
    + ' font-size="' + size + '">' + esc(label) + '</text>'
    + facetBar({
      key,
      x,
      y,
      valueIds: valuesOnKey,
      values,
    })
    + count
    + '</g>';
}

function matchesByKey(geometry, rows, keyIdsOf) {
  const result = new Map(geometry.keys.map(key => [key.id, []]));

  for (const entry of rows) {
    for (const keyId of keyIdsOf(entry)) {
      const matches = result.get(keyId);
      if (matches) matches.push(entry);
    }
  }

  return result;
}

export function renderKeyboard(options) {
  const {
    svg, geometry, layout, rows, entries, traced, narrowed,
    colourValues, actionLabel, keyIdsOf, valueIdsOf,
    keyFilter, pad = 6, metaKeyLabel = 'Meta',
  } = options;
  const matches = matchesByKey(geometry, rows, keyIdsOf);
  const order = colourValues.map(value => value.id);
  const tracedEntry = traced === null
    ? null
    : entries[traced];

  svg.setAttribute(
    'viewBox',
    '0 0 ' + (geometry.totalWidth + pad * 2)
      + ' ' + (geometry.totalHeight + pad * 2)
  );

  svg.innerHTML = geometry.keys.map(key => keyMarkup({
    key,
    matches: matches.get(key.id) || [],
    x: key.x + pad,
    y: key.y + pad,
    layout,
    values: colourValues,
    order,
    narrowed,
    tracedEntry,
    keyFilter,
    actionLabel,
    valueIdsOf,
    metaKeyLabel,
  })).join('');
}
