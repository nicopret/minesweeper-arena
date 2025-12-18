import React from "react";
import { Provider } from "react-redux";
import { render, screen, act } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import HighscoresPanel from "./HighscoresPanel";
import { store } from "../../store/store";
import { clearUser, setHighscores, setUser } from "../../store/authSlice";

const renderWithStore = (ui: React.ReactElement) =>
  render(<Provider store={store}>{ui}</Provider>);

describe("HighscoresPanel", () => {
  afterEach(() => {
    store.dispatch(clearUser());
    store.dispatch(setHighscores([]));
  });

  it("shows sorted highscores and playing days subtitle", () => {
    const createdAt = new Date(
      Date.now() - 10 * 24 * 60 * 60 * 1000,
    ).toISOString();
    act(() => {
      store.dispatch(
        setUser({
          firstName: "Nico",
          userId: "u_123",
          createdAt,
        }),
      );
      store.dispatch(
        setHighscores([
          { levelId: "medium-16x16", highScore: 400 },
          { levelId: "easy-9x9", highScore: 900 },
        ]),
      );
    });

    renderWithStore(<HighscoresPanel />);

    expect(screen.getByText(/Highscores/i)).toBeInTheDocument();
    expect(screen.getByText(/Playing now for 10 days/i)).toBeInTheDocument();
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent(/easy/i);
    expect(items[0]).toHaveTextContent("900");
  });

  it("shows member since subtitle and empty state when no scores", () => {
    act(() => {
      store.dispatch(
        setUser({
          firstName: "Nico",
          userId: "u_123",
          createdAt: "2024-01-01T00:00:00.000Z",
        }),
      );
      store.dispatch(setHighscores([]));
    });

    renderWithStore(<HighscoresPanel />);

    expect(screen.getByText(/Member since/i)).toBeInTheDocument();
    expect(screen.getByText(/No highscores yet/i)).toBeInTheDocument();
  });
});
