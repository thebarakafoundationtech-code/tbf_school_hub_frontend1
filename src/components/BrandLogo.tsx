import React from "react";
import { FaGraduationCap } from "react-icons/fa6";

interface BrandLogoProps {
  className?: string;
  size?: number | "sm" | "md" | "lg";
}

export default function BrandLogo({ className = "", size = 36 }: BrandLogoProps) {
  const numericSize =
    typeof size === "number"
      ? size
      : size === "sm"
      ? 32
      : size === "lg"
      ? 48
      : 40;
  const iconSize = Math.max(16, Math.round(numericSize * 0.6));

  return (
    <div
      style={{ width: `${numericSize}px`, height: `${numericSize}px` }}
      className={`relative inline-flex items-center justify-center rounded-2xl bg-gradient-to-br from-[#15223F] via-[#1E293B] to-[#0E1729] text-[#D69B67] shadow-md border border-white/15 select-none ${className}`}
    >
      <FaGraduationCap style={{ fontSize: `${iconSize}px` }} className="text-[#D69B67] drop-shadow-xs" />
      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[#D69B67] rounded-full ring-2 ring-white" />
    </div>
  );
}

