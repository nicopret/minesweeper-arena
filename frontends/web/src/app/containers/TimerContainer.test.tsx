import { fireEvent, render, screen } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { describe, expect, it, vi } from "vitest";
import gameReducer, { type GameState } from "../store/gameSlice";
import TimerContainer from "./TimerContainer";

type RenderOptions = {
  state?: Partial<GameState>;
};

const renderWithState = ({ state }: RenderOptions = {}) => {
  const base = gameReducer(undefined, { type: "init" });
  const preloadedState = {
    game: {
      ...base,
      ...state,
      config: { ...base.config, ...(state?.config ?? {}) },
    },
  };

  const store = configureStore({
    reducer: { game: gameReducer },
    preloadedState,
  });
  const onNewGame = vi.fn();

  const utils = render(
    <Provider store={store}>
      <TimerContainer onNewGame={onNewGame} />
    </Provider>,
  );

  return { store, onNewGame, ...utils };
};

describe("TimerContainer", () => {
  it("triggers the provided new game handler when clicked", () => {
    const { onNewGame } = renderWithState();

    fireEvent.click(screen.getByRole("button", { name: /New Game/i }));
    expect(onNewGame).toHaveBeenCalledTimes(1);
  });
});
