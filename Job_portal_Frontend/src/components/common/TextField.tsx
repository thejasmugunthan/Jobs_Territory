import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  leading?: ReactNode;
}

export const TextField = forwardRef<HTMLInputElement, Props>(function TextField(
  { label, error, hint, leading, id, className = "", ...props },
  ref,
) {
  const fieldId = id ?? props.name;
  return (
    <div className="field-wrap">
      <label className="field-label" htmlFor={fieldId}>{label}</label>
      <div className={`field-control ${leading ? "has-leading" : ""} ${error ? "field-invalid" : ""}`}>
        {leading && <span className="field-leading" aria-hidden="true">{leading}</span>}
        <input ref={ref} id={fieldId} className={`field-input ${className}`} aria-invalid={Boolean(error)} aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined} {...props} />
      </div>
      {error ? <p className="field-error" id={`${fieldId}-error`} role="alert">{error}</p> : hint ? <p className="field-hint" id={`${fieldId}-hint`}>{hint}</p> : null}
    </div>
  );
});
