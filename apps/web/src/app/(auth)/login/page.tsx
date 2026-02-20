import type { Metadata } from "next";
import { LoginForm } from "@web/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign In — Journey OS",
  description: "Sign in to your Journey OS account.",
};

// Next.js App Router requires default export for pages
export default function LoginPage() {
  return <LoginForm />;
}
