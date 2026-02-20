import type { Metadata } from "next";
import { LandingPage } from "@web/components/landing/landing-page";

export const metadata: Metadata = {
  title: "Journey OS — Assessment Intelligence for Medical Education",
  description:
    "Every thread of your curriculum, woven into one connected system. AI-powered assessment generation, curriculum mapping, and student mastery tracking for medical schools.",
};

/**
 * Root page: renders the landing page for unauthenticated users.
 * Middleware redirects authenticated users to their role dashboard.
 */
// Next.js App Router requires default export for pages
export default function Home() {
  return <LandingPage />;
}
