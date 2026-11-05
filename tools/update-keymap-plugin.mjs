#!/usr/bin/env node
// Unified runner for keymap plugin data updates.
//
// Supports two update modes:
// 1. Plugin-owned update.mjs: imports the plugin's update.mjs, fetches the
//    source URL, runs its transform function, and writes the result.
// 2. Identity update (shared runner): fetches the source URL and writes it
//    directly to the output file (for plugins where upstream format matches).
//
// Usage:
//   node tools/update-keymap-plugin.mjs <plugin>
//   node tools/update-keymap-plugin.mjs --all
//   node tools/update-keymap-plugin.mjs example --input source.txt --dry-run

import { createHash } from 'node:crypto';
import { readdir, readFile, rename, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const PLUGINS = resolve(ROOT, 'plugins/keymaps');

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

function readOption(name) {
  const at = process.argv.indexOf(name);
  return at === -1 ? null : process.argv[at + 1] || null;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function isHttpUrl(value) {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

async function writeAtomic(path, text) {
  const temporary = path + '.tmp';
  await writeFile(temporary, text);
  await rename(temporary, path);
}

async function pluginIds() {
  const entries = await readdir(PLUGINS, { withFileTypes: true });
  return entries
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort();
}

async function fetchSource(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('HTTP ' + response.status + ' for ' + url);
  }
  return response.text();
}

async function runPluginUpdate(id, source, options) {
  const directory = resolve(PLUGINS, id);
  const updatePath = resolve(directory, 'update.mjs');

  // Check if plugin has a custom update.mjs
  try {
    await readFile(updatePath, 'utf8');
  } catch {
    return null; // No custom update.mjs
  }

  // Import the plugin's update module
  const updateModule = await import('file://' + updatePath);
  const transform = updateModule.transform || updateModule.default?.transform;

  if (typeof transform !== 'function') {
    throw new Error(id + ': update.mjs must export a transform function');
  }

  console.log(id + ': running plugin update.mjs transform');
  const transformed = transform(source);

  const sourcePath = resolve(directory, 'source.json');
  const sourceJson = JSON.parse(await readFile(sourcePath, 'utf8'));
  const outputPath = resolve(directory, sourceJson.output);
  const currentOutput = await readFile(outputPath, 'utf8').catch(() => '');
  const changed = transformed !== currentOutput;
  const nextSource = { ...sourceJson, outputSha: sha256(transformed) };

  console.log(id + ': ' + (changed ? 'data changed' : 'data unchanged'));
  console.log('  output sha256 ' + nextSource.outputSha);

  if (options.dryRun) return { changed };

  if (changed) await writeAtomic(outputPath, transformed);
  await writeAtomic(
    sourcePath,
    JSON.stringify(nextSource, null, 2) + '\n'
  );

  return { changed };
}

async function runIdentityUpdate(id, source, options) {
  const directory = resolve(PLUGINS, id);
  const sourcePath = resolve(directory, 'source.json');
  const sourceJson = JSON.parse(await readFile(sourcePath, 'utf8'));
  const outputPath = resolve(directory, sourceJson.output);
  const output = await readFile(outputPath, 'utf8').catch(() => '');

  const changed = source !== output;
  const nextSource = { ...sourceJson, outputSha: sha256(source) };

  console.log(id + ': ' + (changed ? 'data changed' : 'data unchanged'));
  console.log('  output sha256 ' + nextSource.outputSha);

  if (options.dryRun) return { changed };

  if (changed) await writeAtomic(outputPath, source);
  await writeAtomic(
    sourcePath,
    JSON.stringify(nextSource, null, 2) + '\n'
  );

  return { changed };
}

async function updatePlugin(id, options) {
  const directory = resolve(PLUGINS, id);
  const sourcePath = resolve(directory, 'source.json');
  const sourceJson = JSON.parse(await readFile(sourcePath, 'utf8'));

  let input = null;

  if (options.input) {
    input = await readFile(resolve(options.input), 'utf8');
  } else if (isHttpUrl(sourceJson.source)) {
    input = await fetchSource(sourceJson.source);
  } else {
    console.log(id + ': no URL source; skipping');
    return { changed: false };
  }

  // Try plugin-owned update first
  const pluginResult = await runPluginUpdate(id, input, options);
  if (pluginResult !== null) {
    return pluginResult;
  }

  // Fall back to identity update
  return runIdentityUpdate(id, input, options);
}

async function main() {
  const options = {
    input: readOption('--input'),
    dryRun: hasFlag('--dry-run'),
  };
  const requested = process.argv.slice(2).filter(argument =>
    !argument.startsWith('-') && argument !== options.input
  );
  const ids = hasFlag('--all') ? await pluginIds() : requested;

  if (!ids.length) {
    if (hasFlag('--all')) {
      console.log('no keymap plugins; nothing to update');
      return;
    }
    console.error('Usage: node tools/update-keymap-plugin.mjs <plugin>|--all');
    process.exitCode = 2;
    return;
  }

  let changed = false;
  for (const id of ids) {
    const result = await updatePlugin(id, options);
    changed = changed || result.changed;
  }

  if (options.dryRun && changed) console.log('dry run: no files written');
}

main().catch(error => {
  console.error(error.message || error);
  process.exitCode = 2;
});