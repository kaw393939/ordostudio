import type { Variants } from "framer-motion";

/** Base animation duration in seconds (matches --motion-base: 180ms). */
export const MOTION_DURATION = 0.18;

const easeOut: [number, number, number, number] = [0.2, 0.8, 0.2, 1];

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: MOTION_DURATION, ease: easeOut },
  },
};

export const slideUp: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: MOTION_DURATION, ease: easeOut },
  },
};

export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: MOTION_DURATION, ease: easeOut },
  },
};

export const staggerChildren: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.06,
    },
  },
};
