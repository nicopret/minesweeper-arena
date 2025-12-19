import React from "react";
import { Provider } from "react-redux";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, act } from "@testing-library/react";
import GoogleLoginPanel from "./GoogleLoginPanel";
import { store } from "../../store/store";
import { clearUser, setHighscores, setUser } from "../../store/authSlice";

describe("GoogleLoginPanel", () => {
  afterEach(() => {
    store.dispatch(clearUser());
    store.dispatch(setHighscores([]));
  });

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

    act(() => {
      store.dispatch(
        setUser({
          firstName: "Nico",
          pictureUrl: "https://example.com/avatar.png",
        }),
      );
    });

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
