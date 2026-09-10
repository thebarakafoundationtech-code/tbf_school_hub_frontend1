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
  { name: "Kiswahili", topicsCount: 9, progress: 0, iconName: "book" },
  { name: "Biology", topicsCount: 12, progress: 0, iconName: "dna" },
  { name: "Geography", topicsCount: 8, progress: 0, iconName: "globe" },
  { name: "Mathematics", topicsCount: 15, progress: 0, iconName: "calculator" },
  { name: "English", topicsCount: 10, progress: 0, iconName: "pen" },
  { name: "Physics", topicsCount: 11, progress: 0, iconName: "atom" },
];

export const initialLabVideos: LabVideo[] = [
  { subject: "Biology", title: "Photosynthesis: Full Lab Walkthrough", author: "Science with Baraka", duration: "14 min", category: "Biology" },
  { subject: "Chemistry", title: "Titration Lab — Acid-Base Reactions", author: "ChemLabAfrica", duration: "11 min", category: "Chemistry" },
  { subject: "Physics", title: "Simple Pendulum Experiment", author: "Physics Masomo", duration: "9 min", category: "Physics" },
];
