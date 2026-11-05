import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import helixUpdate from '../update.mjs';
import helix from '../index.js';

const fixture = new URL('./fixtures/helix-keymap.rs', import.meta.url);

test('Helix transform expands alternatives and merges Select', async () => {
  const source = await readFile(fixture, 'utf8');
  const toml = helixUpdate.transform(source);
  const entries = helix.resolve({
    defaults: null,
    custom: toml,
    layers: { defaults: false, custom: true },
  });

  assert.match(toml, /\[keys\.normal\.g\]/);
  assert.match(toml, /h = "move_char_left"/);
  assert.match(toml, /left = "move_char_left"/);

  const normal = entries.filter(entry => entry.group === 'normal');
  const select = entries.filter(entry => entry.group === 'select');
  const insert = entries.filter(entry => entry.group === 'insert');
  assert.equal(normal.length, 4);
  assert.equal(select.length, 5);
  assert.equal(insert.length, 2);

  const selectH = select.find(entry => entry.combo === 'h');
  assert.equal(helix.actionLabel(selectH), 'Extend char left');
  assert.ok(select.some(entry => entry.combo === 'g g'));
});