// Theme contract; see docs/public/reference/theme-plugin.md.

export const THEME_VARIABLES = Object.freeze([
  'paper', 'plate', 'field',
  'ink', 'ink-2', 'ink-3',
  'rule', 'rule-soft', 'hover', 'sel', 'accent', 'focus',
  'key-bound', 'key-bound-border',
  'key-mod-bound', 'key-mod-bound-border', 'key-mod-bound-ink',
  'control-border', 'key-unbound', 'key-unbound-border', 'key-unbound-ink',
  'key-bound-count', 'key-mod-bound-count',
  'accent-1', 'accent-2', 'accent-3',
  'accent-4', 'accent-5', 'accent-6',
  'neutral',
]);

const BUILTIN_THEME_IDS = Object.freeze([
  'system', 'light', 'dark',
]);

const REQUIRED_FIELDS = ['id', 'name', 'scheme'];

function assert(condition, message) {
  if (!condition) throw new Error('Invalid theme: ' + message);
}

// Built-in themes may use the system scheme and have no CSS file.
export function defineTheme(definition) {
  for (const field of REQUIRED_FIELDS) {
    assert(definition[field] !== undefined, 'missing ' + field);
  }
  assert(['light', 'dark', 'system'].includes(definition.scheme),
    definition.id + ' has an unknown scheme');
  if (definition.scheme !== 'system') {
    assert(definition.cssUrl, definition.id + ' needs a CSS URL');
  }
  return Object.freeze({ ...definition });
}

const PLUGIN_FIELDS = new Set(['id', 'name', 'scheme', 'cssUrl']);

export function defineThemePlugin(definition) {
  assert(!BUILTIN_THEME_IDS.includes(definition.id),
    definition.id + ' is a built-in theme id');
  for (const field of Object.keys(definition)) {
    assert(PLUGIN_FIELDS.has(field), 'unknown field ' + field);
  }
  assert(definition.scheme !== 'system',
    definition.id + ' must declare light or dark');
  assert(definition.cssUrl, definition.id + ' needs a CSS URL');
  return defineTheme(definition);
}
