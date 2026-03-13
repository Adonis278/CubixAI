import { cn } from "@/lib/utils";

export function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "success" | "warning" | "danger" | "neutral";
}) {
  const tones = {
    success: "border-emerald-200/90 bg-emerald-50/90 text-emerald-700",
    warning: "border-amber-200/90 bg-amber-50/90 text-amber-700",
    danger: "border-rose-200/90 bg-rose-50/90 text-rose-700",
    neutral: "border-slate-200/90 bg-white/80 text-slate-700",
  };

  return (
    <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-[0.04em] shadow-sm", tones[tone])}>
      {children}
    </span>
  );
}
