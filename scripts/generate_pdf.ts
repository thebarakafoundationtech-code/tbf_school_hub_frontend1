import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

function generatePdf() {
  const doc = new PDFDocument({ margin: 40, size: "A4" });
  const outputDir = path.join(process.cwd(), "public");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const outputPath = path.join(outputDir, "Backend_Endpoint_Request_Document.pdf");
  const writeStream = fs.createWriteStream(outputPath);
  doc.pipe(writeStream);

  // Helper colors
  const primaryColor = "#15223F";
  const secondaryColor = "#2563EB";
  const grayColor = "#4B5563";
  const lightBg = "#F8FAFC";
  const borderColor = "#E2E8F0";

  // Header
  doc.fontSize(22).font("Helvetica-Bold").fillColor(primaryColor).text("Backend Endpoint Request Template", { align: "center" });
  doc.moveDown(0.3);
  doc.fontSize(11).font("Helvetica").fillColor(grayColor).text("Prepared by: Samoh", { align: "center" });
  doc.fontSize(9).text("TBF School Hub API Specification (v1) • Tanzania Baraka Foundation", { align: "center" });
  doc.moveDown(1);
  doc.strokeColor(borderColor).lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
  doc.moveDown(1);

  // SECTION 1
  renderSectionHeader(doc, "1. Feature Name: Fetch Learning Materials", primaryColor);
  renderField(doc, "Purpose", "Students and teachers need to view and download learning materials filtered by subject, form level, and category.");
  renderField(doc, "Frontend Page/Module", "Student Portal → Learning Materials / Teacher Portal → Materials Library");
  renderField(doc, "Requested Operation", "[X] Fetch Data (GET /api/v1/materials)    [ ] Create    [ ] Update    [ ] Delete    [ ] Upload File");
  
  doc.moveDown(0.5);
  doc.fontSize(10).font("Helvetica-Bold").fillColor(primaryColor).text("Required Inputs:");
  renderTable(doc, [
    ["Field", "Type", "Required", "Description"],
    ["resource_name", "string", "No", "Subject name or search query (e.g., 'biology')"],
    ["form_num", "integer", "No", "Student form level (1 to 6)"],
    ["category", "string", "No", "Category: 'notes', 'past_papers', 'summaries', 'all'"],
    ["page", "integer", "No", "Page number (default: 1)"],
    ["limit", "integer", "No", "Page size (default: 20)"]
  ]);

  doc.moveDown(0.5);
  doc.fontSize(10).font("Helvetica-Bold").fillColor(primaryColor).text("Example Request Query:");
  renderCodeBox(doc, "GET /api/v1/materials?resource_name=biology&form_num=1&category=notes&page=1&limit=20");

  doc.moveDown(0.5);
  doc.fontSize(10).font("Helvetica-Bold").fillColor(primaryColor).text("Expected Response Data:");
  renderCodeBox(doc, JSON.stringify({
    materials: [{
      id: "mat-9d2a-481b-a48e",
      title: "Biology Form One Notes",
      subject: "Biology",
      form_num: 1,
      category: "notes",
      resource_url: "https://storage.thebarakafoundation.or.tz/materials/bio_f1_notes.pdf",
      created_at: "2026-08-31T10:00:00Z"
    }],
    total: 1,
    page: 1,
    total_pages: 1
  }, null, 2));

  renderField(doc, "Filters Needed", "Filter by subject, category, form level, and school");
  renderField(doc, "Sorting Needed", "Newest First (created_at DESC), Alphabetical (title ASC)");
  renderField(doc, "Pagination Needed", "Yes (page, limit, total)");
  renderField(doc, "Authentication Required", "Yes (Bearer Token) • Allowed Roles: Student, Teacher, School Admin");
  renderField(doc, "Error Cases", "401 Unauthorized, 404 No materials found, 422 Invalid form number");
  renderField(doc, "Additional Notes", "Only return materials belonging to the student's assigned school or public TBF library.");

  // PAGE 2
  doc.addPage();
  renderSectionHeader(doc, "2. Feature Name: AI Study Companion (Ask Baraka)", primaryColor);
  renderField(doc, "Purpose", "Real-time, syllabus-grounded explanations and derivations for NECTA curriculum in English and Kiswahili.");
  renderField(doc, "Frontend Page/Module", "Student Portal → Ask Baraka AI Tutor / Teacher Portal → AI Assistant");
  renderField(doc, "Requested Operation", "[X] Create Data / Process (POST /api/v1/ai/ask)    [ ] Fetch    [ ] Upload");

  doc.moveDown(0.5);
  doc.fontSize(10).font("Helvetica-Bold").fillColor(primaryColor).text("Example Request Data:");
  renderCodeBox(doc, JSON.stringify({
    message: "Explain the difference between Light-dependent and Dark reactions in Photosynthesis.",
    history: [
      { text: "Habari Baraka!", sender: "user" },
      { text: "Habari! How can I help with your studies today?", sender: "bot" }
    ],
    subject_context: "Biology"
  }, null, 2));

  doc.moveDown(0.5);
  doc.fontSize(10).font("Helvetica-Bold").fillColor(primaryColor).text("Expected Response Data:");
  renderCodeBox(doc, JSON.stringify({
    text: "## Photosynthesis Reactions\n1. Light Reactions (Thylakoid): Photolysis of water yields ATP/NADPH.\n2. Calvin Cycle (Stroma): CO2 fixed into Glucose.",
    source: "tbf-gemini-ai",
    knowledge_sources: ["NECTA Form 1 Biology Syllabus", "TIE Secondary Science"],
    suggested_questions: ["What is photolysis of water?"]
  }, null, 2));

  renderField(doc, "Authentication Required", "Yes (Bearer Token) • Allowed Roles: Student, Solo Learner, Teacher");
  renderField(doc, "Error Cases", "400 Bad Request (empty message), 429 Rate Limit Exceeded");

  // SECTION 3
  doc.moveDown(1);
  renderSectionHeader(doc, "3. Feature Name: Auto-Arrange Material & AI Quiz Generator", primaryColor);
  renderField(doc, "Purpose", "Teachers upload or paste raw lesson notes to auto-generate structured notes, summaries, and quiz questions.");
  renderField(doc, "Frontend Page/Module", "Teacher Dashboard → Material Creator / Admin Dashboard → Curriculum Builder");
  renderField(doc, "Requested Operation", "[X] Create Data / AI Process (POST /api/v1/arrange-material)");

  doc.moveDown(0.5);
  doc.fontSize(10).font("Helvetica-Bold").fillColor(primaryColor).text("Example Request Data:");
  renderCodeBox(doc, JSON.stringify({
    title: "Ohm's Law and Electrical Resistance",
    subject: "Physics",
    templateType: "notes",
    rawText: "Ohm's law states that current through a conductor is directly proportional to voltage across it. Formula: V = I * R."
  }, null, 2));

  doc.moveDown(0.5);
  doc.fontSize(10).font("Helvetica-Bold").fillColor(primaryColor).text("Expected Response Data:");
  renderCodeBox(doc, JSON.stringify({
    arrangedContent: {
      introduction: "Ohm's Law is a foundational principle of electrical physics.",
      sections: [{ heading: "Formulation", body: "V = I * R" }],
      keyPoints: ["Current is proportional to Voltage", "Resistance opposes current flow"],
      summary: "Key formula: V = I * R"
    },
    quizQuestions: [{
      id: "q-1",
      question: "What is the formula for Ohm's Law?",
      options: ["V = I * R", "P = V * I", "I = V * R", "R = V * I"],
      correctAnswer: 0,
      explanation: "Voltage equals Current multiplied by Resistance (V = I * R)."
    }]
  }, null, 2));

  renderField(doc, "Authentication Required", "Yes • Allowed Roles: Teacher, School Admin");

  // PAGE 3
  doc.addPage();
  renderSectionHeader(doc, "4. Feature Name: School Registration & Verification", primaryColor);
  renderField(doc, "Purpose", "New schools register institution, submit admin credentials, and upload MoE/NECTA certificates for approval.");
  renderField(doc, "Frontend Page/Module", "Welcome Screen → Register Your School (Steps 1–3)");
  renderField(doc, "Requested Operation", "[X] Create Data (POST /api/v1/auth/register/school)    [X] Upload File (POST /api/v1/auth/upload-verification-doc)");

  doc.moveDown(0.5);
  doc.fontSize(10).font("Helvetica-Bold").fillColor(primaryColor).text("Example Request Data:");
  renderCodeBox(doc, JSON.stringify({
    fname: "Paulo",
    lname: "Michael",
    email: "headmaster@barakaschool.ac.tz",
    password: "SecurePassword2026!",
    school_name: "Baraka Secondary School",
    registration_number: "MoE/SEC/2026/0921",
    region: "Dar es Salaam",
    school_type: "Secondary",
    headmaster_name: "Paulo Michael Senior",
    verification_document_name: "moe_registration_cert.pdf"
  }, null, 2));

  doc.moveDown(0.5);
  doc.fontSize(10).font("Helvetica-Bold").fillColor(primaryColor).text("Expected Response Data:");
  renderCodeBox(doc, JSON.stringify({
    access_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    token_type: "bearer",
    expires_in: 86400,
    user: { id: "usr_94a7e2b1", email: "headmaster@barakaschool.ac.tz", role: "school_admin" },
    school: { id: "sch_18f4a01c", name: "Baraka Secondary School", verification_status: "pending_review" }
  }, null, 2));

  renderField(doc, "Authentication Required", "No (Public Onboarding)");
  renderField(doc, "Error Cases", "409 Conflict (Email/Reg No exists), 422 Unprocessable (Missing document)");

  // SECTION 5 & 6
  doc.moveDown(1);
  renderSectionHeader(doc, "5. Feature Name: Student & Solo Learner Registration", primaryColor);
  renderField(doc, "Purpose", "Enrolls individual students / solo learners with grade level and curriculum choice.");
  renderField(doc, "Requested Operation", "[X] Create Data (POST /api/v1/auth/register/student)");
  renderCodeBox(doc, JSON.stringify({
    fname: "Amani",
    lname: "Baraka",
    email: "amani@student.ac.tz",
    study_level: "Form 1",
    curriculum: "Tanzania National (NECTA)"
  }, null, 2));

  doc.moveDown(1);
  renderSectionHeader(doc, "6. Feature Name: Quizzes & Assessment Submissions", primaryColor);
  renderField(doc, "Purpose", "Submit quiz test answers to calculate score, award XP, and track topic mastery.");
  renderField(doc, "Requested Operation", "[X] Fetch (GET /api/v1/quizzes)    [X] Create (POST /api/v1/quizzes/submit)");
  renderCodeBox(doc, JSON.stringify({
    quiz_id: "quiz_bio_f1_01",
    student_id: "usr_88b12e",
    score: 3,
    total: 3,
    answers: [{ question_id: "q-1", selected: 0, is_correct: true }]
  }, null, 2));

  // PAGE 4: SUMMARY TABLE
  doc.addPage();
  renderSectionHeader(doc, "7. School Management CRUD Summary Table", primaryColor);
  doc.moveDown(0.5);

  renderTable(doc, [
    ["Operation", "Method & Route", "Allowed Roles", "Purpose"],
    ["Fetch Students", "GET /api/v1/students", "Admin, Teacher", "List students with class filter & search"],
    ["Create Student", "POST /api/v1/students", "Admin", "Register new student in school"],
    ["Update Student", "PUT /api/v1/students/:id", "Admin", "Modify student class/details"],
    ["Delete Student", "DELETE /api/v1/students/:id", "Admin", "Remove student record"],
    ["Fetch Teachers", "GET /api/v1/teachers", "Admin", "List teachers with subjects & classes"],
    ["Create Teacher", "POST /api/v1/teachers", "Admin", "Add teacher and assign credentials"],
    ["Fetch Timetable", "GET /api/v1/timetable", "Admin, Teacher, Student", "Get daily schedule & assigned rooms"],
    ["Create Slot", "POST /api/v1/timetable", "Admin", "Schedule new timetable period"],
    ["Accept Slot", "PUT /api/v1/timetable/:id/accept", "Teacher", "Teacher confirms timetable slot"]
  ]);

  doc.moveDown(2);
  doc.fontSize(10).font("Helvetica-Oblique").fillColor(grayColor).text(
    "All endpoints conform to TBF School Hub security standards with JSON payload over HTTPS. Base URL: https://schubapi.thebarakafoundation.or.tz/api/v1",
    { align: "center" }
  );

  doc.end();

  writeStream.on("finish", () => {
    console.log("PDF generation finished successfully at:", outputPath);
  });
}

function renderSectionHeader(doc: PDFKit.PDFDocument, title: string, color: string) {
  doc.fontSize(12).font("Helvetica-Bold").fillColor(color).text(title);
  doc.moveDown(0.2);
}

function renderField(doc: PDFKit.PDFDocument, label: string, value: string) {
  doc.fontSize(9).font("Helvetica-Bold").fillColor("#15223F").text(`${label}: `, { continued: true });
  doc.font("Helvetica").fillColor("#374151").text(value);
  doc.moveDown(0.2);
}

function renderCodeBox(doc: PDFKit.PDFDocument, code: string) {
  const y = doc.y;
  doc.font("Courier").fontSize(7.5);
  const height = doc.heightOfString(code, { width: 500 }) + 8;
  
  doc.rect(40, y, 515, height).fillAndStroke("#F8FAFC", "#E2E8F0");
  doc.fillColor("#0F172A").fontSize(7.5).font("Courier").text(code, 46, y + 4, { width: 500 });
  doc.y = y + height + 6;
}

function renderTable(doc: PDFKit.PDFDocument, rows: string[][]) {
  const colWidths = [105, 150, 110, 150];
  const startX = 40;
  
  rows.forEach((row, rowIndex) => {
    const y = doc.y;
    const isHeader = rowIndex === 0;
    const bgColor = isHeader ? "#15223F" : rowIndex % 2 === 1 ? "#F8FAFC" : "#FFFFFF";
    const textColor = isHeader ? "#FFFFFF" : "#1F2937";
    const fontName = isHeader ? "Helvetica-Bold" : "Helvetica";

    let maxHeight = 16;
    doc.font(fontName).fontSize(8);
    row.forEach((cell, colIndex) => {
      const h = doc.heightOfString(cell, { width: colWidths[colIndex] - 8 }) + 6;
      if (h > maxHeight) maxHeight = h;
    });

    doc.rect(startX, y, 515, maxHeight).fillAndStroke(bgColor, "#E2E8F0");

    let currentX = startX;
    row.forEach((cell, colIndex) => {
      doc.fillColor(textColor).fontSize(8).font(fontName).text(cell, currentX + 4, y + 3, {
        width: colWidths[colIndex] - 8
      });
      currentX += colWidths[colIndex];
    });

    doc.y = y + maxHeight;
  });
}

generatePdf();
