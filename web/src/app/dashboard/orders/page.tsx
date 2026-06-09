"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Package, User, Clock, FileText, ChevronRight, CreditCard } from "lucide-react";
import { getOrders, updateOrderStatus, type Order, type OrderStatus, type PaymentStatus, ORDER_STATUSES } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import StatusBadge from "@/components/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, string> = {
  ALL: "All", PENDING: "Pending", CONFIRMED: "Confirmed",
  PREPARING: "Preparing", READY: "Ready", PICKED_UP: "Picked Up", CANCELLED: "Cancelled",
};

const NEXT: Record<string, OrderStatus[]> = {
  PENDING:   ["CONFIRMED","CANCELLED"],
  CONFIRMED: ["PREPARING","CANCELLED"],
  PREPARING: ["READY","CANCELLED"],
  READY:     ["PICKED_UP"],
  PICKED_UP: [],
  CANCELLED: [],
};

const PAYMENT_STYLES: Record<PaymentStatus, { bg: string; color: string; label: string }> = {
  PAID:    { bg: "rgba(74,222,128,0.12)", color: "#4ade80", label: "Paid" },
  PENDING: { bg: "rgba(250,204,21,0.12)", color: "#facc15", label: "Unpaid" },
  FAILED:  { bg: "rgba(248,113,113,0.12)", color: "#f87171", label: "Failed" },
};

function PaymentBadge({ status }: { status: PaymentStatus }) {
  const s = PAYMENT_STYLES[status] ?? PAYMENT_STYLES.PENDING;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
      style={{ background: s.bg, color: s.color }}>
      <CreditCard className="w-2.5 h-2.5" />{s.label}
    </span>
  );
}

function LiveBadge({ lastUpdated }: { lastUpdated: Date }) {
  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-2 w-2">
        <span className="live-dot absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
      </span>
      <span className="text-xs" style={{ color:"var(--text-muted)" }}>
        {lastUpdated.toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit", second:"2-digit" })}
      </span>
    </div>
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Order | null>(null);
  const [updating, setUpdating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [newIds, setNewIds] = useState<Set<string>>(new Set());

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await getOrders();
      setOrders(prev => {
        const prevIds = new Set(prev.map(o => o.id));
        const incoming = data.filter(o => !prevIds.has(o.id)).map(o => o.id);
        if (incoming.length > 0) {
          setNewIds(new Set(incoming));
          setTimeout(() => setNewIds(new Set()), 4000);
        }
        return data;
      });
      setLastUpdated(new Date());
    } catch { /* silent */ }
    finally { if (!silent) setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useAutoRefresh(() => load(true), 5000);

  const filtered = orders.filter(o => {
    const matchFilter = filter === "ALL" || o.status === filter;
    const q = search.toLowerCase();
    const matchSearch = !q || o.order_number.toLowerCase().includes(q) || o.customer_name.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  const handleStatusUpdate = async (newStatus: OrderStatus) => {
    if (!selected) return;
    setUpdating(true);
    try {
      const res = await updateOrderStatus(selected.id, newStatus);
      // Optimistically reflect the new status locally, then re-sync from server.
      setOrders(prev => prev.map(o => o.id === selected.id ? { ...o, status: newStatus } : o));
      setSelected(prev => prev ? { ...prev, status: newStatus } : prev);
      toast.success(`Marked as ${STATUS_LABELS[newStatus]}`, {
        description: res.customer_notified ? "Customer notified on Telegram" : undefined,
      });
      load(true);
    } catch (err) {
      toast.error("Update failed", { description: String(err) });
    } finally { setUpdating(false); }
  };

  const tabs = ["ALL", ...ORDER_STATUSES];

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }}
        className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color:"var(--text-muted)" }}>Bakery</p>
          <h1 className="text-3xl font-bold font-serif" style={{ color:"var(--text)" }}>Orders</h1>
        </div>
        <div className="flex items-center gap-4">
          <LiveBadge lastUpdated={lastUpdated} />
          <span className="text-xs px-2.5 py-1 rounded-full" style={{ background:"rgba(232,160,69,0.12)", color:"#e8a045" }}>
            {orders.length} total
          </span>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.1 }}>
        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-3">
          {tabs.map(tab => {
            const count = tab==="ALL" ? orders.length : orders.filter(o=>o.status===tab).length;
            const isActive = filter === tab;
            return (
              <button key={tab} onClick={() => setFilter(tab)}
                className="flex-shrink-0 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200"
                style={isActive ? {
                  background:"rgba(232,160,69,0.14)",
                  border:"1px solid rgba(232,160,69,0.28)",
                  color:"#e8a045",
                } : {
                  background:"var(--surface)",
                  border:"1px solid var(--border)",
                  color:"var(--text-muted)",
                }}
              >
                {STATUS_LABELS[tab]}
                <span className="ml-1.5 opacity-60">{count}</span>
              </button>
            );
          })}
        </div>
        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color:"var(--text-muted)" }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or order number…"
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl outline-none transition-all"
            style={{
              background:"var(--surface)", border:"1px solid var(--border)",
              color:"var(--text)", caretColor:"#e8a045",
            }}
          />
        </div>
      </motion.div>

      {/* Table */}
      <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.2 }}
        className="rounded-2xl overflow-hidden"
        style={{ background:"var(--surface)", border:"1px solid var(--border)" }}>

        {/* Table head */}
        <div className="grid grid-cols-12 gap-3 px-6 py-3"
          style={{ borderBottom:"1px solid var(--border)", background:"var(--surface-2)" }}>
          {["Order", "Customer", "Items", "Date", "Amount", "Payment", "Status"].map((h, i) => (
            <div key={i} className={`text-[10px] font-semibold uppercase tracking-widest ${
              i===0?"col-span-2":i===1?"col-span-2":i===2?"col-span-1":i===3?"col-span-2":i===4?"col-span-2":i===5?"col-span-2":"col-span-1"
            }`} style={{ color:"var(--text-muted)" }}>
              {h}
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex gap-1.5">
              {[0,1,2].map(i => (
                <motion.div key={i} className="w-2 h-2 rounded-full" style={{ background:"#e8a045" }}
                  animate={{ opacity:[0.2,1,0.2] }} transition={{ duration:1.2, repeat:Infinity, delay:i*0.2 }} />
              ))}
            </div>
          </div>
        ) : filtered.length===0 ? (
          <div className="flex flex-col items-center justify-center py-20" style={{ color:"var(--text-muted)" }}>
            <Package className="h-10 w-10 mb-3 opacity-20" />
            <p className="text-sm">No orders found</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {filtered.map((order, i) => (
              <motion.div key={order.id}
                initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                transition={{ delay:i*0.02 }}
                onClick={() => setSelected(order)}
                className="grid grid-cols-12 gap-3 px-6 py-4 cursor-pointer transition-colors group"
                style={{
                  borderBottom:"1px solid var(--border)",
                  ...(newIds.has(order.id) ? { background:"rgba(232,160,69,0.05)", borderLeft:"2px solid #e8a045" } : {}),
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-2)")}
                onMouseLeave={e => (e.currentTarget.style.background = newIds.has(order.id) ? "rgba(232,160,69,0.05)" : "")}
              >
                <div className="col-span-2 flex items-center">
                  <span className="text-sm font-semibold" style={{ color:"#e8a045" }}>
                    {order.order_number}
                    {newIds.has(order.id) && (
                      <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                        style={{ background:"rgba(232,160,69,0.2)", color:"#e8a045" }}>NEW</span>
                    )}
                  </span>
                </div>
                <div className="col-span-2 flex items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg text-[10px] font-bold flex items-center justify-center flex-shrink-0"
                      style={{ background:"rgba(232,160,69,0.12)", color:"#e8a045" }}>
                      {order.customer_name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm truncate" style={{ color:"var(--text)" }}>{order.customer_name}</span>
                  </div>
                </div>
                <div className="col-span-2 flex items-center">
                  <span className="text-xs" style={{ color:"var(--text-muted)" }}>
                    {order.items.length} item{order.items.length!==1?"s":""}
                  </span>
                </div>
                <div className="col-span-2 flex items-center">
                  <span className="text-xs" style={{ color:"var(--text-muted)" }}>
                    {new Date(order.created_at).toLocaleDateString("en-IN",{day:"2-digit",month:"short"})}
                    {" · "}
                    {new Date(order.created_at).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}
                  </span>
                </div>
                <div className="col-span-2 flex items-center">
                  <span className="text-sm font-bold tabular-nums" style={{ color:"#e8a045" }}>
                    {formatCurrency(order.total_amount)}
                  </span>
                </div>
                <div className="col-span-2 flex items-center">
                  <PaymentBadge status={(order.payment_status ?? "PENDING") as PaymentStatus} />
                </div>
                <div className="col-span-1 flex items-center gap-2">
                  <StatusBadge status={order.status} />
                  <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color:"var(--text-muted)" }} />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </motion.div>

      {/* Order Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        {selected && (
          <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selected.order_number}</DialogTitle>
              <DialogDescription>{formatDate(selected.created_at)}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-1">
              {/* Customer + total */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl p-3" style={{ background:"var(--surface-2)", border:"1px solid var(--border)" }}>
                  <div className="flex items-center gap-1.5 text-xs mb-1.5" style={{ color:"var(--text-muted)" }}>
                    <User className="h-3 w-3" /> Customer
                  </div>
                  <p className="text-sm font-semibold" style={{ color:"var(--text)" }}>{selected.customer_name}</p>
                  <p className="text-xs mt-0.5" style={{ color:"var(--text-muted)" }}>ID: {selected.telegram_user_id}</p>
                </div>
                <div className="rounded-xl p-3" style={{ background:"var(--surface-2)", border:"1px solid var(--border)" }}>
                  <p className="text-xs mb-1.5" style={{ color:"var(--text-muted)" }}>Total Amount</p>
                  <p className="text-xl font-bold font-serif" style={{ color:"#e8a045" }}>
                    {formatCurrency(selected.total_amount)}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <StatusBadge status={selected.status} />
                    <PaymentBadge status={(selected.payment_status ?? "PENDING") as PaymentStatus} />
                  </div>
                  {selected.razorpay_payment_id && (
                    <p className="text-[10px] mt-1.5 font-mono truncate" style={{ color:"var(--text-muted)" }}>
                      {selected.razorpay_payment_id}
                    </p>
                  )}
                </div>
              </div>

              {/* Items */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color:"var(--text-muted)" }}>Items</p>
                <div className="space-y-2">
                  {selected.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl px-4 py-3"
                      style={{ background:"var(--surface-2)", border:"1px solid var(--border)" }}>
                      <div>
                        <p className="text-sm" style={{ color:"var(--text)" }}>
                          {item.name} <span style={{ color:"var(--text-muted)" }}>×{item.quantity}</span>
                        </p>
                        {item.customization && (
                          <p className="text-xs mt-0.5" style={{ color:"var(--text-muted)" }}>{item.customization}</p>
                        )}
                      </div>
                      <span className="text-sm font-semibold" style={{ color:"var(--text)" }}>
                        {formatCurrency(item.unit_price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              {selected.notes && (
                <div className="rounded-xl px-4 py-3" style={{ background:"rgba(232,160,69,0.06)", border:"1px solid rgba(232,160,69,0.15)" }}>
                  <div className="flex items-center gap-1.5 text-xs mb-1" style={{ color:"#e8a045" }}>
                    <FileText className="h-3 w-3" /> Note
                  </div>
                  <p className="text-sm" style={{ color:"var(--text)" }}>{selected.notes}</p>
                </div>
              )}

              {/* Pickup */}
              {selected.pickup_time && (
                <div className="flex items-center gap-2 text-sm" style={{ color:"var(--text-muted)" }}>
                  <Clock className="h-4 w-4" /> Pickup: {formatDate(selected.pickup_time)}
                </div>
              )}

              {/* Status history */}
              {selected.status_history?.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color:"var(--text-muted)" }}>History</p>
                  <div className="space-y-1.5">
                    {selected.status_history.map((h, i) => (
                      <div key={i} className="flex items-center gap-3 text-xs">
                        <StatusBadge status={h.status} />
                        <span style={{ color:"var(--text-muted)" }}>{formatDate(h.changed_at)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {NEXT[selected.status]?.length > 0 && (
              <DialogFooter className="mt-4">
                <div className="flex gap-2 flex-wrap">
                  {NEXT[selected.status].map(s => (
                    <button key={s} onClick={() => handleStatusUpdate(s)} disabled={updating}
                      className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                      style={s==="CANCELLED" ? {
                        background:"rgba(239,68,68,0.12)", border:"1px solid rgba(239,68,68,0.25)", color:"#f87171"
                      } : {
                        background:"rgba(232,160,69,0.15)", border:"1px solid rgba(232,160,69,0.30)", color:"#e8a045"
                      }}
                    >
                      {updating ? "…" : s==="CANCELLED" ? "Cancel Order" : `→ ${STATUS_LABELS[s]}`}
                    </button>
                  ))}
                </div>
              </DialogFooter>
            )}
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
