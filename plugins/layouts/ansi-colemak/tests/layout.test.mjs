import test from 'node:test';
import assert from 'node:assert/strict';

import layout from '../index.js';

test('Colemak maps moved letters to physical keys', () => {
  assert.equal(layout.chars.f, 'KeyE');
  assert.equal(layout.chars.p, 'KeyR');
  assert.equal(layout.chars.o, 'Semicolon');
  assert.equal(layout.chars[';'], 'KeyP');
  assert.equal(layout.chars[' '], 'Space');
});
