import { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantClassMap: Record<ButtonVariant, string> = {
  primary:
    "border border-orange-400/50 bg-[linear-gradient(135deg,_#f28d3d_0%,_#dd6b1f_100%)] text-white shadow-[0_16px_28px_rgba(239,125,50,0.28)] hover:-translate-y-0.5 hover:shadow-[0_20px_34px_rgba(239,125,50,0.32)] disabled:border-orange-200 disabled:bg-orange-300 disabled:shadow-none",
  secondary:
    "border border-slate-300/80 bg-white/80 text-slate-800 shadow-[0_10px_24px_rgba(15,23,42,0.05)] hover:-translate-y-0.5 hover:border-orange-300 hover:text-orange-700",
  ghost: "border border-transparent bg-transparent text-slate-600 hover:bg-white/60 hover:text-slate-900",
};

export function Button({ className, variant = "primary", ...props }: Props) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed",
        variantClassMap[variant],
        className,
      )}
      {...props}
    />
  );
}
