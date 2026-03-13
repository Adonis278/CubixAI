import { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-xl border border-slate-300/80 bg-white/85 px-3.5 py-2.5 text-sm text-slate-900 outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur-sm focus:border-orange-400 focus:ring-4 focus:ring-orange-100/80",
        props.className,
      )}
    />
  );
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full rounded-xl border border-slate-300/80 bg-white/85 px-3.5 py-2.5 text-sm text-slate-900 outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur-sm focus:border-orange-400 focus:ring-4 focus:ring-orange-100/80",
        props.className,
      )}
    />
  );
}
