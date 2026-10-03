import React, { useState, useEffect } from "react";
import { CheckCircle, ArrowLeft, ArrowRight, Loader2, Phone, Mail, ShieldCheck, AlertCircle, Eye, EyeOff, ChevronRight, Sparkles, ExternalLink } from "lucide-react";
import BrandLogo from "./BrandLogo";
import { tbfApi } from "../services/api";
import { generateStudentRegNo, getNextStudentEnrollNumber } from "../utils/registrationNumber";

interface SoloLearnerRegistrationProps {
  onComplete: (studentData: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    studyLevel: string;
    curriculum: string;
    school: string;
    schoolName: string;
    regNo?: string;
  }) => void;
  onCancel: () => void;
}

export default function SoloLearnerRegistration({
  onComplete,
  onCancel,
}: SoloLearnerRegistrationProps) {
  const [step, setStep] = useState(1);
  const [enrollSeq, setEnrollSeq] = useState(1);

  useEffect(() => {
    tbfApi.listStudents(1, 100).then((res: any) => {
      const list = res?.students || (Array.isArray(res) ? res : []);
      if (list && list.length > 0) {
        setEnrollSeq(getNextStudentEnrollNumber(list));
      }
    }).catch(() => {});
  }, []);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [phone, setPhone] = useState("");
  const [studyLevelCategory, setStudyLevelCategory] = useState("O Level");
  const [selectedClass, setSelectedClass] = useState("Form 1");
  const [curriculum, setCurriculum] = useState("Tanzania");
  const [learnerRegNo, setLearnerRegNo] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordMismatch, setPasswordMismatch] = useState("");

  // Verification States (Dual: Phone & Email simultaneously, or individual)
  const [verifyMethod, setVerifyMethod] = useState<"dual" | "phone" | "email">("dual");
  const [confirmationCode, setConfirmationCode] = useState("");
  const [showCodeSecret, setShowCodeSecret] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [codeCountdown, setCodeCountdown] = useState(0);
  const [verifyError, setVerifyError] = useState("");
  const [verifyNotice, setVerifyNotice] = useState("");
  const [previewEmailUrl, setPreviewEmailUrl] = useState<string | null>(null);
  const [registeredStudentResult, setRegisteredStudentResult] = useState<any>(null);

  const handlePhoneChange = (val: string) => {
    let digits = val.replace(/\D/g, "");
    if (digits.startsWith("255")) digits = digits.slice(3);
    if (digits.startsWith("0")) digits = digits.slice(1);
    setPhoneDigits(digits);
    setPhone(digits ? `+255${digits}` : "");
  };

  // Countdown timer
  useEffect(() => {
    let timer: any;
    if (codeCountdown > 0) {
      timer = setInterval(() => {
        setCodeCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [codeCountdown]);

  const handleSendCode = async (methodToUse = verifyMethod) => {
    setVerifyError("");
    setVerifyNotice("");
    setPreviewEmailUrl(null);
    setIsSendingCode(true);

    const learnerName = `${firstName.trim()} ${lastName.trim()}`.trim() || "Solo Learner";

    if (methodToUse === "dual" || (phone && phoneDigits.length >= 9 && email && email.includes("@") && methodToUse !== "phone" && methodToUse !== "email")) {
      try {
        const res: any = await tbfApi.sendDualVerificationCode({
          email: email.trim().toLowerCase(),
          phone,
          name: learnerName
        });
        setIsSendingCode(false);
        setCodeSent(true);
        setCodeCountdown(60);
        if (res?.previewUrl) setPreviewEmailUrl(res.previewUrl);
        setVerifyNotice(res?.message || "Verification code successfully sent to your phone and email You can use the code from whichever arrives first!");
      } catch (err: any) {
        setIsSendingCode(false);
        setVerifyError(err?.message || "Failed to dispatch dual verification codes. Please check your phone and email.");
      }
      return;
    }

    if (methodToUse === "phone") {
      if (!phone || phoneDigits.length < 9) {
        setIsSendingCode(false);
        setVerifyError("Please enter a valid 9-digit Tanzanian mobile phone number.");
        return;
      }
      try {
        const res: any = await tbfApi.sendSmsVerificationCode(phone, learnerName);
        setIsSendingCode(false);
        setCodeSent(true);
        setCodeCountdown(60);
        setVerifyNotice(res?.message || `Verification code successfully dispatched via SMS to ${phone}.`);
      } catch (err: any) {
        setIsSendingCode(false);
        setVerifyError(err?.message || "Failed to dispatch SMS code. Please verify your phone number and try again.");
      }
    } else {
      if (!email || !email.includes("@")) {
        setIsSendingCode(false);
        setVerifyError("Please enter a valid email address.");
        return;
      }
      try {
        const res: any = await tbfApi.sendEmailVerificationCode(email.trim().toLowerCase(), learnerName);
        setIsSendingCode(false);
        setCodeSent(true);
        setCodeCountdown(60);
        if (res?.previewUrl) setPreviewEmailUrl(res.previewUrl);
        setVerifyNotice(res?.message || `Verification code successfully sent to ${email}. Please check your inbox or spam folder.`);
      } catch (err: any) {
        setIsSendingCode(false);
        setVerifyError(err?.message || "Failed to dispatch verification email. Please verify your email and try again.");
      }
    }
  };

  const handleSwitchMethod = (newMethod: "dual" | "phone" | "email") => {
    if (newMethod === verifyMethod) return;
    setVerifyMethod(newMethod);
    setVerifyError("");
    setVerifyNotice("");
    setConfirmationCode("");
    setCodeSent(false);
    setCodeCountdown(0);
    setPreviewEmailUrl(null);
  };

  const handleNextStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setPasswordMismatch("Passwords do not match. Please re-enter.");
      return;
    }
    if (password.length < 8) {
      setPasswordMismatch("Password must be at least 8 characters.");
      return;
    }
    setPasswordMismatch("");

    // Auto-select preferred method based on inputs: if both present, default to dual!
    const hasPhone = phone && phoneDigits.length >= 9;
    const hasEmail = email && email.includes("@");
    const chosenMethod: "dual" | "phone" | "email" = (hasPhone && hasEmail) ? "dual" : hasPhone ? "phone" : "email";
    setVerifyMethod(chosenMethod);
    setStep(2);
    handleSendCode(chosenMethod);
  };

  const handleVerifyAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationCode || confirmationCode.trim().length < 4) {
      setVerifyError("Please enter the 6-digit confirmation code.");
      return;
    }
    setIsVerifyingCode(true);
    setVerifyError("");

    try {
      let isVerified = false;
      if (verifyMethod === "dual") {
        const verifyRes: any = await tbfApi.verifyDualCode({
          email: email.trim().toLowerCase(),
          phone,
          code: confirmationCode.trim()
        });
        isVerified = !!(verifyRes && (verifyRes.verified || verifyRes.success));
        if (!isVerified) {
          setIsVerifyingCode(false);
          setVerifyError(verifyRes?.message || verifyRes?.error || "Invalid verification code. Please check your SMS or email inbox and try again.");
          return;
        }
      } else if (verifyMethod === "phone") {
        const verifyRes: any = await tbfApi.verifySmsCode(phone, confirmationCode.trim());
        isVerified = !!(verifyRes && (verifyRes.verified || verifyRes.success));
        if (!isVerified) {
          setIsVerifyingCode(false);
          setVerifyError(verifyRes?.message || verifyRes?.error || "Invalid verification code. Please check your SMS and try again.");
          return;
        }
      } else {
        const verifyRes: any = await tbfApi.verifyEmailCode(email.trim().toLowerCase(), confirmationCode.trim());
        isVerified = !!(verifyRes && (verifyRes.verified || verifyRes.success));
        if (!isVerified) {
          setIsVerifyingCode(false);
          setVerifyError(verifyRes?.message || verifyRes?.error || "Invalid verification code. Please check your email and try again.");
          return;
        }
      }

      // Generate automatic student registration number without school number (for solo learner)
      const autoReg = generateStudentRegNo(null, enrollSeq, new Date().getFullYear(), true);
      setLearnerRegNo(autoReg);

      // Proceed with solo learner registration in backend
      const studentPayload = {
        fname: firstName.trim(),
        lname: lastName.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim(),
        school: "(Solo Independent Learner)",
        study_level: selectedClass,
        education_level: studyLevelCategory,
        curriculum,
        role: "student",
        account_type: "solo_learner",
        phone_verified: verifyMethod === "dual" || verifyMethod === "phone",
        email_verified: verifyMethod === "dual" || verifyMethod === "email",
        verification_method: verifyMethod,
        code: confirmationCode.trim(),
        regNo: autoReg,
        registration_number: autoReg,
      };

      const regResult: any = await tbfApi.registerSoloLearner(studentPayload);
      const finalReg = regResult?.user?.regNo || regResult?.user?.student_id || autoReg;
      setLearnerRegNo(finalReg);
      setIsVerifyingCode(false);
      setRegisteredStudentResult(regResult);
      setStep(3);
    } catch (err: any) {
      setIsVerifyingCode(false);
      setVerifyError(err?.message || "Failed to complete registration. Please try again.");
    }
  };

  const handleFinish = () => {
    onComplete({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      studyLevel: selectedClass,
      curriculum,
      school: "(Solo Independent Learner)",
      schoolName: "(Solo Independent Learner)",
      regNo: learnerRegNo || generateStudentRegNo(null, enrollSeq, new Date().getFullYear(), true),
    });
  };

  return (
    <div id="solo-learner-registration-root" className="min-h-screen bg-[#FAF6EE] text-[#1E293B] flex flex-col font-sans p-4 md:p-6 gap-6">
      
      {/* Top Header with Back button and Brand Logo */}
      <header className="px-6 py-4 md:px-12 flex justify-between items-center bg-white/40 border-2 border-[#15223F]/5 rounded-[2rem] shadow-sm backdrop-blur-md">
        <button
          onClick={onCancel}
          className="flex items-center gap-2 text-sm font-bold text-[#15223F] hover:text-[#D69B67] transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Solo Learner Registration</span>
        </button>

        <div className="flex items-center gap-2.5">
          <div className="bg-white p-1 rounded-xl flex items-center justify-center shadow-xs hover:scale-105 transition-transform">
            <BrandLogo size={24} />
          </div>
          <span className="font-bold text-sm tracking-tight text-[#15223F]">TBF School Hub</span>
        </div>
      </header>

      {/* Center Container Card */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-2xl bg-white border-2 border-[#15223F]/5 rounded-[2.5rem] p-8 md:p-12 shadow-2xl space-y-8 relative overflow-hidden">
          
          {/* Progress Indicator Stepper */}
          <div id="registration-stepper" className="flex items-center justify-between max-w-md mx-auto relative">
            {/* Connecting Background Line */}
            <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-gray-200 -translate-y-1/2 z-0" />
            
            {/* Step 1 */}
            <div className="relative z-10 flex flex-col items-center gap-1.5 bg-white px-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300 ${
                step >= 1 ? "bg-[#D69B67] text-white border-[#D69B67]" : "bg-gray-100 text-gray-400 border-gray-200"
              }`}>
                1
              </div>
              <span className="text-[9px] font-bold text-gray-500 tracking-wider uppercase">Learner Info</span>
            </div>

            {/* Step 2 */}
            <div className="relative z-10 flex flex-col items-center gap-1.5 bg-white px-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300 ${
                step >= 2 ? "bg-[#D69B67] text-white border-[#D69B67]" : "bg-gray-100 text-gray-400 border-gray-200"
              }`}>
                2
              </div>
              <span className="text-[9px] font-bold text-gray-500 tracking-wider uppercase">SMS Verify</span>
            </div>

            {/* Step 3 */}
            <div className="relative z-10 flex flex-col items-center gap-1.5 bg-white px-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300 ${
                step >= 3 ? "bg-[#D69B67] text-white border-[#D69B67]" : "bg-gray-100 text-gray-400 border-gray-200"
              }`}>
                3
              </div>
              <span className="text-[9px] font-bold text-gray-500 tracking-wider uppercase">Verified</span>
            </div>
          </div>

          {/* STEP 1: Learner Information */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <span className="text-xs font-mono font-bold text-[#D69B67] uppercase tracking-widest">Step 1 of 3</span>
                <h2 className="text-3xl font-serif text-[#15223F] font-bold tracking-tight">Learner information</h2>
                <p className="text-sm text-gray-500">Provide your personal study details to create your solo learner account.</p>
              </div>

              <form onSubmit={handleNextStep1} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* First Name */}
                <div className="space-y-1 bg-[#FAF6EE]/60 border-2 border-[#15223F]/5 p-3.5 rounded-2xl focus-within:border-[#D69B67] focus-within:bg-white transition-all">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">First Name</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full bg-transparent border-none text-[#15223F] text-sm focus:outline-none placeholder-gray-400 font-semibold py-1"
                    placeholder="e.g. Baraka"
                  />
                </div>

                {/* Last Name */}
                <div className="space-y-1 bg-[#FAF6EE]/60 border-2 border-[#15223F]/5 p-3.5 rounded-2xl focus-within:border-[#D69B67] focus-within:bg-white transition-all">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Last Name</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full bg-transparent border-none text-[#15223F] text-sm focus:outline-none placeholder-gray-400 font-semibold py-1"
                    placeholder="e.g. Mwangi"
                  />
                </div>

                {/* Email Address */}
                <div className="space-y-1 bg-[#FAF6EE]/60 border-2 border-[#15223F]/5 p-3.5 rounded-2xl focus-within:border-[#D69B67] focus-within:bg-white transition-all">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-transparent border-none text-[#15223F] text-sm focus:outline-none placeholder-gray-400 font-semibold py-1"
                    placeholder="learner@example.com"
                  />
                </div>

                {/* Phone Number with +255 flag badge */}
                <div className="space-y-1 bg-[#FAF6EE]/60 border-2 border-[#15223F]/5 p-3.5 rounded-2xl focus-within:border-[#D69B67] focus-within:bg-white transition-all">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Mobile Phone (For SMS Code)</label>
                  <div className="flex items-center bg-white border border-[#15223F]/10 rounded-xl overflow-hidden focus-within:border-[#D69B67]">
                    <div className="px-3 py-2 bg-gray-100 border-r border-[#15223F]/10 flex items-center gap-1 select-none shrink-0 text-xs font-bold font-mono text-[#15223F]">
                      <span>🇹🇿</span>
                      <span>+255</span>
                    </div>
                    <input
                      type="tel"
                      required
                      value={phoneDigits}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      maxLength={9}
                      className="w-full bg-transparent border-none text-[#15223F] text-sm focus:outline-none placeholder-gray-400 font-semibold px-3 py-2 font-mono"
                      placeholder="712 345 678"
                    />
                  </div>
                </div>

                {/* Level Category */}
                <div className="space-y-1 bg-[#FAF6EE]/60 border-2 border-[#15223F]/5 p-3.5 rounded-2xl focus-within:border-[#D69B67] focus-within:bg-white transition-all">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Education Level</label>
                  <select
                    value={studyLevelCategory}
                    onChange={(e) => {
                      const val = e.target.value;
                      setStudyLevelCategory(val);
                      if (val === "Primary School") setSelectedClass("Standard 1");
                      else if (val === "O Level") setSelectedClass("Form 1");
                      else setSelectedClass("Form 5");
                    }}
                    required
                    className="w-full bg-transparent border-none text-[#15223F] text-sm focus:outline-none font-semibold py-1 cursor-pointer"
                  >
                    <option value="Primary School">Primary School</option>
                    <option value="O Level">O Level (Secondary)</option>
                    <option value="A Level">A Level (High School)</option>
                  </select>
                </div>

                {/* Class / Form */}
                <div className="space-y-1 bg-[#FAF6EE]/60 border-2 border-[#15223F]/5 p-3.5 rounded-2xl focus-within:border-[#D69B67] focus-within:bg-white transition-all">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Class / Form</label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    required
                    className="w-full bg-transparent border-none text-[#15223F] text-sm focus:outline-none font-semibold py-1 cursor-pointer"
                  >
                    {studyLevelCategory === "Primary School" && (
                      <>
                        <option value="Standard 1">Standard 1</option>
                        <option value="Standard 2">Standard 2</option>
                        <option value="Standard 3">Standard 3</option>
                        <option value="Standard 4">Standard 4</option>
                        <option value="Standard 5">Standard 5</option>
                        <option value="Standard 6">Standard 6</option>
                        <option value="Standard 7">Standard 7</option>
                      </>
                    )}
                    {studyLevelCategory === "O Level" && (
                      <>
                        <option value="Form 1">Form 1</option>
                        <option value="Form 2">Form 2</option>
                        <option value="Form 3">Form 3</option>
                        <option value="Form 4">Form 4</option>
                      </>
                    )}
                    {studyLevelCategory === "A Level" && (
                      <>
                        <option value="Form 5">Form 5</option>
                        <option value="Form 6">Form 6</option>
                      </>
                    )}
                  </select>
                </div>

                {/* Curriculum */}
                <div className="md:col-span-2 space-y-1 bg-[#FAF6EE]/60 border-2 border-[#15223F]/5 p-3.5 rounded-2xl focus-within:border-[#D69B67] focus-within:bg-white transition-all">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">National Curriculum</label>
                  <select
                    value={curriculum}
                    onChange={(e) => setCurriculum(e.target.value)}
                    required
                    className="w-full bg-transparent border-none text-[#15223F] text-sm focus:outline-none font-semibold py-1 cursor-pointer"
                  >
                    <option value="Tanzania">Tanzania National Curriculum (NECTA)</option>
                    <option value="Zanzibar">Zanzibar Curriculum</option>
                  </select>
                </div>

                {/* Password Fields */}
                <div className="space-y-1 bg-[#FAF6EE]/60 border-2 border-[#15223F]/5 p-3.5 rounded-2xl focus-within:border-[#D69B67] focus-within:bg-white transition-all">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Create Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (confirmPassword && e.target.value !== confirmPassword) {
                          setPasswordMismatch("Passwords do not match");
                        } else {
                          setPasswordMismatch("");
                        }
                      }}
                      required
                      minLength={8}
                      className="w-full bg-transparent border-none text-[#15223F] text-sm focus:outline-none placeholder-gray-400 font-semibold py-1 pr-8"
                      placeholder="Create secure password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1 bg-[#FAF6EE]/60 border-2 border-[#15223F]/5 p-3.5 rounded-2xl focus-within:border-[#D69B67] focus-within:bg-white transition-all">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Confirm Password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => {
                      const val = e.target.value;
                      setConfirmPassword(val);
                      if (password && val !== password) {
                        setPasswordMismatch("Passwords do not match");
                      } else {
                        setPasswordMismatch("");
                      }
                    }}
                    className="w-full bg-transparent border-none text-[#15223F] text-sm focus:outline-none placeholder-gray-400 font-semibold py-1"
                    placeholder="Re-enter password to match"
                  />
                </div>

                {/* Password Security checklist */}
                <div className="md:col-span-2 bg-[#FAF6EE]/60 border-2 border-[#15223F]/5 p-3 rounded-2xl space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Security Requirements</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-[11px]">
                    <div className={`flex items-center gap-1.5 ${password.length >= 8 ? "text-emerald-700 font-semibold" : "text-gray-500"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${password.length >= 8 ? "bg-emerald-500" : "bg-gray-300"}`} />
                      <span>&gt;= 8 characters</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${/[A-Z]/.test(password) ? "text-emerald-700 font-semibold" : "text-gray-500"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${/[A-Z]/.test(password) ? "bg-emerald-500" : "bg-gray-300"}`} />
                      <span>1 Uppercase (A-Z)</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${/[!@#$%^&*(),.?":{}|<>_\-+=[\]\\/`~]/.test(password) ? "text-emerald-700 font-semibold" : "text-gray-500"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${/[!@#$%^&*(),.?":{}|<>_\-+=[\]\\/`~]/.test(password) ? "bg-emerald-500" : "bg-gray-300"}`} />
                      <span>1 Special symbol</span>
                    </div>
                  </div>
                </div>

                {passwordMismatch && (
                  <div className="md:col-span-2">
                    <p className="text-xs text-rose-500 font-semibold">{passwordMismatch}</p>
                  </div>
                )}

                <div className="md:col-span-2 pt-2">
                  <button
                    type="submit"
                    className="w-full bg-[#D69B67] hover:bg-[#C88A58] text-white font-bold py-4 rounded-2xl text-xs md:text-sm tracking-wide transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STEP 2: Phone or Email Verification */}
          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-2">
                <span className="text-xs font-mono font-bold text-[#D69B67] uppercase tracking-widest">Step 2 of 3</span>
                <h2 className="text-3xl font-serif text-[#15223F] font-bold tracking-tight">Confirm Verification Code</h2>
                <p className="text-sm text-gray-500 leading-normal">
                  Receive your 6-digit confirmation code on your phone and email simultaneously. Use the code from whichever channel arrives first!
                </p>
              </div>

              {/* Delivery Channel Selector (Dual vs Phone vs Email) */}
              <div className="bg-[#FAF6EE] p-1.5 rounded-2xl border-2 border-[#15223F]/5 grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleSwitchMethod("dual")}
                  className={`flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    verifyMethod === "dual"
                      ? "bg-white text-[#15223F] shadow-sm border border-[#15223F]/10 ring-2 ring-[#D69B67]/30"
                      : "text-gray-500 hover:text-[#15223F] hover:bg-white/50"
                  }`}
                >
                  <span className="flex items-center gap-1 text-[#D69B67]">
                    <Phone className="w-3.5 h-3.5" />
                    <span>+</span>
                    <Mail className="w-3.5 h-3.5" />
                  </span>
                  <span>Both</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSwitchMethod("phone")}
                  className={`flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    verifyMethod === "phone"
                      ? "bg-white text-[#15223F] shadow-sm border border-[#15223F]/10"
                      : "text-gray-500 hover:text-[#15223F] hover:bg-white/50"
                  }`}
                >
                  <Phone className="w-3.5 h-3.5 text-[#D69B67]" />
                  <span>Phone</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSwitchMethod("email")}
                  className={`flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    verifyMethod === "email"
                      ? "bg-white text-[#15223F] shadow-sm border border-[#15223F]/10"
                      : "text-gray-500 hover:text-[#15223F] hover:bg-white/50"
                  }`}
                >
                  <Mail className="w-3.5 h-3.5 text-[#D69B67]" />
                  <span>Email</span>
                </button>
              </div>

              {/* Channel Dispatch Target Summary */}
              {verifyMethod === "dual" ? (
                <div className="bg-[#FAF6EE]/90 border-2 border-[#D69B67]/20 p-4 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[#D69B67] font-bold text-xs">
                      <span className="w-2 h-2 rounded-full bg-[#D69B67] animate-pulse" />
                      <span>Dual-Channel Simultaneous Dispatch</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-xs font-bold text-[#D69B67] hover:underline cursor-pointer"
                    >
                      Edit Contacts
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="bg-white/80 p-3 rounded-xl border border-[#15223F]/5 flex items-center gap-2.5">
                      <Phone className="w-4 h-4 text-[#D69B67] shrink-0" />
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase block">SMS Target</span>
                        <span className="font-mono font-bold text-[#15223F]">{phone || "No phone entered"}</span>
                      </div>
                    </div>
                    <div className="bg-white/80 p-3 rounded-xl border border-[#15223F]/5 flex items-center gap-2.5">
                      <Mail className="w-4 h-4 text-[#D69B67] shrink-0" />
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase block">Email Target</span>
                        <span className="font-mono font-bold text-[#15223F] truncate">{email || "No email entered"}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-500 italic">
                    💡 The exact same 6-digit code is dispatched to both your phone and email. You only need to type it once!
                  </p>
                </div>
              ) : (
                <div className="bg-[#FAF6EE]/80 border-2 border-[#15223F]/5 p-4 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#D69B67]/10 text-[#D69B67] flex items-center justify-center shrink-0">
                      {verifyMethod === "phone" ? <Phone className="w-5 h-5" /> : <Mail className="w-5 h-5" />}
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">
                        {verifyMethod === "phone" ? "Verification Mobile Phone" : "Verification Email Address"}
                      </span>
                      <span className="font-mono font-bold text-sm text-[#15223F]">
                        {verifyMethod === "phone" ? (phone || "No phone number entered") : (email || "No email entered")}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-xs font-bold text-[#D69B67] hover:underline cursor-pointer"
                  >
                    Edit in Step 1
                  </button>
                </div>
              )}

              {/* Resend / Send Button */}
              <div className="flex items-center justify-between bg-white/70 border border-[#15223F]/10 p-3 rounded-2xl">
                <div className="text-xs text-gray-500">
                  <span>{codeSent ? "Didn't receive the confirmation code?" : "Request your 6-digit confirmation code"}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleSendCode(verifyMethod)}
                  disabled={isSendingCode || (codeSent && codeCountdown > 0)}
                  className="text-xs font-bold bg-[#15223F] hover:bg-[#1E293B] text-white px-4 py-2 rounded-xl transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-1.5 shadow-sm"
                >
                  {isSendingCode ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : codeSent && codeCountdown > 0 ? (
                    <span>Resend in {codeCountdown}s</span>
                  ) : (
                    <span>{codeSent ? (verifyMethod === "dual" ? "Resend to Both" : "Resend Code") : (verifyMethod === "dual" ? "Send to Both Channels" : `Send Code via ${verifyMethod === "phone" ? "SMS" : "Email"}`)}</span>
                  )}
                </button>
              </div>

              {verifyNotice && (
                <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl flex items-center justify-between gap-2 font-medium">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{verifyNotice}</span>
                  </div>
                  {previewEmailUrl && (
                    <a
                      href={previewEmailUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-bold text-emerald-700 underline hover:text-emerald-900 inline-flex items-center gap-1 shrink-0"
                    >
                      <span>Preview Email</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}

              {verifyError && (
                <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 p-3.5 rounded-2xl flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{verifyError}</span>
                </div>
              )}

              <form onSubmit={handleVerifyAndRegister} className="space-y-6">
                <div className="space-y-2 bg-[#FAF6EE]/60 border-2 border-[#15223F]/5 p-5 rounded-2xl text-center focus-within:border-[#D69B67] focus-within:bg-white transition-all">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                      Enter 6-Digit {verifyMethod === "phone" ? "SMS" : "Email"} Confirmation Code
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowCodeSecret(!showCodeSecret)}
                      className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 cursor-pointer"
                    >
                      {showCodeSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span className="text-[10px]">{showCodeSecret ? "Hide" : "Show"}</span>
                    </button>
                  </div>
                  <input
                    type={showCodeSecret ? "text" : "password"}
                    maxLength={6}
                    value={confirmationCode}
                    onChange={(e) => setConfirmationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    required
                    placeholder="••••••"
                    autoComplete="one-time-code"
                    className="w-full bg-transparent border-none text-center text-2xl font-mono font-bold tracking-[0.4em] text-[#15223F] focus:outline-none py-1"
                  />
                  <p className="text-[11px] text-gray-400">
                    Enter the secret code delivered to your {verifyMethod === "phone" ? "phone SMS" : "email inbox"} to finalize registration.
                  </p>
                </div>

                <div className="flex gap-4 pt-2">
                  <button
                    type="button"
                    disabled={isVerifyingCode}
                    onClick={() => setStep(1)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-[#15223F] font-bold py-4 rounded-2xl text-xs md:text-sm transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isVerifyingCode || !confirmationCode}
                    className="flex-1 bg-[#D69B67] hover:bg-[#C88A58] text-white font-bold py-4 rounded-2xl text-xs md:text-sm transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isVerifyingCode ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying Code...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Verify & Complete Registration</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STEP 3: Registration Complete */}
          {step === 3 && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-2 text-center">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <span className="text-xs font-mono font-bold text-emerald-600 uppercase tracking-widest">Registration Complete</span>
                <h2 className="text-3xl font-serif text-[#15223F] font-bold tracking-tight">Learner Account Verified!</h2>
                <p className="text-sm text-gray-500 max-w-md mx-auto">
                  Your solo learner profile has been verified via {verifyMethod === "phone" ? "Mobile SMS" : "Email Confirmation"} and registered. You now have full access to study materials, quizzes, and Baraka AI.
                </p>
              </div>

              {/* Verified Learner Summary Card */}
              <div className="bg-[#EBF7F5] border-2 border-emerald-200 p-6 rounded-3xl space-y-3 text-[#1E5F52]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider">Learner Name</span>
                    <span className="font-bold text-[#15223F] text-sm">{firstName} {lastName}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider">Registration Number</span>
                    <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 inline-block text-xs">
                      {learnerRegNo || generateStudentRegNo(null, enrollSeq, new Date().getFullYear(), true)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider">Email Address</span>
                    <span className="font-mono font-bold text-[#15223F]">{email}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider">Study Level</span>
                    <span className="font-semibold text-slate-700">{studyLevelCategory} · {selectedClass}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider">Confirmation Channel</span>
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-700 uppercase">
                      <ShieldCheck className="w-3.5 h-3.5" /> Verified via {verifyMethod === "dual" ? "Phone & Email" : verifyMethod === "phone" ? "SMS" : "Email"}
                    </span>
                  </div>
                  {phone && (
                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider">Phone</span>
                      <span className="font-mono font-bold text-slate-700">{phone}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider">Curriculum</span>
                    <span className="font-semibold text-slate-700">{curriculum}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider">Study Type</span>
                    <span className="font-semibold text-slate-700">Solo Independent Learner</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 space-y-3">
                <button
                  type="button"
                  onClick={handleFinish}
                  className="w-full bg-[#15223F] hover:bg-[#1E293B] text-white font-bold py-4 rounded-2xl text-xs md:text-sm tracking-wide transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Finish</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
