import { AuthShell } from "../features/auth/components/AuthShell";
import { RegisterForm } from "../features/auth/components/RegisterForm";

export default function RegisterPage() {
  return <AuthShell title="Create your account" subtitle="A thoughtful next step toward the work you want to do." footer={<p className="auth-footnote">Your candidate profile is always in your control.</p>}><RegisterForm /></AuthShell>;
}
