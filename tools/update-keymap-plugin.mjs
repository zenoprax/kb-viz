#!/usr/bin/env node
// Shared runner for keymap plugin data updates.
//
// A URL source is an identity update: the upstream file is the data file, so
// only its hash is recorded. Plugins that need a different format own that
// transformation when their resolve step reads the source.
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

async function updatePlugin(id, options) {
  const directory = resolve(PLUGINS, id);
  const sourcePath = resolve(directory, 'source.json');
  const source = JSON.parse(await readFile(sourcePath, 'utf8'));
  const outputPath = resolve(directory, source.output);
  const output = await readFile(outputPath, 'utf8');
  let input = null;

  if (options.input) {
    input = await readFile(resolve(options.input), 'utf8');
  } else if (isHttpUrl(source.source)) {
    const response = await fetch(source.source);
    if (!response.ok) {
      throw new Error(
        'HTTP ' + response.status + ' for ' + source.source
      );
    }
    input = await response.text();
  } else {
    console.log(id + ': no URL source; skipping');
    return { changed: false };
  }

  const changed = input !== output;
  const nextSource = { ...source, outputSha: sha256(input) };

  console.log(id + ': ' + (changed ? 'data changed' : 'data unchanged'));
  console.log('  output sha256 ' + nextSource.outputSha);

  if (options.dryRun) return { changed };

  if (changed) await writeAtomic(outputPath, input);
  await writeAtomic(
    sourcePath,
    JSON.stringify(nextSource, null, 2) + '\n'
  );

  return { changed };
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
