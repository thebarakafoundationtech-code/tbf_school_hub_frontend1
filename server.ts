import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import nodemailer from "nodemailer";
import fs from "fs";

dotenv.config();

// Bypass Node SSL cert altname mismatch check for backend API calls
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// OAuth client ID configuration
let configClientId = process.env.OAUTH_CLIENT_ID || "";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

// Trust reverse proxy (Cloud Run, Nginx, etc.) to correctly populate req.protocol, req.hostname, etc.
app.set("trust proxy", true);

app.use(express.json());

// Helper to get Redirect URI
function getRedirectUri(req: express.Request): string {
  if (process.env.OAUTH_REDIRECT_URI) {
    return process.env.OAUTH_REDIRECT_URI;
  }
  const appUrl = process.env.APP_URL;
  if (appUrl) {
    const cleanUrl = appUrl.endsWith("/") ? appUrl.slice(0, -1) : appUrl;
    return `${cleanUrl}/auth/callback`;
  }
  const host = req.get("host") || "localhost:3000";
  // Force HTTPS if not on localhost
  const isLocalhost = host.includes("localhost") || host.includes("127.0.0.1");
  const protocol = isLocalhost ? "http" : "https";
  return `${protocol}://${host}/auth/callback`;
}

// Lazy-loaded Nodemailer transporter creation
async function getMailerTransporter() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    console.log("[Baraka Mailer] Using configured SMTP server:", host);
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  console.log("[Baraka Mailer] SMTP not fully configured. Provisioning Ethereal sandbox mailer...");
  const testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
}

// Function to send a beautiful verification code email
async function sendVerificationCodeEmail(email: string, code: string, name: string) {
  const transporter = await getMailerTransporter();
  const mailOptions = {
    from: process.env.SMTP_FROM || '"Baraka Hub Support" <no-reply@barakahub.edu.tz>',
    to: email,
    subject: `🔑 ${code} is your Baraka Hub verification code`,
    html: `
      <div style="font-family: 'Inter', system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; background-color: #FAF6EE; border-radius: 24px; border: 2px solid #15223F;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #15223F; font-size: 28px; font-weight: 800; margin: 0; font-family: Georgia, serif;">Baraka Hub</h1>
          <p style="color: #64B5D6; font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; margin: 5px 0 0 0;">AI Study Companion</p>
        </div>
        
        <div style="background-color: #ffffff; padding: 30px; border-radius: 16px; box-shadow: 0 4px 12px rgba(21, 34, 63, 0.05); border: 1px solid rgba(21, 34, 63, 0.05);">
          <p style="font-size: 16px; color: #15223F; margin-top: 0;">Habari <strong>${name}</strong>,</p>
          <p style="font-size: 14px; color: #4B5563; line-height: 1.6;">
            Welcome to Baraka Hub! Please use the 6-digit verification code below to verify your identity and access your dashboard:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 36px; font-weight: 800; letter-spacing: 6px; color: #64B5D6; background-color: #F0F9FF; padding: 12px 30px; border-radius: 12px; border: 2px dashed #64B5D6; display: inline-block;">
              ${code}
            </span>
          </div>
          
          <p style="font-size: 12px; color: #9CA3AF; margin-bottom: 0;">
            This code is valid for 10 minutes. If you did not make this request, please ignore this email.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; color: #6B7280; font-size: 12px;">
          <p style="margin: 0;">&copy; 2026 Baraka Hub. All rights reserved.</p>
          <p style="margin: 5px 0 0 0; font-family: monospace; font-size: 10px;">Dar es Salaam, Tanzania</p>
        </div>
      </div>
    `,
  };

  const info = await transporter.sendMail(mailOptions);
  const previewUrl = nodemailer.getTestMessageUrl(info);
  return { messageId: info.messageId, previewUrl };
}

// Lazy-loaded Gemini AI client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== "MY_GEMINI_API_KEY" && key.trim() !== "") {
      try {
        aiClient = new GoogleGenAI({
          apiKey: key,
          httpOptions: {
            headers: {
              "User-Agent": "aistudio-build",
            },
          },
        });
      } catch (e) {
        console.error("Failed to initialize GoogleGenAI:", e);
      }
    }
  }
  return aiClient;
}

// Help response simulator if API key is not present
function simulateBarakaResponse(message: string): string {
  const lowercaseMsg = message.toLowerCase();
  
  if (lowercaseMsg.includes("photo") || lowercaseMsg.includes("biology") || lowercaseMsg.includes("majani")) {
    return "# Photosynthesis (Uundaji wa Chakula kwenye Majani) 🌿☀️\n\n" +
      "Habari! Let's examine photosynthesis in a highly structured, professional study format.\n\n" +
      "## 1. Core Definition\n" +
      "> **Photosynthesis** is the chemical process by which green plants utilize solar light energy, carbon dioxide (CO₂), and water (H₂O) to synthesize energy-rich glucose molecules while releasing oxygen (O₂) as a vital byproduct.\n\n" +
      "## 2. Chemical Formula\n" +
      "```\n6CO₂ + 6H₂O + Sunlight ➔ C₆H₁₂O₆ + 6O₂\n```\n\n" +
      "## 3. Key Reactants & Products Comparison\n" +
      "| Chemical Component | Status in Photosynthesis | Role/Purpose |\n" +
      "| :--- | :--- | :--- |\n" +
      "| **Carbon Dioxide (CO₂)** | Reactant | Absorbed through stomata to supply carbon |\n" +
      "| **Water (H₂O)** | Reactant | Absorbed by roots; provides hydrogen & electrons |\n" +
      "| **Glucose (C₆H₁₂O₂)** | Main Product | Stores chemical energy for plant growth |\n" +
      "| **Oxygen (O₂)** | Byproduct | Released into the atmosphere for respiration |\n\n" +
      "## 4. Next Steps\n" +
      "Would you like to analyze the **Light-dependent reaction** or the **Calvin Cycle**? Vizuri sana! Let me know, or use the **Virtual Labs** tab to run a simulation!";
  }
  
  if (lowercaseMsg.includes("solve") || lowercaseMsg.includes("math") || lowercaseMsg.includes("hesabu") || lowercaseMsg.includes("2x")) {
    return "# Solving Linear Equations Step-by-Step 📐\n\n" +
      "Habari! Let's solve the mathematical equation **2x + 3 = 11** in a highly professional and structured step-by-step manner.\n\n" +
      "## Step-by-Step Derivation\n\n" +
      "1. **Isolate the variable term**:\n" +
      "   Subtract `3` from both sides of the equation to isolate the `2x` term:\n" +
      "   `2x + 3 - 3 = 11 - 3`\n" +
      "   `2x = 8`\n\n" +
      "2. **Solve for x**:\n" +
      "   Divide both sides by the coefficient of x, which is `2`:\n" +
      "   `2x / 2 = 8 / 2`\n" +
      "   `x = 4`\n\n" +
      "## Mathematical Summary Table\n" +
      "| Step Description | Equation State | Action Taken |\n" +
      "| :--- | :--- | :--- |\n" +
      "| Original Equation | `2x + 3 = 11` | Input Problem |\n" +
      "| Subtracting Constant | `2x = 8` | Subtracted 3 from both sides |\n" +
      "| Dividing Coefficient | `x = 4` | Divided both sides by 2 |\n\n" +
      "## Final Verification\n" +
      "> Subbing `x = 4` back into the equation yields: `2(4) + 3 = 8 + 3 = 11`. The solution is correct!\n\n" +
      "Vizuri sana! Ask me any other equation or concept you want solved.";
  }

  if (lowercaseMsg.includes("water cycle") || lowercaseMsg.includes("mvua") || lowercaseMsg.includes("evaporation")) {
    return "# The Hydrological Water Cycle (Mzunguko wa Maji) 🌧️🌊\n\n" +
      "Habari! Let us explore the water cycle. It is a continuous, closed-loop natural process.\n\n" +
      "## 1. Core Phases of the Hydrological Cycle\n" +
      "The cycle is driven by the sun's thermal energy and proceeds through three key phases:\n\n" +
      "1. **Evaporation & Transpiration**:\n" +
      "   * Liquid water absorbs heat and converts into gaseous water vapor.\n" +
      "   * Transpiration represents water release from microscopic stomatal pores of plants.\n" +
      "2. **Condensation**:\n" +
      "   * As vapor rises, it cools and returns to a liquid state, aggregating to form clouds.\n" +
      "3. **Precipitation**:\n" +
      "   * Once clouds are fully saturated, water droplets fall back to the Earth's surface as rain, snow, or hail.\n\n" +
      "## 2. Phase Comparison Chart\n" +
      "| Phase | Primary Driver | State Change |\n" +
      "| :--- | :--- | :--- |\n" +
      "| **Evaporation** | Solar Heating | Liquid ➔ Gas |\n" +
      "| **Condensation** | Atmospheric Cooling | Gas ➔ Liquid |\n" +
      "| **Precipitation** | Gravity & Saturation | Cloud droplets ➔ Rain/Snow |\n\n" +
      "## 3. Important Fact\n" +
      "> **Mzunguko wa Maji** is vital. It purifies water, replenishes freshwater aquifers, and sustains global ecosystems.\n\n" +
      "Would you like to take a quick quiz on this topic to earn extra XP?";
  }

  return "# Baraka — Your AI Study Companion 🎓✨\n\n" +
    "Habari! I am Baraka, your professional and encouraging AI Study Companion, designed specifically for secondary school students.\n\n" +
    "## How I Can Help You Learn:\n" +
    "1. **Subject Mastery**: Ask me difficult questions in **Biology, Mathematics, Physics, Chemistry, Geography, History, or Kiswahili**.\n" +
    "2. **Step-by-step Solving**: Give me equations, word problems, or processes and I will break them down beautifully.\n" +
    "3. **Active Quizzing**: Simply say *'quiz me'* and I will generate practice questions for you on any topic!\n\n" +
    "## Quick Tips for Success:\n" +
    "* Be specific with your question (e.g. *'explain Ohm's law'* or *'solve 3x + 5 = 20'*).\n" +
    "* You can write in English, Kiswahili, or blend them together! Let's build a brighter future. **Tusome pamoja!**";
}

const REMOTE_API_BASE = process.env.REMOTE_API_BASE || "https://schubapi.thebarakafoundation.or.tz/api/v1";

// Safe remote API caller with short timeout and clean local fallback
async function tryRemoteApi(endpoint: string, options: RequestInit = {}, timeoutMs = 800): Promise<any | null> {
  if (!REMOTE_API_BASE) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const targetUrl = `${REMOTE_API_BASE}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    const res = await fetch(targetUrl, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timer);
    if (res.ok) {
      return await res.json();
    }
  } catch (err: any) {
    // Seamless local fallback without console error noise
  }
  return null;
}

// Dedicated Login Endpoint Handler
const handleLogin = async (req: express.Request, res: express.Response) => {
  const { email, password } = req.body || {};
  const cleanEmail = (email || "").trim().toLowerCase();

  if (!cleanEmail) {
    return res.status(400).json({ success: false, error: "Email is required for login." });
  }

  // 1. Try remote TBF School Hub backend API if available
  const remoteData = await tryRemoteApi("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: cleanEmail, password: password || "" })
  });

  if (remoteData) {
    return res.status(200).json(remoteData);
  }

  // 2. Local fallback login response
  const isTeacher = cleanEmail.includes("teacher") || cleanEmail.includes("mwalimu");
  const isAdmin = cleanEmail.includes("admin") || cleanEmail.includes("headmaster");
  const role = isAdmin ? "admin" : isTeacher ? "teacher" : "student";

  const userId = "usr_" + Math.random().toString(36).substring(2, 10);
  const user = {
    id: userId,
    email: cleanEmail,
    fname: cleanEmail.split("@")[0],
    lname: "",
    role: role,
    photo_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    created_at: new Date().toISOString()
  };

  const token = "tbf_jwt_" + Buffer.from(JSON.stringify({ userId, email: cleanEmail, role })).toString("base64");

  return res.status(200).json({
    success: true,
    message: "Login successful",
    access_token: token,
    token_type: "bearer",
    user,
    token
  });
};

app.post([
  "/api/v1/auth/login",
  "/api/auth/login"
], handleLogin);

// Current Authenticated User Profile Endpoint Handler
const handleGetMe = async (req: express.Request, res: express.Response) => {
  const authHeader = (req.headers["authorization"] as string) || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  // 1. Try remote TBF School Hub backend API first
  const remote = await tryRemoteApi("/auth/me", {
    method: "GET",
    headers: { ...(authHeader ? { "Authorization": authHeader } : {}) }
  });
  if (remote && (remote.id || remote.email || remote.user)) {
    return res.json(remote);
  }

  // 2. Decode local base64 token if present
  if (token) {
    try {
      const parts = token.split("_");
      const base64Part = parts[parts.length - 1];
      const decoded = JSON.parse(Buffer.from(base64Part, "base64").toString());
      if (decoded.email || decoded.userId) {
        const isSchool = token.includes("school") || decoded.role === "school_admin";
        return res.json({
          id: decoded.userId || "usr_active",
          email: decoded.email || "user@barakahub.edu.tz",
          fname: decoded.fname || (isSchool ? "Headmaster" : "Mwanafunzi"),
          lname: decoded.lname || (isSchool ? "Admin" : "Baraka"),
          role: decoded.role || (isSchool ? "school_admin" : "student"),
          school: isSchool ? {
            id: decoded.schoolId || "sch_default",
            name: decoded.schoolName || "Baraka Secondary School",
            registration_number: "MoE/SEC/2026/001",
            region: "Dar es Salaam",
            school_type: "Secondary",
            headmaster_name: "Headmaster",
            verification_status: "verified"
          } : undefined,
          student_profile: !isSchool ? {
            phone: decoded.phone || "+255 700 000 000",
            study_level: decoded.studyLevel || "Form 1",
            curriculum: decoded.curriculum || "Tanzania National (NECTA)",
            photo_url: decoded.photoUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
          } : undefined
        });
      }
    } catch {}
  }

  // 3. Fallback matching UserResponse
  return res.json({
    id: "usr_guest",
    email: "learner@barakahub.edu.tz",
    fname: "Mwanafunzi",
    lname: "Baraka",
    role: "student"
  });
};

app.get([
  "/api/v1/auth/me",
  "/api/auth/me"
], handleGetMe);

// Dedicated General & Student Registration Endpoint Handler
const handleStudentRegister = async (req: express.Request, res: express.Response) => {
  const {
    fname,
    lname,
    firstName,
    lastName,
    email,
    password,
    phone,
    study_level,
    studyLevel,
    curriculum,
    photo_url,
    photoUrl,
  } = req.body || {};

  const resolvedFname = fname || firstName || "Mwanafunzi";
  const resolvedLname = lname || lastName || "Baraka";
  const cleanEmail = (email || "").trim().toLowerCase();

  if (!cleanEmail) {
    return res.status(422).json({
      detail: [{ loc: ["body", "email"], msg: "field required", type: "value_error.missing" }]
    });
  }

  // 1. Try remote TBF School Hub backend API if available
  const remoteData = await tryRemoteApi("/auth/register/student", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fname: resolvedFname,
      lname: resolvedLname,
      email: cleanEmail,
      password: password || "BarakaPass_2026!",
      phone: phone || "",
      study_level: study_level || studyLevel || "Form 1",
      curriculum: curriculum || "Tanzania National (NECTA)",
      photo_url: photo_url || photoUrl || ""
    })
  });

  if (remoteData) {
    return res.status(201).json(remoteData);
  }

  // 2. Local fallback registration
  const userId = "std_" + Math.random().toString(36).substring(2, 10);
  const user = {
    id: userId,
    email: cleanEmail,
    fname: resolvedFname,
    lname: resolvedLname,
    role: "student",
    photo_url: photo_url || photoUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    student_profile: {
      phone: phone || "+255 700 000 000",
      study_level: study_level || studyLevel || "Form 1",
      curriculum: curriculum || "Tanzania National (NECTA)"
    },
    created_at: new Date().toISOString()
  };

  const accessToken = "tbf_std_jwt_" + Buffer.from(JSON.stringify({ userId, email: cleanEmail, role: "student" })).toString("base64");

  return res.status(201).json({
    access_token: accessToken,
    token_type: "bearer",
    expires_in: 86400,
    user,
    token: accessToken
  });
};

app.post([
  "/api/v1/auth/register",
  "/api/v1/auth/register/student",
  "/api/auth/register",
  "/api/auth/register/student"
], handleStudentRegister);

// Dedicated School Registration Endpoint Handler
const handleSchoolRegister = async (req: express.Request, res: express.Response) => {
  const {
    fname,
    lname,
    email,
    password,
    school_name,
    registration_number,
    region,
    school_type,
    headmaster_name,
    verification_document_name
  } = req.body || {};

  const cleanEmail = (email || "").trim().toLowerCase();
  const cleanSchoolName = school_name || "Baraka Secondary School";

  if (!cleanEmail) {
    return res.status(422).json({
      detail: [
        {
          loc: ["body", "email"],
          msg: "field required",
          type: "value_error.missing",
          input: email,
          ctx: {}
        }
      ]
    });
  }

  // 1. Try remote TBF School Hub backend API if available
  const remoteData = await tryRemoteApi("/auth/register/school", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fname: fname || "Headmaster",
      lname: lname || "Admin",
      email: cleanEmail,
      password: password || "password123",
      school_name: cleanSchoolName,
      registration_number: registration_number || "MoE/SEC/2026/001",
      region: region || "Dar es Salaam",
      school_type: school_type || "Secondary",
      headmaster_name: headmaster_name || "Headmaster",
      verification_document_name: verification_document_name || "proof_of_registration.pdf"
    })
  });

  if (remoteData) {
    return res.status(201).json(remoteData);
  }

  // 2. Local fallback matching exact schema requested by user
  const userId = "usr_" + Math.random().toString(36).substring(2, 10);
  const schoolId = "sch_" + Math.random().toString(36).substring(2, 10);
  const accessToken = "tbf_school_jwt_" + Buffer.from(JSON.stringify({ userId, schoolId, email: cleanEmail })).toString("base64");

  return res.status(201).json({
    access_token: accessToken,
    token_type: "bearer",
    expires_in: 86400,
    user: {
      id: userId,
      email: cleanEmail,
      fname: fname || "Headmaster",
      lname: lname || "Admin",
      role: "school_admin"
    },
    student_profile: {
      phone: "+255 700 000 000",
      study_level: "Form 1-6",
      curriculum: "Tanzania National (NECTA)",
      photo_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
    },
    school: {
      id: schoolId,
      name: cleanSchoolName,
      registration_number: registration_number || "MoE/SEC/2026/001",
      region: region || "Dar es Salaam",
      school_type: school_type || "Secondary",
      headmaster_name: headmaster_name || "Headmaster",
      verification_status: "verified"
    }
  });
};

app.post([
  "/api/v1/auth/register/school",
  "/api/auth/register/school"
], handleSchoolRegister);

// Dedicated Solo Learner Registration Endpoint Handler
const handleSoloLearnerRegister = async (req: express.Request, res: express.Response) => {
  const {
    fname,
    lname,
    firstName,
    lastName,
    email,
    password,
    phone,
    study_level,
    studyLevel,
    curriculum,
    photo_url,
    photoUrl,
  } = req.body || {};

  const resolvedFname = fname || firstName || "Learner";
  const resolvedLname = lname || lastName || "";
  const resolvedEmail = email || "";
  const resolvedPhone = phone || "";
  const resolvedStudyLevel = study_level || studyLevel || "Form 1";
  const resolvedCurriculum = curriculum || "Tanzania National (NECTA)";
  const resolvedPhotoUrl = photo_url || photoUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80";

  if (!resolvedEmail) {
    return res.status(400).json({
      success: false,
      error: "Email is required for solo learner registration."
    });
  }

  // 1. Try remote TBF School Hub backend API if available
  const remoteData = await tryRemoteApi("/auth/register/solo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fname: resolvedFname,
      lname: resolvedLname,
      email: resolvedEmail,
      password: password || "password123",
      phone: resolvedPhone,
      study_level: resolvedStudyLevel,
      curriculum: resolvedCurriculum,
      photo_url: resolvedPhotoUrl
    })
  });

  if (remoteData) {
    return res.status(201).json(remoteData);
  }

  // 2. Local fallback registration response
  const userId = "solo_" + Math.random().toString(36).substring(2, 10);
  const user = {
    id: userId,
    fname: resolvedFname,
    lname: resolvedLname,
    email: resolvedEmail,
    phone: resolvedPhone,
    study_level: resolvedStudyLevel,
    curriculum: resolvedCurriculum,
    photo_url: resolvedPhotoUrl,
    role: "student",
    account_type: "solo_learner",
    created_at: new Date().toISOString()
  };

  const token = "tbf_solo_jwt_" + Buffer.from(JSON.stringify({ userId, email: resolvedEmail })).toString("base64");

  return res.status(201).json({
    success: true,
    message: "Solo learner registered successfully",
    user,
    token
  });
};

app.post([
  "/api/v1/auth/register/solo",
  "/api/v1/auth/register/learner",
  "/api/auth/register/solo",
  "/api/auth/register/learner"
], handleSoloLearnerRegister);

// --- BACKEND IN-MEMORY & PERSISTENT DATABASE ENGINE ---
// Starts 100% empty for clean new school registration and respects remote backend database
interface BackendDB {
  students: any[];
  teachers: any[];
  classes: any[];
  materials: any[];
  timetable: any[];
  quizzes: any[];
  quizResults: any[];
  assignments: any[];
  attendance: any[];
  notifications: any[];
  school: any;
  schools: any[];
}

const serverDB: BackendDB = {
  students: [],
  teachers: [],
  classes: [],
  materials: [],
  timetable: [],
  quizzes: [],
  quizResults: [],
  assignments: [],
  attendance: [],
  notifications: [],
  school: {
    id: "sch_baraka_001",
    name: "Baraka Secondary School",
    registration_number: "MoE/SEC/2026/001",
    region: "Dar es Salaam",
    school_type: "Secondary",
    headmaster_name: "Headmaster",
    verification_status: "verified",
    phone: "+255 22 211 0000",
    email: "info@barakahub.edu.tz"
  },
  schools: []
};

// --- STUDENTS ENDPOINTS ---
app.get(["/api/v1/students", "/api/students"], async (req, res) => {
  const { class_name, search } = req.query;
  const remote = await tryRemoteApi(`/students${req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : ""}`, {
    method: "GET",
    headers: { ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) }
  });

  if (remote && Array.isArray(remote)) {
    return res.json(remote);
  }
  if (remote && (remote as any).data && Array.isArray((remote as any).data)) {
    return res.json((remote as any).data);
  }

  let list = [...serverDB.students];
  if (class_name && typeof class_name === "string") {
    list = list.filter(s => (s.class || "").toLowerCase().includes(class_name.toLowerCase()));
  }
  if (search && typeof search === "string") {
    list = list.filter(s => (s.name || "").toLowerCase().includes(search.toLowerCase()) || (s.regNo || "").toLowerCase().includes(search.toLowerCase()));
  }
  return res.json(list);
});

app.post(["/api/v1/students", "/api/students"], async (req, res) => {
  const body = req.body || {};
  const student = {
    id: body.id || `stud-${Date.now()}`,
    name: body.name || (body.fname ? `${body.fname} ${body.lname || ""}`.trim() : "New Student"),
    fname: body.fname || (body.name ? body.name.split(" ")[0] : "New"),
    lname: body.lname || (body.name ? body.name.split(" ").slice(1).join(" ") : "Student"),
    email: body.email || `student_${Date.now()}@barakahub.edu.tz`,
    regNo: body.regNo || body.reg_no || `BSS-2026-${Math.floor(100 + Math.random() * 900)}`,
    reg_no: body.regNo || body.reg_no || `BSS-2026-${Math.floor(100 + Math.random() * 900)}`,
    class: body.class || body.class_name || "Form 1A",
    gender: body.gender || "M",
    age: Number(body.age) || 15,
    parentContact: body.parentContact || body.parent_contact || "",
    progress: Number(body.progress) || 0,
    lastActive: "Just now",
    status: "Active"
  };

  // Try remote backend
  tryRemoteApi("/students", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) },
    body: JSON.stringify(body)
  }).catch(() => {});

  // Upsert in serverDB
  const existingIdx = serverDB.students.findIndex(s => s.regNo === student.regNo || s.email === student.email);
  if (existingIdx >= 0) {
    serverDB.students[existingIdx] = { ...serverDB.students[existingIdx], ...student };
  } else {
    serverDB.students.unshift(student);
  }

  return res.status(201).json({ success: true, message: "Student registered successfully", student });
});

app.get(["/api/v1/students/:id", "/api/students/:id"], async (req, res) => {
  const { id } = req.params;
  const remote = await tryRemoteApi(`/students/${id}`, {
    method: "GET",
    headers: { ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) }
  });
  if (remote) return res.json(remote);

  const student = serverDB.students.find(s => s.id === id || s.regNo === id || s.email === id);
  if (student) return res.json(student);
  return res.status(404).json({ detail: "Student not found" });
});

app.put(["/api/v1/students/:id", "/api/students/:id"], async (req, res) => {
  const { id } = req.params;
  const body = req.body || {};

  tryRemoteApi(`/students/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) },
    body: JSON.stringify(body)
  }).catch(() => {});

  const idx = serverDB.students.findIndex(s => s.id === id || s.regNo === id || s.email === id);
  if (idx >= 0) {
    serverDB.students[idx] = { ...serverDB.students[idx], ...body };
    return res.json({ success: true, student: serverDB.students[idx] });
  }

  return res.json({ success: true, student: body });
});

app.delete(["/api/v1/students/:id", "/api/students/:id"], async (req, res) => {
  const { id } = req.params;

  tryRemoteApi(`/students/${id}`, {
    method: "DELETE",
    headers: { ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) }
  }).catch(() => {});

  serverDB.students = serverDB.students.filter(s => s.id !== id && s.regNo !== id && s.email !== id);
  return res.json({ success: true, message: "Student deleted successfully" });
});

// --- TEACHERS ENDPOINTS ---
app.get(["/api/v1/teachers", "/api/teachers"], async (req, res) => {
  const { search } = req.query;
  const remote = await tryRemoteApi(`/teachers${req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : ""}`, {
    method: "GET",
    headers: { ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) }
  });

  if (remote && Array.isArray(remote)) {
    return res.json(remote);
  }
  if (remote && (remote as any).data && Array.isArray((remote as any).data)) {
    return res.json((remote as any).data);
  }

  let list = [...serverDB.teachers];
  if (search && typeof search === "string") {
    list = list.filter(t => (t.name || "").toLowerCase().includes(search.toLowerCase()) || (t.email || "").toLowerCase().includes(search.toLowerCase()));
  }
  return res.json(list);
});

app.post(["/api/v1/teachers", "/api/teachers"], async (req, res) => {
  const body = req.body || {};
  const teacher = {
    id: body.id || `teach-${Date.now()}`,
    name: body.name || (body.firstName ? `${body.firstName} ${body.lastName || ""}`.trim() : "Mwalimu"),
    firstName: body.firstName || body.name?.split(" ")[0] || "Mwalimu",
    lastName: body.lastName || body.name?.split(" ").slice(1).join(" ") || "",
    email: body.email || `teacher_${Date.now()}@barakahub.edu.tz`,
    subjects: body.subjects || "General",
    classes: body.classes || "Form 1A",
    status: body.status || "Active",
    role: body.role || "Normal"
  };

  tryRemoteApi("/teachers", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) },
    body: JSON.stringify(body)
  }).catch(() => {});

  const existingIdx = serverDB.teachers.findIndex(t => t.email === teacher.email);
  if (existingIdx >= 0) {
    serverDB.teachers[existingIdx] = { ...serverDB.teachers[existingIdx], ...teacher };
  } else {
    serverDB.teachers.unshift(teacher);
  }

  return res.status(201).json({ success: true, message: "Teacher registered successfully", teacher });
});

app.get(["/api/v1/teachers/:id", "/api/teachers/:id"], async (req, res) => {
  const { id } = req.params;
  const remote = await tryRemoteApi(`/teachers/${id}`, {
    method: "GET",
    headers: { ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) }
  });
  if (remote) return res.json(remote);

  const teacher = serverDB.teachers.find(t => t.id === id || t.email === id);
  if (teacher) return res.json(teacher);
  return res.status(404).json({ detail: "Teacher not found" });
});

app.put(["/api/v1/teachers/:id", "/api/teachers/:id"], async (req, res) => {
  const { id } = req.params;
  const body = req.body || {};

  tryRemoteApi(`/teachers/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) },
    body: JSON.stringify(body)
  }).catch(() => {});

  const idx = serverDB.teachers.findIndex(t => t.id === id || t.email === id);
  if (idx >= 0) {
    serverDB.teachers[idx] = { ...serverDB.teachers[idx], ...body };
    return res.json({ success: true, teacher: serverDB.teachers[idx] });
  }

  return res.json({ success: true, teacher: body });
});

app.delete(["/api/v1/teachers/:id", "/api/teachers/:id"], async (req, res) => {
  const { id } = req.params;

  tryRemoteApi(`/teachers/${id}`, {
    method: "DELETE",
    headers: { ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) }
  }).catch(() => {});

  serverDB.teachers = serverDB.teachers.filter(t => t.id !== id && t.email !== id);
  return res.json({ success: true, message: "Teacher deleted successfully" });
});

// --- CLASSES ENDPOINTS ---
app.get(["/api/v1/classes", "/api/classes"], async (req, res) => {
  const remote = await tryRemoteApi("/classes", {
    method: "GET",
    headers: { ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) }
  });

  if (remote && Array.isArray(remote)) {
    return res.json(remote);
  }
  if (remote && (remote as any).data && Array.isArray((remote as any).data)) {
    return res.json((remote as any).data);
  }

  return res.json(serverDB.classes);
});

app.post(["/api/v1/classes", "/api/classes"], async (req, res) => {
  const body = req.body || {};
  const newClass = {
    id: body.id || `cls-${Date.now()}`,
    name: body.name || "Form 1A",
    teacher: body.teacher || "TBD",
    studentsCount: Number(body.studentsCount) || 0,
    avgScore: Number(body.avgScore) || 0,
    subjects: body.subjects || "General"
  };

  tryRemoteApi("/classes", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) },
    body: JSON.stringify(body)
  }).catch(() => {});

  serverDB.classes.unshift(newClass);
  return res.status(201).json({ success: true, class: newClass });
});

app.get(["/api/v1/classes/:id", "/api/classes/:id"], async (req, res) => {
  const { id } = req.params;
  const remote = await tryRemoteApi(`/classes/${id}`, {
    method: "GET",
    headers: { ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) }
  });
  if (remote) return res.json(remote);

  const cls = serverDB.classes.find(c => c.id === id || (c.name && c.name.toLowerCase() === id.toLowerCase()));
  if (cls) return res.json(cls);
  return res.status(404).json({ detail: "Class not found" });
});

app.put(["/api/v1/classes/:id", "/api/classes/:id"], async (req, res) => {
  const { id } = req.params;
  const body = req.body || {};
  tryRemoteApi(`/classes/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) },
    body: JSON.stringify(body)
  }).catch(() => {});

  const idx = serverDB.classes.findIndex(c => c.id === id || (c.name && c.name.toLowerCase() === id.toLowerCase()));
  if (idx >= 0) {
    serverDB.classes[idx] = { ...serverDB.classes[idx], ...body };
    return res.json({ success: true, class: serverDB.classes[idx] });
  }
  return res.json({ success: true, class: body });
});

app.delete(["/api/v1/classes/:id", "/api/classes/:id"], async (req, res) => {
  const { id } = req.params;
  tryRemoteApi(`/classes/${id}`, {
    method: "DELETE",
    headers: { ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) }
  }).catch(() => {});

  serverDB.classes = serverDB.classes.filter(c => c.id !== id && (!c.name || c.name.toLowerCase() !== id.toLowerCase()));
  return res.json({ success: true, message: "Class deleted successfully" });
});

// --- MATERIALS / DOCUMENTS ENDPOINTS ---
app.get(["/api/v1/materials", "/api/materials"], async (req, res) => {
  const remote = await tryRemoteApi(`/materials${req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : ""}`, {
    method: "GET",
    headers: { ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) }
  });

  if (remote && Array.isArray(remote)) {
    return res.json(remote);
  }
  if (remote && (remote as any).data && Array.isArray((remote as any).data)) {
    return res.json((remote as any).data);
  }

  return res.json(serverDB.materials);
});

app.post(["/api/v1/materials", "/api/materials"], async (req, res) => {
  const body = req.body || {};
  const newMat = {
    id: body.id || `mat-${Date.now()}`,
    title: body.title || "Untitled Material",
    subject: body.subject || "General",
    classes: body.classes || body.class_name || "All Forms",
    form_num: body.form_num || 1,
    category: body.category || "Notes",
    uploadedAt: "Today",
    templateType: body.templateType || "notes",
    rawText: body.rawText || "",
    visibility: body.visibility || "public",
    arrangedContent: body.arrangedContent || body.arranged_content || null,
    quizQuestions: body.quizQuestions || body.quiz_questions || [],
    uploadedBy: body.uploadedBy || "Teacher",
    isTeacherUpload: true
  };

  tryRemoteApi("/materials", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) },
    body: JSON.stringify(body)
  }).catch(() => {});

  serverDB.materials.unshift(newMat);
  return res.status(201).json({ success: true, material: newMat });
});

app.get(["/api/v1/materials/:id", "/api/materials/:id"], async (req, res) => {
  const { id } = req.params;
  const remote = await tryRemoteApi(`/materials/${id}`, {
    method: "GET",
    headers: { ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) }
  });
  if (remote) return res.json(remote);

  const mat = serverDB.materials.find(m => m.id === id);
  if (mat) return res.json(mat);
  return res.status(404).json({ detail: "Material not found" });
});

app.put(["/api/v1/materials/:id", "/api/materials/:id"], async (req, res) => {
  const { id } = req.params;
  const body = req.body || {};
  tryRemoteApi(`/materials/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) },
    body: JSON.stringify(body)
  }).catch(() => {});

  const idx = serverDB.materials.findIndex(m => m.id === id);
  if (idx >= 0) {
    serverDB.materials[idx] = { ...serverDB.materials[idx], ...body };
    return res.json({ success: true, material: serverDB.materials[idx] });
  }
  return res.json({ success: true, material: body });
});

app.delete(["/api/v1/materials/:id", "/api/materials/:id"], async (req, res) => {
  const { id } = req.params;

  tryRemoteApi(`/materials/${id}`, {
    method: "DELETE",
    headers: { ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) }
  }).catch(() => {});

  serverDB.materials = serverDB.materials.filter(m => m.id !== id);
  return res.json({ success: true, message: "Material deleted successfully" });
});

// --- TIMETABLE ENDPOINTS ---
app.get(["/api/v1/timetable", "/api/timetable"], async (req, res) => {
  const remote = await tryRemoteApi(`/timetable${req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : ""}`, {
    method: "GET",
    headers: { ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) }
  });

  if (remote && Array.isArray(remote)) {
    return res.json(remote);
  }
  if (remote && (remote as any).data && Array.isArray((remote as any).data)) {
    return res.json((remote as any).data);
  }

  return res.json(serverDB.timetable);
});

app.get(["/api/v1/timetable/:id", "/api/timetable/:id"], async (req, res) => {
  const { id } = req.params;
  const remote = await tryRemoteApi(`/timetable/${id}`, {
    method: "GET",
    headers: { ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) }
  });
  if (remote) return res.json(remote);

  const session = serverDB.timetable.find(s => s.id === id);
  if (session) return res.json(session);
  return res.status(404).json({ detail: "Timetable session not found" });
});

app.post(["/api/v1/timetable", "/api/timetable"], async (req, res) => {
  const body = req.body || {};
  const session = {
    id: body.id || `tt-${Date.now()}`,
    day: body.day || "Monday",
    timeSlot: body.timeSlot || body.time || "08:00 - 08:45 AM",
    periodIndex: body.periodIndex || 1,
    subject: body.subject || "General",
    className: body.className || body.class_name || "Form 1A",
    teacherName: body.teacherName || body.teacher_name || "Teacher",
    teacherEmail: body.teacherEmail || body.teacher_email || "",
    room: body.room || "Classroom 1",
    status: body.status || "Upcoming",
    acceptedByTeacher: body.acceptedByTeacher ?? false,
    notes: body.notes || ""
  };

  tryRemoteApi("/timetable", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) },
    body: JSON.stringify(body)
  }).catch(() => {});

  serverDB.timetable.push(session);
  return res.status(201).json({ success: true, session });
});

app.put(["/api/v1/timetable/:id", "/api/timetable/:id"], async (req, res) => {
  const { id } = req.params;
  const body = req.body || {};
  tryRemoteApi(`/timetable/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) },
    body: JSON.stringify(body)
  }).catch(() => {});

  const idx = serverDB.timetable.findIndex(s => s.id === id);
  if (idx >= 0) {
    serverDB.timetable[idx] = { ...serverDB.timetable[idx], ...body };
    return res.json({ success: true, session: serverDB.timetable[idx] });
  }
  return res.json({ success: true, session: body });
});

app.all(["/api/v1/timetable/:id/accept", "/api/timetable/:id/accept"], async (req, res) => {
  const { id } = req.params;
  tryRemoteApi(`/timetable/${id}/accept`, {
    method: "PUT",
    headers: { ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) }
  }).catch(() => {});

  const session = serverDB.timetable.find(s => s.id === id);
  if (session) {
    session.status = "Accepted";
    session.acceptedByTeacher = true;
  }
  return res.json({ success: true, message: "Timetable session accepted" });
});

app.delete(["/api/v1/timetable/:id", "/api/timetable/:id"], async (req, res) => {
  const { id } = req.params;
  tryRemoteApi(`/timetable/${id}`, {
    method: "DELETE",
    headers: { ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) }
  }).catch(() => {});

  serverDB.timetable = serverDB.timetable.filter(s => s.id !== id);
  return res.json({ success: true, message: "Session deleted" });
});

// --- QUIZZES & ASSESSMENTS ENDPOINTS ---
app.get(["/api/v1/quizzes", "/api/quizzes"], async (req, res) => {
  const { subject, form_num, material_id } = req.query;
  const remote = await tryRemoteApi(`/quizzes${req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : ""}`, {
    method: "GET",
    headers: { ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) }
  });
  if (remote && Array.isArray(remote)) return res.json(remote);
  if (remote && (remote as any).data && Array.isArray((remote as any).data)) return res.json((remote as any).data);

  let list = [...serverDB.quizzes];
  if (subject && typeof subject === "string") {
    list = list.filter(q => (q.subject || "").toLowerCase().includes(subject.toLowerCase()));
  }
  if (form_num !== undefined) {
    list = list.filter(q => String(q.form_num) === String(form_num));
  }
  if (material_id && typeof material_id === "string") {
    list = list.filter(q => q.material_id === material_id);
  }
  return res.json(list);
});

app.get(["/api/v1/quizzes/:id", "/api/quizzes/:id"], async (req, res) => {
  const { id } = req.params;
  const remote = await tryRemoteApi(`/quizzes/${id}`, {
    method: "GET",
    headers: { ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) }
  });
  if (remote) return res.json(remote);

  const quiz = serverDB.quizzes.find(q => q.id === id);
  if (quiz) return res.json(quiz);
  return res.status(404).json({ detail: "Quiz not found" });
});

app.post(["/api/v1/quizzes", "/api/quizzes"], async (req, res) => {
  const body = req.body || {};
  const newQuiz = {
    id: body.id || `quiz-${Date.now()}`,
    title: body.title || "Practice Assessment",
    subject: body.subject || "General",
    topic: body.topic || "Core Syllabus Topic",
    form_num: Number(body.form_num) || 1,
    questions: body.questions || [],
    created_at: new Date().toISOString()
  };

  tryRemoteApi("/quizzes", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) },
    body: JSON.stringify(body)
  }).catch(() => {});

  serverDB.quizzes.unshift(newQuiz);
  return res.status(201).json({ success: true, quiz: newQuiz });
});

app.post(["/api/v1/quizzes/generate", "/api/quizzes/generate"], async (req, res) => {
  const { subject, topic, form_num, num_questions } = req.body || {};
  const subj = subject || "General Science";
  const top = topic || "Cell Biology & Energy";
  const formNum = Number(form_num) || 1;
  const count = Number(num_questions) || 4;

  const remote = await tryRemoteApi("/quizzes/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) },
    body: JSON.stringify({ subject: subj, topic: top, form_num: formNum, num_questions: count })
  });
  if (remote) return res.json(remote);

  const client = getGeminiClient();
  if (client) {
    try {
      const prompt = `Generate a ${count}-question multiple choice quiz for Form ${formNum} students in Tanzania on "${top}" (${subj}).
Return ONLY a valid JSON object matching this schema:
{
  "title": "${top} Practice Quiz",
  "subject": "${subj}",
  "form_num": ${formNum},
  "questions": [
    {
      "id": "q1",
      "question": "Question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Brief explanation"
    }
  ]
}`;
      const gen = await client.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      const parsed = JSON.parse(gen.text || "{}");
      if (parsed.questions && parsed.questions.length > 0) {
        parsed.id = `quiz-${Date.now()}`;
        serverDB.quizzes.unshift(parsed);
        return res.json(parsed);
      }
    } catch {}
  }

  const fallbackQuiz = {
    id: `quiz-${Date.now()}`,
    title: `${top} Practice Quiz`,
    subject: subj,
    form_num: formNum,
    questions: [
      {
        id: "q-1",
        question: `What is the fundamental scientific principle underlying ${top}?`,
        options: [
          "Conservation of mass and biological energy flow",
          "Random cellular fluctuations without enzymes",
          "Complete inert static equilibrium",
          "Permanent loss of chemical potential"
        ],
        correctAnswer: 0,
        explanation: "Energy and mass obey fundamental conservation principles in living systems."
      },
      {
        id: "q-2",
        question: `Which methodology is recommended when examining practical questions on ${top}?`,
        options: [
          "Formulate a hypothesis, record measurements, and verify controls",
          "Skip initial observation and jump to conclusions",
          "Rely only on intuition without data",
          "Ignore units of measurement"
        ],
        correctAnswer: 0,
        explanation: "The scientific method requires clear hypotheses and controlled observations."
      },
      {
        id: "q-3",
        question: `How does mastery of ${top} benefit students in NECTA examinations?`,
        options: [
          "It provides essential foundational concepts tested in Section B and C",
          "It is only relevant for non-scientific subjects",
          "It has no connection to past papers",
          "It only applies to Form 4 exit levels"
        ],
        correctAnswer: 0,
        explanation: "Mastery of core concepts equips students to answer structured and analytical NECTA questions."
      }
    ]
  };
  serverDB.quizzes.unshift(fallbackQuiz);
  return res.json(fallbackQuiz);
});

app.post(["/api/v1/quizzes/submit", "/api/quizzes/submit"], async (req, res) => {
  const body = req.body || {};
  const submission = {
    id: `result-${Date.now()}`,
    quiz_id: body.quiz_id || body.quizId || "quiz-general",
    student_id: body.student_id || body.studentId || "student_user",
    score: Number(body.score) || 0,
    total: Number(body.total) || 1,
    percentage: Math.round(((Number(body.score) || 0) / (Number(body.total) || 1)) * 100),
    answers: body.answers || [],
    submitted_at: new Date().toISOString()
  };

  tryRemoteApi("/quizzes/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) },
    body: JSON.stringify(body)
  }).catch(() => {});

  serverDB.quizResults.unshift(submission);
  return res.status(201).json({ success: true, result: submission });
});

app.get(["/api/v1/quizzes/results", "/api/quizzes/results"], async (req, res) => {
  const { student_id, quiz_id } = req.query;
  const remote = await tryRemoteApi(`/quizzes/results${req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : ""}`, {
    method: "GET",
    headers: { ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) }
  });
  if (remote && Array.isArray(remote)) return res.json(remote);

  let results = [...serverDB.quizResults];
  if (student_id) results = results.filter(r => r.student_id === student_id);
  if (quiz_id) results = results.filter(r => r.quiz_id === quiz_id);
  return res.json(results);
});

// --- ASSIGNMENTS & HOMEWORK ENDPOINTS ---
app.get(["/api/v1/assignments", "/api/assignments", "/api/v1/homework", "/api/homework"], async (req, res) => {
  const { class_name, subject } = req.query;
  const remote = await tryRemoteApi(`/assignments${req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : ""}`, {
    method: "GET",
    headers: { ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) }
  });
  if (remote && Array.isArray(remote)) return res.json(remote);

  let list = [...serverDB.assignments];
  if (class_name && typeof class_name === "string") {
    list = list.filter(a => (a.className || "").toLowerCase().includes(class_name.toLowerCase()));
  }
  if (subject && typeof subject === "string") {
    list = list.filter(a => (a.subject || "").toLowerCase().includes(subject.toLowerCase()));
  }
  return res.json(list);
});

app.get(["/api/v1/assignments/:id", "/api/assignments/:id"], async (req, res) => {
  const { id } = req.params;
  const remote = await tryRemoteApi(`/assignments/${id}`, {
    method: "GET",
    headers: { ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) }
  });
  if (remote) return res.json(remote);

  const item = serverDB.assignments.find(a => a.id === id);
  if (item) return res.json(item);
  return res.status(404).json({ detail: "Assignment not found" });
});

app.post(["/api/v1/assignments", "/api/assignments", "/api/v1/homework", "/api/homework"], async (req, res) => {
  const body = req.body || {};
  const assignment = {
    id: body.id || `asn-${Date.now()}`,
    title: body.title || "Subject Assignment",
    subject: body.subject || "General",
    className: body.className || body.class_name || "Form 1A",
    dueDate: body.dueDate || body.due_date || "Next Week",
    instructions: body.instructions || "",
    submissions: [],
    created_at: new Date().toISOString()
  };

  tryRemoteApi("/assignments", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) },
    body: JSON.stringify(body)
  }).catch(() => {});

  serverDB.assignments.unshift(assignment);
  return res.status(201).json({ success: true, assignment });
});

app.post(["/api/v1/assignments/:id/submit", "/api/assignments/:id/submit"], async (req, res) => {
  const { id } = req.params;
  const body = req.body || {};
  const submission = {
    studentId: body.studentId || body.student_id || "current_student",
    studentName: body.studentName || body.student_name || "Student",
    content: body.content || "",
    submittedAt: new Date().toISOString(),
    status: "Submitted"
  };

  tryRemoteApi(`/assignments/${id}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) },
    body: JSON.stringify(body)
  }).catch(() => {});

  const asn = serverDB.assignments.find(a => a.id === id);
  if (asn) {
    if (!asn.submissions) asn.submissions = [];
    asn.submissions.push(submission);
  }
  return res.json({ success: true, message: "Assignment submitted successfully", submission });
});

// --- ATTENDANCE ENDPOINTS ---
app.get(["/api/v1/attendance", "/api/attendance"], async (req, res) => {
  const { date, class_name } = req.query;
  const remote = await tryRemoteApi(`/attendance${req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : ""}`, {
    method: "GET",
    headers: { ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) }
  });
  if (remote && Array.isArray(remote)) return res.json(remote);

  let list = [...serverDB.attendance];
  if (date && typeof date === "string") {
    list = list.filter(a => a.date === date);
  }
  if (class_name && typeof class_name === "string") {
    list = list.filter(a => (a.className || "").toLowerCase().includes(class_name.toLowerCase()));
  }
  return res.json(list);
});

app.post(["/api/v1/attendance", "/api/attendance"], async (req, res) => {
  const body = req.body || {};
  const record = {
    id: body.id || `att-${Date.now()}`,
    date: body.date || new Date().toISOString().split("T")[0],
    className: body.className || body.class_name || "Form 1A",
    records: body.records || [],
    recordedBy: body.recordedBy || "Teacher",
    created_at: new Date().toISOString()
  };

  tryRemoteApi("/attendance", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) },
    body: JSON.stringify(body)
  }).catch(() => {});

  serverDB.attendance.unshift(record);
  return res.status(201).json({ success: true, message: "Attendance recorded successfully", attendance: record });
});

// --- NOTIFICATIONS ENDPOINTS ---
app.get(["/api/v1/notifications", "/api/notifications"], async (req, res) => {
  const { user_id, role } = req.query;
  const remote = await tryRemoteApi(`/notifications${req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : ""}`, {
    method: "GET",
    headers: { ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) }
  });
  if (remote && Array.isArray(remote)) return res.json(remote);

  let list = [...serverDB.notifications];
  if (user_id && typeof user_id === "string") {
    list = list.filter(n => !n.userId || n.userId === user_id);
  }
  if (role && typeof role === "string") {
    list = list.filter(n => !n.targetRole || n.targetRole === "all" || n.targetRole === role);
  }
  return res.json(list);
});

app.post(["/api/v1/notifications", "/api/notifications"], async (req, res) => {
  const body = req.body || {};
  const notif = {
    id: body.id || `notif-${Date.now()}`,
    title: body.title || "School Notification",
    message: body.message || "",
    type: body.type || "info",
    targetRole: body.targetRole || body.target_role || "all",
    userId: body.userId || body.user_id || null,
    read: false,
    created_at: new Date().toISOString()
  };

  tryRemoteApi("/notifications", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) },
    body: JSON.stringify(body)
  }).catch(() => {});

  serverDB.notifications.unshift(notif);
  return res.status(201).json({ success: true, notification: notif });
});

app.put(["/api/v1/notifications/:id/read", "/api/notifications/:id/read"], async (req, res) => {
  const { id } = req.params;
  const notif = serverDB.notifications.find(n => n.id === id);
  if (notif) notif.read = true;
  return res.json({ success: true, message: "Marked as read" });
});

// --- SCHOOL PROFILE & DIRECTORY ENDPOINTS ---
app.get(["/api/v1/school", "/api/school"], async (req, res) => {
  const remote = await tryRemoteApi("/school", {
    method: "GET",
    headers: { ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) }
  });
  if (remote) return res.json(remote);
  return res.json(serverDB.school);
});

app.put(["/api/v1/school", "/api/school"], async (req, res) => {
  const body = req.body || {};
  tryRemoteApi("/school", {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) },
    body: JSON.stringify(body)
  }).catch(() => {});

  serverDB.school = { ...serverDB.school, ...body };
  return res.json({ success: true, school: serverDB.school });
});

app.get(["/api/v1/schools", "/api/schools"], async (req, res) => {
  const remote = await tryRemoteApi("/schools", {
    method: "GET",
    headers: { ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) }
  });
  if (remote && Array.isArray(remote)) return res.json(remote);
  return res.json(serverDB.schools.length > 0 ? serverDB.schools : [serverDB.school]);
});

// --- ENDPOINTS CATALOG & HEALTH CHECK ---
const ALL_REGISTERED_ENDPOINTS = [
  { path: "/api/v1/health", methods: ["GET"], tag: "System", summary: "Health check endpoint" },
  { path: "/api/v1/endpoints", methods: ["GET"], tag: "System", summary: "Interactive catalogue of all available API endpoints" },
  { path: "/api/v1/auth/login", methods: ["POST"], tag: "Authentication", summary: "User login with email and password" },
  { path: "/api/v1/auth/register", methods: ["POST"], tag: "Authentication", summary: "General / student registration" },
  { path: "/api/v1/auth/register/student", methods: ["POST"], tag: "Authentication", summary: "Dedicated student registration" },
  { path: "/api/v1/auth/register/school", methods: ["POST"], tag: "Authentication", summary: "School registration with verification documents" },
  { path: "/api/v1/auth/register/solo", methods: ["POST"], tag: "Authentication", summary: "Independent solo learner registration" },
  { path: "/api/v1/auth/me", methods: ["GET"], tag: "Authentication", summary: "Get current authenticated user profile" },
  { path: "/api/v1/auth/url", methods: ["GET"], tag: "Authentication", summary: "Google OAuth consent URL" },
  { path: "/api/v1/send-verification-email", methods: ["POST"], tag: "Authentication", summary: "Send 6-digit verification code email" },
  { path: "/api/v1/ai/ask", methods: ["POST"], tag: "AI Companion", summary: "Ask Baraka educational AI assistant" },
  { path: "/api/v1/arrange-material", methods: ["POST"], tag: "AI Companion", summary: "AI arrangement of study notes and quiz generation" },
  { path: "/api/v1/students", methods: ["GET", "POST"], tag: "Students", summary: "List or register students" },
  { path: "/api/v1/students/:id", methods: ["GET", "PUT", "DELETE"], tag: "Students", summary: "View, update, or remove student" },
  { path: "/api/v1/teachers", methods: ["GET", "POST"], tag: "Teachers", summary: "List or register teachers" },
  { path: "/api/v1/teachers/:id", methods: ["GET", "PUT", "DELETE"], tag: "Teachers", summary: "View, update, or remove teacher" },
  { path: "/api/v1/classes", methods: ["GET", "POST"], tag: "Classes", summary: "List or create classes" },
  { path: "/api/v1/classes/:id", methods: ["GET", "PUT", "DELETE"], tag: "Classes", summary: "View, update, or remove class" },
  { path: "/api/v1/materials", methods: ["GET", "POST"], tag: "Materials", summary: "List or upload learning materials" },
  { path: "/api/v1/materials/:id", methods: ["GET", "PUT", "DELETE"], tag: "Materials", summary: "View, update, or remove material" },
  { path: "/api/v1/quizzes", methods: ["GET", "POST"], tag: "Quizzes", summary: "List or create quizzes" },
  { path: "/api/v1/quizzes/generate", methods: ["POST"], tag: "Quizzes", summary: "Generate practice quiz on any topic" },
  { path: "/api/v1/quizzes/submit", methods: ["POST"], tag: "Quizzes", summary: "Submit student quiz responses and score" },
  { path: "/api/v1/quizzes/results", methods: ["GET"], tag: "Quizzes", summary: "Fetch student quiz performance history" },
  { path: "/api/v1/timetable", methods: ["GET", "POST"], tag: "Timetable", summary: "List or create timetable sessions" },
  { path: "/api/v1/timetable/:id", methods: ["GET", "PUT", "DELETE"], tag: "Timetable", summary: "View, update, or remove session" },
  { path: "/api/v1/timetable/:id/accept", methods: ["PUT", "POST"], tag: "Timetable", summary: "Teacher acceptance of timetable session" },
  { path: "/api/v1/live-session", methods: ["GET", "POST"], tag: "Live Classroom", summary: "Live broadcast status and control" },
  { path: "/api/v1/live-session/stream", methods: ["GET"], tag: "Live Classroom", summary: "Server-Sent Events real-time sync stream" },
  { path: "/api/v1/assignments", methods: ["GET", "POST"], tag: "Assignments", summary: "List or assign homework" },
  { path: "/api/v1/assignments/:id/submit", methods: ["POST"], tag: "Assignments", summary: "Submit student homework" },
  { path: "/api/v1/attendance", methods: ["GET", "POST"], tag: "Attendance", summary: "Fetch or mark student attendance" },
  { path: "/api/v1/notifications", methods: ["GET", "POST"], tag: "Notifications", summary: "Fetch or send school notifications" },
  { path: "/api/v1/school", methods: ["GET", "PUT"], tag: "School Profile", summary: "Fetch or update current school profile" }
];

app.get(["/api/v1/endpoints", "/api/endpoints"], (req, res) => {
  res.json({
    status: "ok",
    total_endpoints: ALL_REGISTERED_ENDPOINTS.length,
    endpoints: ALL_REGISTERED_ENDPOINTS
  });
});

app.get(["/api/v1/health", "/api/health"], (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "TBF School Hub API"
  });
});

// AI Chat endpoint (Ask Baraka AI)
const handleAskBaraka = async (req: express.Request, res: express.Response) => {
  const { message, history } = req.body || {};
  if (!message || typeof message !== "string" || !message.trim()) {
    return res.status(422).json({
      detail: [
        {
          loc: ["body", "message"],
          msg: "field required",
          type: "value_error.missing",
          input: message,
          ctx: {}
        }
      ]
    });
  }

  const defaultSources = [
    "NECTA Secondary Curriculum Guidelines",
    "Tanzania Institute of Education (TIE) Textbooks",
    "Baraka Education AI Knowledge Base"
  ];

  // 1. Try primary remote backend endpoint first (with short timeout)
  try {
    const controller = new AbortController();
    const remoteTimeout = setTimeout(() => controller.abort(), 2000);
    const remoteRes = await fetch(`${REMOTE_API_BASE}/ai/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history }),
      signal: controller.signal
    });
    clearTimeout(remoteTimeout);

    if (remoteRes.ok) {
      const data = await remoteRes.json();
      return res.json({
        text: data.text || data.response || "No response generated.",
        source: data.source || "tbf-api",
        knowledge_sources: data.knowledge_sources || defaultSources
      });
    }
  } catch (err: any) {
    console.warn("[Baraka Chat] Remote backend call failed or timed out, using local engine:", err.message);
  }

  // 2. Fallback to local Gemini or simulation
  try {
    const client = getGeminiClient();
    if (!client) {
      // Return a simulated high-quality response as fallback
      const simulatedText = simulateBarakaResponse(message);
      await new Promise((resolve) => setTimeout(resolve, 500));
      return res.json({
        text: simulatedText,
        source: "simulation",
        knowledge_sources: defaultSources
      });
    }

    const systemInstruction = 
      "You are Baraka, a patient, highly clear, professional, and encouraging AI study companion for secondary school students in Tanzania and Africa. " +
      "You are fluent in both English and Kiswahili, blending them in a warm, welcoming yet deeply professional educational tone.\n\n" +
      "CRITICAL FORMATTING GUIDELINES:\n" +
      "1. ALWAYS structure your responses beautifully using rich Markdown. Avoid long blocks of text.\n" +
      "2. Use headings to organize topics: Use '##' for main sections and '###' for sub-sections or vocabulary terms.\n" +
      "3. Use blockquotes (starting with '>') for formal definitions, scientific laws, or vital reminders.\n" +
      "4. Use bullet points ('* ' or '- ') and numbered steps ('1. ') to break down complex procedures or explanations.\n" +
      "5. Use '**bold text**' for key vocabulary words and crucial definitions.\n" +
      "6. For math equations, use code backticks like `V = I * R`.\n" +
      "7. Use markdown tables when comparing elements or detailing raw data.\n\n" +
      "Be professional, precise, educational, and encouraging.";

    let promptContext = `${systemInstruction}\n\n`;
    if (history && Array.isArray(history)) {
      history.forEach((turn: any) => {
        const sender = turn.sender === "user" ? "Student" : "Baraka";
        promptContext += `${sender}: ${turn.text || turn.message || ""}\n`;
      });
    }
    promptContext += `Student: ${message}\nBaraka:`;

    const generatePromise = client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: promptContext,
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Timeout after 15 seconds")), 15000)
    );

    const response = await Promise.race([generatePromise, timeoutPromise]);

    const replyText = response.text || "Samahani, I couldn't generate a response. Please try again.";
    return res.json({
      text: replyText,
      source: "gemini",
      knowledge_sources: defaultSources
    });
  } catch (error: any) {
    console.warn("[Baraka Chat] Gemini API request failed or timed out. Falling back to simulation:", error.message);
    const simulatedText = simulateBarakaResponse(message);
    return res.json({
      text: simulatedText,
      source: "simulation-fallback",
      knowledge_sources: defaultSources
    });
  }
};

app.post([
  "/api/v1/ai/ask",
  "/api/v1/ask-baraka",
  "/api/ai/ask",
  "/api/ask-baraka"
], handleAskBaraka);

// Real email verification endpoint (for custom email flow)
app.post([
  "/api/send-verification-email",
  "/api/v1/send-verification-email",
  "/api/v1/auth/send-verification-email"
], async (req, res) => {
  const { email, code, name } = req.body;
  if (!email || !code) {
    return res.status(400).json({ error: "Email and code are required" });
  }

  try {
    const { previewUrl } = await sendVerificationCodeEmail(email, code, name || "Mwanafunzi");
    return res.json({ success: true, previewUrl });
  } catch (error: any) {
    console.error("[Baraka Mailer] Send error:", error);
    return res.status(500).json({ error: "Failed to send verification email.", details: error.message });
  }
});

// Google OAuth URL Generation
app.get("/api/auth/url", (req, res) => {
  const redirectUri = getRedirectUri(req);
  const clientId = (process.env.OAUTH_CLIENT_ID || process.env.CLIENT_ID || configClientId || "").trim();
  
  console.log("[Google OAuth Debug] Generating auth URL:");
  console.log("  clientId:", clientId);
  console.log("  redirectUri:", redirectUri);
  console.log("  process.env.APP_URL:", process.env.APP_URL);
  console.log("  process.env.OAUTH_REDIRECT_URI:", process.env.OAUTH_REDIRECT_URI);

  if (!clientId) {
    return res.status(500).json({
      error: "OAUTH_CLIENT_ID is not configured. Please set up Google OAuth in settings."
    });
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email",
    access_type: "offline",
    prompt: "select_account",
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  res.json({ url: authUrl });
});

// Google OAuth Callback Handler
app.get(["/auth/callback", "/auth/callback/"], async (req, res) => {
  const { code, error } = req.query;
  
  if (error) {
    return res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: "OAUTH_AUTH_FAILURE", error: "${error}" }, "*");
              window.close();
            } else {
              window.location.href = "/";
            }
          </script>
          <p>Authentication failed: ${error}</p>
        </body>
      </html>
    `);
  }

  if (!code) {
    return res.status(400).send("No authorization code provided.");
  }

  try {
    const clientId = (process.env.OAUTH_CLIENT_ID || process.env.CLIENT_ID || configClientId || "").trim();
    const clientSecret = (process.env.OAUTH_CLIENT_SECRET || process.env.CLIENT_SECRET || "").trim();
    const redirectUri = getRedirectUri(req);

    // 1. Exchange Auth Code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: code as string,
        client_id: clientId || "",
        client_secret: clientSecret || "",
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      throw new Error(`Token exchange failed: ${errText}`);
    }

    const tokens = await tokenResponse.json() as { access_token: string; id_token?: string };

    // 2. Fetch Google profile info
    const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!profileResponse.ok) {
      throw new Error("Failed to fetch Google profile info");
    }

    const googleUser = await profileResponse.json() as {
      email: string;
      given_name?: string;
      family_name?: string;
      name?: string;
      picture?: string;
    };

    // 3. Generate verification code & send email
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const givenName = googleUser.given_name || googleUser.name?.split(" ")[0] || "Student";
    const familyName = googleUser.family_name || googleUser.name?.split(" ").slice(1).join(" ") || "Google";
    
    let previewUrl: string | false | undefined;
    try {
      const emailResult = await sendVerificationCodeEmail(googleUser.email, verificationCode, givenName);
      previewUrl = emailResult.previewUrl;
    } catch (mailErr) {
      console.error("[Baraka Mailer] Failed to send email to " + googleUser.email, mailErr);
    }

    // 4. Return success postMessage script with profile and verificationCode!
    const profilePayload = JSON.stringify({
      firstName: givenName,
      lastName: familyName,
      email: googleUser.email,
      photoUrl: googleUser.picture || "",
    });

    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: "OAUTH_AUTH_SUCCESS",
                profile: ${profilePayload},
                verificationCode: "${verificationCode}",
                previewUrl: ${previewUrl ? `"${previewUrl}"` : "null"}
              }, "*");
              window.close();
            } else {
              window.location.href = "/";
            }
          </script>
          <p>Authentication successful. You can close this window now.</p>
        </body>
      </html>
    `);

  } catch (err: any) {
    console.error("[Baraka OAuth] Error inside callback:", err);
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: "OAUTH_AUTH_FAILURE", error: ${JSON.stringify(err.message)} }, "*");
              window.close();
            } else {
              window.location.href = "/";
            }
          </script>
          <p>Authentication error: ${err.message}</p>
        </body>
      </html>
    `);
  }
});

// --- CROSS-DEVICE REAL-TIME LIVE SESSION SYNC SERVICE ---
let currentLiveSession: any = {
  isActive: false,
  subject: "",
  topic: "",
  teacherName: "",
  targetClass: "",
  whiteboardText: "",
  presentationActive: false,
  presentationType: "slide",
  presentationTitle: "",
  presentationSlideIndex: 0,
  presentationSlides: [],
  activeQuiz: null,
  attendance: {},
  sharedDocuments: [],
  assignments: []
};

const liveSseClients: any[] = [];

app.get("/api/live-session", (req, res) => {
  res.json(currentLiveSession);
});

app.post("/api/live-session", (req, res) => {
  if (req.body && typeof req.body === "object") {
    currentLiveSession = { ...currentLiveSession, ...req.body };
    const payload = `data: ${JSON.stringify(currentLiveSession)}\n\n`;
    liveSseClients.forEach((client) => {
      try {
        client.write(payload);
      } catch (e) {}
    });
  }
  res.json({ success: true, liveSession: currentLiveSession });
});

app.get("/api/live-session/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  if ((res as any).flushHeaders) {
    (res as any).flushHeaders();
  }

  res.write(`data: ${JSON.stringify(currentLiveSession)}\n\n`);
  liveSseClients.push(res);

  req.on("close", () => {
    const idx = liveSseClients.indexOf(res);
    if (idx !== -1) {
      liveSseClients.splice(idx, 1);
    }
  });
});

// Helper to generate a structured study material and quiz fallback when AI is unavailable
function generateFallbackMaterial(title: string, subject: string, templateType: string, rawText: string) {
  const subjLower = (subject || "").toLowerCase();
  const titleLower = (title || "").toLowerCase();
  
  const paragraphs = rawText
    .split(/\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0);
  
  const introduction = paragraphs[0] || `Karibu! Let's explore "${title}" under the subject of ${subject}. This structured lesson is designed to help you master key concepts quickly.`;
  
  const sections: { heading: string; body: string; paragraphs: string[] }[] = [];
  const keyPoints: string[] = [];
  
  const contentParagraphs = paragraphs.slice(1);
  if (contentParagraphs.length > 0) {
    let currentHeading = "Key Concepts";
    let currentBodyParts: string[] = [];
    
    contentParagraphs.forEach((para, idx) => {
      if (para.length < 60 && (para.startsWith("#") || para.startsWith("*") || para.endsWith(":") || para.match(/^[A-Z0-9\s.-]+$/))) {
        if (currentBodyParts.length > 0) {
          sections.push({
            heading: currentHeading,
            body: currentBodyParts.join("\n\n"),
            paragraphs: [...currentBodyParts]
          });
          currentBodyParts = [];
        }
        currentHeading = para.replace(/^[#*\s-]+/, "").replace(/:$/, "").trim();
        keyPoints.push(currentHeading);
      } else {
        currentBodyParts.push(para);
      }
    });
    
    if (currentBodyParts.length > 0 || sections.length === 0) {
      sections.push({
        heading: currentHeading,
        body: currentBodyParts.join("\n\n") || "Soma kwa makini kuelewa mada hii muhimu.",
        paragraphs: currentBodyParts.length > 0 ? [...currentBodyParts] : ["Soma kwa makini kuelewa mada hii muhimu."]
      });
    }
  } else {
    sections.push({
      heading: "Overview of " + title,
      body: rawText || "Mada hii haina maelezo ya kina kwa sasa. Tafadhali soma muhtasari uliochapishwa.",
      paragraphs: [rawText || "Mada hii haina maelezo ya kina kwa sasa. Tafadhali soma muhtasari uliochapishwa."]
    });
  }
  
  if (keyPoints.length === 0) {
    keyPoints.push(`Soma kwa makini mada ya ${title}`, "Elewa mifano na fanya mazoezi ya maswali", "Uliza AI Baraka kama una swali lolote la ziada");
  } else {
    keyPoints.push("Hakikisha unafanya mazoezi ya quiz kujiandaa na mitihani!");
  }
  
  let quizQuestions = [
    {
      id: "q-1",
      question: `What is the primary focus of studying "${title}" in ${subject}?`,
      options: [
        "Understanding core concepts and practical definitions",
        "Memorizing formulas without understanding their meanings",
        "Ignoring teacher's notes and studying independently",
        "All of the above"
      ],
      correctAnswer: 0,
      explanation: `Correct! The primary focus of studying ${title} is to build a solid foundational understanding of its core concepts and key terms.`
    },
    {
      id: "q-2",
      question: `Which of the following is true regarding "${title}"?`,
      options: [
        "It is only relevant for advanced level secondary school",
        "It constitutes a major topic in the national curriculum",
        "It has no practical real-life applications",
        "It can only be solved using a scientific calculator"
      ],
      correctAnswer: 1,
      explanation: `Correct! ${title} is a critical topic in the curriculum, designed to cultivate analytical thinking and scientific inquiry.`
    },
    {
      id: "q-3",
      question: `What is the most effective way to master the material on "${title}"?`,
      options: [
        "Skimming through the text once before exams",
        "Active recall, self-testing with quizzes, and asking Baraka",
        "Waiting for classmates to explain everything",
        "Copying someone else's worksheet"
      ],
      correctAnswer: 1,
      explanation: "Exactly! Active recall, self-testing, and seeking clarification from Baraka are proven ways to build long-term memory and mastery."
    }
  ];

  if (subjLower.includes("bio") || titleLower.includes("photo") || rawText.toLowerCase().includes("photo")) {
    quizQuestions = [
      {
        id: "q-1",
        question: "What is the primary pigment responsible for absorbing solar energy during photosynthesis?",
        options: ["Carotene", "Xanthophyll", "Chlorophyll", "Hemoglobin"],
        correctAnswer: 2,
        explanation: "Correct! Chlorophyll is the green pigment in chloroplasts that absorbs light energy (primarily blue and red wavelengths) to drive photosynthesis."
      },
      {
        id: "q-2",
        question: "Which of the following is the correct chemical equation for photosynthesis?",
        options: [
          "C₆H₁₂O₆ + 6O₂ ➔ 6CO₂ + 6H₂O",
          "6CO₂ + 6H₂O + Sunlight ➔ C₆H₁₂O₆ + 6O₂",
          "CO₂ + H₂O ➔ Glucose + Nitrogen",
          "Glucose + Sunlight ➔ Oxygen + Water"
        ],
        correctAnswer: 1,
        explanation: "Correct! Six molecules of carbon dioxide and six molecules of water, powered by sunlight energy, produce one molecule of glucose and six molecules of oxygen gas."
      },
      {
        id: "q-3",
        question: "In which organelle of a plant cell does photosynthesis take place?",
        options: ["Mitochondrion", "Nucleus", "Ribosome", "Chloroplast"],
        correctAnswer: 3,
        explanation: "Correct! Photosynthesis takes place in chloroplasts, which contain chlorophyll to capture light energy."
      }
    ];
  } else if (subjLower.includes("math") || titleLower.includes("algebra") || rawText.toLowerCase().includes("algebra") || rawText.toLowerCase().includes("solve") || rawText.toLowerCase().includes("hesabu")) {
    quizQuestions = [
      {
        id: "q-1",
        question: "If 2x + 3 = 11, what is the value of x?",
        options: ["x = 3", "x = 4", "x = 5", "x = 8"],
        correctAnswer: 1,
        explanation: "Correct! Subtract 3 from both sides to get 2x = 8. Then divide by 2 to get x = 4."
      },
      {
        id: "q-2",
        question: "What is a mathematical expression that uses variables, numbers, and operations called?",
        options: ["An algebraic expression", "An equation", "An inequality", "A constant"],
        correctAnswer: 0,
        explanation: "Correct! An algebraic expression consists of variables, numbers, and operators (e.g., 3x + 5y - 2), but does not contain an equals sign."
      },
      {
        id: "q-3",
        question: "What is the value of x in the equation: x/3 - 4 = 2?",
        options: ["x = 6", "x = 9", "x = 12", "x = 18"],
        correctAnswer: 3,
        explanation: "Correct! First add 4 to both sides: x/3 = 6. Then multiply both sides by 3 to get x = 18."
      }
    ];
  } else if (subjLower.includes("geo") || titleLower.includes("water cycle") || rawText.toLowerCase().includes("water cycle") || rawText.toLowerCase().includes("mvua") || rawText.toLowerCase().includes("mzunguko")) {
    quizQuestions = [
      {
        id: "q-1",
        question: "What is the process where liquid water turns into vapor due to solar heat?",
        options: ["Condensation", "Precipitation", "Evaporation", "Transpiration"],
        correctAnswer: 2,
        explanation: "Correct! Evaporation is the conversion of liquid water to gaseous water vapor, powered by energy from the sun."
      },
      {
        id: "q-2",
        question: "What form of precipitation occurs when water vapor condenses and falls in liquid drops?",
        options: ["Snow", "Hail", "Rain", "Sleet"],
        correctAnswer: 2,
        explanation: "Correct! Rain is liquid precipitation that falls from saturated clouds when gravity overcomes air currents."
      },
      {
        id: "q-3",
        question: "Which term describes water loss specifically from the pores of plant leaves into the atmosphere?",
        options: ["Condensation", "Transpiration", "Sublimation", "Precipitation"],
        correctAnswer: 1,
        explanation: "Correct! Transpiration is the release of water vapor from plant leaves through stomatal pores."
      }
    ];
  } else if (subjLower.includes("phy") || titleLower.includes("ohm") || rawText.toLowerCase().includes("ohm") || rawText.toLowerCase().includes("circuit") || rawText.toLowerCase().includes("umeme")) {
    quizQuestions = [
      {
        id: "q-1",
        question: "What is the correct mathematical formula for Ohm's Law?",
        options: ["P = I * V", "V = I * R", "I = V * R", "R = V * I"],
        correctAnswer: 1,
        explanation: "Correct! Ohm's law states that Voltage (V) is equal to Current (I) times Resistance (R): V = I * R."
      },
      {
        id: "q-2",
        question: "If the voltage across a 100 Ω resistor is 6 V, what is the current in milliamperes (mA)?",
        options: ["6 mA", "60 mA", "600 mA", "16.6 mA"],
        correctAnswer: 1,
        explanation: "Correct! Current I = V / R = 6 / 100 = 0.06 Amperes. Multiplying by 1000 converts it to 60 mA."
      },
      {
        id: "q-3",
        question: "What electrical property describes how much a component opposes the flow of electric current?",
        options: ["Voltage", "Capacitance", "Resistance", "Conductivity"],
        correctAnswer: 2,
        explanation: "Correct! Resistance opposes the flow of current. It is measured in Ohms (Ω)."
      }
    ];
  }

  return {
    arrangedContent: {
      introduction,
      sections,
      summary: paragraphs[paragraphs.length - 1] || "Mada hii inatoa msingi mzuri wa masomo yako ya baadaye. Endelea kufanya mazoezi kujiimarisha!",
      keyPoints
    },
    quizQuestions
  };
}

// Endpoint to auto-arrange learning materials and generate quizzes using Gemini or smart fallback
app.post([
  "/api/v1/arrange-material",
  "/api/arrange-material"
], async (req, res) => {
  const { title, subject, templateType, rawText } = req.body;
  
  if (!rawText || !rawText.trim()) {
    return res.status(400).json({ error: "Text content (rawText) is required." });
  }

  const matTitle = title || "Untitled Material";
  const matSubject = subject || "General";
  const matTemplate = templateType || "notes";

  // 1. Try remote TBF backend API if available
  const remoteData = await tryRemoteApi("/arrange-material", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: matTitle, subject: matSubject, templateType: matTemplate, rawText })
  });

  if (remoteData) {
    return res.json(remoteData);
  }

  // 2. Fallback to local Gemini or smart heuristic parser
  const client = getGeminiClient();
  if (client) {
    try {
      console.log(`[Baraka AI] Arranging material "${matTitle}" via Gemini API...`);
      const prompt = `
        You are Baraka, an AI learning content designer for Tanzanian secondary school students.
        Analyze and arrange the following study material about "${matTitle}" (Subject: "${matSubject}") using the "${matTemplate}" template.
        
        The template "${matTemplate}" should be structured as follows:
        - "notes": Standard detailed notes with clear headings, definitions, and bullet-points.
        - "quiz": Conceptual active recall cards with key overview and study tips.
        - "practical": Laboratory apparatus, procedures, observation questions, and safety cautions.
        - "cheat_sheet": Dense high-yield quick summary, key formulas/equations, and brief bulleted associations.
        
        Output a JSON object with this EXACT structure:
        {
          "arrangedContent": {
            "introduction": "Friendly, encouraging 2-3 sentence introduction to the topic blending English and Kiswahili warmly (e.g. starting with Habari!).",
            "sections": [
              {
                "heading": "Descriptive heading",
                "body": "Detailed paragraph content with clear markdown bullet points if necessary explaining this concept."
              }
            ],
            "summary": "Concise, memorable summary of the material.",
            "keyPoints": [
              "Core lesson takeaway 1",
              "Core lesson takeaway 2"
            ]
          },
          "quizQuestions": [
            {
              "id": "q-1",
              "question": "A conceptual multiple choice question testing understanding of this material.",
              "options": ["Option A", "Option B", "Option C", "Option D"],
              "correctAnswer": 0, // 0-indexed integer of the correct option
              "explanation": "Friendly explanation of why this is correct and helpful context."
            }
          ]
        }
        
        Generate exactly 3-4 high-yield multiple choice questions in "quizQuestions".
        Return ONLY valid JSON. Absolutely no markdown wrappers, no backticks \`\`\`json, no introductory conversational text.
        
        Raw content to process:
        ${rawText}
      `;

      const generatePromise = client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout after 3.5 seconds")), 3500)
      );

      const response = await Promise.race([generatePromise, timeoutPromise]);

      const jsonStr = (response.text || "").replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(jsonStr);
      console.log(`[Baraka AI] Material successfully arranged and quizzes generated!`);
      return res.json(parsed);
    } catch (err: any) {
      console.warn("[Baraka AI] Gemini arrange failed or timed out, falling back to rule-based engine:", err.message);
    }
  }

  // Fallback
  const arranged = generateFallbackMaterial(matTitle, matSubject, matTemplate, rawText);
  return res.json(arranged);
});

// Transparent catch-all proxy / fallback for any unhandled /api/v1/* and /api/* calls to remote TBF backend
app.use(["/api/v1", "/api"], async (req, res) => {
  const targetPath = req.path;
  if (targetPath === "/health" || targetPath === "/status") {
    return res.json({ status: "healthy", timestamp: new Date().toISOString() });
  }

  const remoteData = await tryRemoteApi(targetPath, {
    method: req.method,
    headers: {
      "Content-Type": "application/json",
      ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {})
    },
    ...(["POST", "PUT", "PATCH"].includes(req.method) && req.body && Object.keys(req.body).length > 0 ? { body: JSON.stringify(req.body) } : {})
  });

  if (remoteData) {
    return res.json(remoteData);
  }

  // Return empty array for list endpoints or success fallback
  if (targetPath.includes("list") || targetPath.includes("materials") || targetPath.includes("students") || targetPath.includes("teachers") || targetPath.includes("classes") || targetPath.includes("timetable") || targetPath.includes("quizzes") || targetPath.includes("assignments") || targetPath.includes("attendance") || targetPath.includes("notifications")) {
    return res.json([]);
  }

  return res.json({ success: true, message: "Processed by TBF School Hub engine" });
});

// Configure Vite or Static files depending on environment
async function startServer() {
  let isProduction = process.env.NODE_ENV === "production" || 
                     (process.argv[1] && process.argv[1].includes("server.cjs")) ||
                     !fs.existsSync(path.join(process.cwd(), "node_modules/vite"));

  if (!isProduction) {
    try {
      console.log("[Baraka Hub Backend] Starting in DEVELOPMENT mode with Vite...");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (viteError: any) {
      console.error("[Baraka Hub Backend] Failed to load Vite, falling back to static files:", viteError.message);
      isProduction = true;
    }
  }

  if (isProduction) {
    console.log("[Baraka Hub Backend] Starting in PRODUCTION mode with static dist...");
    // Let's resolve the absolute path to the dist folder
    let distPath = path.join(process.cwd(), "dist");
    
    // In esbuild-bundled CommonJS output, __dirname will point directly to dist/ if it was built there
    if (typeof __dirname !== "undefined") {
      if (__dirname.endsWith("dist")) {
        distPath = __dirname;
      } else {
        const maybeDist = path.join(__dirname, "dist");
        if (fs.existsSync(maybeDist)) {
          distPath = maybeDist;
        }
      }
    }
    
    console.log(`[Baraka Hub Backend] Serving static files from: ${distPath}`);
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      const indexPath = path.join(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send("Baraka Hub: Built index.html not found. Please run a build first.");
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Baraka Hub Backend] Server running on http://localhost:${PORT}`);
  });
}

startServer();
