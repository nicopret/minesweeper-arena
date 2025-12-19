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

describe("gameSlice", () => {
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
      const flaggedResult = reducer(
        flaggedState,
        revealCell({ row: 0, col: 0 }),
      );
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

      const next = reducer(
        initState(),
        revealCell({ row: 1, col: 1, userInitiated: true }),
      );

      expect(spy).toHaveBeenCalledOnce();
      expect(next.firstClick).toBe(false);
      expect(next.isRunning).toBe(true);
      expect(next.board).toEqual(mineLayout);
      expect(next.revealed[1][1]).toBe(true);
    });

    it("ends game as loss when revealing a mine", () => {
      const withMines = reducer(initState(), setTestMines(mines));
      const next = reducer(
        withMines,
        revealCell({ row: 0, col: 0, userInitiated: true }),
      );

      expect(next.gameOver).toBe(true);
      expect(next.gameWon).toBe(false);
      expect(next.score).toBeNull();
      expect(next.revealed[0][0]).toBe(true);
      expect(next.revealed[2][2]).toBe(true);
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
        (state, [row, col]) =>
          reducer(state, revealCell({ row, col, userInitiated: true })),
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
      const flagged = reducer(
        withBoard,
        toggleFlag({ row: 1, col: 1, userInitiated: true }),
      );
      expect(flagged.flagged[1][1]).toBe(true);
      expect(flagged.flagCount).toBe(1);

      const unflagged = reducer(
        flagged,
        toggleFlag({ row: 1, col: 1, userInitiated: true }),
      );
      expect(unflagged.flagged[1][1]).toBe(false);
      expect(unflagged.flagCount).toBe(0);
    });

    it("starts the timer on first interaction even if it is a flag", () => {
      const base = initState();
      const next = reducer(
        base,
        toggleFlag({ row: 0, col: 0, userInitiated: true }),
      );

      expect(next.isRunning).toBe(true);
    });

    it("wins when all mines are flagged correctly", () => {
      const withBoard = reducer(initState(), setTestMines(mines));
      const afterFirstFlag = reducer(
        withBoard,
        toggleFlag({ row: 0, col: 0, userInitiated: true }),
      );
      const afterSecondFlag = reducer(
        afterFirstFlag,
        toggleFlag({ row: 2, col: 2, userInitiated: true }),
      );

      expect(afterSecondFlag.gameWon).toBe(true);
      expect(afterSecondFlag.gameOver).toBe(true);
      expect(afterSecondFlag.score).toEqual(expect.any(Number));
      expect(afterSecondFlag.revealed.every((row) => row.every(Boolean))).toBe(
        true,
      );
    });
  });

  describe("tick", () => {
    it("increments timer only when running and not game over", () => {
      const base = initState();
      const running = { ...base, isRunning: true };
      const ticked = reducer(running, tick());
      expect(ticked.timer).toBe(1);

      const stopped = reducer({ ...running, gameOver: true }, tick());
      expect(stopped.timer).toBe(0);

      const notRunning = reducer(base, tick());
      expect(notRunning.timer).toBe(0);
    });
  });

  describe("setSelection", () => {
    it("updates selected cell coords", () => {
      const base = initState();
      const next = reducer(base, setSelection({ row: 3, col: 4 }));
      expect(next.selectedRow).toBe(base.config.rows - 1);
      expect(next.selectedCol).toBe(base.config.cols - 1);
    });
  });
});
