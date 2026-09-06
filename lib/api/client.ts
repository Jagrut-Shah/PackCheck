/**
 * PackCheck AI - Centralized HTTP API Client
 * Single reusable abstraction for invoking local Next.js Route Handlers (/api/...).
 * Parses standard ApiResponse<T>, handles non-2xx statuses, and provides typed errors.
 */

import { ApiResponse, ApiErrorPayload } from "@/lib/types/common";
import { supabase } from "@/lib/supabase";

export class ApiClientError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(message: string, code: string = "API_ERROR", status: number = 500, details?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  body?: unknown;
  cache?: RequestCache;
}

/**
 * Reusable typed request helper
 */
export async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", headers = {}, body, cache = "no-store" } = options;

  const mergedHeaders: Record<string, string> = { ...headers };

  // Automatically propagate authenticated Supabase session Bearer token
  if (!mergedHeaders["Authorization"] && !mergedHeaders["authorization"]) {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) {
        mergedHeaders["Authorization"] = `Bearer ${token}`;
      }
    } catch {
      // Browser environment or storage not ready
    }
  }

  const config: RequestInit = {
    method,
    cache,
    headers: mergedHeaders,
  };

  if (body) {
    if (typeof FormData !== "undefined" && body instanceof FormData) {
      // Let browser set the boundary header automatically for FormData
      config.body = body;
    } else {
      config.headers = {
        "Content-Type": "application/json",
        ...config.headers,
      };
      config.body = JSON.stringify(body);
    }
  }

  let response: Response;
  try {
    response = await fetch(endpoint, config);
  } catch (netErr) {
    throw new ApiClientError(
      netErr instanceof Error ? netErr.message : "Network error. Please verify backend connection.",
      "NETWORK_ERROR",
      0
    );
  }

  let json: ApiResponse<T> | null = null;
  let rawBodyText = "";
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      json = (await response.json()) as ApiResponse<T>;
    } catch {
      json = null;
    }
  } else {
    try {
      rawBodyText = await response.text();
      try {
        json = JSON.parse(rawBodyText) as ApiResponse<T>;
      } catch {
        json = null;
      }
    } catch {
      json = null;
    }
  }

  // Gracefully handle non-JSON server responses (e.g. 504 Gateway Timeout HTML/plain-text from Vercel or upstream proxies)
  if (!json) {
    if (!rawBodyText) {
      try {
        rawBodyText = await response.text();
      } catch {
        rawBodyText = "";
      }
    }

    let userFriendlyMessage: string;
    let errorCode: string;

    if (response.status === 504) {
      errorCode = "GATEWAY_TIMEOUT";
      userFriendlyMessage =
        "Gateway Timeout (HTTP 504): The OCR or verification processing timed out on the server. The upstream OCR service took longer than the execution limit.";
    } else if (response.status === 502) {
      errorCode = "BAD_GATEWAY";
      userFriendlyMessage =
        "Bad Gateway (HTTP 502): The upstream OCR microservice is unreachable or returned an invalid response.";
    } else if (response.status === 503) {
      errorCode = "SERVICE_UNAVAILABLE";
      userFriendlyMessage =
        "Service Unavailable (HTTP 503): The verification service is temporarily overloaded or unavailable.";
    } else {
      errorCode = "NON_JSON_RESPONSE";
      const cleanSnippet = rawBodyText
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 160);
      userFriendlyMessage = cleanSnippet
        ? `Server returned non-JSON error (HTTP ${response.status}): ${cleanSnippet}`
        : `Server returned non-JSON response (HTTP ${response.status}).`;
    }

    throw new ApiClientError(
      userFriendlyMessage,
      errorCode,
      response.status,
      { rawBodyPreview: rawBodyText.slice(0, 300) }
    );
  }

  if (!response.ok || !json.success) {
    const errorPayload: ApiErrorPayload | undefined = json.error;
    const message =
      errorPayload?.message ||
      json.message ||
      `Request failed with status ${response.status}`;
    const code = errorPayload?.code || "REQUEST_FAILED";
    const details = errorPayload?.details;

    throw new ApiClientError(message, code, response.status, details);
  }

  return json.data as T;
}

export const apiClient = {
  get: <T>(endpoint: string, headers?: Record<string, string>) =>
    apiRequest<T>(endpoint, { method: "GET", headers }),
  post: <T>(endpoint: string, body?: unknown, headers?: Record<string, string>) =>
    apiRequest<T>(endpoint, { method: "POST", body, headers }),
  put: <T>(endpoint: string, body?: unknown, headers?: Record<string, string>) =>
    apiRequest<T>(endpoint, { method: "PUT", body, headers }),
  patch: <T>(endpoint: string, body?: unknown, headers?: Record<string, string>) =>
    apiRequest<T>(endpoint, { method: "PATCH", body, headers }),
  delete: <T>(endpoint: string, headers?: Record<string, string>) =>
    apiRequest<T>(endpoint, { method: "DELETE", headers }),
};
