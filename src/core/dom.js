// Small DOM helpers shared by the renderers.

export function esc(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[character]));
}

export function byId(id, root = document) {
  return root.getElementById(id);
}

export function on(element, eventName, handler) {
  element.addEventListener(eventName, handler);
  return () => element.removeEventListener(eventName, handler);
}
