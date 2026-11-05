#!/usr/bin/env node
// Stages the runtime site for deployment.

import { cp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  PLUGIN_TYPES,
  manifestFor,
  manifestText,
  scanPluginIds,
} from './plugin-manifests.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const SITE = resolve(ROOT, '_site');
const PLUGINS = resolve(ROOT, 'plugins');
const EXCLUDED = new Set([
  '.gitkeep',
  'README.md',
  'manifest.json',
  'source.json',
]);

async function copyRuntime(source, target, depth = 0) {
  await mkdir(target, { recursive: true });
  const entries = await readdir(source, { withFileTypes: true });

  for (const entry of entries) {
    if (EXCLUDED.has(entry.name)) continue;
    // Test directories are development-only; a plugin may still be named
    // "tests", so only skip them below the plugin-directory level.
    if (entry.isDirectory() && entry.name === 'tests' && depth >= 2) {
      continue;
    }
    // Development files (*.mjs) are not part of the runtime bundle.
    if (entry.isFile() && entry.name.endsWith('.mjs')) continue;
    const from = join(source, entry.name);
    const to = join(target, entry.name);
    if (entry.isDirectory()) await copyRuntime(from, to, depth + 1);
    else await cp(from, to);
  }
}

async function main() {
  await rm(SITE, { recursive: true, force: true });
  await mkdir(SITE, { recursive: true });
  await cp(resolve(ROOT, 'index.html'), resolve(SITE, 'index.html'));
  await cp(resolve(ROOT, 'src'), resolve(SITE, 'src'), {
    recursive: true,
  });
  await copyRuntime(PLUGINS, resolve(SITE, 'plugins'));
  for (const type of PLUGIN_TYPES) {
    const ids = await scanPluginIds(PLUGINS, type);
    await writeFile(
      resolve(SITE, 'plugins', type, 'manifest.json'),
      manifestText(manifestFor(type, ids))
    );
  }
  console.log('staged runtime files in ' + relative(ROOT, SITE));
}

main().catch(error => {
  console.error(error.message || error);
  process.exitCode = 1;
});
