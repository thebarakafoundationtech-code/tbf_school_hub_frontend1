import React, { useState, useEffect } from "react";
import WelcomeScreen from "./components/WelcomeScreen";
import SchoolRegistration from "./components/SchoolRegistration";
import SoloLearnerRegistration from "./components/SoloLearnerRegistration";
import StudentDashboard from "./components/StudentDashboard";
import AdminDashboard from "./components/AdminDashboard";
import { Material } from "./types";
import { db, doc, onSnapshot, setDoc } from "./store";
import { getStoredUser, getStoredStudentProfile, getStoredSchool, clearStoredAuth, getStoredToken, AuthApi } from "./services/api";

type ViewState = "welcome" | "register" | "solo-register" | "student" | "admin";
type StudentTab = "dashboard" | "classroom" | "library" | "practice" | "ask-baraka" | "labs" | "timetable" | "progress";

export default function App() {
  // Requirement 26: Startup behavior:
  // If no saved token -> show login.
  // If saved token -> verify with GET /auth/me. Do not show dashboard before verified.
  const [view, setViewState] = useState<ViewState>("welcome");
  const [isVerifyingAuth, setIsVerifyingAuth] = useState(true);

  const [studentTab, setStudentTab] = useState<StudentTab>("dashboard");

  // Push history entry when view changes
  const setView = (nextView: ViewState) => {
    setViewState(nextView);
    try {
      window.history.pushState({ view: nextView, tab: nextView === "student" ? studentTab : undefined }, "");
    } catch {}
  };

  const handleStudentTabChange = (tab: StudentTab) => {
    setStudentTab(tab);
    try {
      window.history.pushState({ view: "student", tab }, "");
    } catch {}
  };

  // Check saved authentication token on application startup
  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setIsVerifyingAuth(false);
      setViewState("welcome");
      return;
    }

    AuthApi.getMe()
      .then((res) => {
        if (res && res.user) {
          const user = res.user;
          const role = (user.role || "").toLowerCase();
          if (role === "student") {
            const studentProf = (res as any).student_profile || {};
            const lvl = studentProf.study_level || user.class || user.study_level;
            const subjs = studentProf.subjects || studentProf.enrolled_subjects || user.subjects || user.enrolled_subjects;
            if (lvl || subjs) {
              setStudentProfile(prev => ({
                ...prev,
                ...(lvl ? { studyLevel: lvl, class: lvl } : {}),
                ...(subjs ? { subjects: subjs, enrolled_subjects: subjs } : {})
              }));
            }
            setViewState("student");
          } else if (role === "admin" || role === "school_admin" || role === "teacher") {
            setViewState("admin");
          } else {
            setViewState("welcome");
          }
        } else {
          clearStoredAuth();
          setViewState("welcome");
        }
      })
      .catch((err: any) => {
        if (err?.status === 401) {
          clearStoredAuth();
          setViewState("welcome");
        } else if (err?.code === 2008 || err?.status === 503) {
          console.warn("Auth startup verification note: database unavailable", err?.message);
          // Keep on login screen
          setViewState("welcome");
        } else {
          clearStoredAuth();
          setViewState("welcome");
        }
      })
      .finally(() => {
        setIsVerifyingAuth(false);
      });
  }, []);

  // Initialize initial history state and handle browser back / forward arrow clicks
  useEffect(() => {
    try {
      if (!window.history.state) {
        window.history.replaceState({ view, tab: studentTab }, "");
      }
    } catch {}

    const handlePopState = (e: PopStateEvent) => {
      if (e.state && e.state.view) {
        setViewState(e.state.view);
        if (e.state.tab) {
          setStudentTab(e.state.tab);
        }
      } else {
        // Default fallback if state is empty: if logged in as student, return to student dashboard rather than logging out
        const user = getStoredUser();
        if (user && user.role === "student") {
          setViewState("student");
          setStudentTab("dashboard");
        } else if (user && (user.role === "admin" || user.role === "teacher")) {
          setViewState("admin");
        }
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Clean old local storage mock values once to ensure a clean slate for the user
  useEffect(() => {
    if (!localStorage.getItem("has_cleared_old_mock_v4")) {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith("students") || 
          key.startsWith("teachers") || 
          key.startsWith("materials") ||
          key.startsWith("tbf_db_students") ||
          key.startsWith("tbf_db_teachers") ||
          key.startsWith("tbf_db_classes") ||
          key.startsWith("tbf_db_materials") ||
          key.startsWith("tbf_db_timetable") ||
          key.startsWith("tbf_db_live") ||
          key.startsWith("tbf_db_notifications")
        )) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
      localStorage.setItem("has_cleared_old_mock_v4", "true");
    }
  }, []);

  // Global state carrying profiles - dynamically loaded from stored session/database
  const [studentProfile, setStudentProfile] = useState(() => {
    const storedUser = getStoredUser();
    const storedStudent = getStoredStudentProfile();
    const storedSchool = getStoredSchool();
    if (storedUser && storedUser.role === "student") {
      let level = storedStudent?.study_level || "Form 1";
      if (/^Form\d$/i.test(level)) {
        level = `Form ${level.slice(4)}`;
      }
      const photo = (storedStudent?.photo_url && storedStudent.photo_url !== "string") 
        ? storedStudent.photo_url 
        : (storedUser.photo_url && storedUser.photo_url !== "string" ? storedUser.photo_url : "");

      const schoolVal =
        storedStudent?.school ||
        storedUser?.school ||
        storedUser?.schoolName ||
        storedSchool?.name ||
        "";

      let phoneVal =
        storedStudent?.phone ||
        storedUser?.phone ||
        storedUser?.parentContact ||
        storedUser?.student_profile?.phone ||
        "";

      if (!phoneVal && storedUser.email) {
        try {
          const registeredUsers = JSON.parse(localStorage.getItem("tbf_registered_users") || "[]");
          const matched = registeredUsers.find((u: any) => u.email?.toLowerCase() === storedUser.email.toLowerCase());
          if (matched && matched.phone) {
            phoneVal = matched.phone;
          }
        } catch {}
      }

      const subjList = storedStudent?.subjects || storedUser?.subjects || storedStudent?.enrolled_subjects || storedUser?.enrolled_subjects || [];
      return {
        firstName: storedUser.fname || storedUser.firstName || "Scholar",
        lastName: storedUser.lname || storedUser.lastName || "",
        email: storedUser.email || "",
        phone: phoneVal,
        studyLevel: level,
        class: level,
        curriculum: storedStudent?.curriculum || "Tanzania National (NECTA)",
        school: schoolVal,
        schoolName: schoolVal,
        photoUrl: photo,
        subjects: subjList,
        enrolled_subjects: subjList,
        isNew: false,
      };
    }
    const schoolVal = storedSchool?.name || "";
    return {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      studyLevel: "Form 1",
      curriculum: "Tanzania National (NECTA)",
      school: schoolVal,
      schoolName: schoolVal,
      photoUrl: "",
      isNew: true,
    };
  });

  const [teacherProfile, setTeacherProfile] = useState<any>(null);

  // Shared live session state for teacher & student interaction
  const [liveSession, setLiveSession] = useState({
    isActive: false,
    subject: "",
    topic: "",
    teacherName: "",
    targetClass: "",
    whiteboardText: "",
    presentationActive: false,
    presentationType: "slide" as "slide" | "screen",
    presentationTitle: "",
    presentationSlideIndex: 0,
    teacherCameraFrame: "",
    screenShareFrame: "",
    allStudentsMuted: false,
    mutedStudents: {} as Record<string, boolean>,
    isTeacherSpeaking: false,
    teacherAudioMessage: "",
    teacherAudioTimestamp: 0,
    presentationSlides: [] as string[],
    activeQuiz: null as {
      question: string;
      options: string[];
      correctIndex: number;
      launched: boolean;
      submissions: { studentName: string; answerIndex: number; isCorrect: boolean }[];
    } | null,
    attendance: {} as Record<string, "Present" | "Absent" | "Late">,
    discussionMessages: [] as {
      id: string | number;
      author: string;
      role: "Teacher" | "Student";
      time: string;
      avatar: string;
      content: string;
      upvotes: number;
      replies: { author: string; role?: string; time: string; content: string }[];
    }[],
    sharedDocuments: [] as { id: string; name: string; url: string; uploadedAt: string }[],
    assignments: [] as { id: string; title: string; dueDate: string; totalPoints: number; submissionsCount: number }[],
  });

  const [schoolInfo, setSchoolInfo] = useState({
    name: "Baraka Secondary School",
    regNo: "TBF/BAR/001/2026",
    region: "Dar es Salaam",
    type: "Secondary",
    headmaster: "School Administrator",
  });

  // Real-time school info sync from client data store
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "school", "info"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data && data.name) {
          setSchoolInfo(data as any);
        }
      }
    }, (err) => {
      console.warn("[App] School info listener note:", err);
    });
    return () => unsubscribe();
  }, []);

  // Real-time sync + Server-Sent Events (SSE) for cross-device live classroom session
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let pollInterval: any = null;

    // Connect to server-side SSE stream for instant real-time broadcasts
    try {
      eventSource = new EventSource("/api/live-session/stream");
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && typeof data === "object") {
            setLiveSession((prev) => ({ ...prev, ...data }));
          }
        } catch (e) {}
      };

      eventSource.onerror = () => {
        if (!pollInterval) {
          pollInterval = setInterval(() => {
            fetch("/api/live-session")
              .then((res) => res.json())
              .then((data) => {
                if (data && typeof data === "object") {
                  setLiveSession((prev) => ({ ...prev, ...data }));
                }
              })
              .catch(() => {});
          }, 3000);
        }
      };
    } catch (e) {}

    // Database real-time snapshot listener
    const unsubscribeFs = onSnapshot(doc(db, "live", "session"), (docSnap) => {
      if (docSnap.exists()) {
        const fsData = docSnap.data();
        if (fsData && typeof fsData === "object") {
          setLiveSession((prev) => ({ ...prev, ...fsData }));
        }
      }
    }, (err) => {
      console.warn("[App] Live session listener note:", err);
    });

    return () => {
      if (eventSource) eventSource.close();
      if (pollInterval) clearInterval(pollInterval);
      unsubscribeFs();
    };
  }, []);

  // Flow handlers
  const handleSelectSoloLearner = () => {
    setView("solo-register");
  };

  const handleSelectSchoolInstitution = () => {
    setView("register");
  };

  const handleCompleteSchoolRegistration = async (schoolData: any) => {
    const data = {
      name: schoolData.name,
      regNo: schoolData.regNo,
      region: schoolData.region,
      type: schoolData.type,
      headmaster: schoolData.headmaster,
    };
    setSchoolInfo(data);

    // Ensure all previous cached records are wiped clean so the newly registered school starts completely empty
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith("students") || 
        key.startsWith("teachers") || 
        key.startsWith("materials") ||
        key.startsWith("classes") ||
        key.startsWith("timetable") ||
        key.startsWith("live") ||
        key.startsWith("tbf_db_")
      )) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));

    setView("admin");

    try {
      await setDoc(doc(db, "school", "info"), data);
    } catch (e) {
      console.error("Error saving registered school: ", e);
    }

    const nameParts = (schoolData.headmaster || "").trim().split(/\s+/);
    const resolvedLastName = nameParts.length > 0 ? nameParts[nameParts.length - 1] : "Administrator";
    setStudentProfile((prev) => ({
      ...prev,
      lastName: resolvedLastName,
    }));
  };

  const handleQuickLogin = (role: "student" | "admin" | "teacher", teacherData?: any) => {
    if (role === "student") {
      setView("student");
    } else if (role === "teacher") {
      setTeacherProfile(teacherData);
      setView("admin");
    } else {
      setTeacherProfile(null);
      setView("admin");
    }
  };

  const handleStudentLoginSuccess = (profileData: {
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
  }) => {
    const level = profileData.studyLevel || (profileData as any).class || "Form 1";
    const rawSchool = (profileData as any).school || (profileData as any).schoolName || "";
    const schoolVal = rawSchool && rawSchool !== "(no school or unregistered school)" 
      ? rawSchool 
      : (getStoredSchool()?.name || "");
    const subjList = (profileData as any).subjects || (profileData as any).enrolled_subjects || [];
    const profile = {
      firstName: profileData.firstName,
      lastName: profileData.lastName,
      email: profileData.email,
      phone: profileData.phone || "",
      studyLevel: level,
      class: (profileData as any).class || level,
      curriculum: profileData.curriculum || "Tanzania National (NECTA)",
      school: schoolVal,
      schoolName: schoolVal,
      photoUrl: profileData.photoUrl,
      subjects: subjList,
      enrolled_subjects: subjList,
      isNew: profileData.isNew !== undefined ? profileData.isNew : false,
    };
    if (schoolVal) {
      try {
        localStorage.setItem("tbf_school", JSON.stringify({ name: schoolVal }));
      } catch {}
    }
    setStudentProfile(profile);
    setView("student");

    // Save student profile to client data store asynchronously
    (async () => {
      try {
        const studentDocId = profileData.email ? profileData.email.replace(/[^a-zA-Z0-9]/g, "_") : `BSS-STUDENT-${Date.now()}`;
        const studentData: any = {
          id: studentDocId,
          name: `${profileData.firstName} ${profileData.lastName}`,
          email: profileData.email,
          class: level,
          gender: "Student",
          status: "Active",
          feesPaid: true,
          lastActive: "Just now",
          photoUrl: profileData.photoUrl,
          signedInAt: new Date().toISOString(),
        };
        if (profileData.phone) {
          studentData.parentPhone = profileData.phone;
          studentData.parentContact = profileData.phone;
          studentData.phone = profileData.phone;
        }
        await setDoc(doc(db, "students", studentDocId), studentData, { merge: true });
        await setDoc(doc(db, "users", studentDocId), studentData, { merge: true });
      } catch (e) {
        console.warn("Error saving student user to local client store:", e);
      }
    })();
  };

  const handleUpdateLiveSession = async (updatedSession: any) => {
    setLiveSession((prev) => {
      const nextSession = typeof updatedSession === "function" ? updatedSession(prev) : { ...prev, ...updatedSession };
      
      // 1. Broadcast to server API (instant cross-device, cross-browser relay)
      fetch("/api/live-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextSession),
      }).catch((err) => console.warn("Live session server sync error:", err));

      // 2. Persist to local client store
      setDoc(doc(db, "live", "session"), nextSession).catch((err) => {
        console.warn("Update live session error:", err);
      });

      return nextSession;
    });
  };

  const handleLogout = () => {
    clearStoredAuth();
    setTeacherProfile(null);
    setView("welcome");
  };

  if (isVerifyingAuth) {
    return (
      <div className="min-h-screen bg-[#FAF6EE] flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-10 h-10 border-3 border-[#15223F] border-t-transparent rounded-full animate-spin"></div>
        <p className="font-serif font-bold text-[#15223F] text-sm tracking-wide">Connecting to Baraka School Hub...</p>
      </div>
    );
  }

  return (
    <div id="app-viewport" className="min-h-screen bg-[#FAF6EE]">
      {view === "welcome" && (
        <WelcomeScreen
          onSelectSoloLearner={handleSelectSoloLearner}
          onSelectSchoolInstitution={handleSelectSchoolInstitution}
          onQuickLogin={handleQuickLogin}
          onStudentLoginSuccess={handleStudentLoginSuccess}
        />
      )}

      {view === "register" && (
        <SchoolRegistration
          onComplete={handleCompleteSchoolRegistration}
          onCancel={() => setView("welcome")}
          onSkipToStudent={() => setView("student")}
        />
      )}

      {view === "solo-register" && (
        <SoloLearnerRegistration
          onComplete={(studentData) => {
            handleStudentLoginSuccess({
              firstName: studentData.firstName,
              lastName: studentData.lastName,
              email: studentData.email,
              phone: studentData.phone,
              studyLevel: studentData.studyLevel,
              curriculum: studentData.curriculum,
              school: studentData.school,
              schoolName: studentData.schoolName,
              photoUrl: "",
              isNew: true,
            });
          }}
          onCancel={() => setView("welcome")}
        />
      )}

      {view === "student" && (
        <StudentDashboard
          studentProfile={studentProfile}
          onUpdateProfile={(updated) => {
            const merged = { ...studentProfile, ...updated };
            setStudentProfile(merged);

            if (merged.school || merged.schoolName) {
              const sch = merged.school || merged.schoolName;
              try {
                localStorage.setItem("tbf_school", JSON.stringify({ name: sch }));
              } catch {}
            }

            // Persist to database
            if (merged.email) {
              const docId = merged.email.replace(/[^a-zA-Z0-9]/g, "_");
              setDoc(doc(db, "students", docId), {
                name: `${merged.firstName} ${merged.lastName}`,
                email: merged.email,
                class: merged.studyLevel,
                parentPhone: merged.phone || "",
                parentContact: merged.phone || "",
                phone: merged.phone || "",
                school: merged.school || merged.schoolName || "",
                schoolName: merged.school || merged.schoolName || "",
                photoUrl: merged.photoUrl,
                updatedAt: new Date().toISOString()
              }, { merge: true }).catch(() => {});

              setDoc(doc(db, "users", docId), {
                fname: merged.firstName,
                lname: merged.lastName,
                email: merged.email,
                phone: merged.phone || "",
                parentContact: merged.phone || "",
                school: merged.school || merged.schoolName || "",
                schoolName: merged.school || merged.schoolName || "",
                photo_url: merged.photoUrl,
                updatedAt: new Date().toISOString()
              }, { merge: true }).catch(() => {});
            }

            // Sync school owner headmaster name if relevant for visual consistency
            if (updated.firstName && updated.lastName) {
              setSchoolInfo((prev) => ({
                ...prev,
                headmaster: `${updated.firstName} ${updated.lastName} Senior`
              }));
            }
          }}
          initialTab={studentTab}
          onTabChange={handleStudentTabChange}
          onLogout={handleLogout}
          showAdminToggle={false}
          onSwitchToAdmin={() => setView("admin")}
          liveSession={liveSession}
          onUpdateLiveSession={handleUpdateLiveSession}
        />
      )}

      {view === "admin" && (
        <AdminDashboard
          schoolInfo={schoolInfo}
          onSwitchToStudent={() => setView("student")}
          liveSession={liveSession}
          onUpdateLiveSession={handleUpdateLiveSession}
          teacherProfile={teacherProfile}
          onUpdateTeacherProfile={(updatedTeacher) => setTeacherProfile(updatedTeacher)}
          onLogout={handleLogout}
          onUpdateSchoolInfo={async (updated) => {
            const nextSchoolInfo = {
              ...schoolInfo,
              ...updated,
            };
            setSchoolInfo(nextSchoolInfo);
            try {
              await setDoc(doc(db, "school", "info"), nextSchoolInfo);
            } catch (err) {
              console.error("Update school info error:", err);
            }
            // Sync studentProfile last name so it stays matching headmaster's last name
            if (updated.headmaster) {
              const nameParts = updated.headmaster.trim().split(/\s+/);
              const resolvedLastName = nameParts.length > 0 ? nameParts[nameParts.length - 1] : "Michael";
              setStudentProfile((prev) => ({
                ...prev,
                lastName: resolvedLastName,
              }));
            }
          }}
        />
      )}
    </div>
  );
}
