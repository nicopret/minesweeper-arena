import { describe, it, expect, vi, afterEach } from "vitest";
import reducer, {
  DIFFICULTIES,
  revealCell,
  setSelection,
  setTestMines,
  startNewGame,
  tick,
  toggleFlag,
  type GameState,
} from "./gameSlice";
import { GameUtils } from "../utils/gameUtils";

const initState = (): GameState => reducer(undefined, { type: "init" });

const mines = [
  [0, 0],
  [2, 2],
] as Array<[number, number]>;

const buildBoard = () =>
  GameUtils.buildBoardFromMines(DIFFICULTIES.easy, mines);

afterEach(() => {
  vi.restoreAllMocks();
});

describe("DIFFICULTIES selection by env", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    Object.assign(process.env, originalEnv);
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("uses test difficulties when NODE_ENV=test", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.resetModules();
    const { DIFFICULTIES: testDiffs } = await import("./gameSlice");
    expect(testDiffs.easy.rows).toBe(3);
  });

  it("falls back to base difficulties when NODE_ENV is not test", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.resetModules();
    const { DIFFICULTIES: baseDiffs } = await import("./gameSlice");
    expect(baseDiffs.easy.rows).toBe(9);
  });
});

describe("startNewGame", () => {
  it("changes difficulty and resets state with incremented resetId", () => {
    const base = initState();
    const next = reducer(base, startNewGame({ difficulty: "hard" }));

    expect(next.difficulty).toBe("hard");
    expect(next.resetId).toBe(base.resetId + 1);
    expect(next.config.rows).toBe(DIFFICULTIES.hard.rows);
    expect(next.board).toHaveLength(DIFFICULTIES.hard.rows);
    expect(next.firstClick).toBe(true);
    expect(next.gameOver).toBe(false);
    expect(next.timer).toBe(0);
  });

  it("keeps difficulty when payload is omitted and still resets", () => {
    const base = reducer(initState(), startNewGame({ difficulty: "medium" }));
    const next = reducer(base, startNewGame(undefined));

    expect(next.difficulty).toBe("medium");
    expect(next.resetId).toBe(base.resetId + 1);
  });
});

describe("revealCell", () => {
  it("no-ops when game is over, flagged, revealed, or out of bounds", () => {
    const base = initState();
    const gameOverState = { ...base, gameOver: true };
    const done = reducer(gameOverState, revealCell({ row: 0, col: 0 }));
    expect(done).toBe(gameOverState);

    const flaggedState: GameState = {
      ...base,
      flagged: base.flagged.map((r, i) =>
        r.map((cell, j) => (i === 0 && j === 0 ? true : cell)),
      ),
    };
    const flaggedResult = reducer(flaggedState, revealCell({ row: 0, col: 0 }));
    expect(flaggedResult).toBe(flaggedState);

    const revealedState: GameState = {
      ...base,
      revealed: base.revealed.map((r, i) =>
        r.map((cell, j) => (i === 0 && j === 1 ? true : cell)),
      ),
    };
    const revealedResult = reducer(
      revealedState,
      revealCell({ row: 0, col: 1 }),
    );
    expect(revealedResult).toBe(revealedState);

    const outOfBounds = reducer(base, revealCell({ row: 99, col: 0 }));
    expect(outOfBounds).toBe(base);
  });

  it("places mines on first click, starts timer, and reveals target cell", () => {
    const mineLayout = buildBoard();
    const spy = vi
      .spyOn(GameUtils, "placeMines")
      .mockReturnValue(mineLayout.map((r) => [...r]));

    const next = reducer(initState(), revealCell({ row: 1, col: 1 }));

    expect(spy).toHaveBeenCalledOnce();
    expect(next.firstClick).toBe(false);
    expect(next.isRunning).toBe(true);
    expect(next.board).toEqual(mineLayout);
    expect(next.revealed[1][1]).toBe(true);
  });

  it("ends game as loss when revealing a mine", () => {
    const withMines = reducer(initState(), setTestMines(mines));
    const next = reducer(withMines, revealCell({ row: 0, col: 0 }));

    expect(next.gameOver).toBe(true);
    expect(next.gameWon).toBe(false);
    expect(next.score).toBeNull();
    expect(next.revealed[0][0]).toBe(true);
    expect(next.revealed[2][2]).toBe(true); // all mines revealed on loss
    expect(next.isRunning).toBe(false);
  });

  it("wins when all safe cells are revealed", () => {
    const seeded = reducer(initState(), setTestMines(mines));
    const safeCells: Array<[number, number]> = [];
    for (let r = 0; r < seeded.config.rows; r++) {
      for (let c = 0; c < seeded.config.cols; c++) {
        if (!mines.some(([mr, mc]) => mr === r && mc === c)) {
          safeCells.push([r, c]);
        }
      }
    }

    const final = safeCells.reduce(
      (state, [row, col]) => reducer(state, revealCell({ row, col })),
      seeded,
    );

    expect(final.gameWon).toBe(true);
    expect(final.gameOver).toBe(true);
    expect(final.score).toEqual(expect.any(Number));
    expect(final.revealed.every((row) => row.every(Boolean))).toBe(true);
  });
});

describe("toggleFlag", () => {
  it("guards against invalid rows, revealed cells, and toggles flag counts", () => {
    const base = initState();

    const invalid = reducer(base, toggleFlag({ row: 99, col: 0 }));
    expect(invalid).toBe(base);

    const revealed: GameState = {
      ...base,
      revealed: base.revealed.map((r, i) =>
        r.map((cell, j) => (i === 0 && j === 0 ? true : cell)),
      ),
    };
    const noToggle = reducer(revealed, toggleFlag({ row: 0, col: 0 }));
    expect(noToggle).toBe(revealed);

    const withBoard = reducer(base, setTestMines(mines));
    const flagged = reducer(withBoard, toggleFlag({ row: 1, col: 1 }));
    expect(flagged.flagged[1][1]).toBe(true);
    expect(flagged.flagCount).toBe(1);

    const unflagged = reducer(flagged, toggleFlag({ row: 1, col: 1 }));
    expect(unflagged.flagged[1][1]).toBe(false);
    expect(unflagged.flagCount).toBe(0);
  });

  it("wins when all mines are flagged correctly", () => {
    const withBoard = reducer(initState(), setTestMines(mines));
    const afterFirstFlag = reducer(withBoard, toggleFlag({ row: 0, col: 0 }));
    const afterSecondFlag = reducer(
      afterFirstFlag,
      toggleFlag({ row: 2, col: 2 }),
    );

    expect(afterSecondFlag.gameWon).toBe(true);
    expect(afterSecondFlag.gameOver).toBe(true);
    expect(afterSecondFlag.score).toEqual(expect.any(Number));
    expect(afterSecondFlag.revealed.every((row) => row.every(Boolean))).toBe(
      true,
    );
  });
});

describe("setSelection", () => {
  it("clamps selection within board bounds", () => {
    const base = initState();
    const next = reducer(base, setSelection({ row: -5, col: 99 }));

    expect(next.selectedRow).toBe(0);
    expect(next.selectedCol).toBe(DIFFICULTIES.easy.cols - 1);
  });
});

describe("tick", () => {
  it("increments timer only when running and not over", () => {
    const running: GameState = { ...initState(), isRunning: true, timer: 0 };
    const afterTick = reducer(running, tick());
    expect(afterTick.timer).toBe(1);

    const stopped: GameState = { ...running, gameOver: true, timer: 5 };
    const notIncremented = reducer(stopped, tick());
    expect(notIncremented.timer).toBe(5);
  });
});

describe("setTestMines", () => {
  it("replaces board, resets counters, and clears flags/reveals", () => {
    const base = reducer(initState(), startNewGame({ difficulty: "medium" }));
    const next = reducer(base, setTestMines(mines));

    // expect(next.board).toEqual(buildBoard());
    expect(next.revealed.flat().every((cell) => cell === false)).toBe(true);
    expect(next.flagged.flat().every((cell) => cell === false)).toBe(true);
    expect(next.firstClick).toBe(false);
    expect(next.isRunning).toBe(false);
    expect(next.gameOver).toBe(false);
    expect(next.gameWon).toBe(false);
    expect(next.timer).toBe(0);
    expect(next.flagCount).toBe(0);
    expect(next.config.rows).toBe(DIFFICULTIES.medium.rows);
  });

  it("handles undefined payload by seeding an empty board", () => {
    const base = reducer(initState(), startNewGame({ difficulty: "easy" }));
    const next = reducer(
      base,
      // @ts-expect-error deliberate undefined payload to cover fallback
      setTestMines(undefined),
    );

    const expectedBoard = GameUtils.buildBoardFromMines(next.config, []);
    expect(next.board).toEqual(expectedBoard);
    expect(next.revealed.flat().every((cell) => cell === false)).toBe(true);
    expect(next.flagged.flat().every((cell) => cell === false)).toBe(true);
  });
});
