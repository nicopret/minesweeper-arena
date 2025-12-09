export type DifficultyConfig = { rows: number; cols: number; mines: number };

export class GameUtils {
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
}
