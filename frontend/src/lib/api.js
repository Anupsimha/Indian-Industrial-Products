import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
export const API = BACKEND_URL ? `${BACKEND_URL}/api` : "/api";

const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

// Attach token from localStorage as fallback (Authorization header)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("iip_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers["ngrok-skip-browser-warning"] = "true";
  return config;
});

export default api;

export function formatApiError(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export function whatsappLink(_number, message = "") {
  const supportObj = (typeof window !== "undefined" && window.__IIP_SUPPORT_CONTACT) || {};
  const targetNumber = supportObj.support_whatsapp || supportObj.support_phone || "9380036328";
  const clean = String(targetNumber).replace(/\D/g, "");
  if (!clean) return "#";
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${clean}${text}`;
}

export function supportPhoneLink() {
  const supportObj = (typeof window !== "undefined" && window.__IIP_SUPPORT_CONTACT) || {};
  const targetNumber = supportObj.support_phone || "+91 9380036328";
  const clean = String(targetNumber).replace(/[^\d+]/g, "");
  return `tel:${clean}`;
}

export function supportEmailLink(subject = "") {
  const supportObj = (typeof window !== "undefined" && window.__IIP_SUPPORT_CONTACT) || {};
  const email = supportObj.support_email || "support@indianindustrialplatform.com";
  return `mailto:${email}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`;
}

