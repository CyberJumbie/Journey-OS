import type { Metadata } from "next";
import { RegistrationWizard } from "@web/components/auth/registration-wizard";
import { AuthLayout } from "@web/components/auth/auth-layout";

export const metadata: Metadata = {
  title: "Register — Journey OS",
  description: "Create your Journey OS account.",
};

export default function RegisterPage() {
  return (
    <AuthLayout
      headline="Choose Your Path"
      subheadline="Create your account and join a community of medical educators and learners."
    >
      <RegistrationWizard />
    </AuthLayout>
  );
}
