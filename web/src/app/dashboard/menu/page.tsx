"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, UtensilsCrossed, Pencil, Trash2, Tag, ChevronRight } from "lucide-react";
import { getMenuItems, createMenuItem, updateMenuItem, deleteMenuItem, type MenuItem } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { toast } from "sonner";

const CATEGORIES = ["breads","cakes","pastries","cookies","drinks"];

const CAT_COLOR: Record<string, string> = {
  breads:"#e8a045", cakes:"#fb7185", pastries:"#fb923c",
  cookies:"#a78bfa", drinks:"#60a5fa",
};
const CAT_EMOJI: Record<string, string> = {
  breads:"🥖", cakes:"🎂", pastries:"🥐", cookies:"🍪", drinks:"☕",
};

interface FormState {
  name:string; category:string; description:string;
  price:string; customizations:string; is_available:boolean;
}
const EMPTY: FormState = { name:"", category:"breads", description:"", price:"", customizations:"", is_available:true };

export default function MenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MenuItem | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => setExpandedItems(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const load = useCallback(async (silent=false) => {
    if (!silent) setLoading(true);
    try { setItems(await getMenuItems()); }
    catch { /* silent */ }
    finally { if (!silent) setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useAutoRefresh(() => load(true), 5000);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setDialogOpen(true); };
  const openEdit = (item: MenuItem) => {
    setEditing(item);
    setForm({ name:item.name, category:item.category, description:item.description,
      price:String(item.price), customizations:item.customizations.join(", "), is_available:item.is_available });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.price) { toast.error("Name and price required"); return; }
    setSaving(true);
    try {
      const payload = {
        name:form.name.trim(), category:form.category, description:form.description.trim(),
        price:parseFloat(form.price), is_available:form.is_available,
        customizations:form.customizations.split(",").map(s=>s.trim()).filter(Boolean),
      };
      if (editing) {
        await updateMenuItem(editing.id, payload);
        toast.success("Item updated");
      } else {
        await createMenuItem(payload);
        toast.success("Item added");
      }
      setDialogOpen(false);
      await load(true);
    } catch (err) { toast.error("Failed", { description:String(err) }); }
    finally { setSaving(false); }
  };

  const handleToggle = async (item: MenuItem) => {
    const next = !item.is_available;
    // Optimistic flip, then re-sync.
    setItems(prev => prev.map(i => i.id===item.id ? { ...i, is_available: next } : i));
    try {
      await updateMenuItem(item.id, { is_available: next });
      toast.success(next ? "Item enabled" : "Item disabled");
      load(true);
    } catch (err) {
      setItems(prev => prev.map(i => i.id===item.id ? { ...i, is_available: item.is_available } : i));
      toast.error("Failed", { description:String(err) });
    }
  };

  const handleDelete = async (item: MenuItem) => {
    try {
      await deleteMenuItem(item.id);
      setItems(prev => prev.map(i => i.id===item.id ? { ...i, is_available: false } : i));
      setDeleteTarget(null);
      toast.success("Item taken off the menu");
      load(true);
    } catch (err) { toast.error("Failed", { description:String(err) }); }
  };

  const filtered = items.filter(item => {
    const q = search.toLowerCase();
    return (catFilter==="ALL" || item.category===catFilter) &&
      (!q || item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q));
  });

  const grouped = CATEGORIES
    .map(cat => ({ category: cat, items: filtered.filter(i => i.category === cat) }))
    .filter(g => g.items.length > 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }}
        className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color:"var(--text-muted)" }}>Bakery</p>
          <h1 className="text-3xl font-bold font-serif" style={{ color:"var(--text)" }}>Menu</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color:"var(--text-muted)" }}>
            {items.filter(i=>i.is_available).length}/{items.length} available
          </span>
          <button onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background:"linear-gradient(135deg,#e8a045,#c4622d)", color:"#fff", boxShadow:"0 4px 16px rgba(232,160,69,0.30)" }}>
            <Plus className="h-4 w-4" /> Add Item
          </button>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.1 }}>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-3">
          {["ALL",...CATEGORIES].map(cat => {
            const count = cat==="ALL" ? items.length : items.filter(i=>i.category===cat).length;
            const isActive = catFilter===cat;
            const color = cat==="ALL" ? "#e8a045" : (CAT_COLOR[cat] ?? "#e8a045");
            return (
              <button key={cat} onClick={() => setCatFilter(cat)}
                className="flex-shrink-0 px-4 py-2 rounded-xl text-xs font-semibold capitalize transition-all"
                style={isActive ? {
                  background:`${color}18`, border:`1px solid ${color}40`, color,
                } : {
                  background:"var(--surface)", border:"1px solid var(--border)", color:"var(--text-muted)",
                }}
              >
                {cat==="ALL"?"All":cat} <span className="ml-1 opacity-60">{count}</span>
              </button>
            );
          })}
        </div>
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color:"var(--text-muted)" }} />
          <input type="text" value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search menu…"
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl outline-none transition-all"
            style={{ background:"var(--surface)", border:"1px solid var(--border)", color:"var(--text)", caretColor:"#e8a045" }}
          />
        </div>
      </motion.div>

      {/* Categories, each grouping its items */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex gap-1.5">
            {[0,1,2].map(i => (
              <motion.div key={i} className="w-2 h-2 rounded-full" style={{ background:"#e8a045" }}
                animate={{ opacity:[0.2,1,0.2] }} transition={{ duration:1.2, repeat:Infinity, delay:i*0.2 }} />
            ))}
          </div>
        </div>
      ) : grouped.length===0 ? (
        <div className="flex flex-col items-center justify-center py-20" style={{ color:"var(--text-muted)" }}>
          <UtensilsCrossed className="h-10 w-10 mb-3 opacity-20" />
          <p className="text-sm">No items found</p>
        </div>
      ) : (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.2 }} className="space-y-5">
          <AnimatePresence mode="popLayout">
            {grouped.map((group, gi) => {
              const catColor = CAT_COLOR[group.category] ?? "#e8a045";
              const emoji = CAT_EMOJI[group.category] ?? "🍽️";
              return (
                <motion.div key={group.category}
                  initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
                  transition={{ delay:gi*0.05 }}
                  className="rounded-2xl overflow-hidden card-glow"
                  style={{ background:"var(--surface)", border:"1px solid var(--border)" }}
                >
                  {/* Category flashcard header — groups every item of this category */}
                  <div className="flex items-center gap-3 px-5 py-4"
                    style={{ borderBottom:"1px solid var(--border)", background:`linear-gradient(90deg, ${catColor}14, transparent)` }}>
                    <div className="h-9 w-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                      style={{ background:`${catColor}1c`, color:catColor }}>
                      {emoji}
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-sm font-bold font-serif capitalize" style={{ color:"var(--text)" }}>{group.category}</h2>
                      <p className="text-[11px]" style={{ color:"var(--text-muted)" }}>
                        {group.items.length} item{group.items.length===1?"":"s"} · {group.items.filter(i=>i.is_available).length} available
                      </p>
                    </div>
                  </div>

                  {/* Items belonging to this category — click a name to reveal its flavours */}
                  <div>
                    {group.items.map((item, ii) => {
                      const isOpen = expandedItems.has(item.id);
                      return (
                        <div key={item.id} style={ii>0 ? { borderTop:"1px solid var(--border)" } : undefined}>
                          <button onClick={() => toggleExpand(item.id)}
                            className="w-full flex items-center justify-between gap-3 px-5 py-3.5 text-left transition-colors"
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-2)"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}>
                            <div className="flex items-center gap-2.5 min-w-0">
                              <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 transition-transform"
                                style={{ color:"var(--text-faint)", transform: isOpen ? "rotate(90deg)" : "rotate(0deg)" }} />
                              <span className="text-sm font-semibold truncate"
                                style={{ color: item.is_available ? "var(--text)" : "var(--text-muted)" }}>
                                {item.name}
                              </span>
                              {!item.is_available && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0"
                                  style={{ background:"var(--surface-3)", color:"var(--text-muted)" }}>Off menu</span>
                              )}
                              {item.customizations.length > 0 && (
                                <span className="text-[10px] flex-shrink-0 hidden sm:inline" style={{ color:"var(--text-faint)" }}>
                                  {item.customizations.length} flavour{item.customizations.length===1?"":"s"}
                                </span>
                              )}
                            </div>
                            <span className="text-sm font-bold font-serif flex-shrink-0" style={{ color:catColor }}>
                              {formatCurrency(item.price)}
                            </span>
                          </button>

                          {/* Expanded: full detail + every flavour/option for this item */}
                          <AnimatePresence initial={false}>
                            {isOpen && (
                              <motion.div initial={{ height:0, opacity:0 }} animate={{ height:"auto", opacity:1 }}
                                exit={{ height:0, opacity:0 }} transition={{ duration:0.2 }} className="overflow-hidden">
                                <div className="px-5 pb-4 pl-11 space-y-3">
                                  <p className="text-xs leading-relaxed" style={{ color:"var(--text-muted)" }}>
                                    {item.description || "No description"}
                                  </p>

                                  {item.customizations.length > 0 && (
                                    <div>
                                      <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color:"var(--text-faint)" }}>
                                        Flavours &amp; Options
                                      </p>
                                      <div className="flex flex-wrap gap-1.5">
                                        {item.customizations.map(c => (
                                          <span key={c} className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full"
                                            style={{ background:`${catColor}14`, color:catColor, border:`1px solid ${catColor}33` }}>
                                            <Tag className="h-2.5 w-2.5" />{c}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  <div className="flex items-center justify-between pt-3" style={{ borderTop:"1px solid var(--border)" }}>
                                    <button onClick={() => handleToggle(item)} className="flex items-center gap-2 text-xs font-medium">
                                      <div className="relative w-9 h-5 rounded-full transition-colors flex-shrink-0"
                                        style={{ background: item.is_available ? "#22c55e" : "var(--surface-3)" }}>
                                        <span className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
                                          style={{ transform: item.is_available ? "translateX(16px)" : "translateX(0)" }} />
                                      </div>
                                      <span style={{ color: item.is_available ? "#4ade80" : "var(--text-muted)" }}>
                                        {item.is_available ? "Available" : "Off menu"}
                                      </span>
                                    </button>
                                    <div className="flex gap-1">
                                      <button onClick={() => openEdit(item)}
                                        className="p-2 rounded-xl transition-all"
                                        style={{ color:"var(--text-muted)" }}
                                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background="rgba(232,160,69,0.12)"; (e.currentTarget as HTMLButtonElement).style.color="#e8a045"; }}
                                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background="transparent"; (e.currentTarget as HTMLButtonElement).style.color="var(--text-muted)"; }}>
                                        <Pencil className="h-3.5 w-3.5" />
                                      </button>
                                      <button onClick={() => setDeleteTarget(item)}
                                        className="p-2 rounded-xl transition-all"
                                        style={{ color:"var(--text-muted)" }}
                                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background="rgba(239,68,68,0.12)"; (e.currentTarget as HTMLButtonElement).style.color="#f87171"; }}
                                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background="transparent"; (e.currentTarget as HTMLButtonElement).style.color="var(--text-muted)"; }}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Item" : "New Menu Item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-1">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color:"var(--text-muted)" }}>Name *</label>
              <input type="text" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}
                placeholder="e.g. Sourdough Loaf"
                className="h-10 w-full rounded-xl px-3 text-sm outline-none"
                style={{ background:"var(--surface-2)", border:"1px solid var(--border)", color:"var(--text)", caretColor:"#e8a045" }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color:"var(--text-muted)" }}>Price (₹) *</label>
              <input type="number" value={form.price} onChange={e=>setForm({...form,price:e.target.value})}
                placeholder="250"
                className="h-10 w-full rounded-xl px-3 text-sm outline-none"
                style={{ background:"var(--surface-2)", border:"1px solid var(--border)", color:"var(--text)", caretColor:"#e8a045" }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color:"var(--text-muted)" }}>Category</label>

              <select value={form.category} onChange={e => setForm({...form,category:e.target.value})}
                className="h-10 w-full rounded-xl px-3 text-sm outline-none capitalize"
                style={{ background:"var(--surface-2)", border:"1px solid var(--border)", color:"var(--text)" }}>
                {CATEGORIES.map(c => <option key={c} value={c} className="bg-zinc-900 capitalize">{c}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color:"var(--text-muted)" }}>Description</label>
              <textarea value={form.description} onChange={e => setForm({...form,description:e.target.value})}
                placeholder="Brief description…" rows={2}
                className="w-full rounded-xl px-3 py-2 text-sm outline-none resize-none"
                style={{ background:"var(--surface-2)", border:"1px solid var(--border)", color:"var(--text)", caretColor:"#e8a045" }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color:"var(--text-muted)" }}>Customizations (comma-separated)</label>
              <input type="text" value={form.customizations} onChange={e=>setForm({...form,customizations:e.target.value})}
                placeholder="no sugar, extra icing…"
                className="h-10 w-full rounded-xl px-3 text-sm outline-none"
                style={{ background:"var(--surface-2)", border:"1px solid var(--border)", color:"var(--text)", caretColor:"#e8a045" }}
              />
            </div>

            <div className="flex items-center justify-between rounded-xl px-4 py-3"
              style={{ background:"var(--surface-2)", border:"1px solid var(--border)" }}>
              <span className="text-sm" style={{ color:"var(--text)" }}>Available for ordering</span>
              <button type="button" onClick={() => setForm({...form,is_available:!form.is_available})}
                className="relative w-11 h-6 rounded-full transition-colors"
                style={{ background: form.is_available ? "#22c55e" : "var(--surface-3)" }}>
                <span className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
                  style={{ transform: form.is_available ? "translateX(20px)" : "translateX(0)" }} />
              </button>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setDialogOpen(false)} disabled={saving}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={{ background:"var(--surface-2)", border:"1px solid var(--border)", color:"var(--text-muted)" }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{ background:"linear-gradient(135deg,#e8a045,#c4622d)", color:"#fff", opacity:saving?0.7:1 }}>
              {saving ? "Saving…" : editing ? "Save Changes" : "Add Item"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        {deleteTarget && (
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Remove Item</DialogTitle></DialogHeader>
            <p className="text-sm py-2" style={{ color:"var(--text-muted)" }}>
              Remove <span className="font-semibold" style={{ color:"var(--text)" }}>{deleteTarget.name}</span> from the menu?
            </p>
            <DialogFooter>
              <button onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium"
                style={{ background:"var(--surface-2)", border:"1px solid var(--border)", color:"var(--text-muted)" }}>
                Cancel
              </button>
              <button onClick={() => handleDelete(deleteTarget)}
                className="px-4 py-2 rounded-xl text-sm font-semibold"
                style={{ background:"rgba(239,68,68,0.15)", border:"1px solid rgba(239,68,68,0.30)", color:"#f87171" }}>
                Remove
              </button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
