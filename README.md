<p align="center">
  <img src="public/logo.svg" alt="TBF School Hub Logo" width="130" height="130" />
</p>

<h1 align="center">TBF School Hub</h1>

<p align="center">
  <b>Official Educational Management Platform &amp; Digital Curriculum System for Tanzanian Institutions, Teachers, and Students</b>
</p>

<p align="center">
  <a href="#about-the-project">About</a> •
  <a href="#core-features">Key Features</a> •
  <a href="#curriculum-library">Curriculum Library</a> •
  <a href="#backend--database-architecture">Architecture &amp; Endpoints</a> •
  <a href="#installation--setup">Getting Started</a> •
  <a href="#production-deployment">Production Deployment</a>
</p>

---

## 🌟 About the Project

**TBF School Hub** is a full-stack educational management platform engineered specifically for the Tanzanian educational ecosystem (Primary, O-Level Secondary, A-Level High School, and Independent Solo Learners). Developed under **The Baraka Foundation**, the platform bridges educational inequality by providing standardized access to approved Tanzania Institute of Education (TIE) curriculum materials, school administration tools, student tracking, and interactive AI-assisted revision tutors.

---

## 🚀 Core Features

### 🎓 1. Student Portal & Learning Hub
* **Tanzania National Curriculum Bookshelf:** Complete, instant access to official Form 1 through Form 4 digital textbooks across all national syllabus subjects.
* **Built-in Digital PDF Reader:** High-speed document viewer supporting full-screen reading, search, zoom, and direct downloads.
* **Baraka AI Revision Tutor:** Bilingual (English & Kiswahili) AI companion trained to break down complex equations, explain science concepts, and generate active practice quizzes based on official NECTA syllabus topics.
* **Timetable & Progress Tracking:** Interactive schedule tracker, streak counters, and subject mastery benchmarks.

### 🏫 2. Headmaster & School Administrator Dashboard
* **Institution Management:** Manage school credentials, registration numbers, and administrative staff.
* **Bulk Student Import:** Import entire classes or school rosters simultaneously using Excel/CSV (`.xlsx`, `.csv`) spreadsheet uploads with instant validation.
* **Standardized Registration Numbers:** Automatic generation of official Tanzanian student registration numbers (Format: `TBF/<YEAR>/<SCHOOL_CODE>/<STUDENT_ID>`).
* **Class & Subject Enrollment:** Allocate subject teachers, assign classrooms, and track student attendance records.

### 👩‍🏫 3. Teacher Portal & Virtual Classroom
* **Class Roster & Gradebook:** Record daily attendance, view student performance metrics, and track progress over time.
* **Material Distribution:** Upload and share supplementary learning materials, notes, and revision assignments.
* **Live Classroom Sessions:** Peer-to-peer signaling for virtual instruction and interactive question-and-answer periods.

### 🌍 4. Independent Solo Learner Hub
* Support for self-taught students studying independently across Tanzania without physical school affiliation, offering open curriculum access and official solo student credentials (Format: `TBF/<YEAR>/<STUDENT_ID>`).

---

## 📚 Tanzania National Curriculum Library (Vitabu Vya Hub)

Pre-bundled with **54 official textbooks** published in accordance with the Tanzania Institute of Education (TIE) curriculum:

| Level | Available Core Subjects & Textbooks |
| :--- | :--- |
| **Form 1** | Basic Mathematics, Biology, Chemistry, Physics, Geography, History, Kiswahili, English, Civics, Agriculture, Animal Health, Bookkeeping, Business Studies, Computer Science |
| **Form 2** | Basic Mathematics, Biology, Chemistry, Physics (`PHYSICS form 2`), Geography, History, Kiswahili, English, Agriculture, Bookkeeping, Business Studies, Chinese Language, Food & Human Nutrition |
| **Form 3** | Basic Mathematics, Biology, Chemistry, Physics, Geography, History, Kiswahili, English, Civics, Commerce, Bookkeeping, Agriculture, Literature in English, Computer Studies |
| **Form 4** | Basic Mathematics, Biology, Chemistry, Physics, Geography, History, Kiswahili, English, Civics, Commerce, Bookkeeping, Agriculture, Literature in English, ICT & Computer Studies |

---

## 🔌 Backend & Database Architecture

The platform operates as a secure full-stack client and transparent reverse proxy communicating directly with the production API:

* **Production API Base:** `https://schubapi.thebarakafoundation.or.tz/api/v1`
* **Service Name:** `baraka-schoolhub-api`
* **Persistent Database:** Remote **PostgreSQL** database managed on the remote API server.
* **Zero Local JSON Storage:** All authentication, users, students, teachers, schools, classes, and discussions are saved and fetched exclusively from the production database endpoints.

### Key API Endpoint Routes:
| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/v1/health` | `GET` | Health status and database connectivity check |
| `/api/v1/auth/login` | `POST` | Authenticate user with email/registration number and password |
| `/api/v1/auth/me` | `GET` | Retrieve currently authenticated user profile |
| `/api/v1/register/student` | `POST` | Register student account linked to an enrolled institution |
| `/api/v1/register/solo` | `POST` | Register independent solo learner account |
| `/api/v1/register/teacher` | `POST` | Register certified educator account |
| `/api/v1/auth/register/school` | `POST` | Register educational institution (Subject to admin verification) |
| `/api/v1/schools` | `GET` | List all verified and partner Tanzanian schools |
| `/api/v1/classes` | `GET`, `POST` | Query and create academic class sections |
| `/api/v1/students` | `GET` | Query enrolled student records |
| `/api/v1/students/import` | `POST` | Batch import student rosters from Excel (`.xlsx`) |
| `/api/v1/materials` | `GET` | Fetch curriculum textbook catalog and reader links |

---

## 💻 Tech Stack

* **Frontend:** [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Tailwind CSS v4](https://tailwindcss.com/), [Vite](https://vitejs.dev/), [Lucide React](https://lucide.dev/), [React Router v7](https://reactrouter.com/)
* **Backend:** [Node.js](https://nodejs.org/), [Express](https://expressjs.com/), [Multer](https://github.com/expressjs/multer), [SheetJS/XLSX](https://sheetjs.com/)
* **Process Manager:** [PM2](https://pm2.keymetrics.io/) with `ecosystem.config.cjs`
* **AI Engine:** Google Gemini API (`@google/genai`)

---

## 🛠️ Installation & Setup

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/thebarakafoundationtech-code/tbf_school_hub_frontend1.git
cd tbf_school_hub_frontend1
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure the API base points to your production backend:
```env
PORT=3000
NODE_ENV=production
REMOTE_API_BASE=https://schubapi.thebarakafoundation.or.tz/api/v1
VITE_API_BASE_URL=https://schubapi.thebarakafoundation.or.tz/api/v1
NODE_TLS_REJECT_UNAUTHORIZED=0
```

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🚀 Production Deployment (PM2)

### 1. Build the Production Bundle
```bash
npm run build
```
This builds both the client assets (`dist/`) and bundles the backend server (`dist/server.cjs`).

### 2. Start / Restart via PM2
```bash
# Start with pre-configured ecosystem
pm2 start ecosystem.config.cjs

# Check running status
pm2 status

# Save PM2 process list across server reboots
pm2 save
```

### 3. Updating on the Server
For future updates pushed to Git:
```bash
git pull origin main
npm install
npm run build
pm2 restart ecosystem.config.cjs --update-env
```

---

## 📄 License & Ownership

Developed and maintained by **The Baraka Foundation** (`thebarakafoundation.or.tz`).  
All rights reserved © 2026.
