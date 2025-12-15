import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { describe, expect, it } from "vitest";
import DifficultyOptionContainer from "./DifficultyOptionContainer";
import gameReducer, { DIFFICULTIES, type GameState } from "../store/gameSlice";

const renderWithStore = (preloaded?: Partial<GameState>) => {
  const base = gameReducer(undefined, { type: "init" });
  const store = configureStore({
    reducer: { game: gameReducer },
    preloadedState: { game: { ...base, ...preloaded } },
  });

  const utils = render(
    <Provider store={store}>
      <DifficultyOptionContainer />
    </Provider>,
  );

  return { store, ...utils };
};

describe("DifficultyOptionContainer", () => {
  const getLabel = (level: keyof typeof DIFFICULTIES) =>
    `${level.charAt(0).toUpperCase() + level.slice(1)} (${DIFFICULTIES[level].rows}x${DIFFICULTIES[level].cols})`;

  it("highlights the selected difficulty from redux", () => {
    renderWithStore({ difficulty: "medium" });

    expect(
      screen.getByRole("button", { name: getLabel("medium") }),
    ).toHaveClass("btn-primary");
    expect(screen.getByRole("button", { name: getLabel("easy") })).toHaveClass(
      "btn-outline-primary",
    );
  });

  it("dispatches difficulty change when a different option is clicked", () => {
    const { store } = renderWithStore({ difficulty: "easy" });

    fireEvent.click(screen.getByRole("button", { name: getLabel("hard") }));

    expect(store.getState().game.difficulty).toBe("hard");
  });
});
