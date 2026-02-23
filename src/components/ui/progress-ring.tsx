import { cn } from "@/lib/ui";

type ProgressTone = "success" | "warning" | "destructive";

const clamp = (value: number): number => Math.min(100, Math.max(0, value));

const toneClass = (tone: ProgressTone): string => {
  switch (tone) {
    case "warning":
      return "text-warning";
    case "destructive":
      return "text-destructive";
    case "success":
    default:
      return "text-success";
  }
};

export function ProgressRing({
  value,
  tone = "success",
  size = 44,
  strokeWidth = 6,
  className,
  label,
}: {
  value: number;
  tone?: ProgressTone;
  size?: number;
  strokeWidth?: number;
  className?: string;
  label?: string;
}) {
  const clamped = clamp(value);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - clamped / 100);

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      className={cn("inline-flex items-center justify-center", className)}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-border"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className={cn("origin-center -rotate-90 motion-base", toneClass(tone))}
        />
      </svg>
    </div>
  );
}
