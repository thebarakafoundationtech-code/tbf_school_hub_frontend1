// TBF School Hub API Service
// Connects seamlessly to the full-stack TBF School Hub backend proxy & remote endpoints

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

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string, user?: any) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {}
}

export function clearStoredToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {}
}

export function getStoredUser(): any | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Ensure an active token is available.
 * If not authenticated yet, automatically creates an instant learner session
 * so AI and interactive features work without friction.
 */
export async function ensureAuthToken(): Promise<string> {
  const existingToken = getStoredToken();
  if (existingToken) return existingToken;

  try {
    const guestEmail = `learner_${Date.now()}_${Math.floor(Math.random() * 1000)}@barakahub.edu.tz`;
    const res = await apiFetch("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fname: "Mwanafunzi",
        lname: "Baraka",
        email: guestEmail,
        password: "BarakaPass_2026!"
      })
    });

    if (res && (res.access_token || res.token)) {
      const token = res.access_token || res.token;
      setStoredToken(token, res.user);
      return token;
    }
  } catch (err) {
    const fallbackToken = "tbf_guest_" + Math.random().toString(36).substring(2);
    setStoredToken(fallbackToken, { role: "student", fname: "Mwanafunzi", lname: "Baraka" });
    return fallbackToken;
  }

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
 * Typed TBF School Hub API client methods
 * Matching specification at https://schubapi.thebarakafoundation.or.tz/api/docs
 */
export const tbfApi = {
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
      body: JSON.stringify(credentials)
    });
    if (res && res.access_token) {
      setStoredToken(res.access_token, res.user);
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
    if (res && res.access_token) {
      setStoredToken(res.access_token, res.user);
    }
    return res;
  },

  registerSoloLearner: async (learnerData: {
    fname: string;
    lname: string;
    email: string;
    password?: string;
    phone?: string;
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
        study_level: learnerData.study_level || "Form 1",
        curriculum: learnerData.curriculum || "Tanzania National (NECTA)",
        photo_url: learnerData.photo_url || ""
      })
    });
    if (res && res.access_token) {
      setStoredToken(res.access_token, res.user);
    }
    return res;
  },

  registerSchool: async (schoolData: {
    fname: string;
    lname: string;
    email: string;
    password: string;
    school_name: string;
    registration_number: string;
    region: string;
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

  sendVerificationEmail: async (data: { email: string; code: string; name: string }) => {
    return apiFetch("/send-verification-email", {
      method: "POST",
      body: JSON.stringify(data)
    });
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

  // --- STUDENTS MANAGEMENT ENDPOINTS ---
  fetchStudents: async (params?: { class_name?: string; search?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.class_name) query.set("class_name", params.class_name);
    if (params?.search) query.set("search", params.search);
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    const qs = query.toString() ? `?${query.toString()}` : "";
    return apiFetch(`/students${qs}`, { method: "GET" }, true);
  },

  getStudentById: async (id: string) => {
    return apiFetch(`/students/${id}`, { method: "GET" }, true);
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

  fetchSchools: async () => {
    return apiFetch("/schools", { method: "GET" }, true);
  },

  // --- SYSTEM & DISCOVERY ENDPOINTS ---
  listEndpoints: async () => {
    return apiFetch("/endpoints", { method: "GET" });
  }
};
