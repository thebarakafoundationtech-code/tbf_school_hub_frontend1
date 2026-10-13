const fs = require('fs');
const path = require('path');

const coversDir = path.resolve('./public/covers');
if (!fs.existsSync(coversDir)) fs.mkdirSync(coversDir, { recursive: true });

const SUBJECT_THEMES = {
  "Biology": {
    bgGrad: ["#064e3b", "#047857", "#065f46"],
    accent: "#34d399",
    badgeBg: "#065f46",
    symbol: `<circle cx="150" cy="220" r="45" fill="none" stroke="#34d399" stroke-width="4" stroke-dasharray="6,4"/>
             <path d="M125 220 Q150 175 175 220 Q150 265 125 220" fill="#34d399" opacity="0.4"/>
             <path d="M150 175 V265" stroke="#ffffff" stroke-width="3"/>
             <circle cx="150" cy="220" r="8" fill="#fef08a"/>
             <path d="M110 200 Q130 190 150 200" stroke="#a7f3d0" stroke-width="2" fill="none"/>
             <path d="M150 240 Q170 250 190 240" stroke="#a7f3d0" stroke-width="2" fill="none"/>`
  },
  "Chemistry": {
    bgGrad: ["#1e1b4b", "#2563eb", "#1d4ed8"],
    accent: "#60a5fa",
    badgeBg: "#1e3a8a",
    symbol: `<path d="M135 170 H165 V195 L190 250 A15 15 0 0 1 178 270 H122 A15 15 0 0 1 110 250 L135 195 Z" fill="none" stroke="#60a5fa" stroke-width="4"/>
             <path d="M125 240 L175 240 L168 258 H132 Z" fill="#60a5fa" opacity="0.5"/>
             <circle cx="140" cy="230" r="4" fill="#ffffff"/>
             <circle cx="155" cy="220" r="3" fill="#ffffff"/>
             <circle cx="150" cy="245" r="5" fill="#fef08a"/>
             <circle cx="150" cy="165" r="3" fill="#60a5fa"/>`
  },
  "Physics": {
    bgGrad: ["#0f172a", "#1e293b", "#312e81"],
    accent: "#f59e0b",
    badgeBg: "#1e1b4b",
    symbol: `<ellipse cx="150" cy="220" rx="60" ry="22" fill="none" stroke="#f59e0b" stroke-width="3" transform="rotate(30 150 220)"/>
             <ellipse cx="150" cy="220" rx="60" ry="22" fill="none" stroke="#60a5fa" stroke-width="3" transform="rotate(-30 150 220)"/>
             <circle cx="150" cy="220" r="14" fill="#fbbf24"/>
             <circle cx="185" cy="200" r="5" fill="#60a5fa"/>
             <circle cx="115" cy="240" r="5" fill="#f59e0b"/>`
  },
  "Basic Mathematics": {
    bgGrad: ["#172554", "#1e3a8a", "#1d4ed8"],
    accent: "#38bdf8",
    badgeBg: "#1e293b",
    symbol: `<text x="150" y="210" font-family="serif" font-size="52" font-weight="bold" fill="#38bdf8" text-anchor="middle">∑</text>
             <text x="110" y="255" font-family="serif" font-size="34" font-weight="bold" fill="#fef08a" text-anchor="middle">π</text>
             <text x="190" y="255" font-family="serif" font-size="36" font-weight="bold" fill="#ffffff" text-anchor="middle">√x</text>
             <circle cx="150" cy="220" r="55" fill="none" stroke="#38bdf8" stroke-width="2" stroke-dasharray="4,4"/>`
  },
  "Kiswahili": {
    bgGrad: ["#4c0519", "#881337", "#9f1239"],
    accent: "#fbbf24",
    badgeBg: "#701a75",
    symbol: `<path d="M110 240 Q150 215 190 240 V185 Q150 160 110 185 Z" fill="#fbbf24" opacity="0.3"/>
             <path d="M150 175 V250" stroke="#fbbf24" stroke-width="3"/>
             <path d="M110 185 Q150 160 190 185" stroke="#ffffff" stroke-width="3" fill="none"/>
             <path d="M110 240 Q150 215 190 240" stroke="#ffffff" stroke-width="3" fill="none"/>
             <text x="150" y="275" font-family="sans-serif" font-size="14" font-weight="bold" fill="#fef08a" text-anchor="middle">FASIHI &amp; SARUFI</text>`
  },
  "English Language": {
    bgGrad: ["#311042", "#581c87", "#3b0764"],
    accent: "#f472b6",
    badgeBg: "#4a044e",
    symbol: `<rect x="115" y="175" width="70" height="90" rx="4" fill="none" stroke="#f472b6" stroke-width="3"/>
             <line x1="125" y1="195" x2="175" y2="195" stroke="#ffffff" stroke-width="2"/>
             <line x1="125" y1="210" x2="175" y2="210" stroke="#ffffff" stroke-width="2"/>
             <line x1="125" y1="225" x2="165" y2="225" stroke="#ffffff" stroke-width="2"/>
             <text x="150" y="255" font-family="serif" font-size="20" font-weight="bold" fill="#fbbf24" text-anchor="middle">A B C</text>`
  },
  "Literature in English": {
    bgGrad: ["#3b0764", "#6b21a8", "#4c1d95"],
    accent: "#fbcfe8",
    badgeBg: "#581c87",
    symbol: `<path d="M110 235 Q150 215 190 235 V180 Q150 160 110 180 Z" fill="#fbcfe8" opacity="0.4"/>
             <path d="M150 170 V245" stroke="#ffffff" stroke-width="3"/>
             <path d="M175 160 Q195 180 165 210" stroke="#fde047" stroke-width="3" fill="none"/>
             <circle cx="165" cy="210" r="3" fill="#fde047"/>`
  },
  "Geography": {
    bgGrad: ["#0c4a6e", "#0369a1", "#0284c7"],
    accent: "#38bdf8",
    badgeBg: "#075985",
    symbol: `<circle cx="150" cy="220" r="48" fill="none" stroke="#38bdf8" stroke-width="3"/>
             <ellipse cx="150" cy="220" rx="20" ry="48" fill="none" stroke="#ffffff" stroke-width="2"/>
             <line x1="102" y1="220" x2="198" y2="220" stroke="#ffffff" stroke-width="2"/>
             <line x1="110" y1="200" x2="190" y2="200" stroke="#38bdf8" stroke-width="1.5"/>
             <line x1="110" y1="240" x2="190" y2="240" stroke="#38bdf8" stroke-width="1.5"/>`
  },
  "History": {
    bgGrad: ["#451a03", "#78350f", "#92400e"],
    accent: "#f59e0b",
    badgeBg: "#7c2d12",
    symbol: `<circle cx="150" cy="220" r="45" fill="none" stroke="#f59e0b" stroke-width="4"/>
             <path d="M150 185 V220 L172 235" stroke="#ffffff" stroke-width="4" stroke-linecap="round"/>
             <circle cx="150" cy="220" r="5" fill="#f59e0b"/>
             <path d="M120 260 L180 260" stroke="#fde68a" stroke-width="3"/>`
  },
  "Civics": {
    bgGrad: ["#14532d", "#15803d", "#166534"],
    accent: "#fde047",
    badgeBg: "#1e3a8a",
    symbol: `<path d="M150 170 L185 185 V225 Q185 255 150 270 Q115 255 115 225 V185 Z" fill="#1e3a8a" stroke="#fde047" stroke-width="3"/>
             <path d="M150 190 V250" stroke="#ffffff" stroke-width="2.5"/>
             <path d="M130 215 H170" stroke="#ffffff" stroke-width="2.5"/>`
  },
  "Commerce": {
    bgGrad: ["#134e4a", "#0f766e", "#115e59"],
    accent: "#2dd4bf",
    badgeBg: "#042f2e",
    symbol: `<rect x="115" y="185" width="70" height="65" rx="6" fill="none" stroke="#2dd4bf" stroke-width="3"/>
             <path d="M135 185 V175 Q135 168 150 168 Q165 168 165 175 V185" stroke="#ffffff" stroke-width="2.5" fill="none"/>
             <line x1="115" y1="215" x2="185" y2="215" stroke="#2dd4bf" stroke-width="2"/>
             <circle cx="150" cy="225" r="5" fill="#fde047"/>`
  },
  "Bookkeeping": {
    bgGrad: ["#1e293b", "#334155", "#475569"],
    accent: "#38bdf8",
    badgeBg: "#0f172a",
    symbol: `<rect x="110" y="175" width="80" height="85" rx="5" fill="#0f172a" stroke="#38bdf8" stroke-width="3"/>
             <line x1="125" y1="195" x2="175" y2="195" stroke="#ffffff" stroke-width="2"/>
             <line x1="125" y1="210" x2="175" y2="210" stroke="#60a5fa" stroke-width="2"/>
             <line x1="125" y1="225" x2="175" y2="225" stroke="#ffffff" stroke-width="2"/>
             <line x1="125" y1="240" x2="155" y2="240" stroke="#34d399" stroke-width="2"/>`
  },
  "Agriculture": {
    bgGrad: ["#14532d", "#166534", "#15803d"],
    accent: "#86efac",
    badgeBg: "#052e16",
    symbol: `<path d="M150 260 Q150 200 120 180 Q150 205 150 260" fill="#86efac"/>
             <path d="M150 260 Q150 200 180 180 Q150 205 150 260" fill="#4ade80"/>
             <line x1="150" y1="175" x2="150" y2="265" stroke="#ffffff" stroke-width="3"/>
             <circle cx="150" cy="170" r="6" fill="#fde047"/>`
  },
  "Animal Health & Agriculture": {
    bgGrad: ["#14532d", "#15803d", "#047857"],
    accent: "#a7f3d0",
    badgeBg: "#064e3b",
    symbol: `<circle cx="150" cy="220" r="45" fill="none" stroke="#a7f3d0" stroke-width="3"/>
             <path d="M135 220 H165 M150 205 V235" stroke="#ffffff" stroke-width="6" stroke-linecap="round"/>
             <circle cx="130" cy="190" r="5" fill="#fde047"/>
             <circle cx="170" cy="190" r="5" fill="#fde047"/>`
  },
  "Computer Science & ICT": {
    bgGrad: ["#022c22", "#064e3b", "#0f766e"],
    accent: "#2dd4bf",
    badgeBg: "#042f2e",
    symbol: `<rect x="110" y="180" width="80" height="55" rx="4" fill="#0f172a" stroke="#2dd4bf" stroke-width="3"/>
             <path d="M135 235 L125 255 H175 L165 235" fill="#2dd4bf"/>
             <line x1="120" y1="255" x2="180" y2="255" stroke="#ffffff" stroke-width="3"/>
             <text x="150" y="215" font-family="monospace" font-size="16" font-weight="bold" fill="#a7f3d0" text-anchor="middle">&lt;CODE/&gt;</text>`
  },
  "Food & Human Nutrition": {
    bgGrad: ["#7c2d12", "#c2410c", "#ea580c"],
    accent: "#fdba74",
    badgeBg: "#431407",
    symbol: `<circle cx="150" cy="220" r="45" fill="none" stroke="#fdba74" stroke-width="3"/>
             <path d="M130 195 V245 M125 195 H135 M170 195 V245 Q160 215 170 195" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
             <circle cx="150" cy="220" r="8" fill="#fde047"/>`
  },
  "Chinese Language": {
    bgGrad: ["#7f1d1d", "#991b1b", "#b91c1c"],
    accent: "#fde047",
    badgeBg: "#450a0a",
    symbol: `<circle cx="150" cy="220" r="45" fill="none" stroke="#fde047" stroke-width="3"/>
             <text x="150" y="235" font-family="sans-serif" font-size="44" font-weight="bold" fill="#fde047" text-anchor="middle">中文</text>`
  }
};

const DEFAULT_THEME = {
  bgGrad: ["#1e293b", "#334155", "#1e293b"],
  accent: "#D69B67",
  badgeBg: "#0f172a",
  symbol: `<circle cx="150" cy="220" r="45" fill="none" stroke="#D69B67" stroke-width="3"/>
           <path d="M125 220 H175" stroke="#ffffff" stroke-width="3"/>`
};

function generateSvgCover(title, subject, formLevel) {
  const theme = SUBJECT_THEMES[subject] || DEFAULT_THEME;
  const safeTitle = title.toUpperCase().replace(/&/g, "&amp;");
  const safeSubject = subject.toUpperCase().replace(/&/g, "&amp;");
  const safeForm = formLevel.toUpperCase().replace(/&/g, "&amp;");

  // Format title into 1 or 2 lines for crisp cover typography
  const words = safeTitle.split(" ");
  let line1 = words.slice(0, 3).join(" ");
  let line2 = words.slice(3).join(" ");
  if (!line2 && words.length > 2) {
    line1 = words.slice(0, 2).join(" ");
    line2 = words.slice(2).join(" ");
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 420" width="100%" height="100%">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${theme.bgGrad[0]}"/>
      <stop offset="50%" stop-color="${theme.bgGrad[1]}"/>
      <stop offset="100%" stop-color="${theme.bgGrad[2]}"/>
    </linearGradient>
    <linearGradient id="tzFlag" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#1eb53a"/>
      <stop offset="35%" stop-color="#fcd116"/>
      <stop offset="50%" stop-color="#000000"/>
      <stop offset="65%" stop-color="#fcd116"/>
      <stop offset="100%" stop-color="#00a3dd"/>
    </linearGradient>
    <linearGradient id="goldBanner" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#D69B67"/>
      <stop offset="50%" stop-color="#fde047"/>
      <stop offset="100%" stop-color="#D69B67"/>
    </linearGradient>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#000000" flood-opacity="0.5"/>
    </filter>
  </defs>

  <!-- Background Base -->
  <rect width="300" height="420" rx="12" fill="url(#bg)"/>

  <!-- Left Spine Shadow Effect for 3D Textbook Depth -->
  <rect x="0" y="0" width="16" height="420" fill="#000000" opacity="0.35"/>
  <line x1="16" y1="0" x2="16" y2="420" stroke="#ffffff" stroke-opacity="0.15" stroke-width="1.5"/>

  <!-- Tanzania National Flag Stripe -->
  <rect x="16" y="0" width="284" height="7" fill="url(#tzFlag)"/>

  <!-- Official Top Header Banner -->
  <g opacity="0.9">
    <rect x="24" y="16" width="252" height="24" rx="4" fill="#000000" opacity="0.35"/>
    <text x="150" y="32" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="9" font-weight="900" fill="#fde047" letter-spacing="1.5" text-anchor="middle">TANZANIA INSTITUTE OF EDUCATION</text>
  </g>

  <!-- Form Level Badge -->
  <g transform="translate(150, 68)" filter="url(#shadow)">
    <rect x="-60" y="-14" width="120" height="28" rx="14" fill="${theme.badgeBg}" stroke="${theme.accent}" stroke-width="2"/>
    <text x="0" y="4" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="12" font-weight="900" fill="#ffffff" letter-spacing="1" text-anchor="middle">${safeForm}</text>
  </g>

  <!-- Subject Subtitle -->
  <text x="150" y="112" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="11" font-weight="800" fill="${theme.accent}" letter-spacing="1" text-anchor="middle">${safeSubject}</text>

  <!-- Main Title Area -->
  <g filter="url(#shadow)">
    <text x="150" y="${line2 ? '138' : '145'}" font-family="'Cinzel', 'Playfair Display', Georgia, serif" font-size="${line2 ? '18' : '20'}" font-weight="bold" fill="#ffffff" text-anchor="middle">${line1}</text>
    ${line2 ? `<text x="150" y="160" font-family="'Cinzel', 'Playfair Display', Georgia, serif" font-size="17" font-weight="bold" fill="#fef08a" text-anchor="middle">${line2}</text>` : ''}
  </g>

  <!-- Subject Vector Graphic Symbol -->
  <g transform="translate(0, 5)">
    ${theme.symbol}
  </g>

  <!-- Bottom Divider Line -->
  <line x1="36" y1="350" x2="264" y2="350" stroke="${theme.accent}" stroke-width="1.5" opacity="0.5"/>

  <!-- Bottom Official Badge and Metadata -->
  <rect x="28" y="362" width="244" height="38" rx="8" fill="#000000" opacity="0.45"/>
  <text x="40" y="380" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="8.5" font-weight="800" fill="#ffffff" letter-spacing="0.5">STUDENT'S BOOK · FORM LEVEL</text>
  <text x="40" y="393" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="8" font-weight="600" fill="${theme.accent}">NECTA &amp; TIE SYLLABUS COMPLIANT</text>

  <!-- Circular Gold Quality Stamp -->
  <g transform="translate(242, 381)">
    <circle cx="0" cy="0" r="14" fill="${theme.badgeBg}" stroke="#fde047" stroke-width="1.5"/>
    <text x="0" y="-3" font-family="sans-serif" font-size="6" font-weight="900" fill="#fde047" text-anchor="middle">TIE</text>
    <text x="0" y="5" font-family="sans-serif" font-size="5" font-weight="800" fill="#ffffff" text-anchor="middle">APPROVED</text>
  </g>
</svg>`;
}

async function run() {
  const dbPath = path.resolve('./data/database.json');
  if (!fs.existsSync(dbPath)) {
    console.error("database.json not found");
    return;
  }

  const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  let updatedCount = 0;

  for (const mat of db.materials) {
    if (mat.isTanzaniaCurriculum || mat.curriculum === "Tanzania Curriculum" || mat.category === "Tanzania Curriculum") {
      const formKey = (mat.classes || "Form 1").replace(/[^a-zA-Z0-9]/g, "_");
      const titleKey = (mat.title || "book").replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
      const filename = `cover_${formKey}_${titleKey}.svg`;
      const filePath = path.join(coversDir, filename);

      const svgContent = generateSvgCover(mat.title, mat.subject, mat.classes);
      fs.writeFileSync(filePath, svgContent, 'utf8');

      mat.coverUrl = `/covers/${filename}`;
      mat.cover_image = `/covers/${filename}`;
      updatedCount++;
    }
  }

  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
  console.log(`[SUCCESS] Generated ${updatedCount} SVG textbook covers in public/covers/ and updated database.json!`);
}

run().catch(console.error);
