// Header and picker rendering.

import { esc } from '../dom.js';

export function keymapOptionsMarkup(registry, counts = new Map()) {
  return registry.ids.map(id => {
    const keymap = registry.get(id);
    const count = counts.get(id);
    const known = Number.isFinite(count);
    return '<option value="' + esc(id) + '" data-name="'
      + esc(keymap.shortName) + '">' + esc(keymap.shortName)
      + (known ? ' (' + count + ')' : '')
      + '</option>';
  }).join('');
}

export function updateKeymapSelect(select, activeId, counts = new Map()) {
  for (const option of select.options) {
    const count = counts.get(option.value);
    option.textContent = option.dataset.name
      + (Number.isFinite(count) ? ' (' + count + ')' : '');
  }
  select.value = activeId;
}

export function fillSelect(select, items, selectedId) {
  select.innerHTML = items.map(item =>
    '<option value="' + esc(item.id) + '"'
    + (item.id === selectedId ? ' selected' : '') + '>'
    + esc(item.name)
    + '</option>'
  ).join('');
}

function sourceText(keymap, source) {
  if (source.notice) return source.notice;
  const custom = source.layers.custom ? source.custom : null;
  if (source.layers.defaults && custom) {
    return keymap.defaultSourceLabel + ' + ' + custom.label;
  }
  if (source.layers.defaults) return keymap.defaultSourceLabel;
  if (custom) return 'Custom \u00b7 ' + custom.label;
  return 'No bindings selected';
}

export function updateFileChrome(elements, keymap, source) {
  elements.instructions.innerHTML = keymap.instructions;
  elements.importBtn.textContent = keymap.file.openLabel;
  elements.importBtn.title = 'Import custom bindings ('
    + keymap.file.description + ')';
  elements.fileInput.accept = keymap.file.extensions.join(',');
  elements.dropText.textContent = keymap.file.dropLabel;
  elements.keymapSelect.title = sourceText(keymap, source);
}

export function updateLayerSwitch(elements, layers, hasCustom) {
  for (const button of elements.layerSwitch
    .querySelectorAll('[data-layer]')) {
    button.setAttribute(
      'aria-pressed',
      String(Boolean(layers[button.dataset.layer]))
    );
  }
  const custom = elements.layerSwitch.querySelector('[data-layer="custom"]');
  custom.disabled = !hasCustom;
}

export function renderFacetSwitch(
  container,
  facets,
  activeId,
  valuesById = new Map()
) {
  container.hidden = facets.length < 2;
  container.innerHTML = facets.map(facet => {
    const values = valuesById.get(facet.id);
    const count = Array.isArray(values) ? ' (' + values.length + ')' : '';
    return '<button type="button" data-facet="' + esc(facet.id) + '"'
      + ' aria-pressed="' + String(facet.id === activeId) + '">'
      + esc(facet.name) + count
      + '</button>';
  }).join('');
}
