// Helix-local TOML reader.
//
// A configuration-format parser belongs to the keymap that owns the format,
// not to the shared plugin API.
//
// It covers the parts a keymap uses: tables, dotted and quoted keys, basic
// and literal strings (single and multi-line), arrays, inline tables,
// booleans, numbers, and comments. It throws an Error with a line number
// when a document cannot be read.

export function parseToml(text) {
  const root = Object.create(null);
  const len = text.length;
  let i = 0;
  let current = root;

  function lineAt(pos) {
    return text.slice(0, pos).split('\n').length;
  }

  function fail(message, pos) {
    const where = pos === undefined ? i : pos;
    throw new Error('TOML line ' + lineAt(where) + ': ' + message);
  }

  function isTable(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  function skipSpaces() {
    while (i < len && (text[i] === ' ' || text[i] === '\t')) i += 1;
  }

  function skipComment() {
    if (text[i] !== '#') return;
    while (i < len && text[i] !== '\n') i += 1;
  }

  function skipTrivia() {
    for (;;) {
      while (i < len && /[ \t\r\n]/.test(text[i])) i += 1;
      if (text[i] !== '#') return;
      skipComment();
    }
  }

  function skipLine() {
    skipSpaces();
    skipComment();
    if (text[i] === '\r') i += 1;
    if (i < len && text[i] !== '\n') fail('unexpected text after value');
  }

  function parseBasicString() {
    i += 1;
    let out = '';
    while (i < len) {
      const c = text[i];
      if (c === '"') {
        i += 1;
        return out;
      }
      if (c === '\n') fail('unterminated string');
      if (c !== '\\') {
        out += c;
        i += 1;
        continue;
      }
      i += 1;
      const e = text[i];
      i += 1;
      if (e === 'b') out += '\b';
      else if (e === 't') out += '\t';
      else if (e === 'n') out += '\n';
      else if (e === 'f') out += '\f';
      else if (e === 'r') out += '\r';
      else if (e === '"') out += '"';
      else if (e === '\\') out += '\\';
      else if (e === 'u' || e === 'U') {
        const width = e === 'u' ? 4 : 8;
        const hex = text.slice(i, i + width);
        if (!new RegExp('^[0-9a-fA-F]{' + width + '}$').test(hex)) {
          fail('bad unicode escape');
        }
        out += String.fromCodePoint(parseInt(hex, 16));
        i += width;
      } else if (e === '\n') {
        while (i < len && /[ \t\r\n]/.test(text[i])) i += 1;
      } else {
        fail('unknown escape \\' + e);
      }
    }
    fail('unterminated string');
  }

  function parseMultilineBasicString() {
    i += 3;
    if (text[i] === '\r') i += 1;
    if (text[i] === '\n') i += 1;
    let out = '';
    while (i < len) {
      if (text.startsWith('"""', i)) {
        i += 3;
        return out;
      }
      const c = text[i];
      if (c === '\\') {
        i += 1;
        const e = text[i];
        if (e === '\n' || e === '\r' || e === ' ' || e === '\t') {
          while (i < len && /[ \t\r\n]/.test(text[i])) i += 1;
          continue;
        }
        i -= 1;
        out += parseEscapedChar();
        continue;
      }
      out += c;
      i += 1;
    }
    fail('unterminated multi-line string');
  }

  function parseEscapedChar() {
    i += 1; // backslash
    const e = text[i];
    i += 1;
    if (e === 'b') return '\b';
    if (e === 't') return '\t';
    if (e === 'n') return '\n';
    if (e === 'f') return '\f';
    if (e === 'r') return '\r';
    if (e === '"') return '"';
    if (e === '\\') return '\\';
    if (e === 'u' || e === 'U') {
      const width = e === 'u' ? 4 : 8;
      const hex = text.slice(i, i + width);
      if (!new RegExp('^[0-9a-fA-F]{' + width + '}$').test(hex)) {
        fail('bad unicode escape');
      }
      i += width;
      return String.fromCodePoint(parseInt(hex, 16));
    }
    fail('unknown escape \\' + e);
  }

  function parseLiteralString() {
    i += 1;
    const start = i;
    while (i < len && text[i] !== "'") {
      if (text[i] === '\n') fail('unterminated literal string');
      i += 1;
    }
    if (i >= len) fail('unterminated literal string');
    const out = text.slice(start, i);
    i += 1;
    return out;
  }

  function parseMultilineLiteralString() {
    i += 3;
    if (text[i] === '\r') i += 1;
    if (text[i] === '\n') i += 1;
    const start = i;
    const end = text.indexOf("'''", i);
    if (end === -1) fail('unterminated multi-line literal string');
    i = end + 3;
    return text.slice(start, end);
  }

  function parseKeySegment() {
    skipSpaces();
    if (text[i] === '"') return parseBasicString();
    if (text[i] === "'") return parseLiteralString();
    const start = i;
    while (i < len && /[A-Za-z0-9_-]/.test(text[i])) i += 1;
    if (start === i) fail('expected a key');
    return text.slice(start, i);
  }

  function parseKeyPath() {
    const path = [parseKeySegment()];
    for (;;) {
      skipSpaces();
      if (text[i] !== '.') break;
      i += 1;
      path.push(parseKeySegment());
    }
    return path;
  }

  function tableAt(base, path) {
    let table = base;
    for (const key of path) {
      if (!(key in table)) table[key] = Object.create(null);
      else if (!isTable(table[key])) fail('key "' + key + '" is not a table');
      table = table[key];
    }
    return table;
  }

  function assign(base, path, value) {
    const table = tableAt(base, path.slice(0, -1));
    const key = path[path.length - 1];
    if (key in table) fail('duplicate key "' + path.join('.') + '"');
    table[key] = value;
  }

  function parseArray() {
    i += 1;
    const values = [];
    for (;;) {
      skipTrivia();
      if (text[i] === ']') {
        i += 1;
        return values;
      }
      values.push(parseValue());
      skipTrivia();
      if (text[i] === ',') {
        i += 1;
        continue;
      }
      if (text[i] === ']') {
        i += 1;
        return values;
      }
      fail('expected , or ] in array');
    }
  }

  function parseInlineTable() {
    i += 1;
    const table = Object.create(null);
    for (;;) {
      skipSpaces();
      if (text[i] === '}') {
        i += 1;
        return table;
      }
      const path = parseKeyPath();
      skipSpaces();
      if (text[i] !== '=') fail('expected = in inline table');
      i += 1;
      skipSpaces();
      assign(table, path, parseValue());
      skipSpaces();
      if (text[i] === ',') {
        i += 1;
        continue;
      }
      if (text[i] === '}') {
        i += 1;
        return table;
      }
      fail('expected , or } in inline table');
    }
  }

  function parseValue() {
    const c = text[i];
    if (c === '"') {
      if (text.startsWith('"""', i)) return parseMultilineBasicString();
      return parseBasicString();
    }
    if (c === "'") {
      if (text.startsWith("'''", i)) return parseMultilineLiteralString();
      return parseLiteralString();
    }
    if (c === '[') return parseArray();
    if (c === '{') return parseInlineTable();
    if (text.startsWith('true', i)) {
      i += 4;
      return true;
    }
    if (text.startsWith('false', i)) {
      i += 5;
      return false;
    }

    const start = i;
    while (i < len && !/[\s,\]}#]/.test(text[i])) i += 1;
    const raw = text.slice(start, i);
    if (!raw) fail('expected a value');
    if (/^[+-]?(?:\d[\d_]*)(?:\.\d[\d_]*)?(?:[eE][+-]?\d+)?$/.test(raw)) {
      return Number(raw.replace(/_/g, ''));
    }
    if (/^[+-]?(?:inf|nan)$/i.test(raw)) return Number(raw.replace(/_/g, ''));
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw;
    if (/^\d{2}:\d{2}/.test(raw)) return raw;
    fail('unsupported value "' + raw + '"');
  }

  while (i < len) {
    skipTrivia();
    if (i >= len) break;

    if (text[i] === '[') {
      if (text[i + 1] === '[') fail('arrays of tables are not supported');
      i += 1;
      const path = parseKeyPath();
      skipSpaces();
      if (text[i] !== ']') fail('expected ] to close a table header');
      i += 1;
      current = tableAt(root, path);
      skipLine();
      continue;
    }

    const path = parseKeyPath();
    skipSpaces();
    if (text[i] !== '=') fail('expected = after a key');
    i += 1;
    skipSpaces();
    assign(current, path, parseValue());
    skipLine();
  }

  return root;
}

// Converts a TOML value into the plain data a caller expects.
// Object.create(null) tables are returned as-is; consumers only enumerate.
export function tomlTables(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
