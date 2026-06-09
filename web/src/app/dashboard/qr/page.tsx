"use client";

import { useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { QRCodeSVG, QRCodeCanvas } from "qrcode.react";
import { Download, ExternalLink, QrCode, Copy, Check } from "lucide-react";
import { useState } from "react";

const BOT_URL = "https://t.me/pallavi_bakery_order_bot";
const QR_SIZE = 280;

export default function QRPage() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const downloadPNG = useCallback(() => {
    // QRCodeCanvas renders a <canvas> — grab it and export as PNG
    const canvas = canvasRef.current?.querySelector("canvas");
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = "pallavi-bakery-qr.png";
    a.click();
  }, []);

  const downloadSVG = useCallback(() => {
    const svgEl = document.getElementById("qr-svg-export");
    if (!svgEl) return;
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svgEl);
    const blob = new Blob([svgStr], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pallavi-bakery-qr.svg";
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const copyLink = useCallback(async () => {
    await navigator.clipboard.writeText(BOT_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #e8a045, #c4622d)" }}>
            <QrCode className="h-4 w-4 text-white" />
          </div>
          <h1 className="text-2xl font-bold font-serif" style={{ color: "var(--text)" }}>QR Code</h1>
        </div>
        <p className="text-sm ml-11" style={{ color: "var(--text-muted)" }}>
          Print and display this — customers scan to open the bot in Telegram or browser
        </p>
      </motion.div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        {/* QR preview card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1 }}
          className="rounded-2xl p-6 flex flex-col items-center gap-5"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          {/* Visible QR (SVG, crisp at any size) */}
          <div className="p-5 rounded-2xl" style={{ background: "white", boxShadow: "0 4px 24px rgba(0,0,0,0.25)" }}>
            <QRCodeSVG
              id="qr-svg-export"
              value={BOT_URL}
              size={QR_SIZE}
              bgColor="#ffffff"
              fgColor="#1a0f00"
              level="M"
            />
          </div>

          {/* Hidden canvas for PNG export */}
          <div ref={canvasRef} className="hidden">
            <QRCodeCanvas value={BOT_URL} size={600} bgColor="#ffffff" fgColor="#1a0f00" level="M" />
          </div>

          <p className="text-xs text-center leading-relaxed" style={{ color: "var(--text-muted)" }}>
            Opens <strong style={{ color: "var(--text)" }}>Telegram app</strong> if installed,<br />
            otherwise opens <strong style={{ color: "var(--text)" }}>Telegram Web</strong> in browser
          </p>
        </motion.div>

        {/* Actions card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.18 }}
          className="rounded-2xl p-6 flex flex-col gap-4"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: "var(--text-faint)" }}>
            Download
          </p>

          {/* PNG download */}
          <button
            onClick={downloadPNG}
            className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-sm font-medium text-left transition-all"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(232,160,69,0.35)")}
            onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(232,160,69,0.12)" }}>
              <Download className="h-4 w-4" style={{ color: "#e8a045" }} />
            </div>
            <div>
              <p className="font-semibold leading-none">Download PNG</p>
              <p className="text-[11px] mt-1 opacity-60">600×600px — best for print</p>
            </div>
          </button>

          {/* SVG download */}
          <button
            onClick={downloadSVG}
            className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-sm font-medium text-left transition-all"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(232,160,69,0.35)")}
            onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(232,160,69,0.12)" }}>
              <Download className="h-4 w-4" style={{ color: "#e8a045" }} />
            </div>
            <div>
              <p className="font-semibold leading-none">Download SVG</p>
              <p className="text-[11px] mt-1 opacity-60">Vector — scales to any size</p>
            </div>
          </button>

          <div style={{ height: 1, background: "var(--border)" }} />

          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: "var(--text-faint)" }}>
            Share link
          </p>

          {/* Bot URL + copy */}
          <div className="flex items-center gap-2">
            <div
              className="flex-1 px-3 py-2.5 rounded-xl text-xs font-mono truncate"
              style={{ background: "var(--surface-3)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
            >
              {BOT_URL}
            </div>
            <button
              onClick={copyLink}
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
              style={{ background: copied ? "rgba(34,197,94,0.15)" : "var(--surface-2)", border: "1px solid var(--border)" }}
              title="Copy link"
            >
              {copied
                ? <Check className="h-4 w-4" style={{ color: "#4ade80" }} />
                : <Copy className="h-4 w-4" style={{ color: "var(--text-muted)" }} />}
            </button>
          </div>

          {/* Open bot link */}
          <a
            href={BOT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: "linear-gradient(135deg, #e8a045, #c4622d)",
              color: "#fff",
              textDecoration: "none",
              boxShadow: "0 4px 16px rgba(232,160,69,0.25)",
            }}
          >
            <ExternalLink className="h-4 w-4" />
            Open bot in Telegram
          </a>
        </motion.div>
      </div>

      {/* Usage tip */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.3 }}
        className="mt-6 rounded-2xl px-5 py-4"
        style={{ background: "rgba(232,160,69,0.06)", border: "1px solid rgba(232,160,69,0.12)" }}
      >
        <p className="text-xs font-semibold" style={{ color: "#e8a045" }}>💡 Where to use this QR code</p>
        <p className="text-xs mt-1.5 leading-relaxed" style={{ color: "var(--text-muted)" }}>
          Print on your menu cards, shop counter, packaging, or posters. Customers scan once —
          it automatically opens Telegram if they have the app, or Telegram Web in their browser if they don't.
          No app install required to start ordering.
        </p>
      </motion.div>
    </div>
  );
}
