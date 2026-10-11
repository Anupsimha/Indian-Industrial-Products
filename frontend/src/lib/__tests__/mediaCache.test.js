import { isImageCached, markImageCached, preloadImage, clearMediaCache } from "../mediaCache";

describe("mediaCache", () => {
  beforeEach(() => {
    clearMediaCache();
  });

  test("returns false for uncached url", () => {
    expect(isImageCached("https://example.com/test.jpg")).toBe(false);
  });

  test("returns true after marking image as cached", () => {
    const url = "https://example.com/cached.jpg";
    markImageCached(url);
    expect(isImageCached(url)).toBe(true);
  });

  test("handles empty or null urls gracefully", () => {
    expect(isImageCached(null)).toBe(false);
    expect(isImageCached("")).toBe(false);
    expect(isImageCached(undefined)).toBe(false);
  });

  test("clears cache successfully", () => {
    const url = "https://example.com/sample.jpg";
    markImageCached(url);
    expect(isImageCached(url)).toBe(true);
    clearMediaCache();
    expect(isImageCached(url)).toBe(false);
  });
});
