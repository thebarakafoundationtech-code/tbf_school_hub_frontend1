import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import {
  authService,
  getStoredToken,
  getStoredUser,
  setStoredUser,
  clearStoredAuth,
  onUnauthorized,
} from "../lib/api";
import {
  UserResponse,
  StudentProfileResponse,
  SchoolResponse,
  TokenResponse,
  LoginRequest,
} from "../types/api";

interface AuthContextType {
  token: string | null;
  user: UserResponse | null;
  studentProfile: StudentProfileResponse | null;
  school: SchoolResponse | null;
  role: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<TokenResponse>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  setAuthSession: (data: TokenResponse) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [user, setUser] = useState<UserResponse | null>(() => getStoredUser());
  const [studentProfile, setStudentProfile] = useState<StudentProfileResponse | null>(() => {
    try {
      const raw = localStorage.getItem("student_profile");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [school, setSchool] = useState<SchoolResponse | null>(() => {
    try {
      const raw = localStorage.getItem("school");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const logout = useCallback(() => {
    clearStoredAuth();
    setToken(null);
    setUser(null);
    setStudentProfile(null);
    setSchool(null);
  }, []);

  // Listen to 401 unauthorized globally
  useEffect(() => {
    onUnauthorized(() => {
      logout();
    });
  }, [logout]);

  // Restore & verify session on startup via GET /api/v1/auth/me
  useEffect(() => {
    let isMounted = true;
    const restoreSession = async () => {
      const savedToken = getStoredToken();
      if (!savedToken) {
        if (isMounted) setIsLoading(false);
        return;
      }

      try {
        const meRes = await authService.getMe();
        if (isMounted && meRes.user) {
          setUser(meRes.user);
          setStoredUser(meRes.user);
          setToken(savedToken);
        }
      } catch (err: any) {
        if (isMounted) {
          // If 401, clear stored auth
          if (err?.status === 401) {
            logout();
          }
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    restoreSession();
    return () => {
      isMounted = false;
    };
  }, [logout]);

  const setAuthSession = useCallback((data: TokenResponse) => {
    setToken(data.access_token);
    setUser(data.user);
    setStoredUser(data.user);
    if (data.student_profile) {
      setStudentProfile(data.student_profile);
      try {
        localStorage.setItem("student_profile", JSON.stringify(data.student_profile));
      } catch {}
    }
    if (data.school) {
      setSchool(data.school);
      try {
        localStorage.setItem("school", JSON.stringify(data.school));
      } catch {}
    }
  }, []);

  const login = async (credentials: LoginRequest): Promise<TokenResponse> => {
    const res = await authService.login(credentials);
    setAuthSession(res);
    return res;
  };

  const refreshUser = async () => {
    try {
      const res = await authService.getMe();
      if (res.user) {
        setUser(res.user);
        setStoredUser(res.user);
      }
    } catch {}
  };

  const role = user?.role ? user.role.toLowerCase() : null;
  const isAuthenticated = Boolean(token && user);

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        studentProfile,
        school,
        role,
        isAuthenticated,
        isLoading,
        login,
        logout,
        refreshUser,
        setAuthSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
