import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "../components/common/Button";
import { PasswordField } from "../components/common/PasswordField";
import { AuthShell } from "../features/auth/components/AuthShell";
import { resetSchema, type ResetFormValues } from "../features/auth/schemas/auth.schema";
import { authService } from "../features/auth/services/auth.service";
import { getApiErrorMessage } from "../services/api";

export default function ResetPasswordPage() {
  const [search] = useSearchParams();
  const [complete, setComplete] = useState(false);
  const navigate = useNavigate();
  const token = search.get("token") ?? "";
  const form = useForm<ResetFormValues>({ resolver: zodResolver(resetSchema), defaultValues: { password: "", confirm_password: "" } });
  const submit = form.handleSubmit(async ({ password }) => {
    if (token.length < 20) {
      toast.error("This reset link is missing or invalid.");
      return;
    }
    try {
      const message = await authService.resetPassword(token, password);
      setComplete(true);
      toast.success(message);
      window.setTimeout(() => navigate("/login", { replace: true }), 1200);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "This reset link may have expired."));
    }
  });
  return <AuthShell title={complete ? "Password updated" : "Choose a new password"} subtitle={complete ? "Your password is ready to use." : "Set a new password for your Jobs Territory account."} footer={<p className="auth-footnote">Use a password you don’t use on another site.</p>}>
    {!complete && token.length >= 20 ? <form className="auth-form" onSubmit={submit}><PasswordField label="New password" autoComplete="new-password" placeholder="At least 12 characters" error={form.formState.errors.password?.message} {...form.register("password")} /><PasswordField label="Confirm new password" autoComplete="new-password" placeholder="Re-enter your password" error={form.formState.errors.confirm_password?.message} {...form.register("confirm_password")} /><Button type="submit" size="lg" loading={form.formState.isSubmitting} className="auth-submit">Save new password</Button></form> : <p className="reset-success">{complete ? "You can now sign in with your new password." : "This reset link is invalid. Request a new link to continue."}</p>}
    <Link className="auth-back-link" to="/login"><ArrowLeft size={16} /> Back to sign in</Link>
  </AuthShell>;
}
