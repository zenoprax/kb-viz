// Logical-token to physical-key resolution.

const NAMED_KEY_IDS = {
  ESC: ['Escape'],
  TAB: ['Tab'],
  CAPSLOCK: ['CapsLock'],
  BACKSPACE: ['Backspace'],
  RETURN: ['Enter'],
  ENTER: ['Enter'],
  SPACE: ['Space'],
  INSERT: ['Insert'],
  DELETE: ['Delete'],
  HOME: ['Home'],
  END: ['End'],
  PAGEUP: ['PageUp'],
  PAGEDOWN: ['PageDown'],
  UP: ['ArrowUp'],
  DOWN: ['ArrowDown'],
  LEFT: ['ArrowLeft'],
  RIGHT: ['ArrowRight'],
  PRINT: ['PrintScreen'],
  SCROLLLOCK: ['ScrollLock'],
  PAUSE: ['Pause'],
  MENU: ['ContextMenu'],
  CTRL: ['ControlLeft', 'ControlRight'],
  ALT: ['AltLeft', 'AltRight'],
  SHIFT: ['ShiftLeft', 'ShiftRight'],
  META: ['MetaLeft', 'MetaRight'],
};

for (let number = 1; number <= 12; number += 1) {
  NAMED_KEY_IDS['F' + number] = ['F' + number];
}

function keyIdsForToken(layout, rawToken) {
  if (!rawToken) return [];
  const token = String(rawToken);
  const upper = token.toUpperCase();

  if (NAMED_KEY_IDS[upper]) return NAMED_KEY_IDS[upper];

  if (token.length === 1) {
    if (/[a-z]/i.test(token)) {
      const id = layout.chars[token.toLowerCase()];
      return id ? [id] : [];
    }
    const id = layout.chars[token]
      || layout.shiftChars[token]
      || (layout.altGrChars || {})[token];
    return id ? [id] : [];
  }

  return [];
}

export function createTokenIndex(layout) {
  const cache = new Map();

  function keyIds(token) {
    if (cache.has(token)) return cache.get(token);
    const ids = keyIdsForToken(layout, token);
    cache.set(token, ids);
    return ids;
  }

  return Object.freeze({
    keyIds,
    entryKeyIds(tokens) {
      const result = new Set();
      for (const token of tokens || []) {
        for (const id of keyIds(token)) result.add(id);
      }
      return result;
    },
  });
}
