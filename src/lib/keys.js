// Shared key-token helpers.

export const MODIFIER_TOKENS = ['CTRL', 'ALT', 'SHIFT', 'META'];

const NAMED_KEYS = {
  esc: 'ESC',
  escape: 'ESC',
  ret: 'RETURN',
  return: 'RETURN',
  enter: 'RETURN',
  cr: 'RETURN',
  space: 'SPACE',
  spc: 'SPACE',
  tab: 'TAB',
  btab: 'TAB',
  backspace: 'BACKSPACE',
  bspace: 'BACKSPACE',
  del: 'DELETE',
  delete: 'DELETE',
  dc: 'DELETE',
  ins: 'INSERT',
  insert: 'INSERT',
  ic: 'INSERT',
  home: 'HOME',
  end: 'END',
  pageup: 'PAGEUP',
  pgup: 'PAGEUP',
  ppage: 'PAGEUP',
  prior: 'PAGEUP',
  pagedown: 'PAGEDOWN',
  pgdn: 'PAGEDOWN',
  npage: 'PAGEDOWN',
  next: 'PAGEDOWN',
  up: 'UP',
  down: 'DOWN',
  left: 'LEFT',
  right: 'RIGHT',
  print: 'PRINT',
  prtsc: 'PRINT',
  prtscr: 'PRINT',
  sysrq: 'PRINT',
  menu: 'MENU',
  search: 'MENU',
  capslock: 'CAPSLOCK',
  caps: 'CAPSLOCK',
  ctrl: 'CTRL',
  control: 'CTRL',
  alt: 'ALT',
  shift: 'SHIFT',
  meta: 'META',
  super: 'META',
  win: 'META',
  minus: '-',
  equal: '=',
  underscore: '_',
  plus: '+',
  semicolon: ';',
  colon: ':',
  comma: ',',
  period: '.',
  slash: '/',
  backslash: '\\',
  pipe: '|',
  grave: '`',
  leftbracket: '[',
  rightbracket: ']',
  quote: "'",
  apostrophe: "'",
  doublequote: '"',
};

const MODIFIER_ALIASES = {
  CTRL: 'CTRL',
  CONTROL: 'CTRL',
  SHIFT: 'SHIFT',
  ALT: 'ALT',
  META: 'META',
  SUPER: 'META',
  WIN: 'META',
};

export function normalizeKeyName(raw) {
  const text = String(raw);
  if (!text) return '';
  if (text.length === 1) {
    return /[a-z]/i.test(text) ? text.toUpperCase() : text;
  }

  const lower = text.toLowerCase();
  if (NAMED_KEYS[lower]) return NAMED_KEYS[lower];
  if (/^f\d{1,2}$/.test(lower)) return lower.toUpperCase();
  return text.toUpperCase();
}

export function normalizeModifier(raw) {
  return MODIFIER_ALIASES[String(raw).toUpperCase()] || '';
}

export function isModifierToken(token) {
  return MODIFIER_TOKENS.includes(token);
}

// A trailing empty segment represents a literal plus key, as in "Meta++".
export function splitPlusCombo(combo) {
  const parts = String(combo).split('+');
  const keys = [];

  parts.forEach((part, index) => {
    const value = part.trim();
    if (value) {
      keys.push(value);
      return;
    }
    if (index === parts.length - 1) keys.push('+');
  });

  return keys;
}

export function uniqueTokens(tokens) {
  const seen = new Set();
  return tokens.filter(token => {
    if (!token || seen.has(token)) return false;
    seen.add(token);
    return true;
  });
}
