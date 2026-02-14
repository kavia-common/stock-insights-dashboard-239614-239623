/**
 * Environment helpers for CRA (reads from process.env.REACT_APP_*).
 */

const readEnv = (key, fallback = "") => {
  const v = process.env[key];
  if (typeof v === "string" && v.trim().length > 0) return v.trim();
  return fallback;
};

// PUBLIC_INTERFACE
export function getApiBaseUrl() {
  /** Returns API base URL from REACT_APP_API_BASE or REACT_APP_BACKEND_URL. */
  return readEnv("REACT_APP_API_BASE", readEnv("REACT_APP_BACKEND_URL", ""));
}

// PUBLIC_INTERFACE
export function getWsUrl() {
  /** Returns WebSocket URL from REACT_APP_WS_URL (optional). */
  return readEnv("REACT_APP_WS_URL", "");
}

// PUBLIC_INTERFACE
export function getFeatureFlags() {
  /** Returns parsed feature flags JSON from REACT_APP_FEATURE_FLAGS (optional). */
  const raw = readEnv("REACT_APP_FEATURE_FLAGS", "");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}
