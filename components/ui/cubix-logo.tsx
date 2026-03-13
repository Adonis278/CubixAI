"use client";

import { cn } from "@/lib/utils";

interface CubixLogoProps {
  className?: string;
  markClassName?: string;
  showWordmark?: boolean;
  compact?: boolean;
}

export function CubixLogo({
  className,
  markClassName,
  showWordmark = true,
  compact = false,
}: CubixLogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span
        className={cn(
          "inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-orange-200/70 bg-[linear-gradient(145deg,_#fff1df_0%,_#ef7d32_100%)] shadow-[0_16px_30px_rgba(239,125,50,0.22)]",
          compact && "h-10 w-10 rounded-xl",
          markClassName,
        )}
      >
        <svg viewBox="0 0 48 48" aria-hidden="true" className="h-8 w-8">
          <rect x="9" y="25" width="7" height="12" rx="2" fill="rgba(255,255,255,0.92)" />
          <rect x="20.5" y="16" width="7" height="21" rx="2" fill="rgba(255,255,255,0.92)" />
          <rect x="32" y="10" width="7" height="27" rx="2" fill="rgba(255,255,255,0.92)" />
          <path d="M12.5 14.5C17 9.5 23 7 30.5 8.5" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="11.5" cy="15.5" r="3.5" fill="#152032" fillOpacity="0.78" />
          <circle cx="32.5" cy="9.5" r="3.5" fill="#152032" fillOpacity="0.78" />
        </svg>
      </span>
      {showWordmark ? (
        <span className="min-w-0">
          <span className="block text-lg font-black tracking-[-0.05em] text-slate-950">CubixAI</span>
          <span className="block text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">AI Commerce Monitor</span>
        </span>
      ) : null}
    </div>
  );
}
