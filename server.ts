import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import nodemailer from "nodemailer";
import fs from "fs";
import multer from "multer";

dotenv.config();

// Bypass Node SSL cert altname mismatch check for backend API calls
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// Multer in-memory storage for file uploads (CSV, Excel)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }
});

// OAuth client ID configuration
let configClientId = process.env.OAUTH_CLIENT_ID || "";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

// Trust reverse proxy (Cloud Run, Nginx, etc.) to correctly populate req.protocol, req.hostname, etc.
app.set("trust proxy", true);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

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

// Supported text task candidate models with graceful failover on 503 / high-demand
const CANDIDATE_GEMINI_MODELS = [
  "gemini-3.6-flash",
  "gemini-flash-lite-latest",
  "gemini-3.8-flash"
];

async function callGeminiContentWithFailover(
  client: GoogleGenAI,
  params: { contents: any; config?: any },
  timeoutMs: number = 6000
) {
  let lastError: any = null;
  const perModelTimeout = Math.max(1800, Math.floor(timeoutMs / CANDIDATE_GEMINI_MODELS.length));
  for (const model of CANDIDATE_GEMINI_MODELS) {
    try {
      const generatePromise = client.models.generateContent({
        model,
        contents: params.contents,
        ...(params.config ? { config: params.config } : {})
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout after ${perModelTimeout}ms on model ${model}`)), perModelTimeout)
      );

      const res: any = await Promise.race([generatePromise, timeoutPromise]);
      if (res && res.text) {
        return res;
      }
    } catch (err: any) {
      lastError = err;
      // Failover quietly without flooding console with error JSON
      console.log(`[Gemini API] Note on ${model} (trying next model): ${err?.status || err?.code || "retry"}`);
    }
  }
  throw lastError;
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

/**
 * Normalizes remote endpoints to prevent duplicate /api/v1 prefixes
 */
function normalizeRemoteEndpoint(endpoint: string): string {
  let ep = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  if (ep.startsWith("/api/v1/")) {
    ep = ep.substring("/api/v1".length);
  } else if (ep.startsWith("/api/")) {
    ep = ep.substring("/api".length);
  } else if (ep === "/api/v1" || ep === "/api") {
    ep = "";
  }
  return ep;
}

// Safe remote API caller with comprehensive timeout
async function tryRemoteApi(endpoint: string, options: RequestInit = {}, timeoutMs = 8000): Promise<any | null> {
  if (!REMOTE_API_BASE) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const targetUrl = `${REMOTE_API_BASE}${normalizeRemoteEndpoint(endpoint)}`;
    const userHeaders = (options.headers as Record<string, string>) || {};
    const reqHeaders: Record<string, string> = {
      "Accept": "application/json, text/plain, */*",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      ...userHeaders
    };
    if (!("Content-Type" in userHeaders) && !(typeof FormData !== "undefined" && options.body instanceof FormData)) {
      reqHeaders["Content-Type"] = "application/json";
    }

    const res = await fetch(targetUrl, {
      ...options,
      headers: reqHeaders,
      signal: controller.signal
    });
    clearTimeout(timer);
    const text = await res.text().catch(() => "");
    if (text && (text.includes("<!DOCTYPE") || text.includes("<html") || text.includes("cf-chl"))) {
      return null;
    }
    try {
      return text ? JSON.parse(text) : null;
    } catch {
      return text || null;
    }
  } catch (err: any) {
    // Seamless local fallback without console error noise
  }
  return null;
}

// Full remote caller that preserves status codes (e.g., 200, 201, 400, 401, 403, 404, 422, 503)
async function tryRemoteApiFull(endpoint: string, options: RequestInit = {}, timeoutMs = 8000): Promise<{ ok: boolean; status: number; data: any } | null> {
  if (!REMOTE_API_BASE) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const targetUrl = `${REMOTE_API_BASE}${normalizeRemoteEndpoint(endpoint)}`;
    const userHeaders = (options.headers as Record<string, string>) || {};
    const reqHeaders: Record<string, string> = {
      "Accept": "application/json, text/plain, */*",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      ...userHeaders
    };
    if (!("Content-Type" in userHeaders) && !(typeof FormData !== "undefined" && options.body instanceof FormData)) {
      reqHeaders["Content-Type"] = "application/json";
    }

    const res = await fetch(targetUrl, {
      ...options,
      headers: reqHeaders,
      signal: controller.signal
    });
    clearTimeout(timer);
    const text = await res.text().catch(() => "");
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    if (typeof data === "string" && (data.includes("<!DOCTYPE") || data.includes("<html") || data.includes("cf-chl"))) {
      // Cloudflare interstitial or HTML challenge intercepted - fallback to local engine
      return null;
    }
    return { ok: res.ok, status: res.status, data };
  } catch (err: any) {
    return null;
  }
}

// Dedicated Login Endpoint Handler
const handleLogin = async (req: express.Request, res: express.Response) => {
  const { email, password } = req.body || {};
  const cleanEmail = (email || "").trim().toLowerCase();
  const cleanPassword = (password || "").trim();

  if (!cleanEmail || !cleanPassword) {
    return res.status(400).json({ success: false, error: "Both email and password are required for login." });
  }

  // 1. Try remote TBF School Hub backend API if available
  const remoteResult = await tryRemoteApiFull("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: cleanEmail, password: cleanPassword })
  });

  if (remoteResult && remoteResult.status >= 200 && remoteResult.status < 300 && remoteResult.data) {
    return res.status(remoteResult.status).json(remoteResult.data);
  }

  // 2. Check local database for registered accounts
  const matchedUser = (serverDB.users || []).find(u => (u.email || "").toLowerCase() === cleanEmail);
  const matchedStudent = (serverDB.students || []).find(s => (s.email || "").toLowerCase() === cleanEmail);
  const matchedTeacher = (serverDB.teachers || []).find(t => (t.email || "").toLowerCase() === cleanEmail);
  const matchedSchool = (serverDB.schools || []).find(sch => 
    (sch.headmasterEmail || sch.email || "").toLowerCase() === cleanEmail
  ) || ((serverDB.school && ((serverDB.school.headmasterEmail || serverDB.school.email || "").toLowerCase() === cleanEmail)) ? serverDB.school : null);

  // If no registered account matches at all:
  if (!matchedUser && !matchedStudent && !matchedTeacher && !matchedSchool) {
    return res.status(401).json({
      success: false,
      error: "No account found with this email. Please check your credentials or create a new account."
    });
  }

  // Verify password
  const expectedPassword = 
    matchedUser?.password || 
    matchedStudent?.password || 
    matchedTeacher?.password || 
    matchedSchool?.password;

  if (expectedPassword) {
    if (expectedPassword !== cleanPassword) {
      return res.status(401).json({
        success: false,
        error: "Incorrect password. Please try again."
      });
    }
  } else {
    return res.status(401).json({
      success: false,
      error: "This account has not set a password. Please register your account first."
    });
  }

  // Resolve role and user information
  const role = matchedUser?.role || (matchedSchool ? "admin" : matchedTeacher ? "teacher" : "student");
  const studentSchool = matchedStudent?.school || matchedStudent?.schoolName || matchedUser?.school || (matchedSchool?.name || "");
  const userId = matchedUser?.id || matchedStudent?.id || matchedTeacher?.id || matchedSchool?.id || ("usr_" + Math.random().toString(36).substring(2, 10));

  const user = {
    id: userId,
    student_id: matchedStudent?.student_id || matchedStudent?.regNo || matchedUser?.student_id,
    regNo: matchedStudent?.regNo || matchedStudent?.student_id || matchedUser?.regNo,
    email: cleanEmail,
    fname: matchedUser?.fname || matchedStudent?.fname || matchedTeacher?.firstName || cleanEmail.split("@")[0],
    lname: matchedUser?.lname || matchedStudent?.lname || matchedTeacher?.lastName || "",
    name: matchedUser?.name || matchedStudent?.name || matchedTeacher?.name || `${cleanEmail.split("@")[0]}`,
    role: role,
    school: studentSchool || undefined,
    schoolName: studentSchool || undefined,
    photo_url: matchedStudent?.photo_url || matchedStudent?.photoUrl || matchedTeacher?.photoUrl || "",
    created_at: matchedUser?.created_at || new Date().toISOString()
  };

  const token = "tbf_jwt_" + Buffer.from(JSON.stringify({ userId, email: cleanEmail, role, schoolName: studentSchool })).toString("base64");

  return res.status(200).json({
    success: true,
    message: "Login successful",
    access_token: token,
    token_type: "bearer",
    user,
    student_profile: role === "student" ? {
      student_id: matchedStudent?.student_id || matchedStudent?.regNo || matchedUser?.student_id || "",
      regNo: matchedStudent?.regNo || matchedStudent?.student_id || matchedUser?.regNo || "",
      phone: matchedStudent?.parentContact || matchedStudent?.phone || matchedUser?.phone || "",
      study_level: matchedStudent?.class || matchedUser?.study_level || "Form 1",
      curriculum: matchedStudent?.curriculum || matchedUser?.curriculum || "Tanzania National (NECTA)",
      school: studentSchool || "",
      schoolName: studentSchool || "",
      photo_url: matchedStudent?.photo_url || matchedStudent?.photoUrl || ""
    } : undefined,
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
        const emailLower = (decoded.email || "").toLowerCase();
        const storedStudent = serverDB.students.find(s => (s.email || "").toLowerCase() === emailLower);
        const resolvedPhoto = storedStudent?.photo_url || storedStudent?.photoUrl || decoded.photoUrl || "";
        const studentSchool = storedStudent?.school || storedStudent?.schoolName || decoded.schoolName || "";

        return res.json({
          id: decoded.userId || storedStudent?.id || "usr_active",
          email: decoded.email || "user@barakahub.edu.tz",
          fname: storedStudent?.fname || decoded.fname || (isSchool ? "Headmaster" : "Student"),
          lname: storedStudent?.lname || decoded.lname || (isSchool ? "Admin" : ""),
          role: decoded.role || (isSchool ? "school_admin" : "student"),
          school: isSchool ? {
            id: decoded.schoolId || "sch_default",
            name: decoded.schoolName || "Baraka Secondary School",
            registration_number: "TBF/BAR/001/2026",
            region: "Dar es Salaam",
            school_type: "Secondary",
            headmaster_name: "Headmaster",
            verification_status: "verified"
          } : (studentSchool ? { name: studentSchool } : undefined),
          schoolName: studentSchool || undefined,
          photo_url: resolvedPhoto,
          student_profile: !isSchool ? {
            phone: storedStudent?.parentContact || decoded.phone || "",
            study_level: storedStudent?.class || decoded.studyLevel || "Form 1",
            curriculum: storedStudent?.curriculum || decoded.curriculum || "Tanzania National (NECTA)",
            school: studentSchool,
            schoolName: studentSchool,
            photo_url: resolvedPhoto
          } : undefined
        });
      }
    } catch {}
  }

  // 3. Fallback: unauthenticated
  return res.status(401).json({
    message: "Unauthenticated",
    authenticated: false
  });
};

app.get([
  "/api/v1/auth/me",
  "/api/auth/me"
], handleGetMe);

// Dedicated General & Student Registration Endpoint Handler
const handleStudentRegister = async (req: express.Request, res: express.Response) => {
  const {
    name,
    fname,
    lname,
    firstName,
    lastName,
    email,
    password,
    phone,
    school,
    schoolName,
    school_name,
    study_level,
    studyLevel,
    curriculum,
    photo_url,
    photoUrl,
  } = req.body || {};

  const resolvedFname = fname || firstName || name?.split(" ")[0] || "Student";
  const resolvedLname = lname || lastName || name?.split(" ").slice(1).join(" ") || "";
  const cleanEmail = (email || "").trim().toLowerCase();
  const resolvedSchool = (school || schoolName || school_name || "").trim();

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
      school: resolvedSchool,
      study_level: study_level || studyLevel || "Form 1",
      curriculum: curriculum || "Tanzania National (NECTA)",
      photo_url: photo_url || photoUrl || ""
    })
  });

  if (remoteData) {
    if (resolvedSchool) {
      if (remoteData.user) {
        remoteData.user.school = resolvedSchool;
        remoteData.user.schoolName = resolvedSchool;
      }
      if (remoteData.student_profile) {
        remoteData.student_profile.school = resolvedSchool;
        remoteData.student_profile.schoolName = resolvedSchool;
      }
      if (!remoteData.school) {
        remoteData.school = { name: resolvedSchool };
      }
    }
    // Resolve school & automatic student registration number
    const isSolo = !resolvedSchool ||
      resolvedSchool === "(Solo Independent Learner)" ||
      resolvedSchool.includes("(no school") ||
      req.body?.account_type === "solo_learner";

    let schoolIdentifier = null;
    if (!isSolo) {
      const matchedSchool = serverDB.schools.find((s: any) => s.name?.toLowerCase() === resolvedSchool?.toLowerCase()) || serverDB.school;
      schoolIdentifier = matchedSchool?.registration_number || matchedSchool?.name || resolvedSchool || "MIH";
    }

    const studentEnrollNum = getNextStudentEnrollNumber(serverDB.students);
    const autoStudentReg = req.body?.regNo || req.body?.student_id || generateStudentRegNo(schoolIdentifier, studentEnrollNum, new Date().getFullYear(), isSolo);

    // Also keep local DB student record synchronized
    let localStd = serverDB.students.find(s => (s.email || "").toLowerCase() === cleanEmail);
    if (!localStd) {
      serverDB.students.push({
        id: remoteData.user?.id || `stud_${Date.now()}`,
        student_id: autoStudentReg,
        regNo: autoStudentReg,
        reg_no: autoStudentReg,
        name: `${resolvedFname} ${resolvedLname}`.trim(),
        fname: resolvedFname,
        lname: resolvedLname,
        email: cleanEmail,
        parentContact: phone || "",
        phone: phone || "",
        class: study_level || studyLevel || "Form 1",
        curriculum: curriculum || "Tanzania National (NECTA)",
        school: resolvedSchool,
        schoolName: resolvedSchool,
        photo_url: photo_url || photoUrl || "",
        photoUrl: photo_url || photoUrl || "",
        progress: 0,
        lastActive: "Today",
        status: "Active"
      });
      saveServerDB();
    } else {
      if (phone) {
        localStd.parentContact = phone;
        localStd.phone = phone;
      }
      if (!localStd.regNo) {
        localStd.regNo = autoStudentReg;
        localStd.student_id = autoStudentReg;
      }
      saveServerDB();
    }
    return res.status(201).json(remoteData);
  }

  // 2. Local database registration & persistence
  const isSoloLocal = !resolvedSchool ||
    resolvedSchool === "(Solo Independent Learner)" ||
    resolvedSchool.includes("(no school") ||
    req.body?.account_type === "solo_learner";

  let schoolIdentifierLocal = null;
  if (!isSoloLocal) {
    const matchedSchool = serverDB.schools.find((s: any) => s.name?.toLowerCase() === resolvedSchool?.toLowerCase()) || serverDB.school;
    schoolIdentifierLocal = matchedSchool?.registration_number || matchedSchool?.name || resolvedSchool || "MIH";
  }

  const studentEnrollNum = getNextStudentEnrollNumber(serverDB.students);
  const autoStudentReg = req.body?.regNo || req.body?.student_id || generateStudentRegNo(schoolIdentifierLocal, studentEnrollNum, new Date().getFullYear(), isSoloLocal);

  const userId = "std_" + Math.random().toString(36).substring(2, 10);
  let existingStudent = serverDB.students.find(s => (s.email || "").toLowerCase() === cleanEmail);
  if (existingStudent) {
    existingStudent.fname = resolvedFname;
    existingStudent.lname = resolvedLname;
    existingStudent.name = `${resolvedFname} ${resolvedLname}`.trim();
    if (password) existingStudent.password = password;
    if (!existingStudent.regNo) {
      existingStudent.regNo = autoStudentReg;
      existingStudent.student_id = autoStudentReg;
    }
    if (resolvedSchool) {
      existingStudent.school = resolvedSchool;
      existingStudent.schoolName = resolvedSchool;
    }
    if (phone) {
      existingStudent.parentContact = phone;
      existingStudent.phone = phone;
    }
    if (study_level || studyLevel) existingStudent.class = study_level || studyLevel;
    if (curriculum) existingStudent.curriculum = curriculum;
    if (photo_url || photoUrl) existingStudent.photo_url = photo_url || photoUrl;
  } else {
    serverDB.students.push({
      id: userId,
      student_id: autoStudentReg,
      regNo: autoStudentReg,
      reg_no: autoStudentReg,
      name: `${resolvedFname} ${resolvedLname}`.trim(),
      fname: resolvedFname,
      lname: resolvedLname,
      email: cleanEmail,
      password: password || "password123",
      parentContact: phone || "",
      phone: phone || "",
      class: study_level || studyLevel || "Form 1",
      curriculum: curriculum || "Tanzania National (NECTA)",
      school: resolvedSchool,
      schoolName: resolvedSchool,
      photo_url: photo_url || photoUrl || "",
      photoUrl: photo_url || photoUrl || "",
      progress: 0,
      lastActive: "Today",
      status: "Active"
    });
  }

  // Register or update in serverDB.users
  if (!serverDB.users) serverDB.users = [];
  const existingUserIdx = serverDB.users.findIndex(u => (u.email || "").toLowerCase() === cleanEmail);
  const studentUserRecord = {
    id: userId,
    student_id: autoStudentReg,
    regNo: autoStudentReg,
    email: cleanEmail,
    password: password || "password123",
    fname: resolvedFname,
    lname: resolvedLname,
    name: `${resolvedFname} ${resolvedLname}`.trim(),
    role: "student",
    phone: phone || "",
    school: resolvedSchool,
    schoolName: resolvedSchool,
    study_level: study_level || studyLevel || "Form 1",
    curriculum: curriculum || "Tanzania National (NECTA)",
    photo_url: photo_url || photoUrl || "",
    created_at: new Date().toISOString()
  };
  if (existingUserIdx >= 0) {
    serverDB.users[existingUserIdx] = { ...serverDB.users[existingUserIdx], ...studentUserRecord };
  } else {
    serverDB.users.unshift(studentUserRecord);
  }
  saveServerDB();

  const user = {
    id: userId,
    student_id: autoStudentReg,
    regNo: autoStudentReg,
    reg_no: autoStudentReg,
    email: cleanEmail,
    fname: resolvedFname,
    lname: resolvedLname,
    role: "student",
    phone: phone || "",
    school: resolvedSchool || undefined,
    schoolName: resolvedSchool || undefined,
    photo_url: photo_url || photoUrl || "",
    student_profile: {
      student_id: autoStudentReg,
      regNo: autoStudentReg,
      phone: phone || "",
      study_level: study_level || studyLevel || "Form 1",
      curriculum: curriculum || "Tanzania National (NECTA)",
      school: resolvedSchool,
      schoolName: resolvedSchool
    },
    created_at: new Date().toISOString()
  };

  const accessToken = "tbf_std_jwt_" + Buffer.from(JSON.stringify({ 
    userId, 
    email: cleanEmail, 
    role: "student", 
    schoolName: resolvedSchool 
  })).toString("base64");

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
    region_code,
    district,
    district_code,
    phone,
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

  // Determine automatic registration number for school
  const schoolIndex = getNextSchoolEnrollNumber(serverDB.schools);
  const autoSchoolRegNo = generateSchoolRegNo(cleanSchoolName, schoolIndex);
  const finalRegNo = (registration_number && registration_number.startsWith("TBF/"))
    ? registration_number
    : autoSchoolRegNo;

  // 1. Try remote TBF School Hub backend API if available
  const remoteResult = await tryRemoteApiFull("/auth/register/school", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fname: fname || "Headmaster",
      lname: lname || "Admin",
      email: cleanEmail,
      password: password || "password123",
      school_name: cleanSchoolName,
      registration_number: finalRegNo,
      region: region || "Dar es Salaam",
      school_type: (school_type || "primary").toLowerCase(),
      headmaster_name: headmaster_name || "Headmaster",
      verification_document_name: verification_document_name || "string"
    })
  });

  if (remoteResult && remoteResult.data) {
    return res.status(remoteResult.status).json(remoteResult.data);
  }

  // 2. Local fallback matching exact schema requested by user
  const userId = "usr_" + Math.random().toString(36).substring(2, 10);
  const schoolId = "sch_" + Math.random().toString(36).substring(2, 10);
  const accessToken = "tbf_school_jwt_" + Buffer.from(JSON.stringify({ userId, schoolId, email: cleanEmail })).toString("base64");

  const newRegisteredSchool = {
    id: schoolId,
    name: cleanSchoolName,
    registration_number: finalRegNo,
    region: region || "Dar es Salaam",
    region_code: region_code || "",
    district: district || "",
    district_code: district_code || "",
    phone: phone || "",
    email: cleanEmail,
    password: password || "password123",
    headmaster_name: headmaster_name || "Headmaster",
    verification_status: "verified"
  };

  serverDB.school = newRegisteredSchool;
  if (!serverDB.schools.some((s: any) => s.name?.toLowerCase() === cleanSchoolName.toLowerCase())) {
    serverDB.schools.push(newRegisteredSchool);
  }

  // Register admin in serverDB.users
  if (!serverDB.users) serverDB.users = [];
  const adminIdx = serverDB.users.findIndex(u => (u.email || "").toLowerCase() === cleanEmail);
  const adminUser = {
    id: userId,
    email: cleanEmail,
    password: password || "password123",
    fname: fname || "Headmaster",
    lname: lname || "Admin",
    name: `${fname || "Headmaster"} ${lname || "Admin"}`.trim(),
    role: "admin",
    school: cleanSchoolName,
    schoolName: cleanSchoolName,
    registration_number: finalRegNo,
    phone: phone || "",
    created_at: new Date().toISOString()
  };
  if (adminIdx >= 0) {
    serverDB.users[adminIdx] = adminUser;
  } else {
    serverDB.users.unshift(adminUser);
  }
  saveServerDB();

  return res.status(201).json({
    access_token: accessToken,
    token_type: "bearer",
    expires_in: 86400,
    user: {
      id: userId,
      email: cleanEmail,
      fname: fname || "Headmaster",
      lname: lname || "Admin",
      phone: phone || "",
      role: "school_admin"
    },
    student_profile: {
      phone: phone || "",
      study_level: "Form 1-6",
      curriculum: "Tanzania National (NECTA)",
      photo_url: ""
    },
    school: newRegisteredSchool
  });
};

app.post([
  "/api/v1/auth/register/school",
  "/api/auth/register/school",
  "/api/v1/register/school",
  "/api/register/school"
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
  const resolvedPhotoUrl = photo_url || photoUrl || "";

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
  const resolvedSchool = (req.body?.school || req.body?.schoolName || "").trim();
  const studentEnrollNum = getNextStudentEnrollNumber(serverDB.students);
  const autoStudentReg = req.body?.regNo || req.body?.student_id || generateStudentRegNo(null, studentEnrollNum, new Date().getFullYear(), true);

  let existingStudent = serverDB.students.find(s => (s.email || "").toLowerCase() === resolvedEmail.toLowerCase());
  if (existingStudent) {
    if (resolvedFname) existingStudent.fname = resolvedFname;
    if (resolvedLname) existingStudent.lname = resolvedLname;
    existingStudent.name = `${resolvedFname} ${resolvedLname}`.trim();
    if (!existingStudent.regNo) {
      existingStudent.regNo = autoStudentReg;
      existingStudent.student_id = autoStudentReg;
    }
    if (password) existingStudent.password = password;
    if (resolvedPhone) {
      existingStudent.parentContact = resolvedPhone;
      existingStudent.phone = resolvedPhone;
    }
    if (resolvedStudyLevel) existingStudent.class = resolvedStudyLevel;
    if (resolvedCurriculum) existingStudent.curriculum = resolvedCurriculum;
    if (resolvedSchool) {
      existingStudent.school = resolvedSchool;
      existingStudent.schoolName = resolvedSchool;
    }
  } else {
    serverDB.students.push({
      id: userId,
      student_id: autoStudentReg,
      regNo: autoStudentReg,
      reg_no: autoStudentReg,
      name: `${resolvedFname} ${resolvedLname}`.trim(),
      fname: resolvedFname,
      lname: resolvedLname,
      email: resolvedEmail,
      password: password || "password123",
      parentContact: resolvedPhone,
      phone: resolvedPhone,
      class: resolvedStudyLevel,
      curriculum: resolvedCurriculum,
      school: resolvedSchool,
      schoolName: resolvedSchool,
      photo_url: resolvedPhotoUrl,
      photoUrl: resolvedPhotoUrl,
      progress: 0,
      lastActive: "Today",
      status: "Active"
    });
  }

  // Register in serverDB.users
  if (!serverDB.users) serverDB.users = [];
  const soloIdx = serverDB.users.findIndex(u => (u.email || "").toLowerCase() === resolvedEmail.toLowerCase());
  const soloUser = {
    id: userId,
    student_id: autoStudentReg,
    regNo: autoStudentReg,
    email: resolvedEmail,
    password: password || "password123",
    fname: resolvedFname,
    lname: resolvedLname,
    name: `${resolvedFname} ${resolvedLname}`.trim(),
    role: "student",
    phone: resolvedPhone,
    school: resolvedSchool || "(Solo Independent Learner)",
    schoolName: resolvedSchool || "(Solo Independent Learner)",
    study_level: resolvedStudyLevel,
    curriculum: resolvedCurriculum,
    photo_url: resolvedPhotoUrl,
    created_at: new Date().toISOString()
  };
  if (soloIdx >= 0) {
    serverDB.users[soloIdx] = soloUser;
  } else {
    serverDB.users.unshift(soloUser);
  }
  saveServerDB();

  const studentProfile = {
    student_id: autoStudentReg,
    regNo: autoStudentReg,
    phone: resolvedPhone,
    study_level: resolvedStudyLevel,
    curriculum: resolvedCurriculum,
    school: resolvedSchool,
    schoolName: resolvedSchool,
    photo_url: resolvedPhotoUrl
  };

  const user = {
    id: userId,
    student_id: autoStudentReg,
    regNo: autoStudentReg,
    reg_no: autoStudentReg,
    fname: resolvedFname,
    lname: resolvedLname,
    email: resolvedEmail,
    phone: resolvedPhone,
    study_level: resolvedStudyLevel,
    curriculum: resolvedCurriculum,
    photo_url: resolvedPhotoUrl,
    school: resolvedSchool,
    schoolName: resolvedSchool,
    role: "student",
    account_type: "solo_learner",
    student_profile: studentProfile,
    created_at: new Date().toISOString()
  };

  const token = "tbf_solo_jwt_" + Buffer.from(JSON.stringify({ userId, email: resolvedEmail })).toString("base64");

  return res.status(201).json({
    success: true,
    message: "Solo learner registered successfully",
    user,
    student_profile: studentProfile,
    token
  });
};

app.post([
  "/api/v1/auth/register/solo",
  "/api/v1/auth/register/learner",
  "/api/auth/register/solo",
  "/api/auth/register/learner",
  "/api/v1/register/solo",
  "/api/register/solo"
], handleSoloLearnerRegister);

// --- BACKEND IN-MEMORY & PERSISTENT DATABASE ENGINE ---
// Starts 100% empty for clean new school registration and respects remote backend database
interface BackendDB {
  users?: any[];
  students: any[];
  teachers: any[];
  classes: any[];
  classJoinRequests: any[];
  materials: any[];
  timetable: any[];
  quizzes: any[];
  quizResults: any[];
  assignments: any[];
  attendance: any[];
  notifications: any[];
  discussions: any[];
  deletedStudentIds: string[];
  deletedTeacherIds: string[];
  school: any;
  schools: any[];
  phoneVerificationCodes?: Record<string, any>;
}

const DB_FILE = path.join(process.cwd(), "data", "database.json");

/**
 * TBF School Hub - Standard Registration Number Generators
 * Format 1 (School): TBF/<school_name_3_letters>/<enroll_number_3_digits>/<current_year> -> e.g. TBF/MIH/001/2026
 * Format 2 (Student with related school): TBF/<school_3_letters>/<student_number>/<current_year> -> e.g. TBF/MIH/0001/2026 or TBF/MIH/0010/2026
 * Format 3 (Solo learner): TBF/<student_number>/<current_year> -> e.g. TBF/0001/2026 or TBF/0010/2026
 */
function getSchoolCode(schoolIdentifier?: string | null, fallback: string = "MIH"): string {
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

function generateSchoolRegNo(schoolName: string, schoolIndex: number = 1, year: number = new Date().getFullYear()): string {
  const shortCode = getSchoolCode(schoolName, "SCH");
  const enrollNo = String(schoolIndex).padStart(3, "0");
  return `TBF/${shortCode}/${enrollNo}/${year}`;
}

function getSchoolNumber(schoolRegNo?: string | null, fallbackIndex: number = 1): string {
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

function generateStudentRegNo(
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
    // For solo learner: don't use school number or shortcode -> TBF/<student_enroll_number>/<year>
    return `TBF/${studentEnrollNo}/${year}`;
  }

  // School short code (e.g. MIH for Mihama) -> TBF/MIH/<student_number>/<year>
  const schoolCode = getSchoolCode(typeof schoolIdentifier === "number" ? "MIH" : schoolIdentifier, "MIH");

  return `TBF/${schoolCode}/${studentEnrollNo}/${year}`;
}

function getNextStudentEnrollNumber(existingStudents: Array<{ regNo?: string; student_id?: string; id?: string }> = []): number {
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
    else if (parts.length >= 4 && parts[0] === "TBF" && /^\d+$/.test(parts[2])) {
      const val = parseInt(parts[2], 10);
      if (val > maxNumber) maxNumber = val;
    } else {
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

function getNextSchoolEnrollNumber(existingSchools: Array<{ regNo?: string; registration_number?: string; id?: string }> = []): number {
  let maxNumber = 0;
  for (const s of existingSchools || []) {
    const reg = String(s.regNo || s.registration_number || s.id || "");
    const parts = reg.split("/");
    if (parts.length >= 4 && /^\d+$/.test(parts[2])) {
      const val = parseInt(parts[2], 10);
      if (val > maxNumber) maxNumber = val;
    }
  }
  return maxNumber > 0 ? maxNumber + 1 : ((existingSchools?.length || 0) + 1);
}

const DEFAULT_TANZANIA_SCHOOLS = [
  { id: "sch_baraka_001", name: "Baraka Secondary School", registration_number: "TBF/BAR/001/2026", region: "Dar es Salaam", school_type: "Secondary" },
  { id: "sch_kibaha_002", name: "Kibaha Secondary School", registration_number: "TBF/KIB/002/2026", region: "Pwani", school_type: "Secondary" },
  { id: "sch_ilboru_003", name: "Ilboru Secondary School", registration_number: "TBF/ILB/003/2026", region: "Arusha", school_type: "Secondary" },
  { id: "sch_mzumbe_004", name: "Mzumbe Secondary School", registration_number: "TBF/MZU/004/2026", region: "Morogoro", school_type: "Secondary" },
  { id: "sch_tabora_005", name: "Tabora Boys' Secondary School", registration_number: "TBF/TAB/005/2026", region: "Tabora", school_type: "Secondary" },
  { id: "sch_kilakala_006", name: "Kilakala Secondary School", registration_number: "TBF/KIL/006/2026", region: "Morogoro", school_type: "Secondary" },
  { id: "sch_feza_007", name: "Feza Boys Secondary School", registration_number: "TBF/FEZ/007/2026", region: "Dar es Salaam", school_type: "Secondary" },
  { id: "sch_marian_008", name: "Marian Boys High School", registration_number: "TBF/MAR/008/2026", region: "Pwani", school_type: "Secondary" },
  { id: "sch_loyola_009", name: "Loyola High School", registration_number: "TBF/LOY/009/2026", region: "Dar es Salaam", school_type: "Secondary" },
  { id: "sch_jangwani_010", name: "Jangwani Secondary School", registration_number: "TBF/JAN/010/2026", region: "Dar es Salaam", school_type: "Secondary" },
  { id: "sch_azania_011", name: "Azania Secondary School", registration_number: "TBF/AZA/011/2026", region: "Dar es Salaam", school_type: "Secondary" },
  { id: "sch_tambaza_012", name: "Tambaza Secondary School", registration_number: "TBF/TAM/012/2026", region: "Dar es Salaam", school_type: "Secondary" },
  { id: "sch_stfrancis_013", name: "St. Francis Girls Secondary School", registration_number: "TBF/STF/013/2026", region: "Mbeya", school_type: "Secondary" }
];

function loadServerDB(): BackendDB {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      const loadedSchools = Array.isArray(parsed.schools) && parsed.schools.length > 0
        ? parsed.schools
        : DEFAULT_TANZANIA_SCHOOLS;
      return {
        users: Array.isArray(parsed.users) ? parsed.users : [],
        students: Array.isArray(parsed.students) ? parsed.students : [],
        teachers: Array.isArray(parsed.teachers) ? parsed.teachers : [],
        classes: Array.isArray(parsed.classes) ? parsed.classes : [],
        classJoinRequests: Array.isArray(parsed.classJoinRequests) ? parsed.classJoinRequests : [],
        materials: Array.isArray(parsed.materials) ? parsed.materials : [],
        timetable: Array.isArray(parsed.timetable) ? parsed.timetable : [],
        quizzes: Array.isArray(parsed.quizzes) ? parsed.quizzes : [],
        quizResults: Array.isArray(parsed.quizResults) ? parsed.quizResults : [],
        assignments: Array.isArray(parsed.assignments) ? parsed.assignments : [],
        attendance: Array.isArray(parsed.attendance) ? parsed.attendance : [],
        notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
        discussions: Array.isArray(parsed.discussions) ? parsed.discussions : [],
        deletedStudentIds: Array.isArray(parsed.deletedStudentIds) ? parsed.deletedStudentIds : [],
        deletedTeacherIds: Array.isArray(parsed.deletedTeacherIds) ? parsed.deletedTeacherIds : [],
        school: parsed.school || DEFAULT_TANZANIA_SCHOOLS[0],
        schools: loadedSchools,
        phoneVerificationCodes: parsed.phoneVerificationCodes || {}
      };
    }
  } catch (err) {
    console.warn("Failed to read persistent DB file, starting clean:", err);
  }
  return {
    users: [],
    students: [],
    teachers: [],
    classes: [],
    classJoinRequests: [],
    materials: [],
    timetable: [],
    quizzes: [],
    quizResults: [],
    assignments: [],
    attendance: [],
    notifications: [],
    discussions: [],
    deletedStudentIds: [],
    deletedTeacherIds: [],
    school: DEFAULT_TANZANIA_SCHOOLS[0],
    schools: DEFAULT_TANZANIA_SCHOOLS,
    phoneVerificationCodes: {}
  };
}

const serverDB: BackendDB = loadServerDB();

// Sanitize students and teachers on startup: remove any dummy guest accounts or deleted entries
if (!serverDB.users) serverDB.users = [];
if (!serverDB.deletedStudentIds) serverDB.deletedStudentIds = [];
if (!serverDB.deletedTeacherIds) serverDB.deletedTeacherIds = [];
const startupDeletedTeacherSet = new Set((serverDB.deletedTeacherIds || []).map(x => String(x).toLowerCase().trim()));

// If teachers list is empty and no deletions recorded, initialize with core Tanzanian school faculty
if ((!serverDB.teachers || serverDB.teachers.length === 0) && startupDeletedTeacherSet.size === 0) {
  serverDB.teachers = [
    { id: "teach-1", name: "Mwalimu Juma", firstName: "Juma", lastName: "Kassim", email: "juma.k@school.tz", subjects: "Mathematics", classes: "Form 1A; Form 2B", status: "Active", role: "Normal" },
    { id: "teach-2", name: "Mwalimu Amina", firstName: "Amina", lastName: "Salim", email: "amina.s@school.tz", subjects: "English", classes: "Form 1A; Form 3A", status: "Active", role: "Normal" },
    { id: "teach-3", name: "Mwalimu Baraka", firstName: "Baraka", lastName: "Mussa", email: "baraka.m@school.tz", subjects: "Biology", classes: "Form 2B; Form 4A", status: "Active", role: "Normal" },
    { id: "teach-4", name: "Mwalimu Sarah", firstName: "Sarah", lastName: "Massawe", email: "sarah.m@school.tz", subjects: "Chemistry", classes: "Form 3A; Form 4A", status: "Active", role: "Normal" }
  ];
}

serverDB.teachers = (serverDB.teachers || []).filter(t => {
  const tEmail = String(t.email || "").toLowerCase().trim();
  const tId = String(t.id || "").toLowerCase().trim();
  return !startupDeletedTeacherSet.has(tEmail) && !startupDeletedTeacherSet.has(tId);
});
const startupDeletedSet = new Set(serverDB.deletedStudentIds);
serverDB.students = (serverDB.students || []).filter(s => {
  const name = `${s.name || ""} ${s.first_name || ""} ${s.fname || ""}`.toLowerCase();
  const email = (s.email || "").toLowerCase();
  const id = s.id || s.student_id || s.regNo || "";
  if (startupDeletedSet.has(id) || startupDeletedSet.has(email) || startupDeletedSet.has(s.regNo)) return false;
  if (
    name.includes("mwanafunzi baraka") ||
    name.includes("baraka mwanafunzi") ||
    (name.includes("mwanafunzi") && name.includes("baraka")) ||
    name.trim() === "mwanafunzi" ||
    email.startsWith("learner_") ||
    email.includes("barakahub.edu.tz")
  ) return false;
  return true;
});
saveServerDB();

export function saveServerDB() {
  try {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(serverDB, null, 2), "utf-8");
  } catch (err) {
    console.warn("Failed to persist serverDB to file:", err);
  }
}

// Dedicated Student / User Photo Endpoint
app.post([
  "/api/v1/user/photo",
  "/api/v1/student/photo",
  "/api/user/photo",
  "/api/student/photo"
], async (req, res) => {
  const { photo_url, photoUrl, email, user_id, userId } = req.body || {};
  const photo = photo_url || photoUrl || "";
  const targetEmail = (email || "").trim().toLowerCase();
  const targetId = user_id || userId;

  let found = false;
  if (targetEmail || targetId) {
    const student = serverDB.students.find(s => 
      (targetEmail && (s.email || "").toLowerCase() === targetEmail) || 
      (targetId && (s.id === targetId || s.regNo === targetId || s.userId === targetId))
    );
    if (student) {
      student.photo_url = photo;
      student.photoUrl = photo;
      found = true;
    } else if (targetEmail) {
      serverDB.students.push({
        id: targetId || `stud_${Date.now()}`,
        email: targetEmail,
        photo_url: photo,
        photoUrl: photo,
        lastActive: "Today"
      });
      found = true;
    }
  }

  saveServerDB();

  return res.json({
    success: true,
    photo_url: photo,
    message: "Profile picture stored in database successfully."
  });
});

// Dedicated Student / User Profile Update Endpoint
app.all([
  "/api/v1/user/profile",
  "/api/v1/student/profile",
  "/api/user/profile",
  "/api/student/profile"
], async (req, res) => {
  if (req.method !== "POST" && req.method !== "PUT" && req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (req.method === "GET") {
    const email = ((req.query.email as string) || "").trim().toLowerCase();
    const student = serverDB.students.find(s => (s.email || "").toLowerCase() === email);
    if (student) {
      return res.json({ success: true, student });
    }
    return res.json({ success: false, message: "Student not found in database" });
  }

  const body = req.body || {};
  const fname = body.fname || body.firstName || "";
  const lname = body.lname || body.lastName || "";
  const email = (body.email || "").trim().toLowerCase();
  const phone = body.phone || body.parentContact || "";
  const study_level = body.study_level || body.studyLevel || "";
  const curriculum = body.curriculum || "";
  const school = (body.school || body.schoolName || body.school_name || "").trim();
  const photo_url = body.photo_url || body.photoUrl;

  let student = serverDB.students.find(s => (s.email || "").toLowerCase() === email);
  if (student) {
    if (fname) student.fname = fname;
    if (lname) student.lname = lname;
    if (fname || lname) student.name = `${student.fname || fname} ${student.lname || lname}`.trim();
    if (phone) student.parentContact = phone;
    if (study_level) student.class = study_level;
    if (curriculum) student.curriculum = curriculum;
    if (school) {
      student.school = school;
      student.schoolName = school;
    }
    if (photo_url !== undefined) {
      student.photo_url = photo_url;
      student.photoUrl = photo_url;
    }
  } else if (email) {
    student = {
      id: `stud_${Date.now()}`,
      name: `${fname} ${lname}`.trim(),
      fname,
      lname,
      email,
      parentContact: phone,
      class: study_level || "Form 1",
      curriculum: curriculum || "Tanzania National (NECTA)",
      school: school || "",
      schoolName: school || "",
      photo_url: photo_url || "",
      photoUrl: photo_url || "",
      progress: 0,
      lastActive: "Today",
      status: "Active"
    };
    serverDB.students.push(student);
  }

  saveServerDB();

  const resolvedSchool = student?.school || student?.schoolName || school || "";

  return res.json({
    success: true,
    message: "Student profile updated in database successfully.",
    student,
    user: {
      fname,
      lname,
      email,
      school: resolvedSchool,
      schoolName: resolvedSchool,
      photo_url: student?.photo_url || photo_url || ""
    },
    student_profile: {
      phone,
      study_level,
      curriculum,
      school: resolvedSchool,
      schoolName: resolvedSchool,
      photo_url: student?.photo_url || photo_url || ""
    }
  });
});

// --- STUDENTS ENDPOINTS ---
app.get(["/api/v1/students", "/api/students"], async (req, res) => {
  const { class_name, search, page, page_size } = req.query as Record<string, string | undefined>;
  const queryString = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
  const authHeader = req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {};

  // Try remote backend API first
  const remoteResult = await tryRemoteApiFull(`/students${queryString}`, {
    method: "GET",
    headers: { ...authHeader, "accept": "application/json" }
  });

  const deletedSet = new Set(serverDB.deletedStudentIds || []);
  const filterOutDeleted = (arr: any[]) => {
    return arr.filter(s => {
      const id = s.id || s.student_id || s.regNo || "";
      const email = (s.email || "").toLowerCase();
      const name = `${s.name || ""} ${s.first_name || ""} ${s.fname || ""}`.toLowerCase();
      if (deletedSet.has(id) || deletedSet.has(email) || deletedSet.has(s.regNo)) return false;
      if (name.includes("mwanafunzi baraka") || name === "mwanafunzi" || email.startsWith("learner_")) return false;
      return true;
    });
  };

  if (remoteResult && remoteResult.data) {
    if (remoteResult.status === 200) {
      const data = remoteResult.data;
      // If remote returned standard { success, students: [...] } format
      if (data && Array.isArray(data.students)) {
        data.students = filterOutDeleted(data.students);
        return res.status(200).json(data);
      }
      // If remote returned an array directly
      if (Array.isArray(data)) {
        const filtered = filterOutDeleted(data);
        return res.status(200).json({
          success: "true",
          code: 0,
          message: "Students fetched successfully",
          students: filtered,
          pagination: {
            page: Number(page) || 1,
            page_size: Number(page_size) || 20,
            total: filtered.length,
            total_pages: Math.ceil(filtered.length / (Number(page_size) || 20)) || 1
          }
        });
      }
      // If data has a data wrapper property
      if (data.data && Array.isArray(data.data)) {
        const filtered = filterOutDeleted(data.data);
        return res.status(200).json({
          success: "true",
          code: 0,
          message: "Students fetched successfully",
          students: filtered,
          pagination: {
            page: Number(page) || 1,
            page_size: Number(page_size) || 20,
            total: filtered.length,
            total_pages: Math.ceil(filtered.length / (Number(page_size) || 20)) || 1
          }
        });
      }
      return res.status(200).json(data);
    }
    if (remoteResult.status < 500) {
      return res.status(remoteResult.status).json(remoteResult.data);
    }
    // When remote returns 500/503 (database unavailable), seamlessly fall through to serverDB.students!
  }

  // Fallback to local serverDB.students
  let list = filterOutDeleted([...serverDB.students]);
  if (class_name && typeof class_name === "string") {
    list = list.filter(s => (s.class || "").toLowerCase().includes(class_name.toLowerCase()));
  }
  if (search && typeof search === "string") {
    const sTerm = search.toLowerCase();
    list = list.filter(s => 
      (s.name || "").toLowerCase().includes(sTerm) || 
      (s.regNo || "").toLowerCase().includes(sTerm) ||
      (s.email || "").toLowerCase().includes(sTerm) ||
      (s.fname || "").toLowerCase().includes(sTerm) ||
      (s.lname || "").toLowerCase().includes(sTerm)
    );
  }

  const pNum = Number(page) || 1;
  const pSize = Number(page_size) || 20;
  const startIndex = (pNum - 1) * pSize;
  const pagedList = list.slice(startIndex, startIndex + pSize);

  return res.json({
    success: "true",
    code: 0,
    message: "Students retrieved successfully",
    students: pagedList.map(s => ({
      student_id: String(s.student_id || s.id || s.regNo || `stud-${Date.now()}`),
      first_name: s.first_name || s.fname || (s.name ? s.name.split(" ")[0] : "Student"),
      last_name: s.last_name || s.lname || (s.name ? s.name.split(" ").slice(1).join(" ") : ""),
      email: s.email || "",
      class: {
        study_level: typeof s.class === "object" ? s.class.study_level : (s.class || "Form 1"),
        curriculum: s.curriculum || (typeof s.class === "object" ? s.class.curriculum : "Tanzania National (NECTA)")
      },
      name: s.name || `${s.first_name || s.fname || ""} ${s.last_name || s.lname || ""}`.trim(),
      regNo: s.regNo || s.student_id || s.id || generateStudentRegNo(serverDB.school?.registration_number || serverDB.school?.name || "MIH", 1),
      progress: typeof s.progress === "number" ? s.progress : 0,
      lastActive: s.lastActive || "Today",
      parentContact: s.parentContact || s.parent_contact || s.phone || "",
      status: s.status || "Active",
      age: Number(s.age) || 15,
      gender: s.gender || "M"
    })),
    pagination: {
      page: pNum,
      page_size: pSize,
      total: list.length,
      total_pages: Math.ceil(list.length / pSize) || 1
    }
  });
});

// --- STUDENT IMPORT TEMPLATE (CSV / XLSX) ---
app.get([
  "/api/v1/students/import/template",
  "/api/students/import/template"
], async (req, res) => {
  const format = ((req.query.format as string) || "xlsx").toLowerCase();
  
  // Try remote backend first
  const remoteResult = await tryRemoteApiFull(`/students/import/template?format=${format}`, {
    method: "GET",
    headers: { ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) }
  });
  if (remoteResult && remoteResult.data && remoteResult.status === 200) {
    if (typeof remoteResult.data === "string") {
      res.setHeader("Content-Type", format === "csv" ? "text/csv" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="student_list_template.${format}"`);
      return res.send(remoteResult.data);
    }
    return res.json(remoteResult.data);
  }

  // Fallback: Generate standard Tanzanian curriculum template
  const csvContent = [
    "first_name,last_name,email,phone,study_level,curriculum,form_name,class_name",
    "Amani,Baraka,amani.baraka@school.ac.tz,+255712345678,Ordinary Level,NECTA,Form 1,Form 1A",
    "Neema,Massawe,neema.m@school.ac.tz,+255754987654,Ordinary Level,NECTA,Form 1,Form 1B",
    "Juma,Salim,juma.salim@school.ac.tz,+255789123456,Ordinary Level,NECTA,Form 2,Form 2A",
    "Rehema,Mwangi,rehema.mwangi@school.ac.tz,+255762345678,Ordinary Level,NECTA,Form 2,Form 2B"
  ].join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="student_list_template.${format === "xlsx" ? "csv" : format}"`);
  return res.status(200).send(csvContent);
});

// --- STUDENT BULK IMPORT WITH CSV/XLSX FILE & OPTIONAL OTP ---
app.post([
  "/api/v1/students/import",
  "/api/students/import"
], upload.single("file"), async (req, res) => {
  const sendOtp = req.query.send_otp === "true" || req.body?.send_otp === "true" || req.body?.send_otp === true;
  const defaultPassword = (req.query.default_password as string) || req.body?.default_password || "ChangeMe123!";

  if (!req.file || !req.file.buffer) {
    return res.status(400).json({
      detail: "No file uploaded. Please attach a CSV or XLSX file under the 'file' field."
    });
  }

  // 1. Try remote API first with FormData
  try {
    if (REMOTE_API_BASE && typeof FormData !== "undefined" && typeof Blob !== "undefined") {
      const formData = new FormData();
      const fileBlob = new Blob([req.file.buffer], { type: req.file.mimetype || "text/csv" });
      formData.append("file", fileBlob, req.file.originalname || "student_list.csv");

      const remoteUrl = `/students/import?send_otp=${sendOtp}&default_password=${encodeURIComponent(defaultPassword)}`;
      const remoteRes = await tryRemoteApiFull(remoteUrl, {
        method: "POST",
        headers: {
          ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {})
        },
        body: formData
      }, 12000);

      if (remoteRes && remoteRes.status >= 200 && remoteRes.status < 300) {
        return res.status(remoteRes.status).json(remoteRes.data);
      }
    }
  } catch (remoteErr) {
    // Continue to local processing fallback
  }

  // 2. Local Fallback Processing
  try {
    const rawFileText = req.file.buffer.toString("utf-8");
    const rawLines = rawFileText.split(/\r?\n/).filter(line => line.trim().length > 0);

    if (rawLines.length < 2) {
      return res.status(400).json({
        detail: "The uploaded file is empty or only contains a header row."
      });
    }

    // Parse header
    const headerRow = rawLines[0].split(",").map(h => h.trim().toLowerCase().replace(/['"]/g, "").replace(/\s+/g, "_"));
    const colIndex = {
      first_name: headerRow.indexOf("first_name"),
      last_name: headerRow.indexOf("last_name"),
      email: headerRow.indexOf("email"),
      phone: headerRow.indexOf("phone"),
      study_level: headerRow.indexOf("study_level"),
      curriculum: headerRow.indexOf("curriculum"),
      form_name: headerRow.indexOf("form_name"),
      class_name: headerRow.indexOf("class_name")
    };

    const existingEmails = new Set(serverDB.students.map(s => (s.email || "").trim().toLowerCase()).filter(Boolean));
    const existingPhones = new Set(serverDB.students.map(s => (s.parentContact || s.phone || "").trim()).filter(Boolean));

    let totalRows = 0;
    let createdCount = 0;
    let enrolledCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];
    let currentEnrollSeq = getNextStudentEnrollNumber(serverDB.students);
    const schoolCode = getSchoolCode(serverDB.school?.registration_number || serverDB.school?.name || "MIH");

    for (let i = 1; i < rawLines.length; i++) {
      const line = rawLines[i].trim();
      if (!line) continue;
      totalRows++;

      // Split CSV line respecting quoted strings
      const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(p => p.trim().replace(/^"|"$/g, ""));
      
      const getVal = (idx: number, fallbackIdx?: number) => {
        if (idx >= 0 && parts[idx] !== undefined) return parts[idx];
        if (fallbackIdx !== undefined && fallbackIdx >= 0 && parts[fallbackIdx] !== undefined) return parts[fallbackIdx];
        return "";
      };

      const firstName = getVal(colIndex.first_name, 0) || "Student";
      const lastName = getVal(colIndex.last_name, 1) || "";
      const email = (getVal(colIndex.email, 2) || "").toLowerCase().trim();
      const phone = (getVal(colIndex.phone, 3) || "").trim();
      const studyLevel = getVal(colIndex.study_level, 4) || "Ordinary Level";
      const curriculum = getVal(colIndex.curriculum, 5) || "Tanzania National (NECTA)";
      const formName = getVal(colIndex.form_name, 6) || "Form 1";
      const className = getVal(colIndex.class_name, 7) || formName;

      // Unique validation: emails and phones are unique; rows with duplicates are skipped
      if (email && existingEmails.has(email)) {
        skippedCount++;
        continue;
      }
      if (phone && existingPhones.has(phone)) {
        skippedCount++;
        continue;
      }

      if (!email && !phone) {
        failedCount++;
        errors.push(`Row ${i}: Missing both email and phone`);
        continue;
      }

      if (email) existingEmails.add(email);
      if (phone) existingPhones.add(phone);

      const studentReg = generateStudentRegNo(schoolCode, currentEnrollSeq++);
      const newStudent = {
        id: `stud-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        student_id: studentReg,
        regNo: studentReg,
        reg_no: studentReg,
        first_name: firstName,
        last_name: lastName,
        fname: firstName,
        lname: lastName,
        name: `${firstName} ${lastName}`.trim(),
        email: email || `student_${Date.now()}_${i}@school.ac.tz`,
        phone: phone,
        parentContact: phone,
        parent_contact: phone,
        class: className || formName,
        study_level: studyLevel,
        curriculum: curriculum,
        form_name: formName,
        status: "Active",
        gender: "M",
        age: 15,
        progress: 0,
        lastActive: "Just imported",
        default_password: defaultPassword,
        created_at: new Date().toISOString()
      };

      serverDB.students.unshift(newStudent);
      createdCount++;

      // Optionally enroll into class
      if (className) {
        let targetClass = serverDB.classes.find(c => 
          (c.name && c.name.toLowerCase() === className.toLowerCase()) ||
          ((c as any).class_name && (c as any).class_name.toLowerCase() === className.toLowerCase())
        );

        if (!targetClass) {
          targetClass = {
            id: `cls-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            name: className,
            class_name: className,
            teacher: "TBD",
            studentsCount: 0,
            avgScore: 75,
            subjects: "General",
            enrolled_students: []
          } as any;
          serverDB.classes.push(targetClass);
        }

        if (!(targetClass as any).enrolled_students) {
          (targetClass as any).enrolled_students = [];
        }
        if (!(targetClass as any).enrolled_students.includes(newStudent.id)) {
          (targetClass as any).enrolled_students.push(newStudent.id);
        }
        targetClass.studentsCount = ((targetClass as any).enrolled_students?.length) || ((targetClass.studentsCount || 0) + 1);
        enrolledCount++;
      }

      // If send_otp requested, generate code and dispatch live SMS
      if (sendOtp && phone) {
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const { internationalNoPlus, e164 } = normalizeTzPhone(phone);
        const codeRecord = {
          code: otpCode,
          expiresAt: Date.now() + 15 * 60 * 1000,
          attempts: 0
        };
        if (internationalNoPlus) {
          phoneVerificationCodes.set(internationalNoPlus, codeRecord);
          phoneVerificationCodes.set(e164, codeRecord);
        }
        // Record in serverDB
        if (!(serverDB as any).phoneVerificationCodes) {
          (serverDB as any).phoneVerificationCodes = {};
        }
        if (internationalNoPlus) {
          (serverDB as any).phoneVerificationCodes[internationalNoPlus] = codeRecord;
        }

        // Dispatch real SMS via carrier gateway
        if (internationalNoPlus) {
          tryRemoteApiFull("/auth/otp/send-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              phone: internationalNoPlus,
              name: `${firstName} ${lastName}`.trim() || "Student",
              code: otpCode
            })
          }).catch(() => {});
        }
      }
    }

    saveServerDB();

    return res.status(200).json({
      total_rows: totalRows,
      created: createdCount,
      enrolled: enrolledCount,
      skipped: skippedCount,
      failed: failedCount,
      errors: errors
    });
  } catch (parseErr: any) {
    return res.status(500).json({
      detail: `Failed to process import file: ${parseErr.message || String(parseErr)}`
    });
  }
});

// --- STUDENT EXPORT (CSV / XLSX) ---
app.get([
  "/api/v1/students/export",
  "/api/students/export"
], async (req, res) => {
  const format = ((req.query.format as string) || "csv").toLowerCase();
  const classId = req.query.class_id as string;
  const formId = req.query.form_id as string;

  // Try remote backend first
  const queryStr = new URLSearchParams();
  if (format) queryStr.set("format", format);
  if (classId) queryStr.set("class_id", classId);
  if (formId) queryStr.set("form_id", formId);

  const remoteResult = await tryRemoteApiFull(`/students/export?${queryStr.toString()}`, {
    method: "GET",
    headers: { ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) }
  });
  if (remoteResult && remoteResult.data && remoteResult.status === 200) {
    if (typeof remoteResult.data === "string") {
      res.setHeader("Content-Type", format === "xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="students_export.${format}"`);
      return res.send(remoteResult.data);
    }
    return res.json(remoteResult.data);
  }

  // Fallback: Export students from serverDB
  let exportList = serverDB.students;
  if (classId) {
    const targetClass = serverDB.classes.find(c => c.id === classId || (c.name && c.name.toLowerCase() === classId.toLowerCase()));
    if (targetClass) {
      exportList = exportList.filter(s => {
        const sClass = typeof s.class === "object" ? s.class.study_level : s.class;
        return (
          (sClass && sClass.toLowerCase() === (targetClass.name || "").toLowerCase()) ||
          ((targetClass as any).enrolled_students && (targetClass as any).enrolled_students.includes(s.id))
        );
      });
    }
  }

  const rows = [
    "first_name,last_name,email,phone,study_level,curriculum,form_name,class_name,status"
  ];

  for (const s of exportList) {
    const sLevel = typeof s.class === "object" ? s.class.study_level : (s.study_level || "Ordinary Level");
    const sCurriculum = s.curriculum || "NECTA";
    const sForm = (s as any).form_name || (typeof s.class === "string" ? s.class.split(" ")[0] : "Form 1");
    const sClass = typeof s.class === "object" ? s.class.study_level : (s.class || "Form 1A");
    const sStatus = s.status || "Active";
    const sPhone = s.parentContact || s.phone || "";
    rows.push(`"${s.first_name || s.fname || ""}","${s.last_name || s.lname || ""}","${s.email || ""}","${sPhone}","${sLevel}","${sCurriculum}","${sForm}","${sClass}","${sStatus}"`);
  }

  const csvOut = rows.join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="students_export.csv"`);
  return res.status(200).send(csvOut);
});

app.post(["/api/v1/students", "/api/students"], async (req, res) => {
  const body = req.body || {};
  const firstName = body.first_name || body.fname || (body.name ? body.name.split(" ")[0] : "New");
  const lastName = body.last_name || body.lname || (body.name ? body.name.split(" ").slice(1).join(" ") : "Student");
  const fullName = body.name || `${firstName} ${lastName}`.trim();
  const schoolCode = getSchoolCode(serverDB.school?.registration_number || serverDB.school?.name || "MIH");
  const nextEnroll = getNextStudentEnrollNumber(serverDB.students);
  const studentId = body.student_id || body.id || body.regNo || body.reg_no || generateStudentRegNo(schoolCode, nextEnroll);
  const studyLevel = typeof body.class === "object" ? body.class.study_level : (body.class || body.class_name || "Form 1A");
  const curriculum = body.curriculum || (typeof body.class === "object" ? body.class.curriculum : "Tanzania National (NECTA)");

  const student = {
    id: studentId,
    student_id: studentId,
    name: fullName,
    fname: firstName,
    lname: lastName,
    first_name: firstName,
    last_name: lastName,
    email: body.email || `student_${Date.now()}@barakahub.edu.tz`,
    regNo: studentId,
    reg_no: studentId,
    class: studyLevel,
    curriculum: curriculum,
    gender: body.gender || "M",
    age: Number(body.age) || 15,
    parentContact: body.parentContact || body.parent_contact || body.phone || "",
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
  const existingIdx = serverDB.students.findIndex(s => s.regNo === student.regNo || s.email === student.email || s.student_id === student.student_id);
  if (existingIdx >= 0) {
    serverDB.students[existingIdx] = { ...serverDB.students[existingIdx], ...student };
  } else {
    serverDB.students.unshift(student);
  }

  return res.status(201).json({
    success: "true",
    code: 0,
    message: "Student registered successfully",
    student_id: student.student_id,
    first_name: student.first_name,
    last_name: student.last_name,
    email: student.email,
    class: {
      study_level: student.class,
      curriculum: student.curriculum
    },
    student
  });
});

// Single student fetcher: supports both singular /student/:id and plural /students/:id
app.get([
  "/api/v1/student/:id",
  "/api/student/:id",
  "/api/v1/students/:id",
  "/api/students/:id"
], async (req, res) => {
  const { id } = req.params;
  const authHeader = req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {};

  // 1. Try remote singular /student/:id first
  const remoteSingular = await tryRemoteApiFull(`/student/${id}`, {
    method: "GET",
    headers: { ...authHeader, "accept": "application/json" }
  });
  if (remoteSingular && remoteSingular.data && remoteSingular.status === 200) {
    return res.status(200).json(remoteSingular.data);
  }

  // 2. Try remote plural /students/:id
  const remotePlural = await tryRemoteApiFull(`/students/${id}`, {
    method: "GET",
    headers: { ...authHeader, "accept": "application/json" }
  });
  if (remotePlural && remotePlural.data && remotePlural.status === 200) {
    return res.status(200).json(remotePlural.data);
  }

  // 3. Fallback to local database
  const student = serverDB.students.find(s => 
    String(s.id) === String(id) || 
    String(s.student_id) === String(id) || 
    String(s.regNo) === String(id) || 
    String(s.reg_no) === String(id) || 
    (s.email && s.email.toLowerCase() === String(id).toLowerCase())
  );

  if (student) {
    const firstName = student.first_name || student.fname || (student.name ? student.name.split(" ")[0] : "Student");
    const lastName = student.last_name || student.lname || (student.name ? student.name.split(" ").slice(1).join(" ") : "");
    const studyLevel = typeof student.class === "object" ? student.class.study_level : (student.class || "Form 1");
    const curriculum = student.curriculum || (typeof student.class === "object" ? student.class.curriculum : "Tanzania National (NECTA)");

    return res.json({
      success: "true",
      code: 0,
      message: "Student retrieved successfully",
      student_id: String(student.student_id || student.id || student.regNo),
      first_name: firstName,
      last_name: lastName,
      email: student.email,
      class: {
        study_level: studyLevel,
        curriculum: curriculum
      },
      name: student.name || `${firstName} ${lastName}`.trim(),
      regNo: student.regNo || student.student_id || student.id,
      progress: student.progress || 0,
      lastActive: student.lastActive || "Today",
      parentContact: student.parentContact || student.phone || "",
      age: Number(student.age) || 15,
      gender: student.gender || "M"
    });
  }

  // If remote returned 401 and user didn't supply valid token
  if (remoteSingular && remoteSingular.status === 401 && (!req.headers["authorization"] || req.headers["authorization"] === "Bearer undefined")) {
    return res.status(401).json(remoteSingular.data);
  }

  return res.status(404).json({
    success: "false",
    code: 404,
    message: "Student not found"
  });
});

app.put([
  "/api/v1/student/:id",
  "/api/student/:id",
  "/api/v1/students/:id",
  "/api/students/:id"
], async (req, res) => {
  const { id } = req.params;
  const body = req.body || {};

  tryRemoteApi(`/student/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) },
    body: JSON.stringify(body)
  }).catch(() => {});

  const idx = serverDB.students.findIndex(s => s.id === id || s.student_id === id || s.regNo === id || s.email === id);
  if (idx >= 0) {
    serverDB.students[idx] = { ...serverDB.students[idx], ...body };
    return res.json({ success: "true", code: 0, message: "Student updated successfully", student: serverDB.students[idx] });
  }

  return res.json({ success: "true", code: 0, message: "Student updated successfully", student: body });
});

app.delete([
  "/api/v1/student/:id",
  "/api/student/:id",
  "/api/v1/students/:id",
  "/api/students/:id"
], async (req, res) => {
  const { id } = req.params;

  tryRemoteApi(`/student/${id}`, {
    method: "DELETE",
    headers: { ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) }
  }).catch(() => {});

  if (!serverDB.deletedStudentIds) serverDB.deletedStudentIds = [];
  if (!serverDB.deletedStudentIds.includes(id)) {
    serverDB.deletedStudentIds.push(id);
  }

  serverDB.students = serverDB.students.filter(s => {
    const matches = s.id === id || s.student_id === id || s.regNo === id || s.email === id;
    if (matches) {
      if (s.id && !serverDB.deletedStudentIds.includes(s.id)) serverDB.deletedStudentIds.push(s.id);
      if (s.regNo && !serverDB.deletedStudentIds.includes(s.regNo)) serverDB.deletedStudentIds.push(s.regNo);
      if (s.email && !serverDB.deletedStudentIds.includes(s.email)) serverDB.deletedStudentIds.push(s.email);
      return false;
    }
    return true;
  });

  saveServerDB();
  return res.json({ success: "true", code: 0, message: "Student deleted successfully" });
});

app.post([
  "/api/v1/students/batch-delete",
  "/api/students/batch-delete"
], async (req, res) => {
  const ids: string[] = req.body?.ids || [];
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ success: false, message: "ids array is required" });
  }

  if (!serverDB.deletedStudentIds) serverDB.deletedStudentIds = [];
  const idSet = new Set(ids);
  for (const id of ids) {
    if (!serverDB.deletedStudentIds.includes(id)) {
      serverDB.deletedStudentIds.push(id);
    }
  }

  serverDB.students = serverDB.students.filter(s => {
    const isTarget = idSet.has(s.id) || idSet.has(s.student_id) || idSet.has(s.regNo) || idSet.has(s.email);
    if (isTarget) {
      if (s.id && !serverDB.deletedStudentIds.includes(s.id)) serverDB.deletedStudentIds.push(s.id);
      if (s.regNo && !serverDB.deletedStudentIds.includes(s.regNo)) serverDB.deletedStudentIds.push(s.regNo);
      if (s.email && !serverDB.deletedStudentIds.includes(s.email)) serverDB.deletedStudentIds.push(s.email);
      return false;
    }
    return true;
  });

  saveServerDB();
  return res.json({ success: "true", code: 0, message: `${ids.length} students deleted successfully`, deletedCount: ids.length });
});

// --- TEACHERS ENDPOINTS ---
app.get(["/api/v1/teachers/students", "/api/teachers/students"], async (req, res) => {
  const deletedSet = new Set(serverDB.deletedStudentIds || []);
  const filterList = (arr: any[]) => {
    return arr.filter(s => {
      const id = s.id || s.student_id || s.regNo || "";
      const email = (s.email || "").toLowerCase();
      const name = `${s.name || ""} ${s.first_name || ""} ${s.fname || ""}`.toLowerCase();
      if (deletedSet.has(id) || deletedSet.has(email) || deletedSet.has(s.regNo)) return false;
      if (
        name.includes("mwanafunzi baraka") ||
        name.includes("baraka mwanafunzi") ||
        (name.includes("mwanafunzi") && name.includes("baraka")) ||
        name.trim() === "mwanafunzi" ||
        email.startsWith("learner_") ||
        email.includes("barakahub.edu.tz")
      ) return false;
      return true;
    });
  };

  const remote = await tryRemoteApi(`/teachers/students${req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : ""}`, {
    method: "GET",
    headers: { ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) }
  });

  if (remote && Array.isArray(remote)) {
    return res.json(filterList(remote));
  }
  if (remote && (remote as any).data && Array.isArray((remote as any).data)) {
    return res.json(filterList((remote as any).data));
  }

  const { class_name, search } = req.query as { class_name?: string; search?: string };
  let list = filterList([...(serverDB.students || [])]);
  if (class_name && class_name !== "All") {
    list = list.filter(s => (s.class || "").toLowerCase() === class_name.toLowerCase());
  }
  if (search && typeof search === "string") {
    const q = search.toLowerCase();
    list = list.filter(s =>
      (s.name || "").toLowerCase().includes(q) ||
      (s.email || "").toLowerCase().includes(q) ||
      (s.regNo || "").toLowerCase().includes(q)
    );
  }
  return res.json(list);
});

app.get(["/api/v1/teachers", "/api/teachers"], async (req, res) => {
  const { search } = req.query;
  const deletedSet = new Set((serverDB.deletedTeacherIds || []).map(d => String(d).toLowerCase()));

  const remote = await tryRemoteApi(`/teachers${req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : ""}`, {
    method: "GET",
    headers: { ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) }
  });

  let rawList: any[] = [];
  if (remote && Array.isArray(remote)) {
    rawList = remote;
  } else if (remote && (remote as any).data && Array.isArray((remote as any).data)) {
    rawList = (remote as any).data;
  } else {
    rawList = [...serverDB.teachers];
  }

  let list = rawList.filter(t => {
    if (!t) return false;
    const tid = String(t.id || "").toLowerCase();
    const temail = String(t.email || "").toLowerCase();
    return !deletedSet.has(tid) && !deletedSet.has(temail);
  });

  if (search && typeof search === "string") {
    list = list.filter(t => (t.name || "").toLowerCase().includes(search.toLowerCase()) || (t.email || "").toLowerCase().includes(search.toLowerCase()));
  }
  return res.json(list);
});

app.post(["/api/v1/teachers", "/api/teachers"], async (req, res) => {
  const body = req.body || {};
  const password = body.password || "teacher123";
  const teacher = {
    id: body.id || `teach-${Date.now()}`,
    name: body.name || (body.firstName ? `${body.firstName} ${body.lastName || ""}`.trim() : "Mwalimu"),
    firstName: body.firstName || body.name?.split(" ")[0] || "Mwalimu",
    lastName: body.lastName || body.name?.split(" ").slice(1).join(" ") || "",
    email: body.email || `teacher_${Date.now()}@barakahub.edu.tz`,
    password: password,
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

  const existingIdx = serverDB.teachers.findIndex(t => t.email.toLowerCase() === teacher.email.toLowerCase());
  if (existingIdx >= 0) {
    serverDB.teachers[existingIdx] = { ...serverDB.teachers[existingIdx], ...teacher };
  } else {
    serverDB.teachers.unshift(teacher);
  }

  // Register in serverDB.users
  if (!serverDB.users) serverDB.users = [];
  const teachUserIdx = serverDB.users.findIndex(u => (u.email || "").toLowerCase() === teacher.email.toLowerCase());
  const teacherUserRecord = {
    id: teacher.id,
    email: teacher.email,
    password: password,
    fname: teacher.firstName,
    lname: teacher.lastName,
    name: teacher.name,
    role: "teacher",
    subjects: teacher.subjects,
    classes: teacher.classes,
    created_at: new Date().toISOString()
  };
  if (teachUserIdx >= 0) {
    serverDB.users[teachUserIdx] = { ...serverDB.users[teachUserIdx], ...teacherUserRecord };
  } else {
    serverDB.users.unshift(teacherUserRecord);
  }

  saveServerDB();

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
  const lowerId = String(id).toLowerCase();

  tryRemoteApi(`/teachers/${id}`, {
    method: "DELETE",
    headers: { ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) }
  }).catch(() => {});

  if (!serverDB.deletedTeacherIds) serverDB.deletedTeacherIds = [];
  if (!serverDB.deletedTeacherIds.includes(id)) {
    serverDB.deletedTeacherIds.push(id);
  }
  if (!serverDB.deletedTeacherIds.includes(lowerId)) {
    serverDB.deletedTeacherIds.push(lowerId);
  }

  serverDB.teachers = serverDB.teachers.filter(t => {
    const tid = String(t.id || "").toLowerCase();
    const temail = String(t.email || "").toLowerCase();
    const isTarget = t.id === id || t.email === id || tid === lowerId || temail === lowerId;
    if (isTarget) {
      if (t.id && !serverDB.deletedTeacherIds.includes(t.id)) serverDB.deletedTeacherIds.push(t.id);
      if (t.email && !serverDB.deletedTeacherIds.includes(t.email)) serverDB.deletedTeacherIds.push(t.email);
      return false;
    }
    return true;
  });

  saveServerDB();
  return res.json({ success: true, message: "Teacher deleted successfully" });
});

// --- CLASSES ENDPOINTS ---
app.get(["/api/v1/classes", "/api/classes"], async (req, res) => {
  const remoteResult = await tryRemoteApiFull("/classes", {
    method: "GET",
    headers: { ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) }
  });

  if (remoteResult && remoteResult.data && remoteResult.status >= 200 && remoteResult.status < 300) {
    return res.status(remoteResult.status).json(remoteResult.data);
  }

  // Format classes to provide both id, name and class_name
  const classesFormatted = serverDB.classes.map(c => ({
    ...c,
    class_name: (c as any).class_name || c.name,
    name: c.name || (c as any).class_name
  }));

  return res.json({
    success: "true",
    code: 0,
    message: "Classes retrieved successfully",
    classes: classesFormatted
  });
});

app.post(["/api/v1/classes", "/api/classes"], async (req, res) => {
  const body = req.body || {};
  const className = (body.class_name || body.name || "Form 1A").trim();
  
  const remoteResult = await tryRemoteApiFull("/classes", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) },
    body: JSON.stringify({ class_name: className })
  });
  if (remoteResult && remoteResult.data && (remoteResult.status === 200 || remoteResult.status === 201)) {
    return res.status(remoteResult.status).json(remoteResult.data);
  }

  const newClass = {
    id: body.id || `cls-${Date.now()}`,
    name: className,
    class_name: className,
    teacher: body.teacher || "TBD",
    studentsCount: Number(body.studentsCount) || 0,
    avgScore: Number(body.avgScore) || 75,
    subjects: body.subjects || "General"
  };

  serverDB.classes.unshift(newClass);
  saveServerDB();
  return res.status(201).json({
    id: newClass.id,
    name: newClass.name,
    class_name: newClass.class_name,
    success: true,
    class: newClass
  });
});

// --- CLASS JOIN REQUESTS ENDPOINTS (Registered before :id to prevent collision) ---
app.get(["/api/v1/classes/join-requests", "/api/classes/join-requests"], (req, res) => {
  const { student_email, school, status } = req.query;
  let requests = [...(serverDB.classJoinRequests || [])];

  if (student_email && typeof student_email === "string") {
    requests = requests.filter(r => (r.studentEmail || "").toLowerCase() === student_email.toLowerCase());
  }
  if (school && typeof school === "string") {
    requests = requests.filter(r => 
      !r.schoolName || 
      r.schoolName.toLowerCase().includes(school.toLowerCase()) || 
      (r.school && r.school.toLowerCase().includes(school.toLowerCase()))
    );
  }
  if (status && typeof status === "string") {
    requests = requests.filter(r => (r.status || "").toLowerCase() === status.toLowerCase());
  }

  return res.json(requests);
});

app.post(["/api/v1/classes/join-requests", "/api/classes/join-requests"], (req, res) => {
  const body = req.body || {};
  if (!body.studentEmail || !body.requestedClass) {
    return res.status(400).json({ error: "studentEmail and requestedClass are required" });
  }

  // Check if there is already an active pending request for this student & class
  const existingPending = (serverDB.classJoinRequests || []).find(r => 
    (r.studentEmail || "").toLowerCase() === body.studentEmail.toLowerCase() &&
    r.requestedClass === body.requestedClass &&
    r.status === "Pending"
  );
  if (existingPending) {
    return res.json({ success: true, request: existingPending, message: "Request already pending" });
  }

  const newRequest = {
    id: body.id || `cjr_${Date.now()}`,
    studentEmail: body.studentEmail,
    studentName: body.studentName || "Student",
    studentReg: body.studentReg || "",
    schoolName: body.schoolName || body.school || "Baraka Secondary School",
    school: body.school || body.schoolName || "Baraka Secondary School",
    currentClass: body.currentClass || "Unassigned",
    requestedClass: body.requestedClass,
    status: "Pending", // Pending | Approved | Rejected
    requestedAt: body.requestedAt || new Date().toISOString(),
    decidedAt: null,
    decidedBy: null
  };

  if (!serverDB.classJoinRequests) serverDB.classJoinRequests = [];
  serverDB.classJoinRequests.unshift(newRequest);
  saveServerDB();

  return res.status(201).json({ success: true, request: newRequest });
});

app.put(["/api/v1/classes/join-requests/:id", "/api/classes/join-requests/:id"], (req, res) => {
  const { id } = req.params;
  const { status, decidedBy } = req.body || {};

  if (!["Approved", "Rejected", "Pending"].includes(status)) {
    return res.status(400).json({ error: "Invalid status. Must be Approved, Rejected, or Pending" });
  }

  const reqIndex = (serverDB.classJoinRequests || []).findIndex(r => r.id === id);
  if (reqIndex === -1) {
    return res.status(404).json({ error: "Join request not found" });
  }

  const joinReq = serverDB.classJoinRequests[reqIndex];
  joinReq.status = status;
  joinReq.decidedAt = new Date().toISOString();
  joinReq.decidedBy = decidedBy || "School Admin";

  // If approved, update the student's assigned class in database
  if (status === "Approved") {
    const studentIdx = serverDB.students.findIndex(s => 
      (s.email && s.email.toLowerCase() === (joinReq.studentEmail || "").toLowerCase()) ||
      (s.regNo && s.regNo === joinReq.studentReg)
    );
    if (studentIdx >= 0) {
      serverDB.students[studentIdx].class = joinReq.requestedClass;
    }
    // Also increment class studentsCount if class exists
    const classIdx = serverDB.classes.findIndex(c => 
      (c.name || "").toLowerCase() === (joinReq.requestedClass || "").toLowerCase()
    );
    if (classIdx >= 0) {
      serverDB.classes[classIdx].studentsCount = (serverDB.classes[classIdx].studentsCount || 0) + 1;
    }
  }

  saveServerDB();
  return res.json({ success: true, request: joinReq });
});

app.get(["/api/v1/classes/:id", "/api/classes/:id"], async (req, res) => {
  const { id } = req.params;
  const remoteResult = await tryRemoteApiFull(`/classes/${id}`, {
    method: "GET",
    headers: { ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) }
  });
  if (remoteResult && remoteResult.data && remoteResult.status === 200) {
    return res.status(remoteResult.status).json(remoteResult.data);
  }

  const cls = serverDB.classes.find(c => c.id === id || (c.name && c.name.toLowerCase() === id.toLowerCase()));
  if (cls) {
    return res.json({
      id: cls.id,
      name: cls.name,
      class_name: (cls as any).class_name || cls.name,
      ...cls
    });
  }
  return res.status(404).json({ detail: "Class not found" });
});

app.put(["/api/v1/classes/:id", "/api/classes/:id"], async (req, res) => {
  const { id } = req.params;
  const body = req.body || {};
  const className = (body.class_name || body.name || "").trim();

  const remoteResult = await tryRemoteApiFull(`/classes/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) },
    body: JSON.stringify({ class_name: className })
  });
  if (remoteResult && remoteResult.data && (remoteResult.status === 200 || remoteResult.status === 204)) {
    return res.status(remoteResult.status).json(remoteResult.data);
  }

  const idx = serverDB.classes.findIndex(c => c.id === id || (c.name && c.name.toLowerCase() === id.toLowerCase()));
  if (idx >= 0) {
    serverDB.classes[idx] = { 
      ...serverDB.classes[idx], 
      ...body,
      ...(className ? { name: className, class_name: className } : {})
    };
    saveServerDB();
    return res.json({
      id: serverDB.classes[idx].id,
      name: serverDB.classes[idx].name,
      class_name: (serverDB.classes[idx] as any).class_name || serverDB.classes[idx].name,
      success: true,
      class: serverDB.classes[idx]
    });
  }
  return res.json({ id, name: className, class_name: className, success: true });
});

app.delete(["/api/v1/classes/:id", "/api/classes/:id"], async (req, res) => {
  const { id } = req.params;
  const remoteResult = await tryRemoteApiFull(`/classes/${id}`, {
    method: "DELETE",
    headers: { ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) }
  });
  if (remoteResult && (remoteResult.status === 200 || remoteResult.status === 204)) {
    return res.status(remoteResult.status).json(remoteResult.data);
  }

  serverDB.classes = serverDB.classes.filter(c => c.id !== id && (!c.name || c.name.toLowerCase() !== id.toLowerCase()));
  saveServerDB();
  return res.json({ success: "true", code: 0, message: "Class deleted successfully" });
});

// --- CLASS STUDENTS: LIST ENROLLED STUDENTS ---
app.get([
  "/api/v1/classes/:id/students",
  "/api/classes/:id/students"
], async (req, res) => {
  const { id } = req.params;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.page_size as string) || 50));

  // Try remote backend first
  const remoteResult = await tryRemoteApiFull(`/classes/${id}/students?page=${page}&page_size=${pageSize}`, {
    method: "GET",
    headers: { ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) }
  });
  if (remoteResult && remoteResult.data && remoteResult.status === 200) {
    return res.status(200).json(remoteResult.data);
  }

  // Fallback: lookup class and enrolled students in serverDB
  const cls = serverDB.classes.find(c => c.id === id || (c.name && c.name.toLowerCase() === id.toLowerCase()));
  if (!cls) {
    return res.status(404).json({ detail: "Class not found" });
  }

  const enrolledStudentIds = (cls as any).enrolled_students || [];
  const matchingStudents = serverDB.students.filter(s => {
    const sClass = typeof s.class === "object" ? s.class.study_level : s.class;
    return (
      enrolledStudentIds.includes(s.id) ||
      enrolledStudentIds.includes(s.student_id) ||
      (sClass && (sClass.toLowerCase() === (cls.name || "").toLowerCase() || sClass.toLowerCase() === ((cls as any).class_name || "").toLowerCase()))
    );
  });

  const startIndex = (page - 1) * pageSize;
  const paginated = matchingStudents.slice(startIndex, startIndex + pageSize);

  return res.json({
    success: "true",
    code: 0,
    message: "Class students retrieved successfully",
    class_id: cls.id,
    class_name: cls.name || (cls as any).class_name,
    students: paginated.map(s => ({
      student_id: s.student_id || s.id,
      id: s.id,
      first_name: s.first_name || s.fname || (s.name ? s.name.split(" ")[0] : "Student"),
      last_name: s.last_name || s.lname || (s.name ? s.name.split(" ").slice(1).join(" ") : ""),
      name: s.name || `${s.first_name || s.fname || ""} ${s.last_name || s.lname || ""}`.trim(),
      email: s.email || "",
      phone: s.parentContact || s.phone || "",
      class: cls.name,
      curriculum: s.curriculum || "NECTA",
      status: s.status || "Active",
      enrolled_at: (s as any).enrolled_at || s.created_at || new Date().toISOString()
    })),
    pagination: {
      page,
      page_size: pageSize,
      total: matchingStudents.length,
      total_pages: Math.ceil(matchingStudents.length / pageSize) || 1
    }
  });
});

// --- CLASS ENROLLMENT: SINGLE STUDENT ---
app.post([
  "/api/v1/classes/:id/students",
  "/api/classes/:id/students",
  "/api/v1/classes/:id/enroll",
  "/api/classes/:id/enroll"
], async (req, res) => {
  const { id } = req.params;
  const body = req.body || {};
  const studentIdentifier = body.student_id || body.user_id || body.student_email || body.student_phone || body.id;

  // Try remote backend first
  const remoteResult = await tryRemoteApiFull(`/classes/${id}/students`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) },
    body: JSON.stringify(body)
  });
  if (remoteResult && remoteResult.data && (remoteResult.status === 200 || remoteResult.status === 201)) {
    return res.status(remoteResult.status).json(remoteResult.data);
  }

  // Fallback in serverDB
  const cls = serverDB.classes.find(c => c.id === id || (c.name && c.name.toLowerCase() === id.toLowerCase()));
  if (!cls) {
    return res.status(404).json({ detail: "Class not found" });
  }

  let student = serverDB.students.find(s => 
    s.id === studentIdentifier ||
    s.student_id === studentIdentifier ||
    s.regNo === studentIdentifier ||
    (body.student_email && (s.email || "").toLowerCase() === body.student_email.toLowerCase()) ||
    (body.student_phone && (s.parentContact === body.student_phone || s.phone === body.student_phone))
  );

  if (!student) {
    // If student does not exist yet, create a registered student profile
    const studentReg = `BSS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    student = {
      id: `stud-${Date.now()}`,
      student_id: studentReg,
      regNo: studentReg,
      first_name: body.first_name || (body.student_email ? body.student_email.split("@")[0] : "Student"),
      last_name: body.last_name || "",
      name: `${body.first_name || "Student"} ${body.last_name || ""}`.trim(),
      email: body.student_email || `student_${Date.now()}@school.ac.tz`,
      phone: body.student_phone || "",
      parentContact: body.student_phone || "",
      class: cls.name,
      curriculum: "NECTA",
      status: "Active",
      created_at: new Date().toISOString()
    } as any;
    serverDB.students.unshift(student);
  } else {
    // Update student's class
    student.class = cls.name;
    (student as any).enrolled_at = new Date().toISOString();
  }

  if (!(cls as any).enrolled_students) {
    (cls as any).enrolled_students = [];
  }
  if (!(cls as any).enrolled_students.includes(student.id)) {
    (cls as any).enrolled_students.push(student.id);
  }
  cls.studentsCount = ((cls as any).enrolled_students.length) || ((cls.studentsCount || 0) + 1);

  saveServerDB();

  return res.status(201).json({
    enrollment_id: `enr_${Date.now()}`,
    student_id: student.student_id || student.id,
    user_id: student.id,
    first_name: student.first_name || student.fname || "Student",
    last_name: student.last_name || student.lname || "",
    email: student.email,
    phone: student.parentContact || student.phone || "",
    class_id: cls.id,
    class_name: cls.name,
    enrolled_at: new Date().toISOString()
  });
});

// --- CLASS ENROLLMENT: BULK STUDENTS ---
app.post([
  "/api/v1/classes/:id/students/bulk",
  "/api/classes/:id/students/bulk",
  "/api/v1/classes/:id/enroll/bulk",
  "/api/classes/:id/enroll/bulk"
], async (req, res) => {
  const { id } = req.params;
  const body = req.body || {};
  const studentIds: string[] = body.student_ids || body.user_ids || [];
  const studentEmails: string[] = body.student_emails || [];

  // Try remote backend first
  const remoteResult = await tryRemoteApiFull(`/classes/${id}/students/bulk`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) },
    body: JSON.stringify(body)
  });
  if (remoteResult && remoteResult.data && (remoteResult.status === 200 || remoteResult.status === 201)) {
    return res.status(remoteResult.status).json(remoteResult.data);
  }

  // Fallback in serverDB
  const cls = serverDB.classes.find(c => c.id === id || (c.name && c.name.toLowerCase() === id.toLowerCase()));
  if (!cls) {
    return res.status(404).json({ detail: "Class not found" });
  }

  if (!(cls as any).enrolled_students) {
    (cls as any).enrolled_students = [];
  }

  let successCount = 0;
  let skippedCount = 0;
  const failures: any[] = [];

  const allTargetIdentifiers = [...new Set([...studentIds, ...studentEmails])];

  for (const identifier of allTargetIdentifiers) {
    const student = serverDB.students.find(s => 
      s.id === identifier || 
      s.student_id === identifier || 
      s.regNo === identifier || 
      (s.email && s.email.toLowerCase() === identifier.toLowerCase())
    );

    if (!student) {
      failures.push({ identifier, reason: "Student record not found" });
      continue;
    }

    if ((cls as any).enrolled_students.includes(student.id)) {
      skippedCount++;
      continue;
    }

    student.class = cls.name;
    (student as any).enrolled_at = new Date().toISOString();
    (cls as any).enrolled_students.push(student.id);
    successCount++;
  }

  cls.studentsCount = (cls as any).enrolled_students.length;
  saveServerDB();

  return res.status(200).json({
    success: "true",
    code: 0,
    message: `Enrolled ${successCount} student(s) into ${cls.name}`,
    result: {
      success_count: successCount,
      skipped_count: skippedCount,
      failed_count: failures.length,
      failures: failures
    }
  });
});

// --- CLASS UNENROLLMENT: REMOVE STUDENT FROM CLASS ---
app.delete([
  "/api/v1/classes/:id/students/:student_id",
  "/api/classes/:id/students/:student_id",
  "/api/v1/classes/:id/enroll/:student_id",
  "/api/classes/:id/enroll/:student_id"
], async (req, res) => {
  const { id, student_id } = req.params;

  // Try remote backend first
  const remoteResult = await tryRemoteApiFull(`/classes/${id}/students/${student_id}`, {
    method: "DELETE",
    headers: { ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) }
  });
  if (remoteResult && (remoteResult.status === 200 || remoteResult.status === 204)) {
    return res.status(remoteResult.status).send(remoteResult.data || null);
  }

  // Fallback in serverDB
  const cls = serverDB.classes.find(c => c.id === id || (c.name && c.name.toLowerCase() === id.toLowerCase()));
  if (cls && (cls as any).enrolled_students) {
    (cls as any).enrolled_students = (cls as any).enrolled_students.filter((sid: string) => sid !== student_id);
    cls.studentsCount = Math.max(0, (cls as any).enrolled_students.length);
  }

  const student = serverDB.students.find(s => s.id === student_id || s.student_id === student_id);
  if (student && cls && typeof student.class === "string" && student.class.toLowerCase() === (cls.name || "").toLowerCase()) {
    student.class = "Unassigned";
  }

  saveServerDB();
  return res.status(200).json({
    success: "true",
    code: 0,
    message: "Student successfully unenrolled from class"
  });
});

// --- ASSIGN TEACHER TO CLASS ---
app.post([
  "/api/v1/classes/:id/assign-teacher",
  "/api/classes/:id/assign-teacher"
], async (req, res) => {
  const { id } = req.params;
  const teacherId = req.body?.teacher_id || req.body?.teacherId;

  // Try remote backend first
  const remoteResult = await tryRemoteApiFull(`/classes/${id}/assign-teacher`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) },
    body: JSON.stringify({ teacher_id: teacherId })
  });
  if (remoteResult && remoteResult.data && remoteResult.status === 200) {
    return res.status(200).json(remoteResult.data);
  }

  // Fallback in serverDB
  const cls = serverDB.classes.find(c => c.id === id || (c.name && c.name.toLowerCase() === id.toLowerCase()));
  if (!cls) {
    return res.status(404).json({ detail: "Class not found" });
  }

  const teacher = serverDB.teachers.find(t => t.id === teacherId || (t.email && t.email.toLowerCase() === (teacherId || "").toLowerCase()));
  const teacherName = teacher ? (teacher.name || `${teacher.fname || ""} ${teacher.lname || ""}`.trim()) : (teacherId || "Teacher");

  cls.teacher = teacherName;
  (cls as any).class_teacher_id = teacherId;
  saveServerDB();

  return res.status(200).json({
    id: cls.id,
    name: cls.name,
    class_name: (cls as any).class_name || cls.name,
    teacher: teacherName,
    class_teacher_id: teacherId,
    success: true
  });
});

app.put([
  "/api/v1/classes/:id/teacher",
  "/api/classes/:id/teacher"
], async (req, res) => {
  const { id } = req.params;
  const teacherId = req.body?.teacher_id || req.body?.teacherId;
  const cls = serverDB.classes.find(c => c.id === id || (c.name && c.name.toLowerCase() === id.toLowerCase()));
  if (!cls) return res.status(404).json({ detail: "Class not found" });
  
  cls.teacher = teacherId || "Teacher";
  (cls as any).class_teacher_id = teacherId;
  saveServerDB();
  return res.json({ success: true, id: cls.id, name: cls.name, teacher: cls.teacher });
});

// --- CLASSROOM DISCUSSIONS ENDPOINTS ---
app.get(["/api/v1/discussions", "/api/discussions"], async (req, res) => {
  const remoteResult = await tryRemoteApiFull("/discussions", {
    method: "GET",
    headers: { ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) }
  });
  if (remoteResult && remoteResult.status === 200 && remoteResult.data) {
    return res.status(200).json(remoteResult.data);
  }

  if (!serverDB.discussions || serverDB.discussions.length === 0) {
    serverDB.discussions = [
      {
        id: "th-1",
        title: "Welcome to Academic Discussion Forum",
        content: "Karibuni wote kwenye jukwaa la masomo! Feel free to ask questions about Mathematics, Sciences, Languages and Humanities.",
        author: { id: "tch-1", first_name: "Sarah", last_name: "Mwangi", role: "teacher" },
        class_name: "All Classes",
        subject: "General",
        upvotes: 5,
        replies: [
          {
            id: "rep-1",
            thread_id: "th-1",
            content: "Asante Mwalimu! We are ready for this term's topics.",
            author: { id: "std-1", first_name: "Rehema", last_name: "Mollel", role: "student" },
            created_at: new Date(Date.now() - 1800000).toISOString()
          }
        ],
        created_at: new Date(Date.now() - 3600000).toISOString()
      }
    ];
  }

  return res.json({
    success: "true",
    code: 0,
    message: "Discussions retrieved",
    discussions: serverDB.discussions,
    threads: serverDB.discussions
  });
});

app.post(["/api/v1/discussions", "/api/discussions"], async (req, res) => {
  const body = req.body || {};
  const remoteResult = await tryRemoteApiFull("/discussions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {})
    },
    body: JSON.stringify(body)
  });
  if (remoteResult && (remoteResult.status === 200 || remoteResult.status === 201) && remoteResult.data) {
    return res.status(remoteResult.status).json(remoteResult.data);
  }

  const thread = {
    id: `th-${Date.now()}`,
    title: body.title || body.content?.substring(0, 40) || "Discussion Topic",
    content: body.content || "",
    class_name: body.class_name || body.class || "General",
    subject: body.subject || "General",
    author: {
      id: body.author_id || "usr-current",
      first_name: body.first_name || body.author_name?.split(" ")[0] || "Student",
      last_name: body.last_name || body.author_name?.split(" ").slice(1).join(" ") || "Member",
      role: body.role || "student"
    },
    upvotes: 0,
    replies: [],
    created_at: new Date().toISOString()
  };

  if (!serverDB.discussions) serverDB.discussions = [];
  serverDB.discussions.unshift(thread);
  saveServerDB();

  return res.status(201).json({
    success: "true",
    code: 0,
    message: "Discussion thread created",
    thread
  });
});

app.post(["/api/v1/discussions/:id/replies", "/api/discussions/:id/replies"], async (req, res) => {
  const { id } = req.params;
  const body = req.body || {};
  const remoteResult = await tryRemoteApiFull(`/discussions/${id}/replies`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {})
    },
    body: JSON.stringify(body)
  });
  if (remoteResult && (remoteResult.status === 200 || remoteResult.status === 201) && remoteResult.data) {
    return res.status(remoteResult.status).json(remoteResult.data);
  }

  const reply = {
    id: `rep-${Date.now()}`,
    thread_id: id,
    content: body.content || "",
    author: {
      id: body.author_id || "usr-current",
      first_name: body.first_name || body.author_name?.split(" ")[0] || "Student",
      last_name: body.last_name || body.author_name?.split(" ").slice(1).join(" ") || "Learner",
      role: body.role || "student"
    },
    created_at: new Date().toISOString()
  };

  if (!serverDB.discussions) serverDB.discussions = [];
  const targetThread = serverDB.discussions.find(t => t.id === id);
  if (targetThread) {
    if (!targetThread.replies) targetThread.replies = [];
    targetThread.replies.push(reply);
    saveServerDB();
  }

  return res.status(201).json({
    success: "true",
    code: 0,
    message: "Reply posted successfully",
    reply
  });
});

app.post([
  "/api/v1/discussions/:id/upvote",
  "/api/discussions/:id/upvote",
  "/api/v1/discussions/:id/like",
  "/api/discussions/:id/like"
], async (req, res) => {
  const { id } = req.params;
  tryRemoteApiFull(`/discussions/${id}/upvote`, {
    method: "POST",
    headers: { ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) }
  }).catch(() => {});

  if (!serverDB.discussions) serverDB.discussions = [];
  const targetThread = serverDB.discussions.find(t => t.id === id);
  if (targetThread) {
    targetThread.upvotes = (targetThread.upvotes || 0) + 1;
    saveServerDB();
    return res.json({ success: true, code: 0, upvotes: targetThread.upvotes });
  }
  return res.json({ success: true, code: 0, upvotes: 1 });
});

app.get(["/api/v1/discussions/:id", "/api/discussions/:id"], async (req, res) => {
  const { id } = req.params;
  const remoteResult = await tryRemoteApiFull(`/discussions/${id}`, {
    method: "GET",
    headers: { ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) }
  });
  if (remoteResult && remoteResult.status === 200 && remoteResult.data) {
    return res.status(200).json(remoteResult.data);
  }

  if (!serverDB.discussions) serverDB.discussions = [];
  const targetThread = serverDB.discussions.find(t => t.id === id);
  if (!targetThread) {
    return res.status(404).json({ success: false, code: 404, message: "Discussion not found" });
  }
  return res.json({ success: true, code: 0, thread: targetThread, discussion: targetThread });
});

app.get(["/api/v1/discussions/:id/replies", "/api/discussions/:id/replies"], async (req, res) => {
  const { id } = req.params;
  const remoteResult = await tryRemoteApiFull(`/discussions/${id}/replies`, {
    method: "GET",
    headers: { ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) }
  });
  if (remoteResult && remoteResult.status === 200 && remoteResult.data) {
    return res.status(200).json(remoteResult.data);
  }

  if (!serverDB.discussions) serverDB.discussions = [];
  const targetThread = serverDB.discussions.find(t => t.id === id);
  const replies = targetThread?.replies || [];
  return res.json({ success: true, code: 0, replies });
});

app.delete(["/api/v1/discussions/:id", "/api/discussions/:id"], async (req, res) => {
  const { id } = req.params;
  tryRemoteApiFull(`/discussions/${id}`, {
    method: "DELETE",
    headers: { ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) }
  }).catch(() => {});

  if (serverDB.discussions) {
    serverDB.discussions = serverDB.discussions.filter(t => t.id !== id);
    saveServerDB();
  }
  return res.json({ success: true, code: 0, message: "Discussion thread removed successfully" });
});

app.delete([
  "/api/v1/discussions/:id/replies/:replyId",
  "/api/discussions/:id/replies/:replyId"
], async (req, res) => {
  const { id, replyId } = req.params;
  tryRemoteApiFull(`/discussions/${id}/replies/${replyId}`, {
    method: "DELETE",
    headers: { ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) }
  }).catch(() => {});

  if (serverDB.discussions) {
    const thread = serverDB.discussions.find(t => t.id === id);
    if (thread && thread.replies) {
      thread.replies = thread.replies.filter((r: any) => r.id !== replyId);
      saveServerDB();
    }
  }
  return res.json({ success: true, code: 0, message: "Reply removed successfully" });
});

// --- ROBUST TANZANIA PHONE & SMS OTP VERIFICATION SUBSYSTEM ---
function normalizeTzPhone(raw: string): { internationalNoPlus: string; e164: string; national: string } {
  if (!raw || typeof raw !== "string") return { internationalNoPlus: "", e164: "", national: "" };
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("2550")) {
    digits = "255" + digits.substring(4);
  } else if (digits.startsWith("255")) {
    // already starts with 255
  } else if (digits.startsWith("0")) {
    digits = "255" + digits.substring(1);
  } else if (digits.length === 9) {
    digits = "255" + digits;
  }
  const e164 = digits ? `+${digits}` : "";
  const internationalNoPlus = digits;
  const national = digits.startsWith("255") ? `0${digits.substring(3)}` : digits;
  return { internationalNoPlus, e164, national };
}

// In-memory verification code registry: Key = internationalNoPlus (e.g. "255712345678")
const phoneVerificationCodes = new Map<string, { code: string; expiresAt: number; attempts: number }>();
const verifiedPhonesSet = new Set<string>();

// Central SMS dispatch handler connecting to live Carrier SMS Gateway
async function handleSendSmsOtp(req: express.Request, res: express.Response) {
  const body = req.body || {};
  const phone = body.phone || body.phoneNumber || body.tel || "";
  const name = body.name || body.school_name || body.headmaster_name || "School Hub User";

  if (!phone || typeof phone !== "string" || phone.trim().length < 6) {
    return res.status(400).json({
      success: false,
      code: 2002,
      error: "A valid phone number is required to receive SMS verification.",
      message: "A valid phone number is required to receive SMS verification."
    });
  }

  const { internationalNoPlus, e164 } = normalizeTzPhone(phone);
  if (!internationalNoPlus || internationalNoPlus.length < 10) {
    return res.status(400).json({
      success: false,
      code: 2002,
      error: "Please enter a valid Tanzanian mobile phone number (e.g. 0712345678 or +255712345678).",
      message: "Please enter a valid Tanzanian mobile phone number (e.g. 0712345678 or +255712345678)."
    });
  }

  // Generate 6-digit verification code
  const code = body.code && /^\d{6}$/.test(String(body.code).trim()) 
    ? String(body.code).trim() 
    : String(Math.floor(100000 + Math.random() * 900000));

  const codeRecord = {
    code,
    expiresAt: Date.now() + 15 * 60 * 1000,
    attempts: 0
  };

  // Store in in-memory cache and persisted serverDB
  phoneVerificationCodes.set(internationalNoPlus, codeRecord);
  phoneVerificationCodes.set(e164, codeRecord);
  if (!(serverDB as any).phoneVerificationCodes) {
    (serverDB as any).phoneVerificationCodes = {};
  }
  (serverDB as any).phoneVerificationCodes[internationalNoPlus] = codeRecord;
  saveServerDB();

  // DISPATCH REAL SMS VIA TBF REMOTE SMS GATEWAY
  let remoteRequestId = null;
  try {
    const remoteResult = await tryRemoteApiFull("/auth/otp/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: internationalNoPlus,
        name: name,
        code: code
      })
    });

    console.log(`[SMS Gateway] Verification code for ${e164} (${internationalNoPlus}): ${code}`);
    if (remoteResult && (remoteResult.status === 200 || remoteResult.status === 201)) {
      remoteRequestId = remoteResult.data?.request_id;
    }
  } catch (smsErr) {
    console.warn(`[SMS Gateway Exception] Error contacting remote carrier SMS gateway:`, smsErr);
  }

  return res.status(200).json({
    success: true,
    code: 2000,
    message: `Verification code successfully dispatched to ${e164}.`,
    phone: e164,
    request_id: remoteRequestId || Math.floor(10000000 + Math.random() * 90000000),
    verification_code: code,
    otp_code: code,
    dev_code: code
  });
}

// Central phone verification confirmation handler
function handleVerifyPhoneOtp(req: express.Request, res: express.Response) {
  const body = req.body || {};
  const phone = body.phone || body.phoneNumber || body.tel || "";
  const code = String(body.code || "").trim();

  if (!phone || !code) {
    return res.status(400).json({
      success: false,
      verified: false,
      code: 4000,
      error: "Both phone number and 6-digit verification code are required.",
      message: "Both phone number and 6-digit verification code are required."
    });
  }

  const { internationalNoPlus, e164 } = normalizeTzPhone(phone);
  let record = phoneVerificationCodes.get(internationalNoPlus) || phoneVerificationCodes.get(e164);
  if (!record && (serverDB as any).phoneVerificationCodes?.[internationalNoPlus]) {
    record = (serverDB as any).phoneVerificationCodes[internationalNoPlus];
    phoneVerificationCodes.set(internationalNoPlus, record);
  }

  if (!record) {
    return res.status(400).json({
      success: false,
      verified: false,
      code: 4004,
      error: "No active verification code found for this phone number. Please click 'Send Code' to receive an SMS.",
      message: "No active verification code found for this phone number. Please click 'Send Code' to receive an SMS."
    });
  }

  if (Date.now() > record.expiresAt) {
    phoneVerificationCodes.delete(internationalNoPlus);
    phoneVerificationCodes.delete(e164);
    if ((serverDB as any).phoneVerificationCodes) {
      delete (serverDB as any).phoneVerificationCodes[internationalNoPlus];
      saveServerDB();
    }
    return res.status(400).json({
      success: false,
      verified: false,
      code: 4008,
      error: "Verification code has expired. Please request a new code.",
      message: "Verification code has expired. Please request a new code."
    });
  }

  record.attempts = (record.attempts || 0) + 1;
  if (record.attempts > 5) {
    phoneVerificationCodes.delete(internationalNoPlus);
    phoneVerificationCodes.delete(e164);
    return res.status(429).json({
      success: false,
      verified: false,
      code: 4029,
      error: "Too many incorrect attempts. Please request a new verification code.",
      message: "Too many incorrect attempts. Please request a new verification code."
    });
  }

  // STRICT CHECK: Code MUST match exactly! When wrong, do NOT continue and return 400 Bad Request
  if (record.code !== code) {
    console.log(`[SMS Verify REJECTED] Phone: ${e164}, Expected: ${record.code}, Provided: ${code}`);
    return res.status(400).json({
      success: false,
      verified: false,
      code: 4001,
      error: "Invalid verification code. Please check the SMS sent to your phone and try again.",
      message: "Invalid verification code. Please check the SMS sent to your phone and try again."
    });
  }

  // Code is verified!
  console.log(`[SMS Verify SUCCESS] Phone: ${e164} successfully verified!`);
  phoneVerificationCodes.delete(internationalNoPlus);
  phoneVerificationCodes.delete(e164);
  if ((serverDB as any).phoneVerificationCodes) {
    delete (serverDB as any).phoneVerificationCodes[internationalNoPlus];
    saveServerDB();
  }
  verifiedPhonesSet.add(internationalNoPlus);

  return res.status(200).json({
    success: true,
    verified: true,
    code: 0,
    message: "Phone number verified successfully.",
    phone: e164
  });
}

// Map SMS and OTP endpoints to unified handlers
app.post([
  "/api/v1/auth/otp/send-otp",
  "/api/auth/otp/send-otp",
  "/api/v1/auth/send-sms-code",
  "/api/auth/send-sms-code",
  "/api/v1/send-sms-code",
  "/api/send-sms-code"
], handleSendSmsOtp);

app.post([
  "/api/v1/resend-otp",
  "/api/resend-otp"
], handleSendSmsOtp);

app.post([
  "/api/v1/verify-phone",
  "/api/verify-phone",
  "/api/v1/auth/verify-sms-code",
  "/api/auth/verify-sms-code",
  "/api/v1/verify-sms-code",
  "/api/verify-sms-code"
], handleVerifyPhoneOtp);

app.post(["/api/v1/auth/otp/send-verification-email", "/api/auth/otp/send-verification-email"], async (req, res) => {
  const body = req.body || {};
  const remoteResult = await tryRemoteApiFull("/auth/otp/send-verification-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (remoteResult && remoteResult.status === 200 && remoteResult.data) {
    return res.status(200).json(remoteResult.data);
  }

  return res.status(200).json({
    success: "true",
    code: 0,
    message: "Verification email dispatched",
    previewUrl: `https://mail.baraka.or.tz/verify?email=${encodeURIComponent(body.email || "")}&code=${body.code || "961132"}`
  });
});

// --- USER & TEACHER REGISTRATION ENDPOINTS ---
app.post(["/api/v1/register", "/api/register"], async (req, res) => {
  const body = req.body || {};
  const remoteResult = await tryRemoteApiFull("/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (remoteResult && (remoteResult.status === 200 || remoteResult.status === 201) && remoteResult.data) {
    return res.status(remoteResult.status).json(remoteResult.data);
  }

  const userId = `usr-${Date.now()}`;
  return res.status(201).json({
    message: "User registered successfully",
    user_id: userId,
    phone: body.phone
  });
});

app.post(["/api/v1/register/student", "/api/register/student"], async (req, res) => {
  const body = req.body || {};
  const remoteResult = await tryRemoteApiFull("/register/student", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (remoteResult && (remoteResult.status === 200 || remoteResult.status === 201) && remoteResult.data) {
    return res.status(remoteResult.status).json(remoteResult.data);
  }

  const userId = `std-${Date.now()}`;
  const student = {
    id: userId,
    student_id: userId,
    first_name: body.fname || body.first_name,
    last_name: body.lname || body.last_name,
    name: `${body.fname || ""} ${body.lname || ""}`.trim() || "Student",
    email: body.email,
    phone: body.phone,
    class: body.study_level || "Form 1",
    curriculum: body.curriculum || "Tanzania National (NECTA)",
    photo_url: body.photo_url || null
  };
  serverDB.students.unshift(student as any);
  return res.status(201).json({
    message: "Student registered successfully",
    user_id: userId
  });
});

app.post(["/api/v1/register/teacher", "/api/register/teacher"], async (req, res) => {
  const body = req.body || {};
  const remoteResult = await tryRemoteApiFull("/register/teacher", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (remoteResult && (remoteResult.status === 200 || remoteResult.status === 201) && remoteResult.data) {
    return res.status(remoteResult.status).json(remoteResult.data);
  }

  const userId = `tch-${Date.now()}`;
  const teacher = {
    id: userId,
    name: `${body.fname || ""} ${body.lname || ""}`.trim() || "Teacher",
    first_name: body.fname,
    last_name: body.lname,
    email: body.email,
    phone: body.phone,
    school: body.school || "Baraka Secondary School",
    photo_url: body.photo_url || null,
    subject: "General",
    classes: "Form 1, Form 2",
    status: "Active"
  };
  serverDB.teachers.unshift(teacher as any);
  return res.status(201).json({
    message: "Teacher registered successfully",
    user_id: userId,
    phone: body.phone
  });
});

app.get(["/api/v1/teacher/:id", "/api/teacher/:id"], async (req, res) => {
  const { id } = req.params;
  const remoteResult = await tryRemoteApiFull(`/teacher/${id}`, {
    method: "GET",
    headers: { ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) }
  });
  if (remoteResult && remoteResult.status === 200 && remoteResult.data) {
    return res.status(200).json(remoteResult.data);
  }

  const tch = serverDB.teachers.find(t => t.id === id || t.email === id);
  if (tch) {
    return res.json({
      success: "true",
      code: 0,
      message: "Teacher found",
      first_name: (tch as any).first_name || tch.name.split(" ")[0],
      last_name: (tch as any).last_name || tch.name.split(" ").slice(1).join(" "),
      email: tch.email,
      class: {
        study_level: tch.classes || "Form 1",
        curriculum: "Tanzania National (NECTA)"
      }
    });
  }

  return res.json({
    success: "true",
    code: 0,
    message: "Teacher details",
    first_name: "Teacher",
    last_name: "Baraka",
    email: "teacher@baraka.or.tz",
    class: {
      study_level: "Form 3",
      curriculum: "Tanzania National (NECTA)"
    }
  });
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

// --- OPEN DIGITAL LIBRARY & FREE BOOKS API (Internet Archive & Open Library + Tanzanian / Swahili Curated) ---
const CURATED_OPEN_BOOKS = [
  {
    id: "bk_tz_kisw_01",
    title: "Hadithi Fupi za Kiswahili na Visa vya Kiafrika",
    author: "George W. Bateman & Fasihi ya Kiswahili",
    authors: ["George W. Bateman", "East African Oral Tradition"],
    firstPublishYear: 1901,
    subject: "Kiswahili",
    subjects: ["Kiswahili", "Hadithi", "Fasihi ya Watoto", "African Literature"],
    level: "Kidato cha 1–4",
    language: "Kiswahili & English",
    coverUrl: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80",
    openLibraryUrl: "https://archive.org/details/cu31924029908229",
    readOnlineUrl: "https://archive.org/embed/cu31924029908229",
    directUrl: "https://archive.org/details/cu31924029908229/mode/2up",
    downloadPdfUrl: "https://archive.org/download/cu31924029908229/cu31924029908229.pdf",
    downloadUrl: "https://archive.org/download/cu31924029908229",
    identifier: "cu31924029908229",
    description: "Mkusanyiko halisi wa hadithi za kusisimua za Pwani ya Afrika Mashariki na Zanzibar zinazofundisha maadili, hekima, na ufasaha wa lugha.",
    pages: 248,
    isFreeOnline: true,
    source: "Internet Archive & African Heritage"
  },
  {
    id: "bk_tz_kisw_02",
    title: "Diwani ya Mashairi na Methali za Kiswahili",
    author: "W. E. Taylor & Fasihi ya Ushairi",
    authors: ["W. E. Taylor", "Watunzi wa Ushairi wa Afrika Mashariki"],
    firstPublishYear: 1924,
    subject: "Kiswahili",
    subjects: ["Ushairi", "Mashairi ya Arudhi", "NECTA Kiswahili", "Methali"],
    level: "Kidato cha 3–4",
    language: "Kiswahili",
    coverUrl: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=600&q=80",
    openLibraryUrl: "https://archive.org/details/swahiliproverbs00tayluoft",
    readOnlineUrl: "https://archive.org/embed/swahiliproverbs00tayluoft",
    directUrl: "https://archive.org/details/swahiliproverbs00tayluoft/mode/2up",
    downloadPdfUrl: "https://archive.org/download/swahiliproverbs00tayluoft/swahiliproverbs00tayluoft.pdf",
    downloadUrl: "https://archive.org/download/swahiliproverbs00tayluoft",
    identifier: "swahiliproverbs00tayluoft",
    description: "Uchambuzi wa kina wa beti, mishororo, vina, mizani, na mafumbo ya lugha ya Kiswahili kulingana na muhtasari wa somo la Kiswahili.",
    pages: 144,
    isFreeOnline: true,
    source: "Internet Archive African Literature"
  },
  {
    id: "bk_tz_kisw_03",
    title: "African Stories & Folktales of East Africa",
    author: "African Folklore Consortium",
    authors: ["East African Traditional Storytellers"],
    firstPublishYear: 1913,
    subject: "Kiswahili",
    subjects: ["Hadithi", "Ngano za Kiafrika", "Kiswahili Fasaha"],
    level: "Kidato cha 1–4",
    language: "Kiswahili & English",
    coverUrl: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=600&q=80",
    openLibraryUrl: "https://archive.org/details/folktalesfromkin00powe",
    readOnlineUrl: "https://archive.org/embed/folktalesfromkin00powe",
    directUrl: "https://archive.org/details/folktalesfromkin00powe/mode/2up",
    downloadPdfUrl: "https://archive.org/download/folktalesfromkin00powe/folktalesfromkin00powe.pdf",
    downloadUrl: "https://archive.org/download/folktalesfromkin00powe",
    identifier: "folktalesfromkin00powe",
    description: "Hadithi na visa vya wanyama na wanadamu vinavyojenga misingi ya lugha, uandishi wa insha na uchambuzi wa fasihi simulizi.",
    pages: 180,
    isFreeOnline: true,
    source: "Internet Archive Folklore"
  },
  {
    id: "bk_tz_bio_01",
    title: "Life: The Science of Biology (Comprehensive Textbook)",
    author: "Sadava, Hillis, Heller & Berenbaum",
    authors: ["David Sadava", "David M. Hillis", "H. Craig Heller"],
    firstPublishYear: 2011,
    subject: "Biology",
    subjects: ["Biology", "Cell Biology", "Ecology", "Genetics", "Human Physiology"],
    level: "Form 1–6",
    language: "English",
    coverUrl: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=600&q=80",
    openLibraryUrl: "https://archive.org/details/LifeTheScienceOfBiology9thEd.",
    readOnlineUrl: "https://archive.org/embed/LifeTheScienceOfBiology9thEd.",
    directUrl: "https://archive.org/details/LifeTheScienceOfBiology9thEd./mode/2up",
    downloadPdfUrl: "https://archive.org/download/LifeTheScienceOfBiology9thEd./LifeTheScienceOfBiology9thEd..pdf",
    downloadUrl: "https://archive.org/download/LifeTheScienceOfBiology9thEd.",
    identifier: "LifeTheScienceOfBiology9thEd.",
    description: "Standard foundational biology textbook with detailed diagrams covering cell biology, plant physiology, animal nutrition, respiration, genetics, and ecology.",
    pages: 1266,
    isFreeOnline: true,
    source: "Internet Archive Open Textbook"
  },
  {
    id: "bk_tz_chem_02",
    title: "General Chemistry: Principles and Modern Applications",
    author: "Petrucci, Herring, Madura & Bissonnette",
    authors: ["Ralph H. Petrucci", "F. Geoffrey Herring"],
    firstPublishYear: 2010,
    subject: "Chemistry",
    subjects: ["Chemistry", "Periodic Table", "Chemical Equations", "Acids & Bases", "Stoichiometry"],
    level: "Form 1–6",
    language: "English",
    coverUrl: "https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?auto=format&fit=crop&w=600&q=80",
    openLibraryUrl: "https://archive.org/details/GeneralChemistryPrinciplesAndModernApplications10thEdition",
    readOnlineUrl: "https://archive.org/embed/GeneralChemistryPrinciplesAndModernApplications10thEdition",
    directUrl: "https://archive.org/details/GeneralChemistryPrinciplesAndModernApplications10thEdition/mode/2up",
    downloadPdfUrl: "https://archive.org/download/GeneralChemistryPrinciplesAndModernApplications10thEdition/GeneralChemistryPrinciplesAndModernApplications10thEdition.pdf",
    downloadUrl: "https://archive.org/download/GeneralChemistryPrinciplesAndModernApplications10thEdition",
    identifier: "GeneralChemistryPrinciplesAndModernApplications10thEdition",
    description: "Clear explanations of atomic structure, chemical bonding, gas laws, thermochemistry, kinetics, equilibrium, and practical laboratory methods.",
    pages: 1420,
    isFreeOnline: true,
    source: "Internet Archive Science Commons"
  },
  {
    id: "bk_tz_phys_03",
    title: "Conceptual Physics: Foundations of Secondary Science",
    author: "Paul G. Hewitt",
    authors: ["Paul G. Hewitt"],
    firstPublishYear: 2014,
    subject: "Physics",
    subjects: ["Physics", "Mechanics", "Optics", "Direct Current", "Wave Motion"],
    level: "Form 1–4",
    language: "English",
    coverUrl: "https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?auto=format&fit=crop&w=600&q=80",
    openLibraryUrl: "https://archive.org/details/conceptualphysics12thedition",
    readOnlineUrl: "https://archive.org/embed/conceptualphysics12thedition",
    directUrl: "https://archive.org/details/conceptualphysics12thedition/mode/2up",
    downloadPdfUrl: "https://archive.org/download/conceptualphysics12thedition/conceptualphysics12thedition.pdf",
    downloadUrl: "https://archive.org/download/conceptualphysics12thedition",
    identifier: "conceptualphysics12thedition",
    description: "Renowned conceptual approach to forces, Newton's laws, momentum, gravity, sound waves, light reflection/refraction, and basic electric circuits.",
    pages: 818,
    isFreeOnline: true,
    source: "Internet Archive Physics Collection"
  },
  {
    id: "bk_tz_math_04",
    title: "Basic Engineering & Secondary Mathematics",
    author: "John Bird",
    authors: ["John Bird"],
    firstPublishYear: 2010,
    subject: "Mathematics",
    subjects: ["Mathematics", "Algebra", "Geometry", "Trigonometry", "Statistics"],
    level: "Form 1–4",
    language: "English",
    coverUrl: "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=600&q=80",
    openLibraryUrl: "https://archive.org/details/BasicEngineeringMathematics5thEdition",
    readOnlineUrl: "https://archive.org/embed/BasicEngineeringMathematics5thEdition",
    directUrl: "https://archive.org/details/BasicEngineeringMathematics5thEdition/mode/2up",
    downloadPdfUrl: "https://archive.org/download/BasicEngineeringMathematics5thEdition/BasicEngineeringMathematics5thEdition.pdf",
    downloadUrl: "https://archive.org/download/BasicEngineeringMathematics5thEdition",
    identifier: "BasicEngineeringMathematics5thEdition",
    description: "Clear step-by-step worked examples covering indices, quadratic equations, linear graphs, simultaneous equations, trigonometry, angles, and probability.",
    pages: 418,
    isFreeOnline: true,
    source: "Internet Archive STEM Series"
  },
  {
    id: "bk_tz_hist_05",
    title: "A History of East Africa and Tanganyika",
    author: "Kenneth Ingham",
    authors: ["Kenneth Ingham"],
    firstPublishYear: 1962,
    subject: "History",
    subjects: ["History", "Tanzania History", "East Africa", "Maji Maji", "Tanganyika"],
    level: "Form 1–4",
    language: "English",
    coverUrl: "https://images.unsplash.com/photo-1461360370896-922624d12aa1?auto=format&fit=crop&w=600&q=80",
    openLibraryUrl: "https://archive.org/details/historyofeastafr0000ingh",
    readOnlineUrl: "https://archive.org/embed/historyofeastafr0000ingh",
    directUrl: "https://archive.org/details/historyofeastafr0000ingh/mode/2up",
    downloadPdfUrl: "https://archive.org/download/historyofeastafr0000ingh/historyofeastafr0000ingh.pdf",
    downloadUrl: "https://archive.org/download/historyofeastafr0000ingh",
    identifier: "historyofeastafr0000ingh",
    description: "Historical timeline of early African civilizations, Indian Ocean trade, European partition, anti-colonial struggles including Maji Maji, up to independence.",
    pages: 472,
    isFreeOnline: true,
    source: "Internet Archive African History"
  },
  {
    id: "bk_tz_geog_06",
    title: "Physical Geography of East Africa & Landforms",
    author: "Alan H. Strahler",
    authors: ["Alan H. Strahler", "Arthur N. Strahler"],
    firstPublishYear: 2002,
    subject: "Geography",
    subjects: ["Geography", "East Africa", "Plate Tectonics", "Rift Valley", "Weather"],
    level: "Form 1–4",
    language: "English",
    coverUrl: "https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=600&q=80",
    openLibraryUrl: "https://archive.org/details/physicalgeograph0000stra",
    readOnlineUrl: "https://archive.org/embed/physicalgeograph0000stra",
    directUrl: "https://archive.org/details/physicalgeograph0000stra/mode/2up",
    downloadPdfUrl: "https://archive.org/download/physicalgeograph0000stra/physicalgeograph0000stra.pdf",
    downloadUrl: "https://archive.org/download/physicalgeograph0000stra",
    identifier: "physicalgeograph0000stra",
    description: "Illustrated study of tectonic plates, Great Rift Valley landforms, tropical climate zones, water cycle, weathering, soils, and sustainable ecosystems.",
    pages: 660,
    isFreeOnline: true,
    source: "Internet Archive Earth Sciences"
  },
  {
    id: "bk_tz_civ_07",
    title: "Constitutional Government, Democracy and Citizenship",
    author: "Frank J. Goodnow",
    authors: ["Frank J. Goodnow"],
    firstPublishYear: 1916,
    subject: "Civics",
    subjects: ["Civics", "Katiba", "Governance", "Democracy", "Rule of Law"],
    level: "Form 1–4",
    language: "English",
    coverUrl: "https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=600&q=80",
    openLibraryUrl: "https://archive.org/details/principlesofcons00good",
    readOnlineUrl: "https://archive.org/embed/principlesofcons00good",
    directUrl: "https://archive.org/details/principlesofcons00good/mode/2up",
    downloadPdfUrl: "https://archive.org/download/principlesofcons00good/principlesofcons00good.pdf",
    downloadUrl: "https://archive.org/download/principlesofcons00good",
    identifier: "principlesofcons00good",
    description: "Comprehensive foundational study on constitutional structures, separation of executive, judicial and legislative powers, and democratic citizen participation.",
    pages: 420,
    isFreeOnline: true,
    source: "Internet Archive Civic Studies"
  }
];

// Endpoint 1: Get Curated Books Collection
app.get(["/api/v1/books/curated", "/api/books/curated"], (req, res) => {
  const subject = ((req.query.subject as string) || "").toLowerCase().trim();
  const language = ((req.query.language as string) || "").toLowerCase().trim();

  let results = [...CURATED_OPEN_BOOKS];
  if (subject && subject !== "all") {
    results = results.filter(b => 
      b.subject.toLowerCase().includes(subject) ||
      b.subjects.some(s => s.toLowerCase().includes(subject))
    );
  }
  if (language && language !== "all") {
    results = results.filter(b => b.language.toLowerCase().includes(language));
  }

  return res.json({
    success: true,
    total: results.length,
    books: results,
    sources: [
      { name: "Internet Archive Digital Texts (20M+ Books)", url: "https://archive.org", free: true },
      { name: "Open Library (Internet Archive)", url: "https://openlibrary.org", free: true },
      { name: "African Storybook & Heritage", url: "https://digitallibrary.io", free: true }
    ]
  });
});

// Helper: Query Internet Archive Advanced Search API for direct full-text books
async function queryInternetArchive(query: string, subject: string, language: string, rows = 24, page = 1) {
  try {
    const parts: string[] = ["mediatype:texts"];
    parts.push("collection:(inlibrary OR openlibrary OR americana OR opensource OR folkscanomy OR additional_collections)");

    if (query) {
      const safeQ = query.replace(/[^\w\s-]/g, " ").trim();
      parts.push(`(${safeQ})`);
    } else if (subject && subject !== "all") {
      if (subject.toLowerCase() === "kiswahili") {
        parts.push("(subject:swahili OR title:swahili OR kiswahili OR zanzibar OR tanganyika)");
      } else {
        parts.push(`(subject:${subject} OR title:${subject})`);
      }
    } else {
      parts.push("(subject:science OR subject:mathematics OR subject:history OR subject:literature OR subject:biology OR subject:physics)");
    }

    if (language && language !== "all") {
      if (language.toLowerCase() === "kiswahili") {
        parts.push("(language:swahili OR language:swa OR subject:swahili OR title:swahili)");
      } else if (language.toLowerCase() === "english") {
        parts.push("(language:english OR language:eng)");
      }
    }

    const iaQuery = parts.join(" AND ");
    const iaUrl = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(iaQuery)}&fl[]=identifier,title,creator,year,description,downloads,subject,language&sort[]=downloads+desc&rows=${rows}&page=${page}&output=json`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const response = await fetch(iaUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "BarakaStudentLibrary/2.0 (tanzania-open-education)" }
    });
    clearTimeout(timeout);

    if (!response.ok) return { books: [], numFound: 0 };
    const data: any = await response.json();
    const docs = data?.response?.docs || [];
    const numFound = data?.response?.numFound || 0;

    const books = docs
      .filter((d: any) => d.identifier && d.title)
      .map((d: any) => {
        const id = d.identifier;
        const author = Array.isArray(d.creator) ? d.creator[0] : (d.creator || "Open Knowledge Contributor");
        const authors = Array.isArray(d.creator) ? d.creator : [author];
        const subs = Array.isArray(d.subject) ? d.subject : (d.subject ? [d.subject] : [subject || "General"]);
        const year = d.year || "Classic Edition";
        
        let bookLang = "English";
        if (d.language) {
          const lStr = Array.isArray(d.language) ? d.language.join(" ") : String(d.language);
          if (/swa|swahili|kiswahili/i.test(lStr)) bookLang = "Kiswahili";
          else if (/eng/i.test(lStr)) bookLang = "English";
          else bookLang = Array.isArray(d.language) ? d.language[0] : d.language;
        }

        const coverUrl = `https://archive.org/services/img/${id}`;
        const readOnlineUrl = `https://archive.org/embed/${id}`;
        const directUrl = `https://archive.org/details/${id}/mode/2up`;

        return {
          id: `ia_${id}`,
          title: d.title,
          author,
          authors,
          firstPublishYear: year,
          subject: subject && subject !== "all" ? subject : (subs[0] || "General"),
          subjects: subs.slice(0, 4),
          level: "Secondary Form 1–6",
          language: bookLang,
          coverUrl,
          openLibraryUrl: `https://archive.org/details/${id}`,
          readOnlineUrl,
          directUrl,
          downloadPdfUrl: `https://archive.org/download/${id}/${id}.pdf`,
          description: d.description 
            ? (Array.isArray(d.description) ? d.description.join(" ") : String(d.description)).slice(0, 300) + "..."
            : `Full text digital volume from the Internet Archive open repository (${d.downloads || "10,000+"} student reads).`,
          pages: 220,
          isFreeOnline: true,
          source: "Internet Archive Digital Library",
          identifier: id
        };
      });

    return { books, numFound };
  } catch (e) {
    console.warn("Internet Archive search error:", e);
    return { books: [], numFound: 0 };
  }
}

// Endpoint 2: Live Search Open Books via Internet Archive & Open Library API (Over 20M+ Books)
app.get(["/api/v1/books/search", "/api/books/search"], async (req, res) => {
  const query = ((req.query.q as string) || "").trim();
  const subject = ((req.query.subject as string) || "").trim();
  const language = ((req.query.language as string) || "").trim();
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Number(req.query.limit) || 24, 48);

  // Filter curated collection first (shown on page 1)
  const curatedMatches = page === 1 ? CURATED_OPEN_BOOKS.filter(b => {
    const qLower = query.toLowerCase();
    const matchesQuery = !query || 
      b.title.toLowerCase().includes(qLower) || 
      b.author.toLowerCase().includes(qLower) ||
      b.description.toLowerCase().includes(qLower) ||
      b.subjects.some(s => s.toLowerCase().includes(qLower));
    const matchesSubject = !subject || subject === "all" || b.subject.toLowerCase() === subject.toLowerCase();
    const matchesLang = !language || language === "all" || b.language.toLowerCase().includes(language.toLowerCase());
    return matchesQuery && matchesSubject && matchesLang;
  }) : [];

  // Query live Internet Archive API (massive index of 20M+ texts)
  const iaResult = await queryInternetArchive(query, subject, language, limit, page);

  // Also query Open Library if needed to supplement
  let openLibBooks: any[] = [];
  if (iaResult.books.length < limit) {
    try {
      const searchParams = new URLSearchParams();
      if (query) searchParams.set("q", query);
      else if (subject && subject !== "all") searchParams.set("subject", subject);
      else searchParams.set("q", "science OR mathematics OR history");
      if (language && language !== "all") {
        searchParams.set("language", language === "kiswahili" ? "swa" : language === "english" ? "eng" : language);
      }
      searchParams.set("limit", String(limit));
      searchParams.set("page", String(page));

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const openLibUrl = `https://openlibrary.org/search.json?${searchParams.toString()}`;
      const response = await fetch(openLibUrl, {
        signal: controller.signal,
        headers: { "User-Agent": "BarakaStudentLibrary/2.0 (tanzania-open-education)" }
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data: any = await response.json();
        const docs: any[] = data.docs || [];
        openLibBooks = docs.map((doc, idx) => {
          const docKey = doc.key || `/works/OL${idx}`;
          const authorList = doc.author_name || ["Unknown Author"];
          const iaKey = doc.ia && doc.ia[0];
          const readOnlineUrl = iaKey 
            ? `https://archive.org/embed/${iaKey}`
            : `https://archive.org/embed/${doc.cover_edition_key || docKey.split('/').pop()}`;
          const directUrl = iaKey
            ? `https://archive.org/details/${iaKey}/mode/2up`
            : `https://openlibrary.org${docKey}`;
          const coverUrl = doc.cover_i 
            ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
            : (iaKey ? `https://archive.org/services/img/${iaKey}` : "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80");

          const downloadPdfUrl = iaKey ? `https://archive.org/download/${iaKey}/${iaKey}.pdf` : undefined;
          const downloadUrl = iaKey ? `https://archive.org/download/${iaKey}` : `https://openlibrary.org${docKey}`;

          return {
            id: `ol_${docKey.replace(/\W/g, '_')}`,
            title: doc.title,
            author: authorList[0],
            authors: authorList,
            firstPublishYear: doc.first_publish_year || (doc.publish_year && doc.publish_year[0]) || "N/A",
            subject: subject && subject !== "all" ? subject : (doc.subject?.[0] || "General"),
            subjects: (doc.subject || []).slice(0, 4),
            level: "Secondary Form 1–6",
            language: doc.language?.includes("swa") ? "Kiswahili" : "English",
            coverUrl,
            openLibraryUrl: `https://openlibrary.org${docKey}`,
            readOnlineUrl,
            directUrl,
            downloadPdfUrl,
            downloadUrl,
            description: `Digitized edition from the Open Library repository. Available for free open reading.`,
            pages: doc.number_of_pages_median || 200,
            isFreeOnline: true,
            source: "Open Library (Internet Archive)",
            identifier: iaKey
          };
        });
      }
    } catch (err) {
      // ignore
    }
  }

  // Deduplicate and combine
  const combined = [...curatedMatches];
  const seenTitles = new Set(combined.map(b => b.title.toLowerCase().trim()));

  for (const b of iaResult.books) {
    const key = b.title.toLowerCase().trim();
    if (!seenTitles.has(key)) {
      seenTitles.add(key);
      combined.push(b);
    }
  }

  for (const b of openLibBooks) {
    const key = b.title.toLowerCase().trim();
    if (!seenTitles.has(key)) {
      seenTitles.add(key);
      combined.push(b);
    }
  }

  const totalEstimate = (iaResult.numFound > 0 ? iaResult.numFound : 25000) + CURATED_OPEN_BOOKS.length;

  return res.json({
    success: true,
    query,
    page,
    limit,
    total: combined.length,
    totalAvailable: totalEstimate,
    hasMore: combined.length >= limit || iaResult.numFound > page * limit,
    books: combined,
    source: "Internet Archive & Open Library (20M+ Free Books)"
  });
});

// Endpoint 2.5: Direct Download Resolver for Open Books
app.get(["/api/v1/books/download", "/api/books/download"], (req, res) => {
  const targetUrl = (req.query.url as string || "").trim();
  const id = (req.query.id as string || "").trim();
  const rawTitle = (req.query.title as string || "Baraka_Open_Textbook").trim();
  const cleanTitle = rawTitle.replace(/[^a-zA-Z0-9_\-\s]/g, "").replace(/\s+/g, "_").slice(0, 50);

  let destination = targetUrl;
  if (!destination && id) {
    destination = `https://archive.org/download/${id}/${id}.pdf`;
  }
  if (!destination) {
    return res.status(400).json({ success: false, error: "Missing download URL or identifier" });
  }

  res.setHeader("Content-Disposition", `attachment; filename="${cleanTitle}.pdf"`);
  return res.redirect(destination);
});

// Endpoint 3: Import an Open Book into Student Study Materials
app.post(["/api/v1/books/import-to-library", "/api/books/import-to-library"], async (req, res) => {
  const { title, author, subject, coverUrl, description, readUrl, language, level, classes } = req.body || {};
  if (!title) {
    return res.status(400).json({ success: false, error: "Book title is required." });
  }

  const newMaterialId = `mat_book_${Date.now()}`;
  const importedMaterial = {
    id: newMaterialId,
    title: title.trim(),
    subject: subject || "Literature & Reading",
    classes: classes || level || "All Forms",
    form_num: 1,
    category: "Open Book",
    uploadedAt: "Today",
    templateType: "notes",
    rawText: `${title}\nBy ${author || "Open Library"}\n\nDescription: ${description || "Free open-source educational reader."}\n\nRead online: ${readUrl || ""}`,
    visibility: "public",
    uploadedBy: "Open Digital Library",
    isTeacherUpload: false,
    arrangedContent: {
      summary: description || `Digital study textbook "${title}" by ${author || "Open Education Resources"}. Available for open reading and AI revision.`,
      keyPoints: [
        `Official open educational material added to your study shelf.`,
        `Author: ${author || "Open Educational Contributor"} (${language || "English / Kiswahili"}).`,
        `Study Level: ${classes || level || "Secondary Form 1–4"}.`,
        `Read online at: ${readUrl || "Open Library"}`
      ],
      definitions: [
        { term: "Digital Reader", definition: "A curriculum-aligned digital textbook or storybook accessible for online reading." },
        { term: "Open Educational Resource (OER)", definition: "Learning materials licensed under open licenses for free public educational use." }
      ]
    },
    quizQuestions: [
      {
        question: `What is the primary subject of the book "${title}"?`,
        options: [subject || "General Studies", "Automotive Repair", "Advanced Astrophysics", "Ancient Numismatics"],
        correctIndex: 0,
        explanation: `This book is categorized under ${subject || "General Studies"} for secondary learners.`
      },
      {
        question: `Who is the author or compiler of "${title}"?`,
        options: [author || "Open Education Resources", "Anonymous", "Unknown Entity", "Private Collector"],
        correctIndex: 0,
        explanation: `The book was written/compiled by ${author || "Open Education Resources"}.`
      }
    ]
  };

  serverDB.materials.unshift(importedMaterial);
  saveServerDB();

  return res.status(201).json({
    success: true,
    message: `Book "${title}" imported into your study library successfully!`,
    material: importedMaterial
  });
});

// --- TIMETABLE ENDPOINTS ---
app.get(["/api/v1/timetable", "/api/timetable", "/api/v1/timetable/sessions", "/api/timetable/sessions"], async (req, res) => {
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

// --- QUIZZES RESULTS (Registered before :id to prevent collision) ---
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
      const gen = await callGeminiContentWithFailover(
        client,
        {
          contents: prompt,
          config: { responseMimeType: "application/json" }
        },
        12000
      );
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
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.page_size as string) || 20));
  const region = (req.query.region as string || "").trim().toLowerCase();
  const verificationStatus = (req.query.verification_status as string || "").trim().toLowerCase();
  const query = (req.query.q as string || "").trim().toLowerCase();

  // Try remote backend first
  const searchParams = new URLSearchParams();
  if (req.query.page) searchParams.set("page", String(page));
  if (req.query.page_size) searchParams.set("page_size", String(pageSize));
  if (region) searchParams.set("region", req.query.region as string);
  if (verificationStatus) searchParams.set("verification_status", req.query.verification_status as string);
  if (query) searchParams.set("q", req.query.q as string);

  const remoteResult = await tryRemoteApiFull(`/schools${searchParams.toString() ? `?${searchParams.toString()}` : ""}`, {
    method: "GET",
    headers: { ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) }
  });
  if (remoteResult && remoteResult.data && remoteResult.status === 200) {
    return res.status(200).json(remoteResult.data);
  }

  // Fallback in serverDB
  let schools = serverDB.schools.length > 0 ? serverDB.schools : [serverDB.school];
  if (region) {
    schools = schools.filter(s => (s.region || "").toLowerCase().includes(region));
  }
  if (verificationStatus) {
    schools = schools.filter(s => ((s as any).verification_status || "verified").toLowerCase() === verificationStatus);
  }
  if (query) {
    schools = schools.filter(s => 
      (s.name || "").toLowerCase().includes(query) ||
      (s.region || "").toLowerCase().includes(query) ||
      (s.registration_number || "").toLowerCase().includes(query)
    );
  }

  const startIndex = (page - 1) * pageSize;
  const paginated = schools.slice(startIndex, startIndex + pageSize);

  return res.json({
    success: "true",
    code: 0,
    message: "Schools retrieved successfully",
    schools: paginated,
    pagination: {
      page,
      page_size: pageSize,
      total: schools.length,
      total_pages: Math.ceil(schools.length / pageSize) || 1
    }
  });
});

app.get(["/api/v1/schools/:id", "/api/schools/:id"], async (req, res) => {
  const { id } = req.params;

  // Try remote backend first
  const remoteResult = await tryRemoteApiFull(`/schools/${id}`, {
    method: "GET",
    headers: { ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) }
  });
  if (remoteResult && remoteResult.data && remoteResult.status === 200) {
    return res.status(200).json(remoteResult.data);
  }

  // Fallback in serverDB
  const school = serverDB.schools.find(s => s.id === id || (s.name && s.name.toLowerCase() === id.toLowerCase())) ||
    (id === "me" || id === (serverDB.school as any).id ? serverDB.school : null);

  if (school) {
    return res.json(school);
  }
  return res.status(404).json({ detail: "School not found" });
});

app.put(["/api/v1/schools/:id", "/api/schools/:id"], async (req, res) => {
  const { id } = req.params;
  const body = req.body || {};

  // Try remote backend first
  const remoteResult = await tryRemoteApiFull(`/schools/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) },
    body: JSON.stringify(body)
  });
  if (remoteResult && remoteResult.data && remoteResult.status === 200) {
    return res.status(200).json(remoteResult.data);
  }

  // Fallback in serverDB
  const idx = serverDB.schools.findIndex(s => s.id === id || (s.name && s.name.toLowerCase() === id.toLowerCase()));
  if (idx >= 0) {
    serverDB.schools[idx] = { ...serverDB.schools[idx], ...body };
    if (serverDB.school && (serverDB.school as any).id === id) {
      serverDB.school = { ...serverDB.school, ...body };
    }
    saveServerDB();
    return res.json(serverDB.schools[idx]);
  }

  return res.json({ id, ...body });
});

app.delete(["/api/v1/schools/:id", "/api/schools/:id"], async (req, res) => {
  const { id } = req.params;

  // Try remote backend first
  const remoteResult = await tryRemoteApiFull(`/schools/${id}`, {
    method: "DELETE",
    headers: { ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) }
  });
  if (remoteResult && (remoteResult.status === 200 || remoteResult.status === 204)) {
    return res.status(remoteResult.status).send(remoteResult.data || null);
  }

  // Fallback in serverDB
  serverDB.schools = serverDB.schools.filter(s => s.id !== id && (!s.name || s.name.toLowerCase() !== id.toLowerCase()));
  saveServerDB();
  return res.status(204).send();
});

app.post(["/api/v1/schools/:id/verify", "/api/schools/:id/verify"], async (req, res) => {
  const { id } = req.params;
  const status = req.body?.status || "verified";

  // Try remote backend first
  const remoteResult = await tryRemoteApiFull(`/schools/${id}/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(req.headers["authorization"] ? { "Authorization": req.headers["authorization"] as string } : {}) },
    body: JSON.stringify({ status })
  });
  if (remoteResult && remoteResult.data && remoteResult.status === 200) {
    return res.status(200).json(remoteResult.data);
  }

  // Fallback in serverDB
  const school = serverDB.schools.find(s => s.id === id || (s.name && s.name.toLowerCase() === id.toLowerCase()));
  if (school) {
    (school as any).verification_status = status;
    saveServerDB();
    return res.json(school);
  }

  return res.json({ id, verification_status: status });
});

app.post(["/api/v1/schools", "/api/schools"], async (req, res) => {
  const { name, region, school_type, registration_number, email } = req.body || {};
  const cleanName = (name || "").trim();
  if (!cleanName) {
    return res.status(400).json({ success: false, error: "School name is required." });
  }

  let existing = serverDB.schools.find(s => (s.name || "").toLowerCase() === cleanName.toLowerCase());
  if (existing) {
    if (region) existing.region = region;
    if (school_type) existing.school_type = school_type;
    if (registration_number) existing.registration_number = registration_number;
    if (email) existing.email = email;
  } else {
    existing = {
      id: `sch_${Date.now()}`,
      name: cleanName,
      region: region || "Dar es Salaam",
      school_type: school_type || "Secondary",
      registration_number: registration_number || generateSchoolRegNo(cleanName, serverDB.schools.length + 1),
      email: email || "",
      verification_status: "verified"
    };
    serverDB.schools.push(existing);
  }

  saveServerDB();
  return res.status(201).json({ success: true, school: existing, message: "School registered successfully in database." });
});

// --- ENDPOINTS CATALOG & HEALTH CHECK ---
const ALL_REGISTERED_ENDPOINTS = [
  { path: "/api/v1/health", methods: ["GET"], tag: "System", summary: "Health check endpoint" },
  { path: "/api/v1/endpoints", methods: ["GET"], tag: "System", summary: "Interactive catalogue of all available API endpoints" },
  { path: "/api/v1/auth/login", methods: ["POST"], tag: "Authentication", summary: "User login with email and password" },
  { path: "/api/v1/auth/register", methods: ["POST"], tag: "Authentication", summary: "General / student registration" },
  { path: "/api/v1/auth/register/student", methods: ["POST"], tag: "Authentication", summary: "Dedicated student registration with school assignment" },
  { path: "/api/v1/auth/register/school", methods: ["POST"], tag: "Authentication", summary: "School registration with verification documents" },
  { path: "/api/v1/auth/register/solo", methods: ["POST"], tag: "Authentication", summary: "Independent solo learner registration" },
  { path: "/api/v1/auth/me", methods: ["GET"], tag: "Authentication", summary: "Get current authenticated user profile and enrolled school" },
  { path: "/api/v1/student/profile", methods: ["GET", "POST", "PUT"], tag: "Students", summary: "Fetch or update student profile details including school institution" },
  { path: "/api/v1/schools", methods: ["GET", "POST"], tag: "Schools", summary: "Directory of partner and registered schools" },
  { path: "/api/v1/auth/url", methods: ["GET"], tag: "Authentication", summary: "Google OAuth consent URL" },
  { path: "/api/v1/auth/otp/send-otp", methods: ["POST"], tag: "Authentication", summary: "Dispatch live SMS verification code to mobile number" },
  { path: "/api/v1/auth/send-sms-code", methods: ["POST"], tag: "Authentication", summary: "Request 6-digit SMS verification code for registration" },
  { path: "/api/v1/verify-phone", methods: ["POST"], tag: "Authentication", summary: "Verify phone number using SMS code" },
  { path: "/api/v1/auth/verify-sms-code", methods: ["POST"], tag: "Authentication", summary: "Validate SMS OTP and approve verification" },
  { path: "/api/v1/resend-otp", methods: ["POST"], tag: "Authentication", summary: "Resend verification code via SMS" },
  { path: "/api/v1/send-verification-email", methods: ["POST"], tag: "Authentication", summary: "Send 6-digit verification code email" },
  { path: "/api/v1/ai/ask", methods: ["POST"], tag: "AI Companion", summary: "Ask Baraka educational AI assistant" },
  { path: "/api/v1/arrange-material", methods: ["POST"], tag: "AI Companion", summary: "AI arrangement of study notes and quiz generation" },
  { path: "/api/v1/students", methods: ["GET", "POST"], tag: "Students", summary: "List or register students" },
  { path: "/api/v1/students/import", methods: ["POST"], tag: "Students", summary: "Bulk-create students and enroll into class via CSV/XLSX with optional OTP SMS" },
  { path: "/api/v1/students/import/template", methods: ["GET"], tag: "Students", summary: "Download sample CSV/XLSX template for bulk student import" },
  { path: "/api/v1/students/export", methods: ["GET"], tag: "Students", summary: "Export students list as CSV or XLSX with class and form filters" },
  { path: "/api/v1/students/:id", methods: ["GET", "PUT", "DELETE"], tag: "Students", summary: "View, update, or remove student" },
  { path: "/api/v1/teachers", methods: ["GET", "POST"], tag: "Teachers", summary: "List or register teachers" },
  { path: "/api/v1/teachers/:id", methods: ["GET", "PUT", "DELETE"], tag: "Teachers", summary: "View, update, or remove teacher" },
  { path: "/api/v1/classes", methods: ["GET", "POST"], tag: "Classes", summary: "List or create classes" },
  { path: "/api/v1/classes/:id", methods: ["GET", "PUT", "DELETE"], tag: "Classes", summary: "View, update, or remove class" },
  { path: "/api/v1/classes/:id/students", methods: ["GET", "POST"], tag: "Classes", summary: "List students enrolled in class or enroll a single student" },
  { path: "/api/v1/classes/:id/students/bulk", methods: ["POST"], tag: "Classes", summary: "Bulk enroll multiple students into a class" },
  { path: "/api/v1/classes/:id/students/:student_id", methods: ["DELETE"], tag: "Classes", summary: "Unenroll / remove a student from a class" },
  { path: "/api/v1/classes/:id/assign-teacher", methods: ["POST"], tag: "Classes", summary: "Assign a teacher as class master" },
  { path: "/api/v1/materials", methods: ["GET", "POST"], tag: "Materials", summary: "List or upload learning materials" },
  { path: "/api/v1/materials/:id", methods: ["GET", "PUT", "DELETE"], tag: "Materials", summary: "View, update, or remove material" },
  { path: "/api/v1/books/curated", methods: ["GET"], tag: "Digital Library", summary: "Fetch curated Tanzanian Kiswahili readers, NECTA STEM textbooks and OER books" },
  { path: "/api/v1/books/search", methods: ["GET"], tag: "Digital Library", summary: "Live search free open digital books from Open Library & Internet Archive" },
  { path: "/api/v1/books/import-to-library", methods: ["POST"], tag: "Digital Library", summary: "Import an open digital book directly into personal student study shelf" },
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

    const response: any = await callGeminiContentWithFailover(
      client,
      { contents: promptContext },
      6000
    );

    const replyText = response.text || "Samahani, I couldn't generate a response. Please try again.";
    return res.json({
      text: replyText,
      source: "gemini",
      knowledge_sources: defaultSources
    });
  } catch (error: any) {
    console.log("[Baraka Chat] Served response using offline knowledge simulation fallback");
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

// Ready-to-push Git Zip Download Endpoint
app.get([
  "/api/download-zip",
  "/api/v1/download-zip",
  "/download/project.zip",
  "/download-zip"
], (req, res) => {
  const zipFile = path.join(process.cwd(), "public/tbf_school_hub_production.zip");
  if (fs.existsSync(zipFile)) {
    return res.download(zipFile, "tbf_school_hub_production.zip");
  }
  return res.status(404).json({ error: "Zip archive not found." });
});

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

// (Note: Unified SMS OTP dispatch and verification endpoints are defined in the central verification subsystem)

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
  discussionMessages: [],
  sharedDocuments: [],
  assignments: []
};

const liveSseClients: any[] = [];

app.get(["/api/v1/live-session", "/api/live-session"], (req, res) => {
  res.json(currentLiveSession);
});

app.post(["/api/v1/live-session", "/api/live-session"], (req, res) => {
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

app.get(["/api/v1/live-session/stream", "/api/live-session/stream"], (req, res) => {
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

      const response: any = await callGeminiContentWithFailover(
        client,
        {
          contents: prompt,
          config: {
            responseMimeType: "application/json"
          }
        },
        10000
      );

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
  const targetPath = req.url || req.path;
  if (req.path === "/health" || req.path === "/status") {
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
