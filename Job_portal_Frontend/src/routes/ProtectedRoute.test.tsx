import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProtectedRoute } from "./ProtectedRoute";

const authState = vi.hoisted(() => ({ authenticated: false, loading: false }));
vi.mock("../features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ isAuthenticated: authState.authenticated, isLoading: authState.loading }),
}));

describe("ProtectedRoute", () => {
  afterEach(() => { authState.authenticated = false; authState.loading = false; });

  it("redirects an unauthenticated visitor to login", () => {
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={["/dashboard"]}><Routes><Route element={<ProtectedRoute />}><Route path="/dashboard" element={<div>Private dashboard</div>} /></Route><Route path="/login" element={<div>Sign in page</div>} /></Routes></MemoryRouter>);
    expect(screen.getByText("Sign in page")).toBeInTheDocument();
    expect(screen.queryByText("Private dashboard")).not.toBeInTheDocument();
  });

  it("does not render protected content while auth is initializing", () => {
    authState.authenticated = false;
    authState.loading = true;
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={["/dashboard"]}><Routes><Route element={<ProtectedRoute />}><Route path="/dashboard" element={<div>Private dashboard</div>} /></Route><Route path="/login" element={<div>Sign in page</div>} /></Routes></MemoryRouter>);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByText("Private dashboard")).not.toBeInTheDocument();
  });
});
