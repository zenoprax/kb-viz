import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import helix from '../index.js';
import { parseHelixKey } from '../parser.js';
import { classifyHelixAction } from '../adapter.js';

async function defaultText() {
  return readFile(new URL(helix.defaultSourceUrl), 'utf8');
}

test('Helix plugin loads defaults and resolves key sequences', async () => {
  const entries = helix.resolve({
    defaults: await defaultText(),
    custom: null,
    layers: { defaults: true, custom: false },
  });
  assert.ok(entries.length > 500);
  assert.deepEqual(
    [...new Set(entries.map(entry => entry.group))].sort(),
    ['insert', 'normal', 'select']
  );

  const byCombo = combo => entries.find(entry =>
    entry.group === 'normal' && entry.combo === combo);
  assert.equal(helix.actionLabel(byCombo('g g')), 'Go to file start');
  assert.deepEqual(byCombo('g g').tokens, ['G']);
  assert.equal(helix.actionLabel(byCombo('C-w C-s')), 'Hsplit');
  assert.deepEqual(byCombo('C-w C-s').tokens, ['CTRL', 'W', 'S']);
  assert.equal(helix.actionLabel(byCombo('Space f')), 'File picker');
  assert.deepEqual(byCombo('A-C').tokens, ['ALT', 'SHIFT', 'C']);
});

test('Helix custom TOML supports nesting, arrays, and symbols', () => {
  const source = [
    '# A full config with unrelated tables is allowed.',
    '[editor]',
    'line-number = "relative"',
    '',
    '[keys.normal]',
    "'C-s' = ':write'",
    'g = { g = "goto_file_start" }',
    '',
    '[keys.normal.g]',
    '"|" = "goto_column"',
    '',
    '[keys.insert]',
    'esc = "normal_mode"',
    '"C-x" = ["completion", "move_char_left"]',
  ].join('\n');
  const entries = helix.resolve({
    defaults: null,
    custom: source,
    layers: { defaults: false, custom: true },
  });

  assert.equal(entries.length, 5);
  assert.deepEqual(entries[0], {
    group: 'normal',
    action: ':write',
    combo: 'C-s',
    tokens: ['CTRL', 'S'],
    commands: [':write'],
    sequence: ['C-s'],
  });
  assert.deepEqual(entries[1].tokens, ['G']);
  assert.deepEqual(entries[2].tokens, ['G', '|']);
  assert.equal(classifyHelixAction(entries[2]), 'motion');
  assert.deepEqual(entries[4].tokens, ['CTRL', 'X']);
  assert.equal(helix.actionLabel(entries[4]), 'Completion + Move char left');
});

test('Helix key parser keeps shifted symbols logical', () => {
  assert.deepEqual(parseHelixKey('A-_').tokens, ['ALT', '_']);
  assert.deepEqual(parseHelixKey('A-C').tokens, ['ALT', 'SHIFT', 'C']);
  assert.deepEqual(parseHelixKey('S-backspace').tokens,
    ['SHIFT', 'BACKSPACE']);
  assert.deepEqual(parseHelixKey('C--').tokens, ['CTRL', '-']);
  assert.deepEqual(parseHelixKey('S-C--').tokens,
    ['SHIFT', 'CTRL', '-']);
  assert.deepEqual(parseHelixKey('|').tokens, ['|']);
  assert.throws(() => helix.resolve({
    defaults: null,
    custom: '[editor]\nline-number = "relative"',
    layers: { defaults: false, custom: true },
  }), /No \[keys\.\*\] tables/);
});

test('Helix custom bindings are additive', async () => {
  const defaultsText = await defaultText();
  const source = [
    '[keys.normal]',
    'h = "custom_left"',
    'F12 = "custom_action"',
    '[keys.select]',
    'h = "extend_custom"',
  ].join('\n');
  const merged = helix.resolve({
    defaults: defaultsText,
    custom: source,
    layers: { defaults: true, custom: true },
  });

  // Default entries + 1 new (F12) = 676 (h replaces existing)
  assert.equal(merged.length, 676);
  assert.equal(
    merged.find(entry =>
      entry.group === 'normal' && entry.combo === 'h').action,
    'custom_left'
  );
  assert.equal(
    merged.find(entry =>
      entry.group === 'select' && entry.combo === 'h').action,
    'extend_custom'
  );
  assert.ok(merged.some(entry =>
    entry.group === 'normal' && entry.combo === 'F12'));

  const customOnly = helix.resolve({
    defaults: null,
    custom: source,
    layers: { defaults: false, custom: true },
  });
  assert.equal(customOnly.length, 3);
});