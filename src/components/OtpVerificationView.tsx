import React, { useState, useEffect } from "react";
import { authService, ApiError } from "../lib/api";
import { Mail, Phone, ShieldCheck, ArrowRight, RefreshCw, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import BrandLogo from "./BrandLogo";

interface OtpVerificationViewProps {
  initialEmail: string;
  initialPhone?: string;
  name?: string;
  onVerificationComplete: () => void;
  onCancel?: () => void;
}

export const OtpVerificationView: React.FC<OtpVerificationViewProps> = ({
  initialEmail,
  initialPhone = "",
  name = "Learner",
  onVerificationComplete,
  onCancel,
}) => {
  const [activeTab, setActiveTab] = useState<"email" | "phone">("email");
  const [email] = useState(initialEmail);
  const [phone, setPhone] = useState(initialPhone);
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<string | null>(null);

  // 60-second countdown for resend
  const [countdown, setCountdown] = useState<number>(60);
  const [canResend, setCanResend] = useState<boolean>(false);

  useEffect(() => {
    let timer: any = null;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            setCanResend(true);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    } else {
      setCanResend(true);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const formatTzPhone = (p: string): string => {
    let digits = (p || "").trim().replace(/\D/g, "");
    if (digits.startsWith("0")) {
      digits = "255" + digits.substring(1);
    } else if (digits.length === 9) {
      digits = "255" + digits;
    }
    return digits ? `+${digits}` : "";
  };

  const validatePhone = (p: string): boolean => {
    const formatted = formatTzPhone(p);
    return /^\+255\d{9}$/.test(formatted);
  };

  const handleSendEmailOtp = async () => {
    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await authService.sendVerificationEmail({ email, name });
      setSuccessMsg(res.message || `Verification code sent to ${email}`);
      setCountdown(60);
      setCanResend(false);
    } catch (err: any) {
      setError(err?.message || "Failed to send email verification code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendPhoneOtp = async () => {
    if (!validatePhone(phone)) {
      setError("Please enter a valid Tanzanian phone number (e.g. 0712345678 or +255712345678).");
      return;
    }
    const formattedPhone = formatTzPhone(phone);
    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await authService.resendOtpToPhone({ email, phone: formattedPhone });
      setSuccessMsg(res.message || `Verification code sent to ${formattedPhone}`);
      setCountdown(60);
      setCanResend(false);
    } catch (err: any) {
      setError(err?.message || "Failed to send SMS verification code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.trim().length < 4) {
      setError("Please enter the full verification code.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setAttemptsRemaining(null);

    try {
      if (activeTab === "email") {
        const res = await authService.verifyEmail({ email, code: code.trim() });
        setSuccessMsg(res.message || "Email verified successfully!");
        setTimeout(() => {
          onVerificationComplete();
        }, 1500);
      } else {
        if (!validatePhone(phone)) {
          setError("Please enter a valid Tanzanian phone number (e.g. 0712345678 or +255712345678).");
          setIsLoading(false);
          return;
        }
        const formattedPhone = formatTzPhone(phone);
        const res = await authService.verifyPhone({ email, phone: formattedPhone, code: code.trim() });
        setSuccessMsg(res.message || "Phone number verified successfully!");
        setTimeout(() => {
          onVerificationComplete();
        }, 1500);
      }
    } catch (err: any) {
      const msg = err?.message || "Verification failed";
      setError(msg);
      // Check for attempts remaining message
      if (msg.toLowerCase().includes("attempt")) {
        setAttemptsRemaining(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF6EE] flex flex-col justify-center items-center p-4 sm:p-6 text-slate-800">
      <div className="w-full max-w-md bg-white rounded-[2rem] border border-[#15223F]/10 shadow-xl p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            <BrandLogo size="md" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-mono font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Security Verification
          </div>
          <h2 className="text-2xl font-serif font-bold text-[#15223F]">Verify Your Account</h2>
          <p className="text-xs text-gray-500">
            Enter the 6-digit verification code sent to your registered contact.
          </p>
        </div>

        {/* Mutually Exclusive Choice: SMS or Email OTP */}
        <div className="space-y-2">
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">
            Choose Verification Method:
          </p>
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl text-xs font-bold gap-1">
            <button
              type="button"
              onClick={() => {
                setActiveTab("email");
                setError(null);
                setSuccessMsg(null);
                setCode("");
              }}
              className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "email" ? "bg-[#15223F] text-white shadow-xs" : "text-gray-600 hover:text-slate-900"
              }`}
            >
              <Mail className="w-3.5 h-3.5" /> Email OTP
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("phone");
                setError(null);
                setSuccessMsg(null);
                setCode("");
              }}
              className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "phone" ? "bg-[#15223F] text-white shadow-xs" : "text-gray-600 hover:text-slate-900"
              }`}
            >
              <Phone className="w-3.5 h-3.5" /> SMS OTP
            </button>
          </div>
        </div>

        {/* Feedback alerts */}
        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2 animate-fade-in text-left">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">{error}</p>
              {attemptsRemaining && <p className="text-[11px] text-rose-600 font-mono">{attemptsRemaining}</p>}
            </div>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2 animate-fade-in text-left">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <p className="font-bold">{successMsg}</p>
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-4 text-left">
          {activeTab === "email" ? (
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                Registered Email
              </label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-gray-500 font-mono"
              />
            </div>
          ) : (
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                Phone Number (+255XXXXXXXXX)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+255712345678"
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 font-mono focus:border-[#D69B67] focus:outline-none"
              />
              <p className="text-[10px] text-gray-400">Must have exactly 9 digits after country code +255</p>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
              Verification Code (OTP)
            </label>
            <input
              type="text"
              maxLength={8}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9a-zA-Z]/g, ""))}
              placeholder="e.g. 123456"
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-lg font-mono tracking-widest text-center text-slate-800 focus:border-[#D69B67] focus:outline-none font-bold"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-[#15223F] hover:bg-[#0E1729] text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            <span>Verify &amp; Continue</span>
          </button>
        </form>

        {/* Resend actions & countdown */}
        <div className="pt-2 border-t border-gray-100 flex flex-col items-center gap-2 text-xs text-center">
          {canResend ? (
            <button
              type="button"
              onClick={activeTab === "email" ? handleSendEmailOtp : handleSendPhoneOtp}
              disabled={isLoading}
              className="text-[#D69B67] font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Resend Verification Code
            </button>
          ) : (
            <p className="text-gray-400 font-mono text-[11px]">
              Resend available in <span className="font-bold text-slate-600">{countdown}s</span>
            </p>
          )}

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 text-[11px] font-bold cursor-pointer mt-1"
            >
              Back to Login
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
