import test from 'node:test';
import assert from 'node:assert/strict';

import layout from '../index.js';

test('Dvorak maps logical letters to physical keys', () => {
  assert.equal(layout.chars.q, 'KeyX');
  assert.equal(layout.chars['['], 'Minus');
  assert.equal(layout.chars.a, 'KeyA');
  assert.equal(layout.chars[' '], 'Space');
});
