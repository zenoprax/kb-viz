// Shared physical keyboard geometry.

const UNIT = 46;
const GAP = 5;
const ROW_H = 44;
const ROW_GAP = 5;

// The Tab row is the widest 15-unit row, so it defines the shared right edge.
// It has 14 keys, hence 13 inter-key gaps.
const MAIN_WIDTH = 15 * UNIT + 13 * GAP;

// The navigation block sits close to the main keys. The function row keeps
// a slightly larger gap above the number row.
const CLUSTER_GAP = UNIT * 0.3;
const FN_ROW_GAP = 18;

export const MODIFIER_KEY_IDS = new Set([
  'ControlLeft', 'ControlRight',
  'AltLeft', 'AltRight',
  'ShiftLeft', 'ShiftRight',
  'MetaLeft', 'MetaRight',
]);

// Right-edge math counts every item, including spacer items.
function rowWidthInUnits(itemCount) {
  return (MAIN_WIDTH - (itemCount - 1) * GAP) / UNIT;
}

// Stretches one named key until its row reaches the shared right edge.
function stretchKeyToFit(row, keyId) {
  const fixedWidth = row.reduce((total, [id, , width]) =>
    id === keyId ? total : total + width, 0);
  const width = rowWidthInUnits(row.length) - fixedWidth;
  return row.map(item =>
    item[0] === keyId ? [item[0], item[1], width] : item);
}

// The 12 F keys keep their internal spacing and shift right as one group.
const FN_ROW_SPACER = rowWidthInUnits(16) - (1 + 12 + 0.8);

const FN_ROW = [
  ['Escape', 'Esc', 1],
  [null, '', FN_ROW_SPACER],
  ['F1', 'F1', 1], ['F2', 'F2', 1], ['F3', 'F3', 1], ['F4', 'F4', 1],
  [null, '', 0.4],
  ['F5', 'F5', 1], ['F6', 'F6', 1], ['F7', 'F7', 1], ['F8', 'F8', 1],
  [null, '', 0.4],
  ['F9', 'F9', 1], ['F10', 'F10', 1], ['F11', 'F11', 1], ['F12', 'F12', 1],
];

const SYSTEM_ROW = [
  ['PrintScreen', 'PrtSc', 1],
  ['ScrollLock', 'ScrLk', 1],
  ['Pause', 'Pause', 1],
];

const NUMBER_ROW = [
  ['Backquote', '`', 1],
  ['Digit1', '1', 1], ['Digit2', '2', 1], ['Digit3', '3', 1],
  ['Digit4', '4', 1], ['Digit5', '5', 1], ['Digit6', '6', 1],
  ['Digit7', '7', 1], ['Digit8', '8', 1], ['Digit9', '9', 1],
  ['Digit0', '0', 1],
  ['Minus', '-', 1], ['Equal', '=', 1],
  ['Backspace', 'Backspace', 2],
];

const TAB_ROW = [
  ['Tab', 'Tab', 1.5],
  ['KeyQ', 'Q', 1], ['KeyW', 'W', 1], ['KeyE', 'E', 1], ['KeyR', 'R', 1],
  ['KeyT', 'T', 1], ['KeyY', 'Y', 1], ['KeyU', 'U', 1], ['KeyI', 'I', 1],
  ['KeyO', 'O', 1], ['KeyP', 'P', 1],
  ['BracketLeft', '[', 1], ['BracketRight', ']', 1],
  ['Backslash', '\\', 1.5],
];

const CAPS_ROW = stretchKeyToFit([
  ['CapsLock', 'Caps', 1.75],
  ['KeyA', 'A', 1], ['KeyS', 'S', 1], ['KeyD', 'D', 1], ['KeyF', 'F', 1],
  ['KeyG', 'G', 1], ['KeyH', 'H', 1], ['KeyJ', 'J', 1], ['KeyK', 'K', 1],
  ['KeyL', 'L', 1],
  ['Semicolon', ';', 1], ['Quote', "'", 1],
  ['Enter', 'Return', 2.25],
], 'Enter');

const SHIFT_ROW_ANSI = stretchKeyToFit([
  ['ShiftLeft', 'Shift', 2.25],
  ['KeyZ', 'Z', 1], ['KeyX', 'X', 1], ['KeyC', 'C', 1], ['KeyV', 'V', 1],
  ['KeyB', 'B', 1], ['KeyN', 'N', 1], ['KeyM', 'M', 1],
  ['Comma', ',', 1], ['Period', '.', 1], ['Slash', '/', 1],
  ['ShiftRight', 'Shift', 2.75],
], 'ShiftLeft');

const SHIFT_ROW_ISO = stretchKeyToFit([
  ['ShiftLeft', 'Shift', 1.25],
  ['IntlBackslash', '\\', 1],
  ['KeyZ', 'Z', 1], ['KeyX', 'X', 1], ['KeyC', 'C', 1], ['KeyV', 'V', 1],
  ['KeyB', 'B', 1], ['KeyN', 'N', 1], ['KeyM', 'M', 1],
  ['Comma', ',', 1], ['Period', '.', 1], ['Slash', '/', 1],
  ['ShiftRight', 'Shift', 2.75],
], 'ShiftLeft');

const BOTTOM_ROW = stretchKeyToFit([
  ['ControlLeft', 'Ctrl', 1.25],
  ['MetaLeft', 'Meta', 1.25],
  ['AltLeft', 'Alt', 1.25],
  ['Space', 'Space', 6.25],
  ['AltRight', 'Alt', 1.25],
  ['MetaRight', 'Meta', 1.25],
  ['ContextMenu', 'Menu', 1.25],
  ['ControlRight', 'Ctrl', 1.25],
], 'Space');

const NAV_ROWS = [
  [['Insert', 'Ins', 1], ['Home', 'Home', 1], ['PageUp', 'PgUp', 1]],
  [['Delete', 'Del', 1], ['End', 'End', 1], ['PageDown', 'PgDn', 1]],
];

const ARROW_ROWS = [
  [[null, '', 1], ['ArrowUp', '\u2191', 1], [null, '', 1]],
  [
    ['ArrowLeft', '\u2190', 1],
    ['ArrowDown', '\u2193', 1],
    ['ArrowRight', '\u2192', 1],
  ],
];

export const KEY_IDS = Object.freeze([...new Set([
  ...FN_ROW,
  ...NUMBER_ROW,
  ...TAB_ROW,
  ...CAPS_ROW,
  ...SHIFT_ROW_ANSI,
  ...SHIFT_ROW_ISO,
  ...BOTTOM_ROW,
  ...SYSTEM_ROW,
  ...NAV_ROWS.flat(),
  ...ARROW_ROWS.flat(),
].map(([id]) => id).filter(Boolean))]);

function layoutRow(row, startX, startY) {
  let x = startX;
  const keys = [];

  for (const [id, legend, width] of row) {
    if (!id) {
      x += width * UNIT + GAP;
      continue;
    }
    keys.push({
      id,
      legend,
      x,
      y: startY,
      w: width * UNIT,
      h: ROW_H,
    });
    x += width * UNIT + GAP;
  }

  return keys;
}

export function buildKeyboardGeometry(variant = 'ansi') {
  const mainRows = [
    FN_ROW,
    NUMBER_ROW,
    TAB_ROW,
    CAPS_ROW,
    variant === 'iso' ? SHIFT_ROW_ISO : SHIFT_ROW_ANSI,
    BOTTOM_ROW,
  ];
  const keys = [];
  let y = 0;

  mainRows.forEach((row, index) => {
    keys.push(...layoutRow(row, 0, y));
    y += ROW_H;
    if (index < mainRows.length - 1) {
      y += index === 0 ? FN_ROW_GAP : ROW_GAP;
    }
  });

  const mainWidth = Math.max(...keys.map(key => key.x + key.w));
  const mainHeight = y;
  const navX = mainWidth + CLUSTER_GAP;

  // System keys share the function row; the navigation block starts beside
  // the number row and continues down beside Tab.
  keys.push(...layoutRow(SYSTEM_ROW, navX, 0));
  let navY = ROW_H + FN_ROW_GAP;

  for (const row of NAV_ROWS) {
    keys.push(...layoutRow(row, navX, navY));
    navY += ROW_H + ROW_GAP;
  }

  // The arrow block sits at the bottom of the board. Its lower row shares
  // the space bar and modifier baseline.
  let arrowY = mainHeight - (ROW_H * 2 + ROW_GAP);
  for (const row of ARROW_ROWS) {
    keys.push(...layoutRow(row, navX, arrowY));
    arrowY += ROW_H + ROW_GAP;
  }

  return {
    variant,
    keys,
    totalWidth: navX + 3 * UNIT + 2 * GAP,
    totalHeight: mainHeight,
  };
}
