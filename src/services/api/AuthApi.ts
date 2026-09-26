// Auth API service
import { apiClient, setStoredToken, clearStoredToken } from "./ApiClient";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  success?: string | boolean;
  code?: number;
  message?: string;
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  user?: {
    id?: string;
    email?: string;
    fname?: string;
    lname?: string;
    role?: string;
    [key: string]: any;
  };
  student_profile?: {
    phone?: string;
    study_level?: string;
    curriculum?: string;
    photo_url?: string;
    [key: string]: any;
  };
  school?: {
    id?: string;
    name?: string;
    registration_number?: string;
    region?: string;
    school_type?: string;
    headmaster_name?: string;
    verification_status?: string;
    [key: string]: any;
  };
}

export interface MeResponse {
  success?: string | boolean;
  code?: number;
  message?: string;
  user?: {
    id?: string;
    email?: string;
    fname?: string;
    lname?: string;
    role?: string;
    [key: string]: any;
  };
}

export interface RegisterUserPayload {
  fname: string;
  lname: string;
  email: string;
  phone: string;
  password: string;
}

export interface RegisterStudentPayload {
  fname: string;
  lname: string;
  email: string;
  phone: string;
  password: string;
  study_level?: string;
  curriculum?: string;
  photo_url?: string;
}

export interface RegisterTeacherPayload {
  fname: string;
  lname: string;
  email: string;
  phone: string;
  password: string;
  school: string;
  photo_url?: string;
}

export interface RegisterSchoolPayload {
  fname: string;
  lname: string;
  email: string;
  phone: string;
  password: string;
  school_name: string;
  registration_number: string;
  region: string;
  school_type: string;
  headmaster_name?: string;
  verification_document_name?: string;
}

export const AuthApi = {
  /**
   * POST /auth/login
   * Authenticates user, saves token and user profile on success.
   */
  login: async (credentials: LoginPayload): Promise<LoginResponse> => {
    const res = await apiClient<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials)
    });

    if (res && (res.access_token || (res as any).token)) {
      const token = res.access_token || (res as any).token;
      setStoredToken(token, res.user, res.student_profile, res.school);
    }

    return res;
  },

  /**
   * GET /auth/me
   * Fetches the current authenticated user session.
   */
  getMe: async (): Promise<MeResponse> => {
    return apiClient<MeResponse>("/auth/me", {
      method: "GET"
    }, true);
  },

  /**
   * POST /register
   * General user registration.
   */
  registerUser: async (data: RegisterUserPayload) => {
    return apiClient<{ message?: string; user_id?: string; phone?: string }>("/register", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  /**
   * POST /register/student or /auth/register/student
   * Student registration.
   */
  registerStudent: async (data: RegisterStudentPayload) => {
    try {
      return await apiClient<{ message?: string; user_id?: string }>("/register/student", {
        method: "POST",
        body: JSON.stringify(data)
      });
    } catch (err: any) {
      if (err.status === 404) {
        return await apiClient<{ message?: string; user_id?: string }>("/auth/register/student", {
          method: "POST",
          body: JSON.stringify(data)
        });
      }
      throw err;
    }
  },

  /**
   * POST /register/teacher
   * Teacher registration.
   */
  registerTeacher: async (data: RegisterTeacherPayload) => {
    return apiClient<{ message?: string; user_id?: string; phone?: string }>("/register/teacher", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  /**
   * POST /auth/register/school
   * School institution registration.
   */
  registerSchool: async (data: RegisterSchoolPayload): Promise<LoginResponse> => {
    const res = await apiClient<LoginResponse>("/auth/register/school", {
      method: "POST",
      body: JSON.stringify(data)
    });

    if (res && (res.access_token || (res as any).token)) {
      const token = res.access_token || (res as any).token;
      setStoredToken(token, res.user, res.student_profile, res.school);
    }

    return res;
  },

  /**
   * Logout helper: clears stored tokens and authentication state.
   */
  logout: () => {
    clearStoredToken();
  }
};
