// Element lookup for the viewer shell.
//
// Keeping the ids in one list turns a missing or renamed element into a clear
// startup error instead of a later null dereference.

import { byId } from './dom.js';

const ELEMENT_IDS = Object.freeze([
  'keyboard', 'list', 'legend', 'legendSwitch', 'facetGroup', 'colourGroup',
  'search', 'bindingSearch', 'searchReset', 'keymapIntro',
  'boardNone', 'keyFilter', 'fileInput', 'resultStatus', 'notice',
  'keymapSelect', 'instructions', 'importBtn', 'layerSwitch', 'dropText',
  'metaSelect', 'themeSelect', 'layoutSelect', 'colourSelect',
  'controlsToggle', 'controlsToggleLabel', 'keymapControlsBody',
  'clearFiltersBtn', 'clearBtn', 'resetAppBtn',
]);

export function collectElements(documentRef) {
  const elements = {};
  for (const id of ELEMENT_IDS) {
    const element = byId(id, documentRef);
    if (!element) throw new Error('Missing element #' + id);
    elements[id] = element;
  }
  return elements;
}
