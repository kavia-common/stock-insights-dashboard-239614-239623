import { getApiBaseUrl } from "../config/env";
import { MOCK_DASHBOARD, MOCK_NEWS, MOCK_WATCHLIST, mockDetails } from "./mockData";

const DEFAULT_TIMEOUT_MS = 6500;

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} ${res.statusText} ${text}`.trim());
    }
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Picks a base URL from env. If none, treats app as offline and uses mocks.
 */
function resolveBase() {
  const base = getApiBaseUrl();
  return base ? base.replace(/\/+$/, "") : "";
}

/**
 * Tries remote; on failure returns fallback.
 */
async function tryRemote(path, fallback) {
  const base = resolveBase();
  if (!base) return fallback;

  const url = `${base}${path.startsWith("/") ? "" : "/"}${path}`;
  try {
    return await fetchJson(url);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[apiClient] Using fallback data. Remote call failed:", err?.message || err);
    return fallback;
  }
}

// PUBLIC_INTERFACE
export async function getDashboard() {
  /** Fetch dashboard data; uses mock fallback if backend is unavailable. */
  return await tryRemote("/api/dashboard", MOCK_DASHBOARD);
}

// PUBLIC_INTERFACE
export async function getWatchlist() {
  /** Fetch watchlist; uses mock fallback if backend is unavailable. */
  return await tryRemote("/api/watchlist", MOCK_WATCHLIST);
}

// PUBLIC_INTERFACE
export async function getNews() {
  /** Fetch latest news; uses mock fallback if backend is unavailable. */
  return await tryRemote("/api/news", MOCK_NEWS);
}

// PUBLIC_INTERFACE
export async function getStockDetails(symbol) {
  /** Fetch stock details for a symbol; uses mock fallback if backend is unavailable. */
  const safe = encodeURIComponent(symbol || "");
  return await tryRemote(`/api/stocks/${safe}`, mockDetails(symbol));
}
