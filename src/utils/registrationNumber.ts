/**
 * TBF School Hub - Standard Registration Number Generator
 *
 * Rules:
 * 1. School automatic registration number:
 *    Format: TBF/<current_year>/<school_short_code>/<enroll_number>
 *    Example: TBF/2026/SCH/001 or TBF/2026/MIH/001 for school "mihama"
 *
 * 2. Student automatic registration number (for student with related school):
 *    Format: TBF/<current_year>/<school_short_code>/<student_number>
 *    Example: TBF/2026/MIH/0001 or TBF/2026/SCH/0001
 *
 * 3. Solo Learner registration number:
 *    "for solo learner dont use school number" (no school code)
 *    Format: TBF/<current_year>/<student_number>
 *    Example: TBF/2026/0001 or TBF/2026/0010
 */

/**
 * Extracts or generates the 3-letter school short code
 * Examples:
 *   getSchoolCode("TBF/2026/MIH/001") => "MIH"
 *   getSchoolCode("TBF/MIH/001/2026") => "MIH" (legacy)
 *   getSchoolCode("mihama") => "MIH"
 *   getSchoolCode("Baraka Secondary School") => "BAR"
 *   getSchoolCode("MIH") => "MIH"
 */
export function getSchoolCode(
  schoolIdentifier?: string | null,
  fallback: string = "SCH"
): string {
  if (!schoolIdentifier) return fallback;
  const trimmed = String(schoolIdentifier).trim();
  if (!trimmed) return fallback;

  // 1. If it's a TBF registration number
  const parts = trimmed.split("/");
  if (parts.length >= 3 && parts[0] === "TBF") {
    // New format: TBF/2026/MIH/001 -> parts[1] is year, parts[2] is school code
    if (/^\d{4}$/.test(parts[1]) && parts[2] && /^[A-Za-z]{2,5}$/.test(parts[2])) {
      return parts[2].toUpperCase();
    }
    // Legacy format: TBF/MIH/001/2026 -> parts[1] is school code
    if (/^[A-Za-z]{2,5}$/.test(parts[1])) {
      return parts[1].toUpperCase();
    }
  }

  // 2. If it's already a 2-4 letter code
  if (/^[A-Za-z]{2,4}$/.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  // 3. Extract from school name (e.g. "mihama" -> "MIH", "Baraka" -> "BAR")
  const lettersOnly = trimmed.replace(/[^a-zA-Z]/g, "").toUpperCase();
  if (lettersOnly.length >= 3) {
    return lettersOnly.substring(0, 3);
  }
  if (lettersOnly.length > 0) {
    return lettersOnly.padEnd(3, "S");
  }

  return fallback;
}

/**
 * Generates an automatic School Registration Number
 * Example: generateSchoolRegNo("SCH", 1, 2026) => "TBF/2026/SCH/001"
 * Example: generateSchoolRegNo("mihama", 1, 2026) => "TBF/2026/MIH/001"
 */
export function generateSchoolRegNo(
  schoolName: string,
  schoolIndex: number = 1,
  year: number = new Date().getFullYear()
): string {
  const shortCode = getSchoolCode(schoolName, "SCH");
  const enrollNo = String(schoolIndex).padStart(3, "0");
  return `TBF/${year}/${shortCode}/${enrollNo}`;
}

/**
 * Extracts the 3-digit school number from a school regNo or school string
 * E.g. "TBF/2026/MIH/001" => "001"
 * E.g. "TBF/MIH/001/2026" => "001" (legacy)
 */
export function getSchoolNumber(schoolRegNo?: string | null, fallbackIndex: number = 1): string {
  if (!schoolRegNo) return String(fallbackIndex).padStart(3, "0");
  const trimmed = String(schoolRegNo).trim();
  const parts = trimmed.split("/");

  // New format: TBF/2026/MIH/001 -> parts[3] is enroll number
  if (parts.length >= 4 && /^\d{4}$/.test(parts[1]) && /^\d+$/.test(parts[3])) {
    return parts[3].padStart(3, "0");
  }

  // Legacy format: TBF/MIH/001/2026 -> parts[2] is enroll number
  if (parts.length >= 4 && /^\d+$/.test(parts[2])) {
    return parts[2].padStart(3, "0");
  }

  const match = trimmed.match(/\d+/g);
  if (match && match.length > 0) {
    // pick number that is not the 4-digit year
    for (const m of match) {
      if (m.length !== 4) {
        const num = parseInt(m, 10);
        return String(num % 1000 || fallbackIndex).padStart(3, "0");
      }
    }
  }
  return String(fallbackIndex).padStart(3, "0");
}

/**
 * Generates an automatic Student Registration Number
 * For school students: TBF/<year>/<school_code>/<student_number>
 *   Example: generateStudentRegNo("mihama", 10, 2026) => "TBF/2026/MIH/0010"
 *   Example: generateStudentRegNo("TBF/2026/SCH/001", 1, 2026) => "TBF/2026/SCH/0001"
 *
 * For solo learners:   TBF/<year>/<student_number> (no school code)
 *   Example: generateStudentRegNo(null, 1, 2026, true) => "TBF/2026/0001"
 */
export function generateStudentRegNo(
  schoolIdentifier?: string | number | null,
  studentEnrollNumber: number = 1,
  year: number = new Date().getFullYear(),
  isSolo: boolean = false
): string {
  const studentEnrollNo = String(studentEnrollNumber).padStart(4, "0");
  
  const isSoloLearner = isSolo ||
    !schoolIdentifier ||
    schoolIdentifier === "solo" ||
    schoolIdentifier === "none" ||
    String(schoolIdentifier).toLowerCase().includes("solo") ||
    String(schoolIdentifier).toLowerCase().includes("independent") ||
    String(schoolIdentifier).toLowerCase().includes("(no school");

  if (isSoloLearner) {
    // For solo learner, do not use school code or number
    return `TBF/${year}/${studentEnrollNo}`;
  }

  // School short code (e.g. MIH for Mihama, SCH for general)
  const schoolCode = getSchoolCode(typeof schoolIdentifier === "number" ? "SCH" : schoolIdentifier, "SCH");

  return `TBF/${year}/${schoolCode}/${studentEnrollNo}`;
}

/**
 * Parses existing student registration numbers to determine the next sequential student number
 */
export function getNextStudentEnrollNumber(
  existingStudents: Array<{ regNo?: string; student_id?: string; id?: string }> = []
): number {
  let maxNumber = 0;
  for (const s of existingStudents || []) {
    const reg = String(s.regNo || s.student_id || s.id || "");
    const parts = reg.split("/");

    // 3-part format (Solo learner): TBF/2026/0010 or TBF/0010/2026
    if (parts.length === 3 && parts[0] === "TBF") {
      const p1 = parseInt(parts[1], 10);
      const p2 = parseInt(parts[2], 10);
      // New format: TBF/2026/0010 -> parts[1] is year (>= 2000), parts[2] is enroll index (< 2000)
      if (p1 >= 2000 && p1 <= 2099) {
        if (p2 > maxNumber && p2 < 2000) maxNumber = p2;
      }
      // Legacy format: TBF/0010/2026 -> parts[2] is year (>= 2000), parts[1] is enroll index (< 2000)
      else if (p2 >= 2000 && p2 <= 2099) {
        if (p1 > maxNumber && p1 < 2000) maxNumber = p1;
      }
    }
    // 4-part format (School student):
    // New format: TBF/2026/SCH/0010 -> parts[1] is year (>= 2000), parts[3] is student index
    else if (parts.length >= 4 && parts[0] === "TBF" && parseInt(parts[1], 10) >= 2000 && parseInt(parts[1], 10) <= 2099 && /^\d+$/.test(parts[3])) {
      const val = parseInt(parts[3], 10);
      if (val > maxNumber && val < 2000) maxNumber = val;
    }
    // Legacy format: TBF/MIH/0010/2026 -> parts[3] is year (>= 2000), parts[2] is student index
    else if (parts.length >= 4 && parts[0] === "TBF" && /^\d+$/.test(parts[2])) {
      const val = parseInt(parts[2], 10);
      if (val > maxNumber && val < 2000) maxNumber = val;
    }
  }
  return maxNumber > 0 ? maxNumber + 1 : ((existingStudents?.length || 0) + 1);
}

/**
 * Parses existing school registration numbers to determine the next sequential school number
 */
export function getNextSchoolEnrollNumber(
  existingSchools: Array<{ regNo?: string; registration_number?: string; id?: string }> = []
): number {
  let maxNumber = 0;
  for (const s of existingSchools || []) {
    const reg = String(s.regNo || s.registration_number || s.id || "");
    const parts = reg.split("/");

    // New format: TBF/2026/SCH/001 -> parts[1] is year (>= 2000), parts[3] is enroll number
    if (parts.length >= 4 && parts[0] === "TBF" && parseInt(parts[1], 10) >= 2000 && /^\d+$/.test(parts[3])) {
      const val = parseInt(parts[3], 10);
      if (val > maxNumber && val < 2000) maxNumber = val;
    }
    // Legacy format: TBF/MIH/001/2026 -> parts[2] is 001
    else if (parts.length >= 4 && parts[0] === "TBF" && /^\d+$/.test(parts[2])) {
      const val = parseInt(parts[2], 10);
      if (val > maxNumber && val < 2000) maxNumber = val;
    }
  }
  return maxNumber > 0 ? maxNumber + 1 : ((existingSchools?.length || 0) + 1);
}
