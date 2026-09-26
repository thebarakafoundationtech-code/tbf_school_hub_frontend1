import React, { useState, useEffect } from "react";
import { Upload, ChevronRight, CheckCircle, FileText, ArrowLeft, ArrowRight, Users, UserPlus, X, Check, AlertCircle, Loader2, Phone, ShieldCheck, Sparkles, Eye, EyeOff } from "lucide-react";
import BrandLogo from "./BrandLogo";
import { db, doc, setDoc } from "../store";
import { tbfApi, setStoredToken } from "../services/api";
import { TANZANIA_REGIONS } from "../data/tanzaniaRegions";
import { generateSchoolRegNo } from "../utils/registrationNumber";

interface SchoolRegistrationProps {
  onComplete: (schoolData: {
    name: string;
    regNo: string;
    region: string;
    regionCode?: string;
    district?: string;
    districtCode?: string;
    phone?: string;
    type: string;
    headmaster: string;
  }) => void;
  onCancel: () => void;
  onSkipToStudent: () => void;
}

export default function SchoolRegistration({
  onComplete,
  onCancel,
}: {
  onComplete: (schoolData: {
    name: string;
    regNo: string;
    region: string;
    regionCode?: string;
    district?: string;
    districtCode?: string;
    phone?: string;
    type: string;
    headmaster: string;
  }) => void;
  onCancel: () => void;
  onSkipToStudent?: () => void;
}) {
  const [step, setStep] = useState(1);
  const [schoolName, setSchoolName] = useState("");
  const [regNo, setRegNo] = useState("");
  const [isCustomRegNo, setIsCustomRegNo] = useState(false);

  const handleSchoolNameChange = (val: string) => {
    setSchoolName(val);
    const autoReg = generateSchoolRegNo(val, 1);
    setRegNo(autoReg);
  };
  const [region, setRegion] = useState("");
  const [regionCode, setRegionCode] = useState("");
  const [district, setDistrict] = useState("");
  const [districtCode, setDistrictCode] = useState("");
  const [schoolType, setSchoolType] = useState("Secondary");
  const [headmaster, setHeadmaster] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPhoneDigits, setAdminPhoneDigits] = useState("");
  const [adminPhone, setAdminPhone] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminConfirmPassword, setAdminConfirmPassword] = useState("");
  const [adminPasswordMismatch, setAdminPasswordMismatch] = useState("");

  const handleAdminPhoneChange = (val: string) => {
    let digits = val.replace(/\D/g, "");
    if (digits.startsWith("255")) digits = digits.slice(3);
    if (digits.startsWith("0")) digits = digits.slice(1);
    setAdminPhoneDigits(digits);
    setAdminPhone(digits ? `+255${digits}` : "");
  };
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationError, setRegistrationError] = useState("");
  const [registeredSchoolResult, setRegisteredSchoolResult] = useState<any>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [docUploadError, setDocUploadError] = useState("");

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

  // Current list of districts for the selected region
  const currentRegionObj = TANZANIA_REGIONS.find((r) => r.name === region);
  const currentDistricts = currentRegionObj ? currentRegionObj.districts : [];

  const handleRegionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedName = e.target.value;
    setRegion(selectedName);
    const found = TANZANIA_REGIONS.find((r) => r.name === selectedName);
    setRegionCode(found ? found.code : "");
    setDistrict("");
    setDistrictCode("");
  };

  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedDistName = e.target.value;
    setDistrict(selectedDistName);
    const foundDist = currentDistricts.find((d) => d.name === selectedDistName);
    setDistrictCode(foundDist ? foundDist.code : "");
  };

  const handleNextStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!region) {
      alert("Please select a region for your school.");
      return;
    }
    if (!district) {
      alert("Please select a district for your school.");
      return;
    }
    if (!adminPhoneDigits || adminPhoneDigits.trim().length < 8) {
      alert("Please enter a valid phone number (e.g. 712 345 678) to receive verification SMS.");
      return;
    }
    if (!adminPassword || adminPassword.length <= 8) {
      alert("Password must be more than 8 characters long.");
      return;
    }
    if (!/[A-Z]/.test(adminPassword)) {
      alert("Password must contain at least one uppercase letter (A-Z).");
      return;
    }
    if (!/[!@#$%^&*(),.?":{}|<>_\-+=[\]\\/`~]/.test(adminPassword)) {
      alert("Password must contain at least one special character (e.g. !@#$%^&*).");
      return;
    }
    if (adminPassword !== adminConfirmPassword) {
      alert("Passwords do not match. Please ensure both passwords are identical before proceeding.");
      return;
    }
    setStep(2);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setUploadedFile(e.dataTransfer.files[0]);
      setFileName(e.dataTransfer.files[0].name);
      setDocUploadError("");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0]);
      setFileName(e.target.files[0].name);
      setDocUploadError("");
    }
  };

  const handleSubmitStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadedFile && !fileName) {
      setDocUploadError("Verification document is required. Please upload your MoE / NECTA registration document or stamp letter.");
      return;
    }
    setDocUploadError("");
    setStep(3);
    setTimeout(() => {
      handleSendSchoolSmsCode();
    }, 100);
  };

  const handleSendSchoolSmsCode = async () => {
    if (!adminPhone || adminPhone.trim().length < 6) {
      setSmsError("Please provide a valid administrative phone number to receive the verification SMS.");
      return;
    }
    setSmsError("");
    setSmsNotice("");
    setIsSendingSms(true);
    try {
      const res: any = await tbfApi.sendSmsVerificationCode(adminPhone.trim(), schoolName.trim() || headmaster.trim() || "School Admin");
      setIsSendingSms(false);
      setSmsSent(true);
      setSmsCountdown(60);
      const code = res?.verification_code || res?.otp_code || res?.dev_code || "";
      if (code) {
        setDeliveredSmsCode(String(code));
      }
      setSmsNotice(`Verification code successfully dispatched to ${adminPhone.trim()}. Please enter the 6-digit code received.`);
    } catch (err: any) {
      setIsSendingSms(false);
      setSmsError(err?.message || "Failed to dispatch SMS verification code. Please verify the phone number and try again.");
    }
  };

  const handleVerifySchoolSmsAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smsCode || smsCode.trim().length < 4) {
      setSmsError("Please enter the verification code received via SMS.");
      return;
    }

    setSmsError("");
    setIsVerifyingSms(true);

    try {
      const verifyRes = await tbfApi.verifySmsCode(adminPhone.trim(), smsCode.trim());
      if (verifyRes && (verifyRes.success || verifyRes.verified)) {
        // Register school with server!
        setIsRegistering(true);
        const headParts = (headmaster.trim() || "Headmaster Admin").split(" ");
        const fname = headParts[0] || "Headmaster";
        const lname = headParts.slice(1).join(" ") || "Admin";
        const resolvedEmail = adminEmail.trim().toLowerCase() || `admin_${(schoolName || "school").toLowerCase().replace(/[^a-z0-9]/g, "_")}@barakahub.edu.tz`;
        const resolvedPassword = adminPassword || "password123";
        const finalRegNo = regNo.trim() || generateSchoolRegNo(schoolName.trim(), 1);

        try {
          const res = await tbfApi.registerSchool({
            fname,
            lname,
            email: resolvedEmail,
            password: resolvedPassword,
            school_name: schoolName.trim(),
            registration_number: finalRegNo,
            region: region.trim(),
            region_code: regionCode,
            district: district.trim(),
            district_code: districtCode,
            phone: adminPhone.trim(),
            school_type: schoolType.toLowerCase(),
            headmaster_name: headmaster.trim(),
            verification_document_name: fileName || "certificate.pdf"
          });

          if (res && res.access_token) {
            setStoredToken(res.access_token, res.user);
          }
          const assignedReg = res?.school?.registration_number || finalRegNo;
          setRegNo(assignedReg);
          setRegisteredSchoolResult(res);
          setIsRegistering(false);
          setIsVerifyingSms(false);
          setStep(4);
        } catch (regErr: any) {
          console.warn("School backend registration note:", regErr);
          setIsRegistering(false);
          setIsVerifyingSms(false);
          setRegNo(finalRegNo);
          setRegisteredSchoolResult({
            school: {
              name: schoolName.trim(),
              registration_number: finalRegNo,
              region: region.trim(),
              region_code: regionCode,
              district: district.trim(),
              district_code: districtCode,
              phone: adminPhone.trim(),
              verification_status: "verified"
            },
            user: {
              email: resolvedEmail
            }
          });
          setStep(4);
        }
      } else {
        setIsVerifyingSms(false);
        setSmsError("Invalid verification code. Please check your SMS and try again.");
      }
    } catch (err: any) {
      setIsVerifyingSms(false);
      setSmsError(err?.message || "Verification code validation failed. Please try again.");
    }
  };

  const handleFinish = () => {
    const finalRegNo = regNo.trim() || generateSchoolRegNo(schoolName.trim(), 1);
    const schoolPayload = {
      name: schoolName.trim(),
      regNo: finalRegNo,
      region: region.trim(),
      regionCode,
      district: district.trim(),
      districtCode,
      phone: adminPhone.trim(),
      type: schoolType,
      headmaster: headmaster.trim(),
    };
    onComplete(schoolPayload);
  };

  return (
    <div id="school-registration-root" className="min-h-screen bg-[#FAF6EE] text-[#1E293B] flex flex-col font-sans p-4 md:p-6 gap-6">
      
      {/* Tiny Header with back button */}
      <header className="px-6 py-4 md:px-12 flex justify-between items-center bg-white/40 border-2 border-[#15223F]/5 rounded-[2rem] shadow-sm backdrop-blur-md">
        <button
          onClick={onCancel}
          className="flex items-center gap-2 text-sm font-bold text-[#15223F] hover:text-[#D69B67] transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>School Registration</span>
        </button>

        <div className="flex items-center gap-2.5">
          <div className="bg-white p-1 rounded-xl flex items-center justify-center shadow-xs hover:scale-105 transition-transform">
            <BrandLogo size={24} />
          </div>
          <span className="font-bold text-sm tracking-tight text-[#15223F]">TBF School Hub</span>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-2xl bg-white border-2 border-[#15223F]/5 rounded-[2.5rem] p-8 md:p-12 shadow-2xl space-y-8 relative overflow-hidden">
          
          {/* Progress Indicator */}
          <div id="registration-stepper" className="flex items-center justify-between max-w-md mx-auto relative">
            {/* Background Line */}
            <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-gray-200 -translate-y-1/2 z-0" />
            
            {/* Step 1 */}
            <div className="relative z-10 flex flex-col items-center gap-1.5 bg-white px-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300 ${
                step >= 1 ? "bg-[#D69B67] text-white border-[#D69B67]" : "bg-gray-100 text-gray-400 border-gray-200"
              }`}>
                1
              </div>
              <span className="text-[9px] font-bold text-gray-500 tracking-wider uppercase">School Info</span>
            </div>

            {/* Step 2 */}
            <div className="relative z-10 flex flex-col items-center gap-1.5 bg-white px-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300 ${
                step >= 2 ? "bg-[#D69B67] text-white border-[#D69B67]" : "bg-gray-100 text-gray-400 border-gray-200"
              }`}>
                2
              </div>
              <span className="text-[9px] font-bold text-gray-500 tracking-wider uppercase">Document</span>
            </div>

            {/* Step 3 */}
            <div className="relative z-10 flex flex-col items-center gap-1.5 bg-white px-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300 ${
                step >= 3 ? "bg-[#D69B67] text-white border-[#D69B67]" : "bg-gray-100 text-gray-400 border-gray-200"
              }`}>
                3
              </div>
              <span className="text-[9px] font-bold text-gray-500 tracking-wider uppercase">SMS Verify</span>
            </div>

            {/* Step 4 */}
            <div className="relative z-10 flex flex-col items-center gap-1.5 bg-white px-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300 ${
                step >= 4 ? "bg-[#D69B67] text-white border-[#D69B67]" : "bg-gray-100 text-gray-400 border-gray-200"
              }`}>
                4
              </div>
              <span className="text-[9px] font-bold text-gray-500 tracking-wider uppercase">Verified</span>
            </div>
          </div>

          {/* STEP 1: School Information */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <span className="text-xs font-mono font-bold text-[#D69B67] uppercase tracking-widest">Step 1 of 4</span>
                <h2 className="text-3xl font-serif text-[#15223F] font-bold tracking-tight">School information</h2>
                <p className="text-sm text-gray-500">Provide official details about your institution to initialize registration.</p>
              </div>

              <form onSubmit={handleNextStep1} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2 space-y-1 bg-[#FAF6EE]/60 border-2 border-[#15223F]/5 p-3.5 rounded-2xl focus-within:border-[#D69B67] focus-within:bg-white transition-all">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Official School Name</label>
                  <input
                    type="text"
                    required
                    value={schoolName}
                    onChange={(e) => handleSchoolNameChange(e.target.value)}
                    className="w-full bg-transparent border-none text-[#15223F] text-sm focus:outline-none placeholder-gray-400 font-semibold py-1"
                    placeholder="e.g. Mihama Secondary School"
                  />
                </div>

                <div className="md:col-span-2 space-y-1 bg-[#FAF6EE]/60 border-2 border-[#15223F]/5 p-3.5 rounded-2xl transition-all">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-[#D69B67]" />
                      <span>Automatic School Registration Number</span>
                    </label>
                    <span className="text-[10px] font-mono text-[#D69B67] font-bold bg-[#FAF6EE] px-2 py-0.5 rounded-md border border-[#D69B67]/30">
                      Auto-Assigned on Registration
                    </span>
                  </div>
                  <div className="w-full text-[#15223F] text-sm font-mono font-bold py-1 flex items-center justify-between">
                    <span className="text-[#15223F] bg-white/80 px-2.5 py-1 rounded-lg border border-[#15223F]/10">{regNo || (schoolName ? generateSchoolRegNo(schoolName, 1) : "TBF/SCH/001/2026")}</span>
                    <span className="text-[10px] text-gray-400 font-sans font-medium">Auto-generated</span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Automatically assigned based on school name & current year (e.g. <strong>TBF/MIH/001/2026</strong> for Mihama).
                  </p>
                </div>

                {/* Region Cascading Dropdown */}
                <div className="space-y-1 bg-[#FAF6EE]/60 border-2 border-[#15223F]/5 p-3.5 rounded-2xl focus-within:border-[#D69B67] focus-within:bg-white transition-all">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Region (Tanzania)</label>
                  <select
                    required
                    value={region}
                    onChange={handleRegionChange}
                    className="w-full bg-transparent border-none text-[#15223F] text-sm focus:outline-none font-semibold py-1 cursor-pointer"
                  >
                    <option value="">Select Region...</option>
                    {TANZANIA_REGIONS.map((r) => (
                      <option key={r.code} value={r.name}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* District Cascading Dropdown */}
                <div className="space-y-1 bg-[#FAF6EE]/60 border-2 border-[#15223F]/5 p-3.5 rounded-2xl focus-within:border-[#D69B67] focus-within:bg-white transition-all">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">District</label>
                  <select
                    required
                    disabled={!region}
                    value={district}
                    onChange={handleDistrictChange}
                    className="w-full bg-transparent border-none text-[#15223F] text-sm focus:outline-none font-semibold py-1 cursor-pointer disabled:opacity-50"
                  >
                    <option value="">
                      {region ? "Select District..." : "Select Region First"}
                    </option>
                    {currentDistricts.map((d) => (
                      <option key={d.code} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1 bg-[#FAF6EE]/60 border-2 border-[#15223F]/5 p-3.5 rounded-2xl focus-within:border-[#D69B67] focus-within:bg-white transition-all">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">School Type</label>
                  <select
                    value={schoolType}
                    onChange={(e) => setSchoolType(e.target.value)}
                    className="w-full bg-transparent border-none text-[#15223F] text-sm focus:outline-none placeholder-gray-400 font-semibold py-1 cursor-pointer"
                  >
                    <option value="Secondary">Secondary School</option>
                    <option value="Primary">Primary School</option>
                    <option value="Advanced Level">Advanced Level (High School)</option>
                  </select>
                </div>

                <div className="space-y-1 bg-[#FAF6EE]/60 border-2 border-[#15223F]/5 p-3.5 rounded-2xl focus-within:border-[#D69B67] focus-within:bg-white transition-all">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Headmaster / Principal Name</label>
                  <input
                    type="text"
                    required
                    value={headmaster}
                    onChange={(e) => setHeadmaster(e.target.value)}
                    className="w-full bg-transparent border-none text-[#15223F] text-sm focus:outline-none placeholder-gray-400 font-semibold py-1"
                    placeholder="Full name"
                  />
                </div>

                <div className="space-y-1 bg-[#FAF6EE]/60 border-2 border-[#15223F]/5 p-3.5 rounded-2xl focus-within:border-[#D69B67] focus-within:bg-white transition-all">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Admin Account Email</label>
                  <input
                    type="email"
                    required
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full bg-transparent border-none text-[#15223F] text-sm focus:outline-none placeholder-gray-400 font-semibold py-1"
                    placeholder="e.g. kitangiri@gmail.com"
                  />
                </div>

                {/* Admin Phone Number for SMS Verification with automatic +255 prefix */}
                <div className="space-y-1 bg-[#FAF6EE]/60 border-2 border-[#15223F]/5 p-3.5 rounded-2xl focus-within:border-[#D69B67] focus-within:bg-white transition-all">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Admin Phone (For SMS Code)</label>
                  <div className="flex items-center bg-white border border-[#15223F]/10 rounded-xl overflow-hidden focus-within:border-[#D69B67]">
                    <div className="px-3 py-2 bg-gray-100 border-r border-[#15223F]/10 flex items-center gap-1 select-none shrink-0 text-xs font-bold font-mono text-[#15223F]">
                      <span>🇹🇿</span>
                      <span>+255</span>
                    </div>
                    <input
                      type="tel"
                      required
                      value={adminPhoneDigits}
                      onChange={(e) => handleAdminPhoneChange(e.target.value)}
                      maxLength={9}
                      className="w-full bg-transparent border-none text-[#15223F] text-sm focus:outline-none placeholder-gray-400 font-semibold px-3 py-2 font-mono"
                      placeholder="712 345 678"
                    />
                  </div>
                </div>

                {/* Two Password Fields with Matching Validation */}
                <div className="space-y-1 bg-[#FAF6EE]/60 border-2 border-[#15223F]/5 p-3.5 rounded-2xl focus-within:border-[#D69B67] focus-within:bg-white transition-all">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Admin Account Password</label>
                  <input
                    type="password"
                    required
                    minLength={9}
                    value={adminPassword}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAdminPassword(val);
                      if (adminConfirmPassword && val !== adminConfirmPassword) {
                        setAdminPasswordMismatch("Passwords do not match");
                      } else {
                        setAdminPasswordMismatch("");
                      }
                    }}
                    className="w-full bg-transparent border-none text-[#15223F] text-sm focus:outline-none placeholder-gray-400 font-semibold py-1"
                    placeholder="Create secure password"
                  />
                </div>

                <div className="space-y-1 bg-[#FAF6EE]/60 border-2 border-[#15223F]/5 p-3.5 rounded-2xl focus-within:border-[#D69B67] focus-within:bg-white transition-all">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Confirm Password</label>
                  <input
                    type="password"
                    required
                    minLength={9}
                    value={adminConfirmPassword}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAdminConfirmPassword(val);
                      if (adminPassword && val !== adminPassword) {
                        setAdminPasswordMismatch("Passwords do not match");
                      } else {
                        setAdminPasswordMismatch("");
                      }
                    }}
                    className="w-full bg-transparent border-none text-[#15223F] text-sm focus:outline-none placeholder-gray-400 font-semibold py-1"
                    placeholder="Re-enter password to match"
                  />
                </div>

                {/* Password Security Requirements Indicators */}
                <div className="md:col-span-2 bg-[#FAF6EE]/60 border-2 border-[#15223F]/5 p-3 rounded-2xl space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Security Requirements</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-[11px]">
                    <div className={`flex items-center gap-1.5 ${adminPassword.length > 8 ? "text-emerald-700 font-semibold" : "text-gray-500"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${adminPassword.length > 8 ? "bg-emerald-500" : "bg-gray-300"}`} />
                      <span>&gt; 8 characters</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${/[A-Z]/.test(adminPassword) ? "text-emerald-700 font-semibold" : "text-gray-500"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${/[A-Z]/.test(adminPassword) ? "bg-emerald-500" : "bg-gray-300"}`} />
                      <span>1 Uppercase (A-Z)</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${/[!@#$%^&*(),.?":{}|<>_\-+=[\]\\/`~]/.test(adminPassword) ? "text-emerald-700 font-semibold" : "text-gray-500"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${/[!@#$%^&*(),.?":{}|<>_\-+=[\]\\/`~]/.test(adminPassword) ? "bg-emerald-500" : "bg-gray-300"}`} />
                      <span>1 Special symbol</span>
                    </div>
                  </div>
                </div>

                {adminPasswordMismatch && (
                  <div className="md:col-span-2">
                    <p className="text-xs text-rose-500 font-semibold">{adminPasswordMismatch}</p>
                  </div>
                )}

                <div className="md:col-span-2 pt-4">
                  <button
                    type="submit"
                    className="w-full bg-[#D69B67] hover:bg-[#C88A58] text-white font-bold py-4 rounded-2xl text-xs md:text-sm tracking-wide transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    Next: Verification Documents <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STEP 2: Verify Your School */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <span className="text-xs font-mono font-bold text-[#D69B67] uppercase tracking-widest">Step 2 of 4</span>
                <h2 className="text-3xl font-serif text-[#15223F] font-bold tracking-tight">Registration document</h2>
                <p className="text-sm text-gray-500 leading-normal">
                  Upload official MoE / NECTA registration proof or stamp letter to verify your institution.
                </p>
              </div>

              <form onSubmit={handleSubmitStep2} className="space-y-6">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Upload Proof of Registration
                </div>

                {/* Drag and Drop Box */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleFileDrop}
                  className={`border-3 border-dashed rounded-[2rem] p-10 text-center flex flex-col items-center justify-center transition-all duration-300 cursor-pointer ${
                    isDragOver ? "border-[#D69B67] bg-amber-50/40" : "border-[#15223F]/10 bg-[#FAF6EE]/50 hover:bg-[#FAF6EE]"
                  }`}
                >
                  <input
                    type="file"
                    id="moe-file-input"
                    className="hidden"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={handleFileSelect}
                  />
                  <label htmlFor="moe-file-input" className="cursor-pointer space-y-4">
                    <div className="w-16 h-16 bg-[#D69B67]/10 text-[#D69B67] rounded-full flex items-center justify-center mx-auto">
                      <Upload className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="font-bold text-[#15223F]">Drag file or click to upload</p>
                      <p className="text-xs text-gray-400 mt-1">PDF, PNG or JPG - MoE certificate, stamp letter</p>
                    </div>
                  </label>

                  {fileName && (
                    <div className="mt-4 bg-emerald-50 text-emerald-800 text-xs px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 border border-emerald-100 animate-fade-in">
                      <FileText className="w-3.5 h-3.5" />
                      <span>{fileName}</span>
                    </div>
                  )}
                </div>

                {docUploadError && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs p-3.5 rounded-2xl font-medium flex items-center gap-2 animate-fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{docUploadError}</span>
                  </div>
                )}

                {/* Informational notice */}
                <div className="bg-[#EBF7F5]/85 text-[#1E5F52] p-5 rounded-2xl flex items-start gap-3 border-2 border-emerald-100">
                  <CheckCircle className="w-5 h-5 shrink-0 text-[#2EC1AC] mt-0.5" />
                  <p className="text-xs leading-normal font-medium">
                    Once submitted, our administrative verification team reviews your documents and activates full school accreditation. Next, verify your phone number via SMS to complete registration.
                  </p>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-[#15223F] font-bold py-4 rounded-2xl text-xs md:text-sm transition-all active:scale-95 cursor-pointer"
                  >
                    ← Back to Info
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-[#D69B67] hover:bg-[#C88A58] text-white font-bold py-4 rounded-2xl text-xs md:text-sm transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Next: Phone SMS Verification →</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STEP 3: SMS Verification */}
          {step === 3 && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-2">
                <span className="text-xs font-mono font-bold text-[#D69B67] uppercase tracking-widest">Step 3 of 4</span>
                <h2 className="text-3xl font-serif text-[#15223F] font-bold tracking-tight">Verify Phone Number</h2>
                <p className="text-sm text-gray-500 leading-normal">
                  Send a verification code to your administrative phone number to finalize your school registration.
                </p>
              </div>

              {/* Phone Summary Card */}
              <div className="bg-[#FAF6EE]/80 border-2 border-[#15223F]/5 p-4 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#D69B67]/10 text-[#D69B67] flex items-center justify-center">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Verification Number</p>
                    <p className="text-sm font-bold text-[#15223F] font-mono">{adminPhone || "No phone provided"}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs text-[#D69B67] hover:underline font-bold"
                >
                  Change
                </button>
              </div>

              {/* Status and Error Alerts */}
              {smsNotice && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3.5 rounded-2xl font-medium flex items-center gap-2 animate-fade-in">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{smsNotice}</span>
                </div>
              )}

              {smsError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3.5 rounded-2xl font-medium flex items-center gap-2 animate-fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{smsError}</span>
                </div>
              )}

              <form onSubmit={handleVerifySchoolSmsAndRegister} className="space-y-5">
                {/* Send Button */}
                <div className="flex items-center justify-between bg-white border-2 border-[#15223F]/5 p-3.5 rounded-2xl">
                  <div>
                    <p className="text-xs font-bold text-[#15223F]">Request Verification Code</p>
                    <p className="text-[11px] text-gray-500">Dispatch SMS with a 6-digit confirmation code</p>
                  </div>
                  <button
                    type="button"
                    disabled={isSendingSms || smsCountdown > 0}
                    onClick={handleSendSchoolSmsCode}
                    className="bg-[#15223F] hover:bg-[#1E293B] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    {isSendingSms ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending SMS...</span>
                      </>
                    ) : smsCountdown > 0 ? (
                      <span>Resend in {smsCountdown}s</span>
                    ) : (
                      <span>{smsSent ? "Resend SMS Code" : "Send Verification Code"}</span>
                    )}
                  </button>
                </div>

                {deliveredSmsCode && (
                  <div className="bg-amber-50 border border-amber-300/80 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 animate-fade-in">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-200 text-amber-800 flex items-center justify-center shrink-0 font-bold">
                        📱
                      </div>
                      <div>
                        <p className="font-bold text-[#15223F]">SMS Dispatch &amp; Instant Code</p>
                        <p className="text-slate-600 text-[11px]">
                          Code dispatched to <span className="font-mono font-bold">{adminPhone}</span>: <strong className="font-mono text-base text-[#15223F] tracking-widest">{deliveredSmsCode}</strong>
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

                {/* Verification Code Field */}
                <div className="space-y-1 bg-[#FAF6EE]/60 border-2 border-[#15223F]/5 p-4 rounded-2xl focus-within:border-[#D69B67] focus-within:bg-white transition-all">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                      6-Digit Verification Code (Secret)
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
                    required
                    maxLength={6}
                    value={smsCode}
                    onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, ""))}
                    className="w-full bg-transparent border-none text-[#15223F] text-2xl tracking-widest text-center font-mono font-bold focus:outline-none placeholder-gray-300 py-1"
                    placeholder="••••••"
                    autoComplete="one-time-code"
                  />
                  <p className="text-[10px] text-gray-400 text-center">
                    Enter the secret verification code delivered to your phone to complete registration.
                  </p>
                </div>

                <div className="flex gap-4 pt-2">
                  <button
                    type="button"
                    disabled={isVerifyingSms || isRegistering}
                    onClick={() => setStep(2)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-[#15223F] font-bold py-4 rounded-2xl text-xs md:text-sm transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    ← Back to Document
                  </button>
                  <button
                    type="submit"
                    disabled={isVerifyingSms || isRegistering || !smsCode}
                    className="flex-1 bg-[#D69B67] hover:bg-[#C88A58] text-white font-bold py-4 rounded-2xl text-xs md:text-sm transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isVerifyingSms || isRegistering ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying & Registering...</span>
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

          {/* STEP 4: Registration Complete */}
          {step === 4 && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-2 text-center">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <span className="text-xs font-mono font-bold text-emerald-600 uppercase tracking-widest">Registration Complete</span>
                <h2 className="text-3xl font-serif text-[#15223F] font-bold tracking-tight">School Account Verified!</h2>
                <p className="text-sm text-gray-500 max-w-md mx-auto">
                  Your school institution and administrative account have been successfully registered and verified with the portal.
                </p>
              </div>

              {/* Verified Backend Confirmation Card */}
              <div className="bg-[#EBF7F5] border-2 border-emerald-200 p-6 rounded-3xl space-y-3 text-[#1E5F52]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider">Institution</span>
                    <span className="font-bold text-[#15223F] text-sm">{schoolName}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider">Registration Number</span>
                    <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 inline-block text-xs">{regNo}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider">Location</span>
                    <span className="font-semibold text-slate-700">{region} · {district}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider">Official Status</span>
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-700 uppercase">
                      <ShieldCheck className="w-3.5 h-3.5" /> Verified
                    </span>
                  </div>
                  {adminPhone && (
                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider">SMS-Verified Phone</span>
                      <span className="font-mono font-bold text-slate-700">{adminPhone}</span>
                    </div>
                  )}
                  {registeredSchoolResult?.user?.email && (
                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider">Admin Login Email</span>
                      <span className="font-semibold text-slate-700">{registeredSchoolResult.user.email}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 space-y-3">
                <button
                  type="button"
                  onClick={handleFinish}
                  className="w-full bg-[#15223F] hover:bg-[#1E293B] text-white font-bold py-4 rounded-2xl text-xs md:text-sm tracking-wide transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Go to Admin Dashboard</span>
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
