// Core-owned themes.

import { defineTheme } from './contract.js';

export const BUILTIN_THEMES = Object.freeze([
  defineTheme({
    id: 'system',
    name: 'System',
    scheme: 'system',
  }),
  defineTheme({
    id: 'light',
    name: 'Light',
    scheme: 'light',
    cssUrl: new URL('./builtin/light.css', import.meta.url),
  }),
  defineTheme({
    id: 'dark',
    name: 'Dark',
    scheme: 'dark',
    cssUrl: new URL('./builtin/dark.css', import.meta.url),
  }),
]);
