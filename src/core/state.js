// Application state shape.
//
// Keeping the initial shape in one place makes the fields easy to scan.

export function createAppState(options) {
  return {
    keymap: null,
    entries: [],
    defaultText: null,
    layers: { defaults: true, custom: false },
    customSource: null,
    hasSavedCustom: false,
    notice: '',
    facetModel: null,
    facetValues: new Map(),
    filters: {},
    legendFacet: null,
    colourFacet: null,
    traced: null,
    keyFilter: null,
    actionQuery: '',
    bindingQuery: '',
    geometry: null,
    layout: options.layout,
    metaStyleId: options.metaStyleId || 'generic',
    controlsExpanded: options.controlsExpanded !== false,
    loadError: '',
    requestId: 0,
  };
}
