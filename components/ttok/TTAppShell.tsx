import type { ReactNode } from "react";

export function TTAppShell({ children }: { children: ReactNode }) {
  return (
    <div className="tt-app-bg">
      <div className="tt-app-shell">{children}</div>
    </div>
  );
}
