import { optimizedUrl } from "../cloudinary";

describe("optimizedUrl", () => {
  test("injects auto format, quality, and width into Cloudinary upload URLs", () => {
    const rawUrl = "https://res.cloudinary.com/demo/image/upload/sample.jpg";
    const optimized = optimizedUrl(rawUrl, { w: 800 });
    expect(optimized).toContain("/upload/f_auto,q_auto,w_800,c_limit/");
    expect(optimized).toContain("sample.jpg");
  });

  test("does not double-transform Cloudinary URLs if already transformed", () => {
    const alreadyOptimized = "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_800/sample.jpg";
    const result = optimizedUrl(alreadyOptimized, { w: 800 });
    expect(result).toBe(alreadyOptimized);
  });

  test("injects width and auto format into Unsplash image URLs", () => {
    const rawUnsplash = "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158";
    const optimized = optimizedUrl(rawUnsplash, { w: 600 });
    expect(optimized).toContain("w=600");
    expect(optimized).toContain("auto=format");
  });

  test("passes through non-CDN URLs without breaking", () => {
    const localUrl = "/api/uploads/my-product.jpg";
    expect(optimizedUrl(localUrl)).toBe(localUrl);
  });
});
