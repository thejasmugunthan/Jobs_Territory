import { AuthShell } from "../features/auth/components/AuthShell";
import { LoginForm } from "../features/auth/components/LoginForm";

export default function LoginPage() {
  return <AuthShell title="Welcome back" subtitle="Sign in to pick up where your career journey left off." footer={<p className="auth-footnote">Your next opportunity could be one thoughtful step away.</p>}><LoginForm /></AuthShell>;
}
