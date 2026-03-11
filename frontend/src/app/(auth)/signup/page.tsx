import { notFound } from 'next/navigation';
import SignupForm from './signup-form';

export default function SignupPage() {
  if (process.env.NEXT_PUBLIC_INDEPENDENT_STUDENTS_ENABLED !== 'true') {
    notFound();
  }
  return <SignupForm />;
}
