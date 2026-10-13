/**
 * Baraka School Hub - Centralized API Layer
 * Connects directly to https://schubapi.thebarakafoundation.or.tz
 * Strict conformance to OpenAPI v0.1.0 specification
 */

import {
  SuccessResponse,
  TokenResponse,
  LoginRequest,
  AuthMeResponse,
  OAuthUrlResponse,
  VerificationEmailRequest,
  VerificationEmailResponse,
  VerifyEmailRequest,
  VerificationPhoneRequest,
  VerificationPhoneResponse,
  VerifyPhoneRequest,
  ResendOtpRequest,
  RegisterRequest,
  RegisterResponse,
  StudentRegisterRequest,
  StudentRegisterResponse,
  TeacherRegisterRequest,
  SchoolRegisterRequest,
  SchoolListResponse,
  SchoolResponse,
  UpdateSchoolRequest,
  VerifySchoolRequest,
  ClassListResponse,
  CreateClassRequest,
  UpdateClassRequest,
  AssignClassTeacherRequest,
  EnrollStudentRequest,
  BulkEnrollRequest,
  BulkEnrollResponse,
  EnrollmentListResponse,
  StudentListResponse,
  StudentDetailsResponse,
  TeacherDetailsResponse,
  StudentClassResponse,
  DiscussionThreadResponse,
  DiscussionReplyResponse,
  DiscussionTextRequest,
  AskBarakaRequest,
  AskBarakaResponse,
  ArrangeMaterialRequest,
  ArrangeMaterialResponse,
  HealthResponse,
  RootResponse,
  ImportResult,
  UserResponse,
} from "../types/api";

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "https://schubapi.thebarakafoundation.or.tz"
).replace(/\/+$/, "");

export const TOKEN_STORAGE_KEY = "access_token";
export const USER_STORAGE_KEY = "user";
export const STUDENT_PROFILE_STORAGE_KEY = "student_profile";
export const SCHOOL_STORAGE_KEY = "school";

export interface ApiErrorPayload {
  message: string;
  code?: number;
  status?: number;
  fieldErrors?: Record<string, string>;
  raw?: any;
}

export class ApiError extends Error {
  code?: number;
  status: number;
  fieldErrors?: Record<string, string>;
  raw?: any;

  constructor(message: string, status: number, code?: number, fieldErrors?: Record<string, string>, raw?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
    this.raw = raw;
  }
}

// Token access helpers
export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch {}
}

export function clearStoredAuth(): void {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(STUDENT_PROFILE_STORAGE_KEY);
    localStorage.removeItem(SCHOOL_STORAGE_KEY);
  } catch {}
}

export function getStoredUser(): UserResponse | null {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: UserResponse): void {
  try {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } catch {}
}

// Global 401 callback listener
type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;
export function onUnauthorized(handler: UnauthorizedHandler): void {
  unauthorizedHandler = handler;
}

interface RequestOptions extends RequestInit {
  params?: Record<string, any>;
  skipAuth?: boolean;
}

/**
 * Universal safe fetch wrapper for Baraka School Hub API
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, skipAuth, headers: customHeaders, ...fetchOpts } = options;

  // Build query string, omitting null/undefined/empty string params
  let url = endpoint;
  if (url.includes("schubapi.thebarakafoundation.or.tz")) {
    url = url.replace(/^https?:\/\/[^\/]+/, "");
  }
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    const cleanEp = url.startsWith("/") ? url : `/${url}`;
    // In browser environments, route requests via same-origin relative URL if API_BASE_URL points to schubapi
    // to prevent browser 'Failed to fetch' errors caused by the remote server's untrusted SSL certificate chain and CORS restrictions.
    if (typeof window !== "undefined" && (!API_BASE_URL || API_BASE_URL.includes("schubapi.thebarakafoundation.or.tz"))) {
      url = cleanEp;
    } else {
      url = API_BASE_URL ? `${API_BASE_URL}${cleanEp}` : cleanEp;
    }
  }

  if (params && typeof params === "object") {
    const searchParams = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null && val !== "" && val !== "null") {
        searchParams.append(key, String(val));
      }
    }
    const qs = searchParams.toString();
    if (qs) {
      url += (url.includes("?") ? "&" : "?") + qs;
    }
  }

  // Build headers
  const headers = new Headers(customHeaders || {});
  headers.set("Accept", "application/json");

  // Only set Content-Type to application/json if not FormData
  const isFormData = typeof FormData !== "undefined" && fetchOpts.body instanceof FormData;
  if (!isFormData && !headers.has("Content-Type") && fetchOpts.body) {
    headers.set("Content-Type", "application/json");
  }

  // Automatic Authorization header
  if (!skipAuth) {
    const token = getStoredToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const startTime = Date.now();
  let response: Response;

  try {
    response = await fetch(url, {
      ...fetchOpts,
      headers,
    });
  } catch (netErr: any) {
    if (import.meta.env.DEV) {
      console.error(`[API Network / CORS Failure] ${fetchOpts.method || "GET"} ${url}:`, netErr);
    }
    // If browser was blocked by CORS (e.g. "Disallowed CORS origin") or untrusted SSL certificate on remote domain,
    // fallback to same-origin backend proxy to ensure operations succeed.
    if (typeof window !== "undefined" && url.startsWith("http")) {
      try {
        const parsed = new URL(url);
        const proxyPath = parsed.pathname + parsed.search;
        console.warn(`[CORS / SSL Auto-Proxy] Retrying ${fetchOpts.method || "GET"} ${url} via same-origin backend proxy: ${proxyPath}`);
        response = await fetch(proxyPath, {
          ...fetchOpts,
          headers,
        });
      } catch (proxyErr: any) {
        throw new ApiError("Cannot reach server, check your connection", 0, undefined, undefined, proxyErr);
      }
    } else {
      throw new ApiError("Cannot reach server, check your connection", 0, undefined, undefined, netErr);
    }
  }

  const duration = Date.now() - startTime;
  if (import.meta.env.DEV) {
    console.log(`[API ${fetchOpts.method || "GET"}] ${url} -> ${response.status} (${duration}ms)`);
  }

  // Handle blob responses (e.g. file export / templates)
  if (
    response.ok &&
    (headers.get("Accept")?.includes("blob") ||
      response.headers.get("Content-Type")?.includes("spreadsheet") ||
      response.headers.get("Content-Type")?.includes("octet-stream") ||
      response.headers.get("Content-Type")?.includes("csv"))
  ) {
    return (await response.blob()) as unknown as T;
  }

  // Parse JSON response safely
  let json: any = null;
  const rawText = await response.text();
  if (rawText) {
    try {
      json = JSON.parse(rawText);
    } catch {
      json = { message: rawText };
    }
  } else {
    json = {};
  }

  // Handle 401 Unauthorized
  if (response.status === 401) {
    clearStoredAuth();
    if (unauthorizedHandler) {
      unauthorizedHandler();
    }
    const msg = json?.message || "Invalid or expired access token. Please sign in again.";
    throw new ApiError(msg, 401, json?.code);
  }

  // Handle 403 Forbidden
  if (response.status === 403) {
    const msg = json?.message || "You do not have permission to perform this action";
    throw new ApiError(msg, 403, json?.code);
  }

  // Handle 422 Validation Error
  if (response.status === 422) {
    const fieldErrors: Record<string, string> = {};
    if (Array.isArray(json?.detail)) {
      json.detail.forEach((err: any) => {
        const fieldName = Array.isArray(err.loc) ? err.loc[err.loc.length - 1] : "general";
        fieldErrors[String(fieldName)] = err.msg || "Invalid value";
      });
    }
    const msg = json?.message || (Object.values(fieldErrors)[0] ?? "Validation error occurred");
    throw new ApiError(msg, 422, json?.code, fieldErrors, json);
  }

  // Handle 400, 500, 503 and other non-2xx status codes
  if (!response.ok) {
    let msg = json?.message;
    if (!msg) {
      if (response.status === 503) msg = "Service temporarily unavailable. Please try again shortly.";
      else if (response.status >= 500) msg = "Server error occurred. Please try again later.";
      else msg = `Request failed with status ${response.status}`;
    }
    throw new ApiError(msg, response.status, json?.code, undefined, json);
  }

  return json as T;
}

// ----------------- Typed Service Modules -----------------

/**
 * 1. System Service
 */
export const systemService = {
  getRoot: () => apiRequest<RootResponse>("/", { skipAuth: true }),
  getHealth: () => apiRequest<HealthResponse>("/api/v1/health", { skipAuth: true }),
};

/**
 * 2. Auth & Verification Service
 */
export const authService = {
  login: async (req: LoginRequest): Promise<TokenResponse> => {
    const res = await apiRequest<TokenResponse>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify(req),
      skipAuth: true,
    });
    if (res.access_token) {
      setStoredToken(res.access_token);
      if (res.user) setStoredUser(res.user);
    }
    return res;
  },

  getMe: () => apiRequest<AuthMeResponse>("/api/v1/auth/me"),

  getGoogleOAuthUrl: () => apiRequest<OAuthUrlResponse>("/api/v1/auth/url", { skipAuth: true }),

  sendVerificationEmail: (req: VerificationEmailRequest) =>
    apiRequest<VerificationEmailResponse>("/api/v1/auth/otp/send-verification-email", {
      method: "POST",
      body: JSON.stringify(req),
      skipAuth: true,
    }),

  verifyEmail: (req: VerifyEmailRequest) =>
    apiRequest<SuccessResponse>("/api/v1/auth/otp/verify-email", {
      method: "POST",
      body: JSON.stringify(req),
      skipAuth: true,
    }),

  sendOtpSms: (req: VerificationPhoneRequest) =>
    apiRequest<VerificationPhoneResponse>("/api/v1/auth/otp/send-otp", {
      method: "POST",
      body: JSON.stringify(req),
      skipAuth: true,
    }),

  verifyPhone: (req: VerifyPhoneRequest) =>
    apiRequest<SuccessResponse>("/api/v1/verify-phone", {
      method: "POST",
      body: JSON.stringify(req),
      skipAuth: true,
    }),

  resendOtpToPhone: (req: ResendOtpRequest) =>
    apiRequest<SuccessResponse>("/api/v1/resend-otp-to-phone", {
      method: "POST",
      body: JSON.stringify(req),
      skipAuth: true,
    }),

  registerSolo: (req: RegisterRequest) =>
    apiRequest<RegisterResponse>("/api/v1/register/solo", {
      method: "POST",
      body: JSON.stringify(req),
      skipAuth: true,
    }),

  registerPublic: (req: RegisterRequest) =>
    apiRequest<RegisterResponse>("/api/v1/register", {
      method: "POST",
      body: JSON.stringify(req),
      skipAuth: true,
    }),

  registerStudent: (req: StudentRegisterRequest) =>
    apiRequest<StudentRegisterResponse>("/api/v1/register/student", {
      method: "POST",
      body: JSON.stringify(req),
    }),

  registerTeacher: (req: TeacherRegisterRequest) =>
    apiRequest<SuccessResponse>("/api/v1/register/teacher", {
      method: "POST",
      body: JSON.stringify(req),
    }),

  registerSchool: (req: SchoolRegisterRequest) =>
    apiRequest<SuccessResponse>("/api/v1/auth/register/school", {
      method: "POST",
      body: JSON.stringify(req),
      skipAuth: true,
    }),

  logout: () => {
    clearStoredAuth();
  },
};

/**
 * 3. User Service (Students & Teachers)
 */
export const userService = {
  getStudent: (studentId: string) =>
    apiRequest<StudentDetailsResponse>(`/api/v1/student/${encodeURIComponent(studentId)}`),

  listStudents: (page: number = 1, pageSize: number = 20) =>
    apiRequest<StudentListResponse>("/api/v1/students", {
      params: { page, page_size: pageSize },
    }),

  getStudentClasses: (studentId: string) =>
    apiRequest<StudentClassResponse[]>(`/api/v1/students/${encodeURIComponent(studentId)}/classes`),

  getTeacher: (teacherId: string) =>
    apiRequest<TeacherDetailsResponse>(`/api/v1/teacher/${encodeURIComponent(teacherId)}`),
};

/**
 * 4. School Service
 */
export const schoolService = {
  listSchools: (params?: {
    page?: number;
    page_size?: number;
    region?: string;
    verification_status?: string;
    q?: string;
  }) => apiRequest<SchoolListResponse>("/api/v1/schools", { params }),

  getSchool: (schoolId: string) =>
    apiRequest<SchoolResponse>(`/api/v1/schools/${encodeURIComponent(schoolId)}`),

  updateSchool: (schoolId: string, req: UpdateSchoolRequest) =>
    apiRequest<SchoolResponse>(`/api/v1/schools/${encodeURIComponent(schoolId)}`, {
      method: "PUT",
      body: JSON.stringify(req),
    }),

  deleteSchool: (schoolId: string) =>
    apiRequest<void>(`/api/v1/schools/${encodeURIComponent(schoolId)}`, {
      method: "DELETE",
    }),

  verifySchool: (schoolId: string, status: "pending" | "verified" | "rejected" = "verified") =>
    apiRequest<SuccessResponse>(`/api/v1/schools/${encodeURIComponent(schoolId)}/verify`, {
      method: "POST",
      body: JSON.stringify({ status }),
    }),
};

/**
 * 5. Class Service
 */
export const classService = {
  listClasses: () => apiRequest<ClassListResponse>("/api/v1/classes"),

  createClass: (req: CreateClassRequest) =>
    apiRequest<any>("/api/v1/classes", {
      method: "POST",
      body: JSON.stringify(req),
    }),

  updateClass: (classId: string, req: UpdateClassRequest) =>
    apiRequest<any>(`/api/v1/classes/${encodeURIComponent(classId)}`, {
      method: "PUT",
      body: JSON.stringify(req),
    }),

  deleteClass: (classId: string) =>
    apiRequest<void>(`/api/v1/classes/${encodeURIComponent(classId)}`, {
      method: "DELETE",
    }),

  assignTeacher: (classId: string, teacherId: string) =>
    apiRequest<any>(`/api/v1/classes/${encodeURIComponent(classId)}/teacher`, {
      method: "PUT",
      body: JSON.stringify({ teacher_id: teacherId }),
    }),
};

/**
 * 6. Enrollment Service
 */
export const enrollmentService = {
  enrollStudent: (classId: string, req: EnrollStudentRequest) =>
    apiRequest<any>(`/api/v1/classes/${encodeURIComponent(classId)}/enroll`, {
      method: "POST",
      body: JSON.stringify(req),
    }),

  bulkEnroll: (classId: string, req: BulkEnrollRequest) =>
    apiRequest<BulkEnrollResponse>(`/api/v1/classes/${encodeURIComponent(classId)}/enroll/bulk`, {
      method: "POST",
      body: JSON.stringify(req),
    }),

  unenrollStudent: (classId: string, studentId: string) =>
    apiRequest<void>(
      `/api/v1/classes/${encodeURIComponent(classId)}/enroll/${encodeURIComponent(studentId)}`,
      { method: "DELETE" }
    ),

  getClassStudents: (classId: string, page: number = 1, pageSize: number = 50) =>
    apiRequest<EnrollmentListResponse>(`/api/v1/classes/${encodeURIComponent(classId)}/students`, {
      params: { page, page_size: pageSize },
    }),
};

/**
 * 7. Student Import / Export Service
 */
export const importExportService = {
  downloadTemplate: async (format: "csv" | "xlsx" = "csv"): Promise<Blob> => {
    return apiRequest<Blob>("/api/v1/students/import/template", {
      params: { format },
      headers: { Accept: format === "xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "text/csv" },
    });
  },

  importStudents: async (
    file: File,
    options: { sendOtp?: boolean; defaultPassword?: string } = {}
  ): Promise<ImportResult> => {
    const formData = new FormData();
    formData.append("file", file);

    const params: Record<string, any> = {
      send_otp: options.sendOtp ?? false,
      default_password: options.defaultPassword ?? "ChangeMe123!",
    };

    return apiRequest<ImportResult>("/api/v1/students/import", {
      method: "POST",
      params,
      body: formData,
    });
  },

  exportStudents: async (params?: { format?: "csv" | "xlsx"; class_id?: string; form_id?: string }): Promise<Blob> => {
    return apiRequest<Blob>("/api/v1/students/export", {
      params,
      headers: { Accept: params?.format === "xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "text/csv" },
    });
  },
};

/**
 * 8. Discussion Service
 */
export const discussionService = {
  createThread: (req: DiscussionTextRequest) =>
    apiRequest<DiscussionThreadResponse>("/api/v1/discussions", {
      method: "POST",
      body: JSON.stringify(req),
    }),

  replyThread: (threadId: string, req: DiscussionTextRequest) =>
    apiRequest<DiscussionReplyResponse>(`/api/v1/discussions/${encodeURIComponent(threadId)}/replies`, {
      method: "POST",
      body: JSON.stringify(req),
    }),
};

/**
 * 9. AI Service
 */
export const aiService = {
  askBaraka: (req: AskBarakaRequest) =>
    apiRequest<AskBarakaResponse>("/api/v1/ask-baraka", {
      method: "POST",
      body: JSON.stringify(req),
    }),

  arrangeMaterial: (req: ArrangeMaterialRequest) =>
    apiRequest<ArrangeMaterialResponse>("/api/v1/arrange-material", {
      method: "POST",
      body: JSON.stringify({
        title: req.title || "Untitled Material",
        subject: req.subject || "General",
        templateType: req.templateType || "notes",
        rawText: req.rawText,
      }),
    }),
};
