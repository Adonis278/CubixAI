import { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantClassMap: Record<ButtonVariant, string> = {
  primary:
    "bg-orange-500 text-white hover:bg-orange-600 disabled:bg-orange-300 shadow-sm shadow-orange-200",
  secondary:
    "bg-white text-slate-800 border border-slate-300 hover:border-orange-300 hover:text-orange-700",
  ghost: "bg-transparent text-slate-600 hover:bg-slate-100",
};

export function Button({ className, variant = "primary", ...props }: Props) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed",
        variantClassMap[variant],
        className,
      )}
      {...props}
    />
  );
}
