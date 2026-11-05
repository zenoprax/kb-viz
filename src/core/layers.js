// Helpers for resolving default and custom binding layers.
// A keymap's resolve step owns parsing; these keep its merge and removal
// logic small. Contract: docs/public/reference/keymap-plugin.md#custom-merge.

// Joins identity parts without collisions from ordinary key or action text.
export function entryKey(parts) {
  return parts.join('\u0000');
}

// Replaces base entries with custom entries that share an identity.
//
// The base order is kept so a replaced binding stays where it was. Duplicate
// base identities collapse only when a custom entry actually overrides them.
export function mergeOverrides(baseEntries, overrides, identity) {
  const overrideById = new Map();
  for (const entry of overrides) {
    overrideById.set(identity(entry), entry);
  }

  const result = [];
  const placed = new Set();

  for (const entry of baseEntries) {
    const id = identity(entry);
    if (!overrideById.has(id)) {
      result.push(entry);
      continue;
    }
    if (placed.has(id)) continue;
    result.push(overrideById.get(id));
    placed.add(id);
  }

  for (const entry of overrides) {
    const id = identity(entry);
    if (placed.has(id)) continue;
    result.push(overrideById.get(id));
    placed.add(id);
  }

  return result;
}

export function removeEntries(entries, predicate) {
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    if (predicate(entries[index])) entries.splice(index, 1);
  }
  return entries;
}

// Forces impossible layer combinations back to a usable state.
export function normalizeLayers(layers, hasCustom) {
  return {
    defaults: layers.defaults !== false,
    custom: Boolean(hasCustom) && layers.custom === true,
  };
}


