import React from "react";
import { Provider } from "react-redux";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import GoogleLoginPanel from "./GoogleLoginPanel";
import { store } from "../../store/store";
import { setUser } from "../../store/authSlice";

describe("GoogleLoginPanel", () => {
  it("shows an avatar button when logged in and reveals logout option on click", async () => {
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = "test-client-id";

    window.google = {
      accounts: {
        id: {
          initialize: vi.fn(),
          renderButton: vi.fn(),
          disableAutoSelect: vi.fn(),
        },
      },
    };

    store.dispatch(
      setUser({
        firstName: "Nico",
        pictureUrl: "https://example.com/avatar.png",
      }),
    );

    render(
      <Provider store={store}>
        <GoogleLoginPanel />
      </Provider>,
    );

    expect(screen.queryByText(/Hi,/i)).not.toBeInTheDocument();
    const avatarButton = screen.getByRole("button", {
      name: /open account menu/i,
    });
    expect(avatarButton).toBeInTheDocument();

    fireEvent.click(avatarButton);
    expect(
      screen.getByRole("button", { name: /sign out/i }),
    ).toBeInTheDocument();
  });
});
