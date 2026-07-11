import api from "./api";

export async function uploadToCloudinary(file, folder = "iip/uploads") {
  const isVideo = file.type.startsWith("video/");
  const resourceType = isVideo ? "video" : "image";
  const { data: sig } = await api.get(
    `/cloudinary/signature?resource_type=${resourceType}&folder=${encodeURIComponent(folder)}`
  );

  const form = new FormData();
  form.append("file", file);
  form.append("api_key", sig.api_key);
  form.append("timestamp", sig.timestamp);
  form.append("signature", sig.signature);
  form.append("folder", sig.folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${sig.cloud_name}/${resourceType}/upload`,
    { method: "POST", body: form }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Cloudinary upload failed: ${err}`);
  }
  const data = await res.json();
  return {
    url: data.secure_url,
    public_id: data.public_id,
    resource_type: data.resource_type, // image | video
    width: data.width,
    height: data.height,
    duration: data.duration,
    format: data.format,
    thumbnail_url: isVideo
      ? data.secure_url.replace(/\.(mp4|webm|mov)$/i, ".jpg")
      : data.secure_url,
  };
}

// Build optimized delivery URL from a Cloudinary URL
export function optimizedUrl(url, { w, h, video } = {}) {
  if (!url || !url.includes("res.cloudinary.com")) return url;
  const transforms = ["q_auto", "f_auto"];
  if (w) transforms.push(`w_${w}`);
  if (h) transforms.push(`h_${h}`);
  const t = transforms.join(",");
  const segment = video ? "/video/upload/" : "/image/upload/";
  return url.replace(segment, `${segment}${t}/`);
}
