import Sidebar from "@/components/Sidebar";
import "../globals.css";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
