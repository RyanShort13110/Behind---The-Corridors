/**
 * In-Between architectural theme registry.
 * Default theme is `maintenance` (the original Service-Wing look).
 */

import { MAINTENANCE_THEME } from './maintenance.js';
import { RESIDENTIAL_THEME } from './residential.js';

export const DEFAULT_INTERLUDE_THEME_ID = 'maintenance';

const REGISTRY = Object.freeze({
  maintenance: MAINTENANCE_THEME,
  residential: RESIDENTIAL_THEME,
});

export const INTERLUDE_THEME_IDS = Object.freeze(Object.keys(REGISTRY));

/**
 * @param {unknown} raw
 * @returns {string}
 */
export function normalizeInterludeThemeId(raw) {
  const id = String(raw || '').trim().toLowerCase();
  if (id && REGISTRY[id]) return id;
  return DEFAULT_INTERLUDE_THEME_ID;
}

/**
 * @param {unknown} raw
 * @returns {typeof MAINTENANCE_THEME}
 */
export function getInterludeTheme(raw = DEFAULT_INTERLUDE_THEME_ID) {
  return REGISTRY[normalizeInterludeThemeId(raw)] || MAINTENANCE_THEME;
}

export function listInterludeThemes() {
  return INTERLUDE_THEME_IDS.map((id) => ({
    id,
    label: REGISTRY[id].label,
  }));
}

export { MAINTENANCE_THEME, RESIDENTIAL_THEME };
