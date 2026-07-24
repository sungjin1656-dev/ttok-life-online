"use client";
import { usePathname, useRouter } from "next/navigation";

const items=[
  {href:"/home",icon:"🏠",label:"홈"},
  {href:"/farm",icon:"🌱",label:"농장"},
  {href:"/walk",icon:"👟",label:"산책"},
  {href:"/ranking",icon:"👑",label:"걷기왕"},
  {href:"/rewards",icon:"🎁",label:"보상함"},
  {href:"/profile",icon:"☰",label:"더보기"},
];

export function BottomNav(){
  const pathname=usePathname(); const router=useRouter();
  return <nav className="bottom-nav">{items.map(item=>
    <button key={item.href} className={`nav-item ${pathname===item.href?"active":""}`} onClick={()=>router.push(item.href)}>
      <span className="icon">{item.icon}</span>{item.label}
    </button>
  )}</nav>;
}
