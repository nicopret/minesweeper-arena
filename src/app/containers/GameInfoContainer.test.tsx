import { render, screen } from "@testing-library/react";
import React from "react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { describe, expect, it } from "vitest";
import gameReducer, { type GameState } from "../store/gameSlice";
import GameInfoContainer from "./GameInfoContainer";

const renderWithState = (state: Partial<GameState>) => {
  const base = gameReducer(undefined, { type: "init" });
  const store = configureStore({
    reducer: { game: gameReducer },
    preloadedState: { game: { ...base, ...state } },
  });

  return render(
    <Provider store={store}>
      <GameInfoContainer />
    </Provider>,
  );
};

describe("GameInfoContainer", () => {
  it("shows win or loss message when game is over", () => {
    const { rerender } = renderWithState({ gameOver: true, gameWon: false });

    expect(screen.getByText(/Game Over/i)).toBeInTheDocument();

    rerender(
      <Provider
        store={configureStore({
          reducer: { game: gameReducer },
          preloadedState: {
            game: {
              ...gameReducer(undefined, { type: "init" }),
              gameOver: true,
              gameWon: true,
            },
          },
        })}
      >
        <GameInfoContainer />
      </Provider>,
    );
    expect(screen.getByText(/You Won/i)).toBeInTheDocument();
  });

  it("shows instructions when game is active", () => {
    renderWithState({ gameOver: false, gameWon: false });

    expect(screen.getByText(/How to play/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Mouse: left click to reveal/i),
    ).toBeInTheDocument();
  });
});
