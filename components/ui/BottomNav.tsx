"use client";

import { usePathname, useRouter } from "next/navigation";

const items = [
  {
    href: "/home",
    icon: "🏠",
    label: "홈",
  },
  {
    href: "/farm",
    icon: "🌱",
    label: "농장",
  },
  {
    href: "/walk",
    icon: "👟",
    label: "산책",
  },
  {
    href: "/ranking",
    icon: "🏆",
    label: "랭킹",
  },
  {
    href: "/profile",
    icon: "👤",
    label: "마이",
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) => {
    if (href === "/profile") {
      return pathname === "/profile" || pathname.startsWith("/rewards");
    }

    return pathname === href;
  };

  return (
    <nav className="bottom-nav" aria-label="하단 메뉴">
      {items.map((item) => {
        const active = isActive(item.href);

        return (
          <button
            key={item.href}
            type="button"
            className={`nav-item ${active ? "active" : ""}`}
            onClick={() => router.push(item.href)}
            aria-current={active ? "page" : undefined}
          >
            <span className="icon" aria-hidden="true">
              {item.icon}
            </span>

            <span className="label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}