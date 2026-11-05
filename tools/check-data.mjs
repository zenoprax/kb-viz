// Structural data checks that import ES modules.
//
// Keymap plugins are discovered from plugins/keymaps, so a new plugin needs
// no change here. Run through tools/check.mjs, which supplies the Node module
// flag because the repository has no package.json.

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { sortPluginDefinitions } from '../src/plugin-manifest.js';
import { BASE_KEYMAP } from '../src/keyboard/base-keymap.js';
import { createLayoutRegistry } from '../src/keyboard/layout-registry.js';
import { createTokenIndex } from '../src/keyboard/token-index.js';

import { scanPluginIds } from './plugin-manifests.mjs';
import { buildKeyboardGeometry } from '../src/keyboard/geometry.js';
import {
  createFacetModel,
  facetRawValueIds,
  facetValues,
} from '../src/core/facets.js';
import {
  createThemeRegistry,
  THEME_VARIABLES,
} from '../src/theme/registry.js';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function checkEntry(keymap, entry, index) {
  const where = keymap.id + ' entry ' + index;
  assert(typeof entry.action === 'string', where + ' needs action');
  assert(typeof entry.combo === 'string', where + ' needs combo');
  assert(Array.isArray(entry.tokens), where + ' needs tokens');
  assert(keymap.actionLabel(entry), where + ' needs an action label');
  assert(typeof keymap.groupLabel(entry) === 'string',
    where + ' needs a string group label');
}

function checkFacets(keymap, model, entries) {
  assert(model.facets.length > 0, keymap.id + ' has no facets');

  for (const facet of model.facets) {
    const values = facetValues(facet, entries);
    assert(values.length > 0,
      keymap.id + ' facet ' + facet.id + ' has no values');
    for (const value of values) {
      assert(value.name,
        keymap.id + ' facet ' + facet.id + ' value ' + value.id
        + ' needs a name');
      assert(/^(accent-[1-6]|neutral)$/.test(value.palette || ''),
        keymap.id + ' facet ' + facet.id + ' value ' + value.id
        + ' needs a palette slot');
      if (value.id === 'other') {
        assert(value.palette === 'neutral',
          keymap.id + ' facet ' + facet.id + ' other value must be neutral');
      }
    }

    if (!facet.closed) continue;
    entries.forEach((entry, index) => {
      for (const value of facetRawValueIds(facet, entry)) {
        assert(facet.values[value],
          keymap.id + ' entry ' + index + ' facet ' + facet.id
          + ' has undeclared value ' + value);
      }
    });
  }
}

async function loadPlugins(type) {
  const pluginsRoot = resolve(ROOT, 'plugins');
  const ids = await scanPluginIds(pluginsRoot, type);
  const plugins = [];

  for (const id of ids) {
    const moduleUrl = pathToFileURL(
      resolve(pluginsRoot, type, id, 'index.js')
    ).href;
    const plugin = (await import(moduleUrl)).default;
    assert(plugin && plugin.id === id,
      type + '/' + id + ' index.js id mismatch');
    plugins.push(plugin);
  }

  return sortPluginDefinitions(plugins);
}

function checkKeymap(keymap, text) {
  const entries = keymap.resolve({
    defaults: text,
    custom: null,
    layers: { defaults: true, custom: false },
  });
  assert(entries.length > 0, keymap.id + ' resolved no entries');
  entries.forEach((entry, index) => checkEntry(keymap, entry, index));

  const facets = createFacetModel(keymap);
  checkFacets(keymap, facets, entries);

  return {
    entries: entries.length,
    groups: new Set(entries.map(entry => entry.group).filter(Boolean)).size,
    facets: facets.facets.map(facet => facet.id),
  };
}

async function checkBuiltinKeymap() {
  const text = await readFile(BASE_KEYMAP.defaultSourceUrl, 'utf8');
  return checkKeymap(BASE_KEYMAP, text);
}

async function checkKeymaps() {
  const summary = {};

  const ids = await scanPluginIds(resolve(ROOT, 'plugins'), 'keymaps');
  for (const id of ids) {
    const directory = resolve(ROOT, 'plugins/keymaps', id);
    const sourcePath = resolve(directory, 'source.json');
    const source = JSON.parse(await readFile(sourcePath, 'utf8'));
    const dataPath = resolve(directory, source.output);
    const text = await readFile(dataPath, 'utf8');
    const moduleUrl = pathToFileURL(resolve(directory, 'index.js')).href;
    const keymap = (await import(moduleUrl)).default;

    assert(keymap.id === id, id + ' index.js id does not match its directory');
    assert(typeof keymap.resolve === 'function',
      id + ' needs a resolve function');

    summary[keymap.id] = checkKeymap(keymap, text);
  }

  return summary;
}

function checkLayouts(layoutPlugins) {
  const registry = createLayoutRegistry(layoutPlugins);
  const required = ['ansi-us'];
  const summary = {};

  for (const id of required) {
    assert(registry.has(id), 'missing layout ' + id);
  }

  for (const layout of registry.all) {
    const geometry = buildKeyboardGeometry(layout.variant);
    const keyIds = new Set(geometry.keys.map(key => key.id));
    const index = createTokenIndex(layout);
    const maps = [layout.chars, layout.shiftChars, layout.altGrChars || {}];

    for (const map of maps) {
      for (const keyId of Object.values(map)) {
        assert(keyIds.has(keyId),
          layout.id + ' maps to unknown key id ' + keyId);
      }
    }

    for (const token of ['A', '1', '%', '|', '[', ']', '/']) {
      assert(index.keyIds(token).length > 0,
        layout.id + ' cannot resolve token ' + token);
    }

    summary[layout.id] = {
      variant: layout.variant,
      keys: geometry.keys.length,
      characters: Object.keys(layout.chars).length,
    };
  }

  return summary;
}

async function checkThemes(themePlugins) {
  const registry = createThemeRegistry(themePlugins);
  for (const id of ['system', 'light', 'dark']) {
    assert(registry.get(id).id === id, 'missing built-in theme ' + id);
  }
  for (const theme of registry.all) {
    if (theme.scheme === 'system') continue;
    assert(theme.cssUrl, theme.id + ' has no CSS URL');
    const css = await readFile(theme.cssUrl, 'utf8');
    const selector = new RegExp(
      ':root\\[data-theme=["\']' + theme.id + '["\']\\]'
    );
    assert(selector.test(css),
      theme.id + ' CSS selector does not target its theme id');
    const scheme = css.match(/color-scheme\s*:\s*([a-z]+)/);
    assert(scheme && scheme[1] === theme.scheme,
      theme.id + ' color-scheme does not match its scheme');
  }
  return {
    themes: registry.ids,
    variables: THEME_VARIABLES.length,
  };
}

const result = {
  keymaps: {
    [BASE_KEYMAP.id]: await checkBuiltinKeymap(),
    ...await checkKeymaps(),
  },
  layouts: checkLayouts(await loadPlugins('layouts')),
  themes: await checkThemes(await loadPlugins('themes')),
};

console.log(JSON.stringify(result, null, 2));
