# Backend Endpoint Request Template
Prepared by: Samoh

---

## 1. Feature: Fetch Learning Materials

### Feature Name
Fetch Learning Materials

### Purpose
Students and teachers need to view and download learning materials filtered by subject, form level, and category.

### Frontend Page/Module
Student Portal → Learning Materials / Teacher Portal → Materials Library

### Requested Operation
- [x] Fetch Data (`GET /api/v1/materials`)
- [ ] Create Data
- [ ] Update Data
- [ ] Delete Data
- [ ] Upload File
- [ ] Download File
- [ ] Other: ___________

### Required Inputs
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `resource_name` | string | No | Subject name or search query (e.g. "biology", "mathematics") |
| `form_num` | integer | No | Student form level (1 to 6) |
| `category` | string | No | Material category ("notes", "past_papers", "summaries", "simulations", "all") |
| `page` | integer | No | Page number for pagination (default: 1) |
| `limit` | integer | No | Records per page (default: 20) |

#### Example Request Data
```json
{
  "resource_name": "biology",
  "form_num": 1,
  "category": "notes",
  "page": 1,
  "limit": 20
}
```

### Expected Response Data
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | string | Yes | Unique UUID of the material |
| `title` | string | Yes | Full document title |
| `subject` | string | Yes | Subject name |
| `form_num` | integer | Yes | Form level (1 to 6) |
| `category` | string | Yes | Material category ("notes", "past_papers", "summaries", etc.) |
| `resource_url` | string | Yes | Direct file URL / download link |
| `arranged_content` | object | No | Structured notes sections and key points |
| `created_at` | string | Yes | ISO 8601 creation timestamp |
| `total` | integer | Yes | Total matching count |
| `page` | integer | Yes | Current page |
| `total_pages` | integer | Yes | Total available pages |

#### Example Response
```json
{
  "materials": [
    {
      "id": "mat-9d2a-481b-a48e",
      "title": "Biology Form One Notes",
      "subject": "Biology",
      "form_num": 1,
      "category": "notes",
      "resource_url": "https://storage.thebarakafoundation.or.tz/materials/bio_f1_notes.pdf",
      "arranged_content": {
        "introduction": "Introduction to Cell Biology and Photosynthesis.",
        "key_points": ["Cell structure", "Plant nutrition", "Light reactions"],
        "summary": "Covers foundational Form 1 NECTA biology topics."
      },
      "created_at": "2026-08-31T10:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "total_pages": 1
}
```

### Filters Needed
- Filter by subject (`resource_name`)
- Filter by category (`category`)
- Filter by form level (`form_num`)
- Filter by school or public catalog

### Sorting Needed
- Newest First (`created_at DESC`)
- Alphabetical (`title ASC`)

### Pagination Needed
- [x] Yes
- [ ] No

**If Yes:**
- Page Number: `page` (integer)
- Page Size: `limit` (integer)
- Total Records: `total` (integer)

### Authentication Required
- [x] Yes
- [ ] No

### Allowed Roles
- [x] Student
- [x] Teacher
- [x] School Admin

### Error Cases Frontend Needs to Handle
- User not authenticated (`401 Unauthorized`)
- No materials found (`404 Not Found`)
- Invalid form number (`422 Unprocessable Entity`)
- School subscription expired (`403 Forbidden`)

### Additional Notes
Only return materials belonging to the student's assigned school or the public TBF national curriculum library.

---

## 2. Feature: AI Study Companion (Ask Baraka)

### Feature Name
AI Study Companion (Ask Baraka)

### Purpose
Students and teachers need real-time, interactive explanations, derivations, and syllabus-grounded answers for NECTA curriculum questions in English or Kiswahili.

### Frontend Page/Module
Student Portal → Ask Baraka AI Tutor / Teacher Portal → AI Assistant

### Requested Operation
- [ ] Fetch Data
- [x] Create Data (`POST /api/v1/ai/ask` or `/api/v1/ask-baraka`)
- [ ] Update Data
- [ ] Delete Data
- [ ] Upload File
- [ ] Download File
- [ ] Other: AI Inference

### Required Inputs
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `message` | string | Yes | Student question / inquiry |
| `history` | array | No | Previous chat messages `[{"text": string, "sender": "user" | "bot"}]` |
| `subject_context` | string | No | Current subject (e.g. "Biology", "Physics", "Civics") |

#### Example Request Data
```json
{
  "message": "Explain the difference between Light-dependent and Dark reactions in Photosynthesis.",
  "history": [
    { "text": "Habari Baraka!", "sender": "user" },
    { "text": "Habari! How can I help with your studies today?", "sender": "bot" }
  ],
  "subject_context": "Biology"
}
```

### Expected Response Data
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `text` | string | Yes | Rich markdown formatted academic answer |
| `source` | string | Yes | AI engine model identifier |
| `knowledge_sources` | array | Yes | List of curriculum citations used |
| `suggested_questions` | array | No | 2–3 suggested follow-up study questions |

#### Example Response
```json
{
  "text": "## Photosynthesis Reactions\n\n### 1. Light-Dependent Reactions\n- **Site:** Thylakoid membranes\n- **Process:** Solar energy splits water (photolysis) to yield ATP and NADPH.\n\n### 2. Light-Independent Reactions (Calvin Cycle)\n- **Site:** Stroma\n- **Process:** CO₂ is fixed into Glucose.",
  "source": "tbf-gemini-ai",
  "knowledge_sources": [
    "NECTA Form 1 Biology Syllabus",
    "Tanzania Institute of Education (TIE) Secondary Science"
  ],
  "suggested_questions": [
    "What is photolysis of water?",
    "How does temperature affect photosynthesis?"
  ]
}
```

### Filters Needed
None

### Sorting Needed
None

### Pagination Needed
- [ ] Yes
- [x] No

### Authentication Required
- [x] Yes
- [ ] No

### Allowed Roles
- [x] Student
- [x] Teacher
- [x] School Admin

### Error Cases Frontend Needs to Handle
- User not authenticated (`401 Unauthorized`)
- Empty or invalid prompt message (`400 Bad Request`)
- Daily query quota exceeded (`429 Rate Limit Exceeded`)

### Additional Notes
Responses should support dual English and Kiswahili vocabulary matching standard NECTA exam terminology.

---

## 3. Feature: Auto-Arrange Material & AI Quiz Generator

### Feature Name
Auto-Arrange Material & AI Quiz Generator

### Purpose
Teachers and administrators need to upload or paste raw lesson notes and have them automatically structured into study sections, bullet points, summaries, and assessment quizzes.

### Frontend Page/Module
Teacher Dashboard → Material Creator / Admin Dashboard → Curriculum Builder

### Requested Operation
- [ ] Fetch Data
- [x] Create Data (`POST /api/v1/arrange-material`)
- [ ] Update Data
- [ ] Delete Data
- [ ] Upload File
- [ ] Download File
- [ ] Other: AI Processing

### Required Inputs
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `title` | string | Yes | Material title |
| `subject` | string | Yes | Academic subject |
| `templateType` | string | Yes | Template format ("notes", "past_papers", "summaries") |
| `rawText` | string | Yes | Raw lesson content or textbook extract |

#### Example Request Data
```json
{
  "title": "Ohm's Law and Electrical Circuits",
  "subject": "Physics",
  "templateType": "notes",
  "rawText": "Ohm's law states that current through a conductor is directly proportional to voltage across it. Formula is V = I * R where V is voltage, I is current, and R is resistance."
}
```

### Expected Response Data
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `arrangedContent` | object | Yes | Formatted structured notes |
| `arrangedContent.introduction` | string | Yes | Introduction text |
| `arrangedContent.sections` | array | Yes | Array of structured section headers and paragraphs |
| `arrangedContent.keyPoints` | array | Yes | Key takeaway bullet points |
| `arrangedContent.summary` | string | Yes | Concluding summary |
| `quizQuestions` | array | Yes | Auto-generated multiple choice questions |

#### Example Response
```json
{
  "arrangedContent": {
    "introduction": "Ohm's Law is a foundational principle in electricity and magnetism.",
    "sections": [
      {
        "heading": "Mathematical Relation",
        "body": "The relationship is expressed as V = I * R.",
        "paragraphs": [
          "V represents Voltage measured in Volts (V).",
          "I represents Current measured in Amperes (A).",
          "R represents Resistance measured in Ohms (Ω)."
        ]
      }
    ],
    "keyPoints": [
      "Current is directly proportional to Voltage",
      "Resistance opposes current flow"
    ],
    "summary": "Understanding V = I * R allows calculation of voltage, current, and resistance in basic circuits."
  },
  "quizQuestions": [
    {
      "id": "q-1",
      "question": "What is the correct formula for Ohm's Law?",
      "options": ["V = I * R", "P = V * I", "I = V * R", "R = V * I"],
      "correctAnswer": 0,
      "explanation": "Voltage equals Current multiplied by Resistance (V = I * R)."
    }
  ]
}
```

### Filters Needed
None

### Sorting Needed
None

### Pagination Needed
- [ ] Yes
- [x] No

### Authentication Required
- [x] Yes
- [ ] No

### Allowed Roles
- [ ] Student
- [x] Teacher
- [x] School Admin

### Error Cases Frontend Needs to Handle
- User not authenticated (`401 Unauthorized`)
- Raw text is empty or too short (`400 Bad Request`)
- Generation timeout (`504 Gateway Timeout`)

### Additional Notes
Generated quiz questions should include explanations so students receive constructive feedback when practicing.

---

## 4. Feature: School Registration & Verification

### Feature Name
School Registration & Verification

### Purpose
New primary and secondary schools register their institution, submit administrative credentials, and upload proof-of-registration documents (MoE/NECTA certificates).

### Frontend Page/Module
Welcome Screen → Register Your School (Steps 1–3)

### Requested Operation
- [ ] Fetch Data
- [x] Create Data (`POST /api/v1/auth/register/school`)
- [ ] Update Data
- [ ] Delete Data
- [x] Upload File (`POST /api/v1/auth/upload-verification-doc`)
- [ ] Download File
- [ ] Other: ___________

### Required Inputs
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `fname` | string | Yes | Headmaster / Administrator First Name |
| `lname` | string | Yes | Headmaster / Administrator Last Name |
| `email` | string | Yes | Official school administrator email |
| `password` | string | Yes | Admin login password |
| `school_name` | string | Yes | Official name of school |
| `registration_number` | string | Yes | Ministry of Education / NECTA registration number |
| `region` | string | Yes | Region in Tanzania (e.g. "Dar es Salaam", "Arusha", "Dodoma") |
| `school_type` | string | Yes | "Primary", "Secondary", or "Advanced Secondary" |
| `headmaster_name` | string | Yes | Full name of Headmaster |
| `verification_document_name` | string | Yes | Uploaded MoE/NECTA certificate or official stamp letter |

#### Example Request Data
```json
{
  "fname": "Paulo",
  "lname": "Michael",
  "email": "headmaster@barakaschool.ac.tz",
  "password": "SecurePassword2026!",
  "school_name": "Baraka Secondary School",
  "registration_number": "MoE/SEC/2026/0921",
  "region": "Dar es Salaam",
  "school_type": "Secondary",
  "headmaster_name": "Paulo Michael Senior",
  "verification_document_name": "moe_registration_cert.pdf"
}
```

### Expected Response Data
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `access_token` | string | Yes | JWT Bearer authentication token |
| `token_type` | string | Yes | "bearer" |
| `expires_in` | integer | Yes | Token validity seconds (e.g. 86400) |
| `user` | object | Yes | Created admin profile object |
| `school` | object | Yes | Created school record with verification status |

#### Example Response
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 86400,
  "user": {
    "id": "usr_94a7e2b1",
    "email": "headmaster@barakaschool.ac.tz",
    "fname": "Paulo",
    "lname": "Michael",
    "role": "school_admin"
  },
  "school": {
    "id": "sch_18f4a01c",
    "name": "Baraka Secondary School",
    "registration_number": "MoE/SEC/2026/0921",
    "region": "Dar es Salaam",
    "school_type": "Secondary",
    "verification_status": "pending_review"
  }
}
```

### Filters Needed
None

### Sorting Needed
None

### Pagination Needed
- [ ] Yes
- [x] No

### Authentication Required
- [ ] Yes
- [x] No (Public registration endpoint)

### Allowed Roles
- Public / School Administrator

### Error Cases Frontend Needs to Handle
- Email already registered (`409 Conflict`)
- Registration number already exists (`409 Conflict`)
- Missing verification document (`422 Unprocessable Entity`)

### Additional Notes
Verification document upload is mandatory before a school account is fully activated.

---

## 5. Feature: Student & Solo Learner Registration

### Feature Name
Student & Solo Learner Registration

### Purpose
Allows individual learners or enrolled students to register their study account, select their grade/form level, and choose their national curriculum.

### Frontend Page/Module
Welcome Screen → Solo Learner / Student Registration

### Requested Operation
- [ ] Fetch Data
- [x] Create Data (`POST /api/v1/auth/register/student`)
- [ ] Update Data
- [ ] Delete Data
- [ ] Upload File
- [ ] Download File
- [ ] Other: ___________

### Required Inputs
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `fname` | string | Yes | First name |
| `lname` | string | Yes | Last name |
| `email` | string | Yes | Student email |
| `password` | string | Yes | Password |
| `phone` | string | No | Mobile phone / parent contact |
| `study_level` | string | Yes | Form level (e.g. "Form 1", "Form 2", "Form 3", "Form 4") |
| `curriculum` | string | Yes | Curriculum name ("Tanzania National (NECTA)") |

#### Example Request Data
```json
{
  "fname": "Amani",
  "lname": "Baraka",
  "email": "amani@student.ac.tz",
  "password": "Password123!",
  "phone": "+255 711 111 222",
  "study_level": "Form 1",
  "curriculum": "Tanzania National (NECTA)"
}
```

### Expected Response Data
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `access_token` | string | Yes | JWT Bearer access token |
| `user` | object | Yes | Authenticated student user object |

#### Example Response
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": "usr_88b12e",
    "email": "amani@student.ac.tz",
    "fname": "Amani",
    "lname": "Baraka",
    "role": "student",
    "study_level": "Form 1",
    "curriculum": "Tanzania National (NECTA)"
  }
}
```

### Authentication Required
- [ ] Yes
- [x] No (Public on-boarding)

### Allowed Roles
- Public / Student / Solo Learner

### Error Cases Frontend Needs to Handle
- Email already in use (`409 Conflict`)
- Weak password (`422 Unprocessable Entity`)

---

## 6. Feature: Quizzes & Assessment Submissions

### Feature Name
Quizzes & Assessment Submissions

### Purpose
Students submit answers for topical assessments and quizzes to calculate scores, XP rewards, and subject mastery.

### Frontend Page/Module
Student Portal → Quizzes & Practice Tests

### Requested Operation
- [x] Fetch Data (`GET /api/v1/quizzes`)
- [x] Create Data (`POST /api/v1/quizzes/submit`)
- [ ] Update Data
- [ ] Delete Data
- [ ] Upload File
- [ ] Download File
- [ ] Other: ___________

### Required Inputs
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `quiz_id` | string | Yes | Quiz identifier |
| `student_id` | string | Yes | Student user ID |
| `score` | integer | Yes | Total number of correct answers |
| `total` | integer | Yes | Total questions count |
| `answers` | array | No | Detailed list of answered questions and selected choices |

#### Example Request Data
```json
{
  "quiz_id": "quiz_bio_f1_01",
  "student_id": "usr_88b12e",
  "score": 3,
  "total": 3,
  "answers": [
    { "question_id": "q-1", "selected": 0, "is_correct": true },
    { "question_id": "q-2", "selected": 2, "is_correct": true },
    { "question_id": "q-3", "selected": 1, "is_correct": true }
  ]
}
```

### Expected Response Data
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `success` | boolean | Yes | Whether submission was recorded |
| `score` | integer | Yes | Student's score |
| `total` | integer | Yes | Total questions |
| `percentage` | number | Yes | Percentage score |
| `xp_earned` | integer | Yes | XP earned for completion |
| `feedback` | string | Yes | Feedback message |

#### Example Response
```json
{
  "success": true,
  "score": 3,
  "total": 3,
  "percentage": 100,
  "xp_earned": 50,
  "feedback": "Outstanding performance! You mastered this topic."
}
```

### Authentication Required
- [x] Yes
- [ ] No

### Allowed Roles
- [x] Student

---

## 7. Feature: Student, Teacher, and Timetable Management (Admin)

### Feature Name
School Entity & Timetable CRUD Management

### Purpose
School administrators manage student rosters, assign teachers to subjects/classes, and schedule the school timetable.

### Frontend Page/Module
Admin Dashboard → Students / Teachers / Timetable Tabs

### Requested Operations
- `GET /api/v1/students?class_name=Form 1A` (Fetch students)
- `POST /api/v1/students` (Add student)
- `PUT /api/v1/students/:id` (Update student)
- `DELETE /api/v1/students/:id` (Delete student)
- `GET /api/v1/teachers` (Fetch teachers)
- `POST /api/v1/teachers` (Add teacher)
- `GET /api/v1/timetable?day=Monday` (Fetch timetable)
- `POST /api/v1/timetable` (Schedule class session)
- `PUT /api/v1/timetable/:id/accept` (Teacher confirms timetable slot)

### Authentication Required
- [x] Yes (Bearer Token)

### Allowed Roles
- [x] Teacher (View / Confirm timetable)
- [x] School Admin (Full CRUD access)

### Error Cases Frontend Needs to Handle
- Student registration number duplicate (`409 Conflict`)
- Timetable room/teacher scheduling conflict (`409 Conflict`)
- Teacher email duplicate (`409 Conflict`)
