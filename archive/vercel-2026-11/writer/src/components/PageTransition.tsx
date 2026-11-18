"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";

// Matches the public site's .page-enter/.page-leave CSS exactly: fade +
// 8px vertical slide, 0.2s. MotionConfig's reducedMotion="user" (set once
// in AppShell) handles prefers-reduced-motion for this and every other
// motion.* component in the writer app.
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
