import React, { useState } from "react";
import {
  systemService,
  authService,
  schoolService,
  classService,
  userService,
  discussionService,
  aiService,
  importExportService,
  API_BASE_URL,
  getStoredToken,
} from "../lib/api";
import { Play, CheckCircle2, XCircle, Loader2, KeyRound, Server, AlertCircle } from "lucide-react";

interface EndpointTest {
  id: string;
  category: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  description: string;
  requiresAuth: boolean;
  action: () => Promise<any>;
}

export const ApiDebugPage: React.FC = () => {
  const [results, setResults] = useState<Record<string, { status: "loading" | "success" | "error"; code?: number; data?: any; duration?: number }>>({});
  const [runningAll, setRunningAll] = useState(false);
  const token = getStoredToken();

  const endpoints: EndpointTest[] = [
    // System
    {
      id: "root",
      category: "System",
      method: "GET",
      path: "/",
      description: "API online root check",
      requiresAuth: false,
      action: () => systemService.getRoot(),
    },
    {
      id: "health",
      category: "System",
      method: "GET",
      path: "/api/v1/health",
      description: "Detailed system health & database check",
      requiresAuth: false,
      action: () => systemService.getHealth(),
    },

    // Auth
    {
      id: "oauth_url",
      category: "Auth",
      method: "GET",
      path: "/api/v1/auth/url",
      description: "Fetch Google OAuth redirect URL",
      requiresAuth: false,
      action: () => authService.getGoogleOAuthUrl(),
    },
    {
      id: "auth_me",
      category: "Auth",
      method: "GET",
      path: "/api/v1/auth/me",
      description: "Current authenticated session details",
      requiresAuth: true,
      action: () => authService.getMe(),
    },

    // Schools
    {
      id: "schools_list",
      category: "Schools",
      method: "GET",
      path: "/api/v1/schools?page=1&page_size=10",
      description: "List registered schools with pagination",
      requiresAuth: false,
      action: () => schoolService.listSchools({ page: 1, page_size: 10 }),
    },

    // Classes
    {
      id: "classes_list",
      category: "Classes",
      method: "GET",
      path: "/api/v1/classes",
      description: "List school classes",
      requiresAuth: true,
      action: () => classService.listClasses(),
    },

    // Students
    {
      id: "students_list",
      category: "Students",
      method: "GET",
      path: "/api/v1/students?page=1&page_size=10",
      description: "List students (Admin only)",
      requiresAuth: true,
      action: () => userService.listStudents(1, 10),
    },
    {
      id: "import_template",
      category: "Students",
      method: "GET",
      path: "/api/v1/students/import/template?format=csv",
      description: "Download CSV student import template",
      requiresAuth: false,
      action: async () => {
        const blob = await importExportService.downloadTemplate("csv");
        return { size: blob.size, type: blob.type, note: "Successfully received blob binary" };
      },
    },

    // Discussions
    {
      id: "discussions_create",
      category: "Discussions",
      method: "POST",
      path: "/api/v1/discussions",
      description: "Post a discussion message",
      requiresAuth: true,
      action: () => discussionService.createThread({ content: "API Debug Verification Thread 🚀" }),
    },

    // AI
    {
      id: "ask_baraka",
      category: "AI",
      method: "POST",
      path: "/api/v1/ask-baraka",
      description: "Prompt Baraka AI chat model",
      requiresAuth: false,
      action: () => aiService.askBaraka({ message: "Hello Baraka, explain NECTA syllabus alignment." }),
    },
    {
      id: "arrange_material",
      category: "AI",
      method: "POST",
      path: "/api/v1/arrange-material",
      description: "AI Curriculum Notes & Quiz generation",
      requiresAuth: true,
      action: () =>
        aiService.arrangeMaterial({
          title: "Introduction to Biology",
          subject: "Biology",
          templateType: "notes",
          rawText: "Cell theory states that all living organisms are composed of cells and cells are the basic unit of life.",
        }),
    },
  ];

  const runTest = async (test: EndpointTest) => {
    setResults((prev) => ({
      ...prev,
      [test.id]: { status: "loading" },
    }));

    const startTime = Date.now();
    try {
      const res = await test.action();
      const duration = Date.now() - startTime;
      setResults((prev) => ({
        ...prev,
        [test.id]: { status: "success", code: res?.code || 200, data: res, duration },
      }));
    } catch (err: any) {
      const duration = Date.now() - startTime;
      setResults((prev) => ({
        ...prev,
        [test.id]: {
          status: "error",
          code: err?.status || err?.code || 500,
          data: { error: err.message, details: err?.raw || err?.fieldErrors },
          duration,
        },
      }));
    }
  };

  const runAll = async () => {
    setRunningAll(true);
    for (const test of endpoints) {
      await runTest(test);
    }
    setRunningAll(false);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-8 space-y-6 animate-fade-in text-left">
      {/* Header Banner */}
      <div className="bg-[#15223F] text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-[#D69B67]" />
            <span className="text-xs font-mono text-[#D69B67] uppercase tracking-wider font-bold">
              API Live Diagnostics & Verification Suite
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold">Backend Endpoint Inspector</h2>
          <p className="text-xs text-gray-300 font-mono">
            Target Host: <span className="text-emerald-400 font-bold">{API_BASE_URL}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={runAll}
            disabled={runningAll}
            className="px-5 py-2.5 bg-[#D69B67] hover:bg-[#c48753] text-[#15223F] font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {runningAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
            <span>Run All Tests</span>
          </button>
        </div>
      </div>

      {/* Auth Status Notification */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-slate-500" />
          <span className="text-slate-600 font-medium">Session Token:</span>
          {token ? (
            <span className="font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
              Present ({token.substring(0, 16)}...)
            </span>
          ) : (
            <span className="font-mono bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold">
              None (Unauthenticated - Login first to test protected endpoints)
            </span>
          )}
        </div>
        {!token && (
          <a
            href="/login"
            className="text-[#D69B67] font-bold hover:underline flex items-center gap-1"
          >
            Go to Login <AlertCircle className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      {/* Endpoint Tests Grid */}
      <div className="space-y-4">
        {endpoints.map((test) => {
          const res = results[test.id];
          return (
            <div
              key={test.id}
              className="bg-white rounded-2xl border border-gray-100 hover:border-[#D69B67]/40 p-4 sm:p-5 shadow-xs transition-all space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                        test.method === "GET"
                          ? "bg-sky-100 text-sky-800"
                          : test.method === "POST"
                          ? "bg-emerald-100 text-emerald-800"
                          : test.method === "PUT"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {test.method}
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-800">{test.path}</span>
                    <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                      {test.category}
                    </span>
                    {test.requiresAuth && (
                      <span className="text-[10px] font-mono bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                        <KeyRound className="w-2.5 h-2.5" /> Auth Required
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{test.description}</p>
                </div>

                <div className="flex items-center gap-3">
                  {res && (
                    <div className="flex items-center gap-1.5 text-xs font-mono">
                      {res.status === "loading" && (
                        <span className="text-gray-400 flex items-center gap-1">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Calling...
                        </span>
                      )}
                      {res.status === "success" && (
                        <span className="text-emerald-600 font-bold flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-md">
                          <CheckCircle2 className="w-3.5 h-3.5" /> HTTP {res.code} ({res.duration}ms)
                        </span>
                      )}
                      {res.status === "error" && (
                        <span className="text-rose-600 font-bold flex items-center gap-1 bg-rose-50 px-2 py-1 rounded-md">
                          <XCircle className="w-3.5 h-3.5" /> HTTP {res.code} ({res.duration}ms)
                        </span>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => runTest(test)}
                    disabled={res?.status === "loading"}
                    className="px-3.5 py-1.5 bg-[#FAF6EE] hover:bg-amber-100/60 text-[#15223F] border border-[#15223F]/15 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {res?.status === "loading" ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Play className="w-3 h-3 fill-current" />
                    )}
                    <span>Test</span>
                  </button>
                </div>
              </div>

              {/* Response Viewer */}
              {res && res.status !== "loading" && (
                <div className="bg-slate-950 text-slate-200 rounded-xl p-3 font-mono text-[11px] overflow-x-auto max-h-60 border border-slate-800">
                  <div className="text-[10px] text-slate-400 mb-1 flex items-center justify-between border-b border-slate-800 pb-1">
                    <span>Response Payload</span>
                    <span>{res.duration}ms elapsed</span>
                  </div>
                  <pre className="whitespace-pre-wrap">{JSON.stringify(res.data, null, 2)}</pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
