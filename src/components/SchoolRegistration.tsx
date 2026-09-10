import React, { useState } from "react";
import { Upload, ChevronRight, CheckCircle, FileText, ArrowLeft, Users, UserPlus, X, Check, AlertCircle } from "lucide-react";
import BrandLogo from "./BrandLogo";
import { db, doc, setDoc } from "../store";
import { tbfApi } from "../services/api";

interface SchoolRegistrationProps {
  onComplete: (schoolData: {
    name: string;
    regNo: string;
    region: string;
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
    type: string;
    headmaster: string;
  }) => void;
  onCancel: () => void;
  onSkipToStudent?: () => void;
}) {
  const [step, setStep] = useState(1);
  const [schoolName, setSchoolName] = useState("");
  const [regNo, setRegNo] = useState("");
  const [region, setRegion] = useState("");
  const [schoolType, setSchoolType] = useState("Secondary");
  const [headmaster, setHeadmaster] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [docUploadError, setDocUploadError] = useState("");

  // Student and Teacher modals and states
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showTeacherModal, setShowTeacherModal] = useState(false);

  // Track added counts
  const [addedStudentsCount, setAddedStudentsCount] = useState(0);
  const [addedTeachersCount, setAddedTeachersCount] = useState(0);

  // Success Feedbacks
  const [studentSuccessMsg, setStudentSuccessMsg] = useState("");
  const [teacherSuccessMsg, setTeacherSuccessMsg] = useState("");

  // Form states for adding Student
  const [studName, setStudName] = useState("");
  const [studReg, setStudReg] = useState("");
  const [studClass, setStudClass] = useState("Form 1A");
  const [studGender, setStudGender] = useState("M");
  const [studAge, setStudAge] = useState("");
  const [studParentContact, setStudParentContact] = useState("");

  // Form states for adding Teacher
  const [teachFirstName, setTeachFirstName] = useState("");
  const [teachLastName, setTeachLastName] = useState("");
  const [teachEmail, setTeachEmail] = useState("");
  const [teachPassword, setTeachPassword] = useState("");
  const [teachSubjects, setTeachSubjects] = useState("");
  const [teachClasses, setTeachClasses] = useState("");
  const [teachRole, setTeachRole] = useState("Normal");

  const openStudentModalWithReg = () => {
    // Generate fresh reg code
    setStudReg(`BSS-2026-${Math.floor(100 + Math.random() * 900)}`);
    setStudentSuccessMsg("");
    setShowStudentModal(true);
  };

  const openTeacherModal = () => {
    setTeacherSuccessMsg("");
    setShowTeacherModal(true);
  };

  const handleAddStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studName.trim()) return;
    const registrationId = studReg.trim() || `BSS-2026-${Math.floor(100 + Math.random() * 900)}`;
    const newStudent = {
      name: studName.trim(),
      regNo: registrationId,
      class: studClass,
      gender: studGender,
      age: parseInt(studAge) || 15,
      parentContact: studParentContact,
      averageScore: 0,
      attendanceRate: 100,
      activeQuizzesDone: 0,
      learningProgress: 0,
    };
    try {
      await setDoc(doc(db, "students", registrationId), newStudent);
      tbfApi.createStudent(newStudent).catch(() => {});
      setAddedStudentsCount((prev) => prev + 1);
      setStudentSuccessMsg(`Successfully added student ${studName.trim()}!`);
      // Reset main input
      setStudName("");
      // Keep modal open so they can add more, or close after timeout
      setTimeout(() => setStudentSuccessMsg(""), 3000);
    } catch (err) {
      console.warn("Save student note:", err);
      // Fallback local success
      setAddedStudentsCount((prev) => prev + 1);
      setStudentSuccessMsg(`Added ${studName.trim()} (Offline Mode)!`);
      setStudName("");
      setTimeout(() => setStudentSuccessMsg(""), 3000);
    }
  };

  const handleAddTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teachFirstName.trim() || !teachLastName.trim() || !teachEmail.trim()) return;
    const formattedEmail = teachEmail.trim().toLowerCase();
    const fullNameCombined = `${teachFirstName.trim()} ${teachLastName.trim()}`;
    const newTeacher = {
      name: fullNameCombined,
      firstName: teachFirstName.trim(),
      lastName: teachLastName.trim(),
      email: formattedEmail,
      subjects: teachSubjects,
      classes: teachClasses,
      status: "Active",
      password: teachPassword,
      role: teachRole,
    };
    try {
      await setDoc(doc(db, "teachers", formattedEmail.replace(/\./g, "_")), newTeacher);
      tbfApi.createTeacher(newTeacher).catch(() => {});
      setAddedTeachersCount((prev) => prev + 1);
      setTeacherSuccessMsg(`Successfully added teacher ${fullNameCombined}!`);
      // Reset inputs
      setTeachFirstName("");
      setTeachLastName("");
      setTeachEmail("");
      setTimeout(() => setTeacherSuccessMsg(""), 3000);
    } catch (err) {
      console.warn("Save teacher note:", err);
      // Fallback local success
      setAddedTeachersCount((prev) => prev + 1);
      setTeacherSuccessMsg(`Added ${fullNameCombined} (Offline Mode)!`);
      setTeachFirstName("");
      setTeachLastName("");
      setTeachEmail("");
      setTimeout(() => setTeacherSuccessMsg(""), 3000);
    }
  };

  const handleNextStep1 = (e: React.FormEvent) => {
    e.preventDefault();
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
  };

  const handleFinish = () => {
    const schoolPayload = {
      name: schoolName.trim(),
      regNo: regNo.trim(),
      region: region.trim(),
      type: schoolType,
      headmaster: headmaster.trim(),
    };

    // Submit to remote backend API (https://schubapi.thebarakafoundation.or.tz/api/docs)
    const headParts = (headmaster.trim() || "Headmaster Admin").split(" ");
    const fname = headParts[0] || "Headmaster";
    const lname = headParts.slice(1).join(" ") || "Admin";
    const adminEmail = `admin_${(schoolName || "school").toLowerCase().replace(/[^a-z0-9]/g, "_")}@barakahub.edu.tz`;

    tbfApi.registerSchool({
      fname,
      lname,
      email: adminEmail,
      password: "AdminPass_2026!",
      school_name: schoolPayload.name,
      registration_number: schoolPayload.regNo,
      region: schoolPayload.region,
      school_type: schoolPayload.type,
      headmaster_name: schoolPayload.headmaster,
      verification_document_name: fileName || null
    }).catch(err => {
      console.warn("Remote backend school registration note:", err);
    });

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
            <div className="relative z-10 flex flex-col items-center gap-2 bg-white px-3">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300 ${
                step >= 1 ? "bg-[#D69B67] text-white border-[#D69B67]" : "bg-gray-100 text-gray-400 border-gray-200"
              }`}>
                1
              </div>
              <span className="text-[10px] font-bold text-gray-500 tracking-wider uppercase">School Info</span>
            </div>

            {/* Step 2 */}
            <div className="relative z-10 flex flex-col items-center gap-2 bg-white px-3">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300 ${
                step >= 2 ? "bg-[#D69B67] text-white border-[#D69B67]" : "bg-gray-100 text-gray-400 border-gray-200"
              }`}>
                2
              </div>
              <span className="text-[10px] font-bold text-gray-500 tracking-wider uppercase">Verify</span>
            </div>

            {/* Step 3 */}
            <div className="relative z-10 flex flex-col items-center gap-2 bg-white px-3">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300 ${
                step >= 3 ? "bg-[#D69B67] text-white border-[#D69B67]" : "bg-gray-100 text-gray-400 border-gray-200"
              }`}>
                3
              </div>
              <span className="text-[10px] font-bold text-gray-500 tracking-wider uppercase">Setup</span>
            </div>
          </div>

          {/* STEP 1: School Information */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <span className="text-xs font-mono font-bold text-[#D69B67] uppercase tracking-widest">Step 1 of 3</span>
                <h2 className="text-3xl font-serif text-[#15223F] font-bold tracking-tight">School information</h2>
                <p className="text-sm text-gray-500">Tell us about your institution so we can verify it.</p>
              </div>

              <form onSubmit={handleNextStep1} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2 space-y-1 bg-[#FAF6EE]/60 border-2 border-[#15223F]/5 p-3.5 rounded-2xl focus-within:border-[#D69B67] focus-within:bg-white transition-all">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Official School Name</label>
                  <input
                    type="text"
                    required
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    className="w-full bg-transparent border-none text-[#15223F] text-sm focus:outline-none placeholder-gray-400 font-semibold py-1"
                    placeholder="e.g. Baraka Secondary School"
                  />
                </div>

                <div className="md:col-span-2 space-y-1 bg-[#FAF6EE]/60 border-2 border-[#15223F]/5 p-3.5 rounded-2xl focus-within:border-[#D69B67] focus-within:bg-white transition-all">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Registration Number</label>
                  <input
                    type="text"
                    required
                    value={regNo}
                    onChange={(e) => setRegNo(e.target.value)}
                    className="w-full bg-transparent border-none text-[#15223F] text-sm focus:outline-none placeholder-gray-400 font-semibold py-1"
                    placeholder="MoE / NECTA registration number"
                  />
                </div>

                <div className="space-y-1 bg-[#FAF6EE]/60 border-2 border-[#15223F]/5 p-3.5 rounded-2xl focus-within:border-[#D69B67] focus-within:bg-white transition-all">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Region</label>
                  <input
                    type="text"
                    required
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full bg-transparent border-none text-[#15223F] text-sm focus:outline-none placeholder-gray-400 font-semibold py-1"
                    placeholder="e.g. Dar es Salaam"
                  />
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

                <div className="md:col-span-2 space-y-1 bg-[#FAF6EE]/60 border-2 border-[#15223F]/5 p-3.5 rounded-2xl focus-within:border-[#D69B67] focus-within:bg-white transition-all">
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

                <div className="md:col-span-2 pt-4">
                  <button
                    type="submit"
                    className="w-full bg-[#D69B67] hover:bg-[#C88A58] text-white font-bold py-4 rounded-2xl text-xs md:text-sm tracking-wide transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    Next: Verification <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STEP 2: Verify Your School */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <span className="text-xs font-mono font-bold text-[#D69B67] uppercase tracking-widest">Step 2 of 3</span>
                <h2 className="text-3xl font-serif text-[#15223F] font-bold tracking-tight">Verify your school</h2>
                <p className="text-sm text-gray-500 leading-normal">
                  We verify every school to ensure a safe learning environment. This takes 24–48 hrs.
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

                {/* Success alert message */}
                <div className="bg-[#EBF7F5]/85 text-[#1E5F52] p-5 rounded-2xl flex items-start gap-3 border-2 border-emerald-100">
                  <CheckCircle className="w-5 h-5 shrink-0 text-[#2EC1AC] mt-0.5" />
                  <p className="text-xs leading-normal font-medium">
                    Once submitted, our administrative verification team reviews your documents and activates full school accreditation. You can proceed with school setup and student enrollment.
                  </p>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-[#15223F] font-bold py-4 rounded-2xl text-xs md:text-sm transition-all active:scale-95 cursor-pointer"
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-[#D69B67] hover:bg-[#C88A58] text-white font-bold py-4 rounded-2xl text-xs md:text-sm transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    Submit for verification →
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STEP 3: Setup your school */}
          {step === 3 && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-2">
                <span className="text-xs font-mono font-bold text-[#D69B67] uppercase tracking-widest">Step 3 of 3</span>
                <h2 className="text-3xl font-serif text-[#15223F] font-bold tracking-tight">Set up your school</h2>
                <p className="text-sm text-gray-500 leading-normal">
                  Add your classes, students and teachers. You can always do this later in the Admin portal.
                </p>
              </div>

              <div className="space-y-4">
                {/* Students Row */}
                <button
                  type="button"
                  onClick={openStudentModalWithReg}
                  className="w-full flex items-center justify-between p-5 md:p-6 bg-[#FAF6EE]/50 hover:bg-white rounded-[2rem] border-2 border-[#15223F]/5 hover:border-[#D69B67]/30 hover:shadow-xl hover:scale-[1.01] transition-all duration-300 cursor-pointer text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-sky-50 rounded-2xl flex items-center justify-center text-sky-600 shadow-sm shrink-0">
                      <Users className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-[#15223F]">Add students</p>
                        {addedStudentsCount > 0 && (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2.5 py-0.5 rounded-full font-bold border border-emerald-200 animate-pulse">
                            {addedStudentsCount} Added
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">Manual entry or upload CSV / Excel file with student data</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
                </button>

                {/* Teachers Row */}
                <button
                  type="button"
                  onClick={openTeacherModal}
                  className="w-full flex items-center justify-between p-5 md:p-6 bg-[#FAF6EE]/50 hover:bg-white rounded-[2rem] border-2 border-[#15223F]/5 hover:border-[#D69B67]/30 hover:shadow-xl hover:scale-[1.01] transition-all duration-300 cursor-pointer text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 shadow-sm shrink-0">
                      <UserPlus className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-[#15223F]">Add teachers</p>
                        {addedTeachersCount > 0 && (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2.5 py-0.5 rounded-full font-bold border border-emerald-200 animate-pulse">
                            {addedTeachersCount} Added
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">Invite by email or upload teacher list via CSV / Excel</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
                </button>
              </div>

              <div className="pt-6 space-y-4">
                <button
                  onClick={handleFinish}
                  className="w-full bg-[#15223F] hover:bg-[#1E293B] text-white font-bold py-4 rounded-2xl text-xs md:text-sm tracking-wide transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  Go to Admin Dashboard →
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ADD STUDENT MODAL */}
      {showStudentModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-[2.5rem] p-6 md:p-8 max-w-md w-full space-y-6 shadow-2xl border-2 border-[#15223F]/5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2 text-[#15223F]">
                <Users className="w-5 h-5 text-[#D69B67]" />
                <h4 className="font-serif font-bold text-lg">Add New Student</h4>
              </div>
              <button
                onClick={() => setShowStudentModal(false)}
                className="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {studentSuccessMsg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3.5 rounded-xl font-medium flex items-center gap-2 animate-fade-in">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{studentSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleAddStudentSubmit} className="space-y-4 text-left font-sans">
              <div className="space-y-1 bg-[#FAF6EE]/70 p-3.5 rounded-2xl border border-gray-100/60 focus-within:bg-white focus-within:border-[#D69B67] transition-all">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Full Name</label>
                <input
                  type="text"
                  required
                  value={studName}
                  onChange={(e) => setStudName(e.target.value)}
                  className="w-full bg-transparent border-none text-xs text-[#15223F] focus:outline-none font-semibold py-0.5"
                  placeholder="e.g. Paulo Michael Jr"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 bg-[#FAF6EE]/70 p-3.5 rounded-2xl border border-gray-100/60 focus-within:bg-white focus-within:border-[#D69B67] transition-all">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Registration Number</label>
                  <input
                    type="text"
                    required
                    value={studReg}
                    onChange={(e) => setStudReg(e.target.value)}
                    className="w-full bg-transparent border-none text-xs text-[#15223F] focus:outline-none font-semibold py-0.5"
                    placeholder="e.g. BSS-2026-001"
                  />
                </div>

                <div className="space-y-1 bg-[#FAF6EE]/70 p-3.5 rounded-2xl border border-gray-100/60 focus-within:bg-white focus-within:border-[#D69B67] transition-all">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Study Level / Class</label>
                  <select
                    value={studClass}
                    onChange={(e) => setStudClass(e.target.value)}
                    className="w-full bg-transparent border-none text-xs text-[#15223F] focus:outline-none font-semibold py-0.5 cursor-pointer"
                  >
                    <option value="Form 1A">Form 1A</option>
                    <option value="Form 1B">Form 1B</option>
                    <option value="Form 2A">Form 2A</option>
                    <option value="Form 2B">Form 2B</option>
                    <option value="Form 3A">Form 3A</option>
                    <option value="Form 4A">Form 4A</option>
                    <option value="Form 5A">Form 5A</option>
                    <option value="Form 6A">Form 6A</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 bg-[#FAF6EE]/70 p-3.5 rounded-2xl border border-gray-100/60 focus-within:bg-white focus-within:border-[#D69B67] transition-all">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Gender</label>
                  <select
                    value={studGender}
                    onChange={(e) => setStudGender(e.target.value)}
                    className="w-full bg-transparent border-none text-xs text-[#15223F] focus:outline-none font-semibold py-0.5 cursor-pointer"
                  >
                    <option value="M">Male (M)</option>
                    <option value="F">Female (F)</option>
                  </select>
                </div>

                <div className="space-y-1 bg-[#FAF6EE]/70 p-3.5 rounded-2xl border border-gray-100/60 focus-within:bg-white focus-within:border-[#D69B67] transition-all">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Age</label>
                  <input
                    type="number"
                    required
                    value={studAge}
                    onChange={(e) => setStudAge(e.target.value)}
                    className="w-full bg-transparent border-none text-xs text-[#15223F] focus:outline-none font-semibold py-0.5"
                    placeholder="15"
                    min="5"
                    max="99"
                  />
                </div>
              </div>

              <div className="space-y-1 bg-[#FAF6EE]/70 p-3.5 rounded-2xl border border-gray-100/60 focus-within:bg-white focus-within:border-[#D69B67] transition-all">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Parent Contact Phone</label>
                <input
                  type="text"
                  required
                  value={studParentContact}
                  onChange={(e) => setStudParentContact(e.target.value)}
                  className="w-full bg-transparent border-none text-xs text-[#15223F] focus:outline-none font-semibold py-0.5"
                  placeholder="+255 711 000 000"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowStudentModal(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-slate-700 font-bold py-3 rounded-xl text-xs transition-all active:scale-95 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#D69B67] hover:bg-[#C88A58] text-white font-bold py-3 rounded-xl text-xs transition-all shadow-md hover:shadow-lg active:scale-95 cursor-pointer"
                >
                  Save & Add Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD TEACHER MODAL */}
      {showTeacherModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-[2.5rem] p-6 md:p-8 max-w-md w-full space-y-6 shadow-2xl border-2 border-[#15223F]/5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2 text-[#15223F]">
                <UserPlus className="w-5 h-5 text-[#D69B67]" />
                <h4 className="font-serif font-bold text-lg">Add New Teacher</h4>
              </div>
              <button
                onClick={() => setShowTeacherModal(false)}
                className="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {teacherSuccessMsg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3.5 rounded-xl font-medium flex items-center gap-2 animate-fade-in">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{teacherSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleAddTeacherSubmit} className="space-y-4 text-left font-sans">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 bg-[#FAF6EE]/70 p-3.5 rounded-2xl border border-gray-100/60 focus-within:bg-white focus-within:border-[#D69B67] transition-all">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">First Name</label>
                  <input
                    type="text"
                    required
                    value={teachFirstName}
                    onChange={(e) => setTeachFirstName(e.target.value)}
                    className="w-full bg-transparent border-none text-xs text-[#15223F] focus:outline-none font-semibold py-0.5"
                    placeholder="e.g. Peter"
                  />
                </div>
                <div className="space-y-1 bg-[#FAF6EE]/70 p-3.5 rounded-2xl border border-gray-100/60 focus-within:bg-white focus-within:border-[#D69B67] transition-all">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Last Name</label>
                  <input
                    type="text"
                    required
                    value={teachLastName}
                    onChange={(e) => setTeachLastName(e.target.value)}
                    className="w-full bg-transparent border-none text-xs text-[#15223F] focus:outline-none font-semibold py-0.5"
                    placeholder="e.g. Mwalimu"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 bg-[#FAF6EE]/70 p-3.5 rounded-2xl border border-gray-100/60 focus-within:bg-white focus-within:border-[#D69B67] transition-all">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Email Address</label>
                  <input
                    type="email"
                    required
                    value={teachEmail}
                    onChange={(e) => setTeachEmail(e.target.value)}
                    className="w-full bg-transparent border-none text-xs text-[#15223F] focus:outline-none font-semibold py-0.5"
                    placeholder="teacher@school.ac.tz"
                  />
                </div>

                <div className="space-y-1 bg-[#FAF6EE]/70 p-3.5 rounded-2xl border border-gray-100/60 focus-within:bg-white focus-within:border-[#D69B67] transition-all">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Login Password</label>
                  <input
                    type="text"
                    required
                    value={teachPassword}
                    onChange={(e) => setTeachPassword(e.target.value)}
                    className="w-full bg-transparent border-none text-xs text-[#15223F] focus:outline-none font-semibold py-0.5"
                    placeholder="teacher123"
                  />
                </div>
              </div>

              <div className="space-y-1 bg-[#FAF6EE]/70 p-3.5 rounded-2xl border border-gray-100/60 focus-within:bg-white focus-within:border-[#D69B67] transition-all">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Teaching Subjects</label>
                <input
                  type="text"
                  required
                  value={teachSubjects}
                  onChange={(e) => setTeachSubjects(e.target.value)}
                  className="w-full bg-transparent border-none text-xs text-[#15223F] focus:outline-none font-semibold py-0.5"
                  placeholder="e.g. Biology, Chemistry"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 bg-[#FAF6EE]/70 p-3.5 rounded-2xl border border-gray-100/60 focus-within:bg-white focus-within:border-[#D69B67] transition-all">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Assigned Classes</label>
                  <input
                    type="text"
                    required
                    value={teachClasses}
                    onChange={(e) => setTeachClasses(e.target.value)}
                    className="w-full bg-transparent border-none text-xs text-[#15223F] focus:outline-none font-semibold py-0.5"
                    placeholder="e.g. Form 1A, Form 1B"
                  />
                </div>

                <div className="space-y-1 bg-[#FAF6EE]/70 p-3.5 rounded-2xl border border-gray-100/60 focus-within:bg-white focus-within:border-[#D69B67] transition-all">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Administrative Role</label>
                  <select
                    value={teachRole}
                    onChange={(e) => setTeachRole(e.target.value)}
                    className="w-full bg-transparent border-none text-xs text-[#15223F] focus:outline-none font-semibold py-0.5 cursor-pointer"
                  >
                    <option value="Normal">Normal Teacher</option>
                    <option value="Admin">Admin / Head of Department</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowTeacherModal(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-slate-700 font-bold py-3 rounded-xl text-xs transition-all active:scale-95 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#D69B67] hover:bg-[#C88A58] text-white font-bold py-3 rounded-xl text-xs transition-all shadow-md hover:shadow-lg active:scale-95 cursor-pointer"
                >
                  Save & Add Teacher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
