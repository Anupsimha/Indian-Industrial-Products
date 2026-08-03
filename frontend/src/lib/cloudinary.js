import api from "./api";

// Configurable max limits on client side (defaults 20MB image, 100MB video)
export const MAX_IMAGE_SIZE_MB = 20;
export const MAX_VIDEO_SIZE_MB = 100;

export async function uploadToCloudinary(file, folder = "iip/uploads") {
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

  const res = await api.post("/upload", form);
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

export function uploadMedia(file, folder = "iip/uploads") {
  return uploadToCloudinary(file, folder);
}

// Pass-through helper for image/video URLs
export function optimizedUrl(url) {
  return url;
}
