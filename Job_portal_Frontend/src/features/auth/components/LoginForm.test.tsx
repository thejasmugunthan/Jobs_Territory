import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "./LoginForm";

const loginMock = vi.hoisted(() => vi.fn());
vi.mock("../hooks/useAuth", () => ({ useAuth: () => ({ login: loginMock }) }));

describe("LoginForm", () => {
  beforeEach(() => loginMock.mockReset());

  it("calls the auth action and redirects after success", async () => {
    loginMock.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={["/login"]}><Routes><Route path="/login" element={<LoginForm />} /><Route path="/dashboard" element={<div>Dashboard workspace</div>} /></Routes></MemoryRouter>);
    await user.type(screen.getByLabelText("Email address"), "candidate@example.com");
    await user.type(screen.getByLabelText("Password"), "StrongPassword123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));
    await screen.findByText("Dashboard workspace");
    expect(loginMock).toHaveBeenCalledWith({ email: "candidate@example.com", password: "StrongPassword123" });
  });

});
