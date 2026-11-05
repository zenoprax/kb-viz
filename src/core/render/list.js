// Action-list rendering.

import { esc } from '../dom.js';
import { facetPalette } from '../facets.js';

function rowMark(options) {
  const {
    entry,
    values,
    valueIdsOf,
  } = options;
  const ids = valueIdsOf(entry);

  return '<span class="mark">' + ids.map(id =>
    '<span data-palette="' + facetPalette(id, values) + '"></span>'
  ).join('') + '</span>';
}

export function renderList(options) {
  const {
    rows,
    traced,
    loadError,
    actionLabel,
    groupLabel,
    colourValues,
    valueIdsOf,
  } = options;

  if (loadError) {
    return '<p>' + esc(loadError) + '</p>';
  }

  if (!rows.length) {
    return '<p>No matching bindings.</p>';
  }

  return rows.map(entry => {
    const label = actionLabel(entry);
    const component = groupLabel(entry);
    const active = traced === entry.index;
    return '<li><button type="button"'
      + ' data-idx="' + entry.index + '"'
      + ' aria-pressed="' + String(active) + '"'
      + ' title="' + esc(label) + ' \u00b7 ' + esc(entry.combo) + '">'
      + '<span class="txt">'
      + '<span class="name">' + esc(label) + '</span>'
      + (component
        ? '<span class="comp">' + esc(component) + '</span>'
        : '')
      + '</span>'
      + rowMark({
        entry,
        values: colourValues,
        valueIdsOf,
      })
      + '<kbd>' + esc(entry.combo) + '</kbd>'
      + '</button></li>';
  }).join('');
}
