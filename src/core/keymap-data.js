// Keymap data loading.
//
// Default text is fetched once per keymap and shared by the binding count and
// the activation flow. A failed request is forgotten so the next attempt can
// retry. Custom text comes from the file store; the keymap's resolve step
// combines both layers.

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('HTTP ' + response.status);
  }
  return response.text();
}

export function createKeymapData({ fileStore }) {
  const defaultPromises = new Map();

  function defaultText(keymap) {
    if (!defaultPromises.has(keymap.id)) {
      const promise = fetchText(keymap.defaultSourceUrl).catch(error => {
        defaultPromises.delete(keymap.id);
        throw error;
      });
      defaultPromises.set(keymap.id, promise);
    }
    return defaultPromises.get(keymap.id);
  }

  async function load(keymap) {
    const [text, saved] = await Promise.all([
      defaultText(keymap),
      fileStore.get(keymap.id),
    ]);
    return { text, saved };
  }

  async function loadCounts(keymaps, onCount) {
    await Promise.all(keymaps.map(async keymap => {
      try {
        const entries = keymap.resolve({
          defaults: await defaultText(keymap),
          custom: null,
          layers: { defaults: true, custom: false },
        });
        if (Array.isArray(entries)) onCount(keymap.id, entries.length);
      } catch {
        // A keymap that cannot be read keeps its label without a count.
      }
    }));
  }

  function clear() {
    defaultPromises.clear();
  }

  return { load, loadCounts, clear };
}
