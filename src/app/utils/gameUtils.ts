import React from "react";
import type { GameState } from "../store/gameSlice";

export type DifficultyConfig = { rows: number; cols: number; mines: number };

export class GameUtils {
  static createEmptyState(config: DifficultyConfig): {
    board: number[][];
    revealed: boolean[][];
    flagged: boolean[][];
  } {
    const board: number[][] = [];
    const revealed: boolean[][] = [];
    const flagged: boolean[][] = [];

    for (let i = 0; i < config.rows; i++) {
      board[i] = [];
      revealed[i] = [];
      flagged[i] = [];
      for (let j = 0; j < config.cols; j++) {
        board[i][j] = 0;
        revealed[i][j] = false;
        flagged[i][j] = false;
      }
    }

    return { board, revealed, flagged };
  }

  static isValid(config: DifficultyConfig, row: number, col: number): boolean {
    return row >= 0 && row < config.rows && col >= 0 && col < config.cols;
  }

  static placeMines(
    config: DifficultyConfig,
    excludeRow: number,
    excludeCol: number,
    randomFn: () => number = Math.random,
  ): number[][] {
    const board = this.createEmptyState(config).board;
    let minesPlaced = 0;

    while (minesPlaced < config.mines) {
      const row = Math.floor(randomFn() * config.rows);
      const col = Math.floor(randomFn() * config.cols);

      const isInExcludeNeighborhood =
        Math.abs(row - excludeRow) <= 1 && Math.abs(col - excludeCol) <= 1;
      if (board[row][col] !== -1 && !isInExcludeNeighborhood) {
        board[row][col] = -1;
        minesPlaced++;

        for (let i = -1; i <= 1; i++) {
          for (let j = -1; j <= 1; j++) {
            const newRow = row + i;
            const newCol = col + j;
            if (
              this.isValid(config, newRow, newCol) &&
              board[newRow][newCol] !== -1
            ) {
              board[newRow][newCol]++;
            }
          }
        }
      }
    }

    return board;
  }

  static buildBoardFromMines(
    config: DifficultyConfig,
    mines: Array<[number, number]>,
  ): number[][] {
    const board = this.createEmptyState(config).board;

    for (const [row, col] of mines) {
      if (this.isValid(config, row, col)) {
        board[row][col] = -1;
      }
    }

    for (let i = 0; i < config.rows; i++) {
      for (let j = 0; j < config.cols; j++) {
        if (board[i][j] === -1) continue;
        let count = 0;
        for (let di = -1; di <= 1; di++) {
          for (let dj = -1; dj <= 1; dj++) {
            const ni = i + di;
            const nj = j + dj;
            if (this.isValid(config, ni, nj) && board[ni][nj] === -1) count++;
          }
        }
        board[i][j] = count;
      }
    }

    return board;
  }

  static revealFlood(
    config: DifficultyConfig,
    flagged: boolean[][],
    board: number[][],
    revealed: boolean[][],
    row: number,
    col: number,
  ): boolean[][] {
    const newRevealed = revealed.map((r) => [...r]);

    function recur(r: number, c: number) {
      if (
        !GameUtils.isValid(config, r, c) ||
        newRevealed[r][c] ||
        flagged[r][c]
      ) {
        return;
      }
      newRevealed[r][c] = true;
      if (board[r][c] === 0) {
        for (let i = -1; i <= 1; i++) {
          for (let j = -1; j <= 1; j++) {
            recur(r + i, c + j);
          }
        }
      }
    }

    recur(row, col);
    return newRevealed;
  }

  static checkWin(
    config: DifficultyConfig,
    currentRevealed: boolean[][],
  ): boolean {
    const cellsToReveal = config.rows * config.cols - config.mines;
    let revealedCount = 0;

    for (let i = 0; i < config.rows; i++) {
      for (let j = 0; j < config.cols; j++) {
        if (currentRevealed[i] && currentRevealed[i][j]) revealedCount++;
      }
    }

    return revealedCount === cellsToReveal;
  }

  /**
   * Check whether all mines have been correctly flagged.
   * - Returns false if mines haven't been placed yet (`firstClick` true).
   * - Returns false if any flag is on a non-mine cell.
   * - Returns true only when the number of flags equals `config.mines` and all flags match mines.
   */
  static checkFlagsWin(
    config: DifficultyConfig,
    firstClick: boolean,
    flagged: boolean[][],
    currentBoard: number[][],
  ): boolean {
    if (firstClick) return false;

    let flagCountLocal = 0;
    for (let i = 0; i < config.rows; i++) {
      for (let j = 0; j < config.cols; j++) {
        if (flagged[i] && flagged[i][j]) {
          flagCountLocal++;
          if (currentBoard[i][j] !== -1) {
            return false; // a flag is on a non-mine cell
          }
        }
      }
    }

    return flagCountLocal === config.mines;
  }

  static getCellContent(
    state: GameState,
    row: number,
    col: number,
  ): React.ReactNode {
    const { board, revealed, flagged } = state;
    if (revealed[row]?.[col]) {
      if (board[row]?.[col] === -1) {
        return React.createElement("i", {
          className: "fa-solid fa-bomb",
          "aria-hidden": "true",
        });
      }
      if ((board[row]?.[col] ?? 0) > 0) {
        return String(board[row][col]);
      }
      return "";
    }

    if (flagged[row]?.[col]) {
      return React.createElement("i", {
        className: "fa-solid fa-flag",
        "aria-hidden": "true",
      });
    }

    return "";
  }

  static getCellClass(state: GameState, row: number, col: number): string[] {
    const { board, revealed, flagged, selectedRow, selectedCol } = state;
    const classNames: string[] = ["cell"];

    if (revealed[row]?.[col]) {
      classNames.push("revealed");
      if (board[row]?.[col] === -1) {
        classNames.push("mine");
      } else if ((board[row]?.[col] ?? 0) > 0) {
        classNames.push(`number-${board[row][col]}`);
      }
    } else if (flagged[row]?.[col]) {
      classNames.push("flagged");
    }

    if (row === selectedRow && col === selectedCol) {
      classNames.push("selected");
    }

    return classNames;
  }
}
