"use client";

import { BottomNav } from "@/components/ui/BottomNav";

/**
 * Legacy TTOK wrapper. All routes now render one shared bottom navigation
 * so icon, spacing, active state and desktop width stay identical.
 */
export function TTBottomNav() {
  return <BottomNav />;
}
