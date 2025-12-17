import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { GameUtils, type DifficultyConfig } from "../utils/gameUtils";

export const BASE_DIFFICULTIES = {
  easy: { rows: 9, cols: 9, mines: 10 },
  medium: { rows: 16, cols: 16, mines: 40 },
  hard: { rows: 16, cols: 30, mines: 99 },
} as const;

const TEST_DIFFICULTIES = {
  easy: { rows: 3, cols: 3, mines: 2 },
  medium: { rows: 4, cols: 4, mines: 3 },
  hard: { rows: 5, cols: 5, mines: 4 },
} as const;

export type Difficulty = keyof typeof BASE_DIFFICULTIES;

const isTestEnv = process.env.NODE_ENV === "test";

export const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = isTestEnv
  ? TEST_DIFFICULTIES
  : BASE_DIFFICULTIES;

export type GameState = {
  difficulty: Difficulty;
  config: DifficultyConfig;
  board: number[][];
  revealed: boolean[][];
  flagged: boolean[][];
  gameOver: boolean;
  gameWon: boolean;
  score: number | null;
  firstClick: boolean;
  timer: number;
  flagCount: number;
  isRunning: boolean;
  selectedRow: number;
  selectedCol: number;
  resetId: number;
};

const getRandomSelection = (config: DifficultyConfig): [number, number] => {
  const centerRow = Math.floor(config.rows / 2);
  const centerCol = Math.floor(config.cols / 2);
  const randomRow = Math.max(
    0,
    Math.min(config.rows - 1, centerRow + Math.floor(Math.random() * 5) - 2),
  );
  const randomCol = Math.max(
    0,
    Math.min(config.cols - 1, centerCol + Math.floor(Math.random() * 5) - 2),
  );
  return [randomRow, randomCol];
};

const buildState = (
  difficulty: Difficulty,
  resetId: number,
  selection?: [number, number],
): GameState => {
  const config = DIFFICULTIES[difficulty];
  const { board, revealed, flagged } = GameUtils.createEmptyState(config);
  const [selectedRow, selectedCol] = selection || getRandomSelection(config);

  return {
    difficulty,
    config,
    board,
    revealed,
    flagged,
    gameOver: false,
    gameWon: false,
    score: null,
    firstClick: true,
    timer: 0,
    flagCount: 0,
    isRunning: false,
    selectedRow,
    selectedCol,
    resetId,
  };
};

const endGame = (
  state: GameState,
  won: boolean,
  currentBoard: number[][],
): void => {
  state.gameOver = true;
  state.gameWon = won;
  state.isRunning = false;
  state.score = won
    ? GameUtils.calculateScore(state.config, state.timer)
    : null;

  const newRevealed = state.revealed.map((row) => [...row]);
  for (let i = 0; i < state.config.rows; i++) {
    for (let j = 0; j < state.config.cols; j++) {
      if (won) {
        newRevealed[i][j] = true;
      } else if (currentBoard[i][j] === -1) {
        newRevealed[i][j] = true;
      }
    }
  }
  state.revealed = newRevealed;
};

const initialState: GameState = buildState("easy", 0);

const gameSlice = createSlice({
  name: "game",
  initialState,
  reducers: {
    startNewGame: (
      state,
      action: PayloadAction<{ difficulty?: Difficulty } | undefined>,
    ) => {
      const nextDifficulty = action.payload?.difficulty ?? state.difficulty;
      return buildState(nextDifficulty, state.resetId + 1);
    },
    revealCell: (
      state,
      action: PayloadAction<{ row: number; col: number }>,
    ) => {
      const { row, col } = action.payload;
      if (
        state.gameOver ||
        state.flagged[row]?.[col] ||
        state.revealed[row]?.[col] ||
        !state.board[row] ||
        typeof state.board[row][col] === "undefined"
      )
        return;

      let board = state.board;

      if (state.firstClick) {
        board = GameUtils.placeMines(state.config, row, col);
        state.board = board;
        state.firstClick = false;
        state.isRunning = true;
      }

      const revealed = state.revealed.map((r) => [...r]);

      if (board[row][col] === -1) {
        revealed[row][col] = true;
        state.revealed = revealed;
        endGame(state, false, board);
        return;
      }

      const newRevealed = GameUtils.revealFlood(
        state.config,
        state.flagged,
        board,
        revealed,
        row,
        col,
      );

      state.revealed = newRevealed;

      if (GameUtils.checkWin(state.config, newRevealed)) {
        endGame(state, true, board);
      }
    },
    toggleFlag: (
      state,
      action: PayloadAction<{ row: number; col: number }>,
    ) => {
      const { row, col } = action.payload;
      if (
        state.gameOver ||
        state.revealed[row]?.[col] ||
        !state.flagged[row] ||
        typeof state.flagged[row][col] === "undefined"
      )
        return;

      const currentlyFlagged = !!state.flagged[row]?.[col];
      state.flagged[row][col] = !currentlyFlagged;
      state.flagCount += currentlyFlagged ? -1 : 1;

      if (
        GameUtils.checkFlagsWin(
          state.config,
          state.firstClick,
          state.flagged,
          state.board,
        )
      ) {
        endGame(state, true, state.board);
      }
    },
    setSelection: (
      state,
      action: PayloadAction<{ row: number; col: number }>,
    ) => {
      const row = Math.max(
        0,
        Math.min(state.config.rows - 1, action.payload.row),
      );
      const col = Math.max(
        0,
        Math.min(state.config.cols - 1, action.payload.col),
      );
      state.selectedRow = row;
      state.selectedCol = col;
    },
    tick: (state) => {
      if (state.isRunning && !state.gameOver) {
        state.timer += 1;
      }
    },
    setTestMines: (state, action: PayloadAction<Array<[number, number]>>) => {
      const newBoard = GameUtils.buildBoardFromMines(
        state.config,
        action.payload || [],
      );
      state.board = newBoard;
      state.revealed = newBoard.map((r) => r.map(() => false));
      state.flagged = newBoard.map((r) => r.map(() => false));
      state.firstClick = false;
      state.isRunning = false;
      state.gameOver = false;
      state.gameWon = false;
      state.score = null;
      state.timer = 0;
      state.flagCount = 0;
    },
  },
});

export const {
  startNewGame,
  revealCell,
  toggleFlag,
  setSelection,
  tick,
  setTestMines,
} = gameSlice.actions;

export default gameSlice.reducer;
