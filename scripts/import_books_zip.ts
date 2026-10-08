import fs from "fs";
import path from "path";
import { execSync } from "child_process";

// Supported document extensions
const EXTENSIONS = new Set([".pdf", ".epub", ".mobi", ".docx", ".doc"]);

// Common Tanzanian secondary & primary subjects
const SUBJECT_KEYWORDS: [string, string][] = [
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

function detectSubject(filePath: string): string {
  const lower = filePath.toLowerCase();
  for (const [kw, subj] of SUBJECT_KEYWORDS) {
    if (lower.includes(kw)) {
      return subj;
    }
  }
  return "General Studies";
}

function detectFormLevel(filePath: string): string {
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

function cleanTitle(filename: string): string {
  const base = path.basename(filename, path.extname(filename));
  return base
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, l => l.toUpperCase())
    .trim();
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function importBooksFromDirectory(sourceDir: string, targetBooksDir: string = "./public/books"): { imported: number; books: any[] } {
  if (!fs.existsSync(targetBooksDir)) {
    fs.mkdirSync(targetBooksDir, { recursive: true });
  }

  const foundFiles: string[] = [];

  function scan(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        scan(full);
      } else if (ent.isFile()) {
        const ext = path.extname(ent.name).toLowerCase();
        if (EXTENSIONS.has(ext)) {
          foundFiles.push(full);
        }
      }
    }
  }

  scan(sourceDir);

  const dbPath = path.resolve("./data/database.json");
  let db: any = { materials: [], students: [], teachers: [], schools: [] };
  if (fs.existsSync(dbPath)) {
    try {
      db = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
    } catch {
      // ignore
    }
  }
  if (!Array.isArray(db.materials)) {
    db.materials = [];
  }

  const importedBooks: any[] = [];
  let index = 1;

  for (const srcFile of foundFiles) {
    const rawFileName = path.basename(srcFile);
    // Sanitize destination file name
    const sanitizedName = rawFileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const destPath = path.join(targetBooksDir, sanitizedName);

    // If source is not already in target, copy it
    if (path.resolve(srcFile) !== path.resolve(destPath)) {
      fs.copyFileSync(srcFile, destPath);
    }

    const stat = fs.statSync(destPath);
    const title = cleanTitle(rawFileName);
    const subject = detectSubject(srcFile);
    const classes = detectFormLevel(srcFile);
    const fileUrl = `/books/${encodeURIComponent(sanitizedName)}`;

    const newMaterial = {
      id: `mat-pub-book-${Date.now()}-${index++}`,
      title,
      subject,
      classes,
      category: "Tanzania Curriculum",
      curriculum: "Tanzania Curriculum",
      section: "tanzania_curriculum",
      isTanzaniaCurriculum: true,
      uploadedAt: "National Curriculum Repository",
      templateType: "notes",
      rawText: `Official digital curriculum textbook for ${subject} (${classes}). Aligned with the Tanzania Institute of Education (TIE) syllabus and NECTA exam format. Available publicly to all students across Tanzania under the Tanzania Curriculum Library.`,
      visibility: "public",
      uploadedBy: "Ministry of Education & National Library",
      isTeacherUpload: true,
      downloadUrl: fileUrl,
      directUrl: fileUrl,
      readOnlineUrl: fileUrl,
      downloadPdfUrl: fileUrl,
      fileSize: formatBytes(stat.size),
      isFreeOnline: true,
      source: "Tanzania Curriculum",
      arrangedContent: {
        summary: `Official Tanzania Curriculum textbook "${title}" for ${subject} (${classes}). Aligned with NECTA syllabus objectives, key competencies, and practical exercises.`,
        keyPoints: [
          `Approved curriculum textbook for Tanzanian secondary schools (${classes}).`,
          `Subject: ${subject} · Aligned with TIE (Tanzania Institute of Education) guidelines.`,
          `Covers foundational theory, practical experiments, worked examples, and review questions.`,
          `Interactive reading and revision enabled with Baraka AI study assistant.`
        ],
        definitions: [
          {
            term: "Curriculum Alignment",
            definition: "Conforming strictly to the official educational guidelines issued by the Ministry of Education, Science and Technology (MoEST) and TIE."
          },
          {
            term: "NECTA Competence",
            definition: "Mastery of essential knowledge, problem-solving techniques, and analytical skills tested in national Form 2 (FTNA), Form 4 (CSEE), and Form 6 (ACSEE) examinations."
          }
        ]
      },
      quizQuestions: [
        {
          question: `Which educational authority sets the official syllabus and curriculum standards for "${title}" in Tanzania?`,
          options: [
            "Tanzania Institute of Education (TIE / TEA)",
            "East African Community Secretariat",
            "UNESCO Regional Bureau",
            "Private Publishers Association"
          ],
          correctIndex: 0,
          explanation: "In Tanzania, the Tanzania Institute of Education (TIE) is mandated to design curricula, develop educational materials, and approve syllabi for schools."
        },
        {
          question: `What is the target study level for this curriculum document "${title}"?`,
          options: [
            classes,
            "Tertiary University Degree",
            "Vocational Trade Apprenticeship",
            "Preschool Nursery"
          ],
          correctIndex: 0,
          explanation: `This textbook is designated for ${classes} according to the official curriculum distribution.`
        }
      ]
    };

    // Avoid duplicate title if already present
    const existingIdx = db.materials.findIndex((m: any) => m.title.toLowerCase() === title.toLowerCase() || m.downloadUrl === fileUrl);
    if (existingIdx >= 0) {
      db.materials[existingIdx] = { ...db.materials[existingIdx], ...newMaterial };
    } else {
      db.materials.unshift(newMaterial);
    }

    importedBooks.push(newMaterial);
  }

  // Save database
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), "utf-8");
  console.log(`[BOOK IMPORTER] Successfully imported ${importedBooks.length} books into public student library!`);
  return { imported: importedBooks.length, books: importedBooks };
}

// CLI handler: npx tsx scripts/import_books_zip.ts <path_to_archive_or_folder>
if (process.argv[2]) {
  const inputArg = process.argv[2];
  const targetBooksDir = path.resolve("./public/books");

  const isArchive = inputArg.toLowerCase().endsWith(".zip") ||
    inputArg.toLowerCase().endsWith(".7z") ||
    inputArg.toLowerCase().endsWith(".rar") ||
    inputArg.toLowerCase().endsWith(".tar.gz");

  if (isArchive) {
    console.log(`[ARCHIVE EXTRACT] Unpacking archive: ${inputArg}...`);
    const tempExtractDir = path.resolve("./data/books_extracted");
    if (!fs.existsSync(tempExtractDir)) fs.mkdirSync(tempExtractDir, { recursive: true });
    
    try {
      execSync(`7z x -y "${inputArg}" -o"${tempExtractDir}"`);
    } catch {
      execSync(`unzip -o -q "${inputArg}" -d "${tempExtractDir}"`);
    }

    console.log(`[ARCHIVE EXTRACT] Finished extracting. Indexing books into public library...`);
    const result = importBooksFromDirectory(tempExtractDir, targetBooksDir);
    console.log(`[SUCCESS] ${result.imported} books are now available publicly to every student.`);
  } else if (fs.existsSync(inputArg) && fs.statSync(inputArg).isDirectory()) {
    console.log(`[FOLDER IMPORT] Scanning directory: ${inputArg}...`);
    const result = importBooksFromDirectory(inputArg, targetBooksDir);
    console.log(`[SUCCESS] ${result.imported} books are now available publicly to every student.`);
  } else {
    console.error(`File or directory not found: ${inputArg}`);
  }
}
