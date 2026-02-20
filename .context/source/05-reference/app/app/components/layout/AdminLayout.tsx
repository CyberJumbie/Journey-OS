import { ReactNode } from "react";
import AdminSidebar from "./AdminSidebar";

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="flex min-h-screen bg-[var(--cream)]">
      <AdminSidebar />
      <main className="flex-1 p-8 overflow-auto bg-[var(--cream)]">{children}</main>
    </div>
  );
}