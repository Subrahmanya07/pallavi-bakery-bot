"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ChefHat, KeyRound, Loader2 } from "lucide-react";
import { setAdminKey, verifyAdminKey } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!key.trim()) return;
    setChecking(true);
    setError("");
    try {
      const ok = await verifyAdminKey(key.trim());
      if (!ok) {
        setError("That key was rejected. Double-check ADMIN_API_KEY and try again.");
        return;
      }
      setAdminKey(key.trim());
      router.replace("/dashboard");
    } catch {
      setError("Couldn't reach the backend. Is it running?");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--bg)" }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="w-full max-w-sm rounded-3xl overflow-hidden card-glow"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>

        <div className="px-8 pt-10 pb-6 flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            className="relative w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "linear-gradient(135deg, #e8a045 0%, #c4622d 100%)", boxShadow: "0 8px 32px rgba(232,160,69,0.40)" }}>
            <ChefHat className="h-8 w-8 text-white" />
          </motion.div>
          <h1 className="text-2xl font-bold font-serif" style={{ color: "var(--text)" }}>Bakery Admin</h1>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Enter your admin key to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="px-8 pb-9 space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Admin API Key</label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: "var(--text-muted)" }} />
              <input
                type="password"
                value={key}
                onChange={e => { setKey(e.target.value); setError(""); }}
                placeholder="Paste your X-Admin-Key…"
                autoFocus
                className="w-full h-11 pl-9 pr-4 rounded-xl text-sm outline-none transition-all"
                style={{
                  background: "var(--surface-2)",
                  border: error ? "1px solid rgba(239,68,68,0.45)" : "1px solid var(--border)",
                  color: "var(--text)",
                  caretColor: "#e8a045",
                  boxShadow: key ? "0 0 0 3px rgba(232,160,69,0.12)" : "none",
                }}
              />
            </div>
            {error && <p className="text-xs" style={{ color: "#f87171" }}>{error}</p>}
          </div>

          <button type="submit" disabled={checking || !key.trim()}
            className="w-full h-11 flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: "linear-gradient(135deg,#e8a045,#c4622d)",
              color: "#fff",
              boxShadow: "0 4px 20px rgba(232,160,69,0.30)",
              opacity: checking || !key.trim() ? 0.6 : 1,
            }}>
            {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            {checking ? "Verifying…" : "Unlock Console"}
          </button>

          <p className="text-[11px] text-center leading-relaxed" style={{ color: "var(--text-faint)" }}>
            This is the same <code>ADMIN_API_KEY</code> configured on the bakery backend.
            It's kept only for this browser session.
          </p>
        </form>
      </motion.div>
    </div>
  );
}
