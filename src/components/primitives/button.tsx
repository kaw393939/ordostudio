import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/ui/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-sm type-label motion-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-60",
  {
    variants: {
      intent: {
        primary:
          "border border-action-primary bg-action-primary px-3 py-2 text-text-inverse hover:bg-action-primary-hover",
        secondary:
          "border border-border-default bg-action-secondary px-3 py-2 text-text-primary hover:bg-action-secondary-hover",
        ghost: "px-2 py-1 text-text-secondary hover:text-text-primary",
        danger:
          "border border-state-danger bg-state-danger px-3 py-2 text-text-inverse hover:opacity-90",
      },
      size: {
        sm: "px-2 py-1 type-meta",
        md: "px-3 py-2",
        lg: "px-4 py-2",
      },
      fullWidth: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: {
      intent: "secondary",
      size: "md",
      fullWidth: false,
    },
  },
);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, intent, size, fullWidth, type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(buttonVariants({ intent, size, fullWidth }), className)}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
