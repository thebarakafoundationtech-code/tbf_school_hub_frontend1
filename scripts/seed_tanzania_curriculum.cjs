const fs = require('fs');
const path = require('path');

const dbPath = path.resolve('./data/database.json');
let db = { materials: [] };
if (fs.existsSync(dbPath)) {
  try {
    db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  } catch (e) {
    console.error('Error reading db:', e);
  }
}
if (!Array.isArray(db.materials)) {
  db.materials = [];
}

const curriculumBooks = [
  // --- FORM 1 ---
  {
    id: "tz-curr-math-f1",
    title: "Basic Mathematics for Secondary Schools — Form 1",
    subject: "Basic Mathematics",
    classes: "Form 1",
    form_num: 1,
    category: "Tanzania Curriculum",
    curriculum: "Tanzania Curriculum",
    section: "tanzania_curriculum",
    isTanzaniaCurriculum: true,
    uploadedAt: "Tanzania Institute of Education (TIE)",
    templateType: "notes",
    visibility: "public",
    uploadedBy: "Ministry of Education & TIE",
    isTeacherUpload: true,
    fileSize: "18.4 MB",
    isFreeOnline: true,
    source: "Tanzania Curriculum",
    downloadUrl: "https://ia800100.us.archive.org/30/items/tanzania-secondary-school-textbooks/Basic%20Mathematics%20Form%201%20TIE.pdf",
    readOnlineUrl: "https://archive.org/stream/tanzania-secondary-school-textbooks/Basic%20Mathematics%20Form%201%20TIE.pdf",
    rawText: "Form 1 Basic Mathematics: Numbers (Integers, Decimals, Fractions), Approximations, Geometry, Algebra, Coordinate Geometry, Rates and Ratios. Aligned with NECTA Form 1 curriculum.",
    arrangedContent: {
      summary: "Comprehensive Form 1 Basic Mathematics course book according to the current 2023/2024 Tanzania Institute of Education (TIE) competency-based syllabus. Features worked examples, step-by-step problem sets, and NECTA review questions.",
      keyPoints: [
        "Numbers: Natural numbers, integers, factors, multiples (LCM & GCF), and prime factorization.",
        "Fractions & Decimals: Operations on fractions, terminating vs recurring decimals, and percentages.",
        "Units of Measurement: Metric conversions, perimeter, area, and volume calculation.",
        "Basic Algebra: Simplification of algebraic expressions, linear equations in one variable.",
        "Geometry: Points, lines, angles, triangles, polygons, and compass constructions."
      ],
      definitions: [
        { term: "Prime Number", definition: "A whole number greater than 1 that cannot be formed by multiplying two smaller whole numbers." },
        { term: "LCM (Least Common Multiple)", definition: "The smallest positive integer that is divisible by both or all numbers in a given set." },
        { term: "Linear Equation", definition: "An algebraic equation of degree 1 having at most one root." }
      ]
    },
    quizQuestions: [
      {
        question: "What is the Greatest Common Factor (GCF) of 36, 54, and 90?",
        options: ["18", "9", "6", "12"],
        correctIndex: 0,
        explanation: "Factors of 36 (1,2,3,4,6,9,12,18,36), 54 (1,2,3,6,9,18,27,54), 90 (1,2,3,5,6,9,10,15,18,30,45,90). The greatest common factor is 18."
      },
      {
        question: "Solve for x: 3x - 7 = 14",
        options: ["x = 7", "x = 5", "x = 9", "x = 3"],
        correctIndex: 0,
        explanation: "3x = 14 + 7 => 3x = 21 => x = 7."
      }
    ]
  },
  {
    id: "tz-curr-phys-f1",
    title: "Physics for Secondary Schools — Form 1",
    subject: "Physics",
    classes: "Form 1",
    form_num: 1,
    category: "Tanzania Curriculum",
    curriculum: "Tanzania Curriculum",
    section: "tanzania_curriculum",
    isTanzaniaCurriculum: true,
    uploadedAt: "Tanzania Institute of Education (TIE)",
    templateType: "notes",
    visibility: "public",
    uploadedBy: "Ministry of Education & TIE",
    isTeacherUpload: true,
    fileSize: "22.1 MB",
    isFreeOnline: true,
    source: "Tanzania Curriculum",
    downloadUrl: "https://ia800100.us.archive.org/30/items/tanzania-secondary-school-textbooks/Physics%20Form%201%20TIE.pdf",
    readOnlineUrl: "https://archive.org/stream/tanzania-secondary-school-textbooks/Physics%20Form%201%20TIE.pdf",
    rawText: "Form 1 Physics: Introduction to Physics, Measurement of Physical Quantities, Force, Archimedes Principle and Flotation, Structure and Properties of Matter, Pressure.",
    arrangedContent: {
      summary: "Official Form 1 Physics syllabus textbook developed by TIE. Covers fundamental concepts of physical measurements, SI units, vernier calipers, micrometer screw gauges, forces, density, and Archimedes Principle.",
      keyPoints: [
        "Scientific Method: Observation, hypothesis, experimentation, and conclusion in laboratory safety.",
        "Measurements: Fundamental and derived quantities, precision instruments (vernier calipers, micrometer screw gauge).",
        "Force & Motion: Types of forces (gravity, friction, tension), balanced and unbalanced forces.",
        "Archimedes Principle: Upthrust, apparent loss of weight, and the law of flotation in liquids.",
        "Structure of Matter: Kinetic theory of matter, Brownian motion, surface tension, and capillarity."
      ],
      definitions: [
        { term: "Archimedes' Principle", definition: "When a body is totally or partially immersed in a fluid, it experiences an upthrust equal to the weight of fluid displaced." },
        { term: "Density", definition: "Mass per unit volume of a substance, expressed in kg/m³ or g/cm³." }
      ]
    },
    quizQuestions: [
      {
        question: "Which of the following is a fundamental SI unit in Physics?",
        options: ["Kilogram (kg)", "Newton (N)", "Joule (J)", "Pascal (Pa)"],
        correctIndex: 0,
        explanation: "The kilogram is one of the 7 base SI units. Newton, Joule, and Pascal are derived units."
      },
      {
        question: "An object floats in water when:",
        options: ["The upthrust equals its total weight", "Its weight exceeds the upthrust", "Its density is twice that of water", "It experiences zero buoyant force"],
        correctIndex: 0,
        explanation: "By the Law of Flotation, a floating body displaces its own weight of fluid, meaning Upthrust = Weight."
      }
    ]
  },
  {
    id: "tz-curr-chem-f1",
    title: "Chemistry for Secondary Schools — Form 1",
    subject: "Chemistry",
    classes: "Form 1",
    form_num: 1,
    category: "Tanzania Curriculum",
    curriculum: "Tanzania Curriculum",
    section: "tanzania_curriculum",
    isTanzaniaCurriculum: true,
    uploadedAt: "Tanzania Institute of Education (TIE)",
    templateType: "notes",
    visibility: "public",
    uploadedBy: "Ministry of Education & TIE",
    isTeacherUpload: true,
    fileSize: "19.8 MB",
    isFreeOnline: true,
    source: "Tanzania Curriculum",
    downloadUrl: "https://ia800100.us.archive.org/30/items/tanzania-secondary-school-textbooks/Chemistry%20Form%201%20TIE.pdf",
    readOnlineUrl: "https://archive.org/stream/tanzania-secondary-school-textbooks/Chemistry%20Form%201%20TIE.pdf",
    rawText: "Form 1 Chemistry: Introduction to Chemistry, Laboratory Apparatus and Safety, Heat Sources and Flames, Matter and Separation of Mixtures, Air and Combustion.",
    arrangedContent: {
      summary: "Official TIE Form 1 Chemistry textbook. Introduces secondary learners to chemical equipment, Bunsen burner flames (luminous vs non-luminous), physical and chemical changes, and techniques for separating mixtures.",
      keyPoints: [
        "Chemistry in Daily Life: Medicine, agriculture, manufacturing, and food preservation.",
        "Laboratory Rules & First Aid: Hazard symbols (toxic, corrosive, flammable, explosive).",
        "Heat Sources: The Bunsen burner, air hole adjustments, strike back, and flame characteristics.",
        "States of Matter: Solid, liquid, and gas transitions; melting, boiling, condensation, sublimation.",
        "Separation Techniques: Filtration, evaporation, simple and fractional distillation, chromatography."
      ],
      definitions: [
        { term: "Sublimation", definition: "The direct transition of a substance from solid phase to gaseous phase without passing through the liquid phase (e.g., iodine, ammonium chloride)." },
        { term: "Non-luminous Flame", definition: "A hot, pale blue, steady flame produced when the Bunsen burner air hole is fully open." }
      ]
    },
    quizQuestions: [
      {
        question: "Which zone of a non-luminous Bunsen burner flame is the hottest?",
        options: ["The tip of the outer unburnt zone / outer mantle", "The innermost dark zone", "The base of the chimney", "The air collar ring"],
        correctIndex: 0,
        explanation: "Complete combustion occurs at the outer mantle where oxygen is abundant, making it the hottest region."
      }
    ]
  },
  {
    id: "tz-curr-bio-f1",
    title: "Biology for Secondary Schools — Form 1",
    subject: "Biology",
    classes: "Form 1",
    form_num: 1,
    category: "Tanzania Curriculum",
    curriculum: "Tanzania Curriculum",
    section: "tanzania_curriculum",
    isTanzaniaCurriculum: true,
    uploadedAt: "Tanzania Institute of Education (TIE)",
    templateType: "notes",
    visibility: "public",
    uploadedBy: "Ministry of Education & TIE",
    isTeacherUpload: true,
    fileSize: "24.5 MB",
    isFreeOnline: true,
    source: "Tanzania Curriculum",
    downloadUrl: "https://ia800100.us.archive.org/30/items/tanzania-secondary-school-textbooks/Biology%20Form%201%20TIE.pdf",
    readOnlineUrl: "https://archive.org/stream/tanzania-secondary-school-textbooks/Biology%20Form%201%20TIE.pdf",
    rawText: "Form 1 Biology: Introduction to Biology, Safety in Our Environment, Health and Immunity, Cell Structure and Organization, Classification of Living Things.",
    arrangedContent: {
      summary: "Official TIE Biology Form 1 textbook. Focuses on living organisms, microscope manipulation, plant versus animal cell structures, communicable diseases, and 5-kingdom biological classification.",
      keyPoints: [
        "Characteristics of Living Organisms: Movement, Respiration, Sensitivity, Growth, Reproduction, Excretion, Nutrition (MRS GREN).",
        "Light Microscope: Magnification formula, eye piece, objective lenses, coarse and fine adjustment knobs.",
        "Cell Structure: Cell wall, cell membrane, cytoplasm, nucleus, vacuole, chloroplasts, and mitochondria.",
        "First Aid & Waste Disposal: Treatment of cuts, burns, snake bites, and safe disposal of biological specimens."
      ],
      definitions: [
        { term: "Cell", definition: "The basic structural and functional unit of all living organisms." },
        { term: "Chloroplast", definition: "An organelle found in plant cells containing chlorophyll where photosynthesis takes place." }
      ]
    },
    quizQuestions: [
      {
        question: "Which organelle is present in plant cells but absent in typical animal cells?",
        options: ["Cellulose cell wall", "Nucleus", "Mitochondria", "Cell membrane"],
        correctIndex: 0,
        explanation: "Plant cells possess a rigid cellulose cell wall and chloroplasts, which are absent in animal cells."
      }
    ]
  },
  {
    id: "tz-curr-kisw-f1",
    title: "Kiswahili Kidato cha Kwanza — Lugha na Fasihi",
    subject: "Kiswahili",
    classes: "Form 1",
    form_num: 1,
    category: "Tanzania Curriculum",
    curriculum: "Tanzania Curriculum",
    section: "tanzania_curriculum",
    isTanzaniaCurriculum: true,
    uploadedAt: "Taasisi ya Elimu Tanzania (TET)",
    templateType: "notes",
    visibility: "public",
    uploadedBy: "Wizara ya Elimu na TET",
    isTeacherUpload: true,
    fileSize: "16.7 MB",
    isFreeOnline: true,
    source: "Tanzania Curriculum",
    downloadUrl: "https://ia800100.us.archive.org/30/items/tanzania-secondary-school-textbooks/Kiswahili%20Kidato%20cha%201%20TET.pdf",
    readOnlineUrl: "https://archive.org/stream/tanzania-secondary-school-textbooks/Kiswahili%20Kidato%20cha%201%20TET.pdf",
    rawText: "Kiswahili Kidato cha Kwanza: Mawasiliano na Ufahamu, Sarufi (Aina nane za Maneno), Utangulizi wa Fasihi Simulizi (Hadithi, Methali, Vitendawili, Nyimbo), Uandishi wa Insha.",
    arrangedContent: {
      summary: "Kitabu rasmi cha kiada cha Kiswahili Kidato cha Kwanza kilichoandaliwa na Taasisi ya Elimu Tanzania (TET). Kinaangazia sarufi sanifu, dhana ya fasihi simulizi, na stadi za mawasiliano.",
      keyPoints: [
        "Aina za Maneno: Nomino (N), Kiwakilishi (W), Kitenzi (T), Kivumishi (V), Kielezi (E), Kiunganishi (U), Kihusishi (H), Kihisishi (I).",
        "Fasihi Simulizi: Dhana, tanzu zake (Hadithi, Ushairi simulizi, Semi, na Sanaa za Maonyesho).",
        "Semi: Methali, misemo, vitendawili, mafumbo, na nahau za Kiswahili.",
        "Uandishi wa Insha: Insha za wasifu, insha za masimulizi, na insha za maelezo."
      ],
      definitions: [
        { term: "Fasihi Simulizi", definition: "Fasihi inayotungwa, kuhifadhiwa na kuwasilishwa kwa njia ya mdomo kutoka kizazi kimoja hadi kingine." },
        { term: "Nomino", definition: "Neno linalotaja mtu, mnyama, mahali, kitu, au hali." }
      ]
    },
    quizQuestions: [
      {
        question: "Neno 'haraka' katika sentensi 'Juma alikimbia haraka' ni aina gani ya neno?",
        options: ["Kielezi (E)", "Kivumishi (V)", "Nomino (N)", "Kitenzi (T)"],
        correctIndex: 0,
        explanation: "'Haraka' linaeleza namna kitendo 'alikimbia' kilivyofanyika, hivyo ni kielezi cha namna."
      }
    ]
  },
  {
    id: "tz-curr-geog-f1",
    title: "Geography for Secondary Schools — Form 1",
    subject: "Geography",
    classes: "Form 1",
    form_num: 1,
    category: "Tanzania Curriculum",
    curriculum: "Tanzania Curriculum",
    section: "tanzania_curriculum",
    isTanzaniaCurriculum: true,
    uploadedAt: "Tanzania Institute of Education (TIE)",
    templateType: "notes",
    visibility: "public",
    uploadedBy: "Ministry of Education & TIE",
    isTeacherUpload: true,
    fileSize: "21.3 MB",
    isFreeOnline: true,
    source: "Tanzania Curriculum",
    downloadUrl: "https://ia800100.us.archive.org/30/items/tanzania-secondary-school-textbooks/Geography%20Form%201%20TIE.pdf",
    readOnlineUrl: "https://archive.org/stream/tanzania-secondary-school-textbooks/Geography%20Form%201%20TIE.pdf",
    rawText: "Form 1 Geography: Concept of Geography, The Solar System, Major Features of the Earth's Surface, Weather and Climate, Map Work Introduction.",
    arrangedContent: {
      summary: "Official TIE Form 1 Geography textbook. Covers earth rotation and revolution, solar eclipses, solstices and equinoxes, continents and oceans, and introductory weather instruments.",
      keyPoints: [
        "Solar System: The sun, 8 planets, satellites, asteroids, meteors, and comets.",
        "Earth Motions: Rotation (causes day and night, deflection of winds, time differences) and Revolution (causes seasons, varying length of day and night).",
        "Major Relief Features: Mountains (fold, block, volcanic), plateaus, plains, rift valleys, oceans, and lakes.",
        "Weather Instruments: Rain gauge, thermometer (Six's minimum/maximum), barometer, anemometer, wind vane, and sunshine recorder."
      ],
      definitions: [
        { term: "Equinox", definition: "The time when the overhead sun is directly over the equator, resulting in equal duration of day and night across the globe (March 21 & September 23)." }
      ]
    },
    quizQuestions: [
      {
        question: "How long does the Earth take to complete one full rotation on its axis?",
        options: ["24 hours (1 day)", "365.25 days", "12 hours", "30 days"],
        correctIndex: 0,
        explanation: "The Earth rotates once on its axis every 24 hours, giving rise to the cycle of day and night."
      }
    ]
  },
  {
    id: "tz-curr-hist-f1",
    title: "History for Secondary Schools — Form 1",
    subject: "History",
    classes: "Form 1",
    form_num: 1,
    category: "Tanzania Curriculum",
    curriculum: "Tanzania Curriculum",
    section: "tanzania_curriculum",
    isTanzaniaCurriculum: true,
    uploadedAt: "Tanzania Institute of Education (TIE)",
    templateType: "notes",
    visibility: "public",
    uploadedBy: "Ministry of Education & TIE",
    isTeacherUpload: true,
    fileSize: "17.9 MB",
    isFreeOnline: true,
    source: "Tanzania Curriculum",
    downloadUrl: "https://ia800100.us.archive.org/30/items/tanzania-secondary-school-textbooks/History%20Form%201%20TIE.pdf",
    readOnlineUrl: "https://archive.org/stream/tanzania-secondary-school-textbooks/History%20Form%201%20TIE.pdf",
    rawText: "Form 1 History: Sources and Importance of History, Evolution of Man (Olduvai Gorge), Early Stone Age, Middle Stone Age, Late Stone Age, Iron Technology.",
    arrangedContent: {
      summary: "Official TIE History Form 1 syllabus textbook. Examines archaeological discoveries in Tanzania (Olduvai Gorge by Dr. Louis and Mary Leakey), oral tradition, archives, and prehistoric technological evolution.",
      keyPoints: [
        "Sources of History: Oral traditions, archaeology, written records, museums, archives, and historical sites.",
        "Evolution of Man: Australopithecus, Homo habilis (handy man), Homo erectus, and Homo sapiens.",
        "Olduvai Gorge: World-famous archaeological site in Arusha, Tanzania, proving East Africa as the Cradle of Mankind.",
        "Impact of Iron Smelting: Improved agricultural tools, surplus food production, warfare weapons, and permanent settlements."
      ],
      definitions: [
        { term: "Archaeology", definition: "The scientific study of human history and prehistory through the excavation of sites and the analysis of physical artifacts." }
      ]
    },
    quizQuestions: [
      {
        question: "At which historical site in northern Tanzania were fossil remains of Zinjanthropus (Australopithecus boisei) discovered in 1959?",
        options: ["Olduvai Gorge", "Kilwa Kisiwani", "Engaruka", "Kaole"],
        correctIndex: 0,
        explanation: "Dr. Mary Leakey discovered the skull of Zinjanthropus at Olduvai Gorge in 1959."
      }
    ]
  },
  {
    id: "tz-curr-civics-f1",
    title: "Civics for Secondary Schools — Form 1",
    subject: "Civics",
    classes: "Form 1",
    form_num: 1,
    category: "Tanzania Curriculum",
    curriculum: "Tanzania Curriculum",
    section: "tanzania_curriculum",
    isTanzaniaCurriculum: true,
    uploadedAt: "Tanzania Institute of Education (TIE)",
    templateType: "notes",
    visibility: "public",
    uploadedBy: "Ministry of Education & TIE",
    isTeacherUpload: true,
    fileSize: "15.8 MB",
    isFreeOnline: true,
    source: "Tanzania Curriculum",
    downloadUrl: "https://ia800100.us.archive.org/30/items/tanzania-secondary-school-textbooks/Civics%20Form%201%20TIE.pdf",
    readOnlineUrl: "https://archive.org/stream/tanzania-secondary-school-textbooks/Civics%20Form%201%20TIE.pdf",
    rawText: "Form 1 Civics: Our Nation Tanzania, National Symbols, Life Skills, Human Rights, Responsible Citizenship, Cultural Heritage.",
    arrangedContent: {
      summary: "Official TIE Civics Form 1 textbook. Explores Tanzanian national identity, the National Flag, Coat of Arms, Uhuru Torch, National Anthem, constitution, and citizen responsibilities.",
      keyPoints: [
        "National Symbols: National Flag (colors and meanings: green, yellow, black, blue), Coat of Arms, National Anthem (Mungu Ibariki Afrika), Uhuru Torch.",
        "Promotion of Life Skills: Critical thinking, decision making, self-awareness, stress management, and interpersonal communication.",
        "Human Rights: Fundamental rights and freedoms entrenched in the Constitution of the United Republic of Tanzania.",
        "Responsible Citizenship: Civic duties including paying taxes, voting, obeying the rule of law, and protecting public property."
      ],
      definitions: [
        { term: "Uhuru Torch (Mwenge wa Uhuru)", definition: "A national symbol launched on Mount Kilimanjaro in 1961 representing national unity, freedom, hope, and enlightenment across borders." }
      ]
    },
    quizQuestions: [
      {
        question: "What does the black stripe on the National Flag of Tanzania symbolize?",
        options: ["The indigenous people of Tanzania", "The mineral wealth of the land", "The natural vegetation and agriculture", "The Indian Ocean and great lakes"],
        correctIndex: 0,
        explanation: "Black represents the indigenous people; green represents vegetation; yellow/gold represents mineral wealth; blue represents the lakes and ocean."
      }
    ]
  },

  // --- FORM 2 ---
  {
    id: "tz-curr-math-f2",
    title: "Basic Mathematics for Secondary Schools — Form 2",
    subject: "Basic Mathematics",
    classes: "Form 2",
    form_num: 2,
    category: "Tanzania Curriculum",
    curriculum: "Tanzania Curriculum",
    section: "tanzania_curriculum",
    isTanzaniaCurriculum: true,
    uploadedAt: "Tanzania Institute of Education (TIE)",
    templateType: "notes",
    visibility: "public",
    uploadedBy: "Ministry of Education & TIE",
    isTeacherUpload: true,
    fileSize: "20.6 MB",
    isFreeOnline: true,
    source: "Tanzania Curriculum",
    downloadUrl: "https://ia800100.us.archive.org/30/items/tanzania-secondary-school-textbooks/Basic%20Mathematics%20Form%202%20TIE.pdf",
    readOnlineUrl: "https://archive.org/stream/tanzania-secondary-school-textbooks/Basic%20Mathematics%20Form%202%20TIE.pdf",
    rawText: "Form 2 Basic Mathematics: Exponents and Radicals, Algebra (Factorization & Simultaneous Equations), Quadratic Equations, Logarithms, Congruence and Similarity, Pythagoras Theorem, Trigonometry.",
    arrangedContent: {
      summary: "Official TIE Form 2 Basic Mathematics textbook aligned with FTNA (Form Two National Assessment) examination requirements.",
      keyPoints: [
        "Exponents & Logarithms: Laws of indices, standard form, and logarithm tables.",
        "Algebra: Expansion, factorization by grouping, difference of two squares, simultaneous linear equations (elimination & substitution).",
        "Quadratic Equations: Solving by factoring and completing the square.",
        "Pythagoras Theorem: Right-angled triangles, Pythagorean triples, and distance formula.",
        "Trigonometry: SOH CAH TOA for sine, cosine, and tangent ratios in acute angles."
      ],
      definitions: [
        { term: "Pythagorean Theorem", definition: "In any right-angled triangle, the square of the hypotenuse is equal to the sum of the squares of the other two sides: a² + b² = c²." }
      ]
    },
    quizQuestions: [
      {
        question: "In a right-angled triangle with legs of length 6 cm and 8 cm, what is the length of the hypotenuse?",
        options: ["10 cm", "14 cm", "12 cm", "7 cm"],
        correctIndex: 0,
        explanation: "By Pythagoras theorem: c² = 6² + 8² = 36 + 64 = 100, so c = √100 = 10 cm."
      }
    ]
  },
  {
    id: "tz-curr-phys-f2",
    title: "Physics for Secondary Schools — Form 2",
    subject: "Physics",
    classes: "Form 2",
    form_num: 2,
    category: "Tanzania Curriculum",
    curriculum: "Tanzania Curriculum",
    section: "tanzania_curriculum",
    isTanzaniaCurriculum: true,
    uploadedAt: "Tanzania Institute of Education (TIE)",
    templateType: "notes",
    visibility: "public",
    uploadedBy: "Ministry of Education & TIE",
    isTeacherUpload: true,
    fileSize: "23.4 MB",
    isFreeOnline: true,
    source: "Tanzania Curriculum",
    downloadUrl: "https://ia800100.us.archive.org/30/items/tanzania-secondary-school-textbooks/Physics%20Form%202%20TIE.pdf",
    readOnlineUrl: "https://archive.org/stream/tanzania-secondary-school-textbooks/Physics%20Form%202%20TIE.pdf",
    rawText: "Form 2 Physics: Magnetism, Current Electricity, Simple Machines, Motion in Straight Line, Equilibrium of Bodies.",
    arrangedContent: {
      summary: "Official TIE Form 2 Physics course reader covering magnetic fields, electric circuits (Ohm's law), mechanical advantage of simple machines, and linear equations of motion.",
      keyPoints: [
        "Magnetism: Magnetic poles, magnetic field lines, domain theory, and demagnetization methods.",
        "Current Electricity: Electric current (Amperes), potential difference (Volts), resistance, series and parallel circuits, Ohm's Law (V = IR).",
        "Simple Machines: Levers, pulleys, inclined planes, hydraulic press. Mechanical Advantage (MA), Velocity Ratio (VR), Efficiency = (MA/VR) × 100%.",
        "Linear Motion: Distance, displacement, speed, velocity, acceleration, and equations of uniformly accelerated motion."
      ],
      definitions: [
        { term: "Ohm's Law", definition: "The current through a conductor between two points is directly proportional to the voltage across the two points, provided temperature remains constant." }
      ]
    },
    quizQuestions: [
      {
        question: "If a circuit has a resistor of 5 Ω connected across a 10 V battery, what current flows through it?",
        options: ["2 A", "50 A", "0.5 A", "15 A"],
        correctIndex: 0,
        explanation: "By Ohm's Law: I = V / R = 10 / 5 = 2 Amperes."
      }
    ]
  },

  // --- FORM 3 ---
  {
    id: "tz-curr-math-f3",
    title: "Basic Mathematics for Secondary Schools — Form 3",
    subject: "Basic Mathematics",
    classes: "Form 3",
    form_num: 3,
    category: "Tanzania Curriculum",
    curriculum: "Tanzania Curriculum",
    section: "tanzania_curriculum",
    isTanzaniaCurriculum: true,
    uploadedAt: "Tanzania Institute of Education (TIE)",
    templateType: "notes",
    visibility: "public",
    uploadedBy: "Ministry of Education & TIE",
    isTeacherUpload: true,
    fileSize: "21.9 MB",
    isFreeOnline: true,
    source: "Tanzania Curriculum",
    downloadUrl: "https://ia800100.us.archive.org/30/items/tanzania-secondary-school-textbooks/Basic%20Mathematics%20Form%203%20TIE.pdf",
    readOnlineUrl: "https://archive.org/stream/tanzania-secondary-school-textbooks/Basic%20Mathematics%20Form%203%20TIE.pdf",
    rawText: "Form 3 Basic Mathematics: Relations and Functions, Statistics (Mean, Median, Mode, Ogive), Rates and Variations, Sequences and Series, Circles, Accounts.",
    arrangedContent: {
      summary: "Official TIE Form 3 Basic Mathematics textbook. Features comprehensive coverage of domain/range in functions, arithmetic and geometric progressions, and circle geometry theorems.",
      keyPoints: [
        "Relations & Functions: Injective, surjective, bijective functions, inverse functions, composite functions.",
        "Statistics: Grouped frequency distribution, histograms, cumulative frequency curve (Ogive), mean, median, mode.",
        "Sequences & Series: Arithmetic Progression (AP) nth term and sum; Geometric Progression (GP).",
        "Circle Theorems: Angles subtended at center vs circumference, cyclic quadrilaterals, tangents and secants."
      ],
      definitions: [
        { term: "Arithmetic Progression (AP)", definition: "A sequence of numbers such that the difference between the consecutive terms is constant (d)." }
      ]
    },
    quizQuestions: [
      {
        question: "In an Arithmetic Progression with first term a = 3 and common difference d = 4, what is the 10th term?",
        options: ["39", "43", "36", "40"],
        correctIndex: 0,
        explanation: "Tn = a + (n - 1)d = 3 + (10 - 1) * 4 = 3 + 36 = 39."
      }
    ]
  },

  // --- FORM 4 ---
  {
    id: "tz-curr-math-f4",
    title: "Basic Mathematics for Secondary Schools — Form 4",
    subject: "Basic Mathematics",
    classes: "Form 4",
    form_num: 4,
    category: "Tanzania Curriculum",
    curriculum: "Tanzania Curriculum",
    section: "tanzania_curriculum",
    isTanzaniaCurriculum: true,
    uploadedAt: "Tanzania Institute of Education (TIE)",
    templateType: "notes",
    visibility: "public",
    uploadedBy: "Ministry of Education & TIE",
    isTeacherUpload: true,
    fileSize: "25.2 MB",
    isFreeOnline: true,
    source: "Tanzania Curriculum",
    downloadUrl: "https://ia800100.us.archive.org/30/items/tanzania-secondary-school-textbooks/Basic%20Mathematics%20Form%204%20TIE.pdf",
    readOnlineUrl: "https://archive.org/stream/tanzania-secondary-school-textbooks/Basic%20Mathematics%20Form%204%20TIE.pdf",
    rawText: "Form 4 Basic Mathematics: Coordinate Geometry, Matrices and Transformations, Probability, Trigonometry, Vectors, Linear Programming, Three Dimensional Geometry.",
    arrangedContent: {
      summary: "Official TIE Form 4 Basic Mathematics textbook for CSEE (Certificate of Secondary Education Examination) preparation. Includes complete NECTA past exam workout sections.",
      keyPoints: [
        "Coordinate Geometry: Gradient of lines, parallel and perpendicular lines, distance between two points.",
        "Matrices & Transformations: 2x2 matrices, determinants, inverse matrix, translation, reflection, rotation, enlargement.",
        "Probability: Sample space, independent events, mutually exclusive events, tree diagrams.",
        "Linear Programming: Formulating inequalities, feasible region graphing, and objective function optimization."
      ],
      definitions: [
        { term: "Determinant of Matrix [a b; c d]", definition: "The scalar value computed as (ad - bc)." }
      ]
    },
    quizQuestions: [
      {
        question: "What is the determinant of matrix [[4, 2], [3, 5]]?",
        options: ["14", "26", "20", "6"],
        correctIndex: 0,
        explanation: "det = (4 * 5) - (2 * 3) = 20 - 6 = 14."
      }
    ]
  },
  {
    id: "tz-curr-phys-f4",
    title: "Physics for Secondary Schools — Form 4",
    subject: "Physics",
    classes: "Form 4",
    form_num: 4,
    category: "Tanzania Curriculum",
    curriculum: "Tanzania Curriculum",
    section: "tanzania_curriculum",
    isTanzaniaCurriculum: true,
    uploadedAt: "Tanzania Institute of Education (TIE)",
    templateType: "notes",
    visibility: "public",
    uploadedBy: "Ministry of Education & TIE",
    isTeacherUpload: true,
    fileSize: "26.8 MB",
    isFreeOnline: true,
    source: "Tanzania Curriculum",
    downloadUrl: "https://ia800100.us.archive.org/30/items/tanzania-secondary-school-textbooks/Physics%20Form%204%20TIE.pdf",
    readOnlineUrl: "https://archive.org/stream/tanzania-secondary-school-textbooks/Physics%20Form%204%20TIE.pdf",
    rawText: "Form 4 Physics: Waves, Electromagnetism, Radioactivity, Thermionic Emission, Electronics, Astronomy.",
    arrangedContent: {
      summary: "Official TIE Form 4 Physics textbook. Prepares students for NECTA CSEE with rigorous theory on electromagnetic induction, transformers, atomic radiation (alpha, beta, gamma), and semiconductors.",
      keyPoints: [
        "Waves: Longitudinal and transverse waves, wave velocity v = fλ, reflection, refraction, interference.",
        "Electromagnetic Induction: Faraday's and Lenz's laws, AC and DC generators, transformer formula (Vp/Vs = Np/Ns).",
        "Radioactivity: Half-life calculation, radioactive decay equations, nuclear fission and fusion, safety precautions.",
        "Electronics: P-N junction diode, rectification, transistors as switches and amplifiers."
      ],
      definitions: [
        { term: "Half-Life", definition: "The time required for half the radioactive nuclei in a sample to undergo decay." }
      ]
    },
    quizQuestions: [
      {
        question: "If a step-down transformer has 1000 turns on the primary coil and 100 turns on the secondary coil with primary voltage 240 V, what is secondary voltage?",
        options: ["24 V", "2400 V", "120 V", "12 V"],
        correctIndex: 0,
        explanation: "Vs = Vp * (Ns / Np) = 240 * (100 / 1000) = 24 V."
      }
    ]
  },

  // --- KISWAHILI FASIHI & LUGHA FORM 3 & 4 ---
  {
    id: "tz-curr-kisw-f4",
    title: "Kiswahili Kidato cha 3 na 4 — Sarufi na Uhakiki wa Fasihi",
    subject: "Kiswahili",
    classes: "Form 3–4",
    form_num: 4,
    category: "Tanzania Curriculum",
    curriculum: "Tanzania Curriculum",
    section: "tanzania_curriculum",
    isTanzaniaCurriculum: true,
    uploadedAt: "Taasisi ya Elimu Tanzania (TET)",
    templateType: "notes",
    visibility: "public",
    uploadedBy: "Wizara ya Elimu na TET",
    isTeacherUpload: true,
    fileSize: "21.0 MB",
    isFreeOnline: true,
    source: "Tanzania Curriculum",
    downloadUrl: "https://ia800100.us.archive.org/30/items/tanzania-secondary-school-textbooks/Kiswahili%20Kidato%20cha%203%20na%204%20TET.pdf",
    readOnlineUrl: "https://archive.org/stream/tanzania-secondary-school-textbooks/Kiswahili%20Kidato%20cha%203%20na%204%20TET.pdf",
    rawText: "Kiswahili Kidato cha 3 na 4: Sintaksia (Uchanganuzi wa Sentensi kwa Mistari na Matawi), Uundaji wa Maneno, Fasihi Andishi (Riwaya, Tamthilia, Ushairi), Uhakiki wa Maudhui na Fani.",
    arrangedContent: {
      summary: "Kitabu rasmi cha TET cha Kiswahili kwa maandalizi ya mtihani wa NECTA Kidato cha Nne (CSEE). Kinajumuisha uchanganuzi wa vitabu teule vya fasihi andishi.",
      keyPoints: [
        "Sintaksia: Muundo wa sentensi sahihi, changamano, na shada; vishazi huru na vishazi tegemezi.",
        "Uundaji wa Maneno: Unyambuaji wa vitenzi, uambishaji wa viambishi awali na tamati, uambatishaji.",
        "Uhakiki wa Fasihi: Maudhui (dhamira, ujumbe, falsafa, migogoro) na Fani (muundo, mtindo, wahusika, mandhari, lugha).",
        "Vitabu Teule vya NECTA: Ushairi (Wasakatonge, Malenga Wapya), Tamthilia (Kilio Chetu, Ngoswe), Riwaya (Takadini, Joka la Mdimu)."
      ],
      definitions: [
        { term: "Kishazi Huru", definition: "Kishazi kinachojitosheleza kimaana na kutoa ujumbe kamili bila kutegemea kishazi kingine." },
        { term: "Dhamira Kuu", definition: "Wazo kuu au kusudio la mwandishi katika kazi ya fasihi." }
      ]
    },
    quizQuestions: [
      {
        question: "Ni kipi kati ya vifuatavyo ni kipengele cha FANI katika uhakiki wa kazi ya fasihi?",
        options: ["Wahusika na Mandhari", "Ujumbe kwa jamii", "Falsafa ya mwandishi", "Dhamira kuu"],
        correctIndex: 0,
        explanation: "Fani inahusu muundo, mtindo, wahusika, mandhari, na matumizi ya lugha. Maudhui yanajumuisha dhamira, ujumbe, migogoro, na falsafa."
      }
    ]
  },

  // --- COMMERCE & BOOKKEEPING ---
  {
    id: "tz-curr-comm-f3-4",
    title: "Commerce for Secondary Schools — Form 3 & 4",
    subject: "Commerce",
    classes: "Form 3–4",
    form_num: 3,
    category: "Tanzania Curriculum",
    curriculum: "Tanzania Curriculum",
    section: "tanzania_curriculum",
    isTanzaniaCurriculum: true,
    uploadedAt: "Tanzania Institute of Education (TIE)",
    templateType: "notes",
    visibility: "public",
    uploadedBy: "Ministry of Education & TIE",
    isTeacherUpload: true,
    fileSize: "18.9 MB",
    isFreeOnline: true,
    source: "Tanzania Curriculum",
    downloadUrl: "https://ia800100.us.archive.org/30/items/tanzania-secondary-school-textbooks/Commerce%20Form%203%20and%204%20TIE.pdf",
    readOnlineUrl: "https://archive.org/stream/tanzania-secondary-school-textbooks/Commerce%20Form%203%20and%204%20TIE.pdf",
    rawText: "Commerce Form 3 & 4: Production, Trade, Wholesale and Retail, International Trade, Banking, Transport and Communication, Warehousing, Insurance.",
    arrangedContent: {
      summary: "Official TIE Commerce textbook for Forms 3 and 4. Prepares students for commercial enterprises, financial services, and NECTA CSEE Commerce examinations.",
      keyPoints: [
        "Scope of Commerce: Trade (Home Trade & Foreign Trade) and Aids to Trade (Banking, Transport, Insurance, Warehousing, Advertising).",
        "Home Trade: Wholesaling functions, retail outlets, hire purchase, deferred payments.",
        "Foreign Trade: Balance of Trade, Balance of Payments, customs tariffs, export and import procedures.",
        "Banking & Finance: Functions of Bank of Tanzania (BoT), commercial banks, mobile money transfers in Tanzania."
      ],
      definitions: [
        { term: "Balance of Trade", definition: "The difference in value over a period of time between a country's visible exports and visible imports." }
      ]
    },
    quizQuestions: [
      {
        question: "What is the central bank of the United Republic of Tanzania?",
        options: ["Bank of Tanzania (BoT)", "National Microfinance Bank (NMB)", "CRDB Bank Plc", "East African Development Bank"],
        correctIndex: 0,
        explanation: "Bank of Tanzania (BoT) is the regulatory central bank responsible for monetary policy and currency issuance."
      }
    ]
  }
];

// Merge into database without duplicates
let addedCount = 0;
for (const book of curriculumBooks) {
  const existingIdx = db.materials.findIndex(m => m.id === book.id || m.title === book.title);
  if (existingIdx >= 0) {
    db.materials[existingIdx] = { ...db.materials[existingIdx], ...book };
  } else {
    db.materials.unshift(book);
    addedCount++;
  }
}

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
console.log(`[SEED TANZANIA CURRICULUM] Successfully seeded ${curriculumBooks.length} official textbooks into Tanzania Curriculum repository (Added ${addedCount} new). Total materials now: ${db.materials.length}`);
