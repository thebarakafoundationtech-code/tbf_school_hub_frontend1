import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { isAuthenticated, isLoading, role } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF6EE] flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-10 h-10 border-3 border-[#15223F] border-t-transparent rounded-full animate-spin"></div>
        <p className="font-serif font-bold text-[#15223F] text-sm tracking-wide">
          Verifying session with Baraka School Hub API...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = role ? role.toLowerCase() : "";
    const hasRole = allowedRoles.some((r) => r.toLowerCase() === userRole);
    if (!hasRole) {
      return (
        <div className="min-h-screen bg-[#FAF6EE] flex flex-col items-center justify-center p-6 text-center space-y-4">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center text-2xl font-bold">
            403
          </div>
          <h2 className="text-xl font-bold text-slate-800">You do not have permission</h2>
          <p className="text-sm text-gray-500 max-w-md">
            Your role (<span className="font-mono font-bold">{userRole || "unknown"}</span>) does not have access to this page.
          </p>
          <a
            href="/dashboard"
            className="px-5 py-2.5 bg-[#15223F] text-white text-xs font-bold rounded-xl hover:bg-[#0E1729] transition-all"
          >
            Return to Dashboard
          </a>
        </div>
      );
    }
  }

  return <>{children}</>;
};
