import test from 'node:test';
import assert from 'node:assert/strict';

import { parseToml, tomlTables } from '../toml.js';

test('Helix TOML reader handles tables, quoted keys, and arrays', () => {
  const document = parseToml([
    '[editor]',
    'line-number = "relative"',
    '',
    '[keys.normal]',
    "'C-s' = ':write'",
    'g = { g = "goto_file_start" }',
    '"|" = "goto_column"',
    '',
    '[keys.insert]',
    '"C-x" = ["completion", "move_char_left"]',
  ].join('\n'));

  assert.equal(document.editor['line-number'], 'relative');
  assert.equal(document.keys.normal['C-s'], ':write');
  assert.equal(document.keys.normal.g.g, 'goto_file_start');
  assert.equal(document.keys.normal['|'], 'goto_column');
  assert.deepEqual(document.keys.insert['C-x'],
    ['completion', 'move_char_left']);
});

test('Helix TOML reader reports malformed input with a line number', () => {
  assert.throws(() => parseToml('[keys.normal\n'), /TOML line 1/);
});

test('Helix TOML table helper excludes arrays and scalars', () => {
  const document = parseToml('[keys.normal]\ng = "goto_file_start"');
  assert.equal(tomlTables(document), true);
  assert.equal(tomlTables(document.keys), true);
  assert.equal(tomlTables([]), false);
  assert.equal(tomlTables('text'), false);
});
