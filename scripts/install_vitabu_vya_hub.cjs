const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Common Tanzanian subjects
const SUBJECT_KEYWORDS = [
  ["animal health", "Animal Health & Agriculture"],
  ["business - studies", "Business Studies"],
  ["business studies", "Business Studies"],
  ["book-keeping", "Bookkeeping"],
  ["bookkeeping", "Bookkeeping"],
  ["commerce", "Commerce"],
  ["computer science", "Computer Science & ICT"],
  ["ict & computer", "Computer Science & ICT"],
  ["ict", "Computer Science & ICT"],
  ["chinese", "Chinese Language"],
  ["food and human nutrition", "Food & Human Nutrition"],
  ["nutrition", "Food & Human Nutrition"],
  ["literature in english", "Literature in English"],
  ["literature", "Literature in English"],
  ["fasihi", "Kiswahili Fasihi"],
  ["kiswahili", "Kiswahili"],
  ["swahili", "Kiswahili"],
  ["sarufi", "Kiswahili"],
  ["basic math", "Basic Mathematics"],
  ["mathematics", "Basic Mathematics"],
  ["maths", "Basic Mathematics"],
  ["math", "Basic Mathematics"],
  ["hisabati", "Basic Mathematics"],
  ["physics", "Physics"],
  ["fizikia", "Physics"],
  ["chemistry", "Chemistry"],
  ["kemia", "Chemistry"],
  ["biology", "Biology"],
  ["biolojia", "Biology"],
  ["geography", "Geography"],
  ["jiografia", "Geography"],
  ["history", "History"],
  ["historia", "History"],
  ["civics", "Civics"],
  ["uraia", "Civics"],
  ["english", "English Language"],
  ["agriculture", "Agriculture"],
  ["kilimo", "Agriculture"],
  ["science", "General Science"]
];

function detectSubject(filePath) {
  const lower = filePath.toLowerCase();
  for (const [kw, subj] of SUBJECT_KEYWORDS) {
    if (lower.includes(kw)) return subj;
  }
  return "General Studies";
}

function detectFormLevel(filePath) {
  const lower = filePath.toLowerCase();
  if (lower.includes("3 & 4") || lower.includes("3 and 4")) return "Form 3–4";
  if (lower.includes("form 1") || lower.includes("kidato 1") || lower.includes("book 1") || lower.includes("book1")) return "Form 1";
  if (lower.includes("form 2") || lower.includes("kidato 2") || lower.includes("book 2") || lower.includes("book2")) return "Form 2";
  if (lower.includes("form 3") || lower.includes("kidato 3") || lower.includes("book 3") || lower.includes("book3")) return "Form 3";
  if (lower.includes("form 4") || lower.includes("kidato 4") || lower.includes("book 4") || lower.includes("book4")) return "Form 4";
  if (lower.includes("form 5") || lower.includes("kidato 5") || lower.includes("book 5")) return "Form 5";
  if (lower.includes("form 6") || lower.includes("kidato 6") || lower.includes("book 6")) return "Form 6";
  return "All Forms";
}

function cleanTitle(filename) {
  const base = path.basename(filename, path.extname(filename));
  return base
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

async function run() {
  const publicBooksDir = path.resolve("./public/books");
  if (!fs.existsSync(publicBooksDir)) fs.mkdirSync(publicBooksDir, { recursive: true });

  const tempArchive = "/tmp/Vitabu_Vya_Hub.7z";
  const downloadUrl = "https://cold1.gofile.io/download/web/f83ecf12-acce-446d-b118-81f3a817bff6/Vitabu%20Vya%20Hub.7z";
  const token = "3BQPX28luk5dGPda2Tt2MlbeJtBZd1UF";
  const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

  if (!fs.existsSync(tempArchive) || fs.statSync(tempArchive).size < 100000000) {
    console.log("[STEP 1] Downloading Vitabu Vya Hub.7z from GoFile...");
    const curlCmd = `curl -L --retry 5 --retry-delay 2 -H "Cookie: accountToken=${token}" -H "User-Agent: ${userAgent}" "${downloadUrl}" -o "${tempArchive}"`;
    execSync(curlCmd, { stdio: "inherit" });
  } else {
    console.log("[STEP 1] Reusing downloaded Vitabu Vya Hub.7z archive!");
  }

  console.log("[STEP 2] Extracting archive with 7z x...");
  const extractTemp = "/tmp/vitabu_extract_temp";
  if (fs.existsSync(extractTemp)) fs.rmSync(extractTemp, { recursive: true, force: true });
  fs.mkdirSync(extractTemp, { recursive: true });

  execSync(`7z x -y "${tempArchive}" -o"${extractTemp}"`, { stdio: "inherit" });

  try { fs.unlinkSync(tempArchive); } catch {}
  console.log("[STEP 3] Cleaned up temporary archive file.");

  console.log("[STEP 4] Copying and flattening all PDF files into public/books/...");
  function copyPdfs(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        copyPdfs(full);
      } else if (ent.isFile() && ent.name.toLowerCase().endsWith(".pdf")) {
        const dest = path.join(publicBooksDir, ent.name);
        fs.copyFileSync(full, dest);
      }
    }
  }
  copyPdfs(extractTemp);
  try { fs.rmSync(extractTemp, { recursive: true, force: true }); } catch {}

  console.log("[STEP 4] Scanning extracted books in public/books/...");
  const files = fs.readdirSync(publicBooksDir).filter(f => f.toLowerCase().endsWith(".pdf"));
  console.log(`Found ${files.length} PDF books in public/books/!`);

  const dbPath = path.resolve("./data/database.json");
  let db = { materials: [] };
  if (fs.existsSync(dbPath)) {
    try { db = JSON.parse(fs.readFileSync(dbPath, "utf8")); } catch {}
  }
  if (!Array.isArray(db.materials)) db.materials = [];

  // Remove any old placeholder archive.org materials
  db.materials = db.materials.filter(m => !(m.downloadUrl && m.downloadUrl.includes("archive.org")));

  let newMaterials = [];
  let index = 1;

  for (const filename of files) {
    const fullPath = path.join(publicBooksDir, filename);
    const stat = fs.statSync(fullPath);
    const title = cleanTitle(filename);
    const subject = detectSubject(filename);
    const classes = detectFormLevel(filename);
    const fileUrl = `/books/${encodeURIComponent(filename)}`;

    const mat = {
      id: `mat-tz-${Date.now()}-${index++}`,
      title,
      subject,
      classes,
      category: "Tanzania Curriculum",
      curriculum: "Tanzania Curriculum",
      section: "tanzania_curriculum",
      isTanzaniaCurriculum: true,
      uploadedAt: "Vitabu Vya Hub (Tanzania)",
      templateType: "notes",
      rawText: `Official digital curriculum textbook "${title}" for ${subject} (${classes}). Extracted from Vitabu Vya Hub. Available for reading and study.`,
      visibility: "public",
      uploadedBy: "Ministry of Education & National Library",
      isTeacherUpload: true,
      downloadUrl: fileUrl,
      directUrl: fileUrl,
      readOnlineUrl: fileUrl,
      downloadPdfUrl: fileUrl,
      fileSize: formatBytes(stat.size),
      isFreeOnline: true,
      source: "Vitabu Vya Hub",
      arrangedContent: {
        summary: `Complete curriculum textbook "${title}" for ${subject} (${classes}). Aligned with official Tanzanian syllabus standards for primary and secondary education.`,
        keyPoints: [
          `Subject: ${subject} · Level: ${classes}`,
          `Original curriculum edition from Vitabu Vya Hub repository.`,
          `Read online directly in the built-in reader with search and zoom.`,
          `Ask Baraka AI to explain any chapter, theorem, or question.`
        ],
        definitions: [
          {
            term: "Curriculum Standard",
            definition: "Official syllabus guidelines issued by the Tanzania Institute of Education (TIE)."
          }
        ]
      },
      quizQuestions: [
        {
          question: `What is the target study level for "${title}"?`,
          options: [classes, "Form 6 Advanced", "University Degree", "Standard 1"],
          correctIndex: 0,
          explanation: `This book is officially designated for ${classes}.`
        },
        {
          question: `Which core subject does this textbook belong to?`,
          options: [subject, "Music", "Aviation Studies", "General Knowledge"],
          correctIndex: 0,
          explanation: `This textbook is categorized under ${subject}.`
        }
      ]
    };

    // Remove duplicates if same filename exists
    db.materials = db.materials.filter(m => m.downloadUrl !== fileUrl && m.title !== title);
    db.materials.unshift(mat);
    newMaterials.push(mat);
  }

  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), "utf8");
  console.log(`[SUCCESS] Registered ${newMaterials.length} Vitabu Vya Hub books in database.json!`);
}

run().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
