// Keymap contract; see docs/public/reference/keymap-plugin.md.

const BUILTIN_KEYMAP_IDS = Object.freeze(['base']);

const REQUIRED_FIELDS = [
  'id',
  'name',
  'defaultSourceUrl',
  'instructions',
  'file',
  'resolve',
];

const OPTIONAL_FIELDS = [
  'shortName',
  'defaultSourceLabel',
  'actionLabel',
  'groupLabel',
];

const PLUGIN_FIELDS = new Set([
  ...REQUIRED_FIELDS,
  ...OPTIONAL_FIELDS,
  'facets',
]);

function assert(condition, message) {
  if (!condition) throw new Error('Invalid keymap: ' + message);
}

function validateFile(file, id) {
  assert(file && typeof file === 'object', id + ' needs a file descriptor');
  assert(Array.isArray(file.extensions) && file.extensions.length > 0,
    id + ' needs at least one file extension');
  for (const extension of file.extensions) {
    assert(typeof extension === 'string' && extension,
      id + ' file extensions must be non-empty strings');
  }
  for (const field of ['description', 'openLabel', 'dropLabel']) {
    if (file[field] !== undefined) {
      assert(typeof file[field] === 'string' && file[field],
        id + ' file ' + field + ' must be a non-empty string');
    }
  }
  if (file.accept !== undefined) {
    assert(file.accept && typeof file.accept === 'object',
      id + ' file accept must be a map');
  }
}

function normalizeFile(file, name) {
  const extensions = file.extensions.slice();
  const extension = extensions[0];
  return {
    description: file.description || name + ' file',
    extensions,
    accept: file.accept || { 'text/plain': extensions },
    openLabel: file.openLabel || 'Open ' + extension,
    dropLabel: file.dropLabel || 'Drop a ' + extension + ' file',
  };
}

function defaultActionLabel(entry) {
  return entry.action;
}

function defaultGroupLabel(entry) {
  return entry.group || '';
}

function validateValues(values) {
  for (const value of Object.values(values)) {
    assert(value && value.name, 'a facet value needs a name');
  }
}

function validateFacets(facets, id) {
  assert(Array.isArray(facets), id + ' facets must be an array');
  const ids = new Set();
  let defaults = 0;

  for (const facet of facets) {
    assert(facet && typeof facet === 'object', id + ' facet needs an object');
    assert(typeof facet.id === 'string' && facet.id,
      id + ' facet needs an id');
    assert(!ids.has(facet.id), id + ' has duplicate facet ' + facet.id);
    ids.add(facet.id);
    assert(typeof facet.name === 'string' && facet.name,
      id + ' facet ' + facet.id + ' needs a name');
    assert(typeof facet.valueOf === 'function',
      id + ' facet ' + facet.id + ' needs valueOf');
    if (facet.multiple !== undefined) {
      assert(typeof facet.multiple === 'boolean',
        id + ' facet ' + facet.id + ' multiple must be boolean');
    }
    if (facet.values !== undefined) {
      assert(facet.values && typeof facet.values === 'object'
        && !Array.isArray(facet.values),
      id + ' facet ' + facet.id + ' needs a values map');
      validateValues(facet.values);
    }
    if (facet.labelOf !== undefined) {
      assert(typeof facet.labelOf === 'function',
        id + ' facet ' + facet.id + ' labelOf must be a function');
    }
    if (facet.closed !== undefined) {
      assert(typeof facet.closed === 'boolean',
        id + ' facet ' + facet.id + ' closed must be boolean');
    }
    if (facet.closed === true) {
      assert(facet.values && Object.keys(facet.values).length > 0,
        id + ' facet ' + facet.id + ' is closed and needs values');
    }
    if (facet.default !== undefined) {
      assert(typeof facet.default === 'boolean',
        id + ' facet ' + facet.id + ' default must be boolean');
      if (facet.default) defaults += 1;
    }
  }

  assert(defaults <= 1, id + ' has more than one default facet');
}

export function defineKeymap(definition) {
  for (const field of REQUIRED_FIELDS) {
    assert(definition[field] !== undefined, 'missing ' + field);
  }
  assert(typeof definition.resolve === 'function',
    'resolve must be a function');
  for (const field of ['actionLabel', 'groupLabel']) {
    if (definition[field] !== undefined) {
      assert(typeof definition[field] === 'function',
        field + ' must be a function');
    }
  }

  validateFile(definition.file, definition.id);

  const keymap = {
    ...definition,
    shortName: definition.shortName || definition.name,
    defaultSourceLabel: definition.defaultSourceLabel
      || definition.name + ' defaults',
    actionLabel: definition.actionLabel || defaultActionLabel,
    groupLabel: definition.groupLabel || defaultGroupLabel,
    file: normalizeFile(definition.file, definition.name),
    facets: definition.facets || [],
  };

  validateFacets(keymap.facets, keymap.id);

  return Object.freeze(keymap);
}

export function defineKeymapPlugin(definition) {
  assert(!BUILTIN_KEYMAP_IDS.includes(definition.id),
    definition.id + ' is a built-in keymap id');
  for (const field of Object.keys(definition)) {
    assert(PLUGIN_FIELDS.has(field), 'unknown field ' + field);
  }
  return defineKeymap(definition);
}
