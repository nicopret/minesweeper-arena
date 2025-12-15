import React from "react";
import type { GameState } from "../store/gameSlice";
import { GameUtils } from "./gameUtils";

describe("GameUtils.checkWin", () => {
  it("returns false when not all non-mine cells are revealed", () => {
    const config = { rows: 3, cols: 3, mines: 1 };
    const revealed = [
      [true, true, true],
      [true, false, false],
      [true, true, true],
    ];
    expect(GameUtils.checkWin(config, revealed)).toBe(false);
  });

  it("returns true when all non-mine cells are revealed", () => {
    const config = { rows: 3, cols: 3, mines: 1 };
    const revealed = [
      [true, true, true],
      [true, false, true],
      [true, true, true],
    ];
    expect(GameUtils.checkWin(config, revealed)).toBe(true);
  });
});

describe("GameUtils.getCellContent", () => {
  const baseState: GameState = {
    difficulty: "easy",
    config: { rows: 2, cols: 2, mines: 1 },
    board: [
      [-1, 1],
      [1, 0],
    ],
    revealed: [
      [true, false],
      [false, false],
    ],
    flagged: [
      [false, false],
      [false, false],
    ],
    gameOver: false,
    gameWon: false,
    firstClick: false,
    timer: 0,
    flagCount: 0,
    isRunning: false,
    selectedRow: 0,
    selectedCol: 0,
    resetId: 0,
  };

  it("returns bomb icon for revealed mines", () => {
    const content = GameUtils.getCellContent(baseState, 0, 0);
    expect(React.isValidElement(content)).toBe(true);
    expect((content as React.ReactElement).props.className).toContain(
      "fa-bomb",
    );
  });

  it("returns flag icon for flagged cells", () => {
    const flaggedState: GameState = {
      ...baseState,
      revealed: baseState.revealed.map((row) => [...row].map(() => false)),
      flagged: [
        [false, true],
        [false, false],
      ],
    };
    const content = GameUtils.getCellContent(flaggedState, 0, 1);
    expect(React.isValidElement(content)).toBe(true);
    expect((content as React.ReactElement).props.className).toContain(
      "fa-flag",
    );
  });
});

describe("GameUtils.checkFlagsWin", () => {
  it("returns false if firstClick is true", () => {
    const config = { rows: 3, cols: 3, mines: 1 };
    const flagged = [
      [false, false, false],
      [false, false, false],
      [false, false, false],
    ];
    const board = [
      [0, 0, 0],
      [0, -1, 0],
      [0, 0, 0],
    ];
    expect(GameUtils.checkFlagsWin(config, true, flagged, board)).toBe(false);
  });

  it("returns true when all mines are flagged correctly", () => {
    const config = { rows: 3, cols: 3, mines: 1 };
    const flagged = [
      [false, false, false],
      [false, true, false],
      [false, false, false],
    ];
    const board = [
      [0, 0, 0],
      [0, -1, 0],
      [0, 0, 0],
    ];
    expect(GameUtils.checkFlagsWin(config, false, flagged, board)).toBe(true);
  });

  it("returns false when a flag is on a non-mine cell", () => {
    const config = { rows: 3, cols: 3, mines: 1 };
    const flagged = [
      [true, false, false],
      [false, false, false],
      [false, false, false],
    ];
    const board = [
      [0, 0, 0],
      [0, -1, 0],
      [0, 0, 0],
    ];
    expect(GameUtils.checkFlagsWin(config, false, flagged, board)).toBe(false);
  });

  it("returns false when number of flags does not match mines", () => {
    const config = { rows: 3, cols: 3, mines: 2 };
    const flagged = [
      [false, false, false],
      [false, true, false],
      [false, false, false],
    ];
    const board = [
      [0, 0, 0],
      [0, -1, 0],
      [0, 0, -1],
    ];
    expect(GameUtils.checkFlagsWin(config, false, flagged, board)).toBe(false);
  });
});

describe("GameUtils.getCellClass", () => {
  const state: GameState = {
    difficulty: "easy",
    config: { rows: 2, cols: 2, mines: 1 },
    board: [
      [-1, 1],
      [1, 0],
    ],
    revealed: [
      [true, false],
      [false, false],
    ],
    flagged: [
      [false, false],
      [false, false],
    ],
    gameOver: false,
    gameWon: false,
    firstClick: false,
    timer: 0,
    flagCount: 0,
    isRunning: false,
    selectedRow: 0,
    selectedCol: 0,
    resetId: 0,
  };

  it("includes mine and revealed classes for revealed mine", () => {
    const classes = GameUtils.getCellClass(state, 0, 0);
    expect(classes).toContain("cell");
    expect(classes).toContain("revealed");
    expect(classes).toContain("mine");
  });

  it("includes flag class for flagged cells and selected for current selection", () => {
    const flaggedState: GameState = {
      ...state,
      revealed: state.revealed.map((r) => r.map(() => false)),
      flagged: [
        [false, true],
        [false, false],
      ],
      selectedRow: 0,
      selectedCol: 1,
    };
    const classes = GameUtils.getCellClass(flaggedState, 0, 1);
    expect(classes).toContain("flagged");
    expect(classes).toContain("selected");
  });
});
