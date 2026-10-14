import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authService, ApiError } from "../lib/api";
import BrandLogo from "../components/BrandLogo";
import { TANZANIA_REGIONS } from "../data/tanzaniaRegions";
import { School, User, Mail, Phone, Lock, Eye, EyeOff, Loader2, AlertCircle, ArrowRight, ShieldCheck, FileText } from "lucide-react";

export const RegisterSchoolPage: React.FC = () => {
  const navigate = useNavigate();

  const [fname, setFname] = useState("");
  const [lname, setLname] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+255");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // School details
  const [schoolName, setSchoolName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [region, setRegion] = useState(TANZANIA_REGIONS[0]?.name || "Dar es Salaam");
  const [schoolType, setSchoolType] = useState("Secondary");
  const [headmasterName, setHeadmasterName] = useState("");
  const [docName, setDocName] = useState("official_accreditation.pdf");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    setFieldErrors({});
    setErrorMessage(null);
    const errors: Record<string, string> = {};

    if (fname.trim().length < 2) errors.fname = "First name must be at least 2 characters.";
    if (lname.trim().length < 2) errors.lname = "Last name must be at least 2 characters.";
    if (!email.trim() || !email.includes("@")) errors.email = "Valid email is required.";
    
    // Validate international format +255XXXXXXXXX (exactly 9 digits after +255)
    const cleanPhone = phone.trim().replace(/\s+/g, "");
    if (!/^\+255\d{9}$/.test(cleanPhone)) {
      errors.phone = "Phone must be in international format: +255 followed by 9 digits (e.g. +255712345678).";
    }

    if (schoolName.trim().length < 2) errors.school_name = "School name must be at least 2 characters.";
    if (registrationNumber.trim().length < 2) errors.registration_number = "Registration number is required.";
    if (headmasterName.trim().length < 2) errors.headmaster_name = "Headmaster / Administrator name is required.";

    if (password.length < 8) {
      errors.password = "Password must be at least 8 characters.";
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setErrorMessage("Please correct the validation errors before submitting.");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await authService.registerSchool({
        fname: fname.trim(),
        lname: lname.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim().replace(/\s+/g, ""),
        password,
        school_name: schoolName.trim(),
        registration_number: registrationNumber.trim(),
        region: region.trim(),
        school_type: schoolType.trim(),
        headmaster_name: headmasterName.trim(),
        verification_document_name: docName || "certificate.pdf",
      });

      // Send verification email automatically
      try {
        await authService.sendVerificationEmail({
          email: email.trim().toLowerCase(),
          name: fname.trim(),
        });
      } catch {}

      // Navigate to OTP verification page
      navigate(
        `/verify-otp?email=${encodeURIComponent(email.trim().toLowerCase())}&phone=${encodeURIComponent(phone.trim())}&name=${encodeURIComponent(fname.trim())}`
      );
    } catch (err: any) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
        if (err.fieldErrors) {
          setFieldErrors(err.fieldErrors);
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
      <div className="w-full max-w-2xl bg-white rounded-[2.5rem] border border-[#15223F]/10 shadow-xl p-6 sm:p-10 space-y-6 text-left animate-fade-in my-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            <BrandLogo size="md" />
          </div>
          <span className="text-[11px] font-mono tracking-widest text-[#D69B67] uppercase font-bold">
            INSTITUTION ONBOARDING
          </span>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#15223F]">
            Register Your School
          </h2>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            Connect your school to the national curriculum engine, manage teachers and classes, and track student outcomes.
          </p>
        </div>

        {errorMessage && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2.5 animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="font-semibold leading-relaxed">{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: School Profile */}
          <div className="space-y-4 border-b border-gray-100 pb-5">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <School className="w-4 h-4 text-[#D69B67]" /> 1. School Information
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 font-mono">School Official Name</label>
                <input
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="e.g. Kibaha Secondary School"
                  required
                  className="w-full bg-[#FAF6EE] border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:border-[#D69B67] focus:outline-none font-medium"
                />
                {fieldErrors.school_name && <p className="text-[10px] text-rose-600 font-bold">{fieldErrors.school_name}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 font-mono">Registration Number</label>
                <input
                  type="text"
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
                  placeholder="e.g. S.1234 or TBF/2026/001"
                  required
                  className="w-full bg-[#FAF6EE] border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:border-[#D69B67] focus:outline-none font-mono font-medium"
                />
                {fieldErrors.registration_number && (
                  <p className="text-[10px] text-rose-600 font-bold">{fieldErrors.registration_number}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 font-mono">Region</label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full bg-[#FAF6EE] border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:border-[#D69B67] focus:outline-none font-medium"
                >
                  {TANZANIA_REGIONS.map((r) => (
                    <option key={r.name} value={r.name}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 font-mono">School Type</label>
                <select
                  value={schoolType}
                  onChange={(e) => setSchoolType(e.target.value)}
                  className="w-full bg-[#FAF6EE] border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:border-[#D69B67] focus:outline-none font-medium"
                >
                  <option value="Secondary">Secondary (Form 1–4)</option>
                  <option value="High School">High School (Form 5–6)</option>
                  <option value="Comprehensive">Combined (Form 1–6)</option>
                  <option value="Primary">Primary School</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 font-mono">Headmaster / Principal</label>
                <input
                  type="text"
                  value={headmasterName}
                  onChange={(e) => setHeadmasterName(e.target.value)}
                  placeholder="e.g. Mwl. Juma Kassim"
                  required
                  className="w-full bg-[#FAF6EE] border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:border-[#D69B67] focus:outline-none font-medium"
                />
                {fieldErrors.headmaster_name && (
                  <p className="text-[10px] text-rose-600 font-bold">{fieldErrors.headmaster_name}</p>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Administrator Credentials */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <User className="w-4 h-4 text-[#D69B67]" /> 2. School Admin Account Credentials
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 font-mono">Admin First Name</label>
                <input
                  type="text"
                  value={fname}
                  onChange={(e) => setFname(e.target.value)}
                  placeholder="Juma"
                  required
                  className="w-full bg-[#FAF6EE] border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:border-[#D69B67] focus:outline-none font-medium"
                />
                {fieldErrors.fname && <p className="text-[10px] text-rose-600 font-bold">{fieldErrors.fname}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 font-mono">Admin Last Name</label>
                <input
                  type="text"
                  value={lname}
                  onChange={(e) => setLname(e.target.value)}
                  placeholder="Kassim"
                  required
                  className="w-full bg-[#FAF6EE] border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:border-[#D69B67] focus:outline-none font-medium"
                />
                {fieldErrors.lname && <p className="text-[10px] text-rose-600 font-bold">{fieldErrors.lname}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 font-mono">Admin Official Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="headmaster@kibaha.sc.tz"
                  required
                  className="w-full bg-[#FAF6EE] border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:border-[#D69B67] focus:outline-none font-medium"
                />
                {fieldErrors.email && <p className="text-[10px] text-rose-600 font-bold">{fieldErrors.email}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 font-mono">Phone (+255XXXXXXXXX)</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+255712345678"
                  required
                  className="w-full bg-[#FAF6EE] border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 font-mono focus:border-[#D69B67] focus:outline-none font-medium"
                />
                {fieldErrors.phone && <p className="text-[10px] text-rose-600 font-bold">{fieldErrors.phone}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 font-mono">Password (min 8 chars)</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={8}
                    className="w-full bg-[#FAF6EE] border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:border-[#D69B67] focus:outline-none font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {fieldErrors.password && <p className="text-[10px] text-rose-600 font-bold">{fieldErrors.password}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 font-mono">Confirm Password</label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-[#FAF6EE] border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:border-[#D69B67] focus:outline-none font-medium"
                />
                {fieldErrors.confirmPassword && (
                  <p className="text-[10px] text-rose-600 font-bold">{fieldErrors.confirmPassword}</p>
                )}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-4 bg-[#15223F] hover:bg-[#0E1729] text-[#D69B67] text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            <span>Register School Institution &amp; Verify</span>
          </button>
        </form>

        <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span>Already registered?</span>
          <Link to="/login" className="text-[#15223F] font-bold hover:underline">
            Sign In here
          </Link>
        </div>
      </div>
    </div>
  );
};
