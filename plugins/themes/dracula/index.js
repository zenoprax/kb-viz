// Dracula theme plugin.

import { defineThemePlugin } from '../../../src/plugin-api.js';

export default defineThemePlugin({
  id: 'dracula',
  name: 'Dracula',
  scheme: 'dark',
  cssUrl: new URL('./theme.css', import.meta.url),
});
