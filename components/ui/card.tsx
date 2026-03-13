import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "glass-panel rounded-[26px] border border-[color:var(--line)] bg-[color:var(--surface)] shadow-[var(--shadow-md)]",
        className,
      )}
      {...props}
    />
  );
}
