import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authService, ApiError } from "../lib/api";
import BrandLogo from "../components/BrandLogo";
import { ServerStatusBanner } from "../components/ServerStatusBanner";
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";

export const LoginPage: React.FC = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Google OAuth URL state
  const [googleUrl, setGoogleUrl] = useState<string | null>(null);
  const [googleUnavailable, setGoogleUnavailable] = useState(false);
  const [contactAdminMsg, setContactAdminMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as any)?.from?.pathname || "/dashboard";
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  useEffect(() => {
    // Check Google OAuth endpoint availability
    authService
      .getGoogleOAuthUrl()
      .then((res) => {
        if (res && res.url) {
          setGoogleUrl(res.url);
          setGoogleUnavailable(false);
        }
      })
      .catch((err) => {
        if (err?.status === 503) {
          setGoogleUnavailable(true);
        }
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorMessage("Please enter both your registered email and password.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await login({ email: trimmedEmail, password });
      const role = (res.user?.role || "").toLowerCase();
      // Role-based routing
      if (role === "admin" || role === "school_admin") {
        navigate("/dashboard");
      } else if (role === "teacher") {
        navigate("/dashboard");
      } else {
        navigate("/dashboard");
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setErrorMessage("Invalid email or password.");
        } else if (err.status === 503) {
          setErrorMessage("Server database is temporarily unavailable. Please try again shortly.");
        } else {
          setErrorMessage(err.message || "Sign in failed. Check your credentials.");
        }
      } else {
        setErrorMessage("Cannot reach server, check your connection");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF6EE] flex flex-col justify-center items-center p-4 sm:p-6 text-slate-800">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] border border-[#15223F]/10 shadow-xl p-6 sm:p-10 space-y-6 text-left animate-fade-in">
        {/* Brand & Title */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            <BrandLogo size="md" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#15223F] tracking-tight">
            Sign In to School Hub
          </h2>
          <p className="text-xs text-gray-500">
            Official educational management platform for Tanzanian institutions &amp; students
          </p>
          <div className="flex justify-center pt-1">
            <ServerStatusBanner />
          </div>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2.5 animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="font-semibold leading-relaxed">{errorMessage}</p>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@school.tz"
                required
                className="w-full bg-[#FAF6EE] border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 focus:border-[#D69B67] focus:outline-none transition-all font-medium"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                Password
              </label>
              <Link
                to="/verify-otp"
                className="text-[11px] text-[#D69B67] hover:underline font-bold"
              >
                Verify OTP?
              </Link>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-[#FAF6EE] border border-gray-200 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-800 focus:border-[#D69B67] focus:outline-none transition-all font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-[#15223F] hover:bg-[#0E1729] text-[#D69B67] text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            <span>Sign In to School Hub</span>
          </button>
        </form>

        {/* Google Sign-in */}
        <div className="pt-2 border-t border-gray-100 space-y-3">
          {googleUrl && !googleUnavailable ? (
            <a
              href={googleUrl}
              className="w-full py-2.5 px-4 bg-white border border-gray-200 hover:border-gray-400 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.4 7.34 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.6 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Continue with Google</span>
            </a>
          ) : (
            <div className="text-center">
              <button
                disabled
                className="w-full py-2.5 px-4 bg-gray-50 border border-gray-200 text-gray-400 text-xs font-semibold rounded-xl cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span>Google sign-in is not available yet</span>
              </button>
            </div>
          )}

          {/* Registration navigation */}
          <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 pt-2 gap-2">
            <span>Don't have an account?</span>
            <div className="flex items-center gap-3">
              <Link to="/register/solo" className="text-[#D69B67] hover:underline font-bold">
                Solo Learner
              </Link>
              <span className="text-gray-300">|</span>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setContactAdminMsg("contact admin");
                  try {
                    alert("contact admin");
                  } catch {}
                }}
                className="text-[#15223F] font-bold filter blur-[1.2px] hover:blur-[0.5px] opacity-75 hover:opacity-90 transition-all cursor-pointer select-none"
                title="contact admin"
              >
                Register School
              </button>
            </div>
          </div>

          {contactAdminMsg && (
            <div className="mt-2 p-2 bg-amber-50 border border-amber-300 text-amber-900 rounded-xl text-xs font-semibold flex items-center justify-between animate-fade-in shadow-xs">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>contact admin</span>
              </span>
              <button
                type="button"
                onClick={() => setContactAdminMsg(null)}
                className="text-amber-600 hover:text-amber-900 text-xs font-bold px-1"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
