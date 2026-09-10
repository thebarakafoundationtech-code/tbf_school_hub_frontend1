import React, { useState, useEffect, useRef } from "react";
import { tbfApi } from "../services/api";
import { 
  GraduationCap, 
  School, 
  ArrowRight, 
  UserCheck, 
  Mail, 
  Lock, 
  RefreshCw, 
  CheckCircle, 
  X, 
  Eye,
  EyeOff,
  Copy, 
  ExternalLink
} from "lucide-react";
import BrandLogo from "./BrandLogo";
import { db, doc, getDoc } from "../store";

interface WelcomeScreenProps {
  onSelectSoloLearner: (formData: any) => void;
  onSelectSchoolInstitution: () => void;
  onQuickLogin: (role: "student" | "admin" | "teacher", teacherData?: any) => void;
  onStudentLoginSuccess?: (profile: { firstName: string; lastName: string; email: string; photoUrl: string; isNew?: boolean; studyLevel?: string }) => void;
}

export default function WelcomeScreen({
  onSelectSoloLearner,
  onSelectSchoolInstitution,
  onQuickLogin,
  onStudentLoginSuccess,
}: WelcomeScreenProps) {
  const [showSoloSignup, setShowSoloSignup] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [studyLevel, setStudyLevel] = useState("");
  const [curriculum, setCurriculum] = useState("Tanzania National (NECTA)");
  const [password, setPassword] = useState("");

  // Quick log-in modal states
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState("");

  const handleSoloSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const learnerPayload = {
      fname: firstName,
      lname: lastName,
      email: cleanEmail,
      password: password || "password123",
      phone,
      study_level: studyLevel,
      curriculum,
      role: "student",
      account_type: "solo_learner",
      photo_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
    };

    // 1. Save to local storage for instant re-login
    try {
      const existing = JSON.parse(localStorage.getItem("tbf_registered_users") || "[]");
      const updated = [learnerPayload, ...existing.filter((u: any) => u.email?.toLowerCase() !== cleanEmail)];
      localStorage.setItem("tbf_registered_users", JSON.stringify(updated));
    } catch (err) {}

    // 2. Submit to backend API
    try {
      await tbfApi.registerSoloLearner(learnerPayload);
    } catch (err) {
      console.warn("Solo learner API registration note:", err);
    }

    onSelectSoloLearner({
      firstName,
      lastName,
      email: cleanEmail,
      phone,
      studyLevel,
      curriculum,
    });
  };

  return (
    <div id="welcome-root" className="min-h-screen flex flex-col md:flex-row bg-[#FAF6EE] text-[#1E293B] p-4 md:p-6 gap-6">
      
      {/* Left side: Immersive dark panel with stats */}
      <div id="welcome-info-panel" className="w-full md:w-[42%] bg-gradient-to-br from-[#15223F] to-[#0E1729] text-white p-8 md:p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden rounded-[2.5rem] border-2 border-white/5 shadow-2xl">
        {/* Subtle decorative background pattern */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-white/5 to-transparent rounded-full -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-white/5 to-transparent rounded-full -ml-20 -mb-20 pointer-events-none" />

        {/* Brand Logo */}
        <div id="welcome-brand" className="flex items-center gap-3.5 relative z-10">
          <div className="bg-white/95 p-1.5 rounded-2xl flex items-center justify-center shadow-lg hover:scale-105 transition-transform">
            <BrandLogo size={36} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight font-sans">TBF School Hub</h1>
            <p className="text-[10px] text-white/60 tracking-wider font-mono font-medium">STUDENT HUB</p>
          </div>
        </div>

        {/* Content & Mission */}
        <div className="my-12 md:my-auto max-w-lg relative z-10">
          <h2 className="text-4xl md:text-5xl font-semibold tracking-tight leading-tight text-white mb-6 font-serif">
            The digital school for every student in Africa
          </h2>
          <p className="text-[#94A3B8] leading-relaxed text-base">
            Summarise textbooks, practice with smart quizzes, run virtual labs and get step-by-step help from Baraka — your study companion.
          </p>
        </div>

        {/* Metrics Grid */}
        <div id="welcome-metrics" className="grid grid-cols-2 gap-4 md:gap-6 relative z-10">
          <div className="bg-white/5 backdrop-blur-md rounded-[2rem] p-5 border border-white/10 hover:border-white/20 hover:scale-[1.02] hover:bg-white/10 transition-all duration-300 shadow-lg">
            <p className="text-3xl md:text-4xl font-bold text-[#D69B67] font-serif">12K+</p>
            <p className="text-[11px] md:text-xs text-[#94A3B8] mt-1 font-medium">Students learning daily</p>
          </div>
          <div className="bg-white/5 backdrop-blur-md rounded-[2rem] p-5 border border-white/10 hover:border-white/20 hover:scale-[1.02] hover:bg-white/10 transition-all duration-300 shadow-lg">
            <p className="text-3xl md:text-4xl font-bold text-[#D69B67] font-serif">340+</p>
            <p className="text-[11px] md:text-xs text-[#94A3B8] mt-1 font-medium">Schools onboarded</p>
          </div>
        </div>

        <div className="text-[11px] text-[#94A3B8] mt-8 md:mt-0 font-mono tracking-wider opacity-60">
          © 2026 The Baraka Foundation · TBF Student Hub
        </div>
      </div>

      {/* Right side: Onboarding and action forms */}
      <div id="welcome-form-panel" className="w-full md:w-[58%] flex items-center justify-center p-5 sm:p-8 md:p-10 lg:p-12 bg-white border-2 border-[#15223F]/5 rounded-[2.5rem] shadow-sm relative overflow-y-auto">
        
        {!showSoloSignup ? (
          // Main Option Choice Screen (Screenshot 15)
          <div className="w-full max-w-md space-y-8">
            <div className="space-y-3">
              <span className="text-[10px] font-mono tracking-widest text-[#D69B67] uppercase font-bold">Get Started</span>
              <h3 className="text-3xl md:text-4xl font-serif text-[#15223F] font-semibold tracking-tight">Welcome – who are you?</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Choose how you'd like to use the TBF School Hub. You can always switch between views later.
              </p>
            </div>

            <div className="space-y-4">
              {/* Option 1: Solo Learner */}
              <button
                id="select-solo-learner-btn"
                onClick={() => setShowSoloSignup(true)}
                className="w-full text-left bg-[#FAF6EE]/50 hover:bg-white border-2 border-[#15223F]/5 p-4 sm:p-6 md:p-8 rounded-[1.5rem] sm:rounded-[2rem] flex items-start gap-3.5 sm:gap-5 hover:border-[#D69B67] hover:shadow-2xl hover:scale-[1.01] transition-all duration-300 group cursor-pointer"
              >
                <div className="w-14 h-14 bg-sky-50 rounded-2xl flex items-center justify-center text-sky-600 group-hover:bg-sky-100 transition-colors shrink-0 shadow-sm">
                  <GraduationCap className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-semibold text-lg text-[#15223F] flex items-center gap-2">
                    Solo Learner
                    <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-[#D69B67]" />
                  </h4>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Study independently — upload materials, take quizzes and get help anywhere.
                  </p>
                </div>
              </button>

              {/* Option 2: School / Institution */}
              <button
                id="select-school-btn"
                onClick={onSelectSchoolInstitution}
                className="w-full text-left bg-[#FAF6EE]/50 hover:bg-white border-2 border-[#15223F]/5 p-4 sm:p-6 md:p-8 rounded-[1.5rem] sm:rounded-[2rem] flex items-start gap-3.5 sm:gap-5 hover:border-[#D69B67] hover:shadow-2xl hover:scale-[1.01] transition-all duration-300 group cursor-pointer"
              >
                <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 group-hover:bg-amber-100 transition-colors shrink-0 shadow-sm">
                  <School className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-semibold text-lg text-[#15223F] flex items-center gap-2">
                    School / Institution
                    <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-[#D69B67]" />
                  </h4>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Register your school, add students and teachers, and manage learning at scale.
                  </p>
                </div>
              </button>
            </div>

            {/* Account Sign In link */}
            <div className="pt-6 border-t border-gray-200/60 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{" "}
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="font-semibold text-[#15223F] hover:text-[#D69B67] underline decoration-dotted cursor-pointer transition-colors"
                >
                  Sign in to your account
                </button>
              </p>
            </div>
          </div>
        ) : (
          // Solo Learner Create Account Page (Screenshot 16)
          <div className="w-full max-w-lg space-y-8 bg-[#FAF6EE]/30 p-6 md:p-8 rounded-[2rem] border-2 border-[#15223F]/5">
            <div className="space-y-2">
              <button 
                onClick={() => setShowSoloSignup(false)}
                className="text-xs font-semibold text-[#D69B67] hover:underline flex items-center gap-1 cursor-pointer"
              >
                ← Back to choices
              </button>
              <span className="block text-[10px] font-mono tracking-widest text-[#D69B67] uppercase font-bold">Solo Learner</span>
              <h3 className="text-3xl font-serif text-[#15223F] font-semibold tracking-tight">Create your account</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Learn independently with advanced tools. No school registration required.
              </p>
            </div>

            <form onSubmit={handleSoloSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="w-full bg-white border-2 border-[#15223F]/5 rounded-xl px-4 py-2.5 text-xs font-medium text-[#15223F] focus:outline-none focus:border-[#D69B67]"
                    placeholder="e.g. Amani"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="w-full bg-white border-2 border-[#15223F]/5 rounded-xl px-4 py-2.5 text-xs font-medium text-[#15223F] focus:outline-none focus:border-[#D69B67]"
                    placeholder="e.g. Baraka"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-white border-2 border-[#15223F]/5 rounded-xl px-4 py-2.5 text-xs font-medium text-[#15223F] focus:outline-none focus:border-[#D69B67]"
                  placeholder="amani@email.com"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Phone Number (Optional)</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-white border-2 border-[#15223F]/5 rounded-xl px-4 py-2.5 text-xs font-medium text-[#15223F] focus:outline-none focus:border-[#D69B67]"
                  placeholder="+255 7xx xxx xxx"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Study Level</label>
                  <input
                    type="text"
                    value={studyLevel}
                    onChange={(e) => setStudyLevel(e.target.value)}
                    required
                    className="w-full bg-white border-2 border-[#15223F]/5 rounded-xl px-4 py-2.5 text-xs font-medium text-[#15223F] focus:outline-none focus:border-[#D69B67]"
                    placeholder="e.g. Form 1, Std 6"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Curriculum</label>
                  <input
                    type="text"
                    value={curriculum}
                    onChange={(e) => setCurriculum(e.target.value)}
                    required
                    className="w-full bg-white border-2 border-[#15223F]/5 rounded-xl px-4 py-2.5 text-xs font-medium text-[#15223F] focus:outline-none focus:border-[#D69B67]"
                    placeholder="Tanzania / NECTA"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-white border-2 border-[#15223F]/5 rounded-xl px-4 py-2.5 text-xs font-medium text-[#15223F] focus:outline-none focus:border-[#D69B67]"
                  placeholder="Choose a strong password"
                />
              </div>

              <button
                type="submit"
                id="create-solo-account-btn"
                className="w-full bg-[#64B5D6] hover:bg-sky-500 text-white font-semibold py-3.5 rounded-xl text-xs transition-all shadow-md hover:shadow-lg mt-2 flex items-center justify-center gap-2 cursor-pointer"
              >
                Create account & start learning
              </button>
            </form>

            <div className="text-center">
              <button 
                onClick={() => setShowSoloSignup(false)}
                className="text-xs text-gray-400 hover:text-[#D69B67] cursor-pointer"
              >
                or change role registration
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Custom Credential Login Modal */}
      {showLoginModal && (
        <div 
          className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto"
          onClick={() => {
            setShowLoginModal(false);
            setLoginError("");
          }}
        >
          <div 
            className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full space-y-5 shadow-2xl border border-slate-100 relative my-auto transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close X Button */}
            <button
              onClick={() => {
                setShowLoginModal(false);
                setLoginError("");
              }}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="text-center space-y-2 pt-1">
              <div className="w-12 h-12 bg-[#FAF6EE] rounded-2xl mx-auto flex items-center justify-center text-[#D69B67] border border-[#D69B67]/20 shadow-xs">
                <UserCheck className="w-6 h-6 text-[#D69B67]" />
              </div>
              <div>
                <h4 className="text-xl font-serif font-bold text-[#15223F]">Sign In</h4>
                <p className="text-xs text-slate-500 mt-0.5">Welcome back! Access your account</p>
              </div>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setLoginError("");
                const email = loginEmail.trim().toLowerCase();
                const password = loginPassword.trim();

                if (!email || !password) {
                  setLoginError("Please enter your email and password.");
                  return;
                }

                // 1. Try remote backend API login (/api/v1/auth/login)
                try {
                  const loginRes = await tbfApi.login({ email, password });
                  if (loginRes && (loginRes.access_token || loginRes.token || loginRes.user)) {
                    const userObj = loginRes.user || {};
                    const role = userObj.role || (email.includes("admin") ? "admin" : email.includes("teacher") ? "teacher" : "student");
                    if (role === "admin") {
                      onQuickLogin("admin");
                    } else if (role === "teacher") {
                      onQuickLogin("teacher", userObj);
                    } else {
                      onQuickLogin("student");
                      if (onStudentLoginSuccess) {
                        onStudentLoginSuccess({
                          firstName: userObj.fname || userObj.firstName || email.split("@")[0],
                          lastName: userObj.lname || userObj.lastName || "",
                          email: email,
                          photoUrl: userObj.photo_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
                          isNew: false
                        });
                      }
                    }
                    setShowLoginModal(false);
                    setLoginEmail("");
                    setLoginPassword("");
                    return;
                  }
                } catch (apiErr: any) {
                  console.warn("Backend API login attempt:", apiErr?.message);
                }

                // 2. Check local registered accounts (students/teachers/admins in localStorage)
                try {
                  const savedUsers = JSON.parse(localStorage.getItem("tbf_registered_users") || "[]");
                  const matchedUser = savedUsers.find((u: any) => u.email?.toLowerCase() === email);
                  if (matchedUser) {
                    if (matchedUser.password && matchedUser.password !== password) {
                      setLoginError("Incorrect password. Please try again.");
                      return;
                    }
                    if (matchedUser.role === "admin") {
                      onQuickLogin("admin");
                    } else if (matchedUser.role === "teacher") {
                      onQuickLogin("teacher", matchedUser);
                    } else {
                      onQuickLogin("student");
                      if (onStudentLoginSuccess) {
                        onStudentLoginSuccess({
                          firstName: matchedUser.fname || matchedUser.firstName || email.split("@")[0],
                          lastName: matchedUser.lname || matchedUser.lastName || "",
                          email: email,
                          photoUrl: matchedUser.photo_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
                          isNew: false
                        });
                      }
                    }
                    setShowLoginModal(false);
                    setLoginEmail("");
                    setLoginPassword("");
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
                      setShowLoginModal(false);
                      setLoginEmail("");
                      setLoginPassword("");
                      return;
                    } else {
                      setLoginError("Incorrect password for teacher account.");
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
                    if (!studentData.password || studentData.password === password) {
                      onQuickLogin("student");
                      if (onStudentLoginSuccess) {
                        onStudentLoginSuccess({
                          firstName: studentData.name?.split(" ")[0] || "Student",
                          lastName: studentData.name?.split(" ").slice(1).join(" ") || "",
                          email: email,
                          photoUrl: studentData.photo_url || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
                          isNew: false
                        });
                      }
                      setShowLoginModal(false);
                      setLoginEmail("");
                      setLoginPassword("");
                      return;
                    } else {
                      setLoginError("Incorrect password for student account.");
                      return;
                    }
                  }
                } catch (err: any) {}

                // 5. If not found
                setLoginError("No account found with these credentials. Please check your email and password, or register your school / learner account.");
              }}
              className="space-y-3.5"
            >
              {loginError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs p-3 rounded-2xl font-medium leading-relaxed">
                  {loginError}
                </div>
              )}

              {/* Email Input */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Email Address</label>
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs font-medium text-[#15223F] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#15223F]/20 focus:border-[#15223F] transition-all"
                    placeholder="name@school.ac.tz"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Password</label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                  <input
                    type={showLoginPassword ? "text" : "password"}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-9 py-2.5 text-xs font-medium text-[#15223F] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#15223F]/20 focus:border-[#15223F] transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-[#15223F] hover:bg-[#1E293B] text-white font-semibold py-3 rounded-xl text-xs transition-all shadow-md hover:shadow-lg active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer mt-1"
              >
                Sign In
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
