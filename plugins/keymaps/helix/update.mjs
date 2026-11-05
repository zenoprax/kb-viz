// Converts Helix's Rust keymap source into the TOML file the viewer fetches.
//
// The upstream file uses keymap!({ ... }) macros. This module reads the
// string keys, | alternatives, => commands, and nested groups, then emits
// ordinary nested TOML tables. Select inherits Normal in Helix, so its TOML
// contains the merged bindings the viewer displays.

function skipTrivia(source, start) {
  let index = start;
  for (;;) {
    while (index < source.length && /\s/.test(source[index])) index += 1;
    if (source.startsWith('//', index)) {
      const end = source.indexOf('\n', index);
      index = end === -1 ? source.length : end + 1;
      continue;
    }
    if (source.startsWith('/*', index)) {
      const end = source.indexOf('*/', index + 2);
      index = end === -1 ? source.length : end + 2;
      continue;
    }
    return index;
  }
}

function readString(source, start) {
  let index = start + 1;
  let value = '';
  while (index < source.length) {
    const character = source[index];
    if (character === '"') return { value, next: index + 1 };
    if (character !== '\\') {
      value += character;
      index += 1;
      continue;
    }
    const escape = source[index + 1];
    const simple = {
      n: '\n', r: '\r', t: '\t', '0': '\0',
      '"': '"', '\\': '\\',
    };
    if (escape in simple) {
      value += simple[escape];
      index += 2;
    } else {
      value += escape;
      index += 2;
    }
  }
  throw new Error('Unterminated Rust string');
}

function readIdentifier(source, start) {
  const match = source.slice(start).match(/^[A-Za-z_][A-Za-z0-9_:]*/);
  if (!match) throw new Error('Expected a command near: '
    + source.slice(start, start + 30));
  return { value: match[0], next: start + match[0].length };
}

function parseBlock(source, start) {
  if (source[start] !== '{') throw new Error('Expected {');
  let index = skipTrivia(source, start + 1);
  const title = readString(source, index);
  index = skipTrivia(source, title.next);

  if (source.startsWith('sticky=', index)) {
    index += 'sticky='.length;
    while (index < source.length && !/[\s,}]/.test(source[index])) {
      index += 1;
    }
  }
  if (source[index] === ',') index = skipTrivia(source, index + 1);

  const entries = [];
  while (index < source.length) {
    index = skipTrivia(source, index);
    if (source[index] === '}') return { entries, next: index + 1 };

    const keys = [];
    while (source[index] === '"') {
      const key = readString(source, index);
      keys.push(key.value);
      index = skipTrivia(source, key.next);
      if (source[index] !== '|') break;
      index = skipTrivia(source, index + 1);
    }

    if (source[index] !== '=' || source[index + 1] !== '>') {
      throw new Error('Expected => after keys ' + keys.join('|'));
    }
    index = skipTrivia(source, index + 2);

    if (source[index] === '{') {
      const child = parseBlock(source, index);
      for (const key of keys) {
        entries.push({ keys: [key], children: child.entries });
      }
      index = child.next;
    } else {
      const command = readIdentifier(source, index);
      for (const key of keys) {
        entries.push({ keys: [key], command: command.value });
      }
      index = command.next;
    }

    index = skipTrivia(source, index);
    if (source[index] === ',') index = skipTrivia(source, index + 1);
  }

  throw new Error('Unterminated keymap block');
}

function findBlocks(source) {
  const blocks = [];
  const pattern = /keymap!\s*\(\s*\{/g;
  let match;

  while ((match = pattern.exec(source))) {
    const brace = source.indexOf('{', match.index);
    const parsed = parseBlock(source, brace);
    const before = source.slice(Math.max(0, match.index - 160), match.index);
    const assigned = before.match(/let\s+(\w+)\s*=\s*$/);
    const merged = before.match(/(\w+)\.merge_nodes\s*\(\s*$/);
    const mode = assigned ? assigned[1] : merged ? merged[1] : null;

    if (mode) blocks.push({ mode, entries: parsed.entries });
    pattern.lastIndex = parsed.next;
  }

  return blocks;
}

function createNode() {
  return { command: null, children: new Map() };
}

function applyEntry(node, entry) {
  let current = node;
  for (const key of entry.keys) {
    if (!current.children.has(key)) current.children.set(key, createNode());
    current = current.children.get(key);
  }

  if (entry.command) {
    current.command = entry.command;
    return;
  }
  for (const child of entry.children) applyEntry(current, child);
}

function applyBlock(node, entries) {
  for (const entry of entries) applyEntry(node, entry);
}

function cloneNode(node) {
  const copy = createNode();
  copy.command = node.command;
  for (const [key, child] of node.children) {
    copy.children.set(key, cloneNode(child));
  }
  return copy;
}

function tomlKey(value) {
  return /^[A-Za-z0-9_-]+$/.test(value)
    ? value
    : JSON.stringify(value);
}

function tableHeader(path) {
  return path.map((part, index) => index === 0 ? part : tomlKey(part))
    .join('.');
}

function emitTable(lines, node, path) {
  const direct = [];
  const nested = [];

  for (const [key, child] of node.children) {
    if (child.command) direct.push([key, child.command]);
    else nested.push([key, child]);
  }

  if (direct.length) {
    if (path.length > 1) lines.push('', '[' + tableHeader(path) + ']');
    for (const [key, command] of direct) {
      lines.push(tomlKey(key) + ' = ' + JSON.stringify(command));
    }
  }

  for (const [key, child] of nested) emitTable(lines, child, path.concat(key));
}

function emitMode(mode, root) {
  const lines = [];
  emitTable(lines, root, ['keys', mode]);
  return lines.join('\n');
}

function modeTrie(blocks) {
  const normal = createNode();
  const insert = createNode();

  for (const block of blocks) {
    if (block.mode === 'normal') applyBlock(normal, block.entries);
    if (block.mode === 'insert') applyBlock(insert, block.entries);
  }

  const mergedSelect = cloneNode(normal);
  for (const block of blocks) {
    if (block.mode === 'select') applyBlock(mergedSelect, block.entries);
  }

  return { normal, select: mergedSelect, insert };
}

export function transform(source) {
  const blocks = findBlocks(source);
  if (!blocks.length) throw new Error('No keymap! blocks found');

  const trie = modeTrie(blocks);
  const header = [
    '# Helix default keymap, generated from helix-term/src/keymap/default.rs.',
    '# This file is a normal Helix config fragment: edit or replace it',
    '# with your own.',
    '# Select mode includes the Normal bindings it inherits.',
    '',
  ];

  return header
    .concat([
      emitMode('normal', trie.normal),
      '',
      emitMode('select', trie.select),
      '',
      emitMode('insert', trie.insert),
      '',
    ])
    .join('\n');
}

export default { transform };
