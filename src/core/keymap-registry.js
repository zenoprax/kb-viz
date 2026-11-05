// Keymap registry.

function assert(condition, message) {
  if (!condition) throw new Error('Invalid keymap registry: ' + message);
}

export function resolveKeymapList(keymapPlugins = [], builtinKeymap = null) {
  const list = builtinKeymap
    ? keymapPlugins.filter(keymap => keymap.id !== builtinKeymap.id)
    : keymapPlugins.slice();
  if (builtinKeymap) list.push(builtinKeymap);
  return list;
}

export function createKeymapRegistry(keymaps) {
  const byId = new Map();
  for (const keymap of keymaps) {
    assert(keymap && keymap.id, 'every keymap needs an id');
    assert(!byId.has(keymap.id), 'duplicate keymap id ' + keymap.id);
    byId.set(keymap.id, keymap);
  }

  const ids = [...byId.keys()];

  return Object.freeze({
    all: Object.freeze(keymaps.slice()),
    ids: Object.freeze(ids),
    get(id) {
      return byId.get(id) || null;
    },
    byFileName(name) {
      const lower = String(name || '').toLowerCase();
      for (const id of ids) {
        const keymap = byId.get(id);
        const match = keymap.file.extensions
          .some(extension => lower.endsWith(extension.toLowerCase()));
        if (match) return keymap;
      }
      return null;
    },
  });
}
