import type { HTMLAttributes, ReactNode } from "react";

type TTCardProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  as?: "section" | "article" | "div";
};

export function TTCard({ children, className = "", as: Tag = "section", ...props }: TTCardProps) {
  return (
    <Tag className={`tt-card ${className}`.trim()} {...props}>
      {children}
    </Tag>
  );
}
