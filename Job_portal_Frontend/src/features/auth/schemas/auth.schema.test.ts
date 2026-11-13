import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema } from "./auth.schema";

describe("registration validation", () => {
  it("accepts a valid candidate registration payload", () => {
    const result = registerSchema.safeParse({
      full_name: "Jordan Rivera",
      email: "jordan@example.com",
      password: "StrongPassword123",
      confirm_password: "StrongPassword123",
      accept_terms: true,
    });
    expect(result.success).toBe(true);
  });

  it.each([
    [{ full_name: "Jordan", email: "bad-email", password: "StrongPassword123", confirm_password: "StrongPassword123", accept_terms: true }, "email"],
    [{ full_name: "Jordan", email: "jordan@example.com", password: "weak", confirm_password: "weak", accept_terms: true }, "password"],
    [{ full_name: "Jordan", email: "jordan@example.com", password: "StrongPassword123", confirm_password: "DifferentPassword123", accept_terms: true }, "confirm_password"],
    [{ full_name: "Jordan", email: "jordan@example.com", password: "StrongPassword123", confirm_password: "StrongPassword123", accept_terms: false }, "accept_terms"],
  ])("rejects invalid registration with an issue on %s", (payload) => {
    const result = registerSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });
});

describe("login validation", () => {
  it("rejects empty and malformed credentials", () => {
    expect(loginSchema.safeParse({ email: "not-email", password: "" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "jordan@example.com", password: "password" }).success).toBe(true);
  });
});
