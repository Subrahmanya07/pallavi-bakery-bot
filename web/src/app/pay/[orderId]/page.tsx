"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Script from "next/script";
import { motion } from "framer-motion";
import { ChefHat, CheckCircle, XCircle, Loader2, ShoppingBag } from "lucide-react";

interface OrderItem {
  name: string;
  quantity: number;
  unit_price: number;
  customization?: string;
}

interface PaymentOrder {
  order_id: string;
  order_number: string;
  customer_name: string;
  items: OrderItem[];
  total_amount: number;
  razorpay_order_id: string;
  razorpay_key_id: string;
  payment_status: string;
}

declare global {
  interface Window {
    Razorpay: new (options: object) => { open(): void };
  }
}

type Stage = "loading" | "ready" | "processing" | "success" | "failed" | "error" | "already_paid";

export default function PaymentPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const [stage, setStage] = useState<Stage>("loading");
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    fetch(`/api/payment/order/${orderId}`)
      .then(async (res) => {
        if (res.status === 409) { setStage("already_paid"); return; }
        if (!res.ok) { setStage("error"); return; }
        const data = await res.json();
        setOrder(data);
        setStage("ready");
      })
      .catch(() => setStage("error"));
  }, [orderId]);

  const handlePay = useCallback(() => {
    if (!order || !scriptReady) return;
    setStage("processing");

    const rzp = new window.Razorpay({
      key: order.razorpay_key_id,
      amount: Math.round(order.total_amount * 100),
      currency: "INR",
      name: "Pallavi Bakery",
      description: order.order_number,
      order_id: order.razorpay_order_id,
      prefill: { name: order.customer_name },
      theme: { color: "#e8a045" },
      handler: async (response: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      }) => {
        try {
          const res = await fetch("/api/payment/verify", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });
          setStage(res.ok ? "success" : "failed");
        } catch {
          setStage("failed");
        }
      },
      modal: { ondismiss: () => setStage("ready") },
    });
    rzp.open();
  }, [order, scriptReady]);

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onReady={() => setScriptReady(true)}
      />
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: "linear-gradient(160deg, #0c0b09 0%, #131110 60%, #1a1208 100%)" }}
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm rounded-3xl overflow-hidden"
          style={{
            background: "rgba(28,25,22,0.97)",
            border: "1px solid rgba(210,150,60,0.15)",
            boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-6 py-5" style={{ borderBottom: "1px solid rgba(210,150,60,0.08)" }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #e8a045, #c4622d)" }}>
              <ChefHat className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white font-serif">Pallavi Bakery</p>
              <p className="text-[10px]" style={{ color: "#7a7060" }}>Secure payment</p>
            </div>
          </div>

          <div className="px-6 py-6">
            {stage === "loading" && (
              <div className="flex flex-col items-center gap-3 py-8">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#e8a045" }} />
                <p className="text-sm" style={{ color: "#7a7060" }}>Loading order…</p>
              </div>
            )}

            {stage === "error" && (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <XCircle className="w-10 h-10" style={{ color: "#f87171" }} />
                <p className="text-sm font-semibold text-white">Order not found</p>
                <p className="text-xs" style={{ color: "#7a7060" }}>This payment link may have expired or is invalid.</p>
              </div>
            )}

            {stage === "already_paid" && (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <CheckCircle className="w-10 h-10" style={{ color: "#4ade80" }} />
                <p className="text-sm font-semibold text-white">Already paid!</p>
                <p className="text-xs" style={{ color: "#7a7060" }}>This order has already been paid. Thank you!</p>
              </div>
            )}

            {stage === "success" && (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
                  <CheckCircle className="w-14 h-14" style={{ color: "#4ade80" }} />
                </motion.div>
                <p className="text-lg font-bold text-white">Payment successful!</p>
                <p className="text-xs" style={{ color: "#7a7060" }}>
                  {order?.order_number} · ₹{order?.total_amount.toFixed(0)}<br />
                  We'll confirm your order shortly.
                </p>
              </div>
            )}

            {stage === "failed" && (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <XCircle className="w-10 h-10" style={{ color: "#f87171" }} />
                <p className="text-sm font-semibold text-white">Payment failed</p>
                <p className="text-xs mb-4" style={{ color: "#7a7060" }}>Something went wrong. Please try again.</p>
                <button onClick={() => setStage("ready")}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
                  style={{ background: "linear-gradient(135deg, #e8a045, #c4622d)" }}>
                  Try again
                </button>
              </div>
            )}

            {(stage === "ready" || stage === "processing") && order && (
              <>
                {/* Order summary */}
                <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: "#7a7060" }}>
                  Order summary
                </p>
                <div className="rounded-xl p-4 mb-4 space-y-2"
                  style={{ background: "rgba(232,160,69,0.05)", border: "1px solid rgba(232,160,69,0.10)" }}>
                  <p className="text-xs font-semibold" style={{ color: "#e8a045" }}>{order.order_number}</p>
                  {order.items.map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <ShoppingBag className="w-3 h-3 flex-shrink-0" style={{ color: "#7a7060" }} />
                      <span className="text-xs text-white flex-1">
                        {item.name}{item.customization ? ` (${item.customization})` : ""} ×{item.quantity}
                      </span>
                      <span className="text-xs" style={{ color: "#c8a87a" }}>
                        ₹{(item.unit_price * item.quantity).toFixed(0)}
                      </span>
                    </div>
                  ))}
                  <div className="pt-2 flex justify-between" style={{ borderTop: "1px solid rgba(210,150,60,0.10)" }}>
                    <span className="text-sm font-bold text-white">Total</span>
                    <span className="text-sm font-bold" style={{ color: "#e8a045" }}>₹{order.total_amount.toFixed(0)}</span>
                  </div>
                </div>

                <button
                  onClick={handlePay}
                  disabled={stage === "processing" || !scriptReady}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl text-white font-semibold text-sm transition-all"
                  style={{
                    background: "linear-gradient(135deg, #e8a045, #c4622d)",
                    boxShadow: "0 6px 24px rgba(232,160,69,0.30)",
                    padding: "14px 0",
                    opacity: stage === "processing" || !scriptReady ? 0.7 : 1,
                    cursor: stage === "processing" || !scriptReady ? "not-allowed" : "pointer",
                    border: "none",
                  }}
                >
                  {stage === "processing"
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
                    : <>Pay ₹{order.total_amount.toFixed(0)} securely</>
                  }
                </button>
                <p className="text-center text-[10px] mt-3" style={{ color: "#3a342c" }}>
                  Powered by Razorpay · 100% secure
                </p>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </>
  );
}
