import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authService, ApiError } from "../lib/api";
import BrandLogo from "../components/BrandLogo";
import { User, Mail, Phone, Lock, Eye, EyeOff, Loader2, AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";

export const RegisterSoloPage: React.FC = () => {
  const navigate = useNavigate();

  const [fname, setFname] = useState("");
  const [lname, setLname] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+255");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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

    if (password.length < 8) {
      errors.password = "Password must be at least 8 characters.";
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setErrorMessage("Please correct the errors before submitting.");
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
      await authService.registerSolo({
        fname: fname.trim(),
        lname: lname.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim().replace(/\s+/g, ""),
        password,
      });

      // Send verification email automatically
      try {
        await authService.sendVerificationEmail({
          email: email.trim().toLowerCase(),
          name: fname.trim(),
        });
      } catch {}

      // Navigate to OTP verification page
      navigate(`/verify-otp?email=${encodeURIComponent(email.trim().toLowerCase())}&phone=${encodeURIComponent(phone.trim())}&name=${encodeURIComponent(fname.trim())}`);
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
      <div className="w-full max-w-lg bg-white rounded-[2.5rem] border border-[#15223F]/10 shadow-xl p-6 sm:p-10 space-y-6 text-left animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            <BrandLogo size="md" />
          </div>
          <span className="text-[11px] font-mono tracking-widest text-[#D69B67] uppercase font-bold">
            INDIVIDUAL LEARNER PORTAL
          </span>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#15223F]">
            Create Learner Account
          </h2>
          <p className="text-xs text-gray-500">
            Study independently, read national curriculum textbooks, and practice quizzes with Baraka AI.
          </p>
        </div>

        {errorMessage && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2.5 animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="font-semibold leading-relaxed">{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                First Name
              </label>
              <input
                type="text"
                value={fname}
                onChange={(e) => setFname(e.target.value)}
                placeholder="Amina"
                required
                className="w-full bg-[#FAF6EE] border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:border-[#D69B67] focus:outline-none font-medium"
              />
              {fieldErrors.fname && <p className="text-[10px] text-rose-600 font-bold">{fieldErrors.fname}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                Last Name
              </label>
              <input
                type="text"
                value={lname}
                onChange={(e) => setLname(e.target.value)}
                placeholder="Salim"
                required
                className="w-full bg-[#FAF6EE] border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:border-[#D69B67] focus:outline-none font-medium"
              />
              {fieldErrors.lname && <p className="text-[10px] text-rose-600 font-bold">{fieldErrors.lname}</p>}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="amina.salim@example.com"
              required
              className="w-full bg-[#FAF6EE] border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:border-[#D69B67] focus:outline-none font-medium"
            />
            {fieldErrors.email && <p className="text-[10px] text-rose-600 font-bold">{fieldErrors.email}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
              Phone Number (+255XXXXXXXXX)
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+255712345678"
              required
              className="w-full bg-[#FAF6EE] border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 font-mono focus:border-[#D69B67] focus:outline-none font-medium"
            />
            <p className="text-[10px] text-gray-400">Must start with +255 followed by 9 digits</p>
            {fieldErrors.phone && <p className="text-[10px] text-rose-600 font-bold">{fieldErrors.phone}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                Password (min 8 chars)
              </label>
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.password && <p className="text-[10px] text-rose-600 font-bold">{fieldErrors.password}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                Confirm Password
              </label>
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

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-[#15223F] hover:bg-[#0E1729] text-[#D69B67] text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            <span>Register &amp; Proceed to Verification</span>
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
