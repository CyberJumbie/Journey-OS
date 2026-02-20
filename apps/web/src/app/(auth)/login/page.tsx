import type { Metadata } from "next";
import { LoginScreen } from "@web/components/auth/login-screen";

export const metadata: Metadata = {
  title: "Sign In — Journey OS",
  description: "Sign in to your Journey OS account.",
};

// Next.js App Router requires default export for pages
export default function LoginPage() {
  return <LoginScreen />;
}
