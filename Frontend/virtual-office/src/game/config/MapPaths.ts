/**
 * Map source configuration - maps are loaded from public/assets/maps directory.
 */

/** Relative path to the map source directory (from project root) */
export const MAP_SOURCE_DIR = 'public/assets/maps';

/** Base URL for maps when served */
export const MAP_BASE_URL = 'assets/maps';

/** Default map filename to load */
export const DEFAULT_MAP_FILE = 'map.json';

/**
 * Returns the full URL path for a map file in my-map directory.
 * Use this as the single source for loading maps in the game.
 */
export function getMapUrl(mapFile: string = DEFAULT_MAP_FILE): string {
  // Ensure we don't have double slashes and handle empty/null
  const file = mapFile || DEFAULT_MAP_FILE;
  return `${MAP_BASE_URL}/${file}`.replace(/\/+/g, '/');
}

