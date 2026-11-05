// Facet legend rendering.
//
// The legend always shows the active filter facet. Swatches appear when that
// facet is also the chosen colour facet, so the legend and the keyboard agree.

import { esc } from '../dom.js';
import { facetPalette } from '../facets.js';

export function renderLegend(options) {
  const {
    values = [],
    counts = {},
    selected = new Set(),
    showSwatches = false,
  } = options;

  return values
    .filter(value => counts[value.id] > 0 || selected.has(value.id))
    .map(value => {
      const active = selected.has(value.id);
      const swatch = showSwatches
        ? '<span class="swatch" data-palette="'
          + facetPalette(value.id, values) + '"></span>'
        : '';
      return '<button type="button"'
        + ' data-value="' + esc(value.id) + '"'
        + ' aria-pressed="' + String(active) + '">'
        + swatch
        + '<span>' + esc(value.name) + '</span>'
        + '<span class="n">(' + (counts[value.id] || 0) + ')</span>'
        + '</button>';
    })
    .join('');
}
