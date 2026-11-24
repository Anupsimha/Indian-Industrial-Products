import { useState, useEffect, useCallback } from "react";
import api from "../lib/api";
import { CATEGORIES } from "../lib/constants";

let cachedCategories = null;
let pendingFetch = null;
const listeners = new Set();

function normalizeCategories(rawList) {
  if (!Array.isArray(rawList)) return [];
  const seen = new Set();
  const result = [];
  for (const item of rawList) {
    const rawName = typeof item === "string" ? item : item?.name;
    const name = typeof rawName === "string" ? rawName.trim() : "";
    if (name && !seen.has(name)) {
      seen.add(name);
      result.push(name);
    }
  }
  return result;
}

const FALLBACK_CATEGORIES = normalizeCategories(CATEGORIES);

function notifyListeners(nextCategories) {
  listeners.forEach((listener) => listener(nextCategories));
}

async function fetchAndCacheCategories(force = false) {
  if (!force && cachedCategories) {
    return cachedCategories;
  }
  if (!force && pendingFetch) {
    return pendingFetch;
  }

  const request = (async () => {
    try {
      const res = await api.get("/categories");
      const raw = Array.isArray(res?.data) ? res.data : res?.data?.categories;
      const normalized = normalizeCategories(raw);
      cachedCategories = normalized.length > 0 ? normalized : FALLBACK_CATEGORIES;
    } catch {
      cachedCategories = FALLBACK_CATEGORIES;
    } finally {
      pendingFetch = null;
    }
    notifyListeners(cachedCategories);
    return cachedCategories;
  })();

  pendingFetch = request;
  return request;
}

/**
 * Fetches and caches admin-managed categories from GET /api/categories,
 * falling back to static CATEGORIES only when the API fails or returns empty.
 */
export function useCategories() {
  const [categories, setCategories] = useState(() => cachedCategories || []);
  const [loading, setLoading] = useState(() => !cachedCategories);

  useEffect(() => {
    let active = true;
    const handleUpdate = (next) => {
      if (active) {
        setCategories(next);
        setLoading(false);
      }
    };
    listeners.add(handleUpdate);

    if (cachedCategories) {
      setCategories(cachedCategories);
      setLoading(false);
    } else {
      setLoading(true);
      fetchAndCacheCategories(false).then((next) => {
        if (active) {
          setCategories(next);
          setLoading(false);
        }
      });
    }

    return () => {
      active = false;
      listeners.delete(handleUpdate);
    };
  }, []);

  const refreshCategories = useCallback(async () => {
    setLoading(true);
    try {
      const next = await fetchAndCacheCategories(true);
      setCategories(next);
      return next;
    } finally {
      setLoading(false);
    }
  }, []);

  const getOptions = useCallback(
    (currentValue) => {
      if (typeof currentValue !== "string") return categories;
      const trimmed = currentValue.trim();
      if (!trimmed) return categories;
      if (categories.includes(currentValue)) return categories;
      // Preserve legacy category value so editing does not wipe saved data
      return [...categories, currentValue];
    },
    [categories]
  );

  return { categories, loading, refreshCategories, getOptions };
}

export default useCategories;
