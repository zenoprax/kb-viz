// Applies a theme choice to the document.

export function loadThemeStylesheets(documentRef, themes) {
  const head = documentRef.head;
  const links = [...documentRef.querySelectorAll('link[data-theme-css]')];
  const loaded = new Set(links.map(link => link.getAttribute('href')));
  const loadedIds = new Set(links.map(link => link.dataset.themeCss));

  for (const theme of themes) {
    if (!theme.cssUrl) continue;
    const href = String(theme.cssUrl);
    if (loaded.has(href) || loadedIds.has(theme.id)) continue;
    const link = documentRef.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.themeCss = theme.id;
    head.appendChild(link);
    loaded.add(href);
  }
}

export function applyThemeChoice(documentRef, registry, themeId, prefersDark) {
  const resolved = registry.resolve(themeId, prefersDark);
  documentRef.documentElement.dataset.theme = resolved;
}

export function watchSystemTheme(media, handler) {
  if (!media || !media.addEventListener) return () => {};
  const listener = event => handler(event.matches);
  media.addEventListener('change', listener);
  return () => media.removeEventListener('change', listener);
}
