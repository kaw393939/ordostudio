import type { HTMLAttributes } from "react";
import { cn } from "@/lib/ui/cn";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  elevated?: boolean;
};

export function Card({ elevated = false, className, ...props }: CardProps) {
  return (
    <div
      className={cn(elevated ? "surface-elevated" : "surface", className)}
      {...props}
    />
  );
}
