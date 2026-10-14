/**
 * Tanzania Curriculum Official Textbook Cover Engine
 * Provides deterministic, high-resolution SVG covers aligned with TIE & NECTA standards.
 * Guaranteed 100% cover availability with subject-specific palettes and vector emblems.
 */

interface SubjectTheme {
  primary: string;
  secondary: string;
  accent: string;
  badgeBg: string;
  badgeBorder: string;
  textLight: string;
  iconSvg: string;
}

function getSubjectTheme(subjectRaw: string): SubjectTheme {
  const s = (subjectRaw || "").toLowerCase();

  // Mathematics / Basic Math / Hisabati
  if (s.includes("math") || s.includes("hisabati") || s.includes("calc")) {
    return {
      primary: "#78350f",
      secondary: "#b45309",
      accent: "#fde047",
      badgeBg: "#92400e",
      badgeBorder: "#fde047",
      textLight: "#fef3c7",
      iconSvg: `
        <circle cx="150" cy="225" r="44" fill="none" stroke="#fde047" stroke-width="3" stroke-dasharray="6,4"/>
        <path d="M125 210 L175 240 M175 210 L125 240" stroke="#fde047" stroke-width="4" stroke-linecap="round"/>
        <text x="150" y="235" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="28" font-weight="900" fill="#ffffff" text-anchor="middle">∑</text>
      `
    };
  }

  // Biology / Biolojia
  if (s.includes("bio") || s.includes("biolojia") || s.includes("life")) {
    return {
      primary: "#064e3b",
      secondary: "#047857",
      accent: "#34d399",
      badgeBg: "#065f46",
      badgeBorder: "#34d399",
      textLight: "#d1fae5",
      iconSvg: `
        <circle cx="150" cy="225" r="44" fill="none" stroke="#34d399" stroke-width="3" stroke-dasharray="6,4"/>
        <path d="M130 225 Q150 185 170 225 Q150 265 130 225" fill="#34d399" fill-opacity="0.3" stroke="#34d399" stroke-width="3"/>
        <line x1="150" y1="185" x2="150" y2="265" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
        <circle cx="150" cy="225" r="6" fill="#fde047"/>
      `
    };
  }

  // Chemistry / Kemia
  if (s.includes("chem") || s.includes("kemia")) {
    return {
      primary: "#312e81",
      secondary: "#4338ca",
      accent: "#818cf8",
      badgeBg: "#3730a3",
      badgeBorder: "#a5b4fc",
      textLight: "#e0e7ff",
      iconSvg: `
        <circle cx="150" cy="225" r="44" fill="none" stroke="#818cf8" stroke-width="3" stroke-dasharray="6,4"/>
        <path d="M142 195 L158 195 L158 212 L172 245 C174 250 170 255 164 255 L136 255 C130 255 126 250 128 245 L142 212 Z" fill="#818cf8" fill-opacity="0.35" stroke="#ffffff" stroke-width="3"/>
        <circle cx="147" cy="242" r="3.5" fill="#fde047"/>
        <circle cx="156" cy="236" r="2.5" fill="#fde047"/>
      `
    };
  }

  // Physics / Fizikia
  if (s.includes("phys") || s.includes("fizikia")) {
    return {
      primary: "#0f172a",
      secondary: "#0369a1",
      accent: "#38bdf8",
      badgeBg: "#0c4a6e",
      badgeBorder: "#38bdf8",
      textLight: "#e0f2fe",
      iconSvg: `
        <ellipse cx="150" cy="225" rx="46" ry="18" fill="none" stroke="#38bdf8" stroke-width="2.5" transform="rotate(-30 150 225)"/>
        <ellipse cx="150" cy="225" rx="46" ry="18" fill="none" stroke="#38bdf8" stroke-width="2.5" transform="rotate(30 150 225)"/>
        <circle cx="150" cy="225" r="9" fill="#fde047"/>
      `
    };
  }

  // Geography / Jiografia
  if (s.includes("geog") || s.includes("jiografia")) {
    return {
      primary: "#14532d",
      secondary: "#15803d",
      accent: "#4ade80",
      badgeBg: "#166534",
      badgeBorder: "#4ade80",
      textLight: "#dcfce7",
      iconSvg: `
        <circle cx="150" cy="225" r="42" fill="none" stroke="#4ade80" stroke-width="3"/>
        <ellipse cx="150" cy="225" rx="42" ry="16" fill="none" stroke="#4ade80" stroke-width="2"/>
        <line x1="150" y1="183" x2="150" y2="267" stroke="#ffffff" stroke-width="2"/>
        <line x1="108" y1="225" x2="192" y2="225" stroke="#ffffff" stroke-width="2"/>
      `
    };
  }

  // History / Historia
  if (s.includes("hist") || s.includes("historia")) {
    return {
      primary: "#7f1d1d",
      secondary: "#991b1b",
      accent: "#f87171",
      badgeBg: "#831843",
      badgeBorder: "#fca5a5",
      textLight: "#fee2e2",
      iconSvg: `
        <circle cx="150" cy="225" r="44" fill="none" stroke="#f87171" stroke-width="3" stroke-dasharray="6,4"/>
        <path d="M132 205 L168 205 L168 245 L132 245 Z" fill="#f87171" fill-opacity="0.3" stroke="#ffffff" stroke-width="2.5"/>
        <path d="M128 248 L172 248" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/>
        <path d="M150 195 L150 205" stroke="#fde047" stroke-width="3" stroke-linecap="round"/>
      `
    };
  }

  // Kiswahili / Fasihi
  if (s.includes("kisw") || s.includes("swahili") || s.includes("fasihi")) {
    return {
      primary: "#134e4a",
      secondary: "#0f766e",
      accent: "#2dd4bf",
      badgeBg: "#115e59",
      badgeBorder: "#5eead4",
      textLight: "#ccfbf1",
      iconSvg: `
        <circle cx="150" cy="225" r="44" fill="none" stroke="#2dd4bf" stroke-width="3" stroke-dasharray="6,4"/>
        <path d="M125 210 Q150 220 175 210 L175 245 Q150 255 125 245 Z" fill="#2dd4bf" fill-opacity="0.3" stroke="#ffffff" stroke-width="2.5"/>
        <line x1="150" y1="216" x2="150" y2="251" stroke="#fde047" stroke-width="2.5"/>
      `
    };
  }

  // English / Literature
  if (s.includes("eng") || s.includes("literat")) {
    return {
      primary: "#581c87",
      secondary: "#7e22ce",
      accent: "#c084fc",
      badgeBg: "#6b21a8",
      badgeBorder: "#d8b4fe",
      textLight: "#f3e8ff",
      iconSvg: `
        <circle cx="150" cy="225" r="44" fill="none" stroke="#c084fc" stroke-width="3" stroke-dasharray="6,4"/>
        <path d="M126 215 Q150 208 174 215 L174 246 Q150 239 126 246 Z" fill="#c084fc" fill-opacity="0.3" stroke="#ffffff" stroke-width="2.5"/>
        <line x1="150" y1="210" x2="150" y2="242" stroke="#fde047" stroke-width="3"/>
      `
    };
  }

  // Civics / Uraia
  if (s.includes("civic") || s.includes("uraia")) {
    return {
      primary: "#1e1b4b",
      secondary: "#312e81",
      accent: "#a5b4fc",
      badgeBg: "#1e293b",
      badgeBorder: "#cbd5e1",
      textLight: "#e2e8f0",
      iconSvg: `
        <circle cx="150" cy="225" r="44" fill="none" stroke="#a5b4fc" stroke-width="3"/>
        <path d="M130 205 L170 205 L165 245 Q150 255 135 245 Z" fill="#a5b4fc" fill-opacity="0.3" stroke="#ffffff" stroke-width="2.5"/>
        <circle cx="150" cy="222" r="6" fill="#fde047"/>
      `
    };
  }

  // Commerce / Book Keeping / Business Studies
  if (s.includes("comm") || s.includes("book keep") || s.includes("business") || s.includes("biashara")) {
    return {
      primary: "#713f12",
      secondary: "#854d0e",
      accent: "#facc15",
      badgeBg: "#854d0e",
      badgeBorder: "#fde047",
      textLight: "#fef9c3",
      iconSvg: `
        <circle cx="150" cy="225" r="44" fill="none" stroke="#facc15" stroke-width="3" stroke-dasharray="6,4"/>
        <rect x="130" y="208" width="40" height="32" rx="4" fill="#facc15" fill-opacity="0.3" stroke="#ffffff" stroke-width="2.5"/>
        <line x1="150" y1="208" x2="150" y2="240" stroke="#fde047" stroke-width="2"/>
        <line x1="130" y1="224" x2="170" y2="224" stroke="#fde047" stroke-width="2"/>
      `
    };
  }

  // Agriculture / Animal Health / Kilimo
  if (s.includes("agri") || s.includes("animal") || s.includes("kilimo") || s.includes("nutrition")) {
    return {
      primary: "#14532d",
      secondary: "#166534",
      accent: "#86efac",
      badgeBg: "#15803d",
      badgeBorder: "#86efac",
      textLight: "#dcfce7",
      iconSvg: `
        <circle cx="150" cy="225" r="44" fill="none" stroke="#86efac" stroke-width="3" stroke-dasharray="6,4"/>
        <path d="M142 245 Q150 205 165 195 Q165 220 152 235 Z" fill="#86efac" stroke="#ffffff" stroke-width="2.5"/>
        <line x1="145" y1="245" x2="145" y2="252" stroke="#fde047" stroke-width="3" stroke-linecap="round"/>
      `
    };
  }

  // Computer Science / ICT
  if (s.includes("comp") || s.includes("ict") || s.includes("tehama")) {
    return {
      primary: "#0f172a",
      secondary: "#0e7490",
      accent: "#22d3ee",
      badgeBg: "#155e75",
      badgeBorder: "#22d3ee",
      textLight: "#cffafe",
      iconSvg: `
        <circle cx="150" cy="225" r="44" fill="none" stroke="#22d3ee" stroke-width="3" stroke-dasharray="6,4"/>
        <rect x="132" y="208" width="36" height="26" rx="3" fill="#22d3ee" fill-opacity="0.3" stroke="#ffffff" stroke-width="2"/>
        <line x1="144" y1="234" x2="144" y2="242" stroke="#ffffff" stroke-width="2"/>
        <line x1="136" y1="242" x2="152" y2="242" stroke="#ffffff" stroke-width="2"/>
      `
    };
  }

  // Default Tanzanian Curriculum Theme (Navy & Gold)
  return {
    primary: "#15223F",
    secondary: "#1E293B",
    accent: "#D69B67",
    badgeBg: "#24355A",
    badgeBorder: "#D69B67",
    textLight: "#f8fafc",
    iconSvg: `
      <circle cx="150" cy="225" r="44" fill="none" stroke="#D69B67" stroke-width="3" stroke-dasharray="6,4"/>
      <path d="M130 215 L150 205 L170 215 L150 225 Z" fill="#D69B67" fill-opacity="0.4" stroke="#ffffff" stroke-width="2"/>
      <path d="M130 222 L150 232 L170 222" fill="none" stroke="#ffffff" stroke-width="2"/>
      <path d="M130 230 L150 240 L170 230" fill="none" stroke="#ffffff" stroke-width="2"/>
    `
  };
}

function escapeXml(unsafe: string): string {
  return (unsafe || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Generates an authentic, syllabus-compliant SVG textbook cover as an encoded Data URI.
 */
export function generateTzTextbookCoverSvg(
  title: string,
  subject: string,
  classes: string
): string {
  const theme = getSubjectTheme(subject || title);
  const cleanTitle = (title || "National Curriculum Textbook").trim();
  const cleanSubject = (subject || "GENERAL STUDIES").toUpperCase().trim();
  
  // Clean Form level e.g. "FORM 1", "FORM 2", "FORM 3", "FORM 4"
  let cleanForm = (classes || "FORM 1").toUpperCase().trim();
  if (!cleanForm.startsWith("FORM") && !cleanForm.startsWith("KIDATO")) {
    const match = cleanForm.match(/(\d)/);
    if (match) cleanForm = `FORM ${match[1]}`;
    else cleanForm = "FORM LEVEL";
  }

  // Split title if long
  const words = cleanTitle.split(" ");
  let titleLine1 = cleanTitle;
  let titleLine2 = "";
  if (words.length > 3) {
    const mid = Math.ceil(words.length / 2);
    titleLine1 = words.slice(0, mid).join(" ");
    titleLine2 = words.slice(mid).join(" ");
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 420" width="100%" height="100%">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${theme.primary}"/>
      <stop offset="50%" stop-color="${theme.secondary}"/>
      <stop offset="100%" stop-color="${theme.primary}"/>
    </linearGradient>
    <linearGradient id="tzFlag" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#1eb53a"/>
      <stop offset="35%" stop-color="#fcd116"/>
      <stop offset="50%" stop-color="#000000"/>
      <stop offset="65%" stop-color="#fcd116"/>
      <stop offset="100%" stop-color="#00a3dd"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#000000" flood-opacity="0.5"/>
    </filter>
  </defs>

  <!-- Background Base -->
  <rect width="300" height="420" rx="12" fill="url(#bgGrad)"/>

  <!-- Left Spine Shadow Effect for 3D Depth -->
  <rect x="0" y="0" width="16" height="420" fill="#000000" opacity="0.35"/>
  <line x1="16" y1="0" x2="16" y2="420" stroke="#ffffff" stroke-opacity="0.18" stroke-width="1.5"/>

  <!-- Tanzania National Flag Stripe -->
  <rect x="16" y="0" width="284" height="8" fill="url(#tzFlag)"/>

  <!-- Official Top Header Banner -->
  <g opacity="0.95">
    <rect x="24" y="16" width="252" height="24" rx="4" fill="#000000" opacity="0.35"/>
    <text x="150" y="32" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="8.5" font-weight="900" fill="#fde047" letter-spacing="1.5" text-anchor="middle">TANZANIA INSTITUTE OF EDUCATION</text>
  </g>

  <!-- Form Level Badge -->
  <g transform="translate(150, 70)" filter="url(#shadow)">
    <rect x="-65" y="-14" width="130" height="28" rx="14" fill="${theme.badgeBg}" stroke="${theme.badgeBorder}" stroke-width="2"/>
    <text x="0" y="4" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="12" font-weight="900" fill="#ffffff" letter-spacing="1.5" text-anchor="middle">${escapeXml(cleanForm)}</text>
  </g>

  <!-- Subject Subtitle -->
  <text x="150" y="112" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="11" font-weight="800" fill="${theme.accent}" letter-spacing="2" text-anchor="middle">${escapeXml(cleanSubject)}</text>

  <!-- Main Title Area -->
  <g filter="url(#shadow)">
    <text x="150" y="${titleLine2 ? 138 : 148}" font-family="'Cinzel', 'Playfair Display', Georgia, serif" font-size="${titleLine2 ? 16 : 18}" font-weight="bold" fill="#ffffff" text-anchor="middle">${escapeXml(titleLine1)}</text>
    ${titleLine2 ? `<text x="150" y="162" font-family="'Cinzel', 'Playfair Display', Georgia, serif" font-size="15" font-weight="bold" fill="${theme.accent}" text-anchor="middle">${escapeXml(titleLine2)}</text>` : ''}
  </g>

  <!-- Subject Vector Graphic Symbol -->
  <g transform="translate(0, 5)">
    ${theme.iconSvg}
  </g>

  <!-- Bottom Official Footer -->
  <rect x="16" y="356" width="284" height="64" rx="0" fill="#000000" fill-opacity="0.35"/>
  <line x1="16" y1="356" x2="300" y2="356" stroke="${theme.accent}" stroke-width="1.5" stroke-opacity="0.7"/>

  <text x="150" y="378" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="9" font-weight="800" fill="#ffffff" letter-spacing="1" text-anchor="middle">FOR SECONDARY SCHOOLS</text>
  <text x="150" y="394" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="8" font-weight="600" fill="${theme.textLight}" text-anchor="middle">TIE &amp; NECTA Syllabus Aligned · Vitabu Vya Hub</text>
  <text x="150" y="408" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="7.5" font-weight="700" fill="#fde047" letter-spacing="0.5" text-anchor="middle">BARAKA FOUNDATION EDUCATION INITIATIVE</text>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Map of normalized filenames/forms to public cover paths
 */
const KNOWN_COVERS_MAP: Record<string, string> = {
  // Form 1
  "form_1_agriculture": "/covers/cover_Form_1_agriculture_book_1.svg",
  "form_1_animal_health": "/covers/cover_Form_1_animal_health_book_1.svg",
  "form_1_biology": "/covers/cover_Form_1_biology_book_1.svg",
  "form_1_book_keeping": "/covers/cover_Form_1_book_keeping_book_1.svg",
  "form_1_business_studies": "/covers/cover_Form_1_business_studies_book_1.svg",
  "form_1_chemistry": "/covers/cover_Form_1_chemistry_book_1.svg",
  "form_1_computer_science": "/covers/cover_Form_1_computer_science_book_1.svg",
  "form_1_english": "/covers/cover_Form_1_english_book_1.svg",
  "form_1_geography": "/covers/cover_Form_1_geography_book_1.svg",
  "form_1_history": "/covers/cover_Form_1_history_book_1.svg",
  "form_1_kiswahili": "/covers/cover_Form_1_kiswahili_kidato_1.svg",
  "form_1_mathematics": "/covers/cover_Form_1_mathematics_book1.svg",
  "form_1_math": "/covers/cover_Form_1_mathematics_book1.svg",
  "form_1_basic_math": "/covers/cover_Form_1_mathematics_book1.svg",
  "form_1_physics": "/covers/cover_Form_1_physics_book_1.svg",

  // Form 2
  "form_2_agriculture": "/covers/cover_Form_2_agriculture_book_2.svg",
  "form_2_basic_math": "/covers/cover_Form_2_basic_math__book_2.svg",
  "form_2_mathematics": "/covers/cover_Form_2_basic_math__book_2.svg",
  "form_2_math": "/covers/cover_Form_2_basic_math__book_2.svg",
  "form_2_biology": "/covers/cover_Form_2_biology_book_2.svg",
  "form_2_book_keeping": "/covers/cover_Form_2_book_keeping_book_2.svg",
  "form_2_business_studies": "/covers/cover_Form_2_business_studies_book_2.svg",
  "form_2_chemistry": "/covers/cover_Form_2_chemistry_book_2.svg",
  "form_2_chinese": "/covers/cover_Form_2_chinese_book_2.svg",
  "form_2_english": "/covers/cover_Form_2_english_book_2.svg",
  "form_2_food_and_human_nutrition": "/covers/cover_Form_2_food_and_human_nutrition_book_2.svg",
  "form_2_nutrition": "/covers/cover_Form_2_food_and_human_nutrition_book_2.svg",
  "form_2_geography": "/covers/cover_Form_2_geography_book_2.svg",
  "form_2_history": "/covers/cover_Form_2_history_book_2.svg",
  "form_2_kiswahili": "/covers/cover_Form_2_kiswahili_kidato_2.svg",

  // Form 3
  "form_3_agriculture": "/covers/cover_Form_3_agriculture_book_3.svg",
  "form_3_basic_math": "/covers/cover_Form_3_basic_math__book_3.svg",
  "form_3_mathematics": "/covers/cover_Form_3_basic_math__book_3.svg",
  "form_3_math": "/covers/cover_Form_3_basic_math__book_3.svg",
  "form_3_biology": "/covers/cover_Form_3_biology_book_3.svg",
  "form_3_book_keeping": "/covers/cover_Form_3_book_keeping_book_3.svg",
  "form_3_chemistry": "/covers/cover_Form_3_chemistry_book_3.svg",
  "form_3_civics": "/covers/cover_Form_3_civics_book_3.svg",
  "form_3_commerce": "/covers/cover_Form_3_commerce_book_3.svg",
  "form_3_english": "/covers/cover_Form_3_english_book_3.svg",
  "form_3_geography": "/covers/cover_Form_3_geography_book_3.svg",
  "form_3_history": "/covers/cover_Form_3_history_book_3.svg",
  "form_3_ict": "/covers/cover_Form_3_ict_book_3.svg",
  "form_3_kiswahili": "/covers/cover_Form_3_kiswahili_kidato3.svg",
  "form_3_literature_in_english": "/covers/cover_Form_3_literature_in_english_book_3.svg",
  "form_3_literature": "/covers/cover_Form_3_literature_in_english_book_3.svg",
  "form_3_physics": "/covers/cover_Form_3_physics_book_3.svg",

  // Form 4
  "form_4_agriculture": "/covers/cover_Form_4_agriculture_book_4.svg",
  "form_4_basic_math": "/covers/cover_Form_4_basic_maths_book_4.svg",
  "form_4_basic_maths": "/covers/cover_Form_4_basic_maths_book_4.svg",
  "form_4_mathematics": "/covers/cover_Form_4_basic_maths_book_4.svg",
  "form_4_math": "/covers/cover_Form_4_basic_maths_book_4.svg",
  "form_4_biology": "/covers/cover_Form_4_biology_book_4.svg",
  "form_4_book_keeping": "/covers/cover_Form_4_book_keeping_book_4.svg",
  "form_4_chemistry": "/covers/cover_Form_4_chemistry_book_4.svg",
  "form_4_civics": "/covers/cover_Form_4_civics_book_4.svg",
  "form_4_commerce": "/covers/cover_Form_4_commerce_book_4.svg",
  "form_4_english": "/covers/cover_Form_4_english_book_4.svg",
  "form_4_geography": "/covers/cover_Form_4_geography_book_4.svg",
  "form_4_history": "/covers/cover_Form_4_history_book_4.svg",
  "form_4_ict": "/covers/cover_Form_4_ict__u0026_computer_studies_book_4.svg",
  "form_4_computer_studies": "/covers/cover_Form_4_ict__u0026_computer_studies_book_4.svg",
  "form_4_kiswahili": "/covers/cover_Form_4_kiswahili_kidato_4.svg",
  "form_4_literature": "/covers/cover_Form_4_literature_book_3__u0026_4.svg",
  "form_4_physics": "/covers/cover_Form_4_physics_book_4.svg",
};

/**
 * Normalizes text for resilient fuzzy matching without underscore/punctuation discrepancies.
 */
function normalizeSubjKey(str: string): string {
  return (str || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Resolves the optimal cover for any Tanzania textbook.
 * Uses exact coverUrl if present and non-empty, matches against known static SVGs with resilient normalization,
 * or immediately produces an authentic, syllabus-compliant SVG vector Data URI.
 */
export function getSafeTzCoverUrl(book: any): string {
  const cover = (book?.coverUrl || book?.cover_image || "").trim();
  if (cover.length > 0 && !cover.includes("undefined") && !cover.includes("null")) {
    return cover;
  }

  const cls = (book?.classes || book?.level || "").toLowerCase();
  const title = (book?.title || "").toLowerCase();
  const subject = (book?.subject || "").toLowerCase();
  const normTitle = normalizeSubjKey(title);
  const normSubject = normalizeSubjKey(subject);

  // Extract form level number (1, 2, 3, 4, 5, 6)
  let formNum = "1";
  if (cls.includes("6") || title.includes("form 6") || title.includes("kidato 6") || title.includes("book 6")) formNum = "6";
  else if (cls.includes("5") || title.includes("form 5") || title.includes("kidato 5") || title.includes("book 5")) formNum = "5";
  else if (cls.includes("4") || title.includes("form 4") || title.includes("kidato 4") || title.includes("book 4")) formNum = "4";
  else if (cls.includes("3") || title.includes("form 3") || title.includes("kidato 3") || title.includes("book 3")) formNum = "3";
  else if (cls.includes("2") || title.includes("form 2") || title.includes("kidato 2") || title.includes("book 2")) formNum = "2";
  else if (cls.includes("1") || title.includes("form 1") || title.includes("kidato 1") || title.includes("book 1")) formNum = "1";

  // Match subject key with normalized matching (handles book_keeping vs "Book Keeping", etc.)
  for (const [key, path] of Object.entries(KNOWN_COVERS_MAP)) {
    if (key.startsWith(`form_${formNum}_`)) {
      const subKey = key.replace(`form_${formNum}_`, "");
      const normSubKey = normalizeSubjKey(subKey);
      if (
        normTitle.includes(normSubKey) ||
        normSubject.includes(normSubKey) ||
        title.includes(subKey.replace(/_/g, " ")) ||
        subject.includes(subKey.replace(/_/g, " "))
      ) {
        return path;
      }
    }
  }

  // Cross-form subject fallback if specific form SVG is not mapped
  for (const [key, path] of Object.entries(KNOWN_COVERS_MAP)) {
    const rawSub = key.replace(/^form_\d+_/, "");
    const normSub = normalizeSubjKey(rawSub);
    if (normTitle.includes(normSub) || normSubject.includes(normSub)) {
      return path;
    }
  }

  // Guaranteed fallback to high-resolution dynamic vector SVG Data URI
  return generateTzTextbookCoverSvg(
    book?.title || "Curriculum Textbook",
    book?.subject || "General Studies",
    book?.classes || book?.level || `Form ${formNum}`
  );
}

/**
 * Universal image error handler to prevent broken image placeholders
 * and instantly fallback to high-res vector curriculum SVG.
 */
export function handleTzCoverError(e: React.SyntheticEvent<HTMLImageElement>, book: any) {
  const img = e.currentTarget;
  if (!img) return;
  img.onerror = null; // Prevent infinite re-trigger
  img.src = generateTzTextbookCoverSvg(
    book?.title || "Curriculum Textbook",
    book?.subject || "General Studies",
    book?.classes || book?.level || "Form 1"
  );
}

