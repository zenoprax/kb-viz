// Monokai theme plugin.

import { defineThemePlugin } from '../../../src/plugin-api.js';

export default defineThemePlugin({
  id: 'monokai',
  name: 'Monokai',
  scheme: 'dark',
  cssUrl: new URL('./theme.css', import.meta.url),
});
