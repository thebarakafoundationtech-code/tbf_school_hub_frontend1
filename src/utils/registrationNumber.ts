/**
 * TBF School Hub - Standard Registration Number Generator
 *
 * Rules:
 * 1. School automatic registration number:
 *    Format: TBF/<school_name_3_letters_in_short_form>/<enroll_number>/<current_year>
 *    Example: TBF/MIH/001/2026 for school "mihama"
 *
 * 2. Student automatic registration number (for student with related school):
 *    Format: TBF/<school_3_letters_in_short_form>/<student_number>/<current_year>
 *    Example: TBF/MIH/0001/2026 or TBF/MIH/0010/2026
 *
 * 3. Solo Learner registration number:
 *    "for solo learner dont use school number" (no school code)
 *    Format: TBF/<student_number>/<current_year>
 *    Example: TBF/0001/2026 or TBF/0010/2026
 */

/**
 * Extracts or generates the 3-letter school short code
 * Examples:
 *   getSchoolCode("TBF/MIH/001/2026") => "MIH"
 *   getSchoolCode("mihama") => "MIH"
 *   getSchoolCode("Baraka Secondary School") => "BAR"
 *   getSchoolCode("MIH") => "MIH"
 */
export function getSchoolCode(
  schoolIdentifier?: string | null,
  fallback: string = "MIH"
): string {
  if (!schoolIdentifier) return fallback;
  const trimmed = String(schoolIdentifier).trim();
  if (!trimmed) return fallback;

  // 1. If it's already a TBF registration number: TBF/MIH/001/2026 or TBF/MIH/0001/2026
  const parts = trimmed.split("/");
  if (parts.length >= 3 && parts[0] === "TBF") {
    if (/^[A-Za-z]{2,5}$/.test(parts[1])) {
      return parts[1].toUpperCase();
    }
  }

  // 2. If it's already a 3-letter code
  if (/^[A-Za-z]{3}$/.test(trimmed)) {
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
 * Example: generateSchoolRegNo("mihama", 1, 2026) => "TBF/MIH/001/2026"
 */
export function generateSchoolRegNo(
  schoolName: string,
  schoolIndex: number = 1,
  year: number = new Date().getFullYear()
): string {
  const shortCode = getSchoolCode(schoolName, "SCH");
  const enrollNo = String(schoolIndex).padStart(3, "0");
  return `TBF/${shortCode}/${enrollNo}/${year}`;
}

/**
 * Extracts the 3-digit school number from a school regNo or school string (legacy compatibility)
 * E.g. "TBF/MIH/001/2026" => "001"
 */
export function getSchoolNumber(schoolRegNo?: string | null, fallbackIndex: number = 1): string {
  if (!schoolRegNo) return String(fallbackIndex).padStart(3, "0");
  const trimmed = String(schoolRegNo).trim();
  const parts = trimmed.split("/");
  if (parts.length >= 4 && /^\d+$/.test(parts[2])) {
    return parts[2].padStart(3, "0");
  }
  const match = trimmed.match(/\d+/);
  if (match) {
    const num = parseInt(match[0], 10);
    return String(num % 1000 || fallbackIndex).padStart(3, "0");
  }
  return String(fallbackIndex).padStart(3, "0");
}

/**
 * Generates an automatic Student Registration Number
 * For school students: TBF/<school_code>/<student_number>/<year>
 *   Example: generateStudentRegNo("mihama", 10, 2026) => "TBF/MIH/0010/2026"
 *   Example: generateStudentRegNo("TBF/MIH/001/2026", 1, 2026) => "TBF/MIH/0001/2026"
 *
 * For solo learners:   TBF/<student_number>/<year> (no school code)
 *   Example: generateStudentRegNo(null, 1, 2026, true) => "TBF/0001/2026"
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
    return `TBF/${studentEnrollNo}/${year}`;
  }

  // School short code (e.g. MIH for Mihama)
  const schoolCode = getSchoolCode(typeof schoolIdentifier === "number" ? "MIH" : schoolIdentifier, "MIH");

  return `TBF/${schoolCode}/${studentEnrollNo}/${year}`;
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
    // Format 1 (Solo learner): TBF/0010/2026 -> parts[1] is 0010
    if (parts.length === 3 && parts[0] === "TBF" && /^\d+$/.test(parts[1])) {
      const val = parseInt(parts[1], 10);
      if (val > maxNumber) maxNumber = val;
    }
    // Format 2 (School student): TBF/MIH/0010/2026 -> parts[2] is 0010
    // (Also supports TBF/001/0010/2026)
    else if (parts.length >= 4 && parts[0] === "TBF" && /^\d+$/.test(parts[2])) {
      const val = parseInt(parts[2], 10);
      if (val > maxNumber) maxNumber = val;
    } else {
      // Fallback: search for any trailing digits
      const match = reg.match(/\d+/g);
      if (match && match.length > 0) {
        const lastDigits = parseInt(match[match.length - 1], 10);
        if (lastDigits > 0 && lastDigits < 10000 && lastDigits > maxNumber) {
          maxNumber = lastDigits;
        }
      }
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
    // Format: TBF/MIH/001/2026 -> parts[2] is 001
    if (parts.length >= 4 && /^\d+$/.test(parts[2])) {
      const val = parseInt(parts[2], 10);
      if (val > maxNumber) maxNumber = val;
    }
  }
  return maxNumber > 0 ? maxNumber + 1 : ((existingSchools?.length || 0) + 1);
}
