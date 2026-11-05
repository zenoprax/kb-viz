// Core-owned keyboard layouts.

import ANSI_US_LAYOUT from './builtin/ansi-us.js';
import { defineLayout } from './layout-contract.js';

export const BUILTIN_LAYOUTS = Object.freeze([
  defineLayout(ANSI_US_LAYOUT),
]);
