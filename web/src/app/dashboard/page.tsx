"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, Clock, TrendingUp, CheckCircle2, UtensilsCrossed } from "lucide-react";
import { getOrders, getMenuItems, type Order, type MenuItem } from "@/lib/api";
import { formatCurrency, formatShortDate } from "@/lib/utils";
import StatsCard from "@/components/StatsCard";
import StatusBadge from "@/components/StatusBadge";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";

function LiveBadge({ lastUpdated }: { lastUpdated: Date }) {
  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-2 w-2">
        <span className="live-dot absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
      </span>
      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
        Live · {lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </span>
    </div>
  );
}

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [ordersData, menuData] = await Promise.all([getOrders(), getMenuItems()]);
      setOrders((prev) => {
        const prevIds = new Set(prev.map((o) => o.id));
        const incoming = ordersData.filter((o) => !prevIds.has(o.id)).map((o) => o.id);
        if (incoming.length > 0) {
          setNewOrderIds(new Set(incoming));
          setTimeout(() => setNewOrderIds(new Set()), 4000);
        }
        return ordersData;
      });
      setMenuItems(menuData);
      setLastUpdated(new Date());
    } catch {
      // silent fail on background refresh
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useAutoRefresh(() => load(true), 5000);

  const pending   = orders.filter((o) => o.status === "PENDING").length;
  const inProgress = orders.filter((o) => ["CONFIRMED","PREPARING"].includes(o.status)).length;
  const completed = orders.filter((o) => o.status === "PICKED_UP").length;
  const todayRevenue = orders
    .filter((o) => {
      const d = new Date(o.created_at), t = new Date();
      return d.getDate()===t.getDate() && d.getMonth()===t.getMonth() && d.getFullYear()===t.getFullYear() && o.status!=="CANCELLED";
    })
    .reduce((s, o) => s + o.total_amount, 0);

  const recentOrders = [...orders]
    .sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8);

  return (
    <div className="max-w-6xl mx-auto space-y-8">

      {/* Header */}
      <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }}
        className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color:"var(--text-muted)" }}>
            Good {new Date().getHours()<12?"Morning":new Date().getHours()<18?"Afternoon":"Evening"} 👋
          </p>
          <h1 className="text-3xl font-bold font-serif" style={{ color:"var(--text)" }}>Dashboard</h1>
        </div>
        <LiveBadge lastUpdated={lastUpdated} />
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard title="Total Orders"   value={orders.length}          subtitle="All time"                   icon={ShoppingBag}    color="amber"   index={0} />
        <StatsCard title="Pending"        value={pending}                subtitle={pending>0?"Need action":"All clear"} icon={Clock}  color="rose"    index={1} />
        <StatsCard title="In Progress"    value={inProgress}             subtitle="Confirmed + Preparing"      icon={TrendingUp}     color="blue"    index={2} />
        <StatsCard title="Today Revenue"  value={formatCurrency(todayRevenue)} subtitle={`${completed} completed`} icon={CheckCircle2} color="emerald" index={3} />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Live Orders Feed */}
        <motion.div className="xl:col-span-2"
          initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.35 }}>
          <div className="rounded-2xl overflow-hidden"
            style={{ background:"var(--surface)", border:"1px solid var(--border)" }}>
            <div className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom:"1px solid var(--border)" }}>
              <h2 className="text-sm font-semibold font-serif" style={{ color:"var(--text)" }}>Live Orders</h2>
              <span className="text-xs" style={{ color:"var(--text-muted)" }}>Latest {recentOrders.length}</span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="flex gap-1">
                  {[0,1,2].map(i => (
                    <motion.div key={i} className="w-1.5 h-1.5 rounded-full"
                      style={{ background:"#e8a045" }}
                      animate={{ opacity:[0.3,1,0.3] }}
                      transition={{ duration:1.2, repeat:Infinity, delay:i*0.2 }} />
                  ))}
                </div>
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16" style={{ color:"var(--text-muted)" }}>
                <ShoppingBag className="h-10 w-10 mb-3 opacity-20" />
                <p className="text-sm">No orders yet — waiting for customers</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor:"var(--border)" }}>
                <AnimatePresence initial={false}>
                  {recentOrders.map((order) => (
                    <motion.div key={order.id}
                      initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0 }}
                      transition={{ duration:0.25 }}
                      className="flex items-center justify-between px-6 py-4 transition-colors"
                      style={newOrderIds.has(order.id) ? {
                        background:"rgba(232,160,69,0.06)",
                        borderLeft:"2px solid #e8a045",
                      } : {}}
                    >
                      {/* Avatar + name */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ background:"rgba(232,160,69,0.12)", color:"#e8a045" }}>
                          {order.customer_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color:"var(--text)" }}>
                            {order.customer_name}
                            {newOrderIds.has(order.id) && (
                              <span className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                                style={{ background:"rgba(232,160,69,0.2)", color:"#e8a045" }}>NEW</span>
                            )}
                          </p>
                          <p className="text-xs truncate" style={{ color:"var(--text-muted)" }}>
                            {order.order_number} · {formatShortDate(order.created_at)}
                          </p>
                        </div>
                      </div>
                      {/* Amount + status */}
                      <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                        <StatusBadge status={order.status} />
                        <span className="text-sm font-bold tabular-nums" style={{ color:"#e8a045" }}>
                          {formatCurrency(order.total_amount)}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </motion.div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Menu health */}
          <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.4 }}>
            <div className="rounded-2xl p-5" style={{ background:"var(--surface)", border:"1px solid var(--border)" }}>
              <div className="flex items-center gap-2 mb-4">
                <UtensilsCrossed className="h-4 w-4" style={{ color:"#e8a045" }} />
                <h3 className="text-sm font-semibold font-serif" style={{ color:"var(--text)" }}>Menu Health</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color:"var(--text-muted)" }}>Available</span>
                  <span className="font-semibold" style={{ color:"#4ade80" }}>
                    {menuItems.filter(m=>m.is_available).length} / {menuItems.length}
                  </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background:"var(--surface-3)" }}>
                  <motion.div className="h-full rounded-full"
                    style={{ background:"linear-gradient(90deg,#22c55e,#4ade80)" }}
                    initial={{ width:0 }}
                    animate={{ width: menuItems.length>0 ? `${(menuItems.filter(m=>m.is_available).length/menuItems.length)*100}%` : "0%" }}
                    transition={{ delay:0.5, duration:0.8 }}
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Order breakdown */}
          <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.45 }}>
            <div className="rounded-2xl p-5" style={{ background:"var(--surface)", border:"1px solid var(--border)" }}>
              <h3 className="text-sm font-semibold font-serif mb-4" style={{ color:"var(--text)" }}>Pipeline</h3>
              {[
                { label:"Pending",   color:"#f59e0b", status:"PENDING" },
                { label:"Confirmed", color:"#60a5fa", status:"CONFIRMED" },
                { label:"Preparing", color:"#fb923c", status:"PREPARING" },
                { label:"Ready",     color:"#4ade80", status:"READY" },
              ].map(({ label, color, status }) => {
                const count = orders.filter(o=>o.status===status).length;
                const pct = orders.length>0 ? (count/orders.length)*100 : 0;
                return (
                  <div key={status} className="mb-3 last:mb-0">
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color:"var(--text-muted)" }}>{label}</span>
                      <span className="font-semibold" style={{ color }}>{count}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background:"var(--surface-3)" }}>
                      <motion.div className="h-full rounded-full"
                        style={{ background:color }}
                        initial={{ width:0 }}
                        animate={{ width:`${pct}%` }}
                        transition={{ delay:0.6, duration:0.6 }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
