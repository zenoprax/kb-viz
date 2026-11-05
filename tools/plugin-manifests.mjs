// Plugin manifest generation for the local server and static site staging.

import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

import {
  PLUGIN_MANIFEST_VERSION,
  PLUGIN_TYPES,
} from '../src/plugin-manifest.js';

export { PLUGIN_TYPES };

export async function scanPluginIds(pluginsRoot, type) {
  const entries = await readdir(resolve(pluginsRoot, type), {
    withFileTypes: true,
  });
  return entries
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort();
}

export function manifestFor(type, ids) {
  return {
    version: PLUGIN_MANIFEST_VERSION,
    type,
    plugins: ids,
  };
}

export function manifestText(manifest) {
  return JSON.stringify(manifest, null, 2) + '\n';
}
