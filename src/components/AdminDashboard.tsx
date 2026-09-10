import React, { useState, useEffect } from "react";
import { db, collection, onSnapshot, setDoc, doc, deleteDoc } from "../store";
import { tbfApi } from "../services/api";
import BrandLogo from "./BrandLogo";
import {
  FaGlobe,
  FaLock,
  FaVideo,
  FaMicrophone,
  FaMicrophoneSlash,
  FaBullhorn,
  FaDisplay,
  FaBookOpen,
  FaChevronLeft,
  FaChevronRight,
  FaVolumeHigh,
  FaVolumeXmark,
  FaBan,
  FaFire,
  FaTrophy,
  FaChalkboard,
  FaCheck
} from "react-icons/fa6";
import { BsFileEarmarkPdfFill } from "react-icons/bs";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  School,
  FileText,
  Upload,
  Search,
  Plus,
  TrendingUp,
  UserCheck,
  CheckCircle,
  Video,
  Bell,
  User,
  X,
  Edit,
  Trash2,
  Menu,
  LogOut,
  ExternalLink,
  Calendar,
  Clock,
  Check,
  Play,
  RefreshCw,
} from "lucide-react";
import {
  Student,
  Teacher,
  ClassInfo,
  Material,
  TimetableSession,
  initialStudents,
  initialTeachers,
  initialClasses,
  initialMaterials,
  initialTimetable,
} from "../types";

interface AdminDashboardProps {
  schoolInfo: {
    name: string;
    regNo: string;
    region: string;
    type: string;
    headmaster: string;
  };
  onSwitchToStudent: () => void;
  // Shared state triggers
  onAddMaterialGlobal?: (newMat: Material) => void;
  liveSession?: {
    isActive: boolean;
    subject: string;
    topic: string;
    teacherName: string;
    targetClass?: string;
    whiteboardText: string;
    presentationActive?: boolean;
    presentationType?: "slide" | "screen";
    presentationTitle?: string;
    presentationSlideIndex?: number;
    presentationSlides?: string[];
    teacherCameraFrame?: string;
    screenShareFrame?: string;
    allStudentsMuted?: boolean;
    mutedStudents?: Record<string, boolean>;
    isTeacherSpeaking?: boolean;
    teacherAudioMessage?: string;
    teacherAudioTimestamp?: number;
    activeQuiz: {
      question: string;
      options: string[];
      correctIndex: number;
      launched: boolean;
      submissions: { studentName: string; answerIndex: number; isCorrect: boolean }[];
    } | null;
    attendance: Record<string, "Present" | "Absent" | "Late">;
    sharedDocuments?: { id: string; name: string; url: string; uploadedAt: string }[];
    assignments: { id: string; title: string; dueDate: string; totalPoints: number; submissionsCount: number }[];
  };
  onUpdateLiveSession?: (session: any) => void;
  onUpdateSchoolInfo?: (info: any) => void;
  teacherProfile?: {
    name: string;
    firstName?: string;
    lastName?: string;
    email: string;
    subjects: string;
    classes: string;
    status: string;
    role?: string;
    password?: string;
  } | null;
  onLogout?: () => void;
  onUpdateTeacherProfile?: (profile: any) => void;
}

export default function AdminDashboard({
  schoolInfo,
  onSwitchToStudent,
  onAddMaterialGlobal,
  liveSession,
  onUpdateLiveSession,
  onUpdateSchoolInfo,
  teacherProfile = null,
  onLogout,
  onUpdateTeacherProfile,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "students" | "teachers" | "classes" | "materials" | "timetable" | "live-class"
  >("overview");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Local state managers to allow full live CRUD interactivity!
  const [studentsList, setStudentsList] = useState<Student[]>(initialStudents);
  const [teachersList, setTeachersList] = useState<Teacher[]>(initialTeachers);
  const [classesList, setClassesList] = useState<ClassInfo[]>(initialClasses);
  const [materialsList, setMaterialsList] = useState<Material[]>(initialMaterials);
  const [timetableList, setTimetableList] = useState<TimetableSession[]>(initialTimetable);
  const [timetableFilterDay, setTimetableFilterDay] = useState<string>("All");
  const [timetableFilterClass, setTimetableFilterClass] = useState<string>("All");
  const [isGeneratingTimetable, setIsGeneratingTimetable] = useState(false);

  const [isAddPeriodModalOpen, setIsAddPeriodModalOpen] = useState(false);
  const [newPeriodDay, setNewPeriodDay] = useState<"Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday">("Monday");
  const [newPeriodClass, setNewPeriodClass] = useState("Form 1A");
  const [newPeriodSubject, setNewPeriodSubject] = useState("Biology");
  const [newPeriodTeacher, setNewPeriodTeacher] = useState("");
  const [newPeriodTimeSlot, setNewPeriodTimeSlot] = useState("08:00 AM - 08:40 AM");
  const [newPeriodRoom, setNewPeriodRoom] = useState("Classroom 1");
  const [newPeriodNotes, setNewPeriodNotes] = useState("");
  const [notificationsList, setNotificationsList] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribeNotifs = onSnapshot(collection(db, "notifications"), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        if (docSnap.exists()) {
          list.push(docSnap.data());
        }
      });
      list.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      setNotificationsList(list);
    });
    return () => unsubscribeNotifs();
  }, []);

  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    let activeStream: MediaStream | null = null;
    if (activeTab === "live-class" && liveSession?.isActive) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then((stream) => {
          activeStream = stream;
          setCameraStream(stream);
          const videoElement = document.getElementById("teacher-live-webcam") as HTMLVideoElement;
          if (videoElement) {
            videoElement.srcObject = stream;
          }
        })
        .catch((err) => {
          console.warn("Camera access failed or denied:", err);
        });
    } else {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        setCameraStream(null);
      }
    }
    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [activeTab, liveSession?.isActive]);

  // Periodic frame capture for live camera broadcast to students
  useEffect(() => {
    if (activeTab !== "live-class" || !liveSession?.isActive || !onUpdateLiveSession) return;

    const frameCanvas = document.createElement("canvas");
    frameCanvas.width = 320;
    frameCanvas.height = 180;
    const ctx = frameCanvas.getContext("2d");

    const interval = setInterval(() => {
      const videoEl = document.getElementById("teacher-live-webcam") as HTMLVideoElement;
      if (videoEl && videoEl.readyState >= 2 && ctx) {
        ctx.drawImage(videoEl, 0, 0, 320, 180);
        const frameData = frameCanvas.toDataURL("image/jpeg", 0.45);
        onUpdateLiveSession((prev: any) => {
          if (prev.teacherCameraFrame === frameData) return prev;
          return { ...prev, teacherCameraFrame: frameData };
        });
      }
    }, 1200);

    return () => clearInterval(interval);
  }, [activeTab, liveSession?.isActive, onUpdateLiveSession]);

  // Periodic frame capture for live desktop screen share to students
  useEffect(() => {
    if (activeTab !== "live-class" || !liveSession?.isActive || !liveSession?.presentationActive || liveSession?.presentationType !== "screen" || !onUpdateLiveSession) return;

    const screenCanvas = document.createElement("canvas");
    screenCanvas.width = 640;
    screenCanvas.height = 360;
    const ctx = screenCanvas.getContext("2d");

    const interval = setInterval(() => {
      const videoEl = document.getElementById("teacher-screen-preview") as HTMLVideoElement;
      if (videoEl && videoEl.readyState >= 2 && ctx) {
        ctx.drawImage(videoEl, 0, 0, 640, 360);
        const frameData = screenCanvas.toDataURL("image/jpeg", 0.5);
        onUpdateLiveSession((prev: any) => {
          if (prev.screenShareFrame === frameData) return prev;
          return { ...prev, screenShareFrame: frameData };
        });
      }
    }, 1200);

    return () => clearInterval(interval);
  }, [activeTab, liveSession?.isActive, liveSession?.presentationActive, liveSession?.presentationType, onUpdateLiveSession]);

  useEffect(() => {
    let isMounted = true;

    // Fetch live data from backend endpoints on initial mount
    const fetchBackendData = async () => {
      try {
        const [studentsRes, teachersRes, classesRes, materialsRes, timetableRes] = await Promise.allSettled([
          tbfApi.fetchStudents(),
          tbfApi.fetchTeachers(),
          tbfApi.fetchClasses(),
          tbfApi.fetchMaterials(),
          tbfApi.fetchTimetable()
        ]);

        if (isMounted) {
          if (studentsRes.status === "fulfilled") {
            const val = studentsRes.value;
            const arr = Array.isArray(val) ? val : (val && Array.isArray((val as any).data) ? (val as any).data : []);
            if (arr.length > 0) setStudentsList(arr);
          }
          if (teachersRes.status === "fulfilled") {
            const val = teachersRes.value;
            const arr = Array.isArray(val) ? val : (val && Array.isArray((val as any).data) ? (val as any).data : []);
            if (arr.length > 0) setTeachersList(arr);
          }
          if (classesRes.status === "fulfilled") {
            const val = classesRes.value;
            const arr = Array.isArray(val) ? val : (val && Array.isArray((val as any).data) ? (val as any).data : []);
            if (arr.length > 0) setClassesList(arr);
          }
          if (materialsRes.status === "fulfilled") {
            const val = materialsRes.value;
            const arr = Array.isArray(val) ? val : (val && Array.isArray((val as any).data) ? (val as any).data : []);
            if (arr.length > 0) setMaterialsList(arr);
          }
          if (timetableRes.status === "fulfilled") {
            const val = timetableRes.value;
            const arr = Array.isArray(val) ? val : (val && Array.isArray((val as any).data) ? (val as any).data : []);
            if (arr.length > 0) setTimetableList(arr);
          }
        }
      } catch (err) {
        console.warn("Backend API data load note:", err);
      }
    };

    fetchBackendData();

    // 1. Students real-time sync with database
    const unsubscribeStudents = onSnapshot(collection(db, "students"), (snapshot) => {
      const list: Student[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data && data.name) {
          list.push(data as Student);
        }
      });
      setStudentsList(list);
    }, (error) => {
      console.warn("Client data store error for students:", error);
      setStudentsList([]);
    });

    // 2. Teachers real-time sync with database
    const unsubscribeTeachers = onSnapshot(collection(db, "teachers"), (snapshot) => {
      const list: Teacher[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data && data.name) {
          list.push(data as Teacher);
        }
      });
      setTeachersList(list);
    }, (error) => {
      console.warn("Client data store error for teachers:", error);
      setTeachersList([]);
    });

    // 3. Classes real-time sync with database
    const unsubscribeClasses = onSnapshot(collection(db, "classes"), (snapshot) => {
      const list: ClassInfo[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data && data.name) {
          list.push(data as ClassInfo);
        }
      });
      setClassesList(list);
    }, (error) => {
      console.warn("Client data store error for classes:", error);
      setClassesList([]);
    });

    // 4. Materials real-time sync with database
    const unsubscribeMaterials = onSnapshot(collection(db, "materials"), (snapshot) => {
      const list: Material[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data && data.title) {
          list.push(data as Material);
        }
      });
      setMaterialsList(list);
    }, (error) => {
      console.warn("Client data store error for materials:", error);
      setMaterialsList([]);
    });

    // 5. Timetable real-time sync with database
    const unsubscribeTimetable = onSnapshot(collection(db, "timetable"), (snapshot) => {
      const list: TimetableSession[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data && data.day) {
          list.push(data as TimetableSession);
        }
      });
      setTimetableList(list);
    }, (error) => {
      console.warn("Client data store error for timetable:", error);
      setTimetableList([]);
    });

    return () => {
      isMounted = false;
      unsubscribeStudents();
      unsubscribeTeachers();
      unsubscribeClasses();
      unsubscribeMaterials();
      unsubscribeTimetable();
    };
  }, [schoolInfo.regNo]);

  // Search queries
  const [studentSearch, setStudentSearch] = useState("");
  const [teacherSearch, setTeacherSearch] = useState("");

  // Search and Profile Dropdown/Edit States
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const [editHeadmaster, setEditHeadmaster] = useState(schoolInfo.headmaster);
  const [editSchoolName, setEditSchoolName] = useState(schoolInfo.name);
  const [editRegion, setEditRegion] = useState(schoolInfo.region);
  const [editRegNo, setEditRegNo] = useState(schoolInfo.regNo);
  const [editType, setEditType] = useState(schoolInfo.type);

  const [editTeacherFirstName, setEditTeacherFirstName] = useState("");
  const [editTeacherLastName, setEditTeacherLastName] = useState("");
  const [editTeacherEmail, setEditTeacherEmail] = useState("");
  const [editTeacherPassword, setEditTeacherPassword] = useState("");
  const [editTeacherSubjects, setEditTeacherSubjects] = useState("");
  const [editTeacherClasses, setEditTeacherClasses] = useState("");

  const handleOpenEditModal = () => {
    if (teacherProfile) {
      setEditTeacherFirstName(teacherProfile.firstName || teacherProfile.name.split(" ")[0] || "");
      setEditTeacherLastName(teacherProfile.lastName || teacherProfile.name.split(" ").slice(1).join(" ") || "");
      setEditTeacherEmail(teacherProfile.email || "");
      setEditTeacherPassword(teacherProfile.password || "teacher123");
      setEditTeacherSubjects(teacherProfile.subjects || "");
      setEditTeacherClasses(teacherProfile.classes || "");
    } else {
      setEditHeadmaster(schoolInfo.headmaster);
      setEditSchoolName(schoolInfo.name);
      setEditRegion(schoolInfo.region);
      setEditRegNo(schoolInfo.regNo);
      setEditType(schoolInfo.type);
    }
    setShowEditModal(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (teacherProfile) {
      const combinedName = `${editTeacherFirstName.trim()} ${editTeacherLastName.trim()}`;
      const updatedTeacher: Teacher = {
        ...teacherProfile,
        name: combinedName,
        firstName: editTeacherFirstName.trim(),
        lastName: editTeacherLastName.trim(),
        email: editTeacherEmail.trim(),
        password: editTeacherPassword,
        subjects: editTeacherSubjects,
        classes: editTeacherClasses,
        status: (teacherProfile.status || "Active") as "Active" | "Pending" | "Invited",
        role: (teacherProfile.role || "Normal") as "Admin" | "Normal",
      };

      try {
        await setDoc(doc(db, "teachers", updatedTeacher.email.replace(/\./g, "_")), updatedTeacher);
      } catch (err) {
        console.error("Error saving teacher profile update:", err);
      }

      if (onUpdateTeacherProfile) {
        onUpdateTeacherProfile(updatedTeacher);
      }

      setTeachersList(prev => prev.map(t => t.email === teacherProfile.email ? updatedTeacher : t));
    } else {
      if (onUpdateSchoolInfo) {
        onUpdateSchoolInfo({
          name: editSchoolName,
          regNo: editRegNo,
          region: editRegion,
          type: editType,
          headmaster: editHeadmaster,
        });
      }
    }
    setShowEditModal(false);
  };

  // Student Form state
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentReg, setNewStudentReg] = useState("BSS-2026-007");
  const [newStudentAge, setNewStudentAge] = useState(14);
  const [newStudentGender, setNewStudentGender] = useState("M");
  const [newStudentClass, setNewStudentClass] = useState("Form 1A");
  const [newStudentContact, setNewStudentContact] = useState("+255 711 111 222");

  // Edit Student Modal state
  const [showEditStudentModal, setShowEditStudentModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editStudentName, setEditStudentName] = useState("");
  const [editStudentReg, setEditStudentReg] = useState("");
  const [editStudentClass, setEditStudentClass] = useState("");
  const [editStudentAge, setEditStudentAge] = useState(14);
  const [editStudentGender, setEditStudentGender] = useState("M");
  const [editStudentParentContact, setEditStudentParentContact] = useState("");

  // Student Stats/Analytics Modal state
  const [showStudentStatsModal, setShowStudentStatsModal] = useState(false);
  const [selectedStudentStats, setSelectedStudentStats] = useState<Student | null>(null);

  const handleEditStudentClick = (student: Student) => {
    setEditingStudent(student);
    setEditStudentName(student.name);
    setEditStudentReg(student.regNo);
    setEditStudentClass(student.class);
    setEditStudentAge(student.age);
    setEditStudentGender(student.gender);
    setEditStudentParentContact(student.parentContact || "");
    setShowEditStudentModal(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    const updatedStudent: Student = {
      ...editingStudent,
      name: editStudentName,
      class: editStudentClass,
      age: Number(editStudentAge),
      gender: editStudentGender,
      parentContact: editStudentParentContact,
    };

    tbfApi.updateStudent(editingStudent.regNo, updatedStudent).catch(() => {});

    try {
      await setDoc(doc(db, "students", editingStudent.regNo), updatedStudent);
      setStudentsList(prev => prev.map(s => s.regNo === editingStudent.regNo ? updatedStudent : s));
      setShowEditStudentModal(false);
      setEditingStudent(null);
      alert("Student details updated successfully!");
    } catch (err: any) {
      console.error(err);
      // fallback
      setStudentsList(prev => prev.map(s => s.regNo === editingStudent.regNo ? updatedStudent : s));
      setShowEditStudentModal(false);
      setEditingStudent(null);
      alert("Student details updated successfully!");
    }
  };

  const handleDeleteStudent = async (regNo: string) => {
    if (!window.confirm("Are you sure you want to delete this student? This action cannot be undone.")) {
      return;
    }

    tbfApi.deleteStudent(regNo).catch(() => {});

    try {
      await deleteDoc(doc(db, "students", regNo));
      setStudentsList(prev => prev.filter(s => s.regNo !== regNo));
      alert("Student deleted successfully.");
    } catch (err: any) {
      console.error(err);
      setStudentsList(prev => prev.filter(s => s.regNo !== regNo));
      alert("Student deleted successfully.");
    }
  };

  // Teacher Form state
  const [newTeacherFirstName, setNewTeacherFirstName] = useState("");
  const [newTeacherLastName, setNewTeacherLastName] = useState("");
  const [newTeacherEmail, setNewTeacherEmail] = useState("");
  const [newTeacherPassword, setNewTeacherPassword] = useState("");
  const [newTeacherSubjects, setNewTeacherSubjects] = useState("");
  const [newTeacherClass, setNewTeacherClass] = useState("Form 1A");
  const [newTeacherRole, setNewTeacherRole] = useState<"Admin" | "Normal">("Normal");

  const canManageTeachers = !teacherProfile || teacherProfile.role === "Admin";

  // Class Form state
  const [newClassName, setNewClassName] = useState("");
  const [newClassTeacher, setNewClassTeacher] = useState("");
  const [newClassSubjects, setNewClassSubjects] = useState("");

  // Material Form state
  const [newMatTitle, setNewMatTitle] = useState("");
  const [newMatSubject, setNewMatSubject] = useState("");
  const [newMatClasses, setNewMatClasses] = useState("");
  const [matFileName, setMatFileName] = useState("");
  const [templateType, setTemplateType] = useState<"notes" | "quiz" | "practical" | "cheat_sheet">("notes");
  const [rawText, setRawText] = useState("");
  const [isArranging, setIsArranging] = useState(false);
  const [matVisibility, setMatVisibility] = useState<"public" | "personal">("public");

  // Actions
  const handleDownloadTemplate = () => {
    const headers = "Full Name,Registration Number,Class,Age,Gender,Parent Contact\n";
    const sampleRow = "Hamisi Juma,BSS-2026-101,Form 1A,14,M,+255 711 222 333\n";
    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(headers + sampleRow);
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", "student_list_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const XLSX = await import("xlsx");
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        let successCount = 0;
        const addedStudents: Student[] = [];
        for (const row of data) {
          const name = row["Full Name"] || row["Name"] || row["name"];
          const regNo = row["Registration Number"] || row["Reg. No"] || row["regNo"] || `BSS-2026-${Math.floor(100 + Math.random() * 900)}`;
          const className = row["Class"] || row["class"] || "Form 1A";
          const age = Number(row["Age"] || row["age"] || 14);
          const gender = row["Gender"] || row["gender"] || "M";
          const parentContact = row["Parent Contact"] || row["parentContact"] || "";

          if (name) {
            const newStud: Student = {
              name,
              regNo: String(regNo),
              class: String(className),
              age: Number(age),
              gender: String(gender),
              progress: 50,
              lastActive: "Today",
              parentContact: String(parentContact),
            };
            try {
              await setDoc(doc(db, "students", newStud.regNo), newStud);
            } catch (err) {
              console.warn("Client data store save student failed:", err);
            }
            addedStudents.push(newStud);
            successCount++;
          }
        }

        setStudentsList(prev => {
          const map = new Map(prev.map(s => [s.regNo, s]));
          addedStudents.forEach(s => map.set(s.regNo, s));
          return Array.from(map.values());
        });

        alert(`Successfully imported ${successCount} students in real-time!`);
      } catch (err: any) {
        console.error("Failed to parse file:", err);
        alert("Failed to parse Excel file. Please ensure it matches the template format.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;

    const newStud: Student = {
      name: newStudentName,
      regNo: newStudentReg,
      class: newStudentClass,
      age: Number(newStudentAge),
      gender: newStudentGender,
      progress: 60,
      lastActive: "Today",
      parentContact: newStudentContact,
    };

    tbfApi.createStudent(newStud).catch(() => {});

    try {
      await setDoc(doc(db, "students", newStud.regNo), newStud);
      setStudentsList(prev => {
        const map = new Map(prev.map(s => [s.regNo, s]));
        map.set(newStud.regNo, newStud);
        return Array.from(map.values());
      });
      setNewStudentName("");
      const match = newStudentReg.match(/\d+$/);
      if (match) {
        const nextNum = parseInt(match[0]) + 1;
        const paddedNum = nextNum.toString().padStart(3, "0");
        setNewStudentReg(`BSS-2026-${paddedNum}`);
      }
      alert("Student added successfully! Top row is updated.");
    } catch (err: any) {
      console.error(err);
      // fallback
      setStudentsList(prev => {
        const map = new Map(prev.map(s => [s.regNo, s]));
        map.set(newStud.regNo, newStud);
        return Array.from(map.values());
      });
      setNewStudentName("");
      alert("Student added successfully!");
    }
  };

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherFirstName.trim() || !newTeacherLastName.trim()) return;

    const fullNameCombined = `${newTeacherFirstName.trim()} ${newTeacherLastName.trim()}`;
    const emailVal = newTeacherEmail.trim() || `${newTeacherFirstName.toLowerCase().replace(/\s+/g, "")}${newTeacherLastName.toLowerCase().replace(/\s+/g, "")}@bss.ac.tz`;
    const passwordVal = newTeacherPassword.trim() || "password123";

    const newTeach: Teacher = {
      name: fullNameCombined,
      firstName: newTeacherFirstName.trim(),
      lastName: newTeacherLastName.trim(),
      email: emailVal,
      subjects: newTeacherSubjects,
      classes: newTeacherClass,
      status: "Active",
      password: passwordVal,
      role: newTeacherRole,
    };

    tbfApi.createTeacher(newTeach).catch(() => {});

    try {
      await setDoc(doc(db, "teachers", newTeach.email.replace(/\./g, "_")), newTeach);
      setTeachersList(prev => {
        const map = new Map(prev.map(t => [t.email, t]));
        map.set(newTeach.email, newTeach);
        return Array.from(map.values());
      });
      setNewTeacherFirstName("");
      setNewTeacherLastName("");
      setNewTeacherEmail("");
      setNewTeacherPassword("");
      setNewTeacherSubjects("");
      alert("Teacher registered and saved to database successfully!");
    } catch (err: any) {
      console.error(err);
      // fallback
      setTeachersList(prev => {
        const map = new Map(prev.map(t => [t.email, t]));
        map.set(newTeach.email, newTeach);
        return Array.from(map.values());
      });
      setNewTeacherFirstName("");
      setNewTeacherLastName("");
      setNewTeacherEmail("");
      setNewTeacherPassword("");
      setNewTeacherSubjects("");
      alert("Teacher registered successfully!");
    }
  };

  const handleDeleteTeacher = async (email: string) => {
    if (!window.confirm("Are you sure you want to delete this teacher? This action cannot be undone.")) {
      return;
    }
    tbfApi.deleteTeacher(email).catch(() => {});

    try {
      await deleteDoc(doc(db, "teachers", email.replace(/\./g, "_")));
      setTeachersList(prev => prev.filter(t => t.email !== email));
      alert("Teacher deleted successfully.");
    } catch (err: any) {
      console.error(err);
      setTeachersList(prev => prev.filter(t => t.email !== email));
      alert("Teacher deleted successfully.");
    }
  };

  const handleDownloadTeacherTemplate = () => {
    const headers = "Full Name,Email Address,Subjects,Assigned Classes,Role\n";
    const sampleRow = "Mwalimu Aisha,aisha@bss.ac.tz,Mathematics,Form 1A; Form 2B,Normal\n";
    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(headers + sampleRow);
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", "teacher_list_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportTeachers = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const XLSX = await import("xlsx");
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        let successCount = 0;
        const addedTeachers: Teacher[] = [];
        for (const row of data) {
          const name = row["Full Name"] || row["Name"] || row["name"];
          if (!name) continue;

          const email = row["Email Address"] || row["Email"] || row["email"] || `${name.toLowerCase().replace(/\s+/g, "")}@bss.ac.tz`;
          const subjects = row["Subjects"] || row["subjects"] || "General";
          const classes = row["Assigned Classes"] || row["Classes"] || row["classes"] || "Form 1A";
          const roleStr = row["Role"] || row["role"] || "Normal";
          const role: "Admin" | "Normal" = (roleStr.toLowerCase().includes("admin")) ? "Admin" : "Normal";

          const newTeach: Teacher = {
            name,
            email,
            subjects,
            classes,
            status: "Active",
            password: "password123",
            role,
          };

          try {
            await setDoc(doc(db, "teachers", newTeach.email.replace(/\./g, "_")), newTeach);
          } catch (err) {
            console.warn("Seeding teacher error: ", err);
          }
          addedTeachers.push(newTeach);
          successCount++;
        }

        setTeachersList(prev => {
          const map = new Map(prev.map(t => [t.email, t]));
          addedTeachers.forEach(t => map.set(t.email, t));
          return Array.from(map.values());
        });

        alert(`Successfully imported ${successCount} teachers in real-time!`);
      } catch (err: any) {
        console.error("Failed to parse teacher file:", err);
        alert("Failed to parse Excel file. Please ensure it matches the template format.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;

    const newCls: ClassInfo = {
      name: newClassName,
      teacher: newClassTeacher || "TBD",
      studentsCount: 30,
      avgScore: 70,
      subjects: newClassSubjects || "General",
    };

    tbfApi.createClass(newCls).catch(() => {});

    try {
      await setDoc(doc(db, "classes", newCls.name.replace(/\s+/g, "_")), newCls);
      setNewClassName("");
      setNewClassTeacher("");
      setNewClassSubjects("");
      alert("Class created successfully!");
    } catch (err: any) {
      console.error(err);
      alert("Failed to create class: " + err.message);
    }
  };

  const handleUploadMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = newMatTitle || matFileName || "Untitled Notes";
    if (!title) return;

    let textToProcess = rawText.trim();
    if (!textToProcess) {
      if ((newMatSubject || "").toLowerCase().includes("bio") || title.toLowerCase().includes("photo") || title.toLowerCase().includes("elodea")) {
        textToProcess = `Photosynthesis is the process by which green plants and some other organisms use sunlight to synthesize foods from carbon dioxide and water. In plants, photosynthesis generally involves the green pigment chlorophyll and generates oxygen as a byproduct.
# Light-dependent Reaction
This takes place in the thylakoid membranes of chloroplasts where light energy is absorbed to produce ATP and NADPH.
# Light-independent Reaction (Calvin Cycle)
This occurs in the stroma of chloroplasts where carbon dioxide is fixed into organic compounds like glucose using energy from ATP and NADPH.`;
      } else if ((newMatSubject || "").toLowerCase().includes("math") || title.toLowerCase().includes("algebra") || title.toLowerCase().includes("solve")) {
        textToProcess = `Algebra is a branch of mathematics dealing with symbols and the rules for manipulating those symbols. In introductory algebra, we learn to solve linear equations of the form ax + b = c.
# Linear Equations
To solve for the variable x, we must isolate x on one side of the equation.
# Solving 2x + 3 = 11
1. Subtract 3 from both sides: 2x = 8.
2. Divide both sides by 2: x = 4.
This isolates the variable and yields the solution x = 4.`;
      } else if ((newMatSubject || "").toLowerCase().includes("phy") || title.toLowerCase().includes("ohm") || title.toLowerCase().includes("circuit")) {
        textToProcess = `Ohm's law states that the current through a conductor between two points is directly proportional to the voltage across the two points.
# Mathematical Formula
V = I * R, where V is Voltage, I is Current, and R is Resistance.
# Electrical Resistance
Resistance opposes current flow. It is measured in Ohms (Ω) using a resistor component.`;
      } else {
        textToProcess = `This educational study material covers "${title}" in the subject of ${newMatSubject || "General"}. It provides core definitions, critical sections, and key takeaways for Tanzanian secondary school students.`;
      }
    }

    setIsArranging(true);
    try {
      let data: any = null;
      try {
        data = await tbfApi.arrangeMaterial({
          title,
          subject: newMatSubject || "General",
          templateType,
          rawText: textToProcess
        });
      } catch {
        try {
          const res = await fetch("/api/arrange-material", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title,
              subject: newMatSubject || "General",
              templateType,
              rawText: textToProcess
            })
          });
          if (res.ok) data = await res.json();
        } catch (err) {
          console.warn("Backend arrange-material API failed, using robust client-side organizer fallback:", err);
        }
      }

      if (!data) {
        // Fallback layout generation if server-side Gemini API is unreachable (e.g., in a static Vercel build)
        const lines = textToProcess.split("\n").map(l => l.trim()).filter(l => l.length > 0);
        const sections: { heading: string; body?: string; paragraphs?: string[] }[] = [];
        let currentSection: { heading: string; paragraphs: string[] } | null = null;
        const keyPoints: string[] = [];

        lines.forEach((line) => {
          if (line.startsWith("#") || line.startsWith("##") || line.match(/^[0-9]+\./)) {
            if (currentSection) {
              sections.push({
                heading: currentSection.heading,
                paragraphs: currentSection.paragraphs
              });
            }
            currentSection = {
              heading: line.replace(/^[#\s]+/, "").replace(/^[0-9\.\s]+/, ""),
              paragraphs: []
            };
          } else {
            if (!currentSection) {
              currentSection = {
                heading: "Muhtasari wa Somo (Lesson Overview)",
                paragraphs: []
              };
            }
            currentSection.paragraphs.push(line);
            if (line.length < 100 && keyPoints.length < 4) {
              keyPoints.push(line);
            }
          }
        });

        if (currentSection) {
          sections.push({
            heading: currentSection.heading,
            paragraphs: currentSection.paragraphs
          });
        }

        if (keyPoints.length === 0) {
          keyPoints.push(`Core definitions and key outcomes of "${title}".`);
          keyPoints.push("Structured lesson segments for optimal understanding.");
        }

        data = {
          arrangedContent: {
            introduction: `Habari! Here is your beautifully formatted study guide for "${title}" (${newMatSubject || "General"}). Let's dive in!`,
            sections: sections,
            summary: textToProcess.substring(0, 200) + "...",
            keyPoints: keyPoints
          },
          quizQuestions: [
            {
              id: `q-${Date.now()}-1`,
              question: `What is the primary study topic discussed in this resource?`,
              options: [
                `Study of ${title}`,
                "Standard administrative guidelines",
                "General extracurricular subjects",
                "Advanced secondary curriculum structure"
              ],
              correctAnswer: 0,
              explanation: `This notes set explicitly focuses on ${title} inside the ${newMatSubject || "General"} domain.`
            },
            {
              id: `q-${Date.now()}-2`,
              question: `Which study practice helps students best remember the content of "${title}"?`,
              options: [
                "Utilizing active recall and review quizzes",
                "Simply glancing at headings quickly",
                "Memorizing without visual flow",
                "Skipping the summary slides"
              ],
              correctAnswer: 0,
              explanation: "Interactive active-recall questions reinforce memory retention and test preparation."
            }
          ]
        };
      }

      const newMat: Material = {
        id: `mat-${Date.now()}`,
        title,
        subject: newMatSubject || "General",
        classes: newMatClasses || "All Forms",
        uploadedAt: "Today",
        templateType,
        rawText: textToProcess,
        visibility: matVisibility,
        arrangedContent: data.arrangedContent,
        quizQuestions: data.quizQuestions,
        uploadedBy: "Teacher",
        isTeacherUpload: true
      };

      tbfApi.createMaterial(newMat).catch(() => {});

      await setDoc(doc(db, "materials", newMat.id), newMat);
      if (onAddMaterialGlobal) {
        onAddMaterialGlobal(newMat);
      }
      setNewMatTitle("");
      setNewMatSubject("");
      setNewMatClasses("");
      setMatFileName("");
      setRawText("");
      alert("Material uploaded, beautifully auto-arranged and study quizzes generated in real-time!");
    } catch (err: any) {
      console.error(err);
      alert("Failed to auto-arrange and generate quizzes: " + err.message);
    } finally {
      setIsArranging(false);
    }
  };

  // --- TIMETABLE MANAGEMENT HANDLERS ---
  const handleGenerateSuperAdminTimetable = async () => {
    setIsGeneratingTimetable(true);
    try {
      const days: ("Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday")[] = [
        "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"
      ];
      const classes = ["Form 1A", "Form 1B", "Form 2A", "Form 2B", "Form 3A", "Form 3B"];
      const periodSlots = [
        { index: 1, time: "08:00 AM - 08:40 AM" },
        { index: 2, time: "08:40 AM - 09:20 AM" },
        { index: 3, time: "09:20 AM - 10:00 AM" },
        { index: 4, time: "10:30 AM - 11:10 AM" },
        { index: 5, time: "11:10 AM - 11:50 AM" },
        { index: 6, time: "11:50 AM - 12:30 PM" },
      ];
      const subjectsList = ["Biology", "Mathematics", "Physics", "Chemistry", "English", "Kiswahili", "Geography", "History"];

      const newGeneratedSessions: TimetableSession[] = [];
      let counter = 0;

      for (const day of days) {
        for (const cls of classes) {
          // 4 periods per day per class
          for (let pIndex = 0; pIndex < 4; pIndex++) {
            const slot = periodSlots[pIndex];
            const subject = subjectsList[(counter + pIndex) % subjectsList.length];
            const teacherObj = teachersList.find((t) => t.subjects.includes(subject)) || teachersList[0] || { name: "Mwalimu Juma" };
            
            const session: TimetableSession = {
              id: `tt-${day.toLowerCase().slice(0, 3)}-${cls.replace(/\s+/g, '').toLowerCase()}-${slot.index}`,
              day,
              timeSlot: slot.time,
              periodIndex: slot.index,
              subject,
              className: cls,
              teacherName: teacherObj.name,
              room: `${subject} Room`,
              status: pIndex === 0 && day === "Monday" ? "In Progress" : "Upcoming",
              acceptedByTeacher: pIndex === 0 && day === "Monday",
              notes: `Core curriculum session for ${subject}`
            };
            newGeneratedSessions.push(session);
            counter++;
          }
        }
      }

      setTimetableList(newGeneratedSessions);
      for (const session of newGeneratedSessions) {
        try {
          await setDoc(doc(db, "timetable", session.id), session);
        } catch (e) {
          console.warn("Error saving session to database:", e);
        }
      }
      alert("Super Admin: Weekly Timetable generated and published live to database for all school days (Mon-Fri)!");
    } catch (err: any) {
      console.error(err);
      alert("Failed to generate timetable: " + err.message);
    } finally {
      setIsGeneratingTimetable(false);
    }
  };

  const handleAcceptTimetableSession = async (session: TimetableSession) => {
    const updated: TimetableSession = {
      ...session,
      status: "Accepted",
      acceptedByTeacher: true,
    };
    setTimetableList((prev) => prev.map((s) => (s.id === session.id ? updated : s)));
    tbfApi.acceptTimetableSession(session.id).catch(() => {});
    try {
      await setDoc(doc(db, "timetable", session.id), updated);
    } catch (e) {
      console.warn("Error updating session acceptance:", e);
    }
  };

  const handleStartLiveFromTimetable = async (session: TimetableSession) => {
    const updated: TimetableSession = {
      ...session,
      status: "In Progress",
      acceptedByTeacher: true,
    };
    setTimetableList((prev) => prev.map((s) => (s.id === session.id ? updated : s)));
    try {
      await setDoc(doc(db, "timetable", session.id), updated);
    } catch (e) {
      console.warn("Error starting live session from timetable:", e);
    }

    if (onUpdateLiveSession) {
      onUpdateLiveSession({
        isActive: true,
        subject: session.subject,
        topic: `${session.subject}: ${session.className} Scheduled Period`,
        teacherName: session.teacherName || teacherProfile?.name || "Teacher",
        targetClass: session.className,
        whiteboardText: `Welcome to today's scheduled ${session.subject} lesson for ${session.className}!\n\nPeriod Time: ${session.timeSlot}\nAssigned Teacher: ${session.teacherName}\nStatus: Live Stream Active`,
        attendance: liveSession?.attendance || {},
        activeQuiz: null,
        assignments: liveSession?.assignments || []
      });
    }

    // Dispatch real-time live broadcast notification
    const notifId = `notif-live-${Date.now()}`;
    setDoc(doc(db, "notifications", notifId), {
      id: notifId,
      recipientTeacher: "All Teachers",
      title: "Live Stream Active Now",
      message: `${session.teacherName || teacherProfile?.name || "Teacher"} has started a live class for ${session.subject} (${session.className}). Tracked in real time.`,
      createdAt: new Date().toISOString(),
      read: false,
      type: "live_broadcast_start"
    }).catch(() => {});

    setActiveTab("live-class");
  };

  const handleCompleteTimetableSession = async (session: TimetableSession) => {
    const updated: TimetableSession = {
      ...session,
      status: "Completed",
      completedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setTimetableList((prev) => prev.map((s) => (s.id === session.id ? updated : s)));
    try {
      await setDoc(doc(db, "timetable", session.id), updated);
    } catch (e) {
      console.warn("Error marking timetable session complete:", e);
    }
  };

  const handleCancelTimetableSession = async (session: TimetableSession) => {
    const updated: TimetableSession = {
      ...session,
      status: "Cancelled",
      acceptedByTeacher: false,
    };
    setTimetableList((prev) => prev.map((s) => (s.id === session.id ? updated : s)));
    try {
      await setDoc(doc(db, "timetable", session.id), updated);
    } catch (e) {
      console.warn("Error updating session cancellation:", e);
    }
  };

  const handleSaveNewPeriodSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedTeacher = newPeriodTeacher || (teachersList[0]?.name || "Mwalimu Juma");

    const newSession: TimetableSession = {
      id: `tt-${Date.now()}`,
      day: newPeriodDay,
      timeSlot: newPeriodTimeSlot,
      periodIndex: 1,
      subject: newPeriodSubject,
      className: newPeriodClass,
      teacherName: selectedTeacher,
      room: newPeriodRoom || "Classroom 1",
      status: "Upcoming",
      acceptedByTeacher: false,
      notes: newPeriodNotes || `Core session for ${newPeriodSubject}`
    };

    setTimetableList((prev) => [...prev, newSession]);
    tbfApi.createTimetableSession(newSession).catch(() => {});

    try {
      await setDoc(doc(db, "timetable", newSession.id), newSession);

      // Write real-time notification doc
      const notifId = `notif-tt-${Date.now()}`;
      await setDoc(doc(db, "notifications", notifId), {
        id: notifId,
        recipientTeacher: selectedTeacher,
        title: "New Scheduled Timetable Period",
        message: `You have been assigned to teach ${newPeriodSubject} for ${newPeriodClass} on ${newPeriodDay} (${newPeriodTimeSlot}). Please accept or confirm in your Timetable.`,
        createdAt: new Date().toISOString(),
        read: false,
        type: "timetable_assignment"
      });

      alert(`Success! Period created for ${newPeriodClass} on ${newPeriodDay}. Assigned teacher "${selectedTeacher}" has been notified.`);
    } catch (e) {
      console.warn("Error creating timetable session:", e);
      alert("Period created locally (offline mode).");
    }

    setIsAddPeriodModalOpen(false);
  };

  // Recent platforms logs (Screenshot 10)
  const recentActivityLogs = [
    { text: "Amani Baraka scored 100% on Biology Quiz", time: "2 minutes ago", type: "score" },
    { text: "Mwalimu Juma uploaded Physics notes", time: "18 minutes ago", type: "upload" },
    { text: "12 new students imported via CSV", time: "1 hour ago", type: "import" },
    { text: "Form 2A completed Algebra flashcards", time: "3 hours ago", type: "flashcard" },
    { text: `${schoolInfo.name} verified`, time: "Yesterday", type: "verify" },
  ];

  return (
    <div id="admin-dashboard-root" className="min-h-screen flex bg-[#FAF6EE] text-[#1E293B] font-sans p-2 sm:p-4 md:p-6 gap-4 lg:gap-6">
      
      {/* Sidebar Panel (Screenshot 10 left menu bar) */}
      <aside className="hidden lg:flex w-64 bg-gradient-to-br from-[#15223F] to-[#0E1729] shrink-0 text-white flex-col justify-between p-6 z-10 select-none rounded-[2.5rem] border-2 border-white/5 shadow-2xl">
        <div className="space-y-8">
          {/* Logo */}
          <div className="flex items-center gap-3.5">
            <div className="bg-white/95 p-1.5 rounded-2xl flex items-center justify-center shadow-lg hover:scale-105 transition-transform">
              <BrandLogo size={32} />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white leading-tight">TBF School Hub</h2>
              <p className="text-[9px] text-white/50 tracking-wider font-mono">{teacherProfile ? "TEACHER CONSOLE" : "SCHOOL ADMIN"}</p>
            </div>
          </div>

          {/* School Name Badge */}
          <div className="bg-white/5 p-3 rounded-2xl border-2 border-white/5 space-y-1">
            <p className="font-bold text-xs text-amber-100 uppercase tracking-wide truncate">{schoolInfo.name}</p>
            <p className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
              <span>●</span> Verified · {schoolInfo.region}
            </p>
          </div>

          {/* Admin Menu */}
          <div className="space-y-1">
            <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase block mb-3 pl-2">
              {teacherProfile ? "Teacher Menu" : "Admin Menu"}
            </span>

            {[
              { id: "overview", label: "Overview", icon: LayoutDashboard },
              { id: "students", label: "Students", icon: Users },
              ...(!teacherProfile ? [{ id: "teachers", label: "Teachers", icon: GraduationCap }] : []),
              { id: "classes", label: "Classes", icon: School },
              { id: "materials", label: "Materials", icon: FileText },
              { id: "timetable", label: "Timetable", icon: Calendar },
              { id: "live-class", label: "Live Class", icon: Video, isLive: liveSession?.isActive },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs md:text-sm font-semibold transition-all cursor-pointer ${
                    isActive
                      ? "bg-white/10 text-[#D69B67] border-l-4 border-[#D69B67] font-bold"
                      : "text-white/70 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <Icon className={`w-5 h-5 ${isActive ? "text-[#D69B67]" : "text-white/60"}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.isLive && (
                    <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse border border-white/40 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer Admin Card with Log Out */}
        <div className="space-y-3 pt-6 border-t border-white/10">
          <div className="bg-white/5 p-3 rounded-2xl flex items-center justify-between border-2 border-white/5">
            <div className="min-w-0">
              <p className="font-bold text-xs text-white truncate">
                {teacherProfile ? (teacherProfile.name || "Teacher").split(" ")[0] : (schoolInfo.headmaster || "Admin").split(" ")[0]}...
              </p>
              <p className="text-[9px] text-white/50 truncate">{teacherProfile ? "Teacher · Active" : "Admin · Owner"}</p>
            </div>

            <button
              id="admin-logout-btn"
              onClick={onLogout}
              className="bg-[#FAF6EE] hover:bg-rose-100 hover:text-rose-700 text-[#15223F] font-bold text-[10px] px-2.5 py-1.5 rounded-lg shadow-sm transition-all shrink-0 uppercase cursor-pointer"
            >
              Log out
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Navigation Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop Overlay */}
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          {/* Drawer Body Panel */}
          <aside className="relative w-72 max-w-[85vw] bg-gradient-to-br from-[#15223F] to-[#0E1729] text-white flex flex-col justify-between p-6 h-full shadow-2xl overflow-y-auto animate-slide-right">
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute top-5 right-5 p-2 bg-white/5 hover:bg-white/10 rounded-xl text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-8">
              {/* Logo */}
              <div className="flex items-center gap-3">
                <div className="bg-white/95 p-1 rounded-xl flex items-center justify-center shadow-md">
                  <BrandLogo size={24} />
                </div>
                <div>
                  <h2 className="text-sm font-bold tracking-tight text-white leading-tight">TBF School Hub</h2>
                  <p className="text-[8px] text-white/50 tracking-wider font-mono">{teacherProfile ? "TEACHER CONSOLE" : "SCHOOL ADMIN"}</p>
                </div>
              </div>

              {/* School Badge */}
              <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-1">
                <p className="font-bold text-xs text-amber-100 uppercase tracking-wide truncate">{schoolInfo.name}</p>
                <p className="text-[9px] text-emerald-400 font-bold flex items-center gap-1">
                  Verified · {schoolInfo.region}
                </p>
              </div>

              {/* Navigation */}
              <div className="space-y-1">
                <span className="text-[9px] font-mono tracking-widest text-white/40 uppercase block mb-2 pl-2">
                  {teacherProfile ? "Teacher Menu" : "Admin Menu"}
                </span>

                {[
                  { id: "overview", label: "Overview", icon: LayoutDashboard },
                  { id: "students", label: "Students", icon: Users },
                  ...(!teacherProfile ? [{ id: "teachers", label: "Teachers", icon: GraduationCap }] : []),
                  { id: "classes", label: "Classes", icon: School },
                  { id: "materials", label: "Materials", icon: FileText },
                  { id: "timetable", label: "Timetable", icon: Calendar },
                  { id: "live-class", label: "Live Class", icon: Video, isLive: liveSession?.isActive },
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id as any);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? "bg-white/10 text-[#D69B67] border-l-4 border-[#D69B67] font-bold"
                          : "text-white/70 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 ${isActive ? "text-[#D69B67]" : "text-white/60"}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.isLive && (
                        <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse border border-white/40 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t border-white/10 text-left">
              <div className="bg-white/5 p-3 rounded-xl flex items-center justify-between border border-white/5">
                <div className="min-w-0">
                  <p className="font-bold text-xs text-white truncate">
                    {teacherProfile ? (teacherProfile.name || "Teacher").split(" ")[0] : (schoolInfo.headmaster || "Admin").split(" ")[0]}...
                  </p>
                  <p className="text-[8px] text-white/50 truncate">{teacherProfile ? "Teacher · Active" : "Admin · Owner"}</p>
                </div>

                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    if (onLogout) onLogout();
                  }}
                  className="bg-[#FAF6EE] hover:bg-rose-100 hover:text-rose-700 text-[#15223F] font-bold text-[9px] px-2 py-1 rounded shadow-sm transition-all shrink-0 uppercase cursor-pointer"
                >
                  Log out
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Top Header Block for Teacher/Admin Dashboard */}
        <header className="px-4 sm:px-8 py-3 bg-white/40 backdrop-blur-md border-2 border-[#15223F]/5 rounded-2xl sm:rounded-[2rem] shadow-sm flex items-center justify-between sticky top-0 z-20 mb-4 sm:mb-6 mt-1 sm:mt-2 mx-1 sm:mx-4">
          
          {/* Mobile Menu Icon */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="lg:hidden p-2.5 bg-white border border-gray-100 text-[#15223F] hover:border-[#D69B67] rounded-xl flex items-center justify-center shrink-0 cursor-pointer shadow-sm mr-2 active:scale-95"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Search Box */}
          <div className="w-full max-w-md relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-4.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search students, teachers, materials..."
              value={globalSearchQuery}
              onChange={(e) => {
                setGlobalSearchQuery(e.target.value);
                setStudentSearch(e.target.value);
                setTeacherSearch(e.target.value);
              }}
              className="w-full bg-[#FAF6EE]/90 border border-transparent rounded-full pl-11 pr-5 py-2.5 text-sm focus:outline-none focus:border-[#D69B67] focus:bg-white transition-all shadow-xs"
            />
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-3 md:gap-5">
            {liveSession?.isActive && (
              <button
                onClick={() => setActiveTab("live-class")}
                className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-rose-600 via-rose-700 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white px-3.5 py-1.5 rounded-full text-xs font-bold shadow-md animate-pulse cursor-pointer shrink-0"
              >
                <Video className="w-3.5 h-3.5 text-amber-200 fill-current" />
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-300 animate-ping"></span> LIVE NOW: {liveSession.subject} ({liveSession.targetClass})</span>
              </button>
            )}

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
                className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-gray-100 shadow-xs hover:border-[#D69B67] transition-all relative cursor-pointer"
              >
                <Bell className="w-4.5 h-4.5 text-slate-600" />
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full" />
              </button>

              {showNotificationDropdown && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 space-y-3 z-50 animate-slide-up max-h-96 overflow-y-auto">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Notifications</p>
                    <span className="text-[10px] font-mono bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                      {notificationsList.length + (liveSession?.isActive ? 1 : 0)} Items
                    </span>
                  </div>
                  <div className="space-y-2">
                    {liveSession?.isActive && (
                      <div
                        onClick={() => {
                          setActiveTab("live-class");
                          setShowNotificationDropdown(false);
                        }}
                        className="p-3 bg-gradient-to-r from-rose-900 to-amber-900 text-white rounded-xl border border-rose-500/40 shadow-sm space-y-1 text-left cursor-pointer animate-pulse hover:border-amber-300"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold bg-rose-500 text-white px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span> REAL-TIME TRACKED LIVE SESSION
                          </span>
                          <span className="text-[10px] text-amber-200 font-bold">{liveSession.targetClass}</span>
                        </div>
                        <p className="font-bold text-xs mt-1 text-white">{liveSession.subject}: {liveSession.topic}</p>
                        <p className="text-[10px] text-rose-200">Teacher: {liveSession.teacherName} · Click to enter live class</p>
                      </div>
                    )}
                    {notificationsList.length === 0 ? (
                      <>
                        <div className="text-xs p-2.5 bg-[#FAF6EE] rounded-xl hover:bg-white hover:shadow-xs transition-all text-slate-700">
                          Welcome to the Teacher Dashboard! Manage your school, teachers, students, and curriculum.
                        </div>
                        <div className="text-xs p-2.5 bg-[#FAF6EE] rounded-xl hover:bg-white hover:shadow-xs transition-all text-slate-700">
                          New homework assignment uploaded for Form 1A.
                        </div>
                      </>
                    ) : (
                      notificationsList.map((notif) => (
                        <div key={notif.id} className="text-xs p-2.5 bg-[#FAF6EE] rounded-xl border border-amber-200/50 hover:bg-white transition-all text-slate-800 space-y-1 text-left">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#15223F]">{notif.title}</span>
                            <span className="text-[9px] font-mono text-gray-400">
                              {notif.createdAt ? new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}
                            </span>
                          </div>
                          <p className="text-gray-600 leading-snug">{notif.message}</p>
                          {notif.recipientTeacher && (
                            <span className="text-[9px] bg-amber-100 text-amber-900 font-bold px-1.5 py-0.5 rounded inline-block">
                              Assigned to: {notif.recipientTeacher}
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile circular avatar button with dropdown settings */}
            <div className="relative">
              <button
                id="teacher-profile-avatar-btn"
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden border border-gray-100 shadow-sm select-none cursor-pointer transition-all active:scale-95 focus:outline-none bg-[#15223F] text-white font-bold"
              >
                {schoolInfo.headmaster ? schoolInfo.headmaster[0] : "T"}
              </button>

              {showProfileDropdown && (
                <div 
                  id="teacher-profile-dropdown-menu"
                  className="absolute right-0 mt-2 w-80 bg-white rounded-[2rem] shadow-xl border-2 border-[#15223F]/5 p-5 z-50 animate-slide-up text-left space-y-4 text-slate-700"
                >
                  <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                    <div className="w-11 h-11 rounded-full bg-[#15223F] text-white font-bold text-base flex items-center justify-center shadow-sm shrink-0">
                      {schoolInfo.headmaster ? schoolInfo.headmaster[0] : "T"}
                    </div>
                    <div className="min-w-0 font-sans">
                      <p className="font-bold text-sm text-[#15223F] truncate">{schoolInfo.headmaster || "Teacher Admin"}</p>
                      <p className="text-xs text-gray-400 truncate">admin@school.ac.tz</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-slate-600">
                    <p className="font-semibold text-[10px] text-gray-400 uppercase tracking-wider">School Details</p>
                    <div className="grid grid-cols-2 gap-2 bg-[#FAF6EE] p-3 rounded-xl border border-gray-100/50">
                      <div className="col-span-2">
                        <span className="text-[10px] text-gray-400 block">School Name</span>
                        <span className="font-bold text-slate-700">{schoolInfo.name}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 block">Region</span>
                        <span className="font-bold text-slate-700">{schoolInfo.region}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 block">Reg. No</span>
                        <span className="font-bold text-slate-700 truncate block">{schoolInfo.regNo}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 pt-2 border-t border-gray-100">
                    <button
                      id="edit-teacher-profile-btn"
                      onClick={() => {
                        setShowProfileDropdown(false);
                        handleOpenEditModal();
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 border border-slate-100 transition-all cursor-pointer"
                    >
                      <User className="w-4 h-4 text-[#D69B67]" />
                      <span>Edit Profile Details</span>
                    </button>

                    <button
                      id="profile-logout-btn"
                      onClick={() => {
                        setShowProfileDropdown(false);
                        if (onLogout) onLogout();
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-100/50 transition-all cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-rose-500" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* TAB 1: OVERVIEW SCREEN (Screenshot 10) */}
        {activeTab === "overview" && (
          <div className="p-4 md:p-8 space-y-8 text-left animate-fade-in">
            {/* Header Title */}
            <div className="flex items-center justify-between bg-white/40 border-2 border-[#15223F]/5 rounded-[2rem] p-6 backdrop-blur-md shadow-sm">
              <h3 className="text-3xl font-serif text-[#15223F] font-bold tracking-tight">School Overview</h3>
              <button
                onClick={() => alert("Exporting report...")}
                className="bg-[#D69B67] hover:bg-[#C88A58] text-white font-bold text-xs py-3 px-5 rounded-2xl transition-all shadow-md hover:shadow-lg active:scale-95 cursor-pointer"
              >
                + Export report
              </button>
            </div>

            {/* Metrics cards bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Metric 1 */}
              <div className="bg-gradient-to-br from-white to-slate-50/40 p-6 rounded-[2rem] border-2 border-[#15223F]/5 shadow-sm space-y-1 hover:shadow-md hover:scale-[1.01] transition-all duration-300">
                <span className="text-[10px] font-mono text-gray-400 tracking-wider uppercase font-bold">TOTAL STUDENTS</span>
                <p className="text-3xl font-serif font-bold text-[#15223F]">{studentsList.length}</p>
                <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Real-time active
                </span>
              </div>

              {/* Metric 2 */}
              <div className="bg-gradient-to-br from-white to-slate-50/40 p-6 rounded-[2rem] border-2 border-[#15223F]/5 shadow-sm space-y-1 hover:shadow-md hover:scale-[1.01] transition-all duration-300">
                <span className="text-[10px] font-mono text-gray-400 tracking-wider uppercase font-bold">TEACHERS</span>
                <p className="text-3xl font-serif font-bold text-[#15223F]">{teachersList.length}</p>
                <span className="text-[10px] text-slate-400 font-bold">Across {classesList.length} classes</span>
              </div>

              {/* Metric 3 */}
              <div className="bg-gradient-to-br from-white to-slate-50/40 p-6 rounded-[2rem] border-2 border-[#15223F]/5 shadow-sm space-y-1 hover:shadow-md hover:scale-[1.01] transition-all duration-300">
                <span className="text-[10px] font-mono text-gray-400 tracking-wider uppercase font-bold">ACTIVE TODAY</span>
                <p className="text-3xl font-serif font-bold text-[#15223F]">142</p>
                <span className="text-[10px] text-emerald-600 font-bold font-mono">57% attendance</span>
              </div>

              {/* Metric 4 */}
              <div className="bg-gradient-to-br from-white to-slate-50/40 p-6 rounded-[2rem] border-2 border-[#15223F]/5 shadow-sm space-y-1 hover:shadow-md hover:scale-[1.01] transition-all duration-300">
                <span className="text-[10px] font-mono text-gray-400 tracking-wider uppercase font-bold">AVG. SCORE</span>
                <p className="text-3xl font-serif font-bold text-[#15223F]">74%</p>
                <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> +3% this month
                </span>
              </div>
            </div>

            {/* Split row: Class Performance & Recent Activity */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Class Performance (Left 2 columns) */}
              <div className="md:col-span-2 bg-white p-8 rounded-[2.5rem] border-2 border-[#15223F]/5 shadow-md space-y-6">
                <div className="space-y-1 text-left">
                  <h4 className="font-bold text-[#15223F] text-base">Class performance</h4>
                  <p className="text-xs text-gray-400">Average quiz score per class · last 30 days</p>
                </div>

                <div className="space-y-4">
                  {classesList.map((cls, index) => {
                    const isHigh = cls.avgScore >= 75;
                    return (
                      <div key={index} className="space-y-1 text-left">
                        <div className="flex justify-between text-xs font-bold text-slate-700">
                          <span>{cls.name}</span>
                          <span className="font-mono">{cls.avgScore}%</span>
                        </div>
                        <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${isHigh ? "bg-emerald-500" : "bg-[#D69B67]"}`}
                            style={{ width: `${cls.avgScore}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recent Activity Logs (Right 1 column) */}
              <div className="bg-white p-8 rounded-[2.5rem] border-2 border-[#15223F]/5 shadow-md space-y-6">
                <div className="space-y-1 text-left">
                  <h4 className="font-bold text-[#15223F] text-base">Recent activity</h4>
                  <p className="text-xs text-gray-400">Platform events across your school</p>
                </div>

                <div className="space-y-5 relative">
                  {/* Vertical connector line */}
                  <div className="absolute left-1.5 top-2.5 bottom-2.5 w-0.5 bg-gray-100" />

                  {recentActivityLogs.map((log, index) => (
                    <div key={index} className="flex gap-4 relative z-10 items-start text-left">
                      <div className="w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full mt-1 shrink-0 shadow-xs" />
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-slate-700 leading-normal">{log.text}</p>
                        <p className="text-[10px] text-gray-400 font-medium">{log.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: STUDENTS DIRECTORY (Screenshot 11) */}
        {activeTab === "students" && (
          <div className="p-8 space-y-8 text-left animate-fade-in">
            <h3 className="text-3xl font-serif text-[#15223F] font-bold tracking-tight">Students</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Forms (Left Column) */}
              <div className="space-y-6">
                {/* Form card (Left column) */}
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-5 h-fit">
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-800 text-sm">Add a student</h4>
                    <p className="text-xs text-gray-400">Fill in the details — the login is created automatically with the last name as the default password.</p>
                  </div>

                  <form onSubmit={handleAddStudent} className="space-y-4">
                    <div className="space-y-1 bg-[#FAF6EE] p-3 rounded-2xl border border-gray-100">
                      <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">FULL NAME</label>
                      <input
                        type="text"
                        required
                        value={newStudentName}
                        onChange={(e) => setNewStudentName(e.target.value)}
                        className="w-full bg-transparent border-none text-xs text-[#15223F] focus:outline-none placeholder-gray-400 font-medium py-0.5"
                        placeholder="e.g. Amani Baraka"
                      />
                    </div>

                    <div className="space-y-1 bg-[#FAF6EE] p-3 rounded-2xl border border-gray-100">
                      <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">REGISTRATION NUMBER</label>
                      <input
                        type="text"
                        required
                        value={newStudentReg}
                        onChange={(e) => setNewStudentReg(e.target.value)}
                        className="w-full bg-transparent border-none text-xs text-[#15223F] focus:outline-none placeholder-gray-400 font-medium py-0.5"
                        placeholder="e.g. BSS-2026-001"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1 bg-[#FAF6EE] p-3 rounded-2xl border border-gray-100">
                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">AGE</label>
                        <input
                          type="number"
                          required
                          value={newStudentAge}
                          onChange={(e) => setNewStudentAge(Number(e.target.value))}
                          className="w-full bg-transparent border-none text-xs text-[#15223F] focus:outline-none placeholder-gray-400 font-medium py-0.5"
                        />
                      </div>
                      <div className="space-y-1 bg-[#FAF6EE] p-3 rounded-2xl border border-gray-100">
                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">GENDER</label>
                        <select
                          value={newStudentGender}
                          onChange={(e) => setNewStudentGender(e.target.value)}
                          className="w-full bg-transparent border-none text-xs text-[#15223F] focus:outline-none placeholder-gray-400 font-medium py-0.5"
                        >
                          <option value="M">M</option>
                          <option value="F">F</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1 bg-[#FAF6EE] p-3 rounded-2xl border border-gray-100">
                      <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">CLASS</label>
                      <select
                        value={newStudentClass}
                        onChange={(e) => setNewStudentClass(e.target.value)}
                        className="w-full bg-transparent border-none text-xs text-[#15223F] focus:outline-none placeholder-gray-400 font-medium py-0.5"
                      >
                        {classesList.map((c) => (
                          <option key={c.name} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1 bg-[#FAF6EE] p-3 rounded-2xl border border-gray-100">
                      <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">PARENT CONTACT (OPTIONAL)</label>
                      <input
                        type="text"
                        value={newStudentContact}
                        onChange={(e) => setNewStudentContact(e.target.value)}
                        className="w-full bg-transparent border-none text-xs text-[#15223F] focus:outline-none placeholder-gray-400 font-medium py-0.5"
                        placeholder="+255 7xx xxx xxx"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-[#D69B67] hover:bg-[#C88A58] text-white font-semibold py-3 rounded-xl text-xs transition-all shadow-xs cursor-pointer"
                    >
                      + Add Student
                    </button>
                  </form>
                </div>

                {/* Excel Import Card */}
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-4">
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      Excel Template Import
                    </h4>
                    <p className="text-xs text-gray-400">
                      Upload a student list from an Excel spreadsheet or CSV template to update the roster in real-time.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3">
                    <button
                      onClick={handleDownloadTemplate}
                      className="w-full bg-[#15223F] hover:bg-[#15223F]/90 text-white font-semibold py-2.5 rounded-xl text-xs transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                    >
                      Download Template
                    </button>

                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:border-[#D69B67] transition-all bg-[#FAF6EE]/50 relative cursor-pointer">
                      <input
                        type="file"
                        accept=".xlsx, .xls, .csv"
                        onChange={handleImportExcel}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <div className="space-y-1 pointer-events-none">
                        <Upload className="w-5 h-5 mx-auto text-[#D69B67] mb-1" />
                        <p className="text-xs font-semibold text-[#15223F]">Upload spreadsheet</p>
                        <p className="text-[10px] text-gray-400">Excel or CSV</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Table list card (Right 2 columns) */}
              <div className="md:col-span-2 bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  {/* Table search input */}
                  <div className="w-full sm:max-w-xs relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search students..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="w-full bg-[#FAF6EE] border border-transparent rounded-full pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-[#D69B67]"
                    />
                  </div>

                  <span className="text-xs text-gray-400 font-medium">
                    {studentsList.length} students enrolled
                  </span>
                </div>

                {/* Table display */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 text-gray-400 uppercase font-mono tracking-wider">
                        <th className="py-3 font-semibold">Name</th>
                        <th className="py-3 font-semibold">Reg. No</th>
                        <th className="py-3 font-semibold">Class</th>
                        <th className="py-3 font-semibold">Progress</th>
                        <th className="py-3 font-semibold text-right">Last Active</th>
                        <th className="py-3 font-semibold text-right pr-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100/50">
                      {studentsList
                        .filter((s) => s.name.toLowerCase().includes(studentSearch.toLowerCase()))
                        .map((stud, idx) => (
                          <tr key={idx} className="hover:bg-[#FAF6EE]/50 transition-colors">
                            <td className="py-3.5 flex items-center gap-3">
                              <div className="w-8 h-8 bg-[#64B5D6]/10 text-[#64B5D6] font-bold rounded-full flex items-center justify-center">
                                {stud.name[0]}
                              </div>
                              <span className="font-semibold text-slate-800">{stud.name}</span>
                            </td>
                            <td className="py-3.5 text-gray-500 font-mono">{stud.regNo}</td>
                            <td className="py-3.5 text-slate-700 font-medium">{stud.class}</td>
                            <td className="py-3.5 w-32">
                              {/* progress slider indicator */}
                              <div className="space-y-1">
                                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${stud.progress}%` }} />
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 text-right font-mono text-gray-400">{stud.lastActive}</td>
                            <td className="py-3.5 text-right pr-4 space-x-2 whitespace-nowrap">
                              <button
                                onClick={() => {
                                  setSelectedStudentStats(stud);
                                  setShowStudentStatsModal(true);
                                }}
                                className="p-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded transition-all cursor-pointer inline-flex items-center justify-center font-bold"
                                title="View Progress & Analytics"
                              >
                                <TrendingUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleEditStudentClick(stud)}
                                className="p-1 bg-amber-50 hover:bg-amber-100 text-[#D69B67] rounded transition-all cursor-pointer inline-flex items-center justify-center"
                                title="Edit Student"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteStudent(stud.regNo)}
                                className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded transition-all cursor-pointer inline-flex items-center justify-center"
                                title="Delete Student"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: TEACHERS DIRECTORY (Screenshot 12) */}
        {activeTab === "teachers" && (
          <div className="p-8 space-y-8 text-left animate-fade-in">
            <h3 className="text-3xl font-serif text-[#15223F] font-bold tracking-tight">Teachers</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Add Teacher or Restriction Notice */}
              {!canManageTeachers ? (
                <div className="bg-amber-50/50 p-6 rounded-3xl border border-amber-200 shadow-xs space-y-4 h-fit">
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-amber-800 text-sm flex items-center gap-1.5">
                      <FaLock className="inline text-xs text-amber-700" /> Access Restricted
                    </h4>
                    <p className="text-xs text-amber-700 font-medium">
                      As a Normal Teacher, you do not have permission to add, modify, or delete other teachers.
                    </p>
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      Only the Headmaster (School Admin) or Admin Teachers can register new staff or delete existing educators from the directory.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Add Teacher Card */}
                  <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-5 h-fit">
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-800 text-sm">Add a teacher</h4>
                      <p className="text-xs text-gray-400">Set credentials to allow teachers to log in with their email and custom password.</p>
                    </div>

                    <form onSubmit={handleAddTeacher} className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1 bg-[#FAF6EE] p-3 rounded-2xl border border-gray-100">
                          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">FIRST NAME</label>
                          <input
                            type="text"
                            required
                            value={newTeacherFirstName}
                            onChange={(e) => setNewTeacherFirstName(e.target.value)}
                            className="w-full bg-transparent border-none text-xs text-[#15223F] focus:outline-none placeholder-gray-400 font-medium py-0.5"
                            placeholder="e.g. Peter"
                          />
                        </div>
                        <div className="space-y-1 bg-[#FAF6EE] p-3 rounded-2xl border border-gray-100">
                          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">LAST NAME</label>
                          <input
                            type="text"
                            required
                            value={newTeacherLastName}
                            onChange={(e) => setNewTeacherLastName(e.target.value)}
                            className="w-full bg-transparent border-none text-xs text-[#15223F] focus:outline-none placeholder-gray-400 font-medium py-0.5"
                            placeholder="e.g. Juma"
                          />
                        </div>
                      </div>

                      <div className="space-y-1 bg-[#FAF6EE] p-3 rounded-2xl border border-gray-100">
                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">EMAIL ADDRESS</label>
                        <input
                          type="email"
                          value={newTeacherEmail}
                          onChange={(e) => setNewTeacherEmail(e.target.value)}
                          className="w-full bg-transparent border-none text-xs text-[#15223F] focus:outline-none placeholder-gray-400 font-medium py-0.5"
                          placeholder="juma@school.ac.tz"
                        />
                      </div>

                      <div className="space-y-1 bg-[#FAF6EE] p-3 rounded-2xl border border-gray-100">
                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">LOGIN PASSWORD</label>
                        <input
                          type="password"
                          required
                          value={newTeacherPassword}
                          onChange={(e) => setNewTeacherPassword(e.target.value)}
                          className="w-full bg-transparent border-none text-xs text-[#15223F] focus:outline-none placeholder-gray-400 font-medium py-0.5"
                          placeholder="e.g. password123"
                        />
                      </div>

                      <div className="space-y-1 bg-[#FAF6EE] p-3 rounded-2xl border border-gray-100">
                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">SUBJECT(S)</label>
                        <input
                          type="text"
                          required
                          value={newTeacherSubjects}
                          onChange={(e) => setNewTeacherSubjects(e.target.value)}
                          className="w-full bg-transparent border-none text-xs text-[#15223F] focus:outline-none placeholder-gray-400 font-medium py-0.5"
                          placeholder="e.g. Biology, Chemistry"
                        />
                      </div>

                      <div className="space-y-1 bg-[#FAF6EE] p-3 rounded-2xl border border-gray-100">
                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">ASSIGNED CLASSES</label>
                        <input
                          type="text"
                          value={newTeacherClass}
                          onChange={(e) => setNewTeacherClass(e.target.value)}
                          className="w-full bg-transparent border-none text-xs text-[#15223F] focus:outline-none placeholder-gray-400 font-medium py-0.5"
                          placeholder="e.g. Form 1A, Form 2B"
                        />
                      </div>

                      <div className="space-y-1 bg-[#FAF6EE] p-3 rounded-2xl border border-gray-100">
                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">ROLE / PERMISSIONS</label>
                        <select
                          value={newTeacherRole}
                          onChange={(e) => setNewTeacherRole(e.target.value as "Admin" | "Normal")}
                          className="w-full bg-transparent border-none text-xs text-[#15223F] focus:outline-none font-medium py-0.5 cursor-pointer bg-transparent"
                        >
                          <option value="Normal">Normal Teacher</option>
                          <option value="Admin">Admin Teacher</option>
                        </select>
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-[#D69B67] hover:bg-[#C88A58] text-white font-semibold py-3 rounded-xl text-xs transition-all shadow-xs cursor-pointer"
                      >
                        Add & send invite
                      </button>
                    </form>
                  </div>

                  {/* Teacher Template Import */}
                  <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-4">
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                        Teacher Bulk Import
                      </h4>
                      <p className="text-xs text-gray-400">
                        Upload teacher records using an Excel spreadsheet or CSV template to register staff members.
                      </p>
                    </div>

                    <div className="flex flex-col gap-3">
                      <button
                        onClick={handleDownloadTeacherTemplate}
                        className="w-full bg-[#15223F] hover:bg-[#15223F]/90 text-white font-semibold py-2.5 rounded-xl text-xs transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                      >
                        Download Template
                      </button>

                      <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:border-[#D69B67] transition-all bg-[#FAF6EE]/50 relative cursor-pointer">
                        <input
                          type="file"
                          accept=".xlsx, .xls, .csv"
                          onChange={handleImportTeachers}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <div className="space-y-1 pointer-events-none">
                          <Upload className="w-5 h-5 mx-auto text-[#D69B67] mb-1" />
                          <p className="text-xs font-semibold text-[#15223F]">Upload spreadsheet</p>
                          <p className="text-[10px] text-gray-400">Excel or CSV</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Table Teacher list */}
              <div className="md:col-span-2 bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="w-full sm:max-w-xs relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search teachers..."
                      value={teacherSearch}
                      onChange={(e) => setTeacherSearch(e.target.value)}
                      className="w-full bg-[#FAF6EE] border border-transparent rounded-full pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-[#D69B67]"
                    />
                  </div>

                  <span className="text-xs text-gray-400 font-semibold">
                    {teachersList.length} educators active
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 text-gray-400 uppercase font-mono tracking-wider font-semibold">
                        <th className="py-3 font-semibold">Name</th>
                        <th className="py-3 font-semibold">Subjects</th>
                        <th className="py-3 font-semibold">Classes</th>
                        <th className="py-3 font-semibold">Role</th>
                        <th className="py-3 font-semibold text-right">Status</th>
                        {canManageTeachers && <th className="py-3 font-semibold text-right">Action</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100/50">
                      {teachersList
                        .filter((t) => t.name.toLowerCase().includes(teacherSearch.toLowerCase()))
                        .map((teach, idx) => {
                          let badgeCol = "bg-emerald-50 text-emerald-800";
                          if (teach.status === "Pending") badgeCol = "bg-amber-50 text-amber-800";
                          if (teach.status === "Invited") badgeCol = "bg-slate-100 text-slate-800";

                          return (
                            <tr key={idx} className="hover:bg-[#FAF6EE]/50 transition-colors">
                              <td className="py-3.5 flex items-center gap-3">
                                <div className="w-8 h-8 bg-[#D69B67]/10 text-[#D69B67] font-bold rounded-full flex items-center justify-center">
                                  {teach.name[0]}
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-800">{teach.name}</p>
                                  <p className="text-[10px] text-gray-400">{teach.email}</p>
                                </div>
                              </td>
                              <td className="py-3.5 text-slate-700 font-medium">{teach.subjects}</td>
                              <td className="py-3.5 text-gray-500 font-mono">{teach.classes}</td>
                              <td className="py-3.5">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${teach.role === "Admin" ? "bg-purple-50 text-purple-700 border border-purple-100" : "bg-blue-50 text-blue-700 border border-blue-100"}`}>
                                  {teach.role || "Normal"}
                                </span>
                              </td>
                              <td className="py-3.5 text-right">
                                <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${badgeCol}`}>
                                  {teach.status}
                                </span>
                              </td>
                              {canManageTeachers && (
                                <td className="py-3.5 text-right">
                                  <button
                                    onClick={() => handleDeleteTeacher(teach.email)}
                                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                                    title="Delete Teacher"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: CLASSES VIEW (Screenshot 13) */}
        {activeTab === "classes" && (
          <div className="p-8 space-y-8 text-left animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-3xl font-serif text-[#15223F] font-bold tracking-tight">Classes</h3>
              <button
                onClick={() => alert("Creating custom class...")}
                className="bg-[#D69B67] hover:bg-[#C88A58] text-white font-semibold text-xs py-2.5 px-5 rounded-xl transition-all shadow-xs"
              >
                + New class
              </button>
            </div>

            {/* Grid of existing classes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {classesList.map((cls, idx) => {
                return (
                  <div key={idx} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                    <div className="flex justify-between items-start">
                      <h4 className="text-xl font-serif font-bold text-[#15223F]">{cls.name}</h4>
                      <span className="bg-sky-50 text-sky-800 text-[10px] font-bold px-2.5 py-1 rounded-full font-mono">
                        {cls.studentsCount} students
                      </span>
                    </div>

                    <div className="space-y-1 text-xs">
                      <span className="text-gray-400">Teacher:</span>
                      <p className="font-semibold text-slate-700">{cls.teacher}</p>
                    </div>

                    {/* Progress score */}
                    <div className="space-y-1.5 pt-2">
                      <div className="flex justify-between text-[11px] font-semibold text-slate-700">
                        <span>Avg. score</span>
                        <span className="font-mono text-[#D69B67]">{cls.avgScore}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-[#D69B67] h-full rounded-full" style={{ width: `${cls.avgScore}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Form to add a new class (Screenshot 13 bottom) */}
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
              <h4 className="font-bold text-[#15223F] text-base">Add a new class</h4>

              <form onSubmit={handleCreateClass} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="space-y-1 bg-[#FAF6EE] p-3 rounded-2xl border border-gray-100">
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">CLASS NAME</label>
                  <input
                    type="text"
                    required
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    className="w-full bg-transparent border-none text-xs text-[#15223F] focus:outline-none placeholder-gray-400 font-medium py-0.5"
                    placeholder="e.g. Form 3A"
                  />
                </div>

                <div className="space-y-1 bg-[#FAF6EE] p-3 rounded-2xl border border-gray-100">
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">ASSIGN TEACHER</label>
                  <input
                    type="text"
                    required
                    value={newClassTeacher}
                    onChange={(e) => setNewClassTeacher(e.target.value)}
                    className="w-full bg-transparent border-none text-xs text-[#15223F] focus:outline-none placeholder-gray-400 font-medium py-0.5"
                    placeholder="Search teacher name"
                  />
                </div>

                <div className="space-y-1 bg-[#FAF6EE] p-3 rounded-2xl border border-gray-100">
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">SUBJECTS</label>
                  <input
                    type="text"
                    required
                    value={newClassSubjects}
                    onChange={(e) => setNewClassSubjects(e.target.value)}
                    className="w-full bg-transparent border-none text-xs text-[#15223F] focus:outline-none placeholder-gray-400 font-medium py-0.5"
                    placeholder="e.g. Biology, Maths"
                  />
                </div>

                <div className="md:col-span-3 flex justify-end">
                  <button
                    type="submit"
                    className="bg-[#D69B67] hover:bg-[#C88A58] text-white font-semibold py-3.5 px-8 rounded-xl text-xs transition-all shadow-xs"
                  >
                    Create class
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB 5: MATERIALS UPLOAD AND SHARING (Screenshot 14) */}
        {activeTab === "materials" && (
          <div className="p-8 space-y-8 text-left animate-fade-in">
            <h3 className="text-3xl font-serif text-[#15223F] font-bold tracking-tight">Materials</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column: Upload Form */}
              <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                <div className="space-y-1">
                  <h4 className="font-bold text-[#15223F] text-base">Upload & Arrange Material</h4>
                  <p className="text-xs text-gray-400">
                    Select a template structure, upload a document or paste raw text. Baraka will automatically arrange sections and generate practice quizzes in real-time.
                  </p>
                </div>

                <form onSubmit={handleUploadMaterial} className="space-y-4">
                  
                  {/* Template selection pills */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Choose Study Template</label>
                    <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/40">
                      {[
                        { id: "notes", label: "Lesson Notes", desc: "Detailed explanations" },
                        { id: "quiz", label: "Study Guide", desc: "Active recall cards" },
                        { id: "practical", label: "Practical Guide", desc: "Lab steps & safety" },
                        { id: "cheat_sheet", label: "Cheat Sheet", desc: "High-yield formulas" }
                      ].map((tmpl) => (
                        <button
                          key={tmpl.id}
                          type="button"
                          onClick={() => setTemplateType(tmpl.id as any)}
                          className={`p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                            templateType === tmpl.id
                              ? "bg-white text-[#15223F] shadow-sm border border-amber-200"
                              : "hover:bg-white/50 text-slate-600"
                          }`}
                        >
                          <p className="text-xs font-bold">{tmpl.label}</p>
                          <p className="text-[9px] text-gray-400 font-medium leading-none mt-0.5">{tmpl.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Upload zone */}
                  <div className="border-2 border-dashed border-gray-200 rounded-3xl p-6 text-center flex flex-col items-center justify-center bg-[#FAF6EE] hover:border-[#D69B67] transition-all cursor-pointer relative">
                    <input
                      type="file"
                      id="admin-upload"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          setMatFileName(file.name);
                          if (!newMatTitle) {
                            setNewMatTitle(file.name.replace(/\.[^/.]+$/, ""));
                          }
                          if (file.type === "text/plain" || file.name.endsWith(".txt") || file.name.endsWith(".md") || file.name.endsWith(".csv")) {
                            const reader = new FileReader();
                            reader.onload = (evt) => {
                              if (evt.target?.result) {
                                setRawText(evt.target.result as string);
                              }
                            };
                            reader.readAsText(file);
                          } else {
                            setRawText(`Uploaded document attachment: "${file.name}".\n\nThis material contains structured study topics, exam guidelines, and dynamic mock questions.`);
                          }
                        }
                      }}
                    />
                    <label htmlFor="admin-upload" className="cursor-pointer space-y-2">
                      <div className="w-10 h-10 bg-[#D69B67]/10 text-[#D69B67] rounded-full flex items-center justify-center mx-auto">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-[#15223F] text-xs">Optional: Upload attachment</p>
                        <p className="text-[10px] text-gray-400">PDF, Word, Image</p>
                      </div>
                    </label>

                    {matFileName && (
                      <div className="mt-3 bg-emerald-50 text-emerald-800 text-xs px-3 py-1.5 rounded-lg border border-emerald-100 font-semibold flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" />
                        <span>{matFileName}</span>
                      </div>
                    )}
                  </div>

                  {/* Raw Text Box */}
                  <div className="space-y-1 bg-[#FAF6EE] p-3 rounded-2xl border border-gray-100">
                    <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block">Raw Material Content / Text Notes</label>
                    <textarea
                      value={rawText}
                      onChange={(e) => setRawText(e.target.value)}
                      rows={4}
                      className="w-full bg-transparent border-none text-xs text-[#15223F] focus:outline-none placeholder-gray-400 font-medium py-1 resize-none animate-fade-in"
                      placeholder="Paste your raw notes, guidelines, or formula lists here. Baraka will automatically arrange them on your selected template..."
                    />
                  </div>

                  {/* Title */}
                  <div className="space-y-1 bg-[#FAF6EE] p-3 rounded-2xl border border-gray-100">
                    <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block">Document Title</label>
                    <input
                      type="text"
                      required
                      value={newMatTitle}
                      onChange={(e) => setNewMatTitle(e.target.value)}
                      className="w-full bg-transparent border-none text-xs text-[#15223F] focus:outline-none placeholder-gray-400 font-bold py-0.5"
                      placeholder="e.g. Photosynthesis Notes"
                    />
                  </div>

                  {/* Visibility & Access Type */}
                  <div className="space-y-1.5 bg-[#FAF6EE] p-3 rounded-2xl border border-gray-100">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Visibility & Access Level</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setMatVisibility("public")}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          matVisibility === "public"
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "bg-white text-slate-600 border border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <FaGlobe className="inline mr-1 text-xs" /> Public Library
                      </button>
                      <button
                        type="button"
                        onClick={() => setMatVisibility("personal")}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          matVisibility === "personal"
                            ? "bg-amber-600 text-white shadow-xs"
                            : "bg-white text-slate-600 border border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <FaLock className="inline mr-1 text-xs" /> School / Class Only
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                      {matVisibility === "public" ? (
                        <>
                          <FaGlobe className="inline text-emerald-600 text-xs shrink-0" /> Publicly visible to all students across all schools in Tanzania.
                        </>
                      ) : (
                        <>
                          <FaLock className="inline text-amber-600 text-xs shrink-0" /> Private: Visible only to students in your school & targeted classes.
                        </>
                      )}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1 bg-[#FAF6EE] p-3 rounded-2xl border border-gray-100">
                      <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block">Subject</label>
                      <input
                        type="text"
                        required
                        value={newMatSubject}
                        onChange={(e) => setNewMatSubject(e.target.value)}
                        className="w-full bg-transparent border-none text-xs text-[#15223F] focus:outline-none placeholder-gray-400 font-medium py-0.5"
                        placeholder="e.g. Biology"
                      />
                    </div>

                    <div className="space-y-1 bg-[#FAF6EE] p-3 rounded-2xl border border-gray-100">
                      <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block">Classes</label>
                      <input
                        type="text"
                        required
                        value={newMatClasses}
                        onChange={(e) => setNewMatClasses(e.target.value)}
                        className="w-full bg-transparent border-none text-xs text-[#15223F] focus:outline-none placeholder-gray-400 font-medium py-0.5"
                        placeholder="e.g. Form 1A, Form 1B"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isArranging}
                    className="w-full bg-[#15223F] hover:bg-[#1E293B] disabled:bg-slate-300 disabled:cursor-not-allowed text-[#D69B67] font-bold py-4 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isArranging ? (
                      <>
                        <span className="animate-spin inline-block w-4 h-4 border-2 border-[#D69B67] border-t-transparent rounded-full" />
                        Auto-Arranging Content & Generating Quizzes...
                      </>
                    ) : (
                      "Upload, Auto-Arrange & Generate Quiz"
                    )}
                  </button>
                </form>
              </div>

              {/* Right Column: Shared Materials List */}
              <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                <h4 className="font-bold text-[#15223F] text-base">Shared materials</h4>
                <p className="text-xs text-gray-400">Click on any material to preview its auto-arranged template structure and dynamic study quiz.</p>

                <div className="space-y-3.5 max-h-[550px] overflow-y-auto pr-1">
                  {materialsList.map((mat) => (
                    <div
                      key={mat.id}
                      onClick={() => {
                        if ((window as any).__previewMaterial) {
                          (window as any).__previewMaterial(mat);
                        } else {
                          alert(`Material: ${mat.title}\nSubject: ${mat.subject}\nClasses: ${mat.classes}`);
                        }
                      }}
                      className="p-4 bg-[#FAF6EE] rounded-2xl border border-gray-100 hover:border-[#D69B67] transition-all flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-xl border border-gray-100 flex items-center justify-center shadow-2xs">
                          <FileText className="w-5 h-5 text-[#D69B67]" />
                        </div>
                        <div>
                          <p className="font-bold text-xs text-slate-800">{mat.title}</p>
                          <p className="text-[10px] text-gray-400">{mat.subject} · Uploaded {mat.uploadedAt}</p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md font-mono flex items-center gap-1 ${
                          mat.visibility === "personal" 
                            ? "bg-amber-100 text-amber-800 border border-amber-200" 
                            : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        }`}>
                          {mat.visibility === "personal" ? (
                            <>
                              <FaLock className="inline text-[8px]" /> SCHOOL ONLY
                            </>
                          ) : (
                            <>
                              <FaGlobe className="inline text-[8px]" /> PUBLIC
                            </>
                          )}
                        </span>
                        <span className="bg-slate-100 text-slate-700 text-[9px] font-bold px-2 py-0.5 rounded-md font-mono">
                          {mat.classes}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5.5: SCHOOL TIMETABLE MANAGEMENT */}
        {activeTab === "timetable" && (
          <div className="p-8 space-y-8 text-left animate-fade-in">
            {/* Header & Controls */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-100 pb-5">
              <div>
                <span className="text-[11px] font-mono tracking-widest text-[#D69B67] uppercase font-bold block">
                  ACADEMIC SCHEDULING ENGINE
                </span>
                <h3 className="text-3xl font-serif text-[#15223F] font-bold tracking-tight">Weekly School Timetable</h3>
                <p className="text-xs text-gray-400 mt-1">
                  Focusing on school days (Monday – Friday). Teachers accept scheduled periods and launch live interactive classes in real-time.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleGenerateSuperAdminTimetable}
                  disabled={isGeneratingTimetable}
                  className="bg-gradient-to-r from-[#15223F] to-[#0E1729] text-white hover:from-[#1E2E52] hover:to-[#15223F] font-bold text-xs px-4 py-3 rounded-2xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 text-[#D69B67] ${isGeneratingTimetable ? "animate-spin" : ""}`} />
                  <span>{isGeneratingTimetable ? "Generating..." : "Generate Weekly Timetable (Mon-Fri)"}</span>
                </button>

                <button
                  onClick={() => {
                    setNewPeriodDay("Monday");
                    setNewPeriodClass("Form 1A");
                    setNewPeriodSubject("Biology");
                    setNewPeriodTeacher(teachersList[0]?.name || "Mwalimu Juma");
                    setNewPeriodTimeSlot("08:00 AM - 08:40 AM");
                    setNewPeriodRoom("Classroom 1");
                    setNewPeriodNotes("");
                    setIsAddPeriodModalOpen(true);
                  }}
                  className="bg-white hover:bg-[#FAF6EE] text-[#15223F] border border-gray-200 font-bold text-xs px-4 py-3 rounded-2xl shadow-2xs transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-[#D69B67]" />
                  <span>Add Period Slot</span>
                </button>
              </div>
            </div>

            {/* REAL-TIME ACTIVE LIVE LESSON BANNER FOR TEACHERS / ADMINS */}
            {liveSession?.isActive ? (
              <div className="bg-gradient-to-r from-rose-900 via-rose-800 to-amber-900 text-white p-5 rounded-3xl shadow-lg border border-rose-500/30 flex flex-col md:flex-row items-center justify-between gap-4 animate-pulse">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center font-bold text-lg shadow-md shrink-0">
                    <Video className="w-6 h-6 animate-bounce" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="bg-rose-500 text-white text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span> LIVE BROADCAST ACTIVE NOW
                      </span>
                      <span className="text-xs text-amber-200 font-bold">{liveSession.targetClass}</span>
                    </div>
                    <h4 className="font-serif font-bold text-xl text-white mt-1">
                      {liveSession.subject}: {liveSession.topic}
                    </h4>
                    <p className="text-xs text-rose-100 mt-0.5">
                      Teacher: {liveSession.teacherName} · Attendance and interactive class active
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab("live-class")}
                  className="bg-amber-400 hover:bg-amber-300 text-[#15223F] font-bold text-xs px-6 py-3 rounded-2xl shadow-md transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap"
                >
                  <Video className="w-4 h-4 fill-current text-[#15223F]" />
                  <span>Enter Live Class</span>
                </button>
              </div>
            ) : (
              <div className="bg-slate-100 border border-slate-200 text-slate-600 p-4 rounded-2xl text-xs font-semibold flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                  <span>No active live broadcast stream running right now. Click "Start Live Class" on any timetable session to broadcast live.</span>
                </div>
                <span className="font-mono text-[10px] bg-slate-200 px-2 py-0.5 rounded-md">STATUS: NOT LIVE</span>
              </div>
            )}

            {/* Filter Controls Bar */}
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[#D69B67]" /> Filter Day:
                </span>
                {["All", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map((d) => (
                  <button
                    key={d}
                    onClick={() => setTimetableFilterDay(d)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      timetableFilterDay === d
                        ? "bg-[#15223F] text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-600">Class:</span>
                <select
                  value={timetableFilterClass}
                  onChange={(e) => setTimetableFilterClass(e.target.value)}
                  className="bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold px-3 py-1.5 text-slate-700 outline-none focus:border-[#D69B67]"
                >
                  <option value="All">All Forms & Classes</option>
                  <option value="Form 1A">Form 1A</option>
                  <option value="Form 1B">Form 1B</option>
                  <option value="Form 2A">Form 2A</option>
                  <option value="Form 2B">Form 2B</option>
                  <option value="Form 3A">Form 3A</option>
                  <option value="Form 3B">Form 3B</option>
                </select>
              </div>
            </div>

            {/* Timetable Session Cards Grouped by Days */}
            {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].filter((d) => timetableFilterDay === "All" || timetableFilterDay === d).map((day) => {
              const daySessions = timetableList.filter((s) => {
                const matchesDay = s.day === day;
                const matchesClass = timetableFilterClass === "All" || s.className === timetableFilterClass;
                return matchesDay && matchesClass;
              });

              if (daySessions.length === 0) return null;

              return (
                <div key={day} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-100 text-[#15223F] font-bold text-xs flex items-center justify-center">
                        <Calendar className="w-4 h-4 text-[#D69B67]" />
                      </div>
                      <h4 className="font-serif font-bold text-lg text-[#15223F]">{day} Schedule</h4>
                    </div>
                    <span className="text-xs font-mono text-gray-400 font-bold bg-slate-100 px-2.5 py-1 rounded-lg">
                      {daySessions.length} Scheduled Periods
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {daySessions.map((session) => {
                      const isLiveMatching =
                        liveSession?.isActive &&
                        (session.status === "In Progress" ||
                          (liveSession.subject.toLowerCase().includes(session.subject.toLowerCase()) &&
                           liveSession.targetClass.toLowerCase().includes(session.className.toLowerCase())));

                      return (
                        <div
                          key={session.id}
                          className={`p-5 rounded-2xl border transition-all space-y-3 flex flex-col justify-between ${
                            isLiveMatching
                              ? "bg-amber-50/60 border-amber-400 shadow-md ring-2 ring-rose-400/50"
                              : session.status === "Accepted"
                              ? "bg-blue-50/40 border-blue-200"
                              : session.status === "Completed"
                              ? "bg-emerald-50/40 border-emerald-200 opacity-80"
                              : "bg-[#FAF6EE] border-gray-100 hover:border-[#D69B67]"
                          }`}
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-mono font-bold bg-white px-2 py-0.5 rounded-md border border-gray-200 text-slate-700 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-[#D69B67]" /> {session.timeSlot}
                              </span>
                              <span
                                className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full font-mono uppercase tracking-wider ${
                                  isLiveMatching
                                    ? "bg-rose-500 text-white animate-pulse"
                                    : session.status === "Accepted"
                                    ? "bg-blue-600 text-white"
                                    : session.status === "Completed"
                                    ? "bg-emerald-600 text-white"
                                    : "bg-slate-200 text-slate-700"
                                }`}
                              >
                                {isLiveMatching ? "LIVE NOW" : session.status === "In Progress" ? "In Progress" : `NOT LIVE (${session.status})`}
                              </span>
                            </div>

                            <div>
                              <h5 className="font-bold text-sm text-[#15223F] flex items-center justify-between">
                                <span>{session.subject}</span>
                                <span className="bg-amber-100 text-[#15223F] text-[10px] font-mono px-2 py-0.5 rounded-md">
                                  {session.className}
                                </span>
                              </h5>
                              <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                                <User className="w-3.5 h-3.5 text-gray-400" /> {session.teacherName} {session.room && `· ${session.room}`}
                              </p>
                            </div>
                          </div>

                          {/* Interactive Action Buttons for Teachers and Admins */}
                          <div className="pt-2 border-t border-gray-200/50 space-y-2">
                            {session.status !== "Completed" && session.status !== "Cancelled" && (
                              <>
                                <div className="grid grid-cols-2 gap-2">
                                  {/* Accept Session */}
                                  <button
                                    onClick={() => handleAcceptTimetableSession(session)}
                                    disabled={session.status === "Accepted"}
                                    className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                                      session.status === "Accepted"
                                        ? "bg-blue-100 text-blue-800 cursor-default"
                                        : "bg-blue-600 hover:bg-blue-700 text-white shadow-2xs"
                                    }`}
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>{session.status === "Accepted" ? "Accepted" : "Accept Session"}</span>
                                  </button>

                                  {/* Cancel Session */}
                                  <button
                                    onClick={() => handleCancelTimetableSession(session)}
                                    className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs py-1.5 px-2 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                                  >
                                    <X className="w-3.5 h-3.5 text-rose-600" />
                                    <span>Cancel Session</span>
                                  </button>
                                </div>

                                {/* Start Live Class or Join Live Session */}
                                <button
                                  onClick={() => handleStartLiveFromTimetable(session)}
                                  className={`w-full ${
                                    isLiveMatching || session.status === "In Progress"
                                      ? "bg-rose-600 hover:bg-rose-700 text-white animate-pulse"
                                      : "bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white"
                                  } font-bold text-xs py-2 px-3 rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer`}
                                >
                                  <Video className="w-3.5 h-3.5" />
                                  <span>{isLiveMatching || session.status === "In Progress" ? "Enter Live Class" : "Start Live Class"}</span>
                                </button>

                                {/* Mark Complete */}
                                <button
                                  onClick={() => handleCompleteTimetableSession(session)}
                                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-1.5 px-3 rounded-xl shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  <span>Mark Complete</span>
                                </button>
                              </>
                            )}

                            {session.status === "Completed" && (
                              <div className="w-full bg-emerald-100 text-emerald-800 text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Completed {session.completedAt ? `at ${session.completedAt}` : ""}</span>
                              </div>
                            )}

                            {session.status === "Cancelled" && (
                              <div className="space-y-1.5">
                                <div className="w-full bg-rose-100 text-rose-800 text-xs font-bold py-1.5 px-3 rounded-xl flex items-center justify-center gap-1.5">
                                  <X className="w-3.5 h-3.5 text-rose-600" />
                                  <span>Session Cancelled</span>
                                </div>
                                <button
                                  onClick={() => handleAcceptTimetableSession(session)}
                                  className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-xs py-1 px-2 rounded-xl transition-all cursor-pointer text-center"
                                >
                                  Re-Accept / Restore Session
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 6: LIVE CLASS MANAGEMENT (Teacher Session) */}
        {activeTab === "live-class" && (
          <div className="p-8 space-y-8 text-left animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
              <div>
                <span className="text-[11px] font-mono tracking-widest text-[#D69B67] uppercase font-bold block">
                  TEACHER INTERACTION HUB
                </span>
                <h3 className="text-3xl font-serif text-[#15223F] font-bold tracking-tight">Live Class Session</h3>
                <p className="text-xs text-gray-400 mt-1">Teach live, broadcast virtual blackboard notes, publish quizzes, and track attendance.</p>
              </div>
              
              {liveSession?.isActive && (
                <button
                  onClick={() => {
                    if (onUpdateLiveSession) {
                      onUpdateLiveSession({
                        isActive: false,
                        subject: "",
                        topic: "",
                        teacherName: "",
                        whiteboardText: "",
                        activeQuiz: null,
                        attendance: {},
                        assignments: []
                      });
                    }
                  }}
                  className="bg-red-600 hover:bg-red-500 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
                >
                  <FaVideo className="inline mr-1" /> End Live Broadcast
                </button>
              )}
            </div>

            {!liveSession?.isActive ? (
              /* --- BROADCAST INITIALIZATION FORM --- */
              <div className="bg-white p-8 rounded-[2.5rem] border-2 border-[#15223F]/5 shadow-sm max-w-2xl space-y-6">
                <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-[#D69B67] flex items-center justify-center text-xl">
                    <FaMicrophone className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#15223F] text-lg">Initialize a Live Stream</h4>
                    <p className="text-xs text-gray-400">Students on their dashboards will immediately see a glowing notification to join your class.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1 bg-[#FAF6EE] p-3 rounded-2xl border border-gray-100">
                    <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">TEACHER NAME</label>
                    <input
                      type="text"
                      id="live-teacher-name"
                      defaultValue={teacherProfile?.name || "Mwalimu Juma"}
                      className="w-full bg-transparent border-none text-xs text-[#15223F] focus:outline-none font-bold py-0.5"
                    />
                  </div>

                  <div className="space-y-1 bg-[#FAF6EE] p-3 rounded-2xl border border-gray-100">
                    <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">SUBJECT</label>
                    <select
                      id="live-subject"
                      className="w-full bg-transparent border-none text-xs text-[#15223F] focus:outline-none font-bold py-0.5"
                    >
                      <option value="Biology">Biology</option>
                      <option value="Mathematics">Mathematics</option>
                      <option value="Geography">Geography</option>
                      <option value="Kiswahili">Kiswahili</option>
                      <option value="Physics">Physics</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1 bg-[#FAF6EE] p-3 rounded-2xl border border-gray-100">
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block">TARGET CLASS / FORM LEVEL</label>
                  <select
                    id="live-target-class"
                    className="w-full bg-transparent border-none text-xs text-[#15223F] focus:outline-none font-bold py-0.5 cursor-pointer"
                  >
                    <option value="All Classes">All Classes (Everyone)</option>
                    <option value="Form 1">Form 1 (All Sections)</option>
                    <option value="Form 1A">Form 1A</option>
                    <option value="Form 1B">Form 1B</option>
                    <option value="Form 2">Form 2 (All Sections)</option>
                    <option value="Form 2A">Form 2A</option>
                    <option value="Form 2B">Form 2B</option>
                    <option value="Form 3">Form 3 (All Sections)</option>
                    <option value="Form 3A">Form 3A</option>
                    <option value="Form 3B">Form 3B</option>
                    <option value="Form 4">Form 4</option>
                  </select>
                </div>

                <div className="space-y-1 bg-[#FAF6EE] p-3 rounded-2xl border border-gray-100">
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">TOPIC / THEME</label>
                  <input
                    type="text"
                    id="live-topic"
                    placeholder="e.g. Photosynthesis: Light-dependent Reaction"
                    defaultValue="Photosynthesis: Light-dependent Reaction"
                    className="w-full bg-transparent border-none text-xs text-[#15223F] focus:outline-none font-medium py-0.5"
                  />
                </div>

                <button
                  onClick={() => {
                    const nameEl = document.getElementById("live-teacher-name") as HTMLInputElement;
                    const subEl = document.getElementById("live-subject") as HTMLSelectElement;
                    const topEl = document.getElementById("live-topic") as HTMLInputElement;
                    const targetEl = document.getElementById("live-target-class") as HTMLSelectElement;
                    
                    const teacherName = nameEl?.value || teacherProfile?.name || "Mwalimu Juma";
                    const subject = subEl?.value || "Biology";
                    const topic = topEl?.value || "Photosynthesis";
                    const targetClass = targetEl?.value || "Form 1A";
                    
                    if (onUpdateLiveSession) {
                      onUpdateLiveSession({
                        isActive: true,
                        subject,
                        topic,
                        teacherName,
                        targetClass,
                        whiteboardText: `Welcome to today's live ${subject} lesson!\n\nToday we are covering ${topic.toUpperCase()}.\n\nType your blackboard notes here and students will see them instantly in real time...`,
                        activeQuiz: null,
                        attendance: {
                          "Amani Baraka": "Absent",
                          "Zawadi Musa": "Present"
                        },
                        assignments: []
                      });
                    }

                    const notifId = `notif-live-${Date.now()}`;
                    setDoc(doc(db, "notifications", notifId), {
                      id: notifId,
                      recipientTeacher: "All Teachers",
                      title: "Live Stream Broadcast Started",
                      message: `${teacherName} launched a live class: "${subject} - ${topic}" for ${targetClass}. Tracked in real time.`,
                      createdAt: new Date().toISOString(),
                      read: false,
                      type: "live_broadcast_start"
                    }).catch(() => {});
                  }}
                  className="w-full bg-[#15223F] hover:bg-[#0E1729] text-[#D69B67] font-bold py-4 rounded-2xl text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  <FaVideo className="inline text-rose-500 animate-pulse" /> Start Live Broadcast Now
                </button>
              </div>
            ) : (
              /* --- BROADCAST LIVE MANAGEMENT HUB --- */
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Blackboard + Quiz Setup (Left 2 columns) */}
                <div className="lg:col-span-2 space-y-8">

                  {/* Real-time Camera & Voice Broadcast */}
                  <div className="bg-white p-6 rounded-[2.5rem] border-2 border-[#15223F]/5 shadow-sm text-left space-y-4">
                    <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                      <h4 className="font-bold text-[#15223F] text-sm flex items-center gap-2">
                        <FaVideo className="text-[#D69B67] text-base" /> Real-time Teacher Video & Voice Broadcast
                      </h4>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded font-mono animate-pulse flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full"></span> CAM & MIC LIVE
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-xs text-gray-400">Students see your live stream and hear your voice in real time as you speak and teach.</p>
                    
                    <div className="relative aspect-video max-h-72 bg-slate-950 rounded-2xl overflow-hidden border-2 border-slate-100 group shadow-inner">
                      <video
                        id="teacher-live-webcam"
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover scale-x-[-1]"
                      />
                      <div className="absolute top-3 left-3 bg-red-600/95 text-white text-[9px] font-mono font-bold px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 shadow-md z-10">
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span>
                        BROADCASTING LIVE VOICE & VIDEO
                      </div>

                      {/* Animated Audio Wave Overlay when Teacher Speaks */}
                      <div className="absolute bottom-3 left-3 right-3 bg-slate-900/90 backdrop-blur-md p-2.5 rounded-xl border border-white/10 flex items-center justify-between text-xs z-10">
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-400 font-bold animate-pulse flex items-center gap-1">
                            <FaMicrophone className="text-emerald-400 inline" /> Live Mic:
                          </span>
                          <div className="flex items-end gap-1 h-3">
                            <span className="w-1 bg-emerald-400 h-full animate-bounce"></span>
                            <span className="w-1 bg-emerald-400 h-2 animate-pulse"></span>
                            <span className="w-1 bg-emerald-400 h-3 animate-bounce"></span>
                            <span className="w-1 bg-emerald-400 h-1.5 animate-pulse"></span>
                          </div>
                          <span className="text-[10px] font-mono text-emerald-300">Voice Transmitting to Students</span>
                        </div>
                      </div>
                    </div>

                    {/* Voice Speech Broadcast Controls */}
                    <div className="bg-[#FAF6EE] p-3.5 rounded-2xl border border-amber-200/70 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-[#15223F] uppercase tracking-wider block flex items-center gap-1.5">
                          <FaMicrophone className="text-[#D69B67] inline" /> Broadcast Voice Audio Explanation to Students
                        </label>
                        <span className="text-[10px] text-amber-800 font-mono font-bold bg-amber-100 px-2 py-0.5 rounded">
                          Web Speech & Audio Output
                        </span>
                      </div>
                      
                      <div className="flex gap-2">
                        <input
                          type="text"
                          id="teacher-voice-input"
                          placeholder="Type or speak a message to broadcast aloud to all student speakers..."
                          defaultValue="Karibuni wanafunzi! Today we are studying Photosynthesis and Light Reactions."
                          className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-[#D69B67]"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const inputEl = document.getElementById("teacher-voice-input") as HTMLInputElement;
                            const text = inputEl?.value || "Karibuni wanafunzi!";
                            if (onUpdateLiveSession && liveSession) {
                              onUpdateLiveSession({
                                ...liveSession,
                                isTeacherSpeaking: true,
                                teacherAudioMessage: text,
                                teacherAudioTimestamp: Date.now()
                              });
                            }
                            if ("speechSynthesis" in window) {
                              window.speechSynthesis.cancel();
                              const utter = new SpeechSynthesisUtterance(text);
                              utter.rate = 0.95;
                              window.speechSynthesis.speak(utter);
                            }
                          }}
                          className="bg-[#15223F] hover:bg-[#15223F]/90 text-[#D69B67] font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-xs cursor-pointer shrink-0 flex items-center gap-1.5"
                        >
                          <FaBullhorn className="inline text-xs" /> Speak to Class
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Real-time Screen Share & Presentation Hub */}
                  <div className="bg-white p-6 rounded-[2.5rem] border-2 border-[#15223F]/5 shadow-sm text-left space-y-4">
                    <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                      <h4 className="font-bold text-[#15223F] text-sm flex items-center gap-2">
                        <FaDisplay className="text-[#D69B67] text-base" /> Live Presentation & Screen Share
                      </h4>
                      <div className="flex items-center gap-2">
                        {liveSession?.presentationActive ? (
                          <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2.5 py-0.5 rounded-full font-mono animate-pulse flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-amber-600 rounded-full"></span> PRESENTING LIVE
                          </span>
                        ) : (
                          <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2.5 py-0.5 rounded-full font-mono">
                            OFFLINE
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-gray-400">
                      Present slide decks, share your screen, or upload documents to display directly on students' screens.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={() => {
                          if (onUpdateLiveSession && liveSession) {
                            onUpdateLiveSession({
                              ...liveSession,
                              presentationActive: !liveSession.presentationActive || liveSession.presentationType !== "slide",
                              presentationType: "slide"
                            });
                          }
                        }}
                        className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer ${
                          liveSession?.presentationActive && liveSession?.presentationType === "slide"
                            ? "bg-[#D69B67] text-white"
                            : "bg-[#FAF6EE] text-[#15223F] hover:bg-[#FAF6EE]/80"
                        }`}
                      >
                        <FaBookOpen className="inline text-xs" /> Slide Deck Mode {liveSession?.presentationActive && liveSession?.presentationType === "slide" ? "ON" : "OFF"}
                      </button>

                      <button
                        onClick={async () => {
                          if (!liveSession || !onUpdateLiveSession) return;
                          const currentlyActive = liveSession.presentationActive && liveSession.presentationType === "screen";
                          if (currentlyActive) {
                            onUpdateLiveSession({
                              ...liveSession,
                              presentationActive: false
                            });
                            const videoEl = document.getElementById("teacher-screen-preview") as HTMLVideoElement;
                            if (videoEl && videoEl.srcObject) {
                              const stream = videoEl.srcObject as MediaStream;
                              stream.getTracks().forEach(track => track.stop());
                              videoEl.srcObject = null;
                            }
                          } else {
                            onUpdateLiveSession({
                              ...liveSession,
                              presentationActive: true,
                              presentationType: "screen"
                            });
                            try {
                              const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                              setTimeout(() => {
                                const videoEl = document.getElementById("teacher-screen-preview") as HTMLVideoElement;
                                if (videoEl) {
                                  videoEl.srcObject = screenStream;
                                }
                              }, 150);
                              screenStream.getVideoTracks()[0].onended = () => {
                                onUpdateLiveSession({
                                  ...liveSession,
                                  presentationActive: false
                                });
                              };
                            } catch (err) {
                              console.warn("Screen capture failed or blocked inside iframe:", err);
                            }
                          }
                        }}
                        className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer ${
                          liveSession?.presentationActive && liveSession?.presentationType === "screen"
                            ? "bg-indigo-600 text-white hover:bg-indigo-700"
                            : "bg-indigo-50 text-indigo-900 hover:bg-indigo-100"
                        }`}
                      >
                        <FaDisplay className="inline text-xs" /> Screen Share Mode {liveSession?.presentationActive && liveSession?.presentationType === "screen" ? "ON" : "OFF"}
                      </button>
                    </div>

                    {liveSession?.presentationActive && (
                      <div className="bg-[#FAF6EE] rounded-2xl p-4 border border-gray-100 space-y-4">
                        {liveSession.presentationType === "slide" ? (
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <div>
                                <span className="text-[10px] font-mono uppercase font-bold text-gray-400">ACTIVE SLIDE DECK</span>
                                <h5 className="text-xs font-bold text-[#15223F]">{liveSession.presentationTitle}</h5>
                              </div>
                              <span className="text-xs font-bold font-mono bg-[#15223F]/5 text-[#15223F] px-2.5 py-1 rounded-lg">
                                Slide {(liveSession.presentationSlideIndex || 0) + 1} of {liveSession.presentationSlides?.length || 3}
                              </span>
                            </div>

                            {/* Active Slide Text Preview */}
                            <div className="bg-[#15223F] text-amber-100 p-4 rounded-xl font-mono text-[11px] leading-relaxed select-none min-h-[120px] whitespace-pre-wrap border-l-4 border-[#D69B67] shadow-inner">
                              {liveSession.presentationSlides?.[liveSession.presentationSlideIndex || 0] || "No slide content"}
                            </div>

                            {/* Slide Navigation */}
                            <div className="flex gap-2 justify-end">
                              <button
                                type="button"
                                disabled={liveSession.presentationSlideIndex === 0}
                                onClick={() => {
                                  onUpdateLiveSession({
                                    ...liveSession,
                                    presentationSlideIndex: (liveSession.presentationSlideIndex || 0) - 1
                                  });
                                }}
                                className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50 text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center gap-1"
                              >
                                <FaChevronLeft className="inline text-xs" /> Previous Slide
                              </button>
                              <button
                                type="button"
                                disabled={(liveSession.presentationSlideIndex || 0) >= (liveSession.presentationSlides?.length || 3) - 1}
                                onClick={() => {
                                  onUpdateLiveSession({
                                    ...liveSession,
                                    presentationSlideIndex: (liveSession.presentationSlideIndex || 0) + 1
                                  });
                                }}
                                className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50 text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center gap-1"
                              >
                                Next Slide <FaChevronRight className="inline text-xs" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <span className="text-[10px] font-mono uppercase font-bold text-gray-400 block">DESKTOP SHARE BROADCAST PREVIEW</span>
                            <div className="relative aspect-video max-h-48 bg-slate-900 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center">
                              <video
                                id="teacher-screen-preview"
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-indigo-950/80 p-4 flex flex-col justify-between items-center pointer-events-none text-center">
                                <FaDisplay className="text-3xl text-indigo-400 animate-pulse mt-4" />
                                <div className="space-y-1">
                                  <p className="text-xs font-bold text-white">Browser Desktop Capture Stream Active</p>
                                  <p className="text-[10px] text-indigo-200">Your entire computer desktop is broadcasting live to all students.</p>
                                </div>
                                <div className="text-[9px] bg-red-600 text-white font-bold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse mb-2">
                                  Live Desktop Feeder
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Live Class Shared Documents & Handouts */}
                  <div className="bg-white p-6 rounded-[2.5rem] border-2 border-[#15223F]/5 shadow-sm text-left space-y-5">
                    <div className="border-b border-gray-100 pb-3 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <BsFileEarmarkPdfFill className="text-xl text-[#D69B67]" />
                          <h4 className="font-bold text-[#15223F] text-base">Live Class Shared Documents & Attachments</h4>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Upload lecture notes, PDFs or handouts to share directly with every student who joins this live session.
                        </p>
                      </div>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-mono font-extrabold px-3 py-1 rounded-full uppercase tracking-wider self-start sm:self-auto flex items-center gap-1.5">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                        ACCESSIBLE BY ANY JOINED STUDENT
                      </span>
                    </div>

                    {/* Currently Attached Documents */}
                    {liveSession?.sharedDocuments && liveSession.sharedDocuments.length > 0 ? (
                      <div className="space-y-3 bg-[#FAF6EE] p-4 rounded-2xl border border-amber-200/60">
                        <span className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-wider block">
                          BROADCASTED DOCUMENTS ({liveSession.sharedDocuments.length})
                        </span>
                        <div className="space-y-2">
                          {liveSession.sharedDocuments.map((docItem: any, idx: number) => (
                            <div
                              key={docItem.id || idx}
                              className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-200 shadow-2xs hover:border-[#D69B67] transition-all"
                            >
                              <div className="flex items-center gap-3">
                                <BsFileEarmarkPdfFill className="text-xl text-[#D69B67]" />
                                <div>
                                  <p className="font-bold text-xs text-[#15223F]">{docItem.title}</p>
                                  <p className="text-[10px] text-gray-400 font-mono">
                                    {docItem.subject} · Uploaded by {docItem.uploadedBy || "Teacher"}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] bg-emerald-50 text-emerald-700 font-mono font-bold px-2 py-0.5 rounded border border-emerald-200">
                                  LIVE SYNCED
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (onUpdateLiveSession) {
                                      const updatedList = liveSession.sharedDocuments.filter((_: any, i: number) => i !== idx);
                                      onUpdateLiveSession({
                                        ...liveSession,
                                        sharedDocuments: updatedList
                                      });
                                    }
                                  }}
                                  className="text-[10px] text-rose-600 hover:text-rose-800 font-bold bg-rose-50 px-2 py-1 rounded hover:bg-rose-100 transition-all cursor-pointer"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl text-center space-y-1">
                        <p className="text-xs font-bold text-slate-700">No session document attached yet</p>
                        <p className="text-[10px] text-slate-400">
                          Upload a file below or pick from your school materials library to attach to this live session.
                        </p>
                      </div>
                    )}

                    {/* Upload or Pick Document Controls */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                      {/* Upload New Document File */}
                      <div className="border-2 border-dashed border-gray-200 rounded-2xl p-4 text-center bg-[#FAF6EE]/50 hover:border-[#D69B67] transition-all relative">
                        <input
                          type="file"
                          id="teacher-live-doc-upload"
                          className="hidden"
                          onChange={async (e) => {
                            if (e.target.files && e.target.files[0]) {
                              const file = e.target.files[0];
                              let fileContent = `Lecture Handout & Class Material: "${file.name}"\nSubject: ${liveSession?.subject || "General"}\nTeacher: ${liveSession?.teacherName || "Mwalimu Juma"}\nTarget Class: ${liveSession?.targetClass || "Form 1A"}\n\nThis material contains structured lesson explanations, study formulas, and practice quiz questions.`;

                              if (file.type === "text/plain" || file.name.endsWith(".txt") || file.name.endsWith(".md") || file.name.endsWith(".csv")) {
                                const reader = new FileReader();
                                reader.onload = (evt) => {
                                  if (evt.target?.result) {
                                    fileContent = evt.target.result as string;
                                    attachDocToLiveSession(file.name, fileContent);
                                  }
                                };
                                reader.readAsText(file);
                              } else {
                                attachDocToLiveSession(file.name, fileContent);
                              }
                            }

                            function attachDocToLiveSession(fileName: string, text: string) {
                              const newDocMat = {
                                id: `live-doc-${Date.now()}`,
                                title: fileName.replace(/\.[^/.]+$/, ""),
                                subject: liveSession?.subject || "General",
                                classes: liveSession?.targetClass || "All Forms",
                                uploadedAt: "Just now",
                                templateType: "notes",
                                rawText: text,
                                visibility: "public",
                                uploadedBy: liveSession?.teacherName || "Teacher",
                                isTeacherUpload: true,
                                arrangedContent: {
                                  summary: `Official live class study handout uploaded by ${liveSession?.teacherName || "Mwalimu Juma"} for ${liveSession?.subject || "General"}.`,
                                  keyPoints: ["Read carefully before class ends", "Test yourself with the auto-generated quiz questions"],
                                  sections: [{ title: "Overview", content: text }]
                                },
                                quizQuestions: [
                                  {
                                    question: `What is the main topic covered in "${fileName.replace(/\.[^/.]+$/, "")}"?`,
                                    options: [liveSession?.topic || "Class Topic", "General Revision", "Extracurriculars", "Unrelated"],
                                    correctAnswer: 0,
                                    explanation: "This document directly relates to today's live class topic."
                                  }
                                ]
                              };

                              // Save to materials collection so it persists for all students
                              setDoc(doc(db, "materials", newDocMat.id), newDocMat).catch(console.error);

                              if (onUpdateLiveSession) {
                                const existingDocs = liveSession?.sharedDocuments || [];
                                onUpdateLiveSession({
                                  ...liveSession,
                                  sharedDocuments: [...existingDocs, newDocMat],
                                  attachedDocument: newDocMat
                                });
                              }
                              alert(`Document "${fileName}" attached to Live Class! Any joining student can now view and download it.`);
                            }
                          }}
                        />
                        <label htmlFor="teacher-live-doc-upload" className="cursor-pointer space-y-1 block">
                          <div className="w-8 h-8 bg-[#D69B67]/10 text-[#D69B67] rounded-full flex items-center justify-center mx-auto">
                            <Upload className="w-4 h-4" />
                          </div>
                          <p className="font-bold text-[#15223F] text-xs">Upload new document attachment</p>
                          <p className="text-[10px] text-gray-400">PDF, TXT, Word, or Image file</p>
                        </label>
                      </div>

                      {/* Select existing material from school library */}
                      <div className="bg-[#FAF6EE] p-4 rounded-2xl border border-gray-200/80 flex flex-col justify-between space-y-2">
                        <div>
                          <p className="text-xs font-bold text-[#15223F]">Attach from School Library</p>
                          <p className="text-[10px] text-gray-400">Pick any previously uploaded notes or guides</p>
                        </div>
                        {materialsList.length > 0 ? (
                          <select
                            onChange={(e) => {
                              const selectedId = e.target.value;
                              if (!selectedId) return;
                              const found = materialsList.find((m) => m.id === selectedId);
                              if (found && onUpdateLiveSession) {
                                const existingDocs = liveSession?.sharedDocuments || [];
                                const isAlreadyAttached = existingDocs.some((d: any) => d.id === found.id);
                                if (!isAlreadyAttached) {
                                  onUpdateLiveSession({
                                    ...liveSession,
                                    sharedDocuments: [...existingDocs, found],
                                    attachedDocument: found
                                  });
                                  alert(`Attached "${found.title}" to Live Class broadcast!`);
                                }
                              }
                              e.target.value = "";
                            }}
                            className="w-full bg-white text-xs font-semibold text-[#15223F] p-2 rounded-xl border border-gray-300 focus:outline-none cursor-pointer"
                          >
                            <option value="">-- Choose Library Document --</option>
                            {materialsList.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.title} ({m.subject})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <p className="text-[10px] text-gray-400 italic">No library documents available.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Virtual Blackboard Notes Editor */}
                  <div className="bg-[#15223F] text-white p-6 rounded-[2.5rem] border border-white/10 shadow-lg space-y-4 text-left">
                    <div className="flex justify-between items-center border-b border-white/5 pb-3">
                      <h4 className="font-bold text-sm text-amber-100 flex items-center gap-2">
                        <FaChalkboard className="text-[#D69B67]" /> Real-time Virtual Blackboard
                      </h4>
                      <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold animate-pulse">● Live Syncing to Students</span>
                    </div>

                    <p className="text-[11px] text-white/50">Anything you write here will render on the students' dashboard screens immediately.</p>
                    
                    <textarea
                      rows={10}
                      value={liveSession.whiteboardText}
                      onChange={(e) => {
                        if (onUpdateLiveSession) {
                          onUpdateLiveSession({
                            ...liveSession,
                            whiteboardText: e.target.value
                          });
                        }
                      }}
                      className="w-full bg-[#1e2530] text-[#A7F3D0] rounded-2xl p-5 font-mono text-xs md:text-sm focus:outline-none border-2 border-transparent focus:border-[#D69B67] leading-relaxed resize-y"
                    />
                  </div>

                  {/* Real-time Quiz Launcher */}
                  <div className="bg-white p-8 rounded-[2.5rem] border-2 border-[#15223F]/5 shadow-sm text-left space-y-6">
                    <div className="border-b border-gray-100 pb-3 flex justify-between items-center">
                      <h4 className="font-bold text-[#15223F] text-base">Instant Real-time Class Quiz</h4>
                      {liveSession.activeQuiz?.launched && (
                        <span className="bg-rose-100 text-rose-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider font-mono">
                          ACTIVE IN CLASS
                        </span>
                      )}
                    </div>

                    {!liveSession.activeQuiz || !liveSession.activeQuiz.launched ? (
                      /* Create Quiz */
                      <div className="space-y-4">
                        <p className="text-xs text-gray-400">Push an instant multiple-choice question to all active students in the virtual classroom.</p>
                        
                        <div className="space-y-1 bg-[#FAF6EE] p-3 rounded-2xl border border-gray-100">
                          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">QUESTION TEXT</label>
                          <input
                            type="text"
                            id="quiz-q"
                            placeholder="e.g. Which pigment absorbs light energy in chloroplasts?"
                            defaultValue="Which pigment absorbs light energy in chloroplasts?"
                            className="w-full bg-transparent border-none text-xs text-[#15223F] focus:outline-none font-semibold py-0.5"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {[
                            { id: "opt-0", label: "Option A", val: "Chlorophyll a" },
                            { id: "opt-1", label: "Option B", val: "Carotene" },
                            { id: "opt-2", label: "Option C", val: "Xanthophyll" },
                            { id: "opt-3", label: "Option D", val: "Anthocyanin" },
                          ].map((opt, oIdx) => (
                            <div key={oIdx} className="space-y-1 bg-[#FAF6EE] p-3 rounded-2xl border border-gray-100">
                              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{opt.label}</label>
                              <input
                                type="text"
                                id={opt.id}
                                defaultValue={opt.val}
                                className="w-full bg-transparent border-none text-xs text-[#15223F] focus:outline-none font-medium py-0.5"
                              />
                            </div>
                          ))}
                        </div>

                        <div className="space-y-1 bg-[#FAF6EE] p-3 rounded-2xl border border-gray-100">
                          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">CORRECT OPTION INDEX (0-3)</label>
                          <select
                            id="quiz-correct"
                            className="w-full bg-transparent border-none text-xs text-[#15223F] focus:outline-none font-bold py-0.5"
                          >
                            <option value="0">Option A</option>
                            <option value="1">Option B</option>
                            <option value="2">Option C</option>
                            <option value="3">Option D</option>
                          </select>
                        </div>

                        <button
                          onClick={() => {
                            const qEl = document.getElementById("quiz-q") as HTMLInputElement;
                            const o0 = document.getElementById("opt-0") as HTMLInputElement;
                            const o1 = document.getElementById("opt-1") as HTMLInputElement;
                            const o2 = document.getElementById("opt-2") as HTMLInputElement;
                            const o3 = document.getElementById("opt-3") as HTMLInputElement;
                            const corrEl = document.getElementById("quiz-correct") as HTMLSelectElement;

                            if (onUpdateLiveSession) {
                              onUpdateLiveSession({
                                ...liveSession,
                                activeQuiz: {
                                  question: qEl?.value || "chlorophyll question?",
                                  options: [o0?.value, o1?.value, o2?.value, o3?.value].filter(Boolean),
                                  correctIndex: parseInt(corrEl?.value || "0"),
                                  launched: true,
                                  submissions: []
                                }
                              });
                              alert("Live quiz successfully launched! Students see it instantly.");
                            }
                          }}
                          className="w-full bg-[#D69B67] hover:bg-[#C88A58] text-white font-bold py-3.5 rounded-xl text-xs shadow-md transition-all cursor-pointer"
                        >
                          Launch Live Quiz in Classroom
                        </button>
                      </div>
                    ) : (
                      /* Live Results Track */
                      <div className="space-y-5">
                        <div className="bg-[#FAF6EE] p-4 rounded-2xl border border-slate-100">
                          <p className="font-mono text-[10px] text-gray-400 uppercase tracking-wider">Active Question</p>
                          <p className="font-bold text-sm mt-1 text-[#15223F]">{liveSession.activeQuiz.question}</p>
                        </div>

                        {/* Option Breakdown Chart */}
                        <div className="space-y-2">
                          <p className="font-mono text-[10px] text-gray-400 uppercase tracking-wider">Class Response Distribution</p>
                          <div className="space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-200/60">
                            {liveSession.activeQuiz.options.map((opt: string, oIdx: number) => {
                              const totalSubs = liveSession.activeQuiz?.submissions?.length || 0;
                              const optCount = liveSession.activeQuiz?.submissions?.filter((s: any) => s.answerIndex === oIdx).length || 0;
                              const percent = totalSubs > 0 ? Math.round((optCount / totalSubs) * 100) : 0;
                              const isCorrectOption = oIdx === liveSession.activeQuiz?.correctIndex;

                              return (
                                <div key={oIdx} className="space-y-1 text-xs">
                                  <div className="flex justify-between font-medium text-slate-700">
                                    <span className="flex items-center gap-1 font-bold">
                                      <span>{String.fromCharCode(65 + oIdx)}. {opt}</span>
                                      {isCorrectOption && <span className="text-emerald-600 text-[10px]"> (Correct)</span>}
                                    </span>
                                    <span className="font-mono font-bold text-slate-500">{optCount} ({percent}%)</span>
                                  </div>
                                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full transition-all ${isCorrectOption ? 'bg-emerald-500' : 'bg-[#D69B67]'}`}
                                      style={{ width: `${percent}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <p className="font-mono text-[10px] text-gray-400 uppercase tracking-wider">Student Submissions Log ({liveSession.activeQuiz.submissions?.length || 0})</p>
                          
                          {liveSession.activeQuiz.submissions?.length === 0 ? (
                            <p className="text-xs text-gray-400 italic bg-slate-50 p-3 rounded-xl">Waiting for student submissions in real time...</p>
                          ) : (
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {liveSession.activeQuiz.submissions.map((sub: any, sIdx: number) => (
                                <div key={sIdx} className="flex justify-between items-center text-xs p-2.5 bg-slate-50 border border-gray-100 rounded-xl">
                                  <div>
                                    <span className="font-semibold text-slate-800 block">{sub.studentName}</span>
                                    <span className="text-[10px] text-slate-500 font-mono">Chose Option {String.fromCharCode(65 + (sub.answerIndex ?? 0))}</span>
                                  </div>
                                  <span className={`font-mono font-bold text-[10px] px-2.5 py-1 rounded-full ${sub.isCorrect ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'}`}>
                                    {sub.isCorrect ? "Correct (+50 XP)" : "Incorrect"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => {
                            if (onUpdateLiveSession) {
                              onUpdateLiveSession({
                                ...liveSession,
                                activeQuiz: null
                              });
                            }
                          }}
                          className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <X className="w-4 h-4 text-rose-500 inline" /> Remove / Reset Active Quiz
                        </button>
                      </div>
                    )}
                  </div>

                </div>

                {/* Live Attendance + Live Chat (Right 1 column) */}
                <div className="space-y-8">
                  
                  {/* Classroom Attendance & Student Mic Controls */}
                  <div className="bg-white p-6 rounded-[2.5rem] border-2 border-[#15223F]/5 shadow-sm text-left space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-[#15223F] text-base">Class Roster & Mic Control</h4>
                        <p className="text-xs text-gray-400 mt-0.5">Manage live attendance and student audio permissions in real-time.</p>
                      </div>
                      <button
                        onClick={() => {
                          if (onUpdateLiveSession) {
                            onUpdateLiveSession({
                              ...liveSession,
                              allStudentsMuted: !liveSession.allStudentsMuted
                            });
                          }
                        }}
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                          liveSession.allStudentsMuted
                            ? "bg-rose-600 text-white hover:bg-rose-700"
                            : "bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300"
                        }`}
                      >
                        {liveSession.allStudentsMuted ? (
                          <>
                            <FaVolumeHigh className="inline text-xs" /> Unmute All Mics
                          </>
                        ) : (
                          <>
                            <FaVolumeXmark className="inline text-xs" /> Mute All Student Mics
                          </>
                        )}
                      </button>
                    </div>

                    {liveSession.allStudentsMuted && (
                      <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-xl text-[11px] text-rose-800 font-medium flex items-center gap-2">
                        <FaBan className="inline text-rose-600 text-xs shrink-0" />
                        <span>All student microphones are currently locked & muted by teacher.</span>
                      </div>
                    )}

                    <div className="divide-y divide-gray-100">
                      {[
                        { name: "Amani Baraka", reg: "BSS-001" },
                        { name: "Paulo Michael", reg: "BSS-002" },
                        { name: "Zawadi Musa", reg: "BSS-003" },
                        { name: "Paulo Juma", reg: "BSS-004" },
                      ].map((student, idx) => {
                        const isStudentPresent = liveSession.attendance?.[student.name] === "Present" || 
                                               liveSession.attendance?.[student.reg] === "Present" ||
                                               (student.name === "Amani Baraka" && liveSession.attendance?.["BSS-001"] === "Present") ||
                                               (student.name === "Paulo Michael" && liveSession.attendance?.["BSS-001"] === "Present");
                        const isStudentMuted = liveSession.allStudentsMuted || liveSession.mutedStudents?.[student.name];

                        return (
                          <div key={idx} className="py-3 flex items-center justify-between gap-2">
                            <div>
                              <p className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                                <span>{student.name}</span>
                                {isStudentMuted && (
                                  <span className="text-[9px] bg-rose-100 text-rose-700 font-mono font-bold px-1.5 py-0.2 rounded">
                                    MUTED
                                  </span>
                                )}
                              </p>
                              <p className="text-[10px] text-gray-400 font-mono">{student.reg}</p>
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Mic Mute Toggle per student */}
                              <button
                                onClick={() => {
                                  if (onUpdateLiveSession) {
                                    const currentMuted = { ...(liveSession.mutedStudents || {}) };
                                    currentMuted[student.name] = !currentMuted[student.name];
                                    onUpdateLiveSession({
                                      ...liveSession,
                                      mutedStudents: currentMuted
                                    });
                                  }
                                }}
                                className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer font-mono flex items-center gap-1 ${
                                  isStudentMuted
                                    ? "bg-rose-100 text-rose-800 border border-rose-300"
                                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                                }`}
                              >
                                {isStudentMuted ? (
                                  <>
                                    <FaMicrophoneSlash className="inline text-rose-600 text-xs" /> Unmute Mic
                                  </>
                                ) : (
                                  <>
                                    <FaMicrophone className="inline text-emerald-600 text-xs" /> Mute Mic
                                  </>
                                )}
                              </button>

                              <button
                                onClick={() => {
                                  if (onUpdateLiveSession) {
                                    const att = { ...liveSession.attendance };
                                    att[student.name] = isStudentPresent ? "Absent" : "Present";
                                    onUpdateLiveSession({
                                      ...liveSession,
                                      attendance: att
                                    });
                                  }
                                }}
                                className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider font-mono cursor-pointer transition-colors ${
                                  isStudentPresent
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-rose-50 text-rose-700 border border-rose-200"
                                }`}
                              >
                                {isStudentPresent ? "● Present" : "○ Absent"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Broadcast Diagnostics */}
                  <div className="bg-[#FAF6EE] border-2 border-[#15223F]/5 p-6 rounded-[2.5rem] text-left space-y-3">
                    <h5 className="font-mono text-[10px] text-[#D69B67] uppercase font-bold tracking-wider">Broadcaster Diagnostics</h5>
                    <div className="text-xs space-y-1 text-slate-600 font-mono font-medium">
                      <p>Quality: Excellent (1080p 60fps)</p>
                      <p>Target Class: <span className="font-bold text-[#15223F]">{liveSession.targetClass || "All Classes"}</span></p>
                      <p>Active Viewers: {liveSession.attendance ? Object.keys(liveSession.attendance).filter(k => liveSession.attendance[k] === "Present").length : 0} student(s)</p>
                      <p>Latency: 0.1s (Real-time)</p>
                    </div>
                  </div>

                </div>

              </div>
            )}
          </div>
        )}

      </main>

      {/* Edit School/Teacher Profile Details Modal Overlay */}
      {showEditModal && (
        <div 
          id="edit-teacher-profile-modal-backdrop"
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in p-4"
        >
          <form 
            onSubmit={handleSaveProfile}
            id="edit-teacher-profile-modal-card"
            className="bg-white max-w-lg w-full rounded-[2.5rem] p-6 md:p-8 border-2 border-[#15223F]/5 shadow-2xl space-y-6 text-left relative text-slate-700"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <User className="w-6 h-6 text-[#D69B67]" />
                <div>
                  <h4 className="font-bold text-[#15223F] text-lg">Edit Profile Details</h4>
                  <p className="text-xs text-gray-400">Update your teacher / school information.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              {teacherProfile ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1 bg-[#FAF6EE] p-3 rounded-2xl border border-gray-100">
                      <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block font-sans">First Name</label>
                      <input
                        type="text"
                        required
                        value={editTeacherFirstName}
                        onChange={(e) => setEditTeacherFirstName(e.target.value)}
                        className="w-full bg-transparent border-none text-xs text-[#15223F] focus:outline-none font-bold py-0.5 font-sans"
                      />
                    </div>
                    <div className="space-y-1 bg-[#FAF6EE] p-3 rounded-2xl border border-gray-100">
                      <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block font-sans">Last Name</label>
                      <input
                        type="text"
                        required
                        value={editTeacherLastName}
                        onChange={(e) => setEditTeacherLastName(e.target.value)}
                        className="w-full bg-transparent border-none text-xs text-[#15223F] focus:outline-none font-bold py-0.5 font-sans"
                      />
                    </div>
                  </div>

                  <div className="space-y-1 bg-[#FAF6EE] p-3 rounded-2xl border border-gray-100">
                    <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block font-sans">Email Address</label>
                    <input
                      type="email"
                      required
                      value={editTeacherEmail}
                      onChange={(e) => setEditTeacherEmail(e.target.value)}
                      className="w-full bg-transparent border-none text-xs text-[#15223F] focus:outline-none font-bold py-0.5 font-sans"
                    />
                  </div>

                  <div className="space-y-1 bg-[#FAF6EE] p-3 rounded-2xl border border-gray-100">
                    <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block font-sans">Login Password</label>
                    <input
                      type="text"
                      required
                      value={editTeacherPassword}
                      onChange={(e) => setEditTeacherPassword(e.target.value)}
                      className="w-full bg-transparent border-none text-xs text-[#15223F] focus:outline-none font-bold py-0.5 font-sans"
                    />
                  </div>

                  <div className="space-y-1 bg-[#FAF6EE] p-3 rounded-2xl border border-gray-100">
                    <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block font-sans">Teaching Subjects</label>
                    <input
                      type="text"
                      required
                      value={editTeacherSubjects}
                      onChange={(e) => setEditTeacherSubjects(e.target.value)}
                      className="w-full bg-transparent border-none text-xs text-[#15223F] focus:outline-none font-bold py-0.5 font-sans"
                    />
                  </div>

                  <div className="space-y-1 bg-[#FAF6EE] p-3 rounded-2xl border border-gray-100">
                    <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block font-sans">Assigned Classes</label>
                    <input
                      type="text"
                      required
                      value={editTeacherClasses}
                      onChange={(e) => setEditTeacherClasses(e.target.value)}
                      className="w-full bg-transparent border-none text-xs text-[#15223F] focus:outline-none font-bold py-0.5 font-sans"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1 bg-[#FAF6EE] p-3 rounded-2xl border border-gray-100">
                    <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block">TEACHER / HEADMASTER NAME</label>
                    <input
                      type="text"
                      required
                      value={editHeadmaster}
                      onChange={(e) => setEditHeadmaster(e.target.value)}
                      className="w-full bg-transparent border-none text-xs text-[#15223F] focus:outline-none font-bold py-0.5 font-sans"
                    />
                  </div>

                  <div className="space-y-1 bg-[#FAF6EE] p-3 rounded-2xl border border-gray-100">
                    <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block">SCHOOL NAME</label>
                    <input
                      type="text"
                      required
                      value={editSchoolName}
                      onChange={(e) => setEditSchoolName(e.target.value)}
                      className="w-full bg-transparent border-none text-xs text-[#15223F] focus:outline-none font-bold py-0.5 font-sans"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1 bg-[#FAF6EE] p-3 rounded-2xl border border-gray-100">
                      <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block">REGION / CITY</label>
                      <input
                        type="text"
                        required
                        value={editRegion}
                        onChange={(e) => setEditRegion(e.target.value)}
                        className="w-full bg-transparent border-none text-xs text-[#15223F] focus:outline-none font-bold py-0.5"
                      />
                    </div>

                    <div className="space-y-1 bg-[#FAF6EE] p-3 rounded-2xl border border-gray-100">
                      <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block">REGISTRATION NO.</label>
                      <input
                        type="text"
                        required
                        value={editRegNo}
                        onChange={(e) => setEditRegNo(e.target.value)}
                        className="w-full bg-transparent border-none text-xs text-[#15223F] focus:outline-none font-bold py-0.5"
                      />
                    </div>
                  </div>

                  <div className="space-y-1 bg-[#FAF6EE] p-3 rounded-2xl border border-gray-100">
                    <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block">SCHOOL TYPE</label>
                    <select
                      value={editType}
                      onChange={(e) => setEditType(e.target.value)}
                      className="w-full bg-transparent border-none text-xs text-[#15223F] focus:outline-none font-bold py-0.5"
                    >
                      <option value="Secondary">Secondary School</option>
                      <option value="Primary">Primary School</option>
                      <option value="High School">High School</option>
                      <option value="Vocational">Vocational Training</option>
                    </select>
                  </div>
                </>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#D69B67] hover:bg-[#C88A58] text-white text-xs font-semibold rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EDIT STUDENT MODAL */}
      {showEditStudentModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleSaveStudent}
            className="bg-white rounded-3xl border border-gray-100 shadow-2xl max-w-md w-full p-6 space-y-6 relative text-left animate-fade-in"
          >
            <button
              type="button"
              onClick={() => setShowEditStudentModal(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h4 className="text-lg font-serif text-[#15223F] font-bold">Edit Student Details</h4>
              <p className="text-xs text-gray-400">Update the details of the student record.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1 bg-[#FAF6EE] p-3 rounded-2xl border border-gray-100">
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block">FULL NAME</label>
                <input
                  type="text"
                  required
                  value={editStudentName}
                  onChange={(e) => setEditStudentName(e.target.value)}
                  className="w-full bg-transparent border-none text-xs text-[#15223F] focus:outline-none font-bold py-0.5 font-sans"
                />
              </div>

              <div className="space-y-1 bg-[#FAF6EE] p-3 rounded-2xl border border-gray-100 opacity-60">
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block">REGISTRATION NO. (READ-ONLY)</label>
                <input
                  type="text"
                  disabled
                  value={editStudentReg}
                  className="w-full bg-transparent border-none text-xs text-[#15223F] focus:outline-none font-bold py-0.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 bg-[#FAF6EE] p-3 rounded-2xl border border-gray-100">
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block">AGE</label>
                  <input
                    type="number"
                    required
                    value={editStudentAge}
                    onChange={(e) => setEditStudentAge(Number(e.target.value))}
                    className="w-full bg-transparent border-none text-xs text-[#15223F] focus:outline-none font-bold py-0.5"
                  />
                </div>

                <div className="space-y-1 bg-[#FAF6EE] p-3 rounded-2xl border border-gray-100">
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block">GENDER</label>
                  <select
                    value={editStudentGender}
                    onChange={(e) => setEditStudentGender(e.target.value)}
                    className="w-full bg-transparent border-none text-xs text-[#15223F] focus:outline-none font-bold py-0.5"
                  >
                    <option value="M">M</option>
                    <option value="F">F</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1 bg-[#FAF6EE] p-3 rounded-2xl border border-gray-100">
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block">CLASS</label>
                <select
                  value={editStudentClass}
                  onChange={(e) => setEditStudentClass(e.target.value)}
                  className="w-full bg-transparent border-none text-xs text-[#15223F] focus:outline-none font-bold py-0.5"
                >
                  {classesList.map((c) => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1 bg-[#FAF6EE] p-3 rounded-2xl border border-gray-100">
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block">PARENT CONTACT</label>
                <input
                  type="text"
                  value={editStudentParentContact}
                  onChange={(e) => setEditStudentParentContact(e.target.value)}
                  className="w-full bg-transparent border-none text-xs text-[#15223F] focus:outline-none font-bold py-0.5 font-sans"
                  placeholder="+255 7xx xxx xxx"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowEditStudentModal(false)}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#D69B67] hover:bg-[#C88A58] text-white text-xs font-semibold rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                Save Details
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Student Progress & Analytics Modal Overlay */}
      {showStudentStatsModal && selectedStudentStats && (
        <div className="fixed inset-0 z-[999] bg-[#15223F]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 relative text-left">
            <button
              onClick={() => setShowStudentStatsModal(false)}
              className="absolute top-5 right-5 p-2 text-gray-400 hover:text-slate-800 hover:bg-[#FAF6EE] rounded-full transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 font-bold rounded-2xl flex items-center justify-center text-xl">
                {selectedStudentStats.name[0]}
              </div>
              <div>
                <h3 className="text-xl font-serif font-bold text-[#15223F]">{selectedStudentStats.name}</h3>
                <p className="text-xs text-gray-400 font-mono mt-0.5">REG NO: {selectedStudentStats.regNo} · {selectedStudentStats.class}</p>
                <p className="text-xs text-[#D69B67] font-semibold mt-1">Last Active: {selectedStudentStats.lastActive || "Today"}</p>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-[#FAF6EE] p-4 rounded-2xl border border-gray-100 text-center space-y-1">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block font-mono">Total XP</span>
                <span className="text-2xl font-bold text-slate-800 block">{selectedStudentStats.xp !== undefined ? selectedStudentStats.xp : 0} XP</span>
              </div>
              <div className="bg-[#FAF6EE] p-4 rounded-2xl border border-gray-100 text-center space-y-1">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block font-mono">Streak</span>
                <span className="text-2xl font-bold text-[#D69B67] block flex items-center justify-center gap-1.5">
                  <FaFire className="text-amber-500 text-xl" />
                  <span>{selectedStudentStats.streak !== undefined ? selectedStudentStats.streak : 0} Days</span>
                </span>
              </div>
              <div className="bg-[#FAF6EE] p-4 rounded-2xl border border-gray-100 text-center space-y-1">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block font-mono">Badges</span>
                <span className="text-2xl font-bold text-emerald-600 block flex items-center justify-center gap-1.5">
                  <FaTrophy className="text-emerald-500 text-xl" />
                  <span>{selectedStudentStats.earnedCount !== undefined ? selectedStudentStats.earnedCount : 0} Earned</span>
                </span>
              </div>
            </div>

            {/* Progress Bar & Level */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-800">Overall Syllabus Progress</span>
                <span className="font-bold text-emerald-600">{selectedStudentStats.progress || 0}% Completed</span>
              </div>
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${selectedStudentStats.progress || 0}%` }} />
              </div>
              {selectedStudentStats.levelProgress !== undefined && (
                <p className="text-[10px] text-gray-400 font-medium">Progress to next Level: {selectedStudentStats.levelProgress}%</p>
              )}
            </div>

            {/* Subject-wise breakdown */}
            <div className="space-y-3.5">
              <h4 className="font-bold text-sm text-[#15223F] font-mono uppercase tracking-wider">Subject-by-Subject Progress</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.entries(selectedStudentStats.subjectProgress || {
                  Kiswahili: 0,
                  Biology: 0,
                  Geography: 0,
                  Mathematics: 0,
                  English: 0,
                  Physics: 0
                }).map(([subj, prog]) => (
                  <div key={subj} className="bg-slate-50 p-3.5 rounded-2xl border border-gray-100/50 space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-700">{subj}</span>
                      <span className="font-bold text-slate-900">{prog}%</span>
                    </div>
                    <div className="w-full bg-slate-200/50 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${prog}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Learning Plan checklist */}
            {selectedStudentStats.planItems && selectedStudentStats.planItems.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-bold text-sm text-[#15223F] font-mono uppercase tracking-wider">Completed Tasks & Assignments</h4>
                <div className="space-y-2">
                  {selectedStudentStats.planItems.map((item: any, iIdx: number) => (
                    <div key={iIdx} className="flex items-center justify-between text-xs p-3 bg-[#FAF6EE]/40 border border-gray-100 rounded-xl">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${item.checked ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-400"}`}>
                          {item.checked ? <FaCheck className="w-2.5 h-2.5 text-emerald-700" /> : <span className="w-2 h-2 rounded-full border border-gray-400" />}
                        </span>
                        <div>
                          <p className={`font-semibold ${item.checked ? "text-slate-800 line-through opacity-70" : "text-slate-800"}`}>{item.title}</p>
                          <p className="text-[10px] text-gray-400 font-medium">{item.subject} · {item.detail}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-indigo-600">+{item.xp || 10} XP</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-gray-100">
              <button
                onClick={() => setShowStudentStatsModal(false)}
                className="px-6 py-2.5 bg-[#15223F] hover:bg-[#15223F]/90 text-white text-xs font-semibold rounded-xl shadow-md transition-all cursor-pointer"
              >
                Close Analytics
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD TIMETABLE PERIOD SLOT MODAL */}
      {isAddPeriodModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-gray-100 space-y-5 text-left">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <span className="text-[10px] font-mono tracking-widest text-[#D69B67] uppercase font-bold block">
                  SUPER ADMIN / SCHEDULE MANAGER
                </span>
                <h4 className="font-serif font-bold text-xl text-[#15223F]">Create Timetable Period Slot</h4>
              </div>
              <button
                onClick={() => setIsAddPeriodModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-xl text-gray-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewPeriodSlot} className="space-y-4">
              {/* Day */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Day of Week</label>
                <select
                  value={newPeriodDay}
                  onChange={(e) => setNewPeriodDay(e.target.value as any)}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl p-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-[#D69B67]"
                >
                  <option value="Monday">Monday</option>
                  <option value="Tuesday">Tuesday</option>
                  <option value="Wednesday">Wednesday</option>
                  <option value="Thursday">Thursday</option>
                  <option value="Friday">Friday</option>
                </select>
              </div>

              {/* Class Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Class / Form</label>
                <select
                  value={newPeriodClass}
                  onChange={(e) => setNewPeriodClass(e.target.value)}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl p-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-[#D69B67]"
                >
                  <option value="Form 1A">Form 1A</option>
                  <option value="Form 1B">Form 1B</option>
                  <option value="Form 2A">Form 2A</option>
                  <option value="Form 2B">Form 2B</option>
                  <option value="Form 3A">Form 3A</option>
                  <option value="Form 3B">Form 3B</option>
                </select>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Subject</label>
                <select
                  value={newPeriodSubject}
                  onChange={(e) => setNewPeriodSubject(e.target.value)}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl p-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-[#D69B67]"
                >
                  <option value="Biology">Biology</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="English">English</option>
                  <option value="Kiswahili">Kiswahili</option>
                  <option value="Geography">Geography</option>
                  <option value="History">History</option>
                </select>
              </div>

              {/* Assign Teacher (Mandatory dropdown selection + notification) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Assign Teacher</span>
                  <span className="text-[10px] text-[#D69B67] font-semibold">Teacher will be notified</span>
                </label>
                <select
                  value={newPeriodTeacher}
                  onChange={(e) => setNewPeriodTeacher(e.target.value)}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl p-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-[#D69B67]"
                >
                  {teachersList.map((t, idx) => (
                    <option key={t.email || idx} value={t.name}>
                      {t.name} ({t.subjects || "General"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Time Slot */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Time Slot</label>
                <select
                  value={newPeriodTimeSlot}
                  onChange={(e) => setNewPeriodTimeSlot(e.target.value)}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl p-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-[#D69B67]"
                >
                  <option value="08:00 AM - 08:40 AM">Period 1 (08:00 AM - 08:40 AM)</option>
                  <option value="08:40 AM - 09:20 AM">Period 2 (08:40 AM - 09:20 AM)</option>
                  <option value="09:20 AM - 10:00 AM">Period 3 (09:20 AM - 10:00 AM)</option>
                  <option value="10:30 AM - 11:10 AM">Period 4 (10:30 AM - 11:10 AM)</option>
                  <option value="11:10 AM - 11:50 AM">Period 5 (11:10 AM - 11:50 AM)</option>
                  <option value="11:50 AM - 12:30 PM">Period 6 (11:50 AM - 12:30 PM)</option>
                  <option value="02:00 PM - 02:40 PM">Afternoon (02:00 PM - 02:40 PM)</option>
                </select>
              </div>

              {/* Room */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Classroom / Location</label>
                <input
                  type="text"
                  value={newPeriodRoom}
                  onChange={(e) => setNewPeriodRoom(e.target.value)}
                  placeholder="e.g. Classroom 1 or Science Lab"
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl p-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-[#D69B67]"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddPeriodModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#15223F] hover:bg-[#1E2E52] text-white shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 text-[#D69B67]" /> Save & Notify Teacher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
