#!/usr/bin/env node
// Markdown link check.
//
// Run from the repository root:
//   node tools/check-links.mjs

import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const SKIP = new Set(['.git', '.opencode', '_site', 'node_modules']);
const problems = [];
const anchorCache = new Map();

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (SKIP.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else if (extname(entry.name) === '.md') files.push(path);
  }
  return files;
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

function decode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

// Matches GitHub's heading anchors closely enough for this repository.
function slug(text) {
  return text
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[`*_~[\]]/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-');
}

async function anchorsOf(path) {
  if (anchorCache.has(path)) return anchorCache.get(path);
  const text = await readFile(path, 'utf8');
  const seen = new Map();
  const anchors = new Set();
  for (const line of text.split('\n')) {
    const match = line.match(/^#{1,6}\s+(.*)$/);
    if (!match) continue;
    let anchor = slug(match[1]);
    const count = seen.get(anchor) || 0;
    seen.set(anchor, count + 1);
    if (count) anchor += '-' + count;
    anchors.add(anchor);
  }
  anchorCache.set(path, anchors);
  return anchors;
}

function linkTargets(line) {
  const text = line.replace(/`[^`]*`/g, '');
  return [...text.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)]
    .map(match => match[1].trim());
}

function resolveTarget(file, target) {
  if (!target) return file;
  if (target.startsWith('/')) return resolve(ROOT, '.' + target);
  return resolve(dirname(file), target);
}

async function checkFile(file) {
  const lines = (await readFile(file, 'utf8')).split('\n');
  const label = relative(ROOT, file);
  let fenced = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;

    for (const raw of linkTargets(line)) {
      const href = raw.replace(/^<|>$/g, '').split(/\s+/)[0];
      if (!href || /^[a-z][a-z0-9+.-]*:/i.test(href)) continue;

      const hashAt = href.indexOf('#');
      const targetPart = hashAt === -1 ? href : href.slice(0, hashAt);
      const anchor = hashAt === -1 ? '' : href.slice(hashAt + 1);
      const resolved = resolveTarget(file, decode(targetPart));
      const where = label + ':' + (index + 1);

      if (!await exists(resolved)) {
        problems.push(where + ' -> missing ' + href);
        continue;
      }
      if (!anchor) continue;

      const info = await stat(resolved);
      const page = info.isDirectory() ? join(resolved, 'README.md') : resolved;
      if (extname(page) !== '.md' || !await exists(page)) continue;

      const anchors = await anchorsOf(page);
      if (!anchors.has(decode(anchor).toLowerCase())) {
        problems.push(where + ' -> missing anchor #' + anchor);
      }
    }
  }
}

const files = await walk(ROOT);
for (const file of files) await checkFile(file);

if (problems.length) {
  console.error('link check failed with ' + problems.length + ' problem(s):');
  for (const problem of problems) console.error(' - ' + problem);
  process.exitCode = 1;
} else {
  console.log('ok: links checked in ' + files.length + ' markdown files');
}
