import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(12, "Use at least 12 characters")
  .max(128, "Password must be 128 characters or fewer")
  .refine((value) => /[a-z]/.test(value), "Add a lowercase letter")
  .refine((value) => /[A-Z]/.test(value), "Add an uppercase letter")
  .refine((value) => /\d/.test(value), "Add a number");

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Enter your email or username")
    .refine((val) => val.includes("@") || val.length >= 3, "Enter a valid email or username"),
  password: z.string().min(1, "Password is required").max(128),
});

export const registerSchema = z
  .object({
    full_name: z.string().trim().min(1, "Full name is required").max(160),
    email: z.string().trim().email("Enter a valid email address"),
    password: passwordSchema,
    confirm_password: z.string(),
    accept_terms: z.literal(true, { errorMap: () => ({ message: "Please accept the terms to continue" }) }),
  })
  .refine((values) => values.password === values.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

export const resetSchema = z
  .object({ password: passwordSchema, confirm_password: z.string() })
  .refine((values) => values.password === values.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type ResetFormValues = z.infer<typeof resetSchema>;
