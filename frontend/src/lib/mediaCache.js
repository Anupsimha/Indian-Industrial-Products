// In-memory media cache to avoid re-fetching and loader flickering during reverse scrolling
const loadedImageUrls = new Set();

/**
 * Check if an image URL has already finished loading in this session.
 * @param {string} url
 * @returns {boolean}
 */
export function isImageCached(url) {
  if (!url || typeof url !== "string") return false;
  return loadedImageUrls.has(url);
}

/**
 * Mark an image URL as loaded and cached in-memory.
 * @param {string} url
 */
export function markImageCached(url) {
  if (!url || typeof url !== "string") return;
  loadedImageUrls.add(url);
}

/**
 * Pre-cache an image URL in the background using an Image object.
 * @param {string} url
 */
export function preloadImage(url) {
  if (!url || typeof url !== "string" || loadedImageUrls.has(url)) return;
  const img = new Image();
  img.src = url;
  img.onload = () => {
    loadedImageUrls.add(url);
  };
  img.onerror = () => {
    // Avoid blocking on errors
    loadedImageUrls.add(url);
  };
}

/**
 * Clear the cache (used in testing or memory reset).
 */
export function clearMediaCache() {
  loadedImageUrls.clear();
}
