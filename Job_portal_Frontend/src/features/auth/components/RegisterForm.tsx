import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Mail, UserRound } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "../../../components/common/Button";
import { PasswordField } from "../../../components/common/PasswordField";
import { TextField } from "../../../components/common/TextField";
import { getApiErrorMessage } from "../../../services/api";
import { registerSchema, type RegisterFormValues } from "../schemas/auth.schema";
import { useAuth } from "../hooks/useAuth";

export function RegisterForm() {
  const { register: createAccount } = useAuth();
  const navigate = useNavigate();
  const form = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema), defaultValues: { full_name: "", email: "", password: "", confirm_password: "", accept_terms: false as never } });

  const onSubmit = form.handleSubmit(async ({ full_name, email, password }) => {
    try {
      await createAccount({ full_name, email, password });
      toast.success("Your account is ready. Sign in to continue.");
      navigate("/login", { replace: true, state: { email } });
    } catch (error) {
      toast.error(getApiErrorMessage(error, "We couldn’t create your account. Please try again."));
    }
  });

  return <form className="auth-form auth-form-compact" onSubmit={onSubmit} noValidate>
    <TextField label="Full name" autoComplete="name" placeholder="Your name" leading={<UserRound size={17} />} error={form.formState.errors.full_name?.message} {...form.register("full_name")} />
    <TextField label="Email address" type="email" autoComplete="email" placeholder="you@example.com" leading={<Mail size={17} />} error={form.formState.errors.email?.message} {...form.register("email")} />
    <PasswordField label="Create password" autoComplete="new-password" placeholder="At least 12 characters" error={form.formState.errors.password?.message} {...form.register("password")} />
    <PasswordField label="Confirm password" autoComplete="new-password" placeholder="Re-enter your password" error={form.formState.errors.confirm_password?.message} {...form.register("confirm_password")} />
    <label className={`terms-checkbox ${form.formState.errors.accept_terms ? "terms-error" : ""}`}><input type="checkbox" {...form.register("accept_terms")} /><span>I agree to the <Link to="/terms">Terms of Service</Link> and <Link to="/privacy">Privacy Policy</Link>.</span></label>
    {form.formState.errors.accept_terms && <p className="field-error" role="alert">{form.formState.errors.accept_terms.message}</p>}
    <p className="password-guidance">Use 12+ characters with an uppercase letter, lowercase letter, and number.</p>
    <Button type="submit" size="lg" loading={form.formState.isSubmitting} className="auth-submit">Create account <ArrowRight size={17} /></Button>
    <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
  </form>;
}
