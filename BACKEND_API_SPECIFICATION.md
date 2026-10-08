# TBF School Hub - Complete Backend API & Database Specification
**Version:** 2.0.0 (Production Release)  
**System:** TBF School Hub & Interactive Live Learning Platform  
**Target Backend Framework:** Express.js / Node.js (or FastAPI / NestJS / Django / Spring Boot)  
**Production Remote URL:** `https://schubapi.thebarakafoundation.or.tz/api/v1`  
**Database Support:** PostgreSQL / MySQL (Relational) or MongoDB / Firebase Firestore (NoSQL)

---

## 📋 Table of Contents
1. [System Architecture & Overview](#1-system-architecture--overview)
2. [Complete Database Schema (PostgreSQL DDL)](#2-complete-database-schema-postgresql-ddl)
3. [Authentication & User Management APIs](#3-authentication--user-management-apis)
4. [AI Study Companion & Smart Material Arranging APIs](#4-ai-study-companion--smart-material-arranging-apis)
5. [Timetable & Scheduling APIs](#5-timetable--scheduling-apis)
6. [Live Class Broadcast & Studio Studio APIs](#6-live-class-broadcast--studio-studio-apis)
7. [Teachers & Staff Management APIs](#7-teachers--staff-management-apis)
8. [Students & Attendance Management APIs](#8-students--attendance-management-apis)
9. [Classes & Streams Management APIs](#9-classes--streams-management-apis)
10. [Homework & Submissions APIs](#10-homework--submissions-apis)
11. [Study Materials & Library APIs](#11-study-materials--library-apis)
12. [Gamification, Streaks & Student Progress APIs](#12-gamification-streaks--student-progress-apis)
13. [Notifications & Alerts APIs](#13-notifications--alerts-apis)
14. [Real-time Events (WebSockets / SSE)](#14-real-time-events-websockets--sse)
15. [System Health & Environment Configuration](#15-system-health--environment-configuration)

---

## 1. System Architecture & Overview

The TBF School Hub platform supports three primary user categories:
1. **School Administrators / Headmasters:** Manage school profile, classes, teachers, timetable scheduling, overall attendance, and institutional analytics.
2. **Teachers / Instructors:** Deliver live broadcast lessons with real-time interactive blackboards & quizzes, upload arranged notes, schedule timetable periods, mark attendance, and assign homework.
3. **Students & Solo Learners:** Attend live interactive classes, converse with the Baraka AI Study Companion (fluent in English & Kiswahili), study NECTA-aligned materials, earn XP/streaks, and submit homework.

---

## 2. Complete Database Schema (PostgreSQL DDL)

```sql
-- 1. Enums
CREATE TYPE user_role AS ENUM ('admin', 'school_admin', 'teacher', 'student', 'parent');
CREATE TYPE account_type AS ENUM ('school_linked', 'solo_learner');
CREATE TYPE timetable_status AS ENUM ('Upcoming', 'Accepted', 'In Progress', 'Completed', 'Cancelled');
CREATE TYPE day_of_week AS ENUM ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday');
CREATE TYPE homework_status AS ENUM ('Submitted', 'Graded', 'Late');

-- 2. Schools Table
CREATE TABLE schools (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    registration_number VARCHAR(100) UNIQUE NOT NULL,
    region VARCHAR(100) NOT NULL,
    school_type VARCHAR(50) DEFAULT 'Secondary',
    headmaster_name VARCHAR(255),
    verification_status VARCHAR(50) DEFAULT 'verified',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Users Table (Core Auth)
CREATE TABLE users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    fname VARCHAR(100) NOT NULL,
    lname VARCHAR(100) DEFAULT '',
    role user_role NOT NULL DEFAULT 'student',
    account_type account_type DEFAULT 'school_linked',
    school_id VARCHAR(64) REFERENCES schools(id) ON DELETE SET NULL,
    phone VARCHAR(50),
    photo_url VARCHAR(512),
    study_level VARCHAR(50), -- e.g. "Form 1", "Form 2", "Form 3", "Form 4"
    curriculum VARCHAR(100) DEFAULT 'Tanzania National (NECTA)',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Classes Table
CREATE TABLE classes (
    id VARCHAR(64) PRIMARY KEY,
    school_id VARCHAR(64) REFERENCES schools(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL, -- e.g. "Form 1A"
    teacher_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    teacher_name VARCHAR(255),
    subjects TEXT, -- Comma separated e.g. "Biology, Mathematics, Geography, Kiswahili"
    avg_score NUMERIC(5,2) DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Teachers Profile Table
CREATE TABLE teachers (
    id VARCHAR(64) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    subjects TEXT NOT NULL, -- e.g. "Biology, Chemistry"
    assigned_class VARCHAR(50), -- e.g. "Form 1A"
    status VARCHAR(50) DEFAULT 'Active', -- "Active", "Pending", "Invited"
    school_id VARCHAR(64) REFERENCES schools(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Students Profile & Gamification Table
CREATE TABLE students (
    id VARCHAR(64) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    reg_no VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    class_name VARCHAR(50) NOT NULL,
    school_id VARCHAR(64) REFERENCES schools(id) ON DELETE SET NULL,
    age INT DEFAULT 14,
    gender VARCHAR(10) DEFAULT 'M',
    parent_contact VARCHAR(50),
    progress INT DEFAULT 0, -- 0 to 100%
    xp INT DEFAULT 0,
    streak INT DEFAULT 0,
    level_progress INT DEFAULT 0,
    earned_badges INT DEFAULT 0,
    last_active VARCHAR(50) DEFAULT 'Today',
    subject_progress JSONB DEFAULT '{"Kiswahili":0,"Biology":0,"Geography":0,"Mathematics":0,"English":0,"Physics":0}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Timetable Sessions Table
CREATE TABLE timetable_sessions (
    id VARCHAR(64) PRIMARY KEY,
    school_id VARCHAR(64) REFERENCES schools(id) ON DELETE CASCADE,
    day day_of_week NOT NULL,
    time_slot VARCHAR(100) NOT NULL, -- e.g. "08:00 AM - 08:40 AM"
    period_index INT DEFAULT 1,
    subject VARCHAR(100) NOT NULL,
    class_name VARCHAR(50) NOT NULL,
    teacher_name VARCHAR(255) NOT NULL,
    teacher_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    room VARCHAR(100) DEFAULT 'Classroom 1',
    status timetable_status DEFAULT 'Upcoming',
    accepted_by_teacher BOOLEAN DEFAULT FALSE,
    notes TEXT,
    completed_at VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Live Sessions Table (Active Streaming & Studio)
CREATE TABLE live_sessions (
    id VARCHAR(64) PRIMARY KEY,
    school_id VARCHAR(64) REFERENCES schools(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    subject VARCHAR(100) NOT NULL,
    topic VARCHAR(255) NOT NULL,
    teacher_name VARCHAR(255) NOT NULL,
    target_class VARCHAR(50) NOT NULL,
    whiteboard_text TEXT,
    presentation_active BOOLEAN DEFAULT FALSE,
    presentation_type VARCHAR(50) DEFAULT 'slide',
    presentation_title VARCHAR(255),
    presentation_slide_index INT DEFAULT 0,
    presentation_slides JSONB DEFAULT '[]'::jsonb,
    all_students_muted BOOLEAN DEFAULT FALSE,
    active_quiz JSONB,
    attendance JSONB DEFAULT '{}'::jsonb,
    muted_students JSONB DEFAULT '{}'::jsonb,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE
);

-- 9. Learning Materials Table
CREATE TABLE materials (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    classes VARCHAR(100) NOT NULL, -- e.g. "Form 1, Form 2" or "All Form Levels"
    uploaded_at VARCHAR(100) NOT NULL,
    uploaded_by VARCHAR(255) NOT NULL,
    is_teacher_upload BOOLEAN DEFAULT TRUE,
    visibility VARCHAR(20) DEFAULT 'public', -- 'public' or 'personal'
    template_type VARCHAR(50) DEFAULT 'notes', -- 'notes', 'quiz', 'practical', 'cheat_sheet'
    arranged_content JSONB NOT NULL,
    quiz_questions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Homework Table
CREATE TABLE homework (
    id VARCHAR(64) PRIMARY KEY,
    school_id VARCHAR(64) REFERENCES schools(id) ON DELETE CASCADE,
    subject VARCHAR(100) NOT NULL,
    class_name VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date VARCHAR(50) NOT NULL,
    total_points INT DEFAULT 100,
    teacher_name VARCHAR(255) NOT NULL,
    teacher_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Homework Submissions Table
CREATE TABLE homework_submissions (
    id VARCHAR(64) PRIMARY KEY,
    homework_id VARCHAR(64) REFERENCES homework(id) ON DELETE CASCADE,
    student_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    student_name VARCHAR(255) NOT NULL,
    submission_text TEXT,
    file_url VARCHAR(512),
    score INT,
    feedback TEXT,
    status homework_status DEFAULT 'Submitted',
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Attendance Records Table
CREATE TABLE attendance_records (
    id VARCHAR(64) PRIMARY KEY,
    school_id VARCHAR(64) REFERENCES schools(id) ON DELETE CASCADE,
    class_name VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    student_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    student_reg VARCHAR(50) NOT NULL,
    student_name VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Present', -- 'Present', 'Absent', 'Late'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. Notifications Table
CREATE TABLE notifications (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    recipient_name VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'timetable_assignment', 'live_broadcast_start', 'homework', 'general'
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 3. Authentication & User Management APIs

### 3.1 User Login
- **Method & Route:** `POST /api/v1/auth/login`
- **Request Body:**
```json
{
  "email": "mwalimu@school.ac.tz",
  "password": "teacherPassword123"
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "usr_948fha9",
    "email": "mwalimu@school.ac.tz",
    "fname": "Mwalimu",
    "lname": "Juma",
    "role": "teacher",
    "photo_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
    "school_id": "sch_10283",
    "created_at": "2026-08-20T10:00:00.000Z"
  }
}
```

---

### 3.2 School Registration
- **Method & Route:** `POST /api/v1/auth/register/school`
- **Request Body:**
```json
{
  "fname": "Leonardo",
  "lname": "Arthur",
  "email": "admin@barakaschool.edu.tz",
  "password": "secureAdminPassword",
  "school_name": "Baraka Secondary School",
  "registration_number": "MoE/SEC/2026/042",
  "region": "Dar es Salaam",
  "school_type": "Secondary",
  "headmaster_name": "Leonardo Arthur",
  "verification_document_name": "registration_certificate.pdf"
}
```
- **Response (201 Created):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 86400,
  "user": {
    "id": "usr_admn102",
    "email": "admin@barakaschool.edu.tz",
    "fname": "Leonardo",
    "lname": "Arthur",
    "role": "school_admin"
  },
  "school": {
    "id": "sch_baraka_01",
    "name": "Baraka Secondary School",
    "registration_number": "MoE/SEC/2026/042",
    "region": "Dar es Salaam",
    "verification_status": "verified"
  }
}
```

---

### 3.3 Solo Learner Registration
- **Method & Route:** `POST /api/v1/auth/register/solo` (alias: `POST /api/v1/auth/register/learner`)
- **Request Body:**
```json
{
  "fname": "Amani",
  "lname": "Baraka",
  "email": "amani@email.com",
  "password": "studentPassword123",
  "phone": "+255 711 333 444",
  "study_level": "Form 1",
  "curriculum": "Tanzania National (NECTA)",
  "photo_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
}
```
- **Response (201 Created):**
```json
{
  "success": true,
  "message": "Solo learner registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "solo_837dfa1",
    "fname": "Amani",
    "lname": "Baraka",
    "email": "amani@email.com",
    "phone": "+255 711 333 444",
    "study_level": "Form 1",
    "curriculum": "Tanzania National (NECTA)",
    "role": "student",
    "account_type": "solo_learner",
    "created_at": "2026-08-20T10:00:00.000Z"
  }
}
```

---

### 3.4 Get Current Authenticated User (`/auth/me`)
- **Method & Route:** `GET /api/v1/auth/me`
- **Headers:** `Authorization: Bearer <JWT_TOKEN>`
- **Response (200 OK):**
```json
{
  "id": "usr_948fha9",
  "email": "mwalimu@school.ac.tz",
  "fname": "Mwalimu",
  "lname": "Juma",
  "role": "teacher",
  "photo_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
}
```

---

### 3.5 Send Email Verification Code
- **Method & Route:** `POST /api/v1/send-verification-email`
- **Request Body:**
```json
{
  "email": "user@example.com",
  "code": "482910",
  "name": "Amani Baraka"
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Verification code email sent successfully"
}
```

---

## 4. AI Study Companion & Smart Material Arranging APIs

### 4.1 Ask Baraka AI
- **Method & Route:** `POST /api/v1/ai/ask` (alias: `POST /api/ask-baraka`)
- **Request Body:**
```json
{
  "message": "Explain photosynthesis and its chemical equation",
  "history": [
    { "sender": "user", "text": "Habari Baraka!" },
    { "sender": "ai", "text": "Marahaba! How can I assist your studies today?" }
  ]
}
```
- **Response (200 OK):**
```json
{
  "text": "# Photosynthesis (Uundaji wa Chakula kwenye Majani) 🌿☀️\n\n> **Photosynthesis** is the process by which green plants use sunlight, carbon dioxide, and water to synthesize glucose and release oxygen.\n\n```\n6CO₂ + 6H₂O + Sunlight ➔ C₆H₁₂O₆ + 6O₂\n```",
  "source": "gemini",
  "knowledge_sources": [
    "NECTA Secondary Curriculum Guidelines",
    "Tanzania Institute of Education (TIE) Textbooks",
    "Baraka Education AI Knowledge Base"
  ]
}
```

---

### 4.2 Auto-Arrange Study Material & Quizzes
- **Method & Route:** `POST /api/v1/arrange-material`
- **Request Body:**
```json
{
  "title": "NECTA Biology Photosynthesis Revision",
  "subject": "Biology",
  "templateType": "notes", // "notes", "quiz", "practical", "cheat_sheet"
  "rawText": "Photosynthesis is the process by which plants make food using sunlight..."
}
```
- **Response (200 OK):**
```json
{
  "arrangedContent": {
    "introduction": "Habari! Let's explore photosynthesis in detail.",
    "sections": [
      {
        "heading": "1. Light Dependent Reactions",
        "body": "Occurs in thylakoids where water is split into hydrogen ions and oxygen."
      }
    ],
    "summary": "Master the difference between light and dark reactions for NECTA.",
    "keyPoints": ["Chlorophyll absorbs light", "Photolysis releases Oxygen"]
  },
  "quizQuestions": [
    {
      "id": "q-1",
      "question": "Where do the light reactions occur?",
      "options": ["Thylakoid membrane", "Stroma", "Nucleus", "Ribosome"],
      "correctAnswer": 0,
      "explanation": "Light reactions take place in the thylakoid membranes of chloroplasts."
    }
  ]
}
```

---

## 5. Timetable & Scheduling APIs

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/timetable` | Query sessions (params: `day`, `className`, `teacherName`) |
| `POST` | `/api/v1/timetable` | Create new period & automatically trigger teacher notification |
| `PATCH` | `/api/v1/timetable/:id/accept` | Teacher accepts assigned period slot |
| `PATCH` | `/api/v1/timetable/:id/cancel` | Cancel session |
| `PATCH` | `/api/v1/timetable/:id/complete` | Mark session completed with time |
| `DELETE` | `/api/v1/timetable/:id` | Delete timetable slot |

---

## 6. Live Class Broadcast & Studio Studio APIs

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/live-sessions/active` (or `/api/live-session`) | Fetch currently running live class |
| `POST` | `/api/v1/live-sessions/start` (or `POST /api/live-session`) | Broadcast/Start live stream session |
| `POST` | `/api/v1/live-sessions/end` | Stop & complete live class |
| `PUT` | `/api/v1/live-sessions/whiteboard` | Update live blackboard/whiteboard notes |
| `POST` | `/api/v1/live-sessions/quiz` | Teacher launches active pop-quiz/poll |
| `POST` | `/api/v1/live-sessions/quiz/submit` | Student submits answer for active quiz |
| `GET` | `/api/live-session/stream` | Server-Sent Events (SSE) stream for live sync |

---

## 7. Teachers & Staff Management APIs

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/teachers` | List all teachers with subjects & status |
| `POST` | `/api/v1/teachers` | Add/Invite new teacher |
| `PUT` | `/api/v1/teachers/:id` | Update teacher info & assigned classes |
| `DELETE` | `/api/v1/teachers/:id` | Deactivate/remove teacher |

---

## 8. Students & Attendance Management APIs

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/students` | List students (param: `className`, `search`) |
| `POST` | `/api/v1/students` | Register student into class |
| `PUT` | `/api/v1/students/:id` | Update student profile |
| `DELETE` | `/api/v1/students/:id` | Delete student record |
| `GET` | `/api/v1/attendance` | Query class attendance (params: `className`, `date`) |
| `POST` | `/api/v1/attendance` | Submit class attendance record array |

---

## 9. Classes & Streams Management APIs

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/classes` | List all school classes (e.g. Form 1A, Form 2B) |
| `POST` | `/api/v1/classes` | Create new class / stream |
| `PUT` | `/api/v1/classes/:id` | Update class teacher or subjects |
| `DELETE` | `/api/v1/classes/:id` | Delete class |

---

## 10. Homework & Submissions APIs

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/homework` | List homework assignments by class |
| `POST` | `/api/v1/homework` | Teacher posts homework assignment |
| `GET` | `/api/v1/homework/:id/submissions` | Teacher views all submitted answers |
| `POST` | `/api/v1/homework/submissions` | Student submits homework text or file |
| `PATCH` | `/api/v1/homework/submissions/:id/grade` | Teacher grades submission with score & feedback |

---

## 11. Study Materials & Library APIs

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/materials` | List public and private study materials |
| `POST` | `/api/v1/materials` | Save structured material with quizzes |
| `GET` | `/api/v1/materials/:id` | Retrieve material detail by ID |
| `DELETE` | `/api/v1/materials/:id` | Delete material |

---

## 12. Gamification, Streaks & Student Progress APIs

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/students/:id/progress` | Fetch student XP, streak, levels, badges |
| `POST` | `/api/v1/students/:id/progress` | Award XP, increment streak on task completion |

---

## 13. Notifications & Alerts APIs

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/notifications` | Fetch user notifications (param: `recipientTeacher`) |
| `PATCH` | `/api/v1/notifications/:id/read` | Mark notification as read |
| `POST` | `/api/v1/notifications` | Send direct or broadcast notification |

---

## 14. Real-time Events (WebSockets / SSE)

### WebSockets (`ws://<server-host>/ws/live-class`):
- `JOIN_ROOM`: `{ "room": "Form 1A", "role": "teacher" | "student" }`
- `UPDATE_WHITEBOARD`: `{ "whiteboardText": "..." }`
- `START_QUIZ`: `{ "question": "...", "options": [...] }`
- `MUTE_STUDENT`: `{ "studentName": "...", "muted": true }`

---

## 15. System Health & Environment Configuration

### Health Check:
- `GET /api/v1/health` -> `{ "status": "ok", "uptime": 12849, "timestamp": "2026-08-20T12:00:00.000Z" }`

### Environment Variables (`.env`):
```env
PORT=3000
NODE_ENV=production
DATABASE_URL=postgresql://user:password@localhost:5432/school_db
JWT_SECRET=your_jwt_super_secret_key_here
CORS_ORIGIN=http://localhost:3000
GEMINI_API_KEY=your_gemini_api_key_here
SMTP_HOST=smtp.yourmailserver.com
SMTP_PORT=587
SMTP_USER=no-reply@barakahub.edu.tz
SMTP_PASS=your_smtp_password
```
