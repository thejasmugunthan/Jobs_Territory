import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { TextField } from "./TextField";

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  error?: string;
}

export const PasswordField = forwardRef<HTMLInputElement, Props>(function PasswordField({ label, error, ...props }, ref) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="password-field">
      <TextField {...props} ref={ref} label={label} type={visible ? "text" : "password"} error={error} leading={<LockKeyhole size={17} />} />
      <button className="password-toggle" type="button" onClick={() => setVisible((value) => !value)} aria-label={visible ? "Hide password" : "Show password"}>
        {visible ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  );
});
