"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getAdminKey } from "@/lib/auth";

/** Blocks rendering of admin pages until a key is present in this session. */
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (getAdminKey()) {
      setReady(true);
    } else {
      router.replace("/login");
    }
  }, [router]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: "#e8a045" }} />
      </div>
    );
  }

  return <>{children}</>;
}
