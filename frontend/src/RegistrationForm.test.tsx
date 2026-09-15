import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getStoredApiKey, clearStoredApiKey } from "./apiKey";
import { RegistrationForm } from "./RegistrationForm";
import * as documentsApi from "./api/documents";

vi.mock("./api/documents", async () => {
  const actual = await vi.importActual<typeof import("./api/documents")>("./api/documents");
  return {
    ...actual,
    registerUser: vi.fn(),
  };
});

const mockedRegisterUser = documentsApi.registerUser as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockedRegisterUser.mockReset();
  clearStoredApiKey();
});

afterEach(() => {
  vi.restoreAllMocks();
  clearStoredApiKey();
});

describe("RegistrationForm", () => {
  it("stores the returned key after successful registration (task 6.1)", async () => {
    mockedRegisterUser.mockResolvedValue({
      ok: true,
      user: { id: "user-1", name: "Alice", api_key: "raw-key-abc" },
    });
    const onRegistered = vi.fn();

    render(<RegistrationForm onRegistered={onRegistered} />);
    await userEvent.type(screen.getByLabelText(/name/i), "Alice");
    await userEvent.click(screen.getByRole("button", { name: /register/i }));

    await waitFor(() => expect(getStoredApiKey()).toBe("raw-key-abc"));
    expect(onRegistered).toHaveBeenCalledTimes(1);
  });

  it("shows an error and does not store a key when registration fails", async () => {
    mockedRegisterUser.mockResolvedValue({ ok: false, detail: "Name is required." });
    const onRegistered = vi.fn();

    render(<RegistrationForm onRegistered={onRegistered} />);
    await userEvent.type(screen.getByLabelText(/name/i), "Bob");
    await userEvent.click(screen.getByRole("button", { name: /register/i }));

    expect(await screen.findByText("Name is required.")).toBeInTheDocument();
    expect(getStoredApiKey()).toBeNull();
    expect(onRegistered).not.toHaveBeenCalled();
  });
});
