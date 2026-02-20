import type { Metadata } from "next";
import { RegistrationWizard } from "@web/components/auth/registration-wizard";

export const metadata: Metadata = {
  title: "Register — Journey OS",
  description: "Create your Journey OS account.",
};

export default function RegisterPage() {
  return <RegistrationWizard />;
}
