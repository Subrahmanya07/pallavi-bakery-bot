"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color?: "amber" | "emerald" | "blue" | "rose";
  index?: number;
}

const COLORS = {
  amber:   { icon: "#e8a045", bg: "rgba(232,160,69,0.10)",  border: "rgba(232,160,69,0.18)",  glow: "rgba(232,160,69,0.08)" },
  emerald: { icon: "#4ade80", bg: "rgba(74,222,128,0.10)",  border: "rgba(74,222,128,0.18)",  glow: "rgba(74,222,128,0.06)" },
  blue:    { icon: "#60a5fa", bg: "rgba(96,165,250,0.10)",  border: "rgba(96,165,250,0.18)",  glow: "rgba(96,165,250,0.06)" },
  rose:    { icon: "#fb7185", bg: "rgba(251,113,133,0.10)", border: "rgba(251,113,133,0.18)", glow: "rgba(251,113,133,0.06)" },
};

export default function StatsCard({ title, value, subtitle, icon: Icon, color = "amber", index = 0 }: StatsCardProps) {
  const c = COLORS[color];
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      className="card-glow rounded-2xl p-5 flex flex-col gap-4"
      style={{
        background: `linear-gradient(135deg, var(--surface-2) 0%, var(--surface) 100%)`,
        border: `1px solid var(--border)`,
      }}
    >
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
          {title}
        </p>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: c.bg, border: `1px solid ${c.border}` }}>
          <Icon className="h-4 w-4" style={{ color: c.icon }} />
        </div>
      </div>
      <div>
        <p className="text-3xl font-bold tracking-tight font-serif" style={{ color: "var(--text)" }}>
          {value}
        </p>
        {subtitle && (
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{subtitle}</p>
        )}
      </div>
    </motion.div>
  );
}
