// Meta key presentation.
//
// The logical token is always META. This table only changes how the two
// physical Meta keycaps are labelled, so bindings stay portable across
// platforms.

export const META_KEY_STYLES = Object.freeze([
  { id: 'generic', name: 'Generic', legend: 'Meta' },
  { id: 'apple', name: 'Apple', legend: 'Cmd' },
  { id: 'windows', name: 'Windows', legend: 'Win' },
].map(style => Object.freeze(style)));

export function resolveMetaStyle(id) {
  return META_KEY_STYLES.find(style => style.id === id)
    || META_KEY_STYLES[0];
}

export function isMetaKeyId(keyId) {
  return keyId === 'MetaLeft' || keyId === 'MetaRight';
}
