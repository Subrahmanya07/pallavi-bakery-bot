import AuthGate from "@/components/AuthGate";
import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGate>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 min-w-0 min-h-screen p-6 sm:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </AuthGate>
  );
}
