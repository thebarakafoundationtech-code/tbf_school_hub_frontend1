import React, { useState } from "react";
import { tbfApi } from "../services/api";
import { 
  GraduationCap, 
  School, 
  ArrowRight, 
  UserCheck, 
  Mail, 
  Lock, 
  Eye,
  EyeOff,
  Loader2,
  Sparkles
} from "lucide-react";
import BrandLogo from "./BrandLogo";
import { db, doc, getDoc } from "../store";

interface WelcomeScreenProps {
  onSelectSoloLearner: () => void;
  onSelectSchoolInstitution: () => void;
  onQuickLogin: (role: "student" | "admin" | "teacher", teacherData?: any) => void;
  onStudentLoginSuccess?: (profile: {
    firstName: string;
    lastName: string;
    email: string;
    photoUrl: string;
    phone?: string;
    studyLevel?: string;
    curriculum?: string;
    school?: string;
    schoolName?: string;
    isNew?: boolean;
  }) => void;
}

export default function WelcomeScreen({
  onSelectSoloLearner,
  onSelectSchoolInstitution,
  onQuickLogin,
  onStudentLoginSuccess,
}: WelcomeScreenProps) {
  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    const email = loginEmail.trim().toLowerCase();
    const password = loginPassword.trim();

    if (!email || !password) {
      setLoginError("Please enter your email and password.");
      return;
    }

    setIsLoggingIn(true);

    // 1. Try remote backend API login (/api/v1/auth/login)
    try {
      const loginRes = await tbfApi.login({ email, password });
      if (loginRes && (loginRes.access_token || loginRes.token || loginRes.user)) {
        const userObj = loginRes.user || {};
        const studentProfile = loginRes.student_profile || null;
        const schoolObj = loginRes.school || null;
        const role = userObj.role || (email.includes("admin") ? "admin" : email.includes("teacher") ? "teacher" : "student");

        if (role === "admin" || role === "school_admin") {
          onQuickLogin("admin", schoolObj);
        } else if (role === "teacher") {
          onQuickLogin("teacher", userObj);
        } else {
          onQuickLogin("student");
          if (onStudentLoginSuccess) {
            let formattedLevel = studentProfile?.study_level || "Form 1";
            if (/^Form\d$/i.test(formattedLevel)) {
              formattedLevel = `Form ${formattedLevel.slice(4)}`;
            }
            let formattedCurriculum = studentProfile?.curriculum || "Tanzania National (NECTA)";
            if (formattedCurriculum.toLowerCase() === "necta") {
              formattedCurriculum = "Tanzania National (NECTA)";
            }

            const resolvedSchool =
              schoolObj?.name ||
              studentProfile?.school ||
              userObj.school ||
              userObj.schoolName ||
              "";

            const resolvedPhone =
              (studentProfile?.phone && studentProfile.phone !== "+255 700 000 000" && studentProfile.phone !== "+255 711 111 222")
                ? studentProfile.phone
                : (userObj.phone && userObj.phone !== "+255 700 000 000" && userObj.phone !== "+255 711 111 222")
                ? userObj.phone
                : (userObj.parentContact && userObj.parentContact !== "+255 700 000 000")
                ? userObj.parentContact
                : "";

            onStudentLoginSuccess({
              firstName: userObj.fname || userObj.firstName || email.split("@")[0],
              lastName: userObj.lname || userObj.lastName || "",
              email: userObj.email || email,
              phone: resolvedPhone,
              studyLevel: formattedLevel,
              curriculum: formattedCurriculum,
              school: resolvedSchool,
              schoolName: resolvedSchool,
              photoUrl: (studentProfile?.photo_url && studentProfile.photo_url !== "string")
                ? studentProfile.photo_url
                : (userObj.photo_url || ""),
              isNew: false
            });
          }
        }
        setIsLoggingIn(false);
        return;
      }
    } catch (apiErr: any) {
      const msg = apiErr?.message || "";
      if (apiErr?.code === 2008 || apiErr?.status === 503 || msg.toLowerCase().includes("database is unavailable") || msg.toLowerCase().includes("database unavailable")) {
        setLoginError("The server is temporarily unavailable. Please try again later.");
        setIsLoggingIn(false);
        return;
      }
      if (apiErr?.status === 401 || msg.includes("Invalid email") || msg.includes("password") || msg.includes("401") || msg.includes("422") || msg.includes("Field required")) {
        setLoginError(msg || "Invalid email or password.");
        setIsLoggingIn(false);
        return;
      }
      if (apiErr?.status === 403) {
        setLoginError("You do not have permission to perform this action.");
        setIsLoggingIn(false);
        return;
      }
      console.warn("Backend API login attempt:", apiErr?.message);
    }

    // 2. Check local registered accounts (students/teachers/admins in localStorage)
    try {
      const savedUsers = JSON.parse(localStorage.getItem("tbf_registered_users") || "[]");
      const matchedUser = savedUsers.find((u: any) => u.email?.toLowerCase() === email);
      if (matchedUser) {
        if (matchedUser.password && matchedUser.password !== password) {
          setLoginError("Incorrect password. Please try again.");
          setIsLoggingIn(false);
          return;
        }
        if (matchedUser.role === "admin") {
          onQuickLogin("admin");
        } else if (matchedUser.role === "teacher") {
          onQuickLogin("teacher", matchedUser);
        } else {
          onQuickLogin("student");
          if (onStudentLoginSuccess) {
            const sch = matchedUser.school || matchedUser.schoolName || "";
            const userPhone =
              (matchedUser.phone && matchedUser.phone !== "+255 700 000 000" && matchedUser.phone !== "+255 711 111 222")
                ? matchedUser.phone
                : (matchedUser.parentContact && matchedUser.parentContact !== "+255 700 000 000")
                ? matchedUser.parentContact
                : "";

            onStudentLoginSuccess({
              firstName: matchedUser.fname || matchedUser.firstName || email.split("@")[0],
              lastName: matchedUser.lname || matchedUser.lastName || "",
              email: email,
              phone: userPhone,
              studyLevel: matchedUser.study_level || matchedUser.studyLevel || "Form 1",
              curriculum: matchedUser.curriculum || "Tanzania National (NECTA)",
              school: sch,
              schoolName: sch,
              photoUrl: matchedUser.photo_url || "",
              isNew: false
            });
          }
        }
        setIsLoggingIn(false);
        return;
      }
    } catch (e) {}

    // 3. Check client data store teacher collection
    try {
      const docId = email.replace(/\./g, "_");
      const teacherDocSnap = await getDoc(doc(db, "teachers", docId));
      if (teacherDocSnap.exists()) {
        const teacherData = teacherDocSnap.data();
        if (teacherData.password === password) {
          onQuickLogin("teacher", teacherData);
          setIsLoggingIn(false);
          return;
        } else {
          setLoginError("Incorrect password for teacher account.");
          setIsLoggingIn(false);
          return;
        }
      }
    } catch (err: any) {
      console.error("Teacher log in error: ", err);
    }

    // 4. Check client data store student collection
    try {
      const docId = email.replace(/\./g, "_");
      const studentDocSnap = await getDoc(doc(db, "students", docId));
      if (studentDocSnap.exists()) {
        const studentData = studentDocSnap.data();
        if (studentData.password && studentData.password === password) {
          onQuickLogin("student");
          if (onStudentLoginSuccess) {
            const sch = studentData.school || studentData.schoolName || "";
            const studentPhone =
              (studentData.phone && studentData.phone !== "+255 700 000 000" && studentData.phone !== "+255 711 111 222")
                ? studentData.phone
                : (studentData.parentContact && studentData.parentContact !== "+255 700 000 000")
                ? studentData.parentContact
                : (studentData.parentPhone && studentData.parentPhone !== "+255 700 000 000")
                ? studentData.parentPhone
                : "";

            onStudentLoginSuccess({
              firstName: studentData.name?.split(" ")[0] || "Student",
              lastName: studentData.name?.split(" ").slice(1).join(" ") || "",
              email: email,
              phone: studentPhone,
              studyLevel: studentData.class || studentData.studyLevel || "Form 1",
              curriculum: studentData.curriculum || "Tanzania National (NECTA)",
              school: sch,
              schoolName: sch,
              photoUrl: studentData.photoUrl || studentData.photo_url || "",
              isNew: false
            });
          }
          setIsLoggingIn(false);
          return;
        } else {
          setLoginError(studentData.password ? "Incorrect password for student account." : "This account has not set a password. Please register your account first.");
          setIsLoggingIn(false);
          return;
        }
      }
    } catch (err: any) {}

    // 5. If not found
    setIsLoggingIn(false);
    setLoginError("No account found with these credentials. Please check your email and password, or create a new account.");
  };

  return (
    <div id="welcome-root" className="min-h-screen flex flex-col md:flex-row bg-[#FAF6EE] text-[#1E293B] p-4 md:p-6 gap-6">
      
      {/* Left side: Immersive dark panel with stats & brand */}
      <div id="welcome-info-panel" className="w-full md:w-[42%] bg-gradient-to-br from-[#15223F] to-[#0E1729] text-white p-8 md:p-12 lg:p-14 flex flex-col justify-between relative overflow-hidden rounded-[2.5rem] border-2 border-white/5 shadow-2xl">
        {/* Subtle decorative background pattern */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-white/5 to-transparent rounded-full -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-white/5 to-transparent rounded-full -ml-20 -mb-20 pointer-events-none" />

        {/* Brand Logo */}
        <div id="welcome-brand" className="flex items-center gap-3.5 relative z-10">
          <div className="bg-white/95 p-1.5 rounded-2xl flex items-center justify-center shadow-lg hover:scale-105 transition-transform">
            <BrandLogo size={36} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight font-sans text-white">TBF School Hub</h1>
            <p className="text-[10px] text-white/60 tracking-wider font-mono font-medium">STUDENT &amp; SCHOOL SYSTEM</p>
          </div>
        </div>

        {/* Content & Mission */}
        <div className="my-10 md:my-auto max-w-lg relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white/90 text-xs font-medium backdrop-blur-md mb-4 border border-white/10">
            <Sparkles className="w-3.5 h-3.5 text-[#D69B67]" />
            <span>AI-Powered Learning Platform</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tight leading-tight text-white mb-5 font-serif">
            The digital school for every student in Africa
          </h2>
          <p className="text-[#94A3B8] leading-relaxed text-sm md:text-base">
            Summarise textbooks, practice with smart quizzes, run virtual science labs, and get step-by-step guidance from Baraka AI tutor.
          </p>
        </div>

        {/* Metrics Grid */}
        <div id="welcome-metrics" className="grid grid-cols-2 gap-4 relative z-10">
          <div className="bg-white/5 backdrop-blur-md rounded-[2rem] p-4 sm:p-5 border border-white/10 hover:border-white/20 hover:scale-[1.02] hover:bg-white/10 transition-all duration-300 shadow-lg">
            <p className="text-2xl md:text-4xl font-bold text-[#D69B67] font-serif">12K+</p>
            <p className="text-[11px] md:text-xs text-[#94A3B8] mt-1 font-medium">Students learning daily</p>
          </div>
          <div className="bg-white/5 backdrop-blur-md rounded-[2rem] p-4 sm:p-5 border border-white/10 hover:border-white/20 hover:scale-[1.02] hover:bg-white/10 transition-all duration-300 shadow-lg">
            <p className="text-2xl md:text-4xl font-bold text-[#D69B67] font-serif">340+</p>
            <p className="text-[11px] md:text-xs text-[#94A3B8] mt-1 font-medium">Schools onboarded</p>
          </div>
        </div>

        <div className="text-[11px] text-[#94A3B8] mt-6 md:mt-4 font-mono tracking-wider opacity-60">
          © 2026 The Baraka Foundation · TBF School Hub
        </div>
      </div>

      {/* Right side: Interactive Area (Login Screen by Default) */}
      <div id="welcome-form-panel" className="w-full md:w-[58%] flex items-center justify-center p-6 sm:p-8 md:p-10 lg:p-12 bg-white border-2 border-[#15223F]/5 rounded-[2.5rem] shadow-sm relative overflow-y-auto">
        
        <div className="w-full max-w-md space-y-6 animate-fade-in">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-amber-50 border border-amber-200/60 rounded-full text-[10px] font-mono tracking-widest text-[#D69B67] uppercase font-bold">
                Account Sign In
              </span>
            </div>
            <h3 className="text-3xl md:text-4xl font-serif text-[#15223F] font-semibold tracking-tight">
              Welcome back
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
              Enter your credentials to sign in to your student, teacher, or school administrator account.
            </p>
          </div>

          {/* Error Notification */}
          {loginError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3.5 rounded-2xl font-medium leading-relaxed animate-fade-in">
              {loginError}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Email Address
              </label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                <input
                  type="email"
                  required
                  id="login-email-input"
                  disabled={isLoggingIn}
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-3 text-xs font-medium text-[#15223F] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#15223F]/15 focus:border-[#15223F] transition-all disabled:opacity-60"
                  placeholder="name@school.ac.tz or student@email.com"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Password
                </label>
              </div>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                <input
                  type={showLoginPassword ? "text" : "password"}
                  required
                  id="login-password-input"
                  disabled={isLoggingIn}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-3 text-xs font-medium text-[#15223F] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#15223F]/15 focus:border-[#15223F] transition-all disabled:opacity-60"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  aria-label={showLoginPassword ? "Hide password" : "Show password"}
                >
                  {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Sign In Submit Button */}
            <button
              type="submit"
              id="submit-login-btn"
              disabled={isLoggingIn}
              className="w-full bg-[#15223F] hover:bg-[#1E293B] text-white font-semibold py-3.5 rounded-xl text-xs transition-all shadow-md hover:shadow-lg active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-75"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>sign in</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider & Registration Actions */}
          <div className="pt-4 border-t border-gray-100 space-y-3">
            <p className="text-xs text-gray-500 font-medium">Don't have an account yet?</p>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                id="direct-solo-register-btn"
                onClick={onSelectSoloLearner}
                className="w-full text-left bg-[#FAF6EE]/70 hover:bg-[#FAF6EE] border border-[#15223F]/10 hover:border-[#D69B67] p-3 rounded-xl flex items-center gap-2.5 transition-all cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#15223F] truncate">Solo Learner</p>
                  <p className="text-[10px] text-gray-500 truncate">Register independently</p>
                </div>
              </button>

              <button
                type="button"
                id="direct-school-register-btn"
                onClick={onSelectSchoolInstitution}
                className="w-full text-left bg-[#FAF6EE]/70 hover:bg-[#FAF6EE] border border-[#15223F]/10 hover:border-[#D69B67] p-3 rounded-xl flex items-center gap-2.5 transition-all cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <School className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#15223F] truncate">School</p>
                  <p className="text-[10px] text-gray-500 truncate">Register an institution</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
