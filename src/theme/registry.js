// Theme registry.

import { BUILTIN_THEMES } from './builtin-themes.js';
import { THEME_VARIABLES, defineTheme } from './contract.js';

export { THEME_VARIABLES };

function assert(condition, message) {
  if (!condition) throw new Error('Invalid theme registry: ' + message);
}

function resolveThemeList(themePlugins = []) {
  const builtinIds = new Set(BUILTIN_THEMES.map(theme => theme.id));
  const extras = themePlugins.filter(theme =>
    theme && !builtinIds.has(theme.id));
  return [...BUILTIN_THEMES, ...extras];
}

export function createThemeRegistry(themePlugins = []) {
  const list = resolveThemeList(themePlugins);
  const byId = new Map();

  for (const candidate of list) {
    const theme = defineTheme(candidate);
    assert(!byId.has(theme.id), 'duplicate theme id ' + theme.id);
    byId.set(theme.id, theme);
  }

  const system = byId.get('system');
  assert(system, 'a system theme is required');
  assert(byId.has('light') && byId.has('dark'),
    'light and dark themes are required');

  return Object.freeze({
    all: Object.freeze(list.map(theme => byId.get(theme.id))),
    ids: Object.freeze([...byId.keys()]),
    get(id) {
      return byId.get(id) || system;
    },
    resolve(id, prefersDark) {
      const theme = byId.get(id) || system;
      if (theme.scheme !== 'system') return theme.id;
      return byId.has(prefersDark ? 'dark' : 'light')
        ? (prefersDark ? 'dark' : 'light')
        : 'light';
    },
  });
}
