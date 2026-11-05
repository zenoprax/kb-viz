// Composition root.

import { loadPluginSet } from './plugin-loader.js';
import { createApp } from './core/app.js';

const pluginsUrl = new URL('../plugins/', import.meta.url);

async function main() {
  const [keymapPlugins, themePlugins, layoutPlugins] = await Promise.all([
    loadPluginSet('keymaps', pluginsUrl),
    loadPluginSet('themes', pluginsUrl),
    loadPluginSet('layouts', pluginsUrl),
  ]);

  await createApp({
    keymapPlugins,
    themePlugins,
    layoutPlugins,
  });
}

main().catch(error => {
  console.error(error);
  const instructions = document.getElementById('instructions');
  if (instructions) {
    instructions.textContent = 'Could not start the keymap viewer: '
      + error.message;
  }
});
