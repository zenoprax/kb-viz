// Browser-side plugin loader.
//
// Discovery, ordering, and failure isolation:
// docs/public/reference/plugin-contract.md.

import {
  parsePluginManifest,
  sortPluginDefinitions,
} from './plugin-manifest.js';

async function loadManifest(type, pluginsUrl) {
  const manifestUrl = new URL(type + '/manifest.json', pluginsUrl);
  const response = await fetch(manifestUrl);
  if (!response.ok) {
    console.warn('Plugin discovery: ' + manifestUrl + ' returned HTTP '
      + response.status + '; starting with no ' + type + ' plugins. '
      + 'Use tools/serve.mjs or deploy the tools/stage-site.mjs output.');
    return { manifestUrl, ids: [] };
  }
  try {
    const ids = parsePluginManifest(await response.json(), type);
    return { manifestUrl, ids };
  } catch (error) {
    console.warn('Plugin discovery: ' + manifestUrl + ' is invalid ('
      + error.message + '); starting with no ' + type + ' plugins.');
    return { manifestUrl, ids: [] };
  }
}

export async function loadPluginSet(type, pluginsUrl) {
  const { manifestUrl, ids } = await loadManifest(type, pluginsUrl);
  const plugins = [];

  for (const id of ids) {
    try {
      const module = await import(new URL(id + '/index.js', manifestUrl));
      const plugin = module.default;
      if (!plugin) {
        throw new Error('the module has no default export');
      }
      if (plugin.id !== id) {
        throw new Error('it exports id ' + plugin.id + ' instead of ' + id);
      }
      plugins.push(plugin);
    } catch (error) {
      console.error('Skipping plugin ' + type + '/' + id + ': '
        + error.message);
    }
  }

  return Object.freeze(sortPluginDefinitions(plugins));
}
