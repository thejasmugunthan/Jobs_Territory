import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Mail } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";
import { Button } from "../components/common/Button";
import { TextField } from "../components/common/TextField";
import { AuthShell } from "../features/auth/components/AuthShell";
import { authService } from "../features/auth/services/auth.service";
import { getApiErrorMessage } from "../services/api";
import { toast } from "sonner";

const schema = z.object({ email: z.string().email("Enter a valid email address") });
type Values = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "" } });
  const submit = form.handleSubmit(async ({ email }) => {
    try {
      const message = await authService.forgotPassword(email);
      setSent(true);
      toast.success(message);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  });
  return <AuthShell title={sent ? "Check your inbox" : "Reset your password"} subtitle={sent ? "If an account matches that email, reset instructions are on their way." : "Enter the email address on your account and we’ll send reset instructions."} footer={<p className="auth-footnote">The response is the same whether or not an account exists.</p>}>
    {!sent ? <form className="auth-form" onSubmit={submit}><TextField label="Email address" type="email" autoComplete="email" placeholder="you@example.com" leading={<Mail size={17} />} error={form.formState.errors.email?.message} {...form.register("email")} /><Button type="submit" size="lg" loading={form.formState.isSubmitting} className="auth-submit">Send reset instructions</Button></form> : <div className="reset-success"><div className="success-check">✓</div><p>Check your email for next steps. The reset link expires after a short time.</p></div>}
    <Link className="auth-back-link" to="/login"><ArrowLeft size={16} /> Back to sign in</Link>
  </AuthShell>;
}
