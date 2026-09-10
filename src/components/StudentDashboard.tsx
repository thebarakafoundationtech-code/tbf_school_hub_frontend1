import React, { useState, useEffect, useRef } from "react";
import { db, collection, onSnapshot, setDoc, doc } from "../store";
import { tbfApi } from "../services/api";
import BrandLogo from "./BrandLogo";
import {
  FaGraduationCap,
  FaBookOpen,
  FaBook,
  FaFlask,
  FaDna,
  FaEarthAfrica,
  FaCalculator,
  FaPenNib,
  FaAtom,
  FaVideo,
  FaGlobe,
  FaFileLines,
  FaDownload,
  FaBookBookmark,
  FaSun,
  FaCloud,
  FaDroplet,
  FaBatteryFull,
  FaPlug,
  FaLightbulb,
  FaRotateLeft,
  FaRotateRight,
  FaCalendarDays,
  FaCalendarCheck,
  FaClock,
  FaUser,
  FaUserPen,
  FaPlus,
  FaCheck,
  FaXmark,
  FaCircleDot,
  FaRocket,
  FaBullhorn,
  FaMessage,
  FaCircleCheck,
  FaCircleXmark,
  FaBoltLightning,
  FaCloudArrowUp,
  FaPuzzlePiece,
  FaSchool,
  FaCircleQuestion,
  FaWrench,
  FaMicrophone,
  FaMicrophoneSlash,
  FaVolumeHigh,
  FaVolumeXmark,
  FaBan,
  FaChalkboard,
  FaPersonChalkboard,
  FaDesktop,
  FaMobileScreen,
  FaDoorOpen,
  FaBullseye,
  FaFilm,
  FaCircleCheck as FaCircleCheckIcon
} from "react-icons/fa6";
import {
  BsMortarboardFill,
  BsFileEarmarkPdfFill,
  BsFileEarmarkTextFill,
  BsFileEarmarkCheckFill,
  BsRobot,
} from "react-icons/bs";
import {
  LayoutDashboard,
  BookOpen,
  Compass,
  MessageSquare,
  FlaskConical,
  BarChart3,
  Search,
  Bell,
  Play,
  ArrowRight,
  BookMarked,
  HelpCircle,
  Clock,
  Send,
  Loader2,
  Check,
  RotateCcw,
  User,
  LogOut,
  X,
  Video,
  Menu,
  ThumbsUp,
  MessageCircle,
  Calendar,
  Award,
  FileText,
  GraduationCap,
  CheckCircle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  Student,
  PracticeSubject,
  initialPracticeSubjects,
  initialLabVideos,
  initialMaterials,
  Material,
  TimetableSession,
  initialTimetable,
} from "../types";

interface StudentDashboardProps {
  studentProfile: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    studyLevel: string;
    curriculum: string;
    photoUrl?: string;
    isNew?: boolean;
  };
  onUpdateProfile?: (profile: any) => void;
  onLogout?: () => void;
  onSwitchToAdmin?: () => void;
  showAdminToggle?: boolean;
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
}

interface FormattedMessageProps {
  text: string;
}

function FormattedMessage({ text }: FormattedMessageProps) {
  const rawLines = text.split("\n");
  const parsedBlocks: React.ReactNode[] = [];
  
  const renderInline = (str: string) => {
    const regex = /(\*\*.*?\*\*|`.*?`)/g;
    const pieces = str.split(regex);
    
    return pieces.map((piece, idx) => {
      if (piece.startsWith("**") && piece.endsWith("**")) {
        return <strong key={idx} className="font-extrabold text-[#15223F]">{piece.slice(2, -2)}</strong>;
      }
      if (piece.startsWith("`") && piece.endsWith("`")) {
        return <code key={idx} className="bg-amber-100/70 text-amber-800 font-mono px-1.5 py-0.5 rounded text-[11px] font-bold">{piece.slice(1, -1)}</code>;
      }
      return piece;
    });
  };

  let i = 0;
  while (i < rawLines.length) {
    const line = rawLines[i];
    const trimmed = line.trim();
    
    // Code block parsing
    if (trimmed.startsWith("```")) {
      const codeContent: string[] = [];
      i++;
      while (i < rawLines.length && !rawLines[i].trim().startsWith("```")) {
        codeContent.push(rawLines[i]);
        i++;
      }
      parsedBlocks.push(
        <pre key={`code-${i}`} className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-[11px] leading-relaxed overflow-x-auto shadow-inner my-2 border border-slate-800">
          <code className="block whitespace-pre">{codeContent.join("\n")}</code>
        </pre>
      );
      i++;
      continue;
    }
    
    // Table parsing
    if (trimmed.startsWith("|")) {
      const tableRows: string[] = [];
      while (i < rawLines.length && rawLines[i].trim().startsWith("|")) {
        tableRows.push(rawLines[i].trim());
        i++;
      }
      
      const parsedRows = tableRows.map(row => {
        return row
          .split("|")
          .map(cell => cell.trim())
          .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      });
      
      if (parsedRows.length > 0) {
        const hasSeparator = parsedRows[1] && parsedRows[1].every(cell => cell.startsWith("-") || cell.endsWith("-"));
        const headers = parsedRows[0];
        const bodyRows = hasSeparator ? parsedRows.slice(2) : parsedRows.slice(1);
        
        parsedBlocks.push(
          <div key={`table-${i}`} className="overflow-x-auto my-3 rounded-xl border border-gray-150">
            <table className="min-w-full divide-y divide-gray-150 text-[11px] text-left">
              <thead className="bg-[#FAF6EE] text-[#15223F] font-bold">
                <tr>
                  {headers.map((h, hIdx) => (
                    <th key={hIdx} className="px-3 py-2 border-b border-gray-150 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {bodyRows.map((row, rIdx) => (
                  <tr key={rIdx} className={rIdx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-3 py-1.5 text-slate-600">{renderInline(cell)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    // Callouts / Quotes
    if (trimmed.startsWith(">")) {
      parsedBlocks.push(
        <blockquote key={`quote-${i}`} className="border-l-4 border-[#D69B67] pl-3.5 py-1.5 my-2 bg-amber-50/40 text-[#15223F] font-serif italic text-[12px] rounded-r">
          {renderInline(trimmed.replace(/^>\s*/, ""))}
        </blockquote>
      );
      i++;
      continue;
    }
    
    // Empty line space
    if (!trimmed) {
      parsedBlocks.push(<div key={`empty-${i}`} className="h-1" />);
      i++;
      continue;
    }
    
    // Headings
    if (trimmed.startsWith("###")) {
      parsedBlocks.push(
        <h5 key={`h3-${i}`} className="text-[11px] font-bold uppercase tracking-wider text-[#D69B67] pt-2 pb-0.5 font-sans">
          {renderInline(trimmed.replace(/^###\s*/, ""))}
        </h5>
      );
      i++;
      continue;
    }
    if (trimmed.startsWith("##")) {
      parsedBlocks.push(
        <h4 key={`h2-${i}`} className="text-sm font-bold text-[#15223F] pt-3 pb-1 font-serif border-b border-gray-100/60 flex items-center gap-1.5">
          {renderInline(trimmed.replace(/^##\s*/, ""))}
        </h4>
      );
      i++;
      continue;
    }
    if (trimmed.startsWith("#")) {
      parsedBlocks.push(
        <h3 key={`h1-${i}`} className="text-base font-bold text-[#15223F] pt-4 pb-1.5 font-serif border-b-2 border-[#D69B67]/25">
          {renderInline(trimmed.replace(/^#\s*/, ""))}
        </h3>
      );
      i++;
      continue;
    }
    
    // Bullet lists
    if (trimmed.startsWith("*") || trimmed.startsWith("-")) {
      const isBullet = trimmed.startsWith("* ") || trimmed.startsWith("- ") || (trimmed.startsWith("*") && !trimmed.startsWith("**"));
      if (isBullet) {
        const cleanText = trimmed.replace(/^[*-\s]+/, "");
        parsedBlocks.push(
          <div key={`bullet-${i}`} className="flex items-start gap-2 pl-2">
            <span className="text-[#D69B67] shrink-0 mt-1">•</span>
            <span className="flex-1 text-slate-700">{renderInline(cleanText)}</span>
          </div>
        );
        i++;
        continue;
      }
    }
    
    // Numbered lists
    const numMatch = trimmed.match(/^(\d+)\.\s(.*)/);
    if (numMatch) {
      parsedBlocks.push(
        <div key={`num-${i}`} className="flex items-start gap-2 pl-2">
          <span className="text-[#D69B67] font-bold font-mono shrink-0 mt-0.5">{numMatch[1]}.</span>
          <span className="flex-1 text-slate-700">{renderInline(numMatch[2])}</span>
        </div>
      );
      i++;
      continue;
    }

    // Default paragraph
    parsedBlocks.push(
      <p key={`p-${i}`} className="text-slate-700">
        {renderInline(line)}
      </p>
    );
    i++;
  }

  return (
    <div className="space-y-1.5 text-slate-700 leading-relaxed text-xs">
      {parsedBlocks}
    </div>
  );
}

export default function StudentDashboard({
  studentProfile,
  onUpdateProfile,
  onLogout,
  onSwitchToAdmin,
  showAdminToggle = false,
  liveSession,
  onUpdateLiveSession,
}: StudentDashboardProps) {
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "classroom" | "library" | "practice" | "ask-baraka" | "labs" | "timetable" | "progress"
  >("dashboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // --- INTERACTIVE PLAN & ACHIEVEMENT STATES ---
  const isNewUser = true;

  const [planItems, setPlanItems] = useState<{ id: number; title: string; subject: string; detail: string; checked: boolean; xp: number }[]>(() => {
    if (isNewUser) return [];
    return [
      { id: 1, title: "Finish Photosynthesis lesson", subject: "Biology", detail: "12 min remaining", checked: true, xp: 15 },
      { id: 2, title: "Review algebra flashcards", subject: "Mathematics", detail: "8 min", checked: true, xp: 10 },
      { id: 3, title: "Cell structure quiz", subject: "Biology", detail: "5 min", checked: false, xp: 20 },
      { id: 4, title: "Read: The Water Cycle summary", subject: "Geography", detail: "6 min", checked: false, xp: 10 },
    ];
  });

  const [earnedCount, setEarnedCount] = useState(isNewUser ? 0 : 12);
  const [studentXP, setStudentXP] = useState(isNewUser ? 0 : 1240);
  const [studentLevelProgress, setStudentLevelProgress] = useState(isNewUser ? 0 : 62); // percentage to next level

  // New plan form states
  const [newPlanTitle, setNewPlanTitle] = useState("");
  const [newPlanSubject, setNewPlanSubject] = useState("Biology");
  const [newPlanDetail, setNewPlanDetail] = useState("15 min");

  const handleAddPlanItem = () => {
    if (!newPlanTitle.trim()) return;
    const newItem = {
      id: Date.now(),
      title: newPlanTitle.trim(),
      subject: newPlanSubject,
      detail: newPlanDetail.trim() || "15 min",
      checked: false,
      xp: 15,
    };
    setPlanItems((prev) => [...prev, newItem]);
    setNewPlanTitle("");
    setNewPlanDetail("15 min");
  };

  // Handle checking/unchecking tasks to earn XP dynamically!
  const handleTogglePlanItem = (id: number) => {
    setPlanItems(prev => prev.map(item => {
      if (item.id === id) {
        const nextChecked = !item.checked;
        if (nextChecked) {
          // Add XP!
          setStudentXP(xp => xp + item.xp);
          // Increase level progress
          setStudentLevelProgress(prog => Math.min(100, prog + Math.round(item.xp / 10)));
          // Increement earned count occasionally
          if (Math.random() > 0.6) setEarnedCount(c => Math.min(30, c + 1));
        } else {
          // Remove XP!
          setStudentXP(xp => Math.max(0, xp - item.xp));
          setStudentLevelProgress(prog => Math.max(0, prog - Math.round(item.xp / 10)));
        }
        return { ...item, checked: nextChecked };
      }
      return item;
    }));
  };

  // State for student live classroom view participation
  const [isInsideLiveClass, setIsInsideLiveClass] = useState(false);
  const [studentLiveQuizAnswer, setStudentLiveQuizAnswer] = useState<number | null>(null);
  const [studentLiveQuizSubmitted, setStudentLiveQuizSubmitted] = useState(false);
  const [liveChatInput, setLiveChatInput] = useState("");
  const [liveChatMessages, setLiveChatMessages] = useState<any[]>([]);

  const handleSendLiveChatMessage = () => {
    if (!liveChatInput.trim()) return;
    setLiveChatMessages(prev => [...prev, {
      sender: fullName,
      text: liveChatInput,
      time: "Just now"
    }]);
    setLiveChatInput("");
  };

  // Virtual classroom forum board states
  const [forumPosts, setForumPosts] = useState<any[]>([]);
  const [newPostText, setNewPostText] = useState("");
  const [activeReplyId, setActiveReplyId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");

  const handleAddForumPost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostText.trim()) return;
    setForumPosts(prev => [
      {
        id: Date.now(),
        author: fullName,
        role: "Student",
        avatar: studentProfile.firstName[0],
        content: newPostText,
        time: "Just now",
        upvotes: 0,
        replies: []
      },
      ...prev
    ]);
    setNewPostText("");
  };

  const handleUpvoteForumPost = (id: number) => {
    setForumPosts(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, upvotes: p.upvotes + 1 };
      }
      return p;
    }));
  };

  const handleAddForumReply = (postId: number) => {
    if (!replyText.trim()) return;
    setForumPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          replies: [
            ...p.replies,
            { author: fullName, content: replyText, time: "Just now" }
          ]
        };
      }
      return p;
    }));
    setReplyText("");
    setActiveReplyId(null);
  };

  // Search input state
  const [searchQuery, setSearchQuery] = useState("");

  // Streak/Notifications
  const [streak, setStreak] = useState(isNewUser ? 0 : 7);
  const [notifications, setNotifications] = useState<string[]>(() => {
    if (isNewUser) return ["Welcome to TBF School Hub! Start by creating a study plan or exploring subjects."];
    return [
      "Your biology summary is ready!",
      "Teacher Juma uploaded Chapter 4 Notes.",
    ];
  });
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);

  // Profile Settings dropdown & edit states
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Profile Edit fields
  const [editFirstName, setEditFirstName] = useState(studentProfile.firstName);
  const [editLastName, setEditLastName] = useState(studentProfile.lastName);
  const [editEmail, setEditEmail] = useState(studentProfile.email);
  const [editPhone, setEditPhone] = useState(studentProfile.phone || "");
  const [editStudyLevel, setEditStudyLevel] = useState(studentProfile.studyLevel);
  const [editCurriculum, setEditCurriculum] = useState(studentProfile.curriculum);

  const handleOpenEditModal = () => {
    setEditFirstName(studentProfile.firstName);
    setEditLastName(studentProfile.lastName);
    setEditEmail(studentProfile.email);
    setEditPhone(studentProfile.phone || "");
    setEditStudyLevel(studentProfile.studyLevel);
    setEditCurriculum(studentProfile.curriculum);
    setShowEditModal(true);
    setShowProfileDropdown(false);
  };

  // --- MATERIAL POPUP VIEW STATES ---
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [materialSubTab, setMaterialSubTab] = useState<"content" | "summary" | "quiz">("content");

  // --- LIBRARY STATE & TIMETABLE STATE ---
  const [libraryTab, setLibraryTab] = useState<"assigned" | "public" | "my">("assigned");
  const [materialsList, setMaterialsList] = useState<Material[]>(initialMaterials);
  const [timetableList, setTimetableList] = useState<TimetableSession[]>(initialTimetable);
  const [timetableSelectedDay, setTimetableSelectedDay] = useState<string>("All");

  const displayedMaterials = materialsList.filter((mat) => {
    const studClass = (studentProfile.studyLevel || "").toLowerCase().trim(); // e.g. "form 1a" or "form 1"
    const matClass = (mat.classes || "").toLowerCase().trim(); // e.g. "form 1" or "all forms"
    
    // Extract base level number if present e.g. "1" from "form 1a"
    const studLevelMatch = studClass.match(/form\s*(\d)/i);
    const studLevelNum = studLevelMatch ? studLevelMatch[1] : "";
    
    const matchesExactClass = matClass.includes(studClass) || studClass.includes(matClass);
    const matchesFormLevel = studLevelNum ? (matClass.includes(`form ${studLevelNum}`) || matClass.includes(`form${studLevelNum}`)) : false;
    const isAllForms = matClass.includes("all") || matClass.includes("general") || matClass === "";
    
    const isAssignedToStudent = matchesExactClass || matchesFormLevel || isAllForms;
    const isMyUploaded = mat.uploadedBy === studentProfile.email;

    if (libraryTab === "assigned") {
      return isAssignedToStudent;
    } else if (libraryTab === "my") {
      return isMyUploaded || mat.visibility === "personal";
    } else {
      // "public" tab: shows all public materials across the school + assigned
      return mat.visibility === "public" || mat.visibility !== "personal" || isAssignedToStudent;
    }
  });

  useEffect(() => {
    let isMounted = true;

    // Fetch initial materials and timetable from backend endpoints
    const fetchBackendData = async () => {
      try {
        const [materialsRes, timetableRes] = await Promise.allSettled([
          tbfApi.fetchMaterials(),
          tbfApi.fetchTimetable()
        ]);

        if (isMounted) {
          if (materialsRes.status === "fulfilled") {
            const val = materialsRes.value;
            const arr = Array.isArray(val) ? val : (val && Array.isArray((val as any).data) ? (val as any).data : []);
            if (arr.length > 0) {
              setMaterialsList(arr);
              const level = (studentProfile.studyLevel || "").toLowerCase();
              const matchedNotifs = arr
                .filter((m: Material) => {
                  const cls = (m.classes || "").toLowerCase();
                  return cls.includes(level) || level.includes(cls) || cls.includes("all");
                })
                .map((m: Material) => `New document: "${m.title}" uploaded for ${m.classes}`);
              setNotifications(matchedNotifs);
            }
          }
          if (timetableRes.status === "fulfilled") {
            const val = timetableRes.value;
            const arr = Array.isArray(val) ? val : (val && Array.isArray((val as any).data) ? (val as any).data : []);
            if (arr.length > 0) setTimetableList(arr);
          }
        }
      } catch (err) {
        console.warn("Student backend data fetch note:", err);
      }
    };

    fetchBackendData();

    const unsubscribeMaterials = onSnapshot(collection(db, "materials"), (snapshot) => {
      const list: Material[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data && data.title) {
          list.push(data as Material);
        }
      });
      setMaterialsList(list);
      
      // Generate notifications dynamically for materials matching this student's class/studyLevel
      const level = (studentProfile.studyLevel || "").toLowerCase();
      const matchedNotifs = list
        .filter((m) => {
          const cls = (m.classes || "").toLowerCase();
          return cls.includes(level) || level.includes(cls) || cls.includes("all");
        })
        .map((m) => `New document: "${m.title}" uploaded for ${m.classes}`);
      
      setNotifications(matchedNotifs);
    }, (error) => {
      console.warn("Client data store error for materials in student dashboard:", error);
      setMaterialsList([]);
    });

    const unsubscribeTimetable = onSnapshot(collection(db, "timetable"), (snapshot) => {
      const list: TimetableSession[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data && data.day) {
          list.push(data as TimetableSession);
        }
      });
      setTimetableList(list);
    }, (err) => {
      console.warn("Client data store timetable error in StudentDashboard:", err);
      setTimetableList([]);
    });

    (window as any).__previewMaterial = (mat: Material) => {
      handleOpenMaterial(mat);
    };

    return () => {
      isMounted = false;
      unsubscribeMaterials();
      unsubscribeTimetable();
      delete (window as any).__previewMaterial;
    };
  }, []);

  const [studentCamStream, setStudentCamStream] = useState<MediaStream | null>(null);
  const [isStudentMicMuted, setIsStudentMicMuted] = useState(false);
  const [isTeacherAudioMuted, setIsTeacherAudioMuted] = useState(false);
  const [lastAudioTimestamp, setLastAudioTimestamp] = useState(0);
  const [liveViewMode, setLiveViewMode] = useState<"normal" | "fullscreen" | "compact">("normal");

  const currentFullName = `${studentProfile.firstName} ${studentProfile.lastName}`;
  const isTeacherMuted = Boolean(
    liveSession?.allStudentsMuted ||
    (liveSession?.mutedStudents && (liveSession.mutedStudents[currentFullName] || liveSession.mutedStudents[studentProfile.email]))
  );

  // Auto-play teacher voice speech when teacher broadcasts sound or updates blackboard
  useEffect(() => {
    if (
      isInsideLiveClass &&
      liveSession?.isActive &&
      liveSession?.teacherAudioMessage &&
      liveSession.teacherAudioTimestamp &&
      liveSession.teacherAudioTimestamp !== lastAudioTimestamp &&
      !isTeacherAudioMuted
    ) {
      setLastAudioTimestamp(liveSession.teacherAudioTimestamp);
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(liveSession.teacherAudioMessage);
        utter.rate = 0.95;
        window.speechSynthesis.speak(utter);
      }
    }
  }, [
    isInsideLiveClass,
    liveSession?.isActive,
    liveSession?.teacherAudioMessage,
    liveSession?.teacherAudioTimestamp,
    lastAudioTimestamp,
    isTeacherAudioMuted,
  ]);

  useEffect(() => {
    if (studentCamStream) {
      const audioTracks = studentCamStream.getAudioTracks();
      const shouldMute = isTeacherMuted || isStudentMicMuted;
      audioTracks.forEach((track) => {
        track.enabled = !shouldMute;
      });
    }
  }, [studentCamStream, isTeacherMuted, isStudentMicMuted]);

  useEffect(() => {
    let activeStream: MediaStream | null = null;
    if (isInsideLiveClass && liveSession?.isActive) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then((stream) => {
          activeStream = stream;
          setStudentCamStream(stream);
          const videoElement = document.getElementById("student-live-webcam") as HTMLVideoElement;
          if (videoElement) {
            videoElement.srcObject = stream;
          }
        })
        .catch((err) => {
          console.warn("Student camera access failed or denied:", err);
        });
    } else {
      if (studentCamStream) {
        studentCamStream.getTracks().forEach(track => track.stop());
        setStudentCamStream(null);
      }
    }
    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
      if (studentCamStream) {
        studentCamStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isInsideLiveClass, liveSession?.isActive]);

  const [hasDismissedNotification, setHasDismissedNotification] = useState(false);
  const lastActiveRef = useRef(false);
  const lastTopicRef = useRef("");

  useEffect(() => {
    if (liveSession?.isActive) {
      const levelText = (studentProfile?.studyLevel || "Form 1").toLowerCase().trim();
      const targetText = (liveSession?.targetClass || "All Classes").toLowerCase().trim();
      const isTargetedForStudent = 
        targetText === "all classes" ||
        targetText === "all" ||
        targetText.includes(levelText) ||
        levelText.includes(targetText) ||
        (levelText.includes("form 1") && targetText.includes("form 1")) ||
        (levelText.includes("form 2") && targetText.includes("form 2")) ||
        (levelText.includes("form 3") && targetText.includes("form 3")) ||
        (levelText.includes("form 4") && targetText.includes("form 4")) ||
        (levelText.includes("form 5") && targetText.includes("form 5")) ||
        (levelText.includes("form 6") && targetText.includes("form 6"));

      if (isTargetedForStudent) {
        if (!lastActiveRef.current || lastTopicRef.current !== liveSession.topic) {
          setHasDismissedNotification(false);
          // Add to notifications dropdown list
          const notificationMsg = `Mwalimu is live for ${liveSession.subject} on "${liveSession.topic}". Click to join class!`;
          setNotifications(prev => {
            if (!prev.includes(notificationMsg)) {
              return [notificationMsg, ...prev];
            }
            return prev;
          });
        }
      }
    }
    lastActiveRef.current = !!liveSession?.isActive;
    lastTopicRef.current = liveSession?.topic || "";
  }, [liveSession?.isActive, liveSession?.topic, liveSession?.targetClass, studentProfile.studyLevel]);

  const handleStudentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let fileText = `Self study notes for ${file.name}. This material covers primary formulas, standard exam questions, and structured bullet points for preparation.`;

    const reader = new FileReader();
    const processUpload = async (rawContent: string) => {
      try {
        let data: any = null;
        try {
          data = await tbfApi.arrangeMaterial({
            title: file.name.replace(/\.[^/.]+$/, ""),
            subject: "Self Study",
            templateType: "notes",
            rawText: rawContent
          });
        } catch {
          const res = await fetch("/api/arrange-material", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: file.name.replace(/\.[^/.]+$/, ""),
              subject: "Self Study",
              templateType: "notes",
              rawText: rawContent
            })
          });
          if (res.ok) data = await res.json();
        }

        if (!data) {
          data = {
            arrangedContent: {
              sections: [{ heading: "Introduction", paragraphs: [rawContent] }],
              summary: "A brief self study document.",
              keyPoints: ["Self study material upload"]
            },
            quizQuestions: []
          };
        }

        const newMat: Material = {
          id: `mat-${Date.now()}`,
          title: file.name.replace(/\.[^/.]+$/, ""),
          subject: "Self Study",
          classes: "Self Study",
          uploadedAt: "Today",
          uploadedBy: studentProfile.email,
          templateType: "notes",
          rawText: rawContent,
          arrangedContent: data.arrangedContent,
          quizQuestions: data.quizQuestions
        };

        await setDoc(doc(db, "materials", newMat.id), newMat);
        alert(`Successfully uploaded and auto-arranged "${file.name}" in real-time!`);
      } catch (err: any) {
        console.error(err);
        alert("Failed to auto-arrange uploaded file: " + err.message);
      }
    };

    if (file.type === "text/plain" || file.name.endsWith(".txt") || file.name.endsWith(".md") || file.name.endsWith(".csv")) {
      reader.onload = (evt) => {
        processUpload(evt.target?.result as string || fileText);
      };
      reader.readAsText(file);
    } else {
      processUpload(fileText);
    }
  };

  // --- PRACTICE STATE ---
  const [practiceSubjects, setPracticeSubjects] = useState<PracticeSubject[]>(() => {
    if (isNewUser) {
      return initialPracticeSubjects.map((sub) => ({ ...sub, progress: 0 }));
    }
    return initialPracticeSubjects;
  });
  const [activePracticeSubject, setActivePracticeSubject] = useState<PracticeSubject | null>(null);
  const [quizState, setQuizState] = useState<{
    questions: { question: string; options: string[]; answer: number; explanation: string }[];
    currentIndex: number;
    selectedAnswer: number | null;
    isSubmitted: boolean;
    score: number;
    showResults: boolean;
  } | null>(null);

  // --- ASK BARAKA CHAT STATE ---
  const [chatMessages, setChatMessages] = useState<
    { id: string; text: string; sender: "user" | "ai"; timestamp: Date }[]
  >([
    {
      id: "msg-welcome",
      text: `Habari! I'm Baraka — ask me to explain a topic, summarise a chapter, or quiz you on anything.`,
      sender: "ai",
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // --- LABS STATE ---
  const [labsTab, setLabsTab] = useState<"videos" | "simulations">("videos");
  const [labsFilter, setLabsFilter] = useState<"All" | "Biology" | "Chemistry" | "Physics">("All");
  
  // Simulation selection
  const [activeSim, setActiveSim] = useState<"biology" | "chemistry" | "physics">("biology");

  // Interactive Photosynthesis Simulator (Biology)
  const [simLight, setSimLight] = useState(60); // 0 - 100%
  const [simCO2, setSimCO2] = useState(50); // 0 - 100%
  const [bubbleCount, setBubbleCount] = useState(15);
  const [glucoseSpeed, setGlucoseSpeed] = useState("Normal");

  // Interactive Acid-Base Titration Simulator (Chemistry)
  const [titVol, setTitVol] = useState(0); // 0 - 50 mL
  const [titIndicator, setTitIndicator] = useState<"phenolphthalein" | "methylOrange" | "none">("phenolphthalein");

  // Interactive Ohm's Law Circuit Simulator (Physics)
  const [physVolt, setPhysVolt] = useState(6.0); // 0 - 12 V
  const [physRes, setPhysRes] = useState(100); // 10 - 500 ohms

  // --- REAL-TIME AUTOMATIC PROGRESS TRACKING & CLIENT SYNC ---
  const [toast, setToast] = useState<{ message: string; type?: "info" | "success" } | null>(null);
  const [studentRegNo, setStudentRegNo] = useState<string>("");
  const [isInitialLoaded, setIsInitialLoaded] = useState(false);

  const triggerToast = (msg: string, type: "info" | "success" = "success") => {
    setToast({ message: msg, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Load registered student profile and progress from client store
  useEffect(() => {
    if (!studentProfile.email) return;

    const unsubscribe = onSnapshot(collection(db, "students"), (snapshot) => {
      let foundDoc: any = null;
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.email && data.email.toLowerCase() === studentProfile.email.toLowerCase()) {
          foundDoc = { id: docSnap.id, ...data };
        }
      });

      if (foundDoc) {
        setStudentRegNo(foundDoc.id);
        
        // Update states only ONCE initially to prevent feedback loops/stale closures
        if (!isInitialLoaded) {
          if (foundDoc.xp !== undefined) {
            setStudentXP(foundDoc.xp);
          }
          if (foundDoc.levelProgress !== undefined) {
            setStudentLevelProgress(foundDoc.levelProgress);
          }
          if (foundDoc.earnedCount !== undefined) {
            setEarnedCount(foundDoc.earnedCount);
          }
          if (foundDoc.streak !== undefined) {
            setStreak(foundDoc.streak);
          }
          if (foundDoc.planItems) {
            setPlanItems(foundDoc.planItems);
          }
          if (foundDoc.subjectProgress) {
            setPracticeSubjects((prev) =>
              prev.map((sub) => {
                const remoteProgress = foundDoc.subjectProgress[sub.name];
                if (remoteProgress !== undefined) {
                  return { ...sub, progress: remoteProgress };
                }
                return sub;
              })
            );
          }
          setIsInitialLoaded(true);
        }
      } else {
        // Create student document if not exists in "students"
        const defaultRegNo = `BSS-2026-${Math.floor(100 + Math.random() * 900)}`;
        setStudentRegNo(defaultRegNo);
        const initialDoc = {
          name: `${studentProfile.firstName} ${studentProfile.lastName}`,
          regNo: defaultRegNo,
          class: studentProfile.studyLevel || "Form 1A",
          age: 14,
          gender: "M",
          progress: isNewUser ? 0 : 62,
          lastActive: "Today",
          email: studentProfile.email,
          parentContact: studentProfile.phone || "+255 711 111 222",
          xp: isNewUser ? 0 : 1240,
          levelProgress: isNewUser ? 0 : 62,
          streak: isNewUser ? 0 : 7,
          earnedCount: isNewUser ? 0 : 12,
          planItems: isNewUser ? [] : [
            { id: 1, title: "Finish Photosynthesis lesson", subject: "Biology", detail: "12 min remaining", checked: true, xp: 15 },
            { id: 2, title: "Review algebra flashcards", subject: "Mathematics", detail: "8 min", checked: true, xp: 10 },
            { id: 3, title: "Cell structure quiz", subject: "Biology", detail: "5 min", checked: false, xp: 20 },
            { id: 4, title: "Read: The Water Cycle summary", subject: "Geography", detail: "6 min", checked: false, xp: 10 },
          ],
          subjectProgress: isNewUser ? {
            Kiswahili: 0,
            Biology: 0,
            Geography: 0,
            Mathematics: 0,
            English: 0,
            Physics: 0,
          } : {
            Kiswahili: 88,
            Biology: 78,
            Geography: 70,
            Mathematics: 62,
            English: 55,
            Physics: 40,
          }
        };
        setDoc(doc(db, "students", defaultRegNo), initialDoc)
          .then(() => {
            setIsInitialLoaded(true);
          })
          .catch(e => {
            console.warn("Auto-register student error:", e);
          });
      }
    }, (err) => {
      console.warn("Client store collection listen error:", err);
    });

    return () => unsubscribe();
  }, [studentProfile.email, isInitialLoaded]);

  // Automatically save state changes back to client store (debounced to bundle changes together)
  useEffect(() => {
    if (!studentProfile.email || !studentRegNo || !isInitialLoaded) return;

    const delayDebounceFn = setTimeout(async () => {
      const avgProgress = Math.round(
        practiceSubjects.reduce((acc, curr) => acc + curr.progress, 0) / practiceSubjects.length
      );

      const subjectProgressRecord: Record<string, number> = {};
      practiceSubjects.forEach((sub) => {
        subjectProgressRecord[sub.name] = sub.progress;
      });

      const updatedStudentData = {
        name: `${studentProfile.firstName} ${studentProfile.lastName}`,
        class: studentProfile.studyLevel || "Form 1A",
        email: studentProfile.email,
        lastActive: "Today",
        progress: avgProgress,
        xp: studentXP,
        levelProgress: studentLevelProgress,
        earnedCount: earnedCount,
        streak: streak,
        planItems: planItems,
        subjectProgress: subjectProgressRecord,
        parentContact: studentProfile.phone || "+255 711 111 222",
      };

      try {
        await setDoc(doc(db, "students", studentRegNo), updatedStudentData, { merge: true });
      } catch (err) {
        console.warn("Failed to automatically sync state changes to store:", err);
      }
    }, 1200);

    return () => clearTimeout(delayDebounceFn);
  }, [
    practiceSubjects,
    planItems,
    studentXP,
    studentLevelProgress,
    earnedCount,
    streak,
    studentProfile.email,
    studentRegNo,
    isInitialLoaded,
  ]);

  // Automatically track studying when they switch simulator or view lab videos
  useEffect(() => {
    if (activeTab === "labs") {
      if (labsTab === "simulations") {
        const subMap: Record<string, string> = {
          biology: "Biology",
          chemistry: "Chemistry",
          physics: "Physics"
        };
        const subjectName = subMap[activeSim];
        if (subjectName) {
          updateSubjectProgress(subjectName, 8, `Interacted with ${subjectName} Virtual Lab Simulator`);
        }
      }
    }
  }, [activeTab, labsTab, activeSim]);

  // Helper function to update progress of a specific subject
  const updateSubjectProgress = (subjectName: string, amount: number, activityName: string) => {
    setPracticeSubjects((prev) =>
      prev.map((sub) => {
        if (sub.name.toLowerCase() === subjectName.toLowerCase()) {
          const oldProg = sub.progress;
          const nextProg = Math.min(100, oldProg + amount);
          if (nextProg > oldProg) {
            triggerToast(`Tracked: ${activityName} (+${nextProg - oldProg}% ${sub.name} Progress)`);
            setNotifications((n) => [
              `Automatically tracked: ${activityName} (+${nextProg - oldProg}% ${sub.name} Progress)`,
              ...n,
            ]);
          }
          return { ...sub, progress: nextProg };
        }
        return sub;
      })
    );
  };

  // Helper to open a material and update progress
  const handleOpenMaterial = (mat: Material) => {
    setSelectedMaterial(mat);
    setQuizAnswers({});
    setQuizSubmitted(false);
    setMaterialSubTab("content");

    if (mat.subject) {
      updateSubjectProgress(mat.subject, 5, `Opened study notes "${mat.title}"`);
    }
  };

  // Helper to download document as a local file
  const handleDownloadMaterial = (mat: Material) => {
    const titleHeader = `====================================================\nTITLE: ${mat.title}\nSUBJECT: ${mat.subject || "General"}\nCLASS: ${mat.classes || "All Forms"}\nUPLOADED BY: ${mat.uploadedBy || "Teacher"}\nDATE: ${mat.uploadedAt || "Today"}\n====================================================\n\n`;
    
    let body = "";
    if (mat.arrangedContent?.summary) {
      body += `--- SUMMARY ---\n${mat.arrangedContent.summary}\n\n`;
    }
    if (mat.arrangedContent?.keyPoints && mat.arrangedContent.keyPoints.length > 0) {
      body += `--- KEY HIGHLIGHTS ---\n` + mat.arrangedContent.keyPoints.map((pt, i) => `${i + 1}. ${pt}`).join("\n") + `\n\n`;
    }
    if (mat.arrangedContent?.sections && mat.arrangedContent.sections.length > 0) {
      body += `--- STRUCTURED SECTIONS ---\n` + mat.arrangedContent.sections.map((sec: any) => `[ ${sec.title} ]\n${sec.content}`).join("\n\n") + `\n\n`;
    } else {
      body += `--- DOCUMENT CONTENT ---\n${mat.rawText || "No document text available."}\n\n`;
    }
    if (mat.quizQuestions && mat.quizQuestions.length > 0) {
      body += `--- PRACTICE QUIZ QUESTIONS ---\n` + mat.quizQuestions.map((q, i) => `Q${i + 1}: ${q.question}\nOptions: ${q.options.join(", ")}\nCorrect Answer: Option ${q.correctAnswer + 1}\nExplanation: ${q.explanation}`).join("\n\n") + `\n`;
    }

    const blob = new Blob([titleHeader + body], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${mat.title.replace(/[^a-zA-Z0-9_-]/g, "_")}_Document.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    triggerToast(`Downloaded "${mat.title}" to your device!`, "success");
  };

  // Helper to completely reset demo student progress
  const handleResetProgress = async () => {
    if (confirm("Are you sure you want to reset all your progress, XP, and streaks to zero? This cannot be undone.")) {
      setStudentXP(0);
      setStudentLevelProgress(0);
      setEarnedCount(0);
      setStreak(0);
      setPlanItems([]);
      setPracticeSubjects(initialPracticeSubjects.map((sub) => ({ ...sub, progress: 0 })));
      triggerToast("Progress successfully reset to zero!", "info");

      if (studentProfile.email && studentRegNo) {
        const resetStudentData = {
          progress: 0,
          xp: 0,
          levelProgress: 0,
          earnedCount: 0,
          streak: 0,
          planItems: [],
          subjectProgress: {
            Kiswahili: 0,
            Biology: 0,
            Geography: 0,
            Mathematics: 0,
            English: 0,
            Physics: 0,
          }
        };
        try {
          await setDoc(doc(db, "students", studentRegNo), resetStudentData, { merge: true });
        } catch (e) {
          console.warn("Failed to write reset data:", e);
        }
      }
    }
  };

  useEffect(() => {
    // Calculate bubble count and speed dynamically for the simulator
    const rate = Math.round((simLight * simCO2) / 200) + 5;
    setBubbleCount(rate);
    if (rate < 8) setGlucoseSpeed("Very Slow");
    else if (rate < 18) setGlucoseSpeed("Normal");
    else if (rate < 35) setGlucoseSpeed("Rapid");
    else setGlucoseSpeed("Maximum Output");
  }, [simLight, simCO2]);

  // --- MY PROGRESS CHART STATE ---
  const studyData = isNewUser ? [
    { name: "Mon", minutes: 0, active: false },
    { name: "Tue", minutes: 0, active: false },
    { name: "Wed", minutes: 0, active: false },
    { name: "Thu", minutes: 0, active: false },
    { name: "Fri", minutes: 0, active: false },
    { name: "Sat", minutes: 0, active: false },
    { name: "Sun", minutes: 0, active: false },
  ] : [
    { name: "Mon", minutes: 30, active: false },
    { name: "Tue", minutes: 55, active: false },
    { name: "Wed", minutes: 20, active: false },
    { name: "Thu", minutes: 75, active: false },
    { name: "Fri", minutes: 40, active: false },
    { name: "Sat", minutes: 110, active: true }, // Highlighted in orange (Screenshot 6)
    { name: "Sun", minutes: 45, active: false },
  ];

  // Scroll chat to bottom on new message
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const fullName = `${studentProfile.firstName} ${studentProfile.lastName}`;

  // Call server-side Gemini route
  const handleSendMessage = async (customMessage?: string) => {
    const messageToSend = customMessage || inputMessage;
    if (!messageToSend.trim()) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      text: messageToSend,
      sender: "user" as const,
      timestamp: new Date(),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    if (!customMessage) setInputMessage("");
    setIsChatLoading(true);

    try {
      // Map previous message structures for server context
      const historyContext = chatMessages.slice(-8).map((msg) => ({
        text: msg.text,
        sender: msg.sender === "user" ? "user" : "model",
      }));

      let data: any = null;
      try {
        data = await tbfApi.askBaraka(messageToSend, historyContext);
      } catch {
        const res = await fetch("/api/ask-baraka", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: messageToSend,
            history: historyContext,
          }),
        });
        if (res.ok) data = await res.json();
      }

      if (data && data.text) {
        setChatMessages((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            text: data.text,
            sender: "ai",
            timestamp: new Date(),
          },
        ]);
      } else {
        throw new Error("API responded without text output");
      }
    } catch (err: any) {
      console.error(err);
      setChatMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          text: "Samahani, I encountered an issue connecting to my brain. Please try again in a moment!",
          sender: "ai",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Start Interactive Practice Quiz
  const startQuizForSubject = (subjectName: string) => {
    let questions = [];
    if (subjectName === "Biology") {
      questions = [
        {
          question: "Which cell organelle is known as the powerhouse of the cell?",
          options: ["Nucleus", "Mitochondria", "Chloroplast", "Ribosome"],
          answer: 1,
          explanation: "Mitochondria convert glucose into cellular energy (ATP), earning them the title of the cell powerhouse.",
        },
        {
          question: "What green pigment absorbs sunlight energy during photosynthesis?",
          options: ["Carotene", "Xanthophyll", "Chlorophyll", "Hemoglobin"],
          answer: 2,
          explanation: "Chlorophyll pigment inside chloroplasts is responsible for capturing light energy.",
        },
        {
          question: "Which of the following is a product of photosynthesis?",
          options: ["Carbon Dioxide", "Nitrogen", "Glucose", "Methane"],
          answer: 2,
          explanation: "Photosynthesis takes in water and carbon dioxide to produce Glucose and Oxygen.",
        },
      ];
    } else if (subjectName === "Mathematics") {
      questions = [
        {
          question: "If 3x + 7 = 22, what is the value of x?",
          options: ["5", "6", "15", "4"],
          answer: 0,
          explanation: "3x = 22 - 7 => 3x = 15 => x = 5.",
        },
        {
          question: "What is the square root of 144?",
          options: ["10", "11", "12", "14"],
          answer: 2,
          explanation: "12 times 12 is 144.",
        },
      ];
    } else {
      questions = [
        {
          question: `Let's test your general knowledge in ${subjectName}! Which of these is crucial for mastering this syllabus?`,
          options: ["Consistent Practice", "Rote Memorization", "Skipping Classes", "Guesswork"],
          answer: 0,
          explanation: "Consistent active recall and quiz practice develops deep long-term retention.",
        },
      ];
    }

    setQuizState({
      questions,
      currentIndex: 0,
      selectedAnswer: null,
      isSubmitted: false,
      score: 0,
      showResults: false,
    });
  };

  const submitQuizAnswer = () => {
    if (quizState === null || quizState.selectedAnswer === null) return;
    const isCorrect = quizState.selectedAnswer === quizState.questions[quizState.currentIndex].answer;
    setQuizState({
      ...quizState,
      isSubmitted: true,
      score: isCorrect ? quizState.score + 1 : quizState.score,
    });
  };

  const nextQuizQuestion = () => {
    if (quizState === null) return;
    const nextIndex = quizState.currentIndex + 1;
    if (nextIndex < quizState.questions.length) {
      setQuizState({
        ...quizState,
        currentIndex: nextIndex,
        selectedAnswer: null,
        isSubmitted: false,
      });
    } else {
      setQuizState({
        ...quizState,
        showResults: true,
      });
      // Add XP to user after finishing quiz
      setStreak((prev) => prev + 1);
      setStudentXP(xp => xp + 35);
      setStudentLevelProgress(prog => Math.min(100, prog + 15));
      if (activePracticeSubject) {
        updateSubjectProgress(activePracticeSubject.name, 15, `Finished Practice Quiz for ${activePracticeSubject.name}`);
      }
    }
  };

  return (
    <div id="student-dashboard-root" className="min-h-screen flex bg-[#FAF6EE] text-[#1E293B] font-sans p-2 sm:p-4 md:p-6 gap-4 lg:gap-6">
      
      {/* 1. Sidebar Panel (Screenshot Sidebar matches exactly) */}
      <aside className="hidden lg:flex w-64 bg-gradient-to-br from-[#15223F] to-[#0E1729] shrink-0 text-white flex-col justify-between p-6 z-10 select-none rounded-[2.5rem] border-2 border-white/5 shadow-2xl">
        <div className="space-y-8">
          {/* Top Logo */}
          <div className="flex items-center gap-3.5">
            <div className="bg-white/95 p-1.5 rounded-2xl flex items-center justify-center shadow-lg hover:scale-105 transition-transform">
              <BrandLogo size={32} />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white leading-tight">TBF School Hub</h2>
              <p className="text-[9px] text-white/50 tracking-wider font-mono">STUDENT HUB</p>
            </div>
          </div>

          {/* Navigation Menu */}
          <div className="space-y-1">
            <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase block mb-3 pl-2">
              Menu
            </span>

            {[
              { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
              { id: "classroom", label: "Classroom", icon: Video, isLive: liveSession?.isActive },
              { id: "library", label: "Library", icon: BookOpen },
              { id: "practice", label: "Practice", icon: Compass },
              { id: "ask-baraka", label: "Ask Baraka", icon: MessageSquare },
              { id: "labs", label: "Lab Practices", icon: FlaskConical },
              { id: "timetable", label: "Timetable", icon: Calendar },
              { id: "progress", label: "My Progress", icon: BarChart3 },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as any);
                    setActivePracticeSubject(null);
                    setQuizState(null);
                    if (item.id === "classroom" && liveSession?.isActive) {
                      setIsInsideLiveClass(true);
                    }
                  }}
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
                    <span className="bg-rose-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider animate-pulse font-mono shrink-0">
                      LIVE
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-4 pt-6 border-t border-white/10">
          {/* User Profile Card */}
          <div className="bg-white/5 p-3 rounded-2xl flex items-center gap-3 border-2 border-white/5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden text-white font-bold text-sm shadow-sm shrink-0">
              {studentProfile.photoUrl ? (
                <img src={studentProfile.photoUrl} alt="Student Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full bg-[#64B5D6] flex items-center justify-center">
                  {studentProfile.firstName[0]}
                </div>
              )}
            </div>
            <div className="min-w-0 font-sans">
              <p className="font-bold text-xs text-white truncate">{fullName}</p>
              <p className="text-[10px] text-white/50 truncate">
                {studentProfile.studyLevel} · School Student
              </p>
            </div>
          </div>

          {/* Toggle to Admin option if available */}
          {showAdminToggle && (
            <button
              onClick={onSwitchToAdmin}
              className="w-full bg-white/10 hover:bg-white/15 text-white py-2.5 rounded-2xl text-xs font-bold tracking-wide border border-white/10 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <FaWrench className="w-3.5 h-3.5 text-amber-400" /> Switch to Admin View
            </button>
          )}
        </div>
      </aside>

      {/* Mobile Sidebar Navigation Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop overlay */}
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
                  <p className="text-[8px] text-white/50 tracking-wider font-mono">STUDENT HUB</p>
                </div>
              </div>

              {/* Navigation */}
              <div className="space-y-1">
                <span className="text-[9px] font-mono tracking-widest text-white/40 uppercase block mb-2 pl-2">
                  Menu
                </span>

                {[
                  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
                  { id: "classroom", label: "Classroom", icon: Video, isLive: liveSession?.isActive },
                  { id: "library", label: "Library", icon: BookOpen },
                  { id: "practice", label: "Practice", icon: Compass },
                  { id: "ask-baraka", label: "Ask Baraka", icon: MessageSquare },
                  { id: "labs", label: "Lab Practices", icon: FlaskConical },
                  { id: "timetable", label: "Timetable", icon: Calendar },
                  { id: "progress", label: "My Progress", icon: BarChart3 },
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id as any);
                        setActivePracticeSubject(null);
                        setQuizState(null);
                        setIsMobileMenuOpen(false);
                        if (item.id === "classroom" && liveSession?.isActive) {
                          setIsInsideLiveClass(true);
                        }
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
                        <span className="bg-rose-500 text-white text-[7px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider animate-pulse font-mono">
                          LIVE
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t border-white/10">
              {/* User Profile Card */}
              <div className="bg-white/5 p-3 rounded-xl flex items-center gap-3 border border-white/5">
                <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden text-white font-bold text-xs shadow-sm shrink-0">
                  {studentProfile.photoUrl ? (
                    <img src={studentProfile.photoUrl} alt="Student Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full bg-[#64B5D6] flex items-center justify-center">
                      {studentProfile.firstName[0]}
                    </div>
                  )}
                </div>
                <div className="min-w-0 font-sans text-left">
                  <p className="font-bold text-xs text-white truncate">{fullName}</p>
                  <p className="text-[9px] text-white/50 truncate">
                    {studentProfile.studyLevel}
                  </p>
                </div>
              </div>

              {/* Toggle to Admin option if available */}
              {showAdminToggle && (
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onSwitchToAdmin();
                  }}
                  className="w-full bg-white/10 hover:bg-white/15 text-white py-2 rounded-xl text-[10px] font-bold tracking-wide border border-white/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FaWrench className="w-3 h-3 text-amber-400" /> Switch to Admin View
                </button>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* 2. Main Action Area Container */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Top Header Block (Matches exactly) */}
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
              placeholder="Search topics, materials, simulations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#FAF6EE]/90 border border-transparent rounded-full pl-11 pr-5 py-2.5 text-sm focus:outline-none focus:border-[#D69B67] focus:bg-white transition-all shadow-xs"
            />
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-5">
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
                className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-gray-100 shadow-xs hover:border-[#D69B67] transition-all relative"
              >
                <Bell className="w-4.5 h-4.5 text-slate-600" />
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full" />
              </button>

              {showNotificationDropdown && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 space-y-3 z-50 animate-slide-up">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Notifications</p>
                  <div className="space-y-2">
                    {notifications.map((notif, index) => {
                      const isLiveNotif = notif.includes("live") || notif.includes("Mwalimu");
                      return (
                        <button
                          key={index}
                          onClick={() => {
                            if (isLiveNotif) {
                              setIsInsideLiveClass(true);
                              setActiveTab("dashboard");
                              setHasDismissedNotification(true);
                              setShowNotificationDropdown(false);
                            }
                          }}
                          className={`w-full text-left text-xs p-2.5 rounded-xl transition-all block text-left ${
                            isLiveNotif 
                              ? "bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-950 font-bold cursor-pointer" 
                              : "bg-[#FAF6EE] hover:bg-white hover:shadow-xs text-slate-700"
                          }`}
                        >
                          {notif}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Profile circular avatar button with dropdown settings */}
            <div className="relative">
              <button
                id="student-profile-avatar-btn"
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden border border-gray-100 shadow-sm select-none cursor-pointer transition-all active:scale-95 focus:outline-none bg-white"
              >
                {studentProfile.photoUrl ? (
                  <img src={studentProfile.photoUrl} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <span className="w-full h-full bg-[#D69B67] hover:bg-[#C88A58] text-white font-bold flex items-center justify-center transition-all">{studentProfile.firstName[0]}</span>
                )}
              </button>

              {showProfileDropdown && (
                <div 
                  id="profile-dropdown-menu"
                  className="absolute right-0 mt-2 w-80 bg-white rounded-[2rem] shadow-xl border-2 border-[#15223F]/5 p-5 z-50 animate-slide-up text-left space-y-4"
                >
                  <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                    <div className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center shadow-sm shrink-0">
                      {studentProfile.photoUrl ? (
                        <img src={studentProfile.photoUrl} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="w-full h-full bg-[#64B5D6] text-white font-bold text-base flex items-center justify-center">{studentProfile.firstName[0]}</span>
                      )}
                    </div>
                    <div className="min-w-0 font-sans">
                      <p className="font-bold text-sm text-[#15223F] truncate">{fullName}</p>
                      <p className="text-xs text-gray-400 truncate">{studentProfile.email}</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-slate-600">
                    <p className="font-semibold text-[10px] text-gray-400 uppercase tracking-wider">Student Profile Details</p>
                    <div className="grid grid-cols-2 gap-2 bg-[#FAF6EE] p-3 rounded-xl border border-gray-100/50">
                      <div>
                        <span className="text-[10px] text-gray-400 block">Class / Level</span>
                        <span className="font-bold text-slate-700">{studentProfile.studyLevel}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 block">Curriculum</span>
                        <span className="font-bold text-slate-700 truncate block">{studentProfile.curriculum}</span>
                      </div>
                      <div className="col-span-2 border-t border-gray-200/50 pt-1.5 mt-1">
                        <span className="text-[10px] text-gray-400 block">Phone Contact</span>
                        <span className="font-medium text-slate-700">{studentProfile.phone || "No phone added"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 pt-2 border-t border-gray-100">
                    <button
                      id="edit-profile-details-btn"
                      onClick={handleOpenEditModal}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 border border-slate-100 transition-all cursor-pointer"
                    >
                      <User className="w-4 h-4 text-[#D69B67]" />
                      <span>Edit Profile Details</span>
                    </button>

                    <button
                      id="reset-progress-btn"
                      onClick={() => {
                        setShowProfileDropdown(false);
                        handleResetProgress();
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-amber-700 hover:bg-amber-50 border border-amber-100 transition-all cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4 text-amber-600" />
                      <span>Reset Learning Progress</span>
                    </button>
                    
                    <button
                      id="logout-btn"
                      onClick={() => {
                        setShowProfileDropdown(false);
                        if (onLogout) {
                          onLogout();
                        } else {
                          alert("Logging out...");
                        }
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-100/50 transition-all cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Tab Switcher / Content rendering */}
        <div className="p-4 md:p-8 max-w-5xl w-full mx-auto space-y-8 flex-1">
          
          {/* 🔴 PERSISTENT LIVE CLASS BROADCAST ALERT BAR (Visible on all tabs when streaming) */}
          {liveSession?.isActive && !isInsideLiveClass && (
            <div className="bg-gradient-to-r from-rose-500 to-amber-500 rounded-2xl p-4 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md border border-white/10 animate-fade-in text-left">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-100"></span>
                </span>
                <div>
                  <p className="text-xs font-bold font-serif">Mwalimu is Live: {liveSession.subject}</p>
                  <p className="text-[10px] text-white/90">Topic: "{liveSession.topic}" · Target: {liveSession.targetClass || "All Classes"}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsInsideLiveClass(true);
                  setActiveTab("dashboard");
                }}
                className="bg-white text-rose-600 text-[10px] font-bold px-4 py-2 rounded-xl shadow-xs hover:bg-slate-50 transition-all cursor-pointer whitespace-nowrap active:scale-95 animate-pulse"
              >
                Join Live Session
              </button>
            </div>
          )}

          {/* TAB 1: DASHBOARD VIEW (Screenshot 1) */}
          {activeTab === "dashboard" && (
            <div className="space-y-8 animate-fade-in">
              {isInsideLiveClass && liveSession?.isActive ? (
                /* 🔴 VIRTUAL CLASSROOM PORTAL (IMMERSIVE & MULTI-VIEW MODE) */
                <div className={`bg-slate-950 text-white rounded-[2.5rem] border-4 border-rose-600/30 p-6 md:p-8 space-y-6 shadow-2xl relative transition-all duration-300 ${
                  liveViewMode === "fullscreen" ? "fixed inset-0 z-50 rounded-none border-none p-6 md:p-10 overflow-y-auto" : ""
                }`}>
                  {/* Classroom header with Screen Mode & Mic Controls */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/10 pb-5 gap-4">
                    <div className="flex items-center gap-4 text-left">
                      <span className="w-4.5 h-4.5 bg-red-500 rounded-full animate-ping shrink-0" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="bg-rose-500 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">LIVE</span>
                          <span className="text-xs text-slate-400 font-mono">By {liveSession.teacherName}</span>
                          {isTeacherMuted && (
                            <span className="bg-rose-900/80 text-rose-200 border border-rose-500/50 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 font-mono">
                              <FaBan className="inline text-rose-300 text-xs" /> Muted by Teacher
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-xl font-serif mt-1 text-slate-100">{liveSession.subject}: {liveSession.topic}</h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* View Screen Mode Switcher */}
                      <div className="bg-white/10 p-1 rounded-xl flex items-center gap-1 border border-white/10 text-xs font-bold">
                        <button
                          onClick={() => setLiveViewMode("normal")}
                          className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                            liveViewMode === "normal" ? "bg-[#D69B67] text-white shadow-sm" : "text-slate-300 hover:text-white"
                          }`}
                        >
                          <FaDesktop className="text-xs" /> Standard
                        </button>
                        <button
                          onClick={() => setLiveViewMode("compact")}
                          className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                            liveViewMode === "compact" ? "bg-[#D69B67] text-white shadow-sm" : "text-slate-300 hover:text-white"
                          }`}
                        >
                          <FaMobileScreen className="text-xs" /> Small View
                        </button>
                        <button
                          onClick={() => setLiveViewMode(liveViewMode === "fullscreen" ? "normal" : "fullscreen")}
                          className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                            liveViewMode === "fullscreen" ? "bg-rose-600 text-white shadow-sm" : "text-slate-300 hover:text-white"
                          }`}
                        >
                          {liveViewMode === "fullscreen" ? (
                            <>
                              <FaXmark className="text-xs" /> Exit Full Screen
                            </>
                          ) : (
                            <>
                              <FaDesktop className="text-xs" /> Full Screen
                            </>
                          )}
                        </button>
                      </div>

                      <button
                        onClick={() => setIsInsideLiveClass(false)}
                        className="bg-red-600/80 hover:bg-red-600 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 shadow-md"
                      >
                        <FaDoorOpen className="text-xs" /> Leave Class
                      </button>
                    </div>
                  </div>

                  {/* Muted by Teacher Banner */}
                  {isTeacherMuted && (
                    <div className="bg-rose-950/80 border-2 border-rose-500/50 p-3 rounded-2xl text-left flex items-center justify-between gap-3 text-xs text-rose-200 font-medium">
                      <div className="flex items-center gap-2">
                        <FaBan className="text-base text-rose-400 shrink-0" />
                        <span>Your microphone is currently muted by teacher ({liveSession.teacherName}).</span>
                      </div>
                      <span className="text-[10px] font-mono bg-rose-900 px-2 py-1 rounded text-rose-300">LISTEN MODE</span>
                    </div>
                  )}

                  {/* Class body */}
                  <div className={`grid grid-cols-1 ${liveViewMode === "compact" ? "lg:grid-cols-4 gap-4" : "lg:grid-cols-3 gap-6"}`}>
                    {/* Video Stream + Whiteboard (Left columns) */}
                    <div className={liveViewMode === "compact" ? "lg:col-span-2 space-y-4" : "lg:col-span-2 space-y-6"}>

                      {/* Live Classroom Camera Feeds (Teacher & Student) */}
                      <div className={liveViewMode === "compact" ? "grid grid-cols-2 gap-3" : "grid grid-cols-1 md:grid-cols-2 gap-4"}>
                        {/* Teacher's Live Stream Feed & Audio Speaker */}
                        <div className={`bg-[#1e2530] border-2 border-white/10 rounded-[2rem] overflow-hidden shadow-inner relative flex flex-col ${
                          liveViewMode === "compact" ? "min-h-[130px]" : "min-h-[180px]"
                        }`}>
                          <div className="bg-black/30 px-3 py-2 border-b border-white/10 flex justify-between items-center text-[10px] font-mono text-slate-300">
                            <span className="flex items-center gap-1.5">
                              <FaPersonChalkboard className="text-[#D69B67] text-xs" /> Teacher Broadcast
                            </span>
                            
                            {/* Teacher Audio Control Toggle */}
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => {
                                  const newMuteState = !isTeacherAudioMuted;
                                  setIsTeacherAudioMuted(newMuteState);
                                  if (newMuteState && "speechSynthesis" in window) {
                                    window.speechSynthesis.cancel();
                                  }
                                }}
                                className={`px-2 py-0.5 rounded font-mono text-[9px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                  isTeacherAudioMuted
                                    ? "bg-rose-900/80 text-rose-300 border border-rose-700 hover:bg-rose-800"
                                    : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-500/30"
                                }`}
                              >
                                {isTeacherAudioMuted ? (
                                  <>
                                    <FaVolumeXmark className="text-xs" /> Speaker Muted
                                  </>
                                ) : (
                                  <>
                                    <FaVolumeHigh className="text-xs" /> Teacher Sound: ON
                                  </>
                                )}
                              </button>
                            </div>
                          </div>

                          <div className={`flex-1 bg-slate-950 flex items-center justify-center relative group ${
                            liveViewMode === "compact" ? "min-h-[110px]" : "min-h-[160px]"
                          }`}>
                            {liveSession.teacherCameraFrame ? (
                              <img
                                src={liveSession.teacherCameraFrame}
                                alt="Teacher Live Camera Broadcast"
                                className="w-full h-full object-cover scale-x-[-1]"
                              />
                            ) : (
                              <div className="text-center p-3 space-y-1">
                                <FaPersonChalkboard className="text-3xl mx-auto text-[#D69B67] animate-bounce" />
                                <p className="text-xs font-bold text-slate-200">{liveSession.teacherName} is Live</p>
                                <p className="text-[9px] text-slate-400 font-mono">Stream: 1080p 60fps · Audio Active</p>
                              </div>
                            )}

                            {/* Floating Teacher Audio Speaker Control & Replay button */}
                            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2 z-10">
                              <div className="bg-red-600/90 text-white text-[8px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 shadow-xs shrink-0">
                                <span className="w-1 h-1 bg-white rounded-full animate-ping"></span> BROADCAST
                              </div>

                              <button
                                onClick={() => {
                                  if ("speechSynthesis" in window) {
                                    window.speechSynthesis.cancel();
                                    const textToSpeak = liveSession.teacherAudioMessage || liveSession.whiteboardText || `Welcome to ${liveSession.subject} live class!`;
                                    const utter = new SpeechSynthesisUtterance(textToSpeak);
                                    utter.rate = 0.95;
                                    window.speechSynthesis.speak(utter);
                                  }
                                }}
                                className="bg-[#15223F]/90 hover:bg-[#15223F] text-[#D69B67] border border-[#D69B67]/50 text-[9px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer shadow-md flex items-center gap-1 font-mono"
                              >
                                <FaBullhorn className="text-xs" /> Listen to Teacher Voice
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Student's Local Interactive Camera Feed with Audio Control */}
                        <div className={`bg-[#1e2530] border-2 border-white/10 rounded-[2rem] overflow-hidden shadow-inner relative flex flex-col ${
                          liveViewMode === "compact" ? "min-h-[130px]" : "min-h-[180px]"
                        }`}>
                          <div className="bg-black/30 px-3 py-2 border-b border-white/10 flex justify-between items-center text-[10px] font-mono text-slate-300">
                            <span className="flex items-center gap-1">My Camera & Mic</span>
                            {/* Student Mic Toggle */}
                            <button
                              disabled={isTeacherMuted}
                              onClick={() => setIsStudentMicMuted(!isStudentMicMuted)}
                              className={`px-2 py-0.5 rounded font-mono text-[9px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                isTeacherMuted
                                  ? "bg-rose-900/80 text-rose-300 border border-rose-700 cursor-not-allowed"
                                  : isStudentMicMuted
                                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/50 hover:bg-amber-500/30"
                                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-500/30"
                              }`}
                            >
                              {isTeacherMuted ? (
                                <>
                                  <FaVolumeXmark className="text-xs" /> Muted by Teacher
                                </>
                              ) : isStudentMicMuted ? (
                                <>
                                  <FaMicrophoneSlash className="text-xs" /> Mic Muted
                                </>
                              ) : (
                                <>
                                  <FaMicrophone className="text-xs text-emerald-400" /> Mic Active
                                </>
                              )}
                            </button>
                          </div>
                          <div className={`flex-1 bg-slate-950 relative flex items-center justify-center ${
                            liveViewMode === "compact" ? "min-h-[110px]" : "min-h-[160px]"
                          }`}>
                            <video
                              id="student-live-webcam"
                              autoPlay
                              playsInline
                              muted
                              className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
                            />
                            {/* Fail-safe placeholder if camera permission hasn't loaded yet */}
                            <div className="text-center p-3 z-10 pointer-events-none bg-black/40 rounded-xl space-y-1">
                              <Video className="w-5 h-5 mx-auto text-slate-400" />
                              <p className="text-[10px] font-bold text-slate-300">Camera & Audio On</p>
                            </div>

                            {/* Floating mic status overlay on video */}
                            <div className="absolute bottom-2 left-2 z-20">
                              <button
                                disabled={isTeacherMuted}
                                onClick={() => setIsStudentMicMuted(!isStudentMicMuted)}
                                className={`text-[9px] font-bold px-2 py-1 rounded-lg border font-mono shadow-md transition-all cursor-pointer flex items-center gap-1 ${
                                  isTeacherMuted
                                    ? "bg-rose-600 text-white border-rose-400"
                                    : isStudentMicMuted
                                    ? "bg-rose-500 text-white border-rose-400 hover:bg-rose-600"
                                    : "bg-emerald-600 text-white border-emerald-400 hover:bg-emerald-700"
                                }`}
                              >
                                {isTeacherMuted ? (
                                  <>
                                    <FaBan className="text-xs" /> Muted by Teacher
                                  </>
                                ) : isStudentMicMuted ? (
                                  <>
                                    <FaMicrophoneSlash className="text-xs" /> Click to Unmute
                                  </>
                                ) : (
                                  <>
                                    <FaMicrophone className="text-xs" /> Mic Active
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* 🖥️ Teacher Live Presentation Card (PPT or Screen Share) */}
                      {liveSession?.presentationActive && (
                        <div className="bg-[#1e2530] border-2 border-[#D69B67]/40 rounded-[2rem] overflow-hidden shadow-xl animate-fade-in relative flex flex-col space-y-4">
                          <div className="bg-gradient-to-r from-[#D69B67]/20 to-[#1e2530] px-5 py-3.5 border-b border-white/10 flex justify-between items-center text-xs font-mono text-slate-200">
                            <span className="flex items-center gap-2 font-bold text-[#D69B67]">
                              {liveSession.presentationType === "slide" ? (
                                <>
                                  <FaBookOpen className="text-[#D69B67] text-xs" /> LIVE SLIDE DECK
                                </>
                              ) : (
                                <>
                                  <FaDesktop className="text-[#D69B67] text-xs" /> LIVE SCREEN SHARE
                                </>
                              )}
                            </span>
                            <span className="bg-amber-500/20 text-[#D69B67] border border-[#D69B67]/30 text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider animate-pulse font-mono flex items-center gap-1">
                              <span className="w-1 h-1 bg-amber-500 rounded-full"></span> TEACHER PRESENTING
                            </span>
                          </div>

                          <div className="p-6 md:p-8 space-y-4 text-left">
                            {liveSession.presentationType === "slide" ? (
                              <div className="space-y-4">
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                                  <div>
                                    <span className="text-[9px] font-mono uppercase tracking-wider text-gray-400">Presentation File</span>
                                    <h5 className="text-sm font-bold text-white">{liveSession.presentationTitle}</h5>
                                  </div>
                                  <span className="text-xs font-bold font-mono bg-white/5 border border-white/10 text-[#D69B67] px-3 py-1 rounded-xl self-start sm:self-auto">
                                    Slide {(liveSession.presentationSlideIndex || 0) + 1} of {liveSession.presentationSlides?.length || 3}
                                  </span>
                                </div>

                                {/* Slide Content Display Box */}
                                <div className="bg-slate-950 text-emerald-100 p-6 rounded-2xl font-mono text-xs md:text-sm leading-relaxed whitespace-pre-wrap border-l-4 border-[#D69B67] shadow-inner relative overflow-hidden">
                                  {/* Visual decoration overlay */}
                                  <div className="absolute top-2 right-2 text-[10px] text-emerald-500/20 font-bold uppercase tracking-widest font-mono pointer-events-none select-none">
                                    CLASS_SLIDE_VIEWER
                                  </div>
                                  {liveSession.presentationSlides?.[liveSession.presentationSlideIndex || 0] || "Preparing slides..."}
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                <div className="space-y-1">
                                  <span className="text-[9px] font-mono uppercase tracking-wider text-gray-400">Shared Source</span>
                                  <h5 className="text-sm font-bold text-white">Teacher's Desktop Screen</h5>
                                </div>

                                 {/* Active Monitor / Screen Stream */}
                                <div className="bg-slate-950 aspect-video rounded-2xl overflow-hidden border border-white/10 shadow-inner flex flex-col justify-between relative">
                                  {liveSession.screenShareFrame ? (
                                    <div className="relative w-full h-full flex items-center justify-center bg-black">
                                      <img
                                        src={liveSession.screenShareFrame}
                                        alt="Teacher Live Screen Share Broadcast"
                                        className="w-full h-full object-contain"
                                      />
                                      <div className="absolute top-3 left-3 bg-red-600/95 text-white text-[9px] font-mono font-bold px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 shadow-md z-10">
                                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span>
                                        DESKTOP SCREEN SHARE BROADCAST
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="p-4 flex flex-col justify-between h-full">
                                      <div className="flex justify-between items-start">
                                        <span className="text-[9px] bg-emerald-500 text-slate-900 font-bold px-2 py-0.5 rounded-full font-mono uppercase">
                                          DESKTOP BROADCAST
                                        </span>
                                        <span className="text-[9px] text-gray-500 font-mono">1080p @60fps</span>
                                      </div>

                                      <div className="flex flex-col items-center justify-center gap-3 py-10">
                                        <FaDesktop className="text-4xl text-[#D69B67] animate-pulse" />
                                        <div className="space-y-1 text-center">
                                          <p className="text-xs font-bold text-white">Live Screen Share Feed is Active</p>
                                          <p className="text-[10px] text-gray-400 max-w-xs mx-auto leading-relaxed">
                                            Watch the shared screen for PowerPoint presentations, coding demonstrations, and active lessons.
                                          </p>
                                        </div>
                                      </div>

                                      <div className="flex justify-between items-center text-[10px] text-gray-500 border-t border-white/5 pt-2 font-mono">
                                        <span>Stream sync: Active</span>
                                        <span className="flex items-center gap-1.5">
                                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span> Live
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Whiteboard / Video Feed Simulator */}
                      <div className="bg-[#1e2530] border-2 border-white/10 rounded-[2rem] overflow-hidden shadow-inner relative min-h-[280px] flex flex-col">
                        <div className="bg-black/30 px-5 py-3 border-b border-white/10 flex justify-between items-center text-xs font-mono text-slate-300">
                          <span className="flex items-center gap-2">
                            <FaChalkboard className="text-emerald-400 text-xs" /> Virtual Blackboard
                          </span>
                          <span className="text-emerald-400 font-bold animate-pulse">● CONNECTED</span>
                        </div>

                        {/* Animated Blackboard whiteboardText */}
                        <div className="p-6 md:p-8 flex-1 flex flex-col justify-between text-left">
                          <pre className="font-mono text-emerald-300 text-xs md:text-sm whitespace-pre-wrap leading-relaxed select-text">
                            {liveSession.whiteboardText}
                          </pre>
                          
                          {/* Live Video Thumbnail Overlay */}
                          <div className="mt-6 flex justify-between items-end border-t border-white/5 pt-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-[#D69B67] rounded-full flex items-center justify-center font-bold text-slate-900 border-2 border-emerald-500 shadow-md">
                                <FaPersonChalkboard className="text-slate-900 text-lg" />
                              </div>
                              <div className="text-left">
                                <p className="text-xs font-bold text-white">{liveSession.teacherName}</p>
                                <p className="text-[10px] text-slate-400 font-mono">Presenting now...</p>
                              </div>
                            </div>
                            <div className="h-6 flex items-center gap-1">
                              <span className="w-1 bg-emerald-500 h-2 animate-bounce rounded" style={{ animationDelay: '0.1s' }} />
                              <span className="w-1 bg-emerald-500 h-4 animate-bounce rounded" style={{ animationDelay: '0.3s' }} />
                              <span className="w-1 bg-emerald-500 h-3 animate-bounce rounded" style={{ animationDelay: '0.5s' }} />
                              <span className="w-1 bg-emerald-500 h-5 animate-bounce rounded" style={{ animationDelay: '0.2s' }} />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 📄 Teacher Shared Documents & Handouts Card for Joined Students */}
                      <div className="bg-[#1e2530] border-2 border-amber-500/30 rounded-[2rem] p-6 shadow-xl space-y-4 text-left">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-white/10 pb-3 gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <BsFileEarmarkTextFill className="text-xl text-[#D69B67]" />
                              <h4 className="font-bold text-sm text-white">Teacher Uploaded Class Documents</h4>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Handouts, lecture notes & guides uploaded by {liveSession.teacherName}. Accessible to any student who joins.
                            </p>
                          </div>
                          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-mono font-bold px-2.5 py-1 rounded-full uppercase tracking-wider self-start sm:self-auto flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
                            REAL-TIME ACCESSIBLE
                          </span>
                        </div>

                        {/* List attached session documents or matching subject materials */}
                        {((liveSession.sharedDocuments && liveSession.sharedDocuments.length > 0) ||
                          materialsList.filter(m => m.subject.toLowerCase() === liveSession.subject.toLowerCase() || m.isTeacherUpload || m.uploadedBy === "Teacher").length > 0) ? (
                          <div className="space-y-3">
                            {(liveSession.sharedDocuments && liveSession.sharedDocuments.length > 0
                              ? liveSession.sharedDocuments
                              : materialsList.filter(m => m.subject.toLowerCase() === liveSession.subject.toLowerCase() || m.isTeacherUpload || m.uploadedBy === "Teacher").slice(0, 3)
                            ).map((docItem: any, dIdx: number) => (
                              <div
                                key={docItem.id || dIdx}
                                className="bg-slate-900/90 border border-white/10 hover:border-amber-500/50 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
                              >
                                <div className="flex items-start gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-300 font-bold shrink-0">
                                    <BsFileEarmarkPdfFill className="w-5 h-5 text-amber-300" />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h5 className="font-bold text-xs text-white">{docItem.title}</h5>
                                      <span className="text-[8px] bg-amber-500/20 text-amber-300 font-mono font-bold px-1.5 py-0.5 rounded border border-amber-500/30 uppercase flex items-center gap-1">
                                        <FaPersonChalkboard className="text-[9px]" /> MWALIMU HANDOUT
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                      {docItem.subject} · {docItem.classes || "All Forms"} · Uploaded by {docItem.uploadedBy || liveSession.teacherName}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 self-end sm:self-center">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenMaterial(docItem)}
                                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <FaBookOpen className="w-3.5 h-3.5" /> Read Document
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadMaterial(docItem)}
                                    className="bg-white/10 hover:bg-white/20 text-white border border-white/15 text-xs font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <FaDownload className="w-3.5 h-3.5" /> Download
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-4 bg-slate-900/50 border border-white/5 rounded-2xl text-center space-y-1">
                            <p className="text-xs font-bold text-slate-300">No specific handout attached yet</p>
                            <p className="text-[10px] text-slate-400">
                              Your teacher hasn't uploaded a document for this session yet. You can also browse all teacher files in the Materials tab!
                            </p>
                          </div>
                        )}
                      </div>

                      {/* ❓ Live Quiz Pushed Panel */}
                      {liveSession.activeQuiz && liveSession.activeQuiz.launched ? (
                        <div className="bg-gradient-to-r from-rose-950 to-orange-950/80 border-2 border-rose-500/40 p-6 rounded-[2rem] space-y-4 text-left animate-slide-up">
                          <div className="flex justify-between items-center border-b border-white/10 pb-3">
                            <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded tracking-wider uppercase font-mono animate-bounce">
                              INSTANT CLASS QUIZ
                            </span>
                            <span className="text-xs text-rose-300 font-mono">
                              +{50} XP reward
                            </span>
                          </div>

                          <p className="font-bold text-sm md:text-base text-slate-100">{liveSession.activeQuiz.question}</p>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                            {liveSession.activeQuiz.options.map((opt, idx) => {
                              const isSelected = studentLiveQuizAnswer === idx;
                              const isCorrectAnswer = idx === liveSession.activeQuiz?.correctIndex;
                              return (
                                <button
                                  key={idx}
                                  disabled={studentLiveQuizSubmitted}
                                  onClick={() => setStudentLiveQuizAnswer(idx)}
                                  className={`p-3.5 rounded-xl border text-xs md:text-sm font-semibold transition-all text-left flex items-center justify-between cursor-pointer ${
                                    isSelected
                                      ? studentLiveQuizSubmitted
                                        ? isCorrectAnswer
                                          ? "bg-emerald-500/20 border-emerald-500 text-emerald-200"
                                          : "bg-red-500/20 border-red-500 text-red-200"
                                        : "bg-white/10 border-amber-400 text-amber-200 shadow-md"
                                      : studentLiveQuizSubmitted && isCorrectAnswer
                                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
                                      : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                                  }`}
                                >
                                  <span>{String.fromCharCode(65 + idx)}. {opt}</span>
                                  {studentLiveQuizSubmitted && isCorrectAnswer && (
                                    <span className="text-emerald-400 text-xs flex items-center gap-1">
                                      <FaCheck className="w-3 h-3" /> Correct
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          {!studentLiveQuizSubmitted ? (
                            <button
                              onClick={() => {
                                if (studentLiveQuizAnswer === null) {
                                  alert("Please choose an option first.");
                                  return;
                                }
                                setStudentLiveQuizSubmitted(true);
                                const isCorrect = studentLiveQuizAnswer === liveSession.activeQuiz?.correctIndex;
                                if (isCorrect) {
                                  setStudentXP(x => x + 50);
                                  alert("Sahihi! Correct answer! +50 XP has been added to your profile.");
                                } else {
                                  alert("Makosa. Incorrect answer, but thank you for participating!");
                                }

                                // Update live app submissions list
                                if (onUpdateLiveSession) {
                                  const list = liveSession.activeQuiz?.submissions || [];
                                  onUpdateLiveSession({
                                    ...liveSession,
                                    activeQuiz: {
                                      ...liveSession.activeQuiz,
                                      submissions: [...list.filter(s => s.studentName !== fullName), {
                                        studentName: fullName,
                                        answerIndex: studentLiveQuizAnswer,
                                        isCorrect
                                      }]
                                    }
                                  });
                                }
                              }}
                              className="w-full bg-[#D69B67] hover:bg-[#C88A58] text-white py-3 rounded-xl font-bold text-xs transition-all shadow-md active:scale-95 cursor-pointer"
                            >
                              Submit Answer
                            </button>
                          ) : (
                            <p className="text-xs text-slate-400 text-center font-mono py-1 flex items-center justify-center gap-1.5">
                              <FaCheck className="w-3 h-3 text-emerald-400" /> Your live answer has been submitted to {liveSession.teacherName}.
                            </p>
                          )}
                        </div>
                      ) : null}

                    </div>

                    {/* Chat + Attendance Panel (Right 1 column) */}
                    <div className="space-y-6">
                      
                      {/* Attendance Card */}
                      <div className="bg-white/5 border-2 border-white/10 p-5 rounded-[2rem] text-left">
                        <h5 className="font-bold text-xs text-amber-100 uppercase tracking-widest font-mono mb-2">Class Attendance</h5>
                        <p className="text-xs text-slate-400 mb-3">Check-in to verify you are paying attention and get recorded.</p>
                        
                        {liveSession.attendance?.[fullName] === "Present" || liveSession.attendance?.["BSS-001"] === "Present" ? (
                          <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl flex items-center gap-2.5 text-emerald-300 text-xs font-bold font-mono">
                            <FaCircleCheck className="w-4 h-4 text-emerald-400" />
                            <span>PRESENT RECORDED</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              if (onUpdateLiveSession) {
                                onUpdateLiveSession({
                                  ...liveSession,
                                  attendance: {
                                    ...liveSession.attendance,
                                    [fullName]: "Present",
                                    "BSS-001": "Present" // compatibility fallback
                                  }
                                });
                                alert("Checked-in! Attendance marked as PRESENT.");
                              }
                            }}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                          >
                            <FaCheck className="w-3.5 h-3.5" />
                            <span>Check-in Attendance</span>
                          </button>
                        )}
                      </div>

                      {/* Classroom Live Chat */}
                      <div className="bg-[#15223F] border-2 border-white/10 rounded-[2rem] flex flex-col h-[300px] shadow-lg">
                        <div className="bg-black/20 py-2.5 px-4 text-xs font-bold text-slate-200 border-b border-white/10 text-left flex items-center gap-2">
                          <FaMessage className="w-3.5 h-3.5 text-[#D69B67]" /> Classroom Q&A Chat
                        </div>
                        
                        {/* Messages Area */}
                        <div className="flex-1 p-3 overflow-y-auto space-y-2 text-left">
                          {liveChatMessages.map((m, i) => {
                            const isTeacher = m.sender === liveSession.teacherName || m.sender === "Mwalimu Juma";
                            return (
                              <div key={i} className="text-xs">
                                <span className={`font-bold ${isTeacher ? 'text-[#D69B67]' : 'text-slate-200'}`}>
                                  {m.sender}:{" "}
                                </span>
                                <span className="text-slate-300 leading-relaxed">{m.text}</span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Input Area */}
                        <div className="p-2 border-t border-white/10 flex gap-2">
                          <input
                            type="text"
                            placeholder="Ask a question..."
                            value={liveChatInput}
                            onChange={(e) => setLiveChatInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendLiveChatMessage()}
                            className="bg-[#faf6ee]/10 text-white rounded-lg p-2 flex-1 text-xs focus:outline-none border border-transparent focus:border-white/20"
                          />
                          <button
                            onClick={handleSendLiveChatMessage}
                            className="bg-[#D69B67] hover:bg-[#C88A58] p-2 rounded-lg text-white font-bold text-xs"
                          >
                            Send
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Date & Greeting */}
                  <div className="space-y-1 text-left flex flex-col md:flex-row md:items-center md:justify-between bg-white/40 border-2 border-[#15223F]/5 rounded-[2rem] p-6 backdrop-blur-md shadow-sm">
                    <div>
                      <span className="text-[11px] font-mono tracking-widest text-[#D69B67] uppercase font-bold block">
                        MONDAY · 30 JUNE 2026
                      </span>
                      <h3 className="text-4xl font-serif text-[#15223F] font-bold tracking-tight">
                        Good morning, <span className="font-serif text-[#D69B67] font-bold">{fullName}</span>
                      </h3>
                      <div className="inline-flex items-center gap-1.5 bg-white border border-[#15223F]/5 rounded-full px-4 py-1 mt-2 text-xs font-bold text-slate-600 shadow-sm">
                        <FaSchool className="w-3.5 h-3.5 text-[#D69B67]" /> Baraka Secondary School
                      </div>
                    </div>
                  </div>

                  {/* LIVE CLASS BANNER (If active) */}
                  {liveSession?.isActive && !isInsideLiveClass && (
                    <div className="bg-gradient-to-r from-rose-600 via-orange-600 to-amber-500 p-6 rounded-[2.5rem] text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl border-2 border-white/20 relative overflow-hidden animate-pulse">
                      <div className="space-y-1.5 text-left relative z-10">
                        <span className="bg-white/20 text-[10px] font-bold px-3 py-1 rounded-full tracking-wider uppercase border border-white/20 inline-flex items-center gap-1.5">
                          <FaCircleDot className="w-2.5 h-2.5 text-rose-300 animate-pulse" /> LIVE STREAMING NOW
                        </span>
                        <h4 className="font-bold text-xl md:text-2xl font-serif">Join {liveSession.teacherName}'s Live {liveSession.subject} Class!</h4>
                        <p className="text-xs text-white/80 font-medium">Active Topic: {liveSession.topic}</p>
                      </div>
                      <button
                        onClick={() => setIsInsideLiveClass(true)}
                        className="bg-white text-rose-600 font-bold px-7 py-3 rounded-2xl text-xs shadow-lg hover:bg-slate-50 transition-all hover:scale-105 active:scale-95 shrink-0 cursor-pointer flex items-center gap-2"
                      >
                        <FaVideo className="w-3.5 h-3.5" /> Join Classroom
                      </button>
                      <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-white/10 to-transparent pointer-events-none" />
                    </div>
                  )}

                  {/* TWO COLUMN GRID FROM SCREENSHOT: SUBJECT PROGRESS AND TODAY'S PLAN */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* 1. Subject Progress (Left 2 columns on desktop) */}
                <div className="lg:col-span-2 bg-white rounded-[2.5rem] border-2 border-[#15223F]/5 p-8 shadow-md space-y-6 text-left">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold font-serif text-[#15223F] text-xl md:text-2xl">Subject Progress</h4>
                      <p className="text-xs text-gray-400 mt-1">Assigned by Baraka Secondary School · Updated automatically</p>
                    </div>
                    <button
                      onClick={() => setActiveTab("progress")}
                      className="text-xs font-bold text-[#D69B67] hover:underline"
                    >
                      View all
                    </button>
                  </div>

                  {/* List of subjects matching the photo exactly */}
                  <div className="space-y-4">
                    {practiceSubjects.map((subj, idx) => {
                      let color = "bg-rose-500";
                      if (subj.progress > 75) color = "bg-emerald-500";
                      else if (subj.progress > 50) color = "bg-sky-500";
                      else if (subj.progress > 25) color = "bg-[#D69B67]";
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                            <span>{subj.name}</span>
                            <span className="font-mono">{subj.progress}%</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${color} transition-all duration-1000`} style={{ width: `${subj.progress}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Today's Plan (Right 1 column on desktop) */}
                <div className="bg-[#FAF6EE] rounded-[2.5rem] border-2 border-[#15223F]/5 p-8 shadow-sm flex flex-col justify-between text-left space-y-6">
                  <div>
                    <h4 className="font-bold font-serif text-[#15223F] text-xl md:text-2xl">Today's plan</h4>
                    <p className="text-xs text-gray-400 mt-1">Tap to track task completion</p>
                  </div>

                  {/* Interactive checklists */}
                  <div className="space-y-3.5">
                    {planItems.length === 0 ? (
                      <div className="text-center py-6 bg-white rounded-3xl border-2 border-dashed border-[#15223F]/5 p-6 space-y-2">
                        <FaCalendarDays className="w-7 h-7 mx-auto text-slate-400" />
                        <p className="text-xs text-slate-700 font-bold">No study tasks yet</p>
                        <p className="text-[10px] text-gray-400 leading-relaxed">Create your custom learning path below by adding study tasks!</p>
                      </div>
                    ) : (
                      planItems.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleTogglePlanItem(item.id)}
                          className="w-full bg-white p-4 rounded-2xl border border-slate-100 shadow-xs hover:shadow-md hover:scale-[1.01] transition-all duration-200 flex items-start gap-3.5 text-left cursor-pointer group"
                        >
                          <div className="mt-0.5 shrink-0">
                            {item.checked ? (
                              <div className="w-5.5 h-5.5 bg-emerald-500 text-white rounded-full flex items-center justify-center text-xs shadow-xs font-bold">
                                <FaCheck className="w-3 h-3 text-white" />
                              </div>
                            ) : (
                              <div className="w-5.5 h-5.5 bg-slate-50 border-2 border-slate-300 rounded-lg group-hover:border-[#D69B67] transition-colors" />
                            )}
                          </div>
                          <div className="space-y-0.5">
                            <p className={`text-xs md:text-sm font-bold text-slate-800 ${item.checked ? 'line-through text-slate-400' : ''}`}>
                              {item.title}
                            </p>
                            <p className="text-[10px] text-gray-400 font-medium">
                              {item.subject} · {item.detail}
                            </p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>

                  {/* Add New Plan form inside the card */}
                  <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs space-y-3.5">
                    <p className="text-xs font-bold text-[#15223F] flex items-center gap-1.5 uppercase font-mono tracking-wider">
                      <FaPlus className="w-3.5 h-3.5 text-[#D69B67]" /> Create Study Plan
                    </p>
                    <div className="space-y-2.5">
                      <input
                        type="text"
                        placeholder="Task (e.g. Solve 5 Algebra problems)"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#D69B67] text-slate-800 font-medium"
                        value={newPlanTitle}
                        onChange={(e) => setNewPlanTitle(e.target.value)}
                      />
                      <div className="grid grid-cols-2 gap-2.5">
                        <select
                          className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#D69B67] text-slate-800 font-semibold cursor-pointer"
                          value={newPlanSubject}
                          onChange={(e) => setNewPlanSubject(e.target.value)}
                        >
                          <option value="Biology">Biology</option>
                          <option value="Mathematics">Mathematics</option>
                          <option value="Kiswahili">Kiswahili</option>
                          <option value="Geography">Geography</option>
                          <option value="English">English</option>
                          <option value="Physics">Physics</option>
                        </select>
                        <input
                          type="text"
                          placeholder="Detail (e.g. 15 mins)"
                          className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#D69B67] text-slate-800 font-medium"
                          value={newPlanDetail}
                          onChange={(e) => setNewPlanDetail(e.target.value)}
                        />
                      </div>
                      <button
                        onClick={handleAddPlanItem}
                        className="w-full bg-[#15223F] hover:bg-[#D69B67] text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-sm hover:shadow-md cursor-pointer active:scale-95"
                      >
                        Add Task to Plan
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 font-bold text-center border-t border-slate-200/50 pt-4">
                    Daily study tasks updated dynamically!
                  </p>
                </div>

              </div>

                </>
              )}
            </div>
          )}

          {/* TAB 1.5: CLASSROOM VIEW */}
          {activeTab === "classroom" && (
            <div className="space-y-8 animate-fade-in text-left">
              {/* Title & Description */}
              <div className="space-y-1">
                <span className="text-[11px] font-mono tracking-widest text-[#D69B67] uppercase font-bold block">
                  VIRTUAL CLASSROOM
                </span>
                <h3 className="text-3xl font-serif text-[#15223F] font-bold tracking-tight">
                  Your Classroom
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Learn live, ask questions, and collaborate with your classmates and teachers.
                </p>
              </div>

              {/* Live Session Alert Banner */}
              {liveSession?.isActive ? (
                <div className="bg-gradient-to-r from-rose-50 to-rose-100/50 border-2 border-rose-500/20 p-6 rounded-[2rem] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-rose-500 text-white rounded-2xl flex items-center justify-center animate-pulse shrink-0">
                      <Video className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="bg-rose-500 text-white text-[9px] font-bold px-2 py-0.5 rounded font-mono uppercase tracking-wider animate-pulse">
                          LIVE NOW
                        </span>
                        <p className="text-xs text-rose-700 font-bold font-mono">By {liveSession.teacherName}</p>
                      </div>
                      <h4 className="font-bold text-lg text-slate-800 mt-1">
                        {liveSession.subject}: {liveSession.topic}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Target class: {liveSession.targetClass || "All Form Levels"} · Started recently
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setIsInsideLiveClass(true);
                      setActiveTab("dashboard");
                    }}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-6 py-3 rounded-xl shadow-md hover:shadow-rose-500/20 active:scale-95 transition-all shrink-0 cursor-pointer text-center"
                  >
                    Join Live Broadcast
                  </button>
                </div>
              ) : (
                <div className="bg-slate-50 border-2 border-slate-200/40 p-6 rounded-[2rem] flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-100 text-slate-500 rounded-2xl flex items-center justify-center shrink-0">
                    <Video className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-700">No active live broadcast at the moment</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Your teacher hasn't started a live session. Next broadcast: <span className="font-semibold">Biology: Chapter 5 Notes</span> - Tomorrow, 9:00 AM.
                    </p>
                  </div>
                </div>
              )}

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Classroom Forum/Discussion - Left 2 Columns */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white p-6 rounded-[2rem] border-2 border-[#15223F]/5 shadow-sm space-y-6">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                      <div>
                        <h4 className="font-bold text-slate-800 text-base">Class Discussion Board</h4>
                        <p className="text-xs text-gray-400">Ask questions, share resources, and get quick help from peers.</p>
                      </div>
                      <span className="bg-[#FAF6EE] text-[#D69B67] text-xs font-bold px-3 py-1 rounded-xl">
                        {forumPosts.length} posts
                      </span>
                    </div>

                    {/* New Post Form */}
                    <form onSubmit={handleAddForumPost} className="space-y-3">
                      <textarea
                        value={newPostText}
                        onChange={(e) => setNewPostText(e.target.value)}
                        placeholder="What is on your mind? Share a doubt, question, or study tip with your class..."
                        rows={3}
                        className="w-full bg-[#FAF6EE]/50 border border-slate-200 rounded-2xl p-4 text-xs focus:outline-none focus:border-[#D69B67] text-slate-800"
                      />
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          className="bg-[#15223F] hover:bg-[#D69B67] text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer flex items-center gap-1.5"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Publish Post</span>
                        </button>
                      </div>
                    </form>

                    {/* Posts List */}
                    <div className="space-y-4 divide-y divide-gray-100/60">
                      {forumPosts.map((post) => (
                        <div key={post.id} className="pt-5 first:pt-0 space-y-3">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-[#D69B67]/10 text-[#D69B67] font-bold rounded-2xl flex items-center justify-center text-sm shadow-inner shrink-0">
                                {post.avatar}
                              </div>
                              <div>
                                <p className="font-bold text-xs text-slate-800">{post.author}</p>
                                <p className="text-[10px] text-gray-400">{post.role} · {post.time}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleUpvoteForumPost(post.id)}
                              className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 bg-[#FAF6EE] hover:bg-amber-100 rounded-xl text-[#D69B67] border border-gray-100 transition-all cursor-pointer"
                            >
                              <ThumbsUp className="w-3 h-3" />
                              <span>{post.upvotes}</span>
                            </button>
                          </div>

                          <p className="text-xs text-slate-700 leading-relaxed pl-1">
                            {post.content}
                          </p>

                          {/* Replies */}
                          {post.replies.length > 0 && (
                            <div className="bg-[#FAF6EE]/40 border border-gray-100 rounded-2xl p-4 space-y-3 mt-2">
                              {post.replies.map((reply, rid) => (
                                <div key={rid} className="space-y-1 bg-white p-2.5 rounded-xl border border-gray-100">
                                  <div className="flex items-center justify-between">
                                    <p className="text-[11px] font-bold text-slate-800">{reply.author}</p>
                                    <p className="text-[9px] text-gray-400">{reply.time}</p>
                                  </div>
                                  <p className="text-xs text-slate-600">{reply.content}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Reply input trigger */}
                          <div className="flex justify-start gap-3 items-center pt-1">
                            {activeReplyId !== post.id ? (
                              <button
                                onClick={() => setActiveReplyId(post.id)}
                                className="text-[11px] font-bold text-[#D69B67] hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                <span>Reply to this post</span>
                              </button>
                            ) : (
                              <div className="w-full space-y-2 mt-2">
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    placeholder="Write a supportive reply..."
                                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#D69B67]"
                                  />
                                  <button
                                    onClick={() => handleAddForumReply(post.id)}
                                    className="bg-[#D69B67] text-white px-3 py-2 rounded-xl text-xs font-bold hover:bg-[#C88A58] cursor-pointer"
                                  >
                                    Send
                                  </button>
                                  <button
                                    onClick={() => {
                                      setActiveReplyId(null);
                                      setReplyText("");
                                    }}
                                    className="bg-slate-200 text-slate-600 px-3 py-2 rounded-xl text-xs font-bold hover:bg-slate-300 cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Sidebar details/scheduled classes - 1 Column */}
                <div className="space-y-6">
                  {/* Classroom Details Card */}
                  <div className="bg-white p-6 rounded-[2rem] border-2 border-[#15223F]/5 shadow-sm space-y-4">
                    <h4 className="font-bold text-slate-800 text-sm pb-2 border-b border-gray-100">Classroom Profile</h4>
                    <div className="space-y-3">
                      <div>
                        <span className="text-[10px] text-gray-400 block uppercase font-mono tracking-wider">Level & Cohort</span>
                        <span className="text-xs font-bold text-slate-800">{studentProfile.studyLevel || "Form 1"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 block uppercase font-mono tracking-wider">Assigned School</span>
                        <span className="text-xs font-bold text-[#D69B67]">BSS Secondary School</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 block uppercase font-mono tracking-wider">Principal Educator</span>
                        <span className="text-xs font-bold text-slate-800">Mwalimu Juma</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 block uppercase font-mono tracking-wider">Total Classmates</span>
                        <span className="text-xs font-semibold text-slate-600">42 verified students</span>
                      </div>
                    </div>
                  </div>

                  {/* Scheduled Live Sessions */}
                  <div className="bg-white p-6 rounded-[2rem] border-2 border-[#15223F]/5 shadow-sm space-y-4">
                    <h4 className="font-bold text-slate-800 text-sm pb-2 border-b border-gray-100">Live Stream Schedule</h4>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="bg-[#FAF6EE] p-2 rounded-xl text-[#D69B67] shrink-0">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">Biology: Respiration</p>
                          <p className="text-[10px] text-gray-400 font-medium">Wednesday · 10:00 AM</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="bg-[#FAF6EE] p-2 rounded-xl text-[#D69B67] shrink-0">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">Mathematics: Equations</p>
                          <p className="text-[10px] text-gray-400 font-medium">Thursday · 09:00 AM</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="bg-[#FAF6EE] p-2 rounded-xl text-[#D69B67] shrink-0">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">Geography: Soils & Volcanism</p>
                          <p className="text-[10px] text-gray-400 font-medium">Friday · 11:30 AM</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Past Recorded Lessons */}
                  <div className="bg-white p-6 rounded-[2rem] border-2 border-[#15223F]/5 shadow-sm space-y-4">
                    <h4 className="font-bold text-slate-800 text-sm pb-2 border-b border-gray-100">Past Lesson Recordings</h4>
                    <div className="space-y-3">
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-slate-800 truncate max-w-[150px]">Biology - Plant Cells</p>
                          <p className="text-[9px] text-gray-400">2 days ago · 45 mins</p>
                        </div>
                        <span className="text-[9px] bg-sky-50 text-sky-600 font-bold px-2 py-0.5 rounded font-mono">
                          REVIEW
                        </span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-slate-800 truncate max-w-[150px]">Maths - Integers & Fractions</p>
                          <p className="text-[9px] text-gray-400">5 days ago · 50 mins</p>
                        </div>
                        <span className="text-[9px] bg-sky-50 text-sky-600 font-bold px-2 py-0.5 rounded font-mono">
                          REVIEW
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LIBRARY VIEW (Screenshot 2) */}
          {activeTab === "library" && (
            <div className="space-y-8 animate-fade-in text-left">
              {/* Title & Description */}
              <div className="space-y-1">
                <span className="text-[11px] font-mono tracking-widest text-[#D69B67] uppercase font-bold block">
                  LEARNING MATERIALS
                </span>
                <h3 className="text-3xl font-serif text-[#15223F] font-bold tracking-tight">
                  Your library
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Browse the <span className="font-semibold text-slate-700">public library</span> shared by other schools, or open <span className="font-semibold text-slate-700">your own materials</span> — assigned by your school and uploaded by you.
                </p>
              </div>

              {/* Toggle Buttons */}
              <div className="inline-flex bg-slate-200/50 p-1.5 rounded-2xl flex-wrap gap-1">
                <button
                  onClick={() => setLibraryTab("assigned")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    libraryTab === "assigned"
                      ? "bg-[#15223F] text-white shadow-xs"
                      : "text-gray-600 hover:text-slate-900"
                  }`}
                >
                  <FaSchool className="w-3.5 h-3.5 text-[#D69B67]" /> Assigned for {studentProfile.studyLevel || "My Class"}
                </button>
                <button
                  onClick={() => setLibraryTab("public")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    libraryTab === "public"
                      ? "bg-[#15223F] text-white shadow-xs"
                      : "text-gray-600 hover:text-slate-900"
                  }`}
                >
                  <FaGlobe className="w-3.5 h-3.5 text-sky-400" /> All School Documents
                </button>
                <button
                  onClick={() => setLibraryTab("my")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    libraryTab === "my"
                      ? "bg-[#15223F] text-white shadow-xs"
                      : "text-gray-600 hover:text-slate-900"
                  }`}
                >
                  <FaBookOpen className="w-3.5 h-3.5 text-amber-400" /> My Uploads
                </button>
              </div>

              {libraryTab === "public" ? (
                // Public Library books
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-slate-600 font-medium">
                      Documents shared publicly by other schools across Tanzania
                    </p>
                    <span className="bg-[#EBF7F5] text-[#2EC1AC] text-xs px-2.5 py-0.5 rounded-full font-mono font-bold">
                      8 books
                    </span>
                  </div>

                  {/* Four Big Book covers (Screenshot 2) */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    
                    {/* biology */}
                    <div className="bg-emerald-600 rounded-2xl p-6 text-white min-h-[300px] flex flex-col justify-between shadow-md relative hover:shadow-xl transition-all group cursor-pointer hover:-translate-y-1">
                      <div className="flex justify-between items-start">
                        <span className="bg-white/20 backdrop-blur-sm text-[10px] font-bold px-2 py-0.5 rounded-md tracking-wider">
                          PUBLIC
                        </span>
                        <BookMarked className="w-5 h-5 text-white/60" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs text-white/60 font-mono tracking-widest uppercase">Biology</p>
                        <h4 className="text-xl font-serif font-bold group-hover:underline">Biology Form 1–4</h4>
                      </div>
                    </div>

                    {/* mathematics */}
                    <div className="bg-amber-700 rounded-2xl p-6 text-white min-h-[300px] flex flex-col justify-between shadow-md relative hover:shadow-xl transition-all group cursor-pointer hover:-translate-y-1">
                      <div className="flex justify-between items-start">
                        <span className="bg-white/20 backdrop-blur-sm text-[10px] font-bold px-2 py-0.5 rounded-md tracking-wider">
                          PUBLIC
                        </span>
                        <BookMarked className="w-5 h-5 text-white/60" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs text-white/60 font-mono tracking-widest uppercase">Mathematics</p>
                        <h4 className="text-xl font-serif font-bold group-hover:underline">Hisabati Kidato</h4>
                      </div>
                    </div>

                    {/* physics */}
                    <div className="bg-sky-600 rounded-2xl p-6 text-white min-h-[300px] flex flex-col justify-between shadow-md relative hover:shadow-xl transition-all group cursor-pointer hover:-translate-y-1">
                      <div className="flex justify-between items-start">
                        <span className="bg-white/20 backdrop-blur-sm text-[10px] font-bold px-2 py-0.5 rounded-md tracking-wider">
                          PUBLIC
                        </span>
                        <BookMarked className="w-5 h-5 text-white/60" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs text-white/60 font-mono tracking-widest uppercase">Physics</p>
                        <h4 className="text-xl font-serif font-bold group-hover:underline">Physics Practicals</h4>
                      </div>
                    </div>

                    {/* Kiswahili */}
                    <div className="bg-purple-600 rounded-2xl p-6 text-white min-h-[300px] flex flex-col justify-between shadow-md relative hover:shadow-xl transition-all group cursor-pointer hover:-translate-y-1">
                      <div className="flex justify-between items-start">
                        <span className="bg-white/20 backdrop-blur-sm text-[10px] font-bold px-2 py-0.5 rounded-md tracking-wider">
                          PUBLIC
                        </span>
                        <BookMarked className="w-5 h-5 text-white/60" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs text-white/60 font-mono tracking-widest uppercase">Kiswahili</p>
                        <h4 className="text-xl font-serif font-bold group-hover:underline">Kiswahili Fasihi</h4>
                      </div>
                    </div>

                  </div>

                  {/* Public Shared Teacher Documents List */}
                  <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-4 text-left">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                      <div>
                        <h4 className="font-bold text-[#15223F] text-base flex items-center gap-2">
                          <FaGlobe className="w-4 h-4 text-emerald-600" /> Public Study Documents & Notes
                        </h4>
                        <p className="text-xs text-gray-400">Uploaded by teachers across Tanzania and available publicly to all students.</p>
                      </div>
                      <span className="bg-emerald-100 text-emerald-800 text-xs font-bold font-mono px-3 py-1 rounded-full">
                        {displayedMaterials.length} Documents
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {displayedMaterials.map((mat) => (
                        <div
                          key={mat.id}
                          onClick={() => handleOpenMaterial(mat)}
                          className="p-4 bg-[#FAF6EE] rounded-2xl border border-gray-100 hover:border-[#D69B67] hover:bg-amber-50/10 cursor-pointer transition-all flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-xl border border-gray-100 flex items-center justify-center shadow-2xs group-hover:bg-[#D69B67] text-[#15223F] group-hover:text-white transition-all text-base">
                              <BsFileEarmarkPdfFill className="w-5 h-5 text-[#D69B67] group-hover:text-white" />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="font-bold text-xs text-slate-800 group-hover:text-[#D69B67] transition-colors">{mat.title}</p>
                                <span className="text-[8px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded uppercase font-mono inline-flex items-center gap-1">
                                  <FaGlobe className="w-2.5 h-2.5" /> PUBLIC
                                </span>
                              </div>
                              <p className="text-[10px] text-gray-400 font-mono">{mat.subject} · {mat.classes}</p>
                            </div>
                          </div>
                          <button className="text-xs font-bold text-[#D69B67] bg-white px-3 py-1.5 rounded-xl border border-gray-200 group-hover:bg-[#15223F] group-hover:text-[#D69B67] group-hover:border-transparent transition-all">
                            Study & Quiz
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                // My Materials Section with Drag/Drop Upload (Interactive!)
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Upload Card */}
                  <div className="md:col-span-1 bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-4">
                    <h4 className="font-bold text-slate-800 text-sm">Upload personal material</h4>
                    <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center hover:border-[#D69B67] transition-all bg-[#FAF6EE]/50 cursor-pointer">
                      <input
                        type="file"
                        id="student-upload"
                        className="hidden"
                        onChange={handleStudentUpload}
                      />
                      <label htmlFor="student-upload" className="cursor-pointer space-y-2 block">
                        <FaCloudArrowUp className="w-8 h-8 mx-auto text-[#D69B67]" />
                        <p className="text-xs font-semibold text-[#15223F]">Select any document</p>
                        <p className="text-[10px] text-gray-400">PDF, Word or image</p>
                      </label>
                    </div>
                    <p className="text-[11px] text-gray-400 leading-normal">
                      Once uploaded, Baraka automatically generates summaries, quiz cards and flashcards!
                    </p>
                  </div>

                  {/* List of uploaded documents */}
                  <div className="md:col-span-2 space-y-3 bg-white p-6 rounded-3xl border border-gray-100 shadow-xs">
                    <h4 className="font-bold text-slate-800 text-sm">Assigned & Uploaded Materials</h4>
                    <div className="space-y-2">
                      {displayedMaterials.map((mat) => (
                        <div
                          key={mat.id}
                          onClick={() => {
                            handleOpenMaterial(mat);
                          }}
                          className="flex items-center justify-between p-3.5 bg-[#FAF6EE] rounded-xl border border-gray-100 hover:border-[#D69B67] hover:bg-amber-50/10 cursor-pointer transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-2xs">
                              {mat.templateType === "quiz" ? (
                                <FaCircleQuestion className="w-4 h-4 text-rose-500" />
                              ) : mat.templateType === "practical" ? (
                                <FaFlask className="w-4 h-4 text-emerald-500" />
                              ) : mat.templateType === "cheat_sheet" ? (
                                <FaBoltLightning className="w-4 h-4 text-amber-500" />
                              ) : (
                                <BsFileEarmarkTextFill className="w-4 h-4 text-sky-500" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-xs text-[#15223F]">{mat.title}</p>
                                {(mat.uploadedBy === "Teacher" || mat.isTeacherUpload || !mat.uploadedBy) ? (
                                  <span className="text-[8px] bg-amber-100 text-amber-800 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wide">
                                    Mwalimu
                                  </span>
                                ) : (
                                  <span className="text-[8px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wide">
                                    My Upload
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-gray-400">{mat.subject} · {mat.classes}</p>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono text-gray-400">{mat.uploadedAt}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PRACTICE VIEW (Screenshot 3 + Interactive Quiz!) */}
          {activeTab === "practice" && (
            <div className="space-y-8 animate-fade-in text-left">
              {/* Title & Description */}
              {!activePracticeSubject ? (
                <>
                  <div className="space-y-1">
                    <span className="text-[11px] font-mono tracking-widest text-[#D69B67] uppercase font-bold block">
                      PRACTICE
                    </span>
                    <h3 className="text-3xl font-serif text-[#15223F] font-bold tracking-tight">
                      What would you like to practice?
                    </h3>
                    <p className="text-sm text-gray-500 leading-relaxed">
                      Choose a subject to start a quiz or review flashcards. Topics follow your school's curriculum.
                    </p>
                  </div>

                  {/* 6 Grid Practice Subjects (Screenshot 3) */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {practiceSubjects.map((sub, index) => {
                      return (
                        <button
                          key={index}
                          onClick={() => {
                            setActivePracticeSubject(sub);
                            startQuizForSubject(sub.name);
                          }}
                          className="bg-white p-6 rounded-3xl border border-gray-100 hover:border-[#D69B67] hover:shadow-md text-left transition-all relative overflow-hidden group"
                        >
                          <div className="flex justify-between items-start mb-4">
                            {/* FontAwesome / Bootstrap Icons for Kiswahili, Biology, Geography, Mathematics, English, Physics */}
                            <div className="w-12 h-12 bg-[#FAF6EE] rounded-xl flex items-center justify-center">
                              {sub.name === "Kiswahili" && <FaBook className="text-[#D69B67] w-6 h-6" />}
                              {sub.name === "Biology" && <FaDna className="text-emerald-500 w-6 h-6" />}
                              {sub.name === "Geography" && <FaEarthAfrica className="text-sky-500 w-6 h-6" />}
                              {sub.name === "Mathematics" && <FaCalculator className="text-amber-500 w-6 h-6" />}
                              {sub.name === "English" && <FaPenNib className="text-purple-500 w-6 h-6" />}
                              {sub.name === "Physics" && <FaAtom className="text-rose-500 w-6 h-6" />}
                            </div>
                            <span className="text-xs font-mono text-gray-400">
                              {sub.topicsCount} topics
                            </span>
                          </div>

                          <h4 className="font-bold text-[#15223F] group-hover:text-[#D69B67] transition-colors text-lg">
                            {sub.name}
                          </h4>

                          {/* Progress bar */}
                          <div className="space-y-2 mt-4">
                            <div className="flex justify-between text-[10px] font-mono text-gray-400">
                              <span>Progress</span>
                              <span>{sub.progress}%</span>
                            </div>
                            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  sub.progress > 75
                                    ? "bg-emerald-500"
                                    : sub.progress > 50
                                    ? "bg-sky-500"
                                    : "bg-amber-500"
                                }`}
                                style={{ width: `${sub.progress}%` }}
                              />
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                // Interactive Quiz Component for Selected Subject!
                <div className="space-y-6 max-w-xl mx-auto bg-white p-8 rounded-3xl border border-gray-100 shadow-md">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                    <div>
                      <span className="text-xs font-mono font-bold text-[#D69B67] uppercase">
                        Active Quiz
                      </span>
                      <h4 className="text-xl font-serif font-bold text-[#15223F]">
                        {activePracticeSubject.name} Practice Quiz
                      </h4>
                    </div>
                    <button
                      onClick={() => {
                        setActivePracticeSubject(null);
                        setQuizState(null);
                      }}
                      className="text-xs text-slate-500 hover:text-rose-500 font-semibold"
                    >
                      ← Quit Quiz
                    </button>
                  </div>

                  {quizState && !quizState.showResults && (
                    <div className="space-y-6">
                      {/* Step Indicator */}
                      <div className="flex justify-between text-xs font-mono text-gray-400">
                        <span>Question {quizState.currentIndex + 1} of {quizState.questions.length}</span>
                        <span>Score: {quizState.score}</span>
                      </div>

                      {/* Question Text */}
                      <p className="font-semibold text-base text-[#15223F]">
                        {quizState.questions[quizState.currentIndex].question}
                      </p>

                      {/* Options */}
                      <div className="space-y-2.5">
                        {quizState.questions[quizState.currentIndex].options.map((opt, oIdx) => {
                          const isSelected = quizState.selectedAnswer === oIdx;
                          const isCorrect = oIdx === quizState.questions[quizState.currentIndex].answer;
                          let btnStyle = "border-gray-200 bg-[#FAF6EE] hover:bg-amber-50/20";
                          if (isSelected) {
                            btnStyle = "border-[#D69B67] bg-[#D69B67]/5 font-semibold text-[#15223F]";
                          }
                          if (quizState.isSubmitted) {
                            if (isCorrect) {
                              btnStyle = "border-emerald-500 bg-emerald-50 text-emerald-800 font-semibold";
                            } else if (isSelected) {
                              btnStyle = "border-rose-300 bg-rose-50 text-rose-800";
                            }
                          }

                          return (
                            <button
                              key={oIdx}
                              disabled={quizState.isSubmitted}
                              onClick={() => setQuizState({ ...quizState, selectedAnswer: oIdx })}
                              className={`w-full text-left p-4 rounded-xl border text-sm transition-all flex items-center justify-between ${btnStyle}`}
                            >
                              <span>{opt}</span>
                              {quizState.isSubmitted && isCorrect && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>

                      {/* Explanation box after submit */}
                      {quizState.isSubmitted && (
                        <div className="bg-[#FAF6EE] p-4 rounded-2xl border border-gray-100 text-xs text-slate-600 leading-normal space-y-1 animate-fade-in">
                          <p className="font-bold text-[#D69B67]">Explanation:</p>
                          <p>{quizState.questions[quizState.currentIndex].explanation}</p>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex justify-end">
                        {!quizState.isSubmitted ? (
                          <button
                            disabled={quizState.selectedAnswer === null}
                            onClick={submitQuizAnswer}
                            className="bg-[#D69B67] hover:bg-[#C88A58] disabled:opacity-40 text-white font-semibold py-2.5 px-6 rounded-xl text-xs transition-all shadow-xs"
                          >
                            Submit Answer
                          </button>
                        ) : (
                          <button
                            onClick={nextQuizQuestion}
                            className="bg-[#15223F] hover:bg-[#1E293B] text-white font-semibold py-2.5 px-6 rounded-xl text-xs transition-all shadow-xs"
                          >
                            {quizState.currentIndex + 1 === quizState.questions.length ? "Finish Quiz" : "Next Question"}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {quizState && quizState.showResults && (
                    <div className="text-center space-y-6 py-6 animate-fade-in">
                      <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-[#D69B67]">
                        <BookMarked className="w-8 h-8" />
                      </div>
                      <div className="space-y-1">
                        <h5 className="text-2xl font-serif font-bold text-[#15223F]">Quiz Completed!</h5>
                        <p className="text-sm text-gray-500">
                          You scored <span className="font-bold text-[#D69B67]">{quizState.score}</span> out of {quizState.questions.length}
                        </p>
                      </div>

                      {/* XP Reward animation details */}
                      <div className="bg-amber-50/70 p-4 rounded-2xl max-w-xs mx-auto border border-amber-100 text-xs text-amber-900 space-y-1">
                        <p className="font-bold">Leveling Progress Update</p>
                        <p>+30 Quiz Completion XP has been credited!</p>
                      </div>

                      <div className="flex gap-4 justify-center pt-2">
                        <button
                          onClick={() => {
                            // Retry
                            startQuizForSubject(activePracticeSubject.name);
                          }}
                          className="bg-gray-100 hover:bg-gray-200 text-slate-700 py-2.5 px-6 rounded-xl text-xs font-semibold transition-all"
                        >
                          Retry Quiz
                        </button>
                        <button
                          onClick={() => {
                            setActivePracticeSubject(null);
                            setQuizState(null);
                          }}
                          className="bg-[#D69B67] hover:bg-[#C88A58] text-white py-2.5 px-6 rounded-xl text-xs font-semibold transition-all"
                        >
                          Return to Practice
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ASK BARAKA CHAT COMPANION (Screenshot 4 + Real Backend API integration!) */}
          {activeTab === "ask-baraka" && (
            <div className="space-y-6 animate-fade-in text-left max-w-3xl mx-auto flex flex-col h-[calc(100vh-140px)]">
              
              {/* Header Box */}
              <div className="flex items-center gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs shrink-0">
                <div className="w-12 h-12 bg-[#D69B67]/10 text-[#D69B67] rounded-xl flex items-center justify-center shadow-xs shrink-0">
                  <FaGraduationCap className="w-7 h-7 text-[#D69B67]" />
                </div>
                <div>
                  <h4 className="font-serif font-bold text-lg text-[#15223F] flex items-center gap-2">
                    Ask Baraka
                    <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-100 px-2 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider">
                      Online Tutor
                    </span>
                  </h4>
                  <p className="text-xs text-gray-500">Your study companion · always patient, always clear</p>
                </div>
              </div>

              {/* Chat messages viewport */}
              <div className="flex-1 overflow-y-auto bg-white border border-gray-100 rounded-3xl p-6 space-y-4 shadow-inner min-h-[300px]">
                {chatMessages.map((msg) => {
                  const isUser = msg.sender === "user";
                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-3 max-w-xl ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                    >
                      {/* Avatar */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold select-none shrink-0 shadow-xs ${
                        isUser ? "bg-[#64B5D6] text-white" : "bg-[#D69B67] text-white"
                      }`}>
                        {isUser ? studentProfile.firstName[0] : "B"}
                      </div>

                      {/* Content block */}
                      <div className={`p-4 rounded-2xl text-xs leading-relaxed space-y-2 ${
                        isUser
                          ? "bg-[#64B5D6]/10 text-slate-800 rounded-tr-none"
                          : "bg-[#FAF6EE] text-[#15223F] rounded-tl-none border border-amber-100/50"
                      }`}>
                        <FormattedMessage text={msg.text} />
                      </div>
                    </div>
                  );
                })}

                {/* Loader when thinking */}
                {isChatLoading && (
                  <div className="flex gap-3 max-w-xl mr-auto">
                    <div className="w-8 h-8 bg-[#D69B67] rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
                      B
                    </div>
                    <div className="bg-[#FAF6EE] p-4 rounded-2xl rounded-tl-none border border-amber-100/50 flex items-center gap-2 text-xs text-gray-400">
                      <Loader2 className="w-4 h-4 animate-spin text-[#D69B67]" />
                      <span>Baraka is writing...</span>
                    </div>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Suggestions Chips (Screenshot 4) */}
              <div className="flex flex-wrap gap-2 shrink-0">
                {[
                  "Explain photosynthesis simply",
                  "Solve 2x + 3 = 11",
                  "What is the water cycle?",
                ].map((suggestion, index) => (
                  <button
                    key={index}
                    disabled={isChatLoading}
                    onClick={() => handleSendMessage(suggestion)}
                    className="bg-white hover:bg-[#FAF6EE] border border-gray-100 px-4 py-2 rounded-full text-xs font-semibold text-slate-600 transition-all shadow-2xs hover:border-[#D69B67]"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>

              {/* Input Area */}
              <div className="flex gap-2.5 shrink-0">
                <input
                  type="text"
                  placeholder="Ask anything about your lessons..."
                  value={inputMessage}
                  disabled={isChatLoading}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSendMessage();
                  }}
                  className="flex-1 bg-white border border-gray-200 rounded-2xl px-5 py-3.5 text-xs focus:outline-none focus:border-[#D69B67] shadow-xs"
                />
                <button
                  disabled={isChatLoading || !inputMessage.trim()}
                  onClick={() => handleSendMessage()}
                  className="w-12 h-12 bg-[#D69B67] hover:bg-[#C88A58] disabled:opacity-40 text-white rounded-2xl flex items-center justify-center transition-all shadow-md shrink-0"
                >
                  <Send className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: LAB PRACTICES & INTERACTIVE SIMULATION (Screenshot 5) */}
          {activeTab === "labs" && (
            <div className="space-y-8 animate-fade-in text-left">
              {/* Title & Description */}
              <div className="space-y-1">
                <span className="text-[11px] font-mono tracking-widest text-[#D69B67] uppercase font-bold block">
                  LAB PRACTICES
                </span>
                <h3 className="text-3xl font-serif text-[#15223F] font-bold tracking-tight">
                  Lab practices
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Video tutorials from verified educators + hands-on interactive simulations — organised by subject.
                </p>
              </div>

              {/* Video Tutorials vs Simulations Tab Bar */}
              <div className="inline-flex bg-slate-200/50 p-1 rounded-xl">
                <button
                  onClick={() => setLabsTab("videos")}
                  className={`px-5 py-2 rounded-lg text-xs font-semibold transition-all ${
                    labsTab === "videos"
                      ? "bg-white text-[#15223F] shadow-xs"
                      : "text-gray-500 hover:text-slate-800"
                  }`}
                >
                  Video Tutorials
                </button>
                <button
                  onClick={() => setLabsTab("simulations")}
                  className={`px-5 py-2 rounded-lg text-xs font-semibold transition-all ${
                    labsTab === "simulations"
                      ? "bg-white text-[#15223F] shadow-xs"
                      : "text-gray-500 hover:text-slate-800"
                  }`}
                >
                  Simulations
                </button>
              </div>

              {/* Render either Videos grid or Simulator */}
              {labsTab === "videos" ? (
                <div className="space-y-6">
                  {/* Subject filters */}
                  <div className="flex gap-2">
                    {["All", "Biology", "Chemistry", "Physics"].map((subj) => (
                      <button
                        key={subj}
                        onClick={() => setLabsFilter(subj as any)}
                        className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                          labsFilter === subj
                            ? "bg-[#15223F] text-white"
                            : "bg-white text-slate-600 border border-gray-100 hover:bg-slate-50"
                        }`}
                      >
                        {subj}
                      </button>
                    ))}
                  </div>

                  {/* Cards Grid (Screenshot 5) */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {initialLabVideos
                      .filter((v) => labsFilter === "All" || v.category === labsFilter)
                      .map((vid, index) => {
                        let colorTheme = "bg-emerald-500";
                        if (vid.category === "Chemistry") colorTheme = "bg-amber-500";
                        if (vid.category === "Physics") colorTheme = "bg-sky-500";

                        return (
                          <div
                            key={index}
                            onClick={() => {
                              updateSubjectProgress(vid.category, 5, `Watched lab video: "${vid.title}"`);
                              alert(`Studying Lab Video: "${vid.title}"! Your learning progress is tracked in real-time.`);
                            }}
                            className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer"
                          >
                            {/* Video Cover with Play Overlay */}
                            <div className={`${colorTheme} h-40 flex items-center justify-center relative group`}>
                              <div className="w-12 h-12 bg-white/90 group-hover:scale-110 rounded-full flex items-center justify-center shadow-md transition-transform">
                                <Play className="w-5 h-5 text-slate-800 ml-1 fill-slate-800" />
                              </div>
                              <span className="absolute top-4 left-4 bg-white/20 backdrop-blur-sm text-white text-[10px] font-bold px-3 py-0.5 rounded-md">
                                {vid.category}
                              </span>
                            </div>

                            {/* Info */}
                            <div className="p-5 space-y-2">
                              <h5 className="font-bold text-slate-800 leading-snug">{vid.title}</h5>
                              <div className="flex justify-between items-center text-[10px] font-mono text-gray-400">
                                <span>{vid.author}</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {vid.duration}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ) : (
                // --- FULLY INTERACTIVE MULTI-SUBJECT LAB SIMULATION HUB ---
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-8 text-left">
                  {/* Lab Selector Navigation */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
                    <div>
                      <span className="text-[10px] bg-[#FAF6EE] text-[#D69B67] border border-[#FAF6EE] px-3 py-1 rounded-full font-mono font-bold uppercase">
                        Interactive Science Simulations
                      </span>
                      <h4 className="text-xl font-serif font-bold text-[#15223F] mt-2">
                        Virtual STEM Laboratory
                      </h4>
                    </div>

                    {/* Simulation Switcher Pills */}
                    <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/50">
                      <button
                        onClick={() => setActiveSim("biology")}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                          activeSim === "biology"
                            ? "bg-emerald-600 text-white shadow-md"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Biology Lab
                      </button>
                      <button
                        onClick={() => setActiveSim("chemistry")}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                          activeSim === "chemistry"
                            ? "bg-amber-600 text-white shadow-md"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Chemistry Lab
                      </button>
                      <button
                        onClick={() => setActiveSim("physics")}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                          activeSim === "physics"
                            ? "bg-sky-600 text-white shadow-md"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Physics Lab
                      </button>
                    </div>
                  </div>

                  {/* ----------------- 1. BIOLOGY: PHOTOSYNTHESIS SIMULATION ----------------- */}
                  {activeSim === "biology" && (
                    <div className="space-y-6 animate-fade-in">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                          <h4 className="text-lg font-serif font-bold text-[#15223F]">
                            Photosynthesis & Oxygen Production
                          </h4>
                          <p className="text-xs text-gray-400">Observe how light intensity and carbon dioxide affect photosynthesis rate in pondweed (Elodea).</p>
                        </div>
                        <button
                          onClick={() => {
                            setSimLight(60);
                            setSimCO2(50);
                          }}
                          className="bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1 text-slate-700 transition-all cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Reset Parameters
                        </button>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Controls Panel */}
                        <div className="space-y-6 bg-[#FAF6EE]/50 p-6 rounded-3xl border border-gray-100/80">
                          <h5 className="font-bold text-xs text-gray-500 uppercase tracking-wider">Parameters</h5>
                          
                          {/* Slider 1: Light Intensity */}
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs font-semibold text-slate-700">
                              <span className="flex items-center gap-1.5">
                                <FaSun className="w-3.5 h-3.5 text-amber-500" /> Light Intensity
                              </span>
                              <span className="font-mono text-[#D69B67]">{simLight}%</span>
                            </div>
                            <input
                              type="range"
                              min="10"
                              max="100"
                              value={simLight}
                              onChange={(e) => setSimLight(Number(e.target.value))}
                              className="w-full accent-emerald-600 cursor-pointer"
                            />
                          </div>

                          {/* Slider 2: Carbon Dioxide level */}
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs font-semibold text-slate-700">
                              <span className="flex items-center gap-1.5">
                                <FaCloud className="w-3.5 h-3.5 text-sky-500" /> Carbon Dioxide (CO₂)
                              </span>
                              <span className="font-mono text-[#D69B67]">{simCO2}%</span>
                            </div>
                            <input
                              type="range"
                              min="10"
                              max="100"
                              value={simCO2}
                              onChange={(e) => setSimCO2(Number(e.target.value))}
                              className="w-full accent-emerald-600 cursor-pointer"
                            />
                          </div>

                          {/* Simulator Reading */}
                          <div className="bg-[#FAF6EE] p-4 rounded-2xl border border-gray-100 space-y-2">
                            <p className="text-xs font-bold text-slate-700">Live Readings:</p>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-gray-400 block">Oxygen Bubbles:</span>
                                <p className="font-bold text-emerald-600 font-mono text-base">{bubbleCount} / min</p>
                              </div>
                              <div>
                                <span className="text-gray-400 block">Glucose synthesis:</span>
                                <p className="font-bold text-sky-600 font-mono text-base">{glucoseSpeed}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Simulation Visual Display */}
                        <div className="lg:col-span-2 bg-[#15223F] rounded-3xl p-6 flex flex-col justify-between text-white min-h-[300px] relative overflow-hidden shadow-inner">
                          <div className="relative z-10">
                            <h6 className="text-[10px] font-mono text-white/50 uppercase tracking-widest">SIMULATION GLASS CHAMBER</h6>
                            <p className="text-xs text-white/80 mt-1">Elodea water plant synthesizing oxygen bubbles under custom parameters</p>
                          </div>

                          {/* Animated Water Graphic with plant and bubble floating! */}
                          <div className="h-48 w-full bg-gradient-to-t from-[#1E3A5F] to-[#254F7F]/60 rounded-2xl mt-4 relative flex items-center justify-center border border-white/10 overflow-hidden">
                            {/* Sun light shine overlay based on simLight */}
                            <div
                              className="absolute inset-0 bg-yellow-400/20 pointer-events-none transition-all duration-300"
                              style={{ opacity: simLight / 200 }}
                            />

                            {/* Simulated Plant Drawing */}
                            <div className="absolute bottom-0 w-16 h-36 flex flex-col justify-end items-center">
                              <div className="w-1.5 h-full bg-emerald-500 rounded-full relative shadow-md">
                                {/* Leaves */}
                                <div className="absolute left-1.5 bottom-8 w-6 h-3 bg-emerald-400 rounded-full rotate-12" />
                                <div className="absolute -left-6 bottom-14 w-6 h-3 bg-emerald-400 rounded-full -rotate-12" />
                                <div className="absolute left-1.5 bottom-20 w-6 h-3 bg-emerald-400 rounded-full rotate-12" />
                                <div className="absolute -left-6 bottom-24 w-6 h-3 bg-emerald-400 rounded-full -rotate-12" />
                                <div className="absolute left-1.5 bottom-28 w-5 h-2.5 bg-emerald-300 rounded-full rotate-12" />
                                <div className="absolute -left-5 bottom-32 w-5 h-2.5 bg-emerald-300 rounded-full -rotate-12" />
                              </div>
                            </div>

                            {/* Render Floating Bubble Dots dynamically matching bubbleCount! */}
                            <div className="absolute inset-x-0 bottom-0 top-6 overflow-hidden pointer-events-none">
                              {Array.from({ length: Math.min(bubbleCount, 15) }).map((_, bIdx) => {
                                const delay = (bIdx * 0.4).toFixed(1);
                                const leftPct = (40 + (bIdx * 4) % 20).toFixed(0);
                                return (
                                  <div
                                    key={bIdx}
                                    className="absolute w-2.5 h-2.5 bg-sky-200/40 rounded-full border border-white/50 animate-bounce"
                                    style={{
                                      left: `${leftPct}%`,
                                      bottom: `${(bIdx * 10) % 80}%`,
                                      animation: `floatUp ${1.5 + (bIdx % 2)}s infinite ease-in-out`,
                                      animationDelay: `${delay}s`,
                                    }}
                                  />
                                );
                              })}
                            </div>
                          </div>

                          <div className="text-[10px] text-white/40 mt-4 leading-normal flex items-center gap-1.5">
                            Observations: Bubble emission rate correlates directly with Light Intensity and CO₂ concentration.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ----------------- 2. CHEMISTRY: ACID-BASE TITRATION ----------------- */}
                  {activeSim === "chemistry" && (() => {
                    // Calculate pH dynamically
                    const getTitrationPH = (vol: number) => {
                      if (vol < 25) {
                        const excessH = 2.5 - 0.1 * vol;
                        const totalVol = 25 + vol;
                        const concH = excessH / totalVol;
                        return Math.max(1.0, -Math.log10(concH));
                      } else if (vol === 25) {
                        return 7.0;
                      } else {
                        const excessOH = 0.1 * vol - 2.5;
                        const totalVol = 25 + vol;
                        const concOH = excessOH / totalVol;
                        const pOH = -Math.log10(concOH);
                        return Math.min(13.0, 14.0 - pOH);
                      }
                    };

                    const pH = getTitrationPH(titVol);

                    // Colors based on indicator
                    let liquidColorClass = "bg-sky-100/40"; // neutral light water
                    let colorName = "Colorless";

                    if (titIndicator === "phenolphthalein") {
                      if (pH < 8.2) {
                        liquidColorClass = "bg-[#FAF6EE]/20";
                        colorName = "Colorless";
                      } else if (pH >= 8.2 && pH < 9.5) {
                        liquidColorClass = "bg-[#F472B6]/40";
                        colorName = "Light Pink";
                      } else {
                        liquidColorClass = "bg-pink-600/70";
                        colorName = "Dark Magenta";
                      }
                    } else if (titIndicator === "methylOrange") {
                      if (pH < 3.1) {
                        liquidColorClass = "bg-rose-600/70";
                        colorName = "Red";
                      } else if (pH >= 3.1 && pH < 4.4) {
                        liquidColorClass = "bg-orange-400/70";
                        colorName = "Orange";
                      } else {
                        liquidColorClass = "bg-amber-400/60";
                        colorName = "Yellow";
                      }
                    }

                    return (
                      <div className="space-y-6 animate-fade-in">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                          <div>
                            <h4 className="text-lg font-serif font-bold text-[#15223F]">
                              Acid-Base Titration Simulator
                            </h4>
                            <p className="text-xs text-gray-400">Titrate 25 mL of 0.1M HCl (Acid) with 0.1M NaOH (Base) and monitor pH change and color transitions.</p>
                          </div>
                          <button
                            onClick={() => setTitVol(0)}
                            className="bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1 text-slate-700 transition-all cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Reset Titration
                          </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                          {/* Left Panel: Lab Controls & Indicator Options */}
                          <div className="space-y-6 bg-[#FAF6EE]/50 p-6 rounded-3xl border border-gray-100">
                            <h5 className="font-bold text-xs text-gray-500 uppercase tracking-wider">Indicator Choice</h5>
                            
                            {/* Indicator Selector */}
                            <div className="grid grid-cols-1 gap-2">
                              {[
                                { id: "phenolphthalein", label: "Phenolphthalein" },
                                { id: "methylOrange", label: "Methyl Orange" },
                                { id: "none", label: "No Indicator (None)" }
                              ].map((ind) => (
                                <button
                                  key={ind.id}
                                  onClick={() => setTitIndicator(ind.id as any)}
                                  className={`px-4 py-2.5 rounded-xl text-xs font-bold text-left transition-all flex items-center justify-between border ${
                                    titIndicator === ind.id
                                      ? "bg-amber-100/80 text-amber-900 border-amber-300"
                                      : "bg-white text-slate-600 border-slate-100 hover:bg-slate-50"
                                  }`}
                                >
                                  <span>{ind.label}</span>
                                  {titIndicator === ind.id && <FaCheck className="text-amber-700 text-xs font-bold" />}
                                </button>
                              ))}
                            </div>

                            {/* Titration volume slider */}
                            <div className="space-y-2 border-t border-gray-200/60 pt-4">
                              <div className="flex justify-between text-xs font-semibold text-slate-700">
                                <span className="flex items-center gap-1.5">
                                  <FaDroplet className="w-3.5 h-3.5 text-sky-500" /> NaOH Volume Added
                                </span>
                                <span className="font-mono text-amber-700 font-bold">{titVol.toFixed(1)} mL</span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="50"
                                step="0.1"
                                value={titVol}
                                onChange={(e) => setTitVol(Number(e.target.value))}
                                className="w-full accent-amber-600 cursor-pointer"
                              />
                            </div>

                            {/* Drop-by-drop fine control buttons! */}
                            <div className="flex gap-2">
                              <button
                                onClick={() => setTitVol((v) => Math.max(0, parseFloat((v - 0.1).toFixed(1))))}
                                disabled={titVol <= 0}
                                className="flex-1 bg-white hover:bg-slate-50 border border-gray-200 py-2 rounded-xl text-xs font-bold text-slate-600 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                              >
                                -0.1 mL
                              </button>
                              <button
                                onClick={() => setTitVol((v) => Math.min(50, parseFloat((v + 0.1).toFixed(1))))}
                                disabled={titVol >= 50}
                                className="flex-1 bg-white hover:bg-slate-50 border border-gray-200 py-2 rounded-xl text-xs font-bold text-slate-600 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                              >
                                +0.1 mL (Drop)
                              </button>
                              <button
                                onClick={() => setTitVol((v) => Math.min(50, parseFloat((v + 1.0).toFixed(1))))}
                                disabled={titVol >= 50}
                                className="flex-1 bg-white hover:bg-slate-50 border border-gray-200 py-2 rounded-xl text-xs font-bold text-slate-600 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                              >
                                +1.0 mL
                              </button>
                            </div>

                            {/* Readings Box */}
                            <div className="bg-[#FAF6EE] p-4 rounded-2xl border border-gray-100 space-y-2">
                              <p className="text-xs font-bold text-slate-700">Digital pH Meter:</p>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="text-gray-400 block">pH Value:</span>
                                  <p className="font-bold text-slate-800 font-mono text-lg">{pH.toFixed(2)}</p>
                                </div>
                                <div>
                                  <span className="text-gray-400 block">Solution Color:</span>
                                  <p className="font-bold text-amber-700 font-mono text-base">{colorName}</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Right Display: Flask and Titration Setup */}
                          <div className="lg:col-span-2 bg-[#1E293B] rounded-3xl p-6 flex flex-col md:flex-row gap-6 justify-between text-white min-h-[350px] relative overflow-hidden">
                            {/* Glass setup visualization */}
                            <div className="flex-1 flex flex-col items-center relative border border-white/5 bg-slate-900/40 p-4 rounded-2xl">
                              <span className="text-[10px] text-white/50 font-mono block absolute top-2 left-2">APPARATUS ASSEMBLY</span>
                              
                              {/* Burette layout */}
                              <div className="flex flex-col items-center mt-6">
                                <div className="w-4 h-32 bg-slate-200/20 border-x-2 border-white/20 rounded-t relative flex flex-col justify-end">
                                  {/* Burette volume line indicators */}
                                  <div className="absolute inset-x-0 top-0 text-[7px] font-mono text-white/50 text-right pr-0.5 select-none space-y-3">
                                    <div>- 0</div>
                                    <div>- 10</div>
                                    <div>- 20</div>
                                    <div>- 30</div>
                                    <div>- 40</div>
                                    <div>- 50</div>
                                  </div>
                                  {/* Water level inside burette */}
                                  <div 
                                    className="w-full bg-sky-200/50 transition-all duration-300"
                                    style={{ height: `${Math.max(0, 100 - (titVol * 2))}%` }}
                                  />
                                </div>
                                {/* Burette tip / valve */}
                                <div className="w-1.5 h-6 bg-slate-300 relative flex items-center justify-center">
                                  <div className="w-5 h-2 bg-rose-500 rounded relative cursor-pointer" title="Stopcock Valve" />
                                </div>
                                {/* Dripping drops animated! */}
                                <div className="h-10 w-2 relative flex justify-center">
                                  {titVol > 0 && titVol < 50 && (
                                    <div className="w-1.5 h-1.5 bg-sky-200 rounded-full animate-ping absolute top-2" />
                                  )}
                                </div>
                              </div>

                              {/* Erlenmeyer Conical Flask */}
                              <div className="w-28 h-28 relative flex flex-col justify-end items-center">
                                {/* Flask SVG Shape */}
                                <svg viewBox="0 0 100 100" className="w-24 h-24 absolute inset-0 text-white" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M40 10 L60 10 M45 10 L45 35 L15 85 L85 85 L55 35 L55 10 Z" />
                                </svg>
                                {/* Liquid inside Erlenmeyer flask */}
                                <div className="w-16 h-10 bottom-1.5 absolute overflow-hidden rounded-b flex items-end">
                                  <div 
                                    className={`w-full transition-all duration-500 rounded-b ${liquidColorClass}`}
                                    style={{ height: `${20 + (titVol * 1.2)}px` }}
                                  />
                                </div>
                                {/* Flask Label */}
                                <span className="absolute -bottom-4 text-[9px] font-mono text-slate-400">Flask (HCl Acid)</span>
                              </div>
                            </div>

                            {/* pH graph plot */}
                            <div className="w-full md:w-60 flex flex-col justify-between border border-white/5 bg-slate-900/40 p-4 rounded-2xl">
                              <div className="space-y-1">
                                <span className="text-[10px] text-white/50 font-mono block">PH VS BASE ADDED</span>
                                <p className="text-[11px] text-slate-300">Equivalence point occurs at exactly 25.0 mL where pH jumps rapidly to 7.0.</p>
                              </div>

                              {/* Interactive spark pH curve drawing */}
                              <div className="h-32 w-full border-b border-l border-white/20 mt-4 relative">
                                {/* pH 7 guideline */}
                                <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-white/10 flex justify-end">
                                  <span className="text-[7px] text-white/40 pr-1 -mt-2">pH 7.0</span>
                                </div>

                                {/* Curve drawing */}
                                <svg viewBox="0 0 100 50" className="w-full h-full text-amber-500 overflow-visible" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M 0 45 C 30 45, 45 45, 50 25 C 55 5, 70 5, 100 5" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" />
                                  {/* Current point pointer */}
                                  <circle 
                                    cx={titVol * 2} 
                                    cy={45 - (pH - 1) * 3.3} 
                                    r="4" 
                                    fill="#D69B67" 
                                    className="animate-pulse"
                                  />
                                </svg>

                                <div className="absolute bottom-1 right-1 text-[8px] font-mono text-white/30">
                                  50 mL →
                                </div>
                                <div className="absolute top-1 left-1 text-[8px] font-mono text-white/30">
                                  pH 14
                                </div>
                              </div>

                              <div className="text-[10px] text-amber-100/60 mt-4 leading-normal font-medium">
                                Notice how a single drop near 25.0 mL changes the solution's properties completely!
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* ----------------- 3. PHYSICS: OHM'S LAW CIRCUIT SIMULATOR ----------------- */}
                  {activeSim === "physics" && (
                    <div className="space-y-6 animate-fade-in">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                          <h4 className="text-lg font-serif font-bold text-[#15223F]">
                            Ohm's Law & Circuit Builder
                          </h4>
                          <p className="text-xs text-gray-400">Modify voltage and resistance to inspect live Current (I = V/R) and watch the light bulb glow.</p>
                        </div>
                        <button
                          onClick={() => {
                            setPhysVolt(6.0);
                            setPhysRes(100);
                          }}
                          className="bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1 text-slate-700 transition-all cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Reset Circuit
                        </button>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Control Panel */}
                        <div className="space-y-6 bg-[#FAF6EE]/50 p-6 rounded-3xl border border-gray-100">
                          <h5 className="font-bold text-xs text-gray-500 uppercase tracking-wider">Circuit Adjustments</h5>

                          {/* Voltage Slider */}
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs font-semibold text-slate-700">
                              <span className="flex items-center gap-1.5">
                                <FaBatteryFull className="w-3.5 h-3.5 text-emerald-500" /> Source Voltage (V)
                              </span>
                              <span className="font-mono text-sky-700 font-bold">{physVolt.toFixed(1)} Volts</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="12"
                              step="0.5"
                              value={physVolt}
                              onChange={(e) => setPhysVolt(Number(e.target.value))}
                              className="w-full accent-sky-600 cursor-pointer"
                            />
                          </div>

                          {/* Resistance Slider */}
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs font-semibold text-slate-700">
                              <span className="flex items-center gap-1.5">
                                <FaPlug className="w-3.5 h-3.5 text-sky-500" /> Resistor Value (R)
                              </span>
                              <span className="font-mono text-sky-700 font-bold">{physRes} Ohms (Ω)</span>
                            </div>
                            <input
                              type="range"
                              min="10"
                              max="500"
                              step="10"
                              value={physRes}
                              onChange={(e) => setPhysRes(Number(e.target.value))}
                              className="w-full accent-sky-600 cursor-pointer"
                            />
                          </div>

                          {/* Digital readouts */}
                          <div className="bg-[#FAF6EE] p-4 rounded-2xl border border-gray-100 space-y-2.5">
                            <p className="text-xs font-bold text-slate-700">Circuit Measurements:</p>
                            
                            {/* Current formula helper */}
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-gray-400 block">Current (I = V/R):</span>
                                <p className="font-bold text-sky-600 font-mono text-lg">
                                  {((physVolt / physRes) * 1000).toFixed(1)} mA
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-400 block">Total Power (P = V*I):</span>
                                <p className="font-bold text-[#D69B67] font-mono text-lg">
                                  {(physVolt * (physVolt / physRes)).toFixed(2)} W
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Visual Display Container */}
                        <div className="lg:col-span-2 bg-slate-900 rounded-3xl p-6 flex flex-col justify-between text-white min-h-[300px] relative overflow-hidden">
                          <div className="relative z-10 flex justify-between items-center">
                            <div>
                              <h6 className="text-[10px] font-mono text-white/50 uppercase tracking-widest">LIVE CIRCUIT SCHEMATIC</h6>
                              <p className="text-xs text-white/80 mt-1">Flowing electrons animated relative to calculated Current (I)</p>
                            </div>
                          </div>

                          {/* Circuit Schematic Area */}
                          <div className="h-44 w-full bg-slate-950 rounded-2xl border border-white/5 mt-4 relative flex items-center justify-center p-4">
                            {/* SVG Wires Connecting Components */}
                            <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                              <rect x="15%" y="25%" width="70%" height="50%" fill="none" stroke="#475569" strokeWidth="3" rx="8" />
                            </svg>

                            {/* FLOWING ELECTRON DOTS ANIMATION */}
                            {physVolt > 0 && (
                              <div className="absolute inset-0 pointer-events-none">
                                {Array.from({ length: 6 }).map((_, eIdx) => {
                                  // Compute animation duration proportional to current
                                  const currentAmt = physVolt / physRes;
                                  const speed = Math.max(0.6, 6 - currentAmt * 100).toFixed(1);
                                  const delay = (eIdx * 1.0).toFixed(1);

                                  return (
                                    <div
                                      key={eIdx}
                                      className="absolute w-2 h-2 bg-yellow-400 rounded-full shadow-[0_0_8px_rgba(250,204,21,1)]"
                                      style={{
                                        animation: `circuitFlow ${speed}s infinite linear`,
                                        animationDelay: `${delay}s`,
                                      }}
                                    />
                                  );
                                })}
                              </div>
                            )}

                            {/* Component 1: Battery (Left) */}
                            <div className="absolute left-[12%] bg-slate-800 border-2 border-slate-600 px-3 py-2 rounded-xl flex flex-col items-center shadow-md">
                              <FaBatteryFull className="text-xl text-emerald-400" />
                              <span className="text-[8px] font-mono font-bold mt-1 text-slate-300">BATTERY</span>
                              <span className="text-[9px] font-mono text-sky-400 font-bold">{physVolt.toFixed(1)} V</span>
                            </div>

                            {/* Component 2: Resistor (Top) */}
                            <div className="absolute top-[12%] bg-slate-800 border-2 border-slate-600 px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-md">
                              <FaPlug className="text-xs text-sky-400" />
                              <div className="text-left">
                                <span className="text-[7px] font-mono font-bold block text-slate-400">RESISTOR</span>
                                <span className="text-[9px] font-mono text-sky-400 font-bold">{physRes} Ω</span>
                              </div>
                            </div>

                            {/* Component 3: Glowing Light Bulb (Right) */}
                            <div className="absolute right-[12%] flex flex-col items-center">
                              {/* Light bulb wrapper with dynamic yellow drop-shadow glow matching Power! */}
                              <div 
                                className="w-12 h-12 bg-slate-800 border-2 border-slate-600 rounded-full flex items-center justify-center relative transition-shadow duration-300"
                                style={{
                                  boxShadow: physVolt > 0 
                                    ? `0 0 ${Math.min(40, (physVolt * physVolt / physRes) * 80)}px rgba(253, 224, 71, 0.9)` 
                                    : "none"
                                }}
                              >
                                <FaLightbulb className="text-xl text-amber-300 relative z-10" />
                                {physVolt > 0 && (
                                  <div className="absolute inset-0 bg-yellow-300/30 rounded-full animate-pulse pointer-events-none" />
                                )}
                              </div>
                              <span className="text-[8px] font-mono font-bold mt-1 text-slate-300">BULB</span>
                              <span className="text-[9px] font-mono text-yellow-300 font-bold">
                                {((physVolt * physVolt) / physRes).toFixed(2)} W
                              </span>
                            </div>
                          </div>

                          <div className="text-[10px] text-white/40 mt-4 leading-normal flex items-center gap-1.5">
                            Observations: Higher voltage increases current, while higher resistance limits it. Light bulb brightness is directly proportional to power.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 5.5: SCHOOL TIMETABLE VIEW FOR STUDENTS */}
          {activeTab === "timetable" && (
            <div className="space-y-8 animate-fade-in text-left">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200/60 pb-5">
                <div>
                  <span className="text-[11px] font-mono tracking-widest text-[#D69B67] uppercase font-bold block">
                    ACADEMIC SCHEDULE & LIVE BROADCAST
                  </span>
                  <h3 className="text-3xl font-serif text-[#15223F] font-bold tracking-tight">
                    Weekly School Timetable
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Scheduled periods for school days (Monday – Friday). Check live lesson status and join live interactive broadcasts in real time!
                  </p>
                </div>

                <div className="bg-amber-100 text-[#15223F] px-4 py-2 rounded-2xl font-bold text-xs flex items-center gap-2 border border-amber-200">
                  <GraduationCap className="w-4 h-4 text-[#D69B67]" />
                  <span>Class: {studentProfile.studyLevel || "Form 1A"}</span>
                </div>
              </div>

              {/* REAL-TIME ACTIVE LIVE LESSON BANNER */}
              {liveSession?.isActive ? (
                <div className="bg-gradient-to-r from-rose-900 via-rose-800 to-amber-900 text-white p-5 rounded-3xl shadow-lg border border-rose-500/30 flex flex-col md:flex-row items-center justify-between gap-4 animate-pulse">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center font-bold text-lg shadow-md shrink-0">
                      <Video className="w-6 h-6 animate-bounce" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="bg-rose-500 text-white text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                          <FaCircleDot className="w-2.5 h-2.5 text-white animate-pulse" /> LIVE BROADCAST NOW
                        </span>
                        <span className="text-xs text-amber-200 font-bold">{liveSession.targetClass}</span>
                      </div>
                      <h4 className="font-serif font-bold text-xl text-white mt-1">
                        {liveSession.subject}: {liveSession.topic}
                      </h4>
                      <p className="text-xs text-rose-100 mt-0.5">
                        Taught by {liveSession.teacherName} · Interactive whiteboard & audio live stream active
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveTab("classroom")}
                    className="bg-amber-400 hover:bg-amber-300 text-[#15223F] font-bold text-xs px-6 py-3 rounded-2xl shadow-md transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap"
                  >
                    <FaVideo className="w-4 h-4 text-[#15223F]" />
                    <span>Join Live Classroom</span>
                  </button>
                </div>
              ) : (
                <div className="bg-slate-100 border border-slate-200 text-slate-600 p-4 rounded-2xl text-xs font-semibold flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                    <span>No active live broadcast stream at this exact moment. View scheduled periods below.</span>
                  </div>
                  <span className="font-mono text-[10px] bg-slate-200 px-2 py-0.5 rounded-md">STATUS: NOT LIVE</span>
                </div>
              )}

              {/* Day Filter Pills */}
              <div className="flex flex-wrap items-center gap-2.5 bg-white p-3 rounded-2xl border border-gray-100 shadow-2xs">
                <span className="text-xs font-bold text-slate-600 flex items-center gap-1 pl-2">
                  <Calendar className="w-4 h-4 text-[#D69B67]" /> Select Day:
                </span>
                {["All", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map((d) => (
                  <button
                    key={d}
                    onClick={() => setTimetableSelectedDay(d)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      timetableSelectedDay === d
                        ? "bg-[#15223F] text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>

              {/* Timetable Cards Grouped by Days */}
              {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].filter((d) => timetableSelectedDay === "All" || timetableSelectedDay === d).map((day) => {
                const studLevel = (studentProfile.studyLevel || "").toLowerCase().trim();
                const levelNumMatch = studLevel.match(/form\s*(\d)/i);
                const formNum = levelNumMatch ? levelNumMatch[1] : "";

                const daySessions = timetableList.filter((s) => {
                  if (s.day !== day) return false;
                  const sessionClass = (s.className || "").toLowerCase();
                  if (sessionClass.includes(studLevel) || studLevel.includes(sessionClass)) return true;
                  if (formNum && (sessionClass.includes(`form ${formNum}`) || sessionClass.includes(`form${formNum}`))) return true;
                  if (sessionClass.includes("all")) return true;
                  return true; // show all periods to student so they see full timetable
                });

                if (daySessions.length === 0) return null;

                return (
                  <div key={day} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-2xs space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-amber-100 text-[#15223F] font-bold text-xs flex items-center justify-center">
                          <Calendar className="w-4 h-4 text-[#D69B67]" />
                        </div>
                        <h4 className="font-serif font-bold text-lg text-[#15223F]">{day}</h4>
                      </div>
                      <span className="text-xs font-mono text-gray-500 font-bold bg-slate-100 px-3 py-1 rounded-xl">
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
                                  className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full font-mono uppercase tracking-wider inline-flex items-center gap-1 ${
                                    isLiveMatching
                                      ? "bg-rose-500 text-white animate-pulse"
                                      : session.status === "Accepted"
                                      ? "bg-blue-600 text-white"
                                      : session.status === "Completed"
                                      ? "bg-emerald-600 text-white"
                                      : "bg-slate-200 text-slate-700"
                                  }`}
                                >
                                  {isLiveMatching ? (
                                    <>
                                      <FaCircleDot className="w-2 h-2 text-white animate-pulse" /> LIVE NOW
                                    </>
                                  ) : session.status === "In Progress" ? "In Progress" : `Scheduled (${session.status})`}
                                </span>
                              </div>

                              <div>
                                <h5 className="font-bold text-sm text-[#15223F] flex items-center justify-between">
                                  <span>{session.subject}</span>
                                  <span className="bg-amber-100 text-[#15223F] text-[10px] font-mono px-2 py-0.5 rounded-md font-bold">
                                    {session.className}
                                  </span>
                                </h5>
                                <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                                  <User className="w-3.5 h-3.5 text-gray-400" /> {session.teacherName} {session.room && `· ${session.room}`}
                                </p>
                              </div>
                            </div>

                            {/* Student Live Join Shortcut */}
                            <div className="pt-2 border-t border-gray-200/50">
                              {isLiveMatching ? (
                                <button
                                  onClick={() => setActiveTab("classroom")}
                                  className="w-full bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white font-bold text-xs py-2 px-3 rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer animate-pulse"
                                >
                                  <FaVideo className="w-3.5 h-3.5" /> Join Live Lesson Now
                                </button>
                              ) : session.status === "Completed" ? (
                                <div className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1 justify-center bg-emerald-100/60 py-1.5 rounded-xl">
                                  <FaCircleCheck className="w-3.5 h-3.5 text-emerald-600" /> Lesson completed
                                </div>
                              ) : (
                                <div className="text-[11px] font-medium text-slate-500 text-center py-1 bg-slate-50 rounded-xl flex items-center justify-center gap-1">
                                  <FaClock className="w-3 h-3 text-slate-400" /> Upcoming Scheduled Period
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

          {/* TAB 6: MY PROGRESS (Screenshot 6) */}
          {activeTab === "progress" && (
            <div className="space-y-8 animate-fade-in text-left">
              {/* Title & Download Button */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[11px] font-mono tracking-widest text-[#D69B67] uppercase font-bold block">
                    MY PROGRESS
                  </span>
                  <h3 className="text-3xl font-serif text-[#15223F] font-bold tracking-tight">
                    Learning report
                  </h3>
                </div>

                <button
                  onClick={() => alert("Simulating Report PDF Download... Your learning report is prepared perfectly!")}
                  className="bg-[#15223F] hover:bg-[#1E293B] text-white font-bold text-xs py-3.5 px-6 rounded-2xl transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center gap-2 cursor-pointer"
                >
                  Download PDF
                </button>
              </div>

              {/* 2 Stats Grid */}
              <div className="grid grid-cols-2 gap-4">

                {/* Quizzes */}
                <div className="bg-gradient-to-br from-white to-slate-50/40 p-6 rounded-[2rem] border-2 border-[#15223F]/5 shadow-sm space-y-1 hover:shadow-md hover:scale-[1.01] transition-all duration-300">
                  <span className="text-[10px] font-mono text-gray-400 tracking-wider uppercase font-bold flex items-center gap-1.5">
                    <FaCheck className="w-3 h-3 text-emerald-500" /> Quizzes
                  </span>
                  <p className="text-3xl font-serif font-bold text-[#15223F]">{isNewUser ? 0 : 38}</p>
                </div>

                {/* Topics */}
                <div className="bg-gradient-to-br from-white to-slate-50/40 p-6 rounded-[2rem] border-2 border-[#15223F]/5 shadow-sm space-y-1 hover:shadow-md hover:scale-[1.01] transition-all duration-300">
                  <span className="text-[10px] font-mono text-gray-400 tracking-wider uppercase font-bold flex items-center gap-1.5">
                    <FaBookOpen className="w-3 h-3 text-[#D69B67]" /> Topics
                  </span>
                  <p className="text-3xl font-serif font-bold text-[#15223F]">{isNewUser ? 0 : 24}</p>
                </div>

              </div>

              {/* Two Column Layout: Chart & Subject Mastery */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* 1. Bar Chart "This week" (Minutes studied per day) */}
                <div className="bg-white p-8 rounded-[2.5rem] border-2 border-[#15223F]/5 shadow-md space-y-4">
                  <div className="space-y-0.5 text-left">
                    <h4 className="font-bold text-[#15223F] text-sm">This week</h4>
                    <p className="text-xs text-gray-400">Minutes studied per day</p>
                  </div>

                  <div className="h-60 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={studyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                        <Tooltip cursor={{ fill: "#FAF6EE" }} contentStyle={{ fontSize: "11px", borderRadius: "12px" }} />
                        <Bar dataKey="minutes" radius={[6, 6, 0, 0]}>
                          {studyData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.active ? "#D69B67" : "#CBD5E1"} // Saturday is active orange, others are grey
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 2. Subject Mastery */}
                <div className="bg-white p-8 rounded-[2.5rem] border-2 border-[#15223F]/5 shadow-md space-y-5">
                  <div className="space-y-0.5 text-left">
                    <h4 className="font-bold text-[#15223F] text-sm">Subject mastery</h4>
                    <p className="text-xs text-gray-400">Based on quiz performances & workbook completion</p>
                  </div>

                  <div className="space-y-4 text-left">
                    {practiceSubjects.map((subj, index) => {
                      let color = "bg-rose-500";
                      if (subj.progress > 75) color = "bg-emerald-500";
                      else if (subj.progress > 50) color = "bg-sky-500";
                      else if (subj.progress > 25) color = "bg-[#D69B67]";
                      return (
                        <div key={index} className="space-y-1">
                          <div className="flex justify-between text-xs font-bold text-slate-700">
                            <span>{subj.name}</span>
                            <span className="font-mono">{subj.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${color}`} style={{ width: `${subj.progress}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* 3. Live Class Performance & Process History Log */}
              <div className="bg-white p-8 rounded-[2.5rem] border-2 border-[#15223F]/5 shadow-md space-y-6">
                <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                  <div>
                    <h4 className="font-bold text-[#15223F] text-base">Live Class & Process Tracker</h4>
                    <p className="text-xs text-gray-400">Detailed records of live participation, quiz accuracy, and study process history.</p>
                  </div>
                  <span className="bg-amber-100 text-[#15223F] text-xs font-mono font-bold px-3 py-1 rounded-full">
                    {studentXP} XP EARNED
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-[#FAF6EE] p-5 rounded-2xl border border-amber-100 space-y-1">
                    <span className="text-[10px] font-mono font-bold text-gray-500 uppercase">Live Class Attendance</span>
                    <p className="text-2xl font-serif font-bold text-[#15223F]">14 / 15 Sessions</p>
                    <p className="text-[10px] text-emerald-700 font-bold">93% Attendance Rate</p>
                  </div>
                  <div className="bg-emerald-50/60 p-5 rounded-2xl border border-emerald-100 space-y-1">
                    <span className="text-[10px] font-mono font-bold text-emerald-800 uppercase">Live Quiz Accuracy</span>
                    <p className="text-2xl font-serif font-bold text-emerald-900">92% Correct</p>
                    <p className="text-[10px] text-emerald-700 font-bold">Visible to Teacher in Real-Time</p>
                  </div>
                  <div className="bg-sky-50/60 p-5 rounded-2xl border border-sky-100 space-y-1">
                    <span className="text-[10px] font-mono font-bold text-sky-800 uppercase">Active Study Streak</span>
                    <p className="text-2xl font-serif font-bold text-sky-950">{streak} Days</p>
                    <p className="text-[10px] text-sky-700 font-bold">Keep learning daily!</p>
                  </div>
                </div>

                {/* Process Milestones Timeline */}
                <div className="space-y-3">
                  <h5 className="font-mono text-[11px] font-bold text-[#D69B67] uppercase tracking-wider">Recent Process & Learning Milestones</h5>
                  <div className="space-y-2">
                    {[
                      { title: "Photosynthesis Live Class Quiz", desc: "Submitted correct answer to Mwalimu Juma in Live Classroom", badge: "+50 XP", time: "Today", status: "Verified" },
                      { title: "Physics Lab: Ohm's Law Experiment", desc: "Simulated voltage, current & resistance circuit bulb glow", badge: "Lab Completed", time: "Yesterday", status: "100% Score" },
                      { title: "Chemistry Workbook Chapter 2", desc: "Completed Periodic Table NECTA practice questions", badge: "Workbook Done", time: "2 days ago", status: "Passed" },
                    ].map((item, mIdx) => (
                      <div key={mIdx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="space-y-0.5">
                          <p className="font-bold text-xs text-slate-800">{item.title}</p>
                          <p className="text-[11px] text-slate-500">{item.desc}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="bg-[#15223F] text-white text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg">
                            {item.badge}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">{item.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* 4. Edit Profile Details Modal Overlay */}
      {showEditModal && (
        <div 
          id="edit-profile-modal-backdrop"
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in p-4"
        >
          <div 
            id="edit-profile-modal-card"
            className="bg-white max-w-lg w-full rounded-[2.5rem] p-6 md:p-8 border-2 border-[#15223F]/5 shadow-2xl space-y-6 text-left relative"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-[#D69B67]">
                  <FaUser className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-[#15223F] text-lg">Edit Profile Details</h4>
                  <p className="text-xs text-gray-400">Update your student information.</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1 bg-[#FAF6EE] p-3 rounded-2xl border border-gray-100">
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block">FIRST NAME</label>
                  <input
                    type="text"
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    className="w-full bg-transparent border-none text-xs text-[#15223F] focus:outline-none font-bold py-0.5 font-sans"
                  />
                </div>

                <div className="space-y-1 bg-[#FAF6EE] p-3 rounded-2xl border border-gray-100">
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block">LAST NAME</label>
                  <input
                    type="text"
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    className="w-full bg-transparent border-none text-xs text-[#15223F] focus:outline-none font-bold py-0.5 font-sans"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1 bg-[#FAF6EE] p-3 rounded-2xl border border-gray-100">
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block">EMAIL ADDRESS</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-transparent border-none text-xs text-[#15223F] focus:outline-none font-bold py-0.5 font-sans"
                  />
                </div>

                <div className="space-y-1 bg-[#FAF6EE] p-3 rounded-2xl border border-gray-100">
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block">PHONE CONTACT</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full bg-transparent border-none text-xs text-[#15223F] focus:outline-none font-bold py-0.5 font-sans"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1 bg-[#FAF6EE] p-3 rounded-2xl border border-gray-100">
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block">STUDY LEVEL</label>
                  <select
                    value={editStudyLevel}
                    onChange={(e) => setEditStudyLevel(e.target.value)}
                    className="w-full bg-transparent border-none text-xs text-[#15223F] focus:outline-none font-bold py-0.5 font-sans"
                  >
                    <option value="Form 1">Form 1</option>
                    <option value="Form 2">Form 2</option>
                    <option value="Form 3">Form 3</option>
                    <option value="Form 4">Form 4</option>
                  </select>
                </div>

                <div className="space-y-1 bg-[#FAF6EE] p-3 rounded-2xl border border-gray-100">
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block">CURRICULUM</label>
                  <input
                    type="text"
                    value={editCurriculum}
                    onChange={(e) => setEditCurriculum(e.target.value)}
                    className="w-full bg-transparent border-none text-xs text-[#15223F] focus:outline-none font-bold py-0.5 font-sans"
                  />
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-5 py-3 rounded-xl border border-gray-200 text-xs font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!editFirstName.trim() || !editLastName.trim() || !editEmail.trim()) {
                    alert("First Name, Last Name, and Email are required.");
                    return;
                  }
                  if (onUpdateProfile) {
                    onUpdateProfile({
                      firstName: editFirstName.trim(),
                      lastName: editLastName.trim(),
                      email: editEmail.trim(),
                      phone: editPhone.trim(),
                      studyLevel: editStudyLevel,
                      curriculum: editCurriculum.trim()
                    });
                  }
                  setShowEditModal(false);
                  alert("Profile updated successfully!");
                }}
                className="bg-[#15223F] hover:bg-[#0E1729] text-[#D69B67] font-bold py-3 px-6 rounded-xl text-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REAL-TIME TEMPLATED MATERIAL POPUP VIEWER */}
      {selectedMaterial && (
        <div className="fixed inset-0 bg-[#15223F]/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in text-left">
          <div className="bg-white rounded-[2rem] border border-gray-100 max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            
            {/* Header section with theme gradient */}
            <div className="p-6 bg-gradient-to-r from-[#15223F] to-[#253966] text-white flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-[#D69B67]/20 border border-[#D69B67]/30 text-[#D69B67] text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider font-mono">
                    {selectedMaterial.subject}
                  </span>
                  <span className="bg-white/10 text-amber-200 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider font-mono">
                    {selectedMaterial.templateType === "quiz" ? "Study Guide" : selectedMaterial.templateType === "practical" ? "Practical Guide" : selectedMaterial.templateType === "cheat_sheet" ? "Cheat Sheet" : "Lesson Notes"}
                  </span>
                </div>
                <h4 className="text-xl md:text-2xl font-serif font-bold tracking-tight mt-2 text-white">{selectedMaterial.title}</h4>
                <p className="text-xs text-white/60 mt-1">Shared with {selectedMaterial.classes} · Auto-arranged real-time template</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadMaterial(selectedMaterial)}
                  className="px-3.5 py-1.5 bg-[#D69B67] hover:bg-[#c48a58] text-[#15223F] font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <FaDownload className="w-3.5 h-3.5" /> Download File
                </button>
                <button
                  onClick={() => setSelectedMaterial(null)}
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition-all flex items-center justify-center text-white text-base font-bold cursor-pointer"
                >
                  <FaXmark className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Sub-navigation Tabs */}
            <div className="flex border-b border-gray-100 bg-[#FAF6EE] px-6 py-2 gap-2">
              {[
                { id: "content", label: "Structured Content" },
                { id: "summary", label: "Key Summary & TL;DR" },
                { id: "quiz", label: `Practice Quiz (${selectedMaterial.quizQuestions?.length || 0})` }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setMaterialSubTab(tab.id as any)}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    materialSubTab === tab.id
                      ? "bg-[#15223F] text-white"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content Display Body */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
              
              {/* TAB 1: Structured Content */}
              {materialSubTab === "content" && (
                <div className="space-y-6">
                  {/* Specialized template decorations */}
                  {selectedMaterial.templateType === "practical" && (
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200/60 text-amber-900 text-xs flex gap-2.5">
                      <div>
                        <p className="font-bold">LAB SAFETY PROTOCOL ACTIVE</p>
                        <p className="opacity-90 mt-0.5">Please ensure standard apparatus handling procedures and check the materials list before performing any physical simulation.</p>
                      </div>
                    </div>
                  )}

                  {selectedMaterial.templateType === "cheat_sheet" && (
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200/60 text-emerald-900 text-xs flex gap-2.5">
                      <div>
                        <p className="font-bold">HIGH-YIELD REVISION SHEET</p>
                        <p className="opacity-90 mt-0.5">This cheat sheet isolates core formulas and critical exam definitions for immediate active retention.</p>
                      </div>
                    </div>
                  )}

                  {/* Render arranged sections */}
                  {selectedMaterial.arrangedContent?.sections && selectedMaterial.arrangedContent.sections.length > 0 ? (
                    selectedMaterial.arrangedContent.sections.map((sect: any, sIdx: number) => (
                      <div key={sIdx} className="space-y-3.5 pb-5 border-b border-gray-100 last:border-0">
                        <h5 className="font-bold text-[#15223F] text-sm md:text-base flex items-center gap-2">
                          <span className="text-[#D69B67] font-mono">#{sIdx + 1}</span>
                          {sect.heading}
                        </h5>
                        <div className="space-y-2">
                          {sect.paragraphs ? (
                            sect.paragraphs.map((para: string, pIdx: number) => (
                              <p key={pIdx} className="text-slate-600 text-xs md:text-sm leading-relaxed font-normal whitespace-pre-line">
                                {para}
                              </p>
                            ))
                          ) : sect.body ? (
                            sect.body.split(/\n+/).map((para: string, pIdx: number) => (
                              <p key={pIdx} className="text-slate-600 text-xs md:text-sm leading-relaxed font-normal whitespace-pre-line">
                                {para}
                              </p>
                            ))
                          ) : null}
                        </div>
                      </div>
                    ))
                  ) : (
                    /* Fallback to raw text if not yet arranged */
                    <div className="space-y-3">
                      <h5 className="font-bold text-slate-800 text-sm uppercase font-mono">Raw Study Notes</h5>
                      <p className="text-xs md:text-sm text-slate-600 leading-relaxed whitespace-pre-line">{selectedMaterial.rawText || "No content provided."}</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: Key Summary & TL;DR */}
              {materialSubTab === "summary" && (
                <div className="space-y-6">
                  <div className="bg-[#FAF6EE] p-6 rounded-3xl border border-gray-150">
                    <h5 className="font-bold text-[#15223F] text-sm uppercase tracking-wider mb-2 font-mono flex items-center gap-1.5">
                      Summary Outline
                    </h5>
                    <p className="text-slate-600 text-xs md:text-sm leading-relaxed whitespace-pre-line">
                      {selectedMaterial.arrangedContent?.summary || "Summary generation is being processed. View structured sections for immediate reading."}
                    </p>
                  </div>

                  {selectedMaterial.arrangedContent?.keyPoints && selectedMaterial.arrangedContent.keyPoints.length > 0 && (
                    <div className="space-y-3">
                      <h5 className="font-bold text-[#15223F] text-sm uppercase tracking-wider font-mono font-serif">Key Takeaways</h5>
                      <div className="grid grid-cols-1 gap-2.5">
                        {selectedMaterial.arrangedContent.keyPoints.map((point: string, pIdx: number) => (
                          <div key={pIdx} className="flex gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 items-start">
                            <FaCheck className="w-3.5 h-3.5 text-[#D69B67] shrink-0 mt-0.5" />
                            <p className="text-xs md:text-sm text-slate-700 leading-relaxed font-medium">{point}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: Practice Quiz */}
              {materialSubTab === "quiz" && (
                <div className="space-y-6">
                  {selectedMaterial.quizQuestions && selectedMaterial.quizQuestions.length > 0 ? (
                    <div className="space-y-6">
                      {selectedMaterial.quizQuestions.map((q: any, qIdx: number) => {
                        const selectedAnswer = quizAnswers[qIdx];
                        const correctIdx = q.correctIndex !== undefined ? q.correctIndex : q.correctAnswer;
                        const isCorrect = selectedAnswer === correctIdx;
                        return (
                          <div key={qIdx} className="bg-slate-50 p-5 rounded-3xl border border-slate-100 space-y-4">
                            <div className="flex items-start justify-between gap-2">
                              <h5 className="font-bold text-slate-800 text-xs md:text-sm">
                                <span className="text-[#D69B67] font-mono mr-1">Q{qIdx + 1}.</span> {q.question}
                              </h5>
                              {quizSubmitted && (
                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase font-mono flex items-center gap-1 ${
                                  isCorrect ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"
                                }`}>
                                  {isCorrect ? (
                                    <>
                                      <FaCheck className="text-xs text-emerald-700" /> Correct
                                    </>
                                  ) : (
                                    <>
                                      <FaXmark className="text-xs text-red-700" /> Incorrect
                                    </>
                                  )}
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-1 gap-2">
                              {q.options.map((opt: string, oIdx: number) => {
                                const isSelected = selectedAnswer === oIdx;
                                return (
                                  <button
                                    key={oIdx}
                                    type="button"
                                    disabled={quizSubmitted}
                                    onClick={() => setQuizAnswers(prev => ({ ...prev, [qIdx]: oIdx }))}
                                    className={`w-full text-left p-3.5 rounded-xl text-xs md:text-sm transition-all border font-medium flex items-center justify-between cursor-pointer ${
                                      isSelected
                                        ? "bg-[#15223F] text-[#D69B67] border-[#15223F]"
                                        : "bg-white text-slate-700 border-slate-150 hover:bg-slate-100"
                                    }`}
                                  >
                                    <span>{opt}</span>
                                    {isSelected && <span className="text-amber-300">●</span>}
                                  </button>
                                );
                              })}
                            </div>

                            {quizSubmitted && !isCorrect && (
                              <p className="text-[11px] text-slate-500 font-medium bg-white p-3 rounded-xl border border-slate-150 font-sans">
                                <strong className="text-slate-700">Correct Answer:</strong> {q.options[correctIdx]}
                              </p>
                            )}
                          </div>
                        );
                      })}

                      {/* Quiz validation bar */}
                      <div className="pt-4 border-t border-gray-150 flex items-center justify-between">
                        {!quizSubmitted ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (Object.keys(quizAnswers).length < selectedMaterial.quizQuestions.length) {
                                alert("Please answer all practice questions before submitting.");
                                return;
                              }
                              setQuizSubmitted(true);
                              let correctCount = 0;
                              selectedMaterial.quizQuestions.forEach((q: any, qIdx: number) => {
                                const correctIdx = q.correctIndex !== undefined ? q.correctIndex : q.correctAnswer;
                                if (quizAnswers[qIdx] === correctIdx) correctCount++;
                              });
                              const xpAwarded = correctCount * 10;
                              setStudentXP(xp => xp + xpAwarded);
                              setStudentLevelProgress(prog => Math.min(100, prog + Math.round(xpAwarded / 10)));
                              if (selectedMaterial.subject) {
                                updateSubjectProgress(selectedMaterial.subject, 10, `Completed study quiz for "${selectedMaterial.title}"`);
                              }
                              alert(`Finished study quiz! You scored ${correctCount}/${selectedMaterial.quizQuestions.length} and earned +${xpAwarded} XP!`);
                            }}
                            className="bg-[#D69B67] hover:bg-[#C88A58] text-white font-bold py-3 px-8 rounded-xl text-xs transition-all cursor-pointer shadow-sm flex items-center gap-2"
                          >
                            <FaCheck className="w-3.5 h-3.5" /> Submit Study Quiz
                          </button>
                        ) : (
                          <div className="flex items-center gap-3 w-full justify-between">
                            <span className="text-xs text-slate-500 font-semibold font-mono">
                              SCORE: {Object.keys(quizAnswers).filter(k => {
                                const item = selectedMaterial.quizQuestions[Number(k)] as any;
                                const correctIdx = item.correctIndex !== undefined ? item.correctIndex : item.correctAnswer;
                                return quizAnswers[Number(k)] === correctIdx;
                              }).length} / {selectedMaterial.quizQuestions.length}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setQuizAnswers({});
                                setQuizSubmitted(false);
                              }}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-6 rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5"
                            >
                              <FaRotateRight className="w-3.5 h-3.5" /> Retry Quiz
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200 space-y-2">
                      <FaPuzzlePiece className="w-8 h-8 mx-auto text-slate-400" />
                      <p className="font-bold text-slate-700 text-sm mt-3">No questions found</p>
                      <p className="text-xs text-slate-400 mt-0.5">Baraka generates interactive study questions once materials are uploaded.</p>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* 🔔 LIVE CLASS SESSION INCOMING NOTIFICATION POPUP */}
      {(() => {
        const levelText = (studentProfile?.studyLevel || "Form 1").toLowerCase().trim();
        const targetText = (liveSession?.targetClass || "All Classes").toLowerCase().trim();
        const isTargetedForStudent = 
          liveSession?.isActive && (
            targetText === "all classes" ||
            targetText === "all" ||
            targetText.includes(levelText) ||
            levelText.includes(targetText) ||
            (levelText.includes("form 1") && targetText.includes("form 1")) ||
            (levelText.includes("form 2") && targetText.includes("form 2")) ||
            (levelText.includes("form 3") && targetText.includes("form 3")) ||
            (levelText.includes("form 4") && targetText.includes("form 4")) ||
            (levelText.includes("form 5") && targetText.includes("form 5")) ||
            (levelText.includes("form 6") && targetText.includes("form 6"))
          );

        if (isTargetedForStudent && !isInsideLiveClass && !hasDismissedNotification) {
          return (
            <div className="fixed bottom-6 right-6 md:right-8 bg-gradient-to-br from-[#15223F] to-[#0E1729] text-white p-5 rounded-[2rem] border-2 border-[#D69B67]/30 shadow-2xl z-50 max-w-sm w-full animate-fade-in flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                  </span>
                  <span className="text-[10px] font-mono tracking-widest text-[#D69B67] uppercase font-bold">
                    Teacher is Online!
                  </span>
                </div>
                <button
                  onClick={() => setHasDismissedNotification(true)}
                  className="text-white/40 hover:text-white transition-colors p-1 hover:bg-white/5 rounded-lg cursor-pointer"
                  title="Dismiss notification"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1 text-left">
                <h5 className="font-serif font-bold text-base text-slate-100">
                  {liveSession.teacherName} started a live {liveSession.subject} session!
                </h5>
                <p className="text-xs text-white/70 font-semibold leading-snug">
                  Topic: <span className="text-[#D69B67] font-bold">"{liveSession.topic}"</span>
                </p>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-[10px] bg-white/10 text-white/90 px-2.5 py-1 rounded-full font-mono font-bold flex items-center gap-1.5">
                    <FaBullseye className="text-[#D69B67] text-xs" /> Target: {liveSession.targetClass || "All Classes"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                <button
                  onClick={() => {
                    setIsInsideLiveClass(true);
                    setActiveTab("dashboard");
                    setHasDismissedNotification(true);
                  }}
                  className="flex-1 bg-[#D69B67] hover:bg-[#c28a59] text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer text-center flex items-center justify-center gap-1.5"
                >
                  <FaVideo className="w-3.5 h-3.5" /> Join Class Session
                </button>
                <button
                  onClick={() => setHasDismissedNotification(true)}
                  className="px-3 py-2.5 text-white/60 hover:text-white text-xs font-bold transition-all hover:bg-white/5 rounded-xl cursor-pointer"
                >
                  Maybe Later
                </button>
              </div>
            </div>
          );
        }
        return null;
      })()}

      {/* REAL-TIME DYNAMIC STUDY TRACKER TOAST OVERLAY */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#15223F] text-white py-4 px-6 rounded-2xl shadow-2xl flex items-center gap-3.5 border border-white/10 animate-fade-in-up max-w-sm">
          <div className="w-8 h-8 bg-[#D69B67] rounded-full flex items-center justify-center text-sm shrink-0 shadow-sm animate-pulse">
            <FaBoltLightning className="w-4 h-4 text-white" />
          </div>
          <div className="text-left flex-1 min-w-0">
            <p className="text-[10px] font-mono tracking-wider uppercase text-[#D69B67] font-bold">Real-time Progress Tracker</p>
            <p className="text-xs font-semibold leading-relaxed text-slate-100 truncate">{toast.message}</p>
          </div>
          <button
            onClick={() => setToast(null)}
            className="text-white/40 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Styled inline animation helpers */}
      <style>{`
        @keyframes floatUp {
          0% {
            transform: translateY(0) scale(0.8);
            opacity: 0;
          }
          10% {
            opacity: 0.6;
          }
          90% {
            opacity: 0.6;
          }
          100% {
            transform: translateY(-130px) scale(1.1);
            opacity: 0;
          }
        }
        @keyframes circuitFlow {
          0% {
            left: 15%;
            top: 25%;
          }
          25% {
            left: 85%;
            top: 25%;
          }
          50% {
            left: 85%;
            top: 75%;
          }
          75% {
            left: 15%;
            top: 75%;
          }
          100% {
            left: 15%;
            top: 25%;
          }
        }
      `}</style>
    </div>
  );
}
