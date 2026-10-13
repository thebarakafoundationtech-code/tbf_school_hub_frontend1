import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import BrandLogo from "./BrandLogo";
import { ServerStatusBanner } from "./ServerStatusBanner";
import {
  LayoutDashboard,
  School,
  GraduationCap,
  Users,
  MessageSquare,
  Sparkles,
  BookOpen,
  FileSpreadsheet,
  Terminal,
  LogOut,
  User,
  Menu,
  X,
  Shield,
} from "lucide-react";

export const AppNavbar: React.FC = () => {
  const { user, role, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navLinks = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["student", "teacher", "admin", "school_admin"] },
    { to: "/schools", label: "Schools", icon: School, roles: ["admin", "teacher", "school_admin"] },
    { to: "/classes", label: "Classes", icon: GraduationCap, roles: ["admin", "teacher", "school_admin"] },
    { to: "/students", label: "Students", icon: Users, roles: ["admin"] },
    { to: "/students/import-export", label: "Import / Export", icon: FileSpreadsheet, roles: ["admin", "teacher", "school_admin"] },
    { to: "/discussions", label: "Discussions", icon: MessageSquare, roles: ["student", "teacher", "admin", "school_admin"] },
    { to: "/ask-baraka", label: "Ask Baraka", icon: Sparkles, roles: ["student", "teacher", "admin", "school_admin"] },
    { to: "/arrange-material", label: "AI Study Notes", icon: BookOpen, roles: ["student", "teacher", "admin", "school_admin"] },
    { to: "/debug", label: "API Debug", icon: Terminal, roles: ["student", "teacher", "admin", "school_admin"] },
  ];

  const userRole = role ? role.toLowerCase() : "guest";
  const filteredLinks = navLinks.filter((l) => !isAuthenticated || l.roles.includes(userRole));

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-2xs text-left">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Server Status */}
          <div className="flex items-center gap-4">
            <Link to={isAuthenticated ? "/dashboard" : "/"} className="flex items-center gap-2">
              <BrandLogo size="sm" />
            </Link>
            <ServerStatusBanner />
          </div>

          {/* Desktop Navigation */}
          {isAuthenticated && (
            <nav className="hidden lg:flex items-center gap-1">
              {filteredLinks.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? "bg-[#15223F] text-[#D69B67] shadow-xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-[#FAF6EE]"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Right Header Actions */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                {/* User Role Badge */}
                <span className="hidden sm:inline-flex items-center gap-1 bg-[#FAF6EE] text-[#15223F] border border-[#15223F]/10 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold uppercase">
                  <Shield className="w-3 h-3 text-[#D69B67]" />
                  {role || "User"}
                </span>

                {/* User Name */}
                <div className="hidden md:flex flex-col text-right">
                  <span className="text-xs font-bold text-slate-800 leading-tight">
                    {user?.fname} {user?.lname}
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono leading-tight">{user?.email}</span>
                </div>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  title="Sign out of Baraka School Hub"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-2 bg-[#15223F] text-[#D69B67] hover:bg-[#0E1729] rounded-xl text-xs font-bold transition-all shadow-xs"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="hidden sm:inline-block px-4 py-2 bg-[#D69B67] text-[#15223F] hover:bg-[#c48753] rounded-xl text-xs font-bold transition-all shadow-xs"
                >
                  Register
                </Link>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            {isAuthenticated && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && isAuthenticated && (
        <div className="lg:hidden bg-white border-b border-gray-100 px-4 pt-2 pb-4 space-y-1 animate-slide-up">
          {filteredLinks.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold ${
                  isActive ? "bg-[#15223F] text-[#D69B67]" : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
};
