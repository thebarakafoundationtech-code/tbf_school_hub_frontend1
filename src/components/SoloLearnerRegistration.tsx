import React, { useState, useEffect } from "react";
import { CheckCircle, ArrowLeft, ArrowRight, Loader2, Phone, ShieldCheck, AlertCircle, Eye, EyeOff, ChevronRight, Sparkles } from "lucide-react";
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

  // SMS Verification States
  const [smsCode, setSmsCode] = useState("");
  const [deliveredSmsCode, setDeliveredSmsCode] = useState("");
  const [showSmsSecret, setShowSmsSecret] = useState(false);
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [isVerifyingSms, setIsVerifyingSms] = useState(false);
  const [smsSent, setSmsSent] = useState(false);
  const [smsCountdown, setSmsCountdown] = useState(0);
  const [smsError, setSmsError] = useState("");
  const [smsNotice, setSmsNotice] = useState("");
  const [registeredStudentResult, setRegisteredStudentResult] = useState<any>(null);

  const handlePhoneChange = (val: string) => {
    let digits = val.replace(/\D/g, "");
    if (digits.startsWith("255")) digits = digits.slice(3);
    if (digits.startsWith("0")) digits = digits.slice(1);
    setPhoneDigits(digits);
    setPhone(digits ? `+255${digits}` : "");
  };

  // SMS Countdown timer
  useEffect(() => {
    let timer: any;
    if (smsCountdown > 0) {
      timer = setInterval(() => {
        setSmsCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [smsCountdown]);

  const handleSendSmsCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!phone || phoneDigits.length < 9) {
      setSmsError("Please enter a valid 9-digit Tanzanian mobile phone number.");
      return;
    }
    setIsSendingSms(true);
    setSmsError("");
    setSmsNotice("");
    try {
      const learnerName = `${firstName.trim()} ${lastName.trim()}`.trim() || "Solo Learner";
      const res: any = await tbfApi.sendSmsVerificationCode(phone, learnerName);
      setIsSendingSms(false);
      setSmsSent(true);
      setSmsCountdown(60);
      const code = res?.verification_code || res?.otp_code || res?.dev_code || "";
      if (code) {
        setDeliveredSmsCode(String(code));
      }
      setSmsNotice(`Verification code successfully dispatched to ${phone}. Please enter the 6-digit code received.`);
    } catch (err: any) {
      setIsSendingSms(false);
      setSmsError(err?.message || "Failed to send SMS code. Please verify your phone number and try again.");
    }
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
    setStep(2);
    handleSendSmsCode();
  };

  const handleVerifySmsAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smsCode || smsCode.length < 4) {
      setSmsError("Please enter the verification code sent to your phone.");
      return;
    }
    setIsVerifyingSms(true);
    setSmsError("");

    try {
      const verifyRes: any = await tbfApi.verifySmsCode(phone, smsCode.trim());
      if (!verifyRes || !verifyRes.verified) {
        setIsVerifyingSms(false);
        setSmsError(verifyRes?.error || "Invalid verification code. Please check your SMS and try again.");
        return;
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
        phone_verified: true,
        regNo: autoReg,
        registration_number: autoReg,
      };

      const regResult: any = await tbfApi.registerSoloLearner(studentPayload);
      const finalReg = regResult?.user?.regNo || regResult?.user?.student_id || autoReg;
      setLearnerRegNo(finalReg);
      setIsVerifyingSms(false);
      setRegisteredStudentResult(regResult);
      setStep(3);
    } catch (err: any) {
      setIsVerifyingSms(false);
      setSmsError(err?.message || "Failed to complete registration. Please try again.");
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
                    <span>Next: Phone SMS Verification</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STEP 2: SMS Verification */}
          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-2">
                <span className="text-xs font-mono font-bold text-[#D69B67] uppercase tracking-widest">Step 2 of 3</span>
                <h2 className="text-3xl font-serif text-[#15223F] font-bold tracking-tight">Verify Phone Number</h2>
                <p className="text-sm text-gray-500 leading-normal">
                  Enter the verification code dispatched via SMS to your phone to activate your solo learner account.
                </p>
              </div>

              {/* Phone dispatch summary */}
              <div className="bg-[#FAF6EE]/80 border-2 border-[#15223F]/5 p-4 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#D69B67]/10 text-[#D69B67] flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Verification Phone</span>
                    <span className="font-mono font-bold text-sm text-[#15223F]">{phone}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs font-bold text-[#D69B67] hover:underline cursor-pointer"
                >
                  Change Number
                </button>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => handleSendSmsCode()}
                  disabled={isSendingSms || (smsSent && smsCountdown > 0)}
                  className="text-xs font-bold text-[#15223F] hover:text-[#D69B67] transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
                >
                  {isSendingSms ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending SMS...</span>
                    </>
                  ) : smsSent && smsCountdown > 0 ? (
                    <span>Resend Code in {smsCountdown}s</span>
                  ) : (
                    <span>Resend Verification Code</span>
                  )}
                </button>
              </div>

              {smsNotice && (
                <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl flex items-center gap-2 font-medium">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{smsNotice}</span>
                </div>
              )}

              {smsError && (
                <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 p-3.5 rounded-2xl flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{smsError}</span>
                </div>
              )}

              {deliveredSmsCode && (
                <div className="bg-amber-50 border border-amber-300/80 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 animate-fade-in">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-200 text-amber-800 flex items-center justify-center shrink-0 font-bold">
                      📱
                    </div>
                    <div>
                      <p className="font-bold text-[#15223F]">SMS Dispatch &amp; Instant Code</p>
                      <p className="text-slate-600 text-[11px]">
                        Code dispatched to <span className="font-mono font-bold">{phone}</span>: <strong className="font-mono text-base text-[#15223F] tracking-widest">{deliveredSmsCode}</strong>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSmsCode(deliveredSmsCode)}
                    className="px-3.5 py-1.5 bg-[#15223F] text-white font-bold rounded-xl text-xs hover:bg-[#1E293B] transition-all cursor-pointer shrink-0"
                  >
                    Auto-fill Code
                  </button>
                </div>
              )}

              <form onSubmit={handleVerifySmsAndRegister} className="space-y-6">
                <div className="space-y-2 bg-[#FAF6EE]/60 border-2 border-[#15223F]/5 p-5 rounded-2xl text-center focus-within:border-[#D69B67] focus-within:bg-white transition-all">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                      Enter 6-Digit SMS Code (Secret)
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowSmsSecret(!showSmsSecret)}
                      className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 cursor-pointer"
                    >
                      {showSmsSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span className="text-[10px]">{showSmsSecret ? "Hide" : "Show"}</span>
                    </button>
                  </div>
                  <input
                    type={showSmsSecret ? "text" : "password"}
                    maxLength={6}
                    value={smsCode}
                    onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    required
                    placeholder="••••••"
                    autoComplete="one-time-code"
                    className="w-full bg-transparent border-none text-center text-2xl font-mono font-bold tracking-[0.4em] text-[#15223F] focus:outline-none py-1"
                  />
                  <p className="text-[11px] text-gray-400">
                    Enter the secret verification code delivered to your phone to complete registration.
                  </p>
                </div>

                <div className="flex gap-4 pt-2">
                  <button
                    type="button"
                    disabled={isVerifyingSms}
                    onClick={() => setStep(1)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-[#15223F] font-bold py-4 rounded-2xl text-xs md:text-sm transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    ← Back to Details
                  </button>
                  <button
                    type="submit"
                    disabled={isVerifyingSms || !smsCode}
                    className="flex-1 bg-[#D69B67] hover:bg-[#C88A58] text-white font-bold py-4 rounded-2xl text-xs md:text-sm transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isVerifyingSms ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Verify &amp; Register</span>
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
                  Your solo learner profile has been verified and registered. You now have full access to study materials, quizzes, and Baraka AI.
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
                    <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider">Account Status</span>
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-700 uppercase">
                      <ShieldCheck className="w-3.5 h-3.5" /> Verified
                    </span>
                  </div>
                  {phone && (
                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider">Verified Phone</span>
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
                  <span>Go to Student Dashboard</span>
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
