"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { LayoutDashboard, ShoppingBag, UtensilsCrossed, ChefHat, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { clearAdminKey } from "@/lib/auth";

const navItems = [
  { href: "/dashboard",        label: "Dashboard", icon: LayoutDashboard, desc: "Overview" },
  { href: "/dashboard/orders", label: "Orders",    icon: ShoppingBag,     desc: "Manage orders" },
  { href: "/dashboard/menu",   label: "Menu",      icon: UtensilsCrossed, desc: "Items & pricing" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    clearAdminKey();
    router.replace("/login");
  };

  return (
    <aside className="sticky top-0 h-screen w-60 shrink-0 z-40 flex flex-col self-start"
      style={{
        background: "linear-gradient(180deg, #131110 0%, #0e0d0b 100%)",
        borderRight: "1px solid rgba(210,150,60,0.10)",
      }}
    >
      {/* Brand */}
      <div className="px-5 py-6" style={{ borderBottom: "1px solid rgba(210,150,60,0.08)" }}>
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #e8a045 0%, #c4622d 100%)", boxShadow: "0 4px 20px rgba(232,160,69,0.35)" }}
          >
            <ChefHat className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-none font-serif">Bakery Admin</p>
            <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>Management Console</p>
          </div>
        </div>
      </div>

      {/* Nav label */}
      <p className="px-5 pt-5 pb-2 text-[10px] font-semibold tracking-widest uppercase"
        style={{ color: "var(--text-faint)" }}>
        Navigation
      </p>

      {/* Nav items */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto no-scrollbar">
        {navItems.map((item) => {
          const isActive = item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.97 }}
                className={cn(
                  "relative flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all duration-200",
                  isActive
                    ? "text-[#e8a045]"
                    : "text-[#7a7060] hover:text-[#c8a87a]"
                )}
                style={isActive ? {
                  background: "rgba(232,160,69,0.10)",
                  border: "1px solid rgba(232,160,69,0.18)",
                } : {
                  border: "1px solid transparent",
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-bg"
                    className="absolute left-0 top-0 bottom-0 w-0.5 rounded-full"
                    style={{ background: "#e8a045" }}
                  />
                )}
                <Icon className="h-4 w-4 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-none">{item.label}</p>
                  <p className="text-[10px] mt-0.5 opacity-60 leading-none">{item.desc}</p>
                </div>
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-5 space-y-2" style={{ borderTop: "1px solid rgba(210,150,60,0.08)" }}>
        <div className="rounded-xl px-3 py-3" style={{ background: "rgba(232,160,69,0.06)", border: "1px solid rgba(232,160,69,0.10)" }}>
          <p className="text-xs font-medium" style={{ color: "#e8a045" }}>Live Monitoring</p>
          <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>Auto-refreshes every 5s</p>
        </div>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.10)"; (e.currentTarget as HTMLButtonElement).style.color = "#f87171"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; }}>
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
