"use client";

import Image from "next/image";
import cubixLogo from "@/cubixai_logo.png";
import { cn } from "@/lib/utils";

interface CubixLogoProps {
  className?: string;
  compact?: boolean;
}

export function CubixLogo({ className, compact = false }: CubixLogoProps) {
  return (
    <div className={cn("w-full max-w-[220px]", compact && "max-w-[170px]", className)}>
      <Image src={cubixLogo} alt="CubixAI" className="h-auto w-full" priority />
    </div>
  );
}
