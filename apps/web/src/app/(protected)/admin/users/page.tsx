import type { Metadata } from "next";
import { GlobalUserDirectory } from "@web/components/admin/global-user-directory";

export const metadata: Metadata = {
  title: "User Directory — Journey OS Admin",
  description: "Manage all users across institutions.",
};

export default function AdminUsersPage() {
  return (
    <div className="min-h-screen bg-[#f5f3ef] p-6">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-6 font-serif text-2xl font-bold text-[#002c76]">
          User Directory
        </h1>
        <GlobalUserDirectory />
      </div>
    </div>
  );
}
