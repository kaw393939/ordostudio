"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { fadeIn, slideUp, staggerChildren } from "@/lib/ui/motion";

type MotionWrapperProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Fade-in wrapper: opacity 0 → 1.
 * Respects prefers-reduced-motion (instant render).
 */
export function FadeIn({ children, className }: MotionWrapperProps) {
  const shouldReduce = useReducedMotion();
  if (shouldReduce) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div
      variants={fadeIn}
      initial="initial"
      animate="animate"
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Slide-up wrapper: y offset + opacity 0 → visible.
 * Respects prefers-reduced-motion (instant render).
 */
export function SlideUp({ children, className }: MotionWrapperProps) {
  const shouldReduce = useReducedMotion();
  if (shouldReduce) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div
      variants={slideUp}
      initial="initial"
      animate="animate"
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Stagger container: staggers children animation sequentially.
 * Respects prefers-reduced-motion (instant render).
 */
export function StaggerContainer({ children, className }: MotionWrapperProps) {
  const shouldReduce = useReducedMotion();
  if (shouldReduce) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div
      variants={staggerChildren}
      initial="initial"
      animate="animate"
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Stagger item: individual child inside StaggerContainer.
 * Uses slideUp variant by default.
 */
export function StaggerItem({ children, className }: MotionWrapperProps) {
  const shouldReduce = useReducedMotion();
  if (shouldReduce) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div variants={slideUp} className={className}>
      {children}
    </motion.div>
  );
}
