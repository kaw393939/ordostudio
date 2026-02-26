"use client";

/**
 * SOMarkIcon — canonical Studio Ordo brand mark (circle + S letterform).
 * Single source of truth for path data used across chat surfaces.
 */
export function SOMarkIcon({
  size = 18,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <circle cx="60" cy="60" r="54" stroke="currentColor" strokeWidth="6" />
      <path
        d="M50 42c0-4.418 3.582-8 8-8h6c4.418 0 8 3.582 8 8v3c0 4.418-3.582 8-8 8h-4c-4.418 0-8 3.582-8 8v3c0 4.418 3.582 8 8 8h6c4.418 0 8-3.582 8-8"
        stroke="currentColor"
        strokeWidth="9"
        strokeLinecap="round"
      />
    </svg>
  );
}
