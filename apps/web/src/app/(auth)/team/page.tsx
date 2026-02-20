import type { Metadata } from "next";
import { TeamLoginScreen } from "@web/components/auth/team-login-screen";

export const metadata: Metadata = {
  title: "Team Sign In — Journey OS",
  description: "Internal sign in for the Journey OS team.",
};

// Next.js App Router requires default export for pages
export default function TeamLoginPage() {
  return <TeamLoginScreen />;
}
