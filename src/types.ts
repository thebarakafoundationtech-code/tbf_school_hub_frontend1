export interface Student {
  name: string;
  regNo: string;
  class: string;
  age: number;
  gender: string;
  progress: number; // 0 - 100
  lastActive: string;
  parentContact?: string;
  email?: string;
  xp?: number;
  levelProgress?: number;
  earnedCount?: number;
  streak?: number;
  subjectProgress?: Record<string, number>;
  planItems?: any[];
}

export interface Teacher {
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  subjects: string;
  classes: string;
  status: "Active" | "Pending" | "Invited";
  password?: string;
  role?: "Admin" | "Normal";
}

export interface ClassInfo {
  id?: string;
  class_name?: string;
  name: string;
  teacher: string;
  studentsCount: number;
  avgScore: number;
  subjects: string;
}

export interface Material {
  id: string;
  title: string;
  subject: string;
  classes: string;
  uploadedAt: string;
  uploadedBy?: string;
  templateType?: string;
  rawText?: string;
  visibility?: "public" | "personal";
  arrangedContent?: {
    introduction?: string;
    sections?: { heading: string; body?: string; paragraphs?: string[] }[];
    summary?: string;
    keyPoints?: string[];
  };
  quizQuestions?: {
    id: string;
    question: string;
    options: string[];
    correctAnswer: number;
    explanation?: string;
  }[];
  isTeacherUpload?: boolean;
}

export interface TimetableSession {
  id: string;
  day: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday";
  timeSlot: string;
  periodIndex: number;
  subject: string;
  className: string;
  teacherName: string;
  room?: string;
  status: "Upcoming" | "Accepted" | "In Progress" | "Completed" | "Cancelled";
  acceptedByTeacher?: boolean;
  completedAt?: string;
  notes?: string;
}

export interface PracticeSubject {
  name: string;
  topicsCount: number;
  progress: number;
  iconName: string;
}

export interface LabVideo {
  subject: string;
  title: string;
  author: string;
  duration: string;
  category: "Biology" | "Chemistry" | "Physics";
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: "user" | "ai";
  timestamp: Date;
}

// Initial structured datasets (empty by default so all data reflects the live database)
export const initialStudents: Student[] = [];
export const initialTeachers: Teacher[] = [];
export const initialClasses: ClassInfo[] = [];
export const initialMaterials: Material[] = [];
export const initialTimetable: TimetableSession[] = [];

export const initialPracticeSubjects: PracticeSubject[] = [
  { name: "Mathematics", topicsCount: 15, progress: 0, iconName: "calculator" },
  { name: "English", topicsCount: 12, progress: 0, iconName: "pen" },
  { name: "Kiswahili", topicsCount: 12, progress: 0, iconName: "book" },
  { name: "Biology", topicsCount: 13, progress: 0, iconName: "dna" },
  { name: "Chemistry", topicsCount: 11, progress: 0, iconName: "flask" },
  { name: "Physics", topicsCount: 12, progress: 0, iconName: "atom" },
  { name: "Geography", topicsCount: 10, progress: 0, iconName: "globe" },
  { name: "History", topicsCount: 10, progress: 0, iconName: "landmark" },
  { name: "Civics", topicsCount: 9, progress: 0, iconName: "scale" },
];

export function getCurriculumPracticeSubjects(
  studyLevel: string = "Form 2",
  curriculum: string = "Tanzania National (NECTA)",
  enrolledSubjects?: string[] | string
): PracticeSubject[] {
  const normLevel = (studyLevel || "").toLowerCase();

  // 1. If custom enrolled subjects are explicitly provided for the student
  let customList: string[] = [];
  if (Array.isArray(enrolledSubjects)) {
    customList = enrolledSubjects.map(s => String(s).trim()).filter(Boolean);
  } else if (typeof enrolledSubjects === "string" && enrolledSubjects.trim()) {
    customList = enrolledSubjects.split(",").map(s => s.trim()).filter(Boolean);
  }

  if (customList.length > 0) {
    return customList.map(subj => {
      let topicsCount = 12;
      let icon = "book";
      const sLow = subj.toLowerCase();
      if (sLow.includes("math") || sLow.includes("hisabati")) { topicsCount = 16; icon = "calculator"; }
      else if (sLow.includes("bio")) { topicsCount = 14; icon = "dna"; }
      else if (sLow.includes("chem")) { topicsCount = 12; icon = "flask"; }
      else if (sLow.includes("phys")) { topicsCount = 13; icon = "atom"; }
      else if (sLow.includes("geo")) { topicsCount = 11; icon = "globe"; }
      else if (sLow.includes("hist")) { topicsCount = 11; icon = "landmark"; }
      else if (sLow.includes("civ")) { topicsCount = 9; icon = "scale"; }
      else if (sLow.includes("eng")) { topicsCount = 12; icon = "pen"; }
      else if (sLow.includes("kisw")) { topicsCount = 12; icon = "book"; }
      else if (sLow.includes("econ") || sLow.includes("comm")) { topicsCount = 10; icon = "coins"; }
      else if (sLow.includes("general studies") || sLow.includes("gs")) { topicsCount = 10; icon = "book"; }

      let progress = 0;
      try {
        const saved = localStorage.getItem(`tbf_quiz_prog_${studyLevel}_${subj}`);
        if (saved) progress = parseInt(saved, 10);
      } catch {}

      return {
        name: subj,
        topicsCount,
        progress,
        iconName: icon,
      };
    });
  }

  // 2. Secondary Form 1 (Kidato cha 1)
  if (normLevel.includes("form 1") || normLevel.includes("kidato cha 1") || normLevel.includes("form i\b") || normLevel.includes("form 1a") || normLevel.includes("form 1b") || normLevel.includes("form 1c")) {
    return [
      { name: "Mathematics", topicsCount: 14, progress: 0, iconName: "calculator" },
      { name: "English", topicsCount: 10, progress: 0, iconName: "pen" },
      { name: "Kiswahili", topicsCount: 10, progress: 0, iconName: "book" },
      { name: "Biology", topicsCount: 11, progress: 0, iconName: "dna" },
      { name: "Chemistry", topicsCount: 10, progress: 0, iconName: "flask" },
      { name: "Physics", topicsCount: 10, progress: 0, iconName: "atom" },
      { name: "Geography", topicsCount: 9, progress: 0, iconName: "globe" },
      { name: "History", topicsCount: 8, progress: 0, iconName: "landmark" },
      { name: "Civics", topicsCount: 8, progress: 0, iconName: "scale" },
    ];
  }

  // 3. Secondary Form 2 (Kidato cha 2 / FTNA Candidates)
  if (normLevel.includes("form 2") || normLevel.includes("kidato cha 2") || normLevel.includes("form ii\b") || normLevel.includes("form 2a") || normLevel.includes("form 2b") || normLevel.includes("form 2c") || normLevel.includes("ftna")) {
    return [
      { name: "Mathematics", topicsCount: 15, progress: 0, iconName: "calculator" },
      { name: "Biology", topicsCount: 13, progress: 0, iconName: "dna" },
      { name: "Chemistry", topicsCount: 11, progress: 0, iconName: "flask" },
      { name: "Physics", topicsCount: 12, progress: 0, iconName: "atom" },
      { name: "Geography", topicsCount: 10, progress: 0, iconName: "globe" },
      { name: "History", topicsCount: 10, progress: 0, iconName: "landmark" },
      { name: "English", topicsCount: 12, progress: 0, iconName: "pen" },
      { name: "Kiswahili", topicsCount: 12, progress: 0, iconName: "book" },
      { name: "Civics", topicsCount: 9, progress: 0, iconName: "scale" },
    ];
  }

  // 4. Secondary Form 3 (Kidato cha 3)
  if (normLevel.includes("form 3") || normLevel.includes("kidato cha 3") || normLevel.includes("form iii") || normLevel.includes("form 3a") || normLevel.includes("form 3b") || normLevel.includes("form 3c")) {
    return [
      { name: "Mathematics", topicsCount: 16, progress: 0, iconName: "calculator" },
      { name: "Biology", topicsCount: 15, progress: 0, iconName: "dna" },
      { name: "Chemistry", topicsCount: 14, progress: 0, iconName: "flask" },
      { name: "Physics", topicsCount: 14, progress: 0, iconName: "atom" },
      { name: "Geography", topicsCount: 12, progress: 0, iconName: "globe" },
      { name: "History", topicsCount: 12, progress: 0, iconName: "landmark" },
      { name: "English", topicsCount: 14, progress: 0, iconName: "pen" },
      { name: "Kiswahili", topicsCount: 14, progress: 0, iconName: "book" },
      { name: "Civics", topicsCount: 10, progress: 0, iconName: "scale" },
    ];
  }

  // 5. Secondary Form 4 (Kidato cha 4 - CSEE Candidates)
  if (normLevel.includes("form 4") || normLevel.includes("kidato cha 4") || normLevel.includes("form iv") || normLevel.includes("csee") || normLevel.includes("form 4a") || normLevel.includes("form 4b") || normLevel.includes("form 4c")) {
    return [
      { name: "Mathematics", topicsCount: 18, progress: 0, iconName: "calculator" },
      { name: "Biology", topicsCount: 16, progress: 0, iconName: "dna" },
      { name: "Chemistry", topicsCount: 16, progress: 0, iconName: "flask" },
      { name: "Physics", topicsCount: 16, progress: 0, iconName: "atom" },
      { name: "Geography", topicsCount: 14, progress: 0, iconName: "globe" },
      { name: "History", topicsCount: 14, progress: 0, iconName: "landmark" },
      { name: "English", topicsCount: 16, progress: 0, iconName: "pen" },
      { name: "Kiswahili", topicsCount: 15, progress: 0, iconName: "book" },
      { name: "Civics", topicsCount: 12, progress: 0, iconName: "scale" },
    ];
  }

  // 6. Advanced Level Form 5 & Form 6 (ACSEE)
  if (normLevel.includes("form 5") || normLevel.includes("form 6") || normLevel.includes("a-level") || normLevel.includes("acsee") || normLevel.includes("high school")) {
    if (normLevel.includes("pcm")) {
      return [
        { name: "Advanced Mathematics", topicsCount: 20, progress: 0, iconName: "calculator" },
        { name: "Physics", topicsCount: 18, progress: 0, iconName: "atom" },
        { name: "Chemistry", topicsCount: 18, progress: 0, iconName: "flask" },
        { name: "General Studies", topicsCount: 10, progress: 0, iconName: "book" },
      ];
    }
    if (normLevel.includes("pcb")) {
      return [
        { name: "Biology", topicsCount: 20, progress: 0, iconName: "dna" },
        { name: "Chemistry", topicsCount: 18, progress: 0, iconName: "flask" },
        { name: "Physics", topicsCount: 18, progress: 0, iconName: "atom" },
        { name: "Basic Applied Mathematics", topicsCount: 14, progress: 0, iconName: "calculator" },
        { name: "General Studies", topicsCount: 10, progress: 0, iconName: "book" },
      ];
    }
    if (normLevel.includes("cbg")) {
      return [
        { name: "Chemistry", topicsCount: 18, progress: 0, iconName: "flask" },
        { name: "Biology", topicsCount: 20, progress: 0, iconName: "dna" },
        { name: "Geography", topicsCount: 16, progress: 0, iconName: "globe" },
        { name: "Basic Applied Mathematics", topicsCount: 14, progress: 0, iconName: "calculator" },
        { name: "General Studies", topicsCount: 10, progress: 0, iconName: "book" },
      ];
    }
    if (normLevel.includes("hgl")) {
      return [
        { name: "History", topicsCount: 18, progress: 0, iconName: "landmark" },
        { name: "Geography", topicsCount: 16, progress: 0, iconName: "globe" },
        { name: "English Language", topicsCount: 16, progress: 0, iconName: "pen" },
        { name: "Basic Applied Mathematics", topicsCount: 14, progress: 0, iconName: "calculator" },
        { name: "General Studies", topicsCount: 10, progress: 0, iconName: "book" },
      ];
    }
    if (normLevel.includes("egm")) {
      return [
        { name: "Economics", topicsCount: 18, progress: 0, iconName: "coins" },
        { name: "Geography", topicsCount: 16, progress: 0, iconName: "globe" },
        { name: "Pure Mathematics", topicsCount: 18, progress: 0, iconName: "calculator" },
        { name: "General Studies", topicsCount: 10, progress: 0, iconName: "book" },
      ];
    }
    if (normLevel.includes("hkl")) {
      return [
        { name: "History", topicsCount: 18, progress: 0, iconName: "landmark" },
        { name: "Kiswahili", topicsCount: 16, progress: 0, iconName: "book" },
        { name: "English Language", topicsCount: 16, progress: 0, iconName: "pen" },
        { name: "General Studies", topicsCount: 10, progress: 0, iconName: "book" },
      ];
    }
    return [
      { name: "Advanced Mathematics", topicsCount: 20, progress: 0, iconName: "calculator" },
      { name: "Physics", topicsCount: 18, progress: 0, iconName: "atom" },
      { name: "Chemistry", topicsCount: 18, progress: 0, iconName: "flask" },
      { name: "Biology", topicsCount: 20, progress: 0, iconName: "dna" },
      { name: "Geography", topicsCount: 16, progress: 0, iconName: "globe" },
      { name: "History", topicsCount: 18, progress: 0, iconName: "landmark" },
      { name: "Economics", topicsCount: 16, progress: 0, iconName: "coins" },
      { name: "General Studies", topicsCount: 10, progress: 0, iconName: "book" },
    ];
  }

  // 7. Primary Level (Standard 5, 6, 7 / Darasa la 5, 6, 7)
  if (normLevel.includes("primary") || normLevel.includes("darasa") || normLevel.includes("standard") || normLevel.includes("std")) {
    return [
      { name: "Hisabati", topicsCount: 12, progress: 0, iconName: "calculator" },
      { name: "Sayansi na Teknolojia", topicsCount: 12, progress: 0, iconName: "flask" },
      { name: "Kiswahili", topicsCount: 10, progress: 0, iconName: "book" },
      { name: "English", topicsCount: 10, progress: 0, iconName: "pen" },
      { name: "Maarifa ya Jamii", topicsCount: 10, progress: 0, iconName: "landmark" },
      { name: "Uraia na Maadili", topicsCount: 8, progress: 0, iconName: "scale" },
    ];
  }

  // 8. Default Form 2 (Kidato cha 2 / FTNA Candidates)
  return [
    { name: "Mathematics", topicsCount: 15, progress: 0, iconName: "calculator" },
    { name: "English", topicsCount: 12, progress: 0, iconName: "pen" },
    { name: "Kiswahili", topicsCount: 12, progress: 0, iconName: "book" },
    { name: "Biology", topicsCount: 13, progress: 0, iconName: "dna" },
    { name: "Chemistry", topicsCount: 11, progress: 0, iconName: "flask" },
    { name: "Physics", topicsCount: 12, progress: 0, iconName: "atom" },
    { name: "Geography", topicsCount: 10, progress: 0, iconName: "globe" },
    { name: "History", topicsCount: 10, progress: 0, iconName: "landmark" },
    { name: "Civics", topicsCount: 9, progress: 0, iconName: "scale" },
  ];
}

export const initialLabVideos: LabVideo[] = [
  { subject: "Biology", title: "Photosynthesis: Full Lab Walkthrough", author: "Science with Baraka", duration: "14 min", category: "Biology" },
  { subject: "Chemistry", title: "Titration Lab — Acid-Base Reactions", author: "ChemLabAfrica", duration: "11 min", category: "Chemistry" },
  { subject: "Physics", title: "Simple Pendulum Experiment", author: "Physics Masomo", duration: "9 min", category: "Physics" },
];
