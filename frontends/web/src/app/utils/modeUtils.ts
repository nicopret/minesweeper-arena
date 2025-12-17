import type { Difficulty, GameState } from "../store/gameSlice";

export const buildModeString = ({
  difficulty,
  rows,
  cols,
  mines,
}: {
  difficulty: Difficulty;
  rows: number;
  cols: number;
  mines: number;
}): string => `${difficulty}|${rows}x${cols}|${mines}`;

export const getModeFromGameState = (
  game: Pick<GameState, "difficulty" | "config">,
): string =>
  buildModeString({
    difficulty: game.difficulty,
    rows: game.config.rows,
    cols: game.config.cols,
    mines: game.config.mines,
  });
