// Plugin manifest parsing and alphabetical sorting.

export const PLUGIN_MANIFEST_VERSION = 1;
export const PLUGIN_TYPES = Object.freeze([
  'keymaps', 'themes', 'layouts',
]);

const ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

function assert(condition, message) {
  if (!condition) throw new Error('Invalid plugin manifest: ' + message);
}

export function parsePluginManifest(value, type) {
  assert(PLUGIN_TYPES.includes(type), 'unknown type ' + type);
  assert(value && typeof value === 'object' && !Array.isArray(value),
    'manifest must be an object');
  assert(value.version === PLUGIN_MANIFEST_VERSION,
    'unsupported version ' + value.version);
  assert(value.type === type, 'type must be ' + type);
  assert(Array.isArray(value.plugins), 'plugins must be an array');

  const ids = value.plugins.map(id => {
    assert(typeof id === 'string' && ID_PATTERN.test(id),
      'invalid plugin id ' + id);
    return id;
  });
  assert(new Set(ids).size === ids.length, 'plugin ids must be unique');

  return Object.freeze(ids);
}

export function sortPluginDefinitions(plugins) {
  return plugins.slice().sort((left, right) =>
    String(left.id).localeCompare(String(right.id)));
}
