// TBF School Hub API Service
// Connects seamlessly to the full-stack TBF School Hub backend proxy & remote endpoints

import { StudentApi, ClassApi, AuthApi, TeacherApi, SchoolApi, DiscussionApi, AiApi, VerificationApi } from "./api/index";
import { generateStudentRegNo, getSchoolNumber } from "../utils/registrationNumber";
export * from "./api/index";

const metaEnv = (typeof import.meta !== "undefined" && (import.meta as any).env) || {};

// Production backend API URL (documented at https://schubapi.thebarakafoundation.or.tz/api/docs)
export const REMOTE_API_BASE_URL = "https://schubapi.thebarakafoundation.or.tz/api/v1";

// Resolve API base URL: defaults to same-origin /api/v1 proxy which handles CORS, SSL, and local fallbacks
export function getApiBaseUrl(): string {
  const customUrl = metaEnv.VITE_API_BASE_URL;
  if (customUrl && typeof customUrl === "string" && customUrl.trim()) {
    return customUrl.trim().replace(/\/+$/, "");
  }
  return "/api/v1";
}

// Token management in LocalStorage
const TOKEN_KEY = "tbf_auth_token";
const USER_KEY = "tbf_auth_user";
const STUDENT_PROFILE_KEY = "tbf_student_profile";
const SCHOOL_KEY = "tbf_school";

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
 * Ensure an active token is available.
 * Does not create fictitious dummy student accounts in the database.
 */
export async function ensureAuthToken(): Promise<string> {
  const existingToken = getStoredToken();
  if (existingToken) return existingToken;
  return "";
}

/**
 * Generic fetch wrapper for TBF School Hub backend endpoints.
 * Handles headers, bearer tokens, JSON parsing, and helpful error messaging.
 */
export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {},
  requireAuth = false
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  let targetUrl: string;
  if (cleanEndpoint.startsWith("http://") || cleanEndpoint.startsWith("https://")) {
    targetUrl = cleanEndpoint;
  } else if (cleanEndpoint.startsWith("/api/v1")) {
    targetUrl = cleanEndpoint;
  } else if (cleanEndpoint.startsWith("/api/")) {
    targetUrl = cleanEndpoint;
  } else {
    targetUrl = `${baseUrl}${cleanEndpoint}`;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {})
  };

  // Attach Bearer token if present or required
  let token = getStoredToken();
  if (!token && requireAuth) {
    token = await ensureAuthToken();
  }
  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(targetUrl, {
      ...options,
      headers
    });

    if (!res.ok) {
      const errorText = await res.text();
      let errMessage = `API request failed with status ${res.status}`;
      try {
        const parsed = JSON.parse(errorText);
        if (parsed.error || parsed.message) {
          errMessage = parsed.error || parsed.message;
        } else if (parsed.detail) {
          if (Array.isArray(parsed.detail)) {
            errMessage = parsed.detail.map((d: any) => d.msg || JSON.stringify(d)).join(", ");
          } else {
            errMessage = String(parsed.detail);
          }
        }
      } catch {}
      throw new Error(errMessage);
    }

    return await res.json();
  } catch (err: any) {
    console.warn(`[TBF API] ${endpoint} request status:`, err?.message || err);
    throw err;
  }
}

/**
 * Normalizes student record from either remote backend API or local database into Student object
 */
export function normalizeStudent(s: any): any {
  if (!s || typeof s !== "object") return s;
  const firstName = s.first_name || s.fname || "";
  const lastName = s.last_name || s.lname || "";
  const fullName = s.name || `${firstName} ${lastName}`.trim() || (s.email ? s.email.split("@")[0] : "Student");
  const isSolo = !s.school || String(s.school).includes("Solo") || s.account_type === "solo_learner";
  const schoolIdentifier = isSolo ? null : (s.schoolRegNo || s.school || "MIH");
  const studentId = String(s.student_id || s.id || s.regNo || s.reg_no || generateStudentRegNo(schoolIdentifier, Math.floor(1 + Math.random() * 999), new Date().getFullYear(), isSolo));

  let className = "Form 1";
  let curriculum = "Tanzania National (NECTA)";
  if (s.class) {
    if (typeof s.class === "object") {
      className = s.class.study_level || s.class.name || "Form 1";
      curriculum = s.class.curriculum || "Tanzania National (NECTA)";
    } else if (typeof s.class === "string") {
      className = s.class;
    }
  } else if (s.study_level) {
    className = s.study_level;
  }

  return {
    ...s,
    name: fullName,
    fname: firstName || fullName.split(" ")[0],
    lname: lastName || fullName.split(" ").slice(1).join(" "),
    first_name: firstName || fullName.split(" ")[0],
    last_name: lastName || fullName.split(" ").slice(1).join(" "),
    regNo: studentId,
    reg_no: studentId,
    student_id: studentId,
    class: className,
    curriculum: curriculum,
    age: Number(s.age) || 15,
    gender: s.gender || "M",
    progress: typeof s.progress === "number" ? s.progress : 0,
    lastActive: s.lastActive || s.last_active || "Today",
    parentContact: s.parentContact || s.parent_contact || s.phone || "",
    phone: s.phone || s.parentContact || "",
    email: s.email || "",
    status: s.status || "Active"
  };
}

/**
 * Typed TBF School Hub API client methods
 * Matching specification at https://schubapi.thebarakafoundation.or.tz/api/docs
 */
export const tbfApi = {
  // Modular API namespaces
  students: StudentApi,
  classes: ClassApi,
  teachers: TeacherApi,
  schools: SchoolApi,
  auth: AuthApi,
  verification: VerificationApi,

  // System Health
  checkHealth: async () => {
    return apiFetch("/health", { method: "GET" });
  },

  // AI Endpoints
  askBaraka: async (message: string, history?: { text: string; sender: string }[]) => {
    const token = await ensureAuthToken();
    return apiFetch(
      "/ask-baraka",
      {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: JSON.stringify({ message, history: history || [] })
      },
      true
    );
  },

  arrangeMaterial: async (data: {
    title: string;
    subject: string;
    templateType: string;
    rawText: string;
  }) => {
    const token = await ensureAuthToken();
    return apiFetch(
      "/arrange-material",
      {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: JSON.stringify(data)
      },
      true
    );
  },

  // Authentication Endpoints
  login: async (credentials: { email: string; password: string }) => {
    const res = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: credentials.email.trim(),
        password: credentials.password
      })
    });
    if (res && res.access_token) {
      setStoredToken(res.access_token, res.user, res.student_profile, res.school);
    }
    return res;
  },

  register: async (userData: {
    fname: string;
    lname: string;
    email: string;
    password: string;
  }) => {
    const res = await apiFetch("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData)
    });
    if (res && res.access_token) {
      setStoredToken(res.access_token, res.user);
    }
    return res;
  },

  registerStudent: async (studentData: {
    fname: string;
    lname: string;
    email: string;
    password: string;
    phone?: string;
    study_level: string;
    curriculum: string;
    photo_url?: string;
  }) => {
    const res = await apiFetch("/auth/register/student", {
      method: "POST",
      body: JSON.stringify({
        fname: studentData.fname,
        lname: studentData.lname,
        email: studentData.email,
        password: studentData.password,
        phone: studentData.phone || "",
        study_level: studentData.study_level,
        curriculum: studentData.curriculum,
        photo_url: studentData.photo_url || ""
      })
    });
    const studentProf = res?.student_profile || {
      phone: studentData.phone || "",
      study_level: studentData.study_level,
      curriculum: studentData.curriculum,
      photo_url: studentData.photo_url || ""
    };
    if (studentData.phone && studentProf && !studentProf.phone) {
      studentProf.phone = studentData.phone;
    }
    if (res && res.access_token) {
      setStoredToken(res.access_token, res.user, studentProf, res.school);
    }
    return res;
  },

  registerSoloLearner: async (learnerData: {
    fname: string;
    lname: string;
    email: string;
    password?: string;
    phone?: string;
    school?: string;
    schoolName?: string;
    study_level?: string;
    curriculum?: string;
    photo_url?: string;
  }) => {
    const pass = learnerData.password || "BarakaPass_2026!";
    const res = await apiFetch("/auth/register/student", {
      method: "POST",
      body: JSON.stringify({
        fname: learnerData.fname,
        lname: learnerData.lname || "Learner",
        email: learnerData.email,
        password: pass,
        phone: learnerData.phone || "",
        school: learnerData.school || learnerData.schoolName || "",
        schoolName: learnerData.school || learnerData.schoolName || "",
        study_level: learnerData.study_level || "Form 1",
        curriculum: learnerData.curriculum || "Tanzania National (NECTA)",
        photo_url: learnerData.photo_url || ""
      })
    });
    const studentProf = res?.student_profile || {
      phone: learnerData.phone || "",
      study_level: learnerData.study_level || "Form 1",
      curriculum: learnerData.curriculum || "Tanzania National (NECTA)",
      school: learnerData.school || learnerData.schoolName || "",
      schoolName: learnerData.school || learnerData.schoolName || "",
      photo_url: learnerData.photo_url || ""
    };
    if (learnerData.phone && studentProf && !studentProf.phone) {
      studentProf.phone = learnerData.phone;
    }
    if (res && res.access_token) {
      setStoredToken(res.access_token, res.user, studentProf, res.school);
    }
    return res;
  },

  updateProfilePhoto: async (photoUrl: string, email?: string) => {
    const activeToken = getStoredToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (activeToken) headers["Authorization"] = `Bearer ${activeToken}`;
    
    // Also update localStorage caches
    try {
      const storedProfile = getStoredStudentProfile();
      if (storedProfile) {
        localStorage.setItem(STUDENT_PROFILE_KEY, JSON.stringify({ ...storedProfile, photo_url: photoUrl }));
      }
      const storedUser = getStoredUser();
      if (storedUser) {
        localStorage.setItem(USER_KEY, JSON.stringify({ ...storedUser, photo_url: photoUrl }));
      }
    } catch {}

    return apiFetch("/user/photo", {
      method: "POST",
      headers,
      body: JSON.stringify({ photo_url: photoUrl, email })
    });
  },

  updateStudentProfile: async (data: {
    fname?: string;
    lname?: string;
    firstName?: string;
    lastName?: string;
    email: string;
    phone?: string;
    study_level?: string;
    studyLevel?: string;
    curriculum?: string;
    school?: string;
    schoolName?: string;
    photo_url?: string;
    photoUrl?: string;
  }) => {
    const activeToken = getStoredToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (activeToken) headers["Authorization"] = `Bearer ${activeToken}`;

    const normalizedData = {
      fname: data.fname || data.firstName,
      lname: data.lname || data.lastName,
      email: data.email,
      phone: data.phone,
      study_level: data.study_level || data.studyLevel,
      curriculum: data.curriculum,
      school: data.school || data.schoolName,
      schoolName: data.school || data.schoolName,
      photo_url: data.photo_url || data.photoUrl,
    };

    // Also update localStorage caches
    try {
      const storedProfile = getStoredStudentProfile();
      if (storedProfile) {
        localStorage.setItem(STUDENT_PROFILE_KEY, JSON.stringify({
          ...storedProfile,
          phone: normalizedData.phone ?? storedProfile.phone,
          study_level: normalizedData.study_level ?? storedProfile.study_level,
          curriculum: normalizedData.curriculum ?? storedProfile.curriculum,
          school: normalizedData.school ?? (storedProfile as any).school,
          schoolName: normalizedData.schoolName ?? (storedProfile as any).schoolName,
          photo_url: normalizedData.photo_url ?? storedProfile.photo_url,
        }));
      }
      const storedUser = getStoredUser();
      if (storedUser) {
        localStorage.setItem(USER_KEY, JSON.stringify({
          ...storedUser,
          fname: normalizedData.fname ?? storedUser.fname,
          lname: normalizedData.lname ?? storedUser.lname,
          school: normalizedData.school ?? (storedUser as any).school,
          schoolName: normalizedData.schoolName ?? (storedUser as any).schoolName,
          photo_url: normalizedData.photo_url ?? storedUser.photo_url,
        }));
      }
      if (normalizedData.school) {
        localStorage.setItem("tbf_school", JSON.stringify({ name: normalizedData.school }));
      }
    } catch {}

    return apiFetch("/student/profile", {
      method: "POST",
      headers,
      body: JSON.stringify(normalizedData)
    });
  },

  getStudentProfile: async (email?: string) => {
    const activeToken = getStoredToken();
    const headers: Record<string, string> = {};
    if (activeToken) headers["Authorization"] = `Bearer ${activeToken}`;
    const query = email ? `?email=${encodeURIComponent(email)}` : "";
    return apiFetch(`/student/profile${query}`, {
      method: "GET",
      headers
    });
  },

  registerSchool: async (schoolData: {
    fname: string;
    lname: string;
    email: string;
    password: string;
    school_name: string;
    registration_number: string;
    region: string;
    region_code?: string;
    district?: string;
    district_code?: string;
    phone?: string;
    school_type: string;
    headmaster_name: string;
    verification_document_name?: string | null;
  }) => {
    const res = await apiFetch("/auth/register/school", {
      method: "POST",
      body: JSON.stringify(schoolData)
    });
    if (res && res.access_token) {
      setStoredToken(res.access_token, res.user);
    }
    return res;
  },

  // General user registration (/api/v1/register)
  registerUser: async (data: {
    fname: string;
    lname: string;
    email: string;
    phone: string;
    password: string;
  }) => {
    return apiFetch("/register", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  // Student registration (/api/v1/register/student)
  registerStudentAccount: async (data: {
    fname: string;
    lname: string;
    email: string;
    phone: string;
    password: string;
    study_level?: string;
    curriculum?: string;
    photo_url?: string;
  }) => {
    return apiFetch("/register/student", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  // Teacher registration (/api/v1/register/teacher)
  registerTeacherAccount: async (data: {
    fname: string;
    lname: string;
    email: string;
    phone: string;
    password: string;
    school: string;
    photo_url?: string;
  }) => {
    return apiFetch("/register/teacher", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  // Get Teacher Details (/api/v1/teacher/:id)
  getTeacherDetails: async (teacherId: string) => {
    return apiFetch(`/teacher/${teacherId}`, { method: "GET" }, true);
  },

  // Get Student Details (/api/v1/student/:id)
  getStudentDetails: async (studentId: string) => {
    return apiFetch(`/student/${studentId}`, { method: "GET" }, true);
  },

  // SMS OTP sending (/api/v1/auth/otp/send-otp)
  sendOtp: async (data: { phone: string; name: string; code?: string }) => {
    return apiFetch("/auth/otp/send-otp", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  // Email verification sending (/api/v1/auth/otp/send-verification-email)
  sendVerificationEmail: async (data: { email: string; code: string; name: string }) => {
    return apiFetch("/auth/otp/send-verification-email", {
      method: "POST",
      body: JSON.stringify(data)
    }).catch(() => {
      return apiFetch("/send-verification-email", {
        method: "POST",
        body: JSON.stringify(data)
      });
    });
  },

  // Verify Phone (/api/v1/verify-phone)
  verifyPhone: async (data: { phone: string; code: string }) => {
    return apiFetch("/verify-phone", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  // Resend OTP (/api/v1/resend-otp)
  resendOtp: async (data: { phone: string }) => {
    return apiFetch("/resend-otp", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  // Class discussions (/api/v1/discussions)
  fetchDiscussions: async () => {
    return apiFetch("/discussions", { method: "GET" }, true);
  },

  createDiscussion: async (content: string) => {
    return apiFetch("/discussions", {
      method: "POST",
      body: JSON.stringify({ content })
    }, true);
  },

  replyDiscussion: async (threadId: string, content: string) => {
    return apiFetch(`/discussions/${threadId}/replies`, {
      method: "POST",
      body: JSON.stringify({ content })
    }, true);
  },

  getMe: async (token?: string) => {
    const activeToken = token || getStoredToken();
    const headers: Record<string, string> = {};
    if (activeToken) headers["Authorization"] = `Bearer ${activeToken}`;
    return apiFetch("/auth/me", {
      method: "GET",
      headers
    });
  },

  // --- LEARNING MATERIALS ENDPOINTS ---
  fetchMaterials: async (params?: {
    resource_name?: string;
    form_num?: number;
    category?: string;
    page?: number;
    limit?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.resource_name) query.set("resource_name", params.resource_name);
    if (params?.form_num !== undefined) query.set("form_num", String(params.form_num));
    if (params?.category) query.set("category", params.category);
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    const qs = query.toString() ? `?${query.toString()}` : "";
    return apiFetch(`/materials${qs}`, { method: "GET" }, true);
  },

  getMaterialById: async (id: string) => {
    return apiFetch(`/materials/${id}`, { method: "GET" }, true);
  },

  createMaterial: async (data: any) => {
    return apiFetch(
      "/materials",
      {
        method: "POST",
        body: JSON.stringify(data)
      },
      true
    );
  },

  updateMaterial: async (id: string, data: any) => {
    return apiFetch(
      `/materials/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(data)
      },
      true
    );
  },

  deleteMaterial: async (id: string) => {
    return apiFetch(`/materials/${id}`, { method: "DELETE" }, true);
  },

  // --- QUIZZES & PRACTICE QUESTIONS ENDPOINTS ---
  fetchQuizzes: async (params?: { subject?: string; form_num?: number; material_id?: string }) => {
    const query = new URLSearchParams();
    if (params?.subject) query.set("subject", params.subject);
    if (params?.form_num !== undefined) query.set("form_num", String(params.form_num));
    if (params?.material_id) query.set("material_id", params.material_id);
    const qs = query.toString() ? `?${query.toString()}` : "";
    return apiFetch(`/quizzes${qs}`, { method: "GET" }, true);
  },

  generateQuiz: async (data: {
    subject: string;
    topic: string;
    form_num: number;
    num_questions?: number;
  }) => {
    return apiFetch(
      "/quizzes/generate",
      {
        method: "POST",
        body: JSON.stringify(data)
      },
      true
    );
  },

  submitQuizResult: async (data: {
    quiz_id?: string;
    student_id: string;
    score: number;
    total: number;
    answers?: any[];
  }) => {
    return apiFetch(
      "/quizzes/submit",
      {
        method: "POST",
        body: JSON.stringify(data)
      },
      true
    );
  },

  normalizeStudent,

  // --- STUDENTS MANAGEMENT ENDPOINTS ---
  listStudents: (page: number = 1, pageSize: number = 20) => StudentApi.listStudents(page, pageSize),
  fetchStudents: async (params?: { 
    class_name?: string; 
    search?: string; 
    page?: number; 
    page_size?: number; 
    limit?: number 
  }) => {
    const query = new URLSearchParams();
    query.set("page", String(params?.page || 1));
    query.set("page_size", String(params?.page_size || params?.limit || 20));
    if (params?.class_name) query.set("class_name", params.class_name);
    if (params?.search) query.set("search", params.search);
    const qs = `?${query.toString()}`;
    return apiFetch(`/students${qs}`, { method: "GET" }, true);
  },

  fetchTeacherStudents: async (params?: { class_name?: string; search?: string; page?: number; page_size?: number }) => {
    const query = new URLSearchParams();
    query.set("page", String(params?.page || 1));
    query.set("page_size", String(params?.page_size || 20));
    if (params?.class_name) query.set("class_name", params.class_name);
    if (params?.search) query.set("search", params.search);
    const qs = `?${query.toString()}`;
    return apiFetch(`/teachers/students${qs}`, { method: "GET" }, true);
  },

  getStudentById: async (id: string | number) => {
    try {
      return await apiFetch(`/student/${id}`, { method: "GET" }, true);
    } catch {
      return await apiFetch(`/students/${id}`, { method: "GET" }, true);
    }
  },

  importStudents: async (file: File | Blob, options: { send_otp?: boolean; default_password?: string } = {}) => {
    return StudentApi.importStudents(file, options);
  },

  getStudentImportTemplateUrl: (format: "xlsx" | "csv" = "xlsx") => {
    return StudentApi.getImportTemplateUrl(format);
  },

  getStudentExportUrl: (options: { format?: "csv" | "xlsx"; class_id?: string; form_id?: string } = {}) => {
    return StudentApi.getExportUrl(options);
  },

  createStudent: async (student: any) => {
    return apiFetch(
      "/students",
      {
        method: "POST",
        body: JSON.stringify(student)
      },
      true
    );
  },

  updateStudent: async (id: string, data: any) => {
    return apiFetch(
      `/students/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(data)
      },
      true
    );
  },

  deleteStudent: async (id: string) => {
    return apiFetch(`/students/${id}`, { method: "DELETE" }, true);
  },

  batchDeleteStudents: async (ids: string[]) => {
    return apiFetch("/students/batch-delete", {
      method: "POST",
      body: JSON.stringify({ ids })
    }, true);
  },

  // --- TEACHERS MANAGEMENT ENDPOINTS ---
  fetchTeachers: async (params?: { search?: string }) => {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    const qs = query.toString() ? `?${query.toString()}` : "";
    return apiFetch(`/teachers${qs}`, { method: "GET" }, true);
  },

  getTeacherById: async (id: string) => {
    return apiFetch(`/teachers/${id}`, { method: "GET" }, true);
  },

  createTeacher: async (teacher: any) => {
    return apiFetch(
      "/teachers",
      {
        method: "POST",
        body: JSON.stringify(teacher)
      },
      true
    );
  },

  updateTeacher: async (id: string, data: any) => {
    return apiFetch(
      `/teachers/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(data)
      },
      true
    );
  },

  deleteTeacher: async (id: string) => {
    return apiFetch(`/teachers/${id}`, { method: "DELETE" }, true);
  },

  // --- CLASSES MANAGEMENT ENDPOINTS ---
  getClasses: () => ClassApi.getClasses(),
  fetchClasses: async () => {
    return apiFetch("/classes", { method: "GET" }, true);
  },

  getClassById: async (id: string) => {
    return apiFetch(`/classes/${id}`, { method: "GET" }, true);
  },

  createClass: async (data: any) => {
    return apiFetch(
      "/classes",
      {
        method: "POST",
        body: JSON.stringify(data)
      },
      true
    );
  },

  updateClass: async (id: string, data: any) => {
    return apiFetch(
      `/classes/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(data)
      },
      true
    );
  },

  deleteClass: async (id: string) => {
    return apiFetch(`/classes/${id}`, { method: "DELETE" }, true);
  },

  getClassStudents: async (classId: string | number, page: number = 1, pageSize: number = 50) => {
    return ClassApi.getClassStudents(classId, page, pageSize);
  },

  enrollStudentToClass: async (classId: string | number, payload: { student_id?: string; user_id?: string; student_email?: string; student_phone?: string }) => {
    return ClassApi.enrollStudent(classId, payload);
  },

  bulkEnrollStudentsToClass: async (classId: string | number, payload: { student_ids?: string[]; user_ids?: string[]; student_emails?: string[] }) => {
    return ClassApi.bulkEnrollStudents(classId, payload);
  },

  unenrollStudentFromClass: async (classId: string | number, studentId: string | number) => {
    return ClassApi.unenrollStudent(classId, studentId);
  },

  assignTeacherToClass: async (classId: string | number, teacherId: string) => {
    return ClassApi.assignTeacher(classId, teacherId);
  },

  // --- TIMETABLE ENDPOINTS ---
  fetchTimetable: async (params?: { day?: string; class_name?: string; teacher_email?: string }) => {
    const query = new URLSearchParams();
    if (params?.day) query.set("day", params.day);
    if (params?.class_name) query.set("class_name", params.class_name);
    if (params?.teacher_email) query.set("teacher_email", params.teacher_email);
    const qs = query.toString() ? `?${query.toString()}` : "";
    return apiFetch(`/timetable${qs}`, { method: "GET" }, true);
  },

  getTimetableById: async (id: string) => {
    return apiFetch(`/timetable/${id}`, { method: "GET" }, true);
  },

  createTimetableSession: async (session: any) => {
    return apiFetch(
      "/timetable",
      {
        method: "POST",
        body: JSON.stringify(session)
      },
      true
    );
  },

  updateTimetableSession: async (id: string, data: any) => {
    return apiFetch(
      `/timetable/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(data)
      },
      true
    );
  },

  acceptTimetableSession: async (id: string) => {
    return apiFetch(`/timetable/${id}/accept`, { method: "PUT" }, true);
  },

  deleteTimetableSession: async (id: string) => {
    return apiFetch(`/timetable/${id}`, { method: "DELETE" }, true);
  },

  // --- LIVE CLASSROOM ENDPOINTS ---
  fetchLiveSession: async () => {
    return apiFetch("/live-session", { method: "GET" });
  },

  updateLiveSession: async (sessionData: any) => {
    return apiFetch(
      "/live-session",
      {
        method: "POST",
        body: JSON.stringify(sessionData)
      }
    );
  },

  // --- QUIZZES & ASSESSMENTS ENDPOINTS ---
  getQuizById: async (id: string) => {
    return apiFetch(`/quizzes/${id}`, { method: "GET" }, true);
  },

  createQuiz: async (data: any) => {
    return apiFetch(
      "/quizzes",
      {
        method: "POST",
        body: JSON.stringify(data)
      },
      true
    );
  },

  fetchQuizResults: async (params?: { student_id?: string; quiz_id?: string }) => {
    const query = new URLSearchParams();
    if (params?.student_id) query.set("student_id", params.student_id);
    if (params?.quiz_id) query.set("quiz_id", params.quiz_id);
    const qs = query.toString() ? `?${query.toString()}` : "";
    return apiFetch(`/quizzes/results${qs}`, { method: "GET" }, true);
  },

  // --- ASSIGNMENTS & HOMEWORK ENDPOINTS ---
  fetchAssignments: async (params?: { class_name?: string; subject?: string }) => {
    const query = new URLSearchParams();
    if (params?.class_name) query.set("class_name", params.class_name);
    if (params?.subject) query.set("subject", params.subject);
    const qs = query.toString() ? `?${query.toString()}` : "";
    return apiFetch(`/assignments${qs}`, { method: "GET" }, true);
  },

  getAssignmentById: async (id: string) => {
    return apiFetch(`/assignments/${id}`, { method: "GET" }, true);
  },

  createAssignment: async (data: any) => {
    return apiFetch(
      "/assignments",
      {
        method: "POST",
        body: JSON.stringify(data)
      },
      true
    );
  },

  submitAssignment: async (id: string, data: any) => {
    return apiFetch(
      `/assignments/${id}/submit`,
      {
        method: "POST",
        body: JSON.stringify(data)
      },
      true
    );
  },

  // --- ATTENDANCE ENDPOINTS ---
  fetchAttendance: async (params?: { date?: string; class_name?: string }) => {
    const query = new URLSearchParams();
    if (params?.date) query.set("date", params.date);
    if (params?.class_name) query.set("class_name", params.class_name);
    const qs = query.toString() ? `?${query.toString()}` : "";
    return apiFetch(`/attendance${qs}`, { method: "GET" }, true);
  },

  recordAttendance: async (data: any) => {
    return apiFetch(
      "/attendance",
      {
        method: "POST",
        body: JSON.stringify(data)
      },
      true
    );
  },

  // --- NOTIFICATIONS ENDPOINTS ---
  fetchNotifications: async (params?: { user_id?: string; role?: string }) => {
    const query = new URLSearchParams();
    if (params?.user_id) query.set("user_id", params.user_id);
    if (params?.role) query.set("role", params.role);
    const qs = query.toString() ? `?${query.toString()}` : "";
    return apiFetch(`/notifications${qs}`, { method: "GET" }, true);
  },

  createNotification: async (data: any) => {
    return apiFetch(
      "/notifications",
      {
        method: "POST",
        body: JSON.stringify(data)
      },
      true
    );
  },

  markNotificationRead: async (id: string) => {
    return apiFetch(`/notifications/${id}/read`, { method: "PUT" }, true);
  },

  // --- SCHOOL PROFILE & DIRECTORY ENDPOINTS ---
  getSchoolInfo: async () => {
    return apiFetch("/school", { method: "GET" }, true);
  },

  updateSchoolInfo: async (data: any) => {
    return apiFetch(
      "/school",
      {
        method: "PUT",
        body: JSON.stringify(data)
      },
      true
    );
  },

  fetchSchools: async (params?: { page?: number; page_size?: number; region?: string; verification_status?: string; q?: string }) => {
    return SchoolApi.listSchools(params || {});
  },

  getSchoolById: async (schoolId: string) => {
    return SchoolApi.getSchool(schoolId);
  },

  updateSchoolProfile: async (schoolId: string, data: any) => {
    return SchoolApi.updateSchool(schoolId, data);
  },

  deleteSchoolRecord: async (schoolId: string) => {
    return SchoolApi.deleteSchool(schoolId);
  },

  verifySchoolStatus: async (schoolId: string, status: "verified" | "rejected" | "pending") => {
    return SchoolApi.verifySchool(schoolId, status);
  },

  addSchool: async (schoolData: {
    name: string;
    region?: string;
    school_type?: string;
    registration_number?: string;
    email?: string;
  }) => {
    return apiFetch("/schools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(schoolData)
    }, false);
  },

  sendSmsVerificationCode: async (phone: string, name?: string) => {
    return apiFetch("/auth/send-sms-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, name })
    }, false);
  },

  verifySmsCode: async (phone: string, code: string) => {
    return apiFetch("/auth/verify-sms-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code })
    }, false);
  },

  // --- DIGITAL LIBRARY & FREE BOOKS (OPEN LIBRARY & SWAHILI / NECTA) ---
  fetchCuratedBooks: async (subject?: string, language?: string) => {
    const params = new URLSearchParams();
    if (subject) params.set("subject", subject);
    if (language) params.set("language", language);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return apiFetch(`/books/curated${qs}`, { method: "GET" }, true);
  },

  searchOpenBooks: async (query?: string, subject?: string, language?: string, limit?: number, page?: number) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (subject) params.set("subject", subject);
    if (language) params.set("language", language);
    if (limit) params.set("limit", String(limit));
    if (page) params.set("page", String(page));
    const qs = params.toString() ? `?${params.toString()}` : "";
    return apiFetch(`/books/search${qs}`, { method: "GET" }, true);
  },

  importBookToLibrary: async (bookData: {
    title: string;
    author?: string;
    subject?: string;
    coverUrl?: string;
    description?: string;
    readUrl?: string;
    language?: string;
    level?: string;
    classes?: string;
  }) => {
    return apiFetch("/books/import-to-library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bookData)
    }, false);
  },

  getBookDownloadUrl: (book: any) => {
    if (!book) return "#";
    if (book.downloadPdfUrl) return book.downloadPdfUrl;
    if (book.identifier) return `https://archive.org/download/${book.identifier}/${book.identifier}.pdf`;
    if (book.downloadUrl) return book.downloadUrl;
    return `/api/books/download?id=${encodeURIComponent(book.identifier || book.id || '')}&title=${encodeURIComponent(book.title || '')}`;
  },

  // --- CLASS JOIN REQUESTS ---
  fetchClassJoinRequests: async (filters?: { student_email?: string; school?: string; status?: string }) => {
    const params = new URLSearchParams();
    if (filters?.student_email) params.set("student_email", filters.student_email);
    if (filters?.school) params.set("school", filters.school);
    if (filters?.status) params.set("status", filters.status);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return apiFetch(`/classes/join-requests${qs}`, { method: "GET" }, false);
  },

  submitClassJoinRequest: async (data: {
    studentEmail: string;
    studentName: string;
    studentReg?: string;
    schoolName?: string;
    school?: string;
    currentClass?: string;
    requestedClass: string;
  }) => {
    return apiFetch("/classes/join-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    }, false);
  },

  updateClassJoinRequest: async (id: string, status: "Approved" | "Rejected", decidedBy?: string) => {
    return apiFetch(`/classes/join-requests/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, decidedBy })
    }, false);
  },

  // --- SYSTEM & DISCOVERY ENDPOINTS ---
  listEndpoints: async () => {
    return apiFetch("/endpoints", { method: "GET" });
  },

  // --- DISCUSSIONS ENDPOINTS ---
  discussions: DiscussionApi
};

export const api = tbfApi;
export default tbfApi;
