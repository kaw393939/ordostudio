import { cn } from "@/lib/ui";

type ProgressTone = "success" | "warning" | "destructive";

const clamp = (value: number): number => Math.min(100, Math.max(0, value));

const toneClass = (tone: ProgressTone): string => {
  switch (tone) {
    case "warning":
      return "bg-warning";
    case "destructive":
      return "bg-destructive";
    case "success":
    default:
      return "bg-success";
  }
};

export function ProgressBar({
  value,
  tone = "success",
  className,
  label,
}: {
  value: number;
  tone?: ProgressTone;
  className?: string;
  label?: string;
}) {
  const clamped = clamp(value);

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      className={cn("h-2 w-full overflow-hidden rounded-sm bg-muted", className)}
    >
      <div
        className={cn("motion-base h-full", toneClass(tone))}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
