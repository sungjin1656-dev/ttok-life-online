import type { ButtonHTMLAttributes, ReactNode } from "react";

type TTButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary";
};

export function TTButton({ children, variant = "primary", className = "", ...props }: TTButtonProps) {
  return (
    <button className={`tt-button tt-button-${variant} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}
