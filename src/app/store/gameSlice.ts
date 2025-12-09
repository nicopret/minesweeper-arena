import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { GameUtils, DifficultyConfig } from "../utils/gameUtils";

export const BASE_DIFFICULTIES = {
  easy: { rows: 9, cols: 9, mines: 10 },
  medium: { rows: 16, cols: 16, mines: 40 },
  hard: { rows: 16, cols: 30, mines: 99 },
} as const;

export const TEST_DIFFICULTIES = {
  easy: { rows: 3, cols: 3, mines: 2 },
  medium: { rows: 4, cols: 4, mines: 3 },
  hard: { rows: 5, cols: 5, mines: 4 },
} as const;

export type Difficulty = keyof typeof BASE_DIFFICULTIES;

export interface GameState {
  difficulty: Difficulty;
  config: DifficultyConfig;
  board: number[][];
  revealed: boolean[][];
  flagged: boolean[][];
  gameOver: boolean;
  gameWon: boolean;
  firstClick: boolean;
  timer: number;
  flagCount: number;
  isRunning: boolean;
  selectedRow: number;
  selectedCol: number;
}

const isTestEnv = process.env.NODE_ENV === "test";
const DIFFICULTIES = isTestEnv ? TEST_DIFFICULTIES : BASE_DIFFICULTIES;

const initialDifficulty: Difficulty = "easy";
const initialConfig = DIFFICULTIES[initialDifficulty];

function createBaseState(cfg: DifficultyConfig): GameState {
  const { board, revealed, flagged } = GameUtils.createEmptyState(cfg);
  const centerRow = Math.floor(cfg.rows / 2);
  const centerCol = Math.floor(cfg.cols / 2);

  return {
    difficulty: initialDifficulty,
    config: cfg,
    board,
    revealed,
    flagged,
    gameOver: false,
    gameWon: false,
    firstClick: true,
    timer: 0,
    flagCount: 0,
    isRunning: false,
    selectedRow: centerRow,
    selectedCol: centerCol,
  };
}

const initialState: GameState = createBaseState(initialConfig);

const gameSlice = createSlice({
  name: "game",
  initialState,
  reducers: {
    setDifficulty(state, action: PayloadAction<Difficulty>) {
      const cfg = DIFFICULTIES[action.payload];
      const { board, revealed, flagged } = GameUtils.createEmptyState(cfg);
      const centerRow = Math.floor(cfg.rows / 2);
      const centerCol = Math.floor(cfg.cols / 2);

      state.difficulty = action.payload;
      state.config = cfg;
      state.board = board;
      state.revealed = revealed;
      state.flagged = flagged;
      state.gameOver = false;
      state.gameWon = false;
      state.firstClick = true;
      state.timer = 0;
      state.flagCount = 0;
      state.isRunning = false;
      state.selectedRow = centerRow;
      state.selectedCol = centerCol;
    },
    resetBoard(state) {
      const { board, revealed, flagged } = GameUtils.createEmptyState(
        state.config,
      );
      const centerRow = Math.floor(state.config.rows / 2);
      const centerCol = Math.floor(state.config.cols / 2);

      state.board = board;
      state.revealed = revealed;
      state.flagged = flagged;
      state.gameOver = false;
      state.gameWon = false;
      state.firstClick = true;
      state.timer = 0;
      state.flagCount = 0;
      state.isRunning = false;
      state.selectedRow = centerRow;
      state.selectedCol = centerCol;
    },
    clickCell(state, action: PayloadAction<{ row: number; col: number }>) {
      const { row, col } = action.payload;
      if (
        state.gameOver ||
        state.flagged[row]?.[col] ||
        state.revealed[row]?.[col]
      ) {
        return;
      }

      let currentBoard = state.board;

      if (state.firstClick) {
        currentBoard = GameUtils.placeMines(state.config, row, col);
        state.board = currentBoard;
        state.firstClick = false;
        state.isRunning = true;
      }

      const newRevealed = state.revealed.map((r) => [...r]);

      if (currentBoard[row][col] === -1) {
        newRevealed[row][col] = true;
        state.revealed = newRevealed;
        state.gameOver = true;
        state.gameWon = false;
        state.isRunning = false;

        for (let i = 0; i < state.config.rows; i++) {
          for (let j = 0; j < state.config.cols; j++) {
            if (currentBoard[i][j] === -1) newRevealed[i][j] = true;
          }
        }
        return;
      }

      const floodRevealed = GameUtils.revealFlood(
        state.config,
        state.flagged,
        currentBoard,
        newRevealed,
        row,
        col,
      );
      state.revealed = floodRevealed;

      if (GameUtils.checkWin(state.config, floodRevealed)) {
        state.gameOver = true;
        state.gameWon = true;
        state.isRunning = false;
        state.revealed = floodRevealed.map((r) => r.map(() => true));
      }
    },
    toggleFlag(state, action: PayloadAction<{ row: number; col: number }>) {
      const { row, col } = action.payload;
      if (state.gameOver || state.revealed[row]?.[col]) return;

      const newFlagged = state.flagged.map((r) => [...r]);
      newFlagged[row][col] = !newFlagged[row][col];
      state.flagged = newFlagged;
      state.flagCount += newFlagged[row][col] ? 1 : -1;

      if (
        GameUtils.checkFlagsWin(
          state.config,
          state.firstClick,
          newFlagged,
          state.board,
        )
      ) {
        state.gameOver = true;
        state.gameWon = true;
        state.isRunning = false;
      }
    },
    setSelected(state, action: PayloadAction<{ row: number; col: number }>) {
      state.selectedRow = action.payload.row;
      state.selectedCol = action.payload.col;
    },
    tick(state) {
      if (state.isRunning && !state.gameOver) {
        state.timer += 1;
      }
    },
    setMinesForTest(state, action: PayloadAction<Array<[number, number]>>) {
      const board = GameUtils.buildBoardFromMines(
        state.config,
        action.payload || [],
      );
      state.board = board;
      state.revealed = board.map((r) => r.map(() => false));
      state.flagged = board.map((r) => r.map(() => false));
      state.firstClick = false;
      state.isRunning = false;
      state.gameOver = false;
      state.gameWon = false;
      state.timer = 0;
      state.flagCount = 0;
    },
  },
});

export const {
  setDifficulty,
  resetBoard,
  clickCell,
  toggleFlag,
  setSelected,
  tick,
  setMinesForTest,
} = gameSlice.actions;

export { DIFFICULTIES };

export default gameSlice.reducer;
