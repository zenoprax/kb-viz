// Custom-file persistence.
//
// IndexedDB holds the last imported file per keymap, keyed by the keymap id.
// If the browser refuses the database (private mode, blocked storage) the
// store silently falls back to memory for the rest of the session.

import { MemoryStore } from './storage.js';

export function createFileStore(primary) {
  const fallback = new MemoryStore();
  let useFallback = false;

  async function call(method, ...args) {
    if (!useFallback) {
      try {
        return await primary[method](...args);
      } catch {
        useFallback = true;
      }
    }
    return fallback[method](...args);
  }

  return {
    async get(keymapId) {
      const record = await call('get', keymapId);
      if (!record || typeof record.text !== 'string') return null;
      return {
        fileName: record.fileName || 'custom file',
        text: record.text,
      };
    },
    async save(record) {
      const value = {
        keymapId: record.keymapId,
        fileName: record.fileName,
        text: record.text,
      };
      await call('set', value.keymapId, value);
      return value;
    },
    async clear(keymapId = null) {
      if (keymapId === null) await call('clear');
      else await call('delete', keymapId);
    },
  };
}

export function readFileText(file) {
  if (file && typeof file.text === 'function') return file.text();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error || new Error('Read failed'));
    reader.readAsText(file);
  });
}
