import type { Metadata } from "next";
import { RegistrationWizard } from "@web/components/auth/registration-wizard";

export const metadata: Metadata = {
  title: "Register — Journey OS",
  description: "Create your Journey OS account.",
};

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <RegistrationWizard />
      </div>
    </div>
  );
}
