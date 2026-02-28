import axios from "axios";
import { LOCAL_STORAGE_KEYS } from "../app/common/constants";

// Base URL for all API calls. If it is missing, we still allow
// requests to go through (they will fall back to relative URLs),
// but we log a warning to help diagnose env misconfigurations.
const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

if (!baseURL && typeof window !== "undefined") {
  // Log once in the browser console, but do not hard‑fail all requests.
  // This preserves previous behavior while still surfacing misconfig.
  // eslint-disable-next-line no-console
  console.error(
    "[API WARNING] NEXT_PUBLIC_API_BASE_URL is undefined. " +
      "API calls will use relative URLs. Configure this env var in production."
  );
}

export const axiosInstance = axios.create({
  baseURL: baseURL || undefined,
  timeout: 30000, // 30 second timeout
});

// Request interceptor to add auth token and basic guards
axiosInstance.interceptors.request.use(
  (config) => {
    // Guard: Prevent API calls if URL becomes undefined
    if (!config.url) {
      const error = new Error("[API ERROR] Cannot make API call: URL is undefined");
      // eslint-disable-next-line no-console
      console.error(error.message, config);
      return Promise.reject(error);
    }

    // Add authorization token if available
    if (typeof window !== "undefined") {
      const token = localStorage.getItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN);
      if (token && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    // Ensure Content-Type is set
    if (!config.headers["Content-Type"]) {
      config.headers["Content-Type"] = "application/json";
    }

    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const { config, response, message, code } = error;

    // Handle network errors
    if (!response) {
      if (code === "ECONNABORTED") {
        // eslint-disable-next-line no-console
        console.error("[API ERROR] Request timeout:", config?.url);
        error.message = "Request timeout. Please check your connection and try again.";
      } else if (message === "Network Error") {
        // eslint-disable-next-line no-console
        console.error("[API ERROR] Network error:", config?.url);
        // eslint-disable-next-line no-console
        console.error("[API ERROR] Base URL:", baseURL || "(relative)");
        error.message =
          "Network error. Please check your internet connection and ensure the API server is running.";
      } else {
        // eslint-disable-next-line no-console
        console.error("[API ERROR] Request failed:", {
          url: config?.url,
          method: config?.method,
          message: error.message,
          code: error.code,
        });
      }
    }

    // Add a custom property to identify 401 errors
    if (response && response.status === 401) {
      error.isUnauthorized = true;
      if (typeof window !== "undefined") {
        localStorage.removeItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN);
      }
    }

    return Promise.reject(error);
  }
);
