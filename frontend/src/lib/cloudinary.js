import api from "./api";

// Configurable max limits on client side (defaults 20MB image, 100MB video)
export const MAX_IMAGE_SIZE_MB = 20;
export const MAX_VIDEO_SIZE_MB = 100;

export async function uploadToCloudinary(file, folder = "iip/uploads", onProgress) {
  const isVideo = file.type ? file.type.startsWith("video/") : false;
  const maxMb = isVideo ? MAX_VIDEO_SIZE_MB : MAX_IMAGE_SIZE_MB;
  const maxBytes = maxMb * 1024 * 1024;

  if (file.size && file.size > maxBytes) {
    throw new Error(
      `${isVideo ? "Video" : "Image"} file size exceeds maximum allowed limit of ${maxMb} MB.`
    );
  }

  const resourceType = isVideo ? "video" : "image";
  const form = new FormData();
  form.append("file", file);
  form.append("folder", folder);
  form.append("resource_type", resourceType);

  const res = await api.post("/upload", form, {
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress?.(percent);
      }
    },
  });
  const data = res.data;

  return {
    url: data.secure_url || data.url,
    public_id: data.public_id,
    resource_type: data.resource_type || resourceType,
    width: data.width || 800,
    height: data.height || 600,
    duration: data.duration || 0,
    format: data.format || "",
    thumbnail_url: data.thumbnail_url || data.secure_url || data.url,
  };
}

export function uploadMedia(file, folder = "iip/uploads", onProgress) {
  return uploadToCloudinary(file, folder, onProgress);
}

// Smart CDN optimization helper for image and video assets
export function optimizedUrl(url, options = {}) {
  if (!url || typeof url !== "string") return url || "";
  const { w = 800, q = "auto", f = "auto" } = options;

  // 1. Cloudinary URLs: apply auto-format, auto-quality, and max width limit
  if (url.includes("res.cloudinary.com") && url.includes("/upload/")) {
    if (url.includes("/f_auto") || url.includes("/w_")) {
      return url;
    }
    const transformStr = `f_${f},q_${q},w_${w},c_limit`;
    return url.replace("/upload/", `/upload/${transformStr}/`);
  }

  // 2. Unsplash URLs: apply auto-format, quality, and width params
  if (url.includes("images.unsplash.com")) {
    try {
      const parsed = new URL(url);
      parsed.searchParams.set("w", String(w));
      parsed.searchParams.set("auto", "format");
      parsed.searchParams.set("q", "80");
      parsed.searchParams.set("fit", "crop");
      return parsed.toString();
    } catch {
      return url;
    }
  }

  return url;
}
