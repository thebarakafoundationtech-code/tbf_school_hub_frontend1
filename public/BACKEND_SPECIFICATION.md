# Technical Architecture & Backend Specification Document
**Project:** Tanzanian Secondary School E-Learning Platform & AI Companion (Baraka)  
**Version:** 1.0.0  
**Target Audience:** Backend Engineers, System Architects, DevOps Engineers  
**Date:** July 2026  

---

## 1. Executive Summary & Core Platform Vision

This document details the complete backend architectural specification for the Secondary School Digital Learning & AI Ecosystem. The platform serves Tanzanian and East African secondary schools (Form 1 to Form 6, following the NECTA curriculum) with a multi-role web application designed for **Students**, **Teachers (Mwalimu)**, and **School Administrators (Headmasters)**.

### Core Key Features
1. **Baraka AI Study Companion**: Real-time Gemini-powered AI tutor with NECTA curriculum grounding, Swahili/English code-switching capabilities, step-by-step math solver, and interactive quiz generation.
2. **Cross-Device Live Broadcast Classroom**: Multi-browser real-time session streaming with synchronized presentation slide decks, live interactive whiteboard, instant poll/quiz launches, and real-time attendance tracking.
3. **Institutional & Solo Learner Authentication**: Dual-mode login supporting direct Google OAuth 2.0 verification, school code verification, and Form-level classification.
4. **Curriculum & Study Resource Hub**: NECTA past papers, AI-generated subject summaries, video lectures, and homework submission pipelines.
5. **Fee Tracking & Mobile Money Integration**: Payment tracking supporting M-Pesa, Tigo Pesa, Airtel Money, and bank wire reconciliation.

---

## 2. High-Level System Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                                  CLIENT LAYER                                     |
|   +-----------------------+   +------------------------+   +------------------+   |
|   |   Student Dashboard   |   |   Teacher Dashboard    |   | Admin Dashboard  |   |
|   +-----------------------+   +------------------------+   +------------------+   |
+-----------------------------------------|-----------------------------------------+
                                          | HTTPS / WebSockets / SSE
                                          v
+-----------------------------------------------------------------------------------+
|                              BACKEND API GATEWAY (Node.js)                         |
|  +-------------------+  +---------------------+  +-----------------------------+  |
|  | Auth & OAuth      |  | AI Service          |  | Real-Time SSE Broadcast     |  |
|  | Controller        |  | (Gemini 2.5 Flash)  |  | Relay Engine                |  |
|  +-------------------+  +---------------------+  +-----------------------------+  |
|  +-------------------+  +---------------------+  +-----------------------------+  |
|  | Classroom & Quiz  |  | Payment & SMS       |  | Analytics & Student         |  |
|  | Management        |  | Gateway Proxy       |  | Record Services             |  |
|  +-------------------+  +---------------------+  +-----------------------------+  |
+-----------------------------------------|-----------------------------------------+
                                          |
        +---------------------------------+--------------------------------+
        |                                 |                                |
        v                                 v                                v
+-------------------+           +-------------------+            +-------------------+
| Primary Database  |           | External AI Engine|            | Third-Party       |
| PostgreSQL /      |           | Google Gemini API |            | Services          |
| Firebase Firestore|           | (@google/genai)   |            | Google OAuth 2.0  |
|                   |           |                   |            | M-Pesa / SMS APIs |
+-------------------+           +-------------------+            +-------------------+
```

---

## 3. Detailed Data Schemas & Models

### 3.1 Users (`users` / `students`)
| Field Name | Type | Description |
| :--- | :--- | :--- |
| `id` | VARCHAR(64) [PK] | Unique user ID or email hash |
| `reg_no` | VARCHAR(32) | School registration number (e.g. `BSS-2026-891`) |
| `name` | VARCHAR(128) | Full name of the user |
| `email` | VARCHAR(128) | Primary email address |
| `role` | ENUM | `'student'`, `'teacher'`, `'admin'` |
| `class_level` | VARCHAR(32) | Grade/Level (`Form 1`, `Form 2`, `Form 3`, `Form 4`, `Form 5`, `Form 6`) |
| `curriculum` | VARCHAR(64) | Curriculum identifier (e.g., `"Tanzania / NECTA"`) |
| `parent_phone` | VARCHAR(32) | Parent/Guardian phone number for SMS alerts |
| `status` | ENUM | `'Active'`, `'Suspended'`, `'Pending'` |
| `fees_paid` | BOOLEAN | Tuition status flag |
| `photo_url` | TEXT | Avatar image URL |
| `created_at` | TIMESTAMP | Registration timestamp |

### 3.2 Live Sessions (`live_sessions`)
| Field Name | Type | Description |
| :--- | :--- | :--- |
| `id` | VARCHAR(64) [PK] | Session UUID |
| `is_active` | BOOLEAN | Broadcast status |
| `subject` | VARCHAR(64) | Subject name (e.g. `Biology`, `Physics`, `Mathematics`) |
| `topic` | VARCHAR(128) | Lesson topic title |
| `teacher_name` | VARCHAR(128) | Instructor full name |
| `target_class` | VARCHAR(32) | Target class filter (`Form 1A`, `All Forms`, etc.) |
| `whiteboard_text` | TEXT | Live markdown/text canvas content |
| `presentation_active` | BOOLEAN | Toggle for slide deck/screen share |
| `presentation_type` | VARCHAR(32) | `'slide'` or `'screen'` |
| `presentation_title` | VARCHAR(255) | Slide deck title |
| `presentation_slide_index` | INT | Active slide index |
| `presentation_slides` | JSONB / ARRAY | Array of slide content strings or URLs |
| `active_quiz` | JSONB | Launched live quiz object (Question, options, correct index, submissions) |
| `attendance` | JSONB | Record of connected students (`{ "student_id": "Present" }`) |

### 3.3 AI Chat Conversations (`ai_chat_logs`)
| Field Name | Type | Description |
| :--- | :--- | :--- |
| `id` | VARCHAR(64) [PK] | Conversation message UUID |
| `student_id` | VARCHAR(64) [FK] | Associated student |
| `sender` | ENUM | `'user'`, `'ai'` |
| `message_text` | TEXT | Chat query or response body |
| `subject_context` | VARCHAR(64) | Subject context tag |
| `tokens_used` | INT | Usage metrics |
| `timestamp` | TIMESTAMP | Message time |

---

## 4. API Endpoints Catalog

### 4.1 Authentication & User Management
- **`GET /api/auth/url`**: Generates Google OAuth 2.0 consent URL.
- **`POST /api/auth/verify-code`**: Verifies 6-digit email OTP for institutional authentication.
- **`POST /api/users/register`**: Registers a new student/teacher profile with chosen class level.
- **`GET /api/users/profile`**: Retrieves authenticated user profile.

### 4.2 AI Companion Engine (Baraka AI)
- **`POST /api/chat`**:
  - **Body**: `{ message: string, subject: string, classLevel: string, history: Array }`
  - **Behavior**: Calls Google Gemini API (`gemini-2.5-flash`) with system prompt enforcement for NECTA curriculum guidelines, bilingual Swahili/English explanation, and markdown rendering.
- **`POST /api/generate-summary`**:
  - **Body**: `{ topic: string, subject: string, studyLevel: string }`
  - **Behavior**: Synthesizes a structured study note with key formulas, bullet points, and revision questions.

### 4.3 Real-Time Live Session Service
- **`GET /api/live-session`**: Fetches the current live classroom state.
- **`POST /api/live-session`**:
  - **Body**: Partial or complete live session object (whiteboard, slide index, active quiz).
  - **Behavior**: Updates session state and triggers real-time SSE broadcast to all connected clients.
- **`GET /api/live-session/stream`**:
  - **Type**: Server-Sent Events (SSE) `text/event-stream` endpoint.
  - **Behavior**: Maintains a persistent connection, pushing live state updates to students instantly across different browsers and networks.

---

## 5. Third-Party Integration Requirements

1. **Google Gemini API**:
   - Package: `@google/genai`
   - Model: `gemini-2.5-flash`
   - Config: Enforces low temperature (0.3) for factual academic accuracy.

2. **Google OAuth 2.0**:
   - Client ID & Secret configured in Cloud Console.
   - Redirect URI pointed to backend auth callback route.

3. **SMS Gateway (e.g. Beem Africa / Africa's Talking)**:
   - Automated parent notification on exam results, live class reminders, and tuition balance.

4. **Mobile Money Gateway (M-Pesa / Selcom / AzamPay)**:
   - Webhook handler for instant school fee payment reconciliation.

---

## 6. Recommended Technology Stack for Implementation

- **Runtime & Framework**: Node.js v20+ with Express / NestJS.
- **Database**: PostgreSQL with Drizzle ORM or Prisma (or Firebase Firestore for serverless scaling).
- **Real-Time Transport**: Server-Sent Events (SSE) or WebSockets (`socket.io`).
- **Containerization**: Docker & Docker Compose setup.
- **Hosting / Deployment**: GCP Cloud Run, AWS ECS, or DigitalOcean App Platform.

---
*Document produced for development handover. Ready for implementation.*
