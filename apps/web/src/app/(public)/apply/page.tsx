import type { Metadata } from "next";
import { ApplicationForm } from "@web/components/institution/application-form";

export const metadata: Metadata = {
  title: "Apply — Journey OS",
  description: "Submit your institution for Journey OS platform access.",
};

export default function ApplyPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-parchment px-4 py-12">
      <div className="w-full max-w-lg rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-2 font-serif text-2xl font-bold text-navy-deep">
          Apply for Platform Access
        </h1>
        <p className="mb-6 text-sm text-text-secondary">
          Submit your institution&apos;s details to join the Journey OS
          waitlist. We&apos;ll review your application and get back to you.
        </p>
        <ApplicationForm />
      </div>
    </div>
  );
}
