// Central API Client for Baraka School Hub
// Base URL defined strictly per requirement: https://schubapi.thebarakafoundation.or.tz/api/v1

export const BASE_URL = "https://schubapi.thebarakafoundation.or.tz/api/v1";

const TOKEN_KEY = "tbf_auth_token";
const USER_KEY = "tbf_auth_user";
const STUDENT_PROFILE_KEY = "tbf_student_profile";
const SCHOOL_KEY = "tbf_school";

export interface ApiError {
  status: number;
  code?: number;
  message: string;
  isDatabaseUnavailable?: boolean;
  raw?: any;
}

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string, user?: any, studentProfile?: any, school?: any) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    if (studentProfile) localStorage.setItem(STUDENT_PROFILE_KEY, JSON.stringify(studentProfile));
    if (school) localStorage.setItem(SCHOOL_KEY, JSON.stringify(school));
  } catch {}
}

export function clearStoredToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(STUDENT_PROFILE_KEY);
    localStorage.removeItem(SCHOOL_KEY);
  } catch {}
}

export const clearStoredAuth = clearStoredToken;

export function getStoredUser(): any | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getStoredStudentProfile(): any | null {
  try {
    const raw = localStorage.getItem(STUDENT_PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getStoredSchool(): any | null {
  try {
    const raw = localStorage.getItem(SCHOOL_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Normalizes an API endpoint path by stripping any leading duplicate /api/v1 or /api segments
 */
export function normalizeApiEndpoint(endpoint: string): string {
  let ep = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  if (ep.startsWith("/api/v1/")) {
    ep = ep.substring("/api/v1".length);
  } else if (ep.startsWith("/api/")) {
    ep = ep.substring("/api".length);
  } else if (ep === "/api/v1" || ep === "/api") {
    ep = "";
  }
  return ep;
}

/**
 * Universal API fetch client.
 * Calls backend using BASE_URL (with same-origin proxy fallback for browser CORS protection).
 * Formats headers: Accept: *\/* and Content-Type: application/json.
 * Attaches Authorization: Bearer {token} for authenticated calls.
 */
export async function apiClient<T = any>(
  endpoint: string,
  options: RequestInit = {},
  requiresAuth: boolean = false
): Promise<T> {
  const token = getStoredToken();
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  const headers: Record<string, string> = {
    "Accept": "*/*",
    ...((options.headers as Record<string, string>) || {})
  };

  if (!isFormData && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  } else if (isFormData && headers["Content-Type"]) {
    delete headers["Content-Type"];
  }

  if (requiresAuth && token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const subPath = normalizeApiEndpoint(endpoint);
  // Primary URL is the central targeted BASE_URL; proxy URL is the same-origin proxy
  const isAbsolute = endpoint.startsWith("http://") || endpoint.startsWith("https://");
  const primaryUrl = isAbsolute ? endpoint : `${BASE_URL}${subPath}`;
  const proxyUrl = isAbsolute ? endpoint : `/api/v1${subPath}`;

  let response: Response | null = null;
  let responseData: any = null;

  try {
    // In web browsers where origin restrictions apply without open CORS headers,
    // the same-origin proxy transparently proxies to BASE_URL without losing headers.
    const isBrowser = typeof window !== "undefined";
    const targetUrl = isBrowser ? proxyUrl : primaryUrl;

    try {
      response = await fetch(targetUrl, {
        ...options,
        headers
      });
    } catch (fetchErr: any) {
      // If primary/proxy failed network, try the alternate URL
      const fallbackUrl = targetUrl === proxyUrl ? primaryUrl : proxyUrl;
      response = await fetch(fallbackUrl, {
        ...options,
        headers
      });
    }

    let text = await response.text();
    // If direct remote returned Cloudflare challenge interstitial, fallback to full-stack proxy engine
    if (text && (text.includes("<!DOCTYPE") || text.includes("<html") || text.includes("cf-chl")) && targetUrl !== proxyUrl) {
      try {
        response = await fetch(proxyUrl, { ...options, headers });
        text = await response.text();
      } catch {}
    }

    try {
      responseData = text ? JSON.parse(text) : null;
    } catch {
      responseData = text;
    }
  } catch (netErr: any) {
    throw {
      status: 0,
      message: "Network connection error. Please check your internet.",
      raw: netErr
    } as ApiError;
  }

  if (!response) {
    throw {
      status: 500,
      message: "No response received from server."
    } as ApiError;
  }

  // Handle HTTP status codes according to specification
  if (response.status === 200 || response.status === 201) {
    return responseData as T;
  }

  // 401 Unauthorized
  if (response.status === 401) {
    clearStoredToken();
    const errorMsg = responseData?.message || "Session expired or invalid. Please log in again.";
    throw {
      status: 401,
      code: responseData?.code,
      message: errorMsg,
      raw: responseData
    } as ApiError;
  }

  // 403 Forbidden
  if (response.status === 403) {
    const errorMsg = responseData?.message || "You do not have permission to perform this action.";
    throw {
      status: 403,
      code: responseData?.code,
      message: errorMsg,
      raw: responseData
    } as ApiError;
  }

  // 404 Not Found
  if (response.status === 404) {
    const errorMsg = responseData?.message || "Resource not found.";
    throw {
      status: 404,
      code: responseData?.code,
      message: errorMsg,
      raw: responseData
    } as ApiError;
  }

  // 422 Validation Error
  if (response.status === 422) {
    let errorMsg = responseData?.message || "Validation failed.";
    if (responseData?.detail && Array.isArray(responseData.detail)) {
      errorMsg = responseData.detail.map((d: any) => d.msg || `${d.loc?.join(".")}: invalid`).join(", ");
    }
    throw {
      status: 422,
      code: responseData?.code,
      message: errorMsg,
      raw: responseData
    } as ApiError;
  }

  // 503 Database / Service Unavailable
  if (response.status === 503) {
    const isDbUnavailable = responseData?.code === 2008 || (typeof responseData?.message === "string" && responseData.message.includes("Database is unavailable"));
    console.warn("[ApiClient] 503 Backend status:", responseData);
    throw {
      status: 503,
      code: responseData?.code || 2008,
      message: "The server is temporarily unavailable. Please try again later.",
      isDatabaseUnavailable: isDbUnavailable,
      raw: responseData
    } as ApiError;
  }

  // 400 Bad Request or any other status
  const generalMsg = responseData?.message || responseData?.detail || responseData?.error || `Server responded with status ${response.status}`;
  throw {
    status: response.status,
    code: responseData?.code,
    message: generalMsg,
    raw: responseData
  } as ApiError;
}

export const apiFetch = apiClient;
