import React, { useState, useEffect } from "react";
import WelcomeScreen from "./components/WelcomeScreen";
import SchoolRegistration from "./components/SchoolRegistration";
import StudentDashboard from "./components/StudentDashboard";
import AdminDashboard from "./components/AdminDashboard";
import { Material } from "./types";
import { db, doc, onSnapshot, setDoc } from "./store";

type ViewState = "welcome" | "register" | "student" | "admin";

export default function App() {
  const [view, setView] = useState<ViewState>("welcome");

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

  // Global state carrying profiles
  const [studentProfile, setStudentProfile] = useState({
    firstName: "Mwanafunzi",
    lastName: "Baraka",
    email: "learner@barakahub.edu.tz",
    phone: "+255 700 000 000",
    studyLevel: "Form 1",
    curriculum: "Tanzania / NECTA",
    photoUrl: "",
    isNew: true,
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
    sharedDocuments: [] as { id: string; name: string; url: string; uploadedAt: string }[],
    assignments: [] as { id: string; title: string; dueDate: string; totalPoints: number; submissionsCount: number }[],
  });

  const [schoolInfo, setSchoolInfo] = useState({
    name: "Baraka Secondary School",
    regNo: "MoE/SEC/2026/0921",
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
  const handleSelectSoloLearner = (formData: any) => {
    const profile = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone || "",
      studyLevel: formData.studyLevel,
      curriculum: formData.curriculum,
      photoUrl: "",
      isNew: true,
    };
    setStudentProfile(profile);
    setView("student");

    // Save to local client store asynchronously
    (async () => {
      try {
        const studentDocId = formData.email ? formData.email.replace(/[^a-zA-Z0-9]/g, "_") : `BSS-SOLO-${Date.now()}`;
        const studentData = {
          id: studentDocId,
          regNo: `BSS-2026-${Math.floor(100 + Math.random() * 900)}`,
          name: `${formData.firstName} ${formData.lastName}`,
          email: formData.email,
          class: `${formData.studyLevel}A`,
          gender: "Student",
          parentPhone: formData.phone || "+255 700 000 000",
          status: "Active",
          feesPaid: true,
          lastActive: "Just now",
          signedInAt: new Date().toISOString(),
        };
        await setDoc(doc(db, "students", studentDocId), studentData, { merge: true });
        await setDoc(doc(db, "users", studentDocId), studentData, { merge: true });
      } catch (e) {
        console.warn("Error saving solo student record:", e);
      }
    })();
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

  const handleStudentLoginSuccess = (profileData: { firstName: string; lastName: string; email: string; photoUrl: string; isNew?: boolean; studyLevel?: string }) => {
    const level = profileData.studyLevel || "Form 1";
    const profile = {
      firstName: profileData.firstName,
      lastName: profileData.lastName,
      email: profileData.email,
      phone: "+255 711 111 222",
      studyLevel: level,
      curriculum: "Tanzania / NECTA",
      photoUrl: profileData.photoUrl,
      isNew: profileData.isNew !== undefined ? profileData.isNew : true,
    };
    setStudentProfile(profile);
    setView("student");

    // Save student profile to client data store asynchronously
    (async () => {
      try {
        const studentDocId = profileData.email ? profileData.email.replace(/[^a-zA-Z0-9]/g, "_") : `BSS-STUDENT-${Date.now()}`;
        const studentData = {
          id: studentDocId,
          regNo: `BSS-2026-${Math.floor(100 + Math.random() * 900)}`,
          name: `${profileData.firstName} ${profileData.lastName}`,
          email: profileData.email,
          class: `${level}A`,
          gender: "Student",
          parentPhone: "+255 711 111 222",
          status: "Active",
          feesPaid: true,
          lastActive: "Just now",
          photoUrl: profileData.photoUrl,
          signedInAt: new Date().toISOString(),
        };
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

      {view === "student" && (
        <StudentDashboard
          studentProfile={studentProfile}
          onUpdateProfile={(updated) => {
            setStudentProfile((prev) => ({
              ...prev,
              ...updated,
            }));
            // Sync school owner headmaster name if relevant for visual consistency
            if (updated.firstName && updated.lastName) {
              setSchoolInfo((prev) => ({
                ...prev,
                headmaster: `${updated.firstName} ${updated.lastName} Senior`
              }));
            }
          }}
          onLogout={() => setView("welcome")}
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
          onLogout={() => {
            setTeacherProfile(null);
            setView("welcome");
          }}
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
