import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Mail } from "lucide-react";
import type { FormEvent } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "../../../components/common/Button";
import { PasswordField } from "../../../components/common/PasswordField";
import { TextField } from "../../../components/common/TextField";
import { getApiErrorMessage } from "../../../services/api";
import { loginSchema, type LoginFormValues } from "../schemas/auth.schema";
import { useAuth } from "../hooks/useAuth";

export function LoginForm() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const form = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: (location.state as { email?: string } | null)?.email ?? "", password: "" } });

  const onSubmit = form.handleSubmit(async ({ email, password }) => {
    try {
      await login({ email, password });
      toast.success("Welcome back");
      const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/dashboard";
      navigate(from, { replace: true });
    } catch (error) {
      toast.error(getApiErrorMessage(error, "We couldn’t sign you in. Check your details and try again."));
    }
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    void onSubmit(event).catch((error: unknown) => toast.error(getApiErrorMessage(error, "We couldn’t sign you in. Check your details and try again.")));
  };

  return <form className="auth-form" onSubmit={handleSubmit} noValidate>
    <TextField label="Email address" type="email" autoComplete="email" placeholder="you@example.com" leading={<Mail size={17} />} error={form.formState.errors.email?.message} {...form.register("email")} />
    <div className="form-field-stack"><PasswordField label="Password" autoComplete="current-password" placeholder="Enter your password" error={form.formState.errors.password?.message} {...form.register("password")} /><div className="form-meta-row"><span /><Link className="text-link" to="/forgot-password">Forgot password?</Link></div></div>
    <Button type="submit" size="lg" loading={form.formState.isSubmitting} className="auth-submit">Sign in <ArrowRight size={17} /></Button>
    <p className="auth-switch">New to Jobs Territory? <Link to="/register">Create an account</Link></p>
  </form>;
}
