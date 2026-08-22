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

export function whatsappLink(number, message = "") {
  const envNumber = process.env.REACT_APP_SUPPORT_WHATSAPP || process.env.REACT_APP_SUPPORT_PHONE;
  const targetNumber = envNumber || number || "919876543210";
  const clean = String(targetNumber).replace(/\D/g, "");
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${clean}${text}`;
}
