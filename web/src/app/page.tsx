"use client";

import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { ChefHat, MessageCircle, Smartphone, Globe, ShoppingBag } from "lucide-react";

const BOT_URL = "https://t.me/pallavi_bakery_order_bot";

const FEATURES = [
  { icon: ShoppingBag, label: "Browse menu" },
  { icon: MessageCircle, label: "Chat to order" },
  { icon: ChefHat, label: "Track your order" },
];

export default function LandingPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: "linear-gradient(160deg, #0c0b09 0%, #131110 60%, #1a1208 100%)" }}
    >
      {/* Brand */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center mb-10"
      >
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center mb-4"
          style={{
            background: "linear-gradient(135deg, #e8a045 0%, #c4622d 100%)",
            boxShadow: "0 8px 40px rgba(232,160,69,0.40)",
          }}
        >
          <ChefHat className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl font-bold font-serif text-white tracking-tight">Pallavi Bakery</h1>
        <p className="text-sm mt-2" style={{ color: "#7a7060" }}>Fresh baked — order in minutes</p>
      </motion.div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="w-full max-w-sm rounded-3xl overflow-hidden"
        style={{
          background: "rgba(28, 25, 22, 0.95)",
          border: "1px solid rgba(210,150,60,0.15)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
        }}
      >
        {/* QR section */}
        <div className="flex flex-col items-center px-8 pt-8 pb-6">
          <p className="text-xs font-semibold tracking-widest uppercase mb-5" style={{ color: "#7a7060" }}>
            Scan to order
          </p>

          <div className="p-4 rounded-2xl" style={{ background: "white", boxShadow: "0 4px 24px rgba(0,0,0,0.3)" }}>
            <QRCodeSVG
              value={BOT_URL}
              size={180}
              bgColor="#ffffff"
              fgColor="#1a0f00"
              level="M"
            />
          </div>

          {/* Routing hint */}
          <div className="flex items-center gap-4 mt-5">
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(232,160,69,0.12)" }}>
                <Smartphone className="w-4 h-4" style={{ color: "#e8a045" }} />
              </div>
              <p className="text-[10px] text-center leading-tight" style={{ color: "#7a7060" }}>
                Opens<br />Telegram app
              </p>
            </div>

            <span className="text-lg mb-4" style={{ color: "#2a2420" }}>or</span>

            <div className="flex flex-col items-center gap-1.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(232,160,69,0.12)" }}>
                <Globe className="w-4 h-4" style={{ color: "#e8a045" }} />
              </div>
              <p className="text-[10px] text-center leading-tight" style={{ color: "#7a7060" }}>
                Opens in<br />your browser
              </p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "rgba(210,150,60,0.10)", margin: "0 24px" }} />

        {/* CTA */}
        <div className="px-6 py-6">
          <a
            href={BOT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 w-full rounded-2xl text-white font-semibold text-sm active:scale-95 transition-transform"
            style={{
              background: "linear-gradient(135deg, #e8a045 0%, #c4622d 100%)",
              boxShadow: "0 6px 24px rgba(232,160,69,0.35)",
              padding: "14px 0",
              textDecoration: "none",
            }}
          >
            <MessageCircle className="w-5 h-5" />
            Start ordering on Telegram
          </a>
          <p className="text-center text-[11px] mt-3" style={{ color: "#3a342c" }}>
            No app? No problem — opens in your browser
          </p>
        </div>
      </motion.div>

      {/* Feature pills */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="flex gap-3 mt-8 flex-wrap justify-center"
      >
        {FEATURES.map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
            style={{
              background: "rgba(28,25,22,0.8)",
              border: "1px solid rgba(210,150,60,0.10)",
              color: "#7a7060",
            }}
          >
            <Icon className="w-3.5 h-3.5" style={{ color: "#e8a045" }} />
            {label}
          </div>
        ))}
      </motion.div>

      {/* Subtle admin link */}
      <p className="mt-10 text-[11px]">
        <a href="/dashboard" style={{ color: "#2a2420", textDecoration: "none" }}>
          Admin →
        </a>
      </p>
    </div>
  );
}
