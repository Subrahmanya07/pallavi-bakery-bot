const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  PENDING:   { label: "Pending",    bg: "rgba(245,158,11,0.12)", text: "#f59e0b", dot: "#f59e0b" },
  CONFIRMED: { label: "Confirmed",  bg: "rgba(59,130,246,0.12)", text: "#60a5fa", dot: "#3b82f6" },
  PREPARING: { label: "Preparing",  bg: "rgba(249,115,22,0.12)", text: "#fb923c", dot: "#f97316" },
  READY:     { label: "Ready",      bg: "rgba(34,197,94,0.12)",  text: "#4ade80", dot: "#22c55e" },
  PICKED_UP: { label: "Picked Up",  bg: "rgba(168,85,247,0.12)", text: "#c084fc", dot: "#a855f7" },
  CANCELLED: { label: "Cancelled",  bg: "rgba(239,68,68,0.12)",  text: "#f87171", dot: "#ef4444" },
};

export default function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CONFIG[status] ?? { label: status, bg: "rgba(120,112,96,0.15)", text: "#7a7060", dot: "#7a7060" };
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide"
      style={{ background: c.bg, color: c.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: c.dot }} />
      {c.label}
    </span>
  );
}
