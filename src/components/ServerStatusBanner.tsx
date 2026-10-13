import React, { useState, useEffect } from "react";
import { systemService } from "../lib/api";
import { HealthResponse } from "../types/api";
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw, Server } from "lucide-react";

export const ServerStatusBanner: React.FC = () => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [isError, setIsError] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const checkHealth = async () => {
    setIsLoading(true);
    try {
      const res = await systemService.getHealth();
      setHealth(res);
      setIsError(res?.status !== "ok");
    } catch {
      setIsError(true);
      setHealth(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 45000); // Check every 45s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2">
      {/* Floating or embedded status pill */}
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold transition-all ${
          isLoading
            ? "bg-slate-100 text-slate-600 border border-slate-200"
            : isError
            ? "bg-rose-50 text-rose-700 border border-rose-200"
            : "bg-emerald-50 text-emerald-800 border border-emerald-200"
        }`}
        title={
          health
            ? `Service: ${health.service} · Database: ${health.database} (${health.status})`
            : "API Unreachable"
        }
      >
        <span
          className={`w-2 h-2 rounded-full ${
            isLoading
              ? "bg-slate-400 animate-pulse"
              : isError
              ? "bg-rose-500 animate-ping"
              : "bg-emerald-500"
          }`}
        />
        <span className="hidden sm:inline">
          {isLoading
            ? "Checking API..."
            : isError
            ? "API Offline"
            : `API Online (${health?.database || "DB Ready"})`}
        </span>
        <button
          onClick={checkHealth}
          className="hover:opacity-75 cursor-pointer ml-0.5"
          title="Refresh server health status"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* If API is down, show a clear warning banner */}
      {isError && (
        <div className="fixed bottom-4 right-4 z-50 bg-rose-950 text-white p-4 rounded-2xl shadow-2xl border border-rose-800 max-w-sm flex items-start gap-3 animate-slide-up">
          <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-rose-200">Backend API Unreachable</h4>
            <p className="text-[11px] text-rose-300">
              Cannot reach the Baraka School Hub API at https://schubapi.thebarakafoundation.or.tz. Please verify your connection.
            </p>
            <button
              onClick={checkHealth}
              className="mt-2 text-[10px] bg-rose-800 hover:bg-rose-700 text-white font-bold px-3 py-1 rounded-lg cursor-pointer transition-all"
            >
              Retry Connection
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
