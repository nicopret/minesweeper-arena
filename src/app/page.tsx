"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { GameUtils } from "./utils/gameUtils";

const DIFFICULTIES = {
  easy: { rows: 9, cols: 9, mines: 10 },
  medium: { rows: 16, cols: 16, mines: 40 },
  hard: { rows: 16, cols: 30, mines: 99 },
} as const;

type Difficulty = keyof typeof DIFFICULTIES;
type TestWindow = typeof window & {
  __TEST_setMines?: (mines: Array<[number, number]>) => void;
};

export default function Minesweeper() {
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [board, setBoard] = useState<number[][]>([]);
  const [revealed, setRevealed] = useState<boolean[][]>([]);
  const [flagged, setFlagged] = useState<boolean[][]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [firstClick, setFirstClick] = useState(true);
  const [timer, setTimer] = useState(0);
  const [flagCount, setFlagCount] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  const config = DIFFICULTIES[difficulty];

  const [cellSize, setCellSize] = useState(30);
  const gameCardRef = useRef<HTMLDivElement | null>(null);
  const [selectedRow, setSelectedRow] = useState<number>(0);
  const [selectedCol, setSelectedCol] = useState<number>(0);

  const initBoard = useCallback(() => {
    const newBoard: number[][] = [];
    const newRevealed: boolean[][] = [];
    const newFlagged: boolean[][] = [];

    for (let i = 0; i < config.rows; i++) {
      newBoard[i] = [];
      newRevealed[i] = [];
      newFlagged[i] = [];
      for (let j = 0; j < config.cols; j++) {
        newBoard[i][j] = 0;
        newRevealed[i][j] = false;
        newFlagged[i][j] = false;
      }
    }

    setBoard(newBoard);
    setRevealed(newRevealed);
    setFlagged(newFlagged);
    setGameOver(false);
    setGameWon(false);
    setFirstClick(true);
    setTimer(0);
    setFlagCount(0);
    setIsRunning(false);
    // Set random starting position near center
    const centerRow = Math.floor(config.rows / 2);
    const centerCol = Math.floor(config.cols / 2);
    const offsetRow = Math.max(
      0,
      Math.min(config.rows - 1, centerRow + Math.floor(Math.random() * 5) - 2),
    );
    const offsetCol = Math.max(
      0,
      Math.min(config.cols - 1, centerCol + Math.floor(Math.random() * 5) - 2),
    );
    setSelectedRow(offsetRow);
    setSelectedCol(offsetCol);
    // Schedule auto-click on a nearby empty cell after state updates
    setTimeout(() => {
      // Find an empty cell near center
      let clickRow = offsetRow;
      let clickCol = offsetCol;
      let found = false;
      // Spiral search outward from center to find an unrevealed cell
      for (
        let radius = 0;
        radius < Math.max(config.rows, config.cols) && !found;
        radius++
      ) {
        for (
          let r = Math.max(0, offsetRow - radius);
          r <= Math.min(config.rows - 1, offsetRow + radius);
          r++
        ) {
          for (
            let c = Math.max(0, offsetCol - radius);
            c <= Math.min(config.cols - 1, offsetCol + radius);
            c++
          ) {
            if (!newRevealed[r][c] && !newFlagged[r][c]) {
              clickRow = r;
              clickCol = c;
              found = true;
              break;
            }
          }
          if (found) break;
        }
      }
      const el = document.getElementById(`cell-${clickRow}-${clickCol}`);
      if (el) el.click();
    }, 0);
  }, [config.rows, config.cols]);

  const resetBoardForDifficulty = (newDifficulty: Difficulty): void => {
    const cfg = DIFFICULTIES[newDifficulty];
    const newBoard: number[][] = [];
    const newRevealed: boolean[][] = [];
    const newFlagged: boolean[][] = [];

    for (let i = 0; i < cfg.rows; i++) {
      newBoard[i] = [];
      newRevealed[i] = [];
      newFlagged[i] = [];
      for (let j = 0; j < cfg.cols; j++) {
        newBoard[i][j] = 0;
        newRevealed[i][j] = false;
        newFlagged[i][j] = false;
      }
    }

    setBoard(newBoard);
    setRevealed(newRevealed);
    setFlagged(newFlagged);
    setGameOver(false);
    setGameWon(false);
    setFirstClick(true);
    setTimer(0);
    setFlagCount(0);
    setIsRunning(false);
    // Set random starting position near center when difficulty changes
    const centerRow = Math.floor(cfg.rows / 2);
    const centerCol = Math.floor(cfg.cols / 2);
    const offsetRow = Math.max(
      0,
      Math.min(cfg.rows - 1, centerRow + Math.floor(Math.random() * 5) - 2),
    );
    const offsetCol = Math.max(
      0,
      Math.min(cfg.cols - 1, centerCol + Math.floor(Math.random() * 5) - 2),
    );
    setSelectedRow(offsetRow);
    setSelectedCol(offsetCol);
  };

  // Initialize the board once on mount
  useEffect(() => {
    initBoard();
  }, [initBoard]);

  // Responsive cell sizing: compute cell size to fit board inside the card
  useEffect(() => {
    const updateCellSize = () => {
      const gapTotal = (config.cols - 1) * 2; // gap is 2px
      const paddingTotal = 10; // board-container padding left+right (approx)
      const containerWidth =
        gameCardRef.current?.clientWidth ?? window.innerWidth;
      const available = Math.max(
        100,
        containerWidth - paddingTotal - gapTotal - 40,
      ); // leave some room for UI
      const potential = Math.floor(available / config.cols);
      const newSize = Math.max(16, Math.min(30, potential));
      setCellSize(newSize);
    };

    updateCellSize();
    window.addEventListener("resize", updateCellSize);
    return () => window.removeEventListener("resize", updateCellSize);
  }, [config.cols]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && !gameOver) {
      interval = setInterval(() => {
        setTimer((t) => t + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, gameOver]);

  const isValid = useCallback(
    (row: number, col: number): boolean => {
      return row >= 0 && row < config.rows && col >= 0 && col < config.cols;
    },
    [config.cols, config.rows],
  );

  const placeMines = useCallback(
    (excludeRow: number, excludeCol: number): number[][] => {
      // Build a fresh empty board based on current config to avoid stale state
      const newBoard: number[][] = [];
      for (let i = 0; i < config.rows; i++) {
        newBoard[i] = [];
        for (let j = 0; j < config.cols; j++) {
          newBoard[i][j] = 0;
        }
      }
      let minesPlaced = 0;

      while (minesPlaced < config.mines) {
        const row = Math.floor(Math.random() * config.rows);
        const col = Math.floor(Math.random() * config.cols);

        // don't place a mine on the excluded cell or any of its 8 neighbors
        const isInExcludeNeighborhood =
          Math.abs(row - excludeRow) <= 1 && Math.abs(col - excludeCol) <= 1;
        if (newBoard[row][col] !== -1 && !isInExcludeNeighborhood) {
          newBoard[row][col] = -1;
          minesPlaced++;

          for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
              const newRow = row + i;
              const newCol = col + j;
              if (isValid(newRow, newCol) && newBoard[newRow][newCol] !== -1) {
                newBoard[newRow][newCol]++;
              }
            }
          }
        }
      }

      setBoard(newBoard);
      return newBoard;
    },
    [config.cols, config.mines, config.rows, isValid],
  );

  // Build a board from an explicit list of mine positions (for deterministic tests)
  const buildBoardFromMines = useCallback(
    (mines: Array<[number, number]>): number[][] => {
      const newBoard: number[][] = [];
      for (let i = 0; i < config.rows; i++) {
        newBoard[i] = [];
        for (let j = 0; j < config.cols; j++) {
          newBoard[i][j] = 0;
        }
      }

      for (const [row, col] of mines) {
        if (isValid(row, col)) {
          newBoard[row][col] = -1;
        }
      }

      for (let i = 0; i < config.rows; i++) {
        for (let j = 0; j < config.cols; j++) {
          if (newBoard[i][j] === -1) continue;
          let count = 0;
          for (let di = -1; di <= 1; di++) {
            for (let dj = -1; dj <= 1; dj++) {
              const ni = i + di;
              const nj = j + dj;
              if (isValid(ni, nj) && newBoard[ni][nj] === -1) count++;
            }
          }
          newBoard[i][j] = count;
        }
      }

      return newBoard;
    },
    [config.cols, config.rows, isValid],
  );

  const revealCellRecursive = useCallback(
    function recur(
      row: number,
      col: number,
      currentBoard: number[][],
      currentRevealed: boolean[][],
    ): void {
      if (
        !isValid(row, col) ||
        currentRevealed[row][col] ||
        flagged[row][col]
      ) {
        return;
      }

      currentRevealed[row][col] = true;

      if (currentBoard[row][col] === 0) {
        for (let i = -1; i <= 1; i++) {
          for (let j = -1; j <= 1; j++) {
            recur(row + i, col + j, currentBoard, currentRevealed);
          }
        }
      }
    },
    [flagged, isValid],
  );

  // Expose a test hook to set a deterministic board from Playwright/tests (always on in dev/test)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const testWindow = window as TestWindow;
    testWindow.__TEST_setMines = (mines: Array<[number, number]>) => {
      const newBoard = buildBoardFromMines(mines || []);
      setBoard(newBoard);
      setRevealed(newBoard.map((r) => r.map(() => false)));
      setFlagged(newBoard.map((r) => r.map(() => false)));
      setFirstClick(false);
      setIsRunning(false);
      setGameOver(false);
      setGameWon(false);
      setTimer(0);
      setFlagCount(0);
    };
    return () => {
      if (typeof window !== "undefined") {
        const tw = window as TestWindow;
        delete tw.__TEST_setMines;
      }
    };
  }, [buildBoardFromMines, config.cols, config.rows]);

  // checkWin moved to src/app/utils/gameUtils.ts

  const endGame = useCallback(
    (won: boolean, currentBoard: number[][]): void => {
      setGameOver(true);
      setGameWon(won);
      setIsRunning(false);

      const newRevealed = revealed.map((r) => [...r]);
      for (let i = 0; i < config.rows; i++) {
        for (let j = 0; j < config.cols; j++) {
          if (won) {
            // reveal everything when player wins by identifying all bombs
            newRevealed[i][j] = true;
          } else {
            // reveal mines when the player loses
            if (currentBoard[i][j] === -1) {
              newRevealed[i][j] = true;
            }
          }
        }
      }
      setRevealed(newRevealed);
    },
    [config.cols, config.rows, revealed],
  );

  // Check whether all mines have been correctly flagged moved to GameUtils.checkFlagsWin

  const handleCellClick = useCallback(
    (row: number, col: number): void => {
      if (gameOver || flagged[row][col] || revealed[row][col]) return;

      let currentBoard = board;

      if (firstClick) {
        currentBoard = placeMines(row, col);
        setFirstClick(false);
        setIsRunning(true);
      }

      const newRevealed = revealed.map((r) => [...r]);

      if (currentBoard[row][col] === -1) {
        newRevealed[row][col] = true;
        setRevealed(newRevealed);
        endGame(false, currentBoard);
        return;
      }

      revealCellRecursive(row, col, currentBoard, newRevealed);
      setRevealed(newRevealed);

      if (GameUtils.checkWin(config, newRevealed)) {
        endGame(true, currentBoard);
      }
    },
    [
      board,
      config,
      endGame,
      flagged,
      firstClick,
      gameOver,
      placeMines,
      revealCellRecursive,
      revealed,
    ],
  );

  const handleRightClick = (
    e: React.MouseEvent<HTMLDivElement>,
    row: number,
    col: number,
  ): void => {
    e.preventDefault();
    if (gameOver || revealed[row][col]) return;

    const newFlagged = flagged.map((r) => [...r]);
    newFlagged[row][col] = !newFlagged[row][col];
    setFlagged(newFlagged);
    setFlagCount((prev) => prev + (newFlagged[row][col] ? 1 : -1));
    // Check for win by flags
    if (GameUtils.checkFlagsWin(config, firstClick, newFlagged, board)) {
      endGame(true, board);
    }
  };

  // Toggle flag without an event (for keyboard)
  const toggleFlag = useCallback(
    (row: number, col: number): void => {
      if (gameOver || revealed[row][col]) return;
      const newFlagged = flagged.map((r) => [...r]);
      newFlagged[row][col] = !newFlagged[row][col];
      setFlagged(newFlagged);
      setFlagCount((prev) => prev + (newFlagged[row][col] ? 1 : -1));
      if (GameUtils.checkFlagsWin(config, firstClick, newFlagged, board)) {
        endGame(true, board);
      }
    },
    [board, config, endGame, firstClick, flagged, gameOver, revealed],
  );

  const handleDifficultyChange = (newDifficulty: Difficulty): void => {
    setDifficulty(newDifficulty);
    resetBoardForDifficulty(newDifficulty);
  };

  // keyboard navigation and actions
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (board.length === 0) return;

      const rows = config.rows;
      const cols = config.cols;

      let r = selectedRow;
      let c = selectedCol;

      // Prevent Space from scrolling the page
      if (e.key === " ") e.preventDefault();

      // If game over, Enter restarts
      if (e.key === "Enter" && gameOver) {
        initBoard();
        return;
      }

      switch (e.key) {
        case "ArrowUp":
        case "Numpad8":
          e.preventDefault();
          r = Math.max(0, r - 1);
          break;
        case "ArrowDown":
        case "Numpad2":
          e.preventDefault();
          r = Math.min(rows - 1, r + 1);
          break;
        case "ArrowLeft":
        case "Numpad4":
          e.preventDefault();
          c = Math.max(0, c - 1);
          break;
        case "ArrowRight":
        case "Numpad6":
          e.preventDefault();
          c = Math.min(cols - 1, c + 1);
          break;
        case "Home":
          c = 0;
          break;
        case "End":
          c = cols - 1;
          break;
        case " ": // Space -> reveal
          handleCellClick(selectedRow, selectedCol);
          return;
        case "x":
        case "X":
          toggleFlag(selectedRow, selectedCol);
          return;
        default:
          return;
      }

      setSelectedRow(r);
      setSelectedCol(c);

      // scroll selected cell into view
      const el = document.getElementById(`cell-${r}-${c}`);
      if (el)
        el.scrollIntoView({
          block: "nearest",
          inline: "nearest",
          behavior: "smooth",
        });
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    selectedRow,
    selectedCol,
    board,
    config.rows,
    config.cols,
    gameOver,
    revealed,
    flagged,
    handleCellClick,
    toggleFlag,
    initBoard,
  ]);

  const getCellContent = (row: number, col: number): string => {
    if (revealed[row][col]) {
      if (board[row][col] === -1) {
        return "💣";
      } else if (board[row][col] > 0) {
        return String(board[row][col]);
      }
      return "";
    } else if (flagged[row][col]) {
      return "🚩";
    }
    return "";
  };

  const getCellClass = (row: number, col: number): string => {
    let className = "cell";
    if (revealed[row][col]) {
      className += " revealed";
      if (board[row][col] === -1) {
        className += " mine";
      } else if (board[row][col] > 0) {
        className += ` number-${board[row][col]}`;
      }
    } else if (flagged[row][col]) {
      className += " flagged";
    }
    if (row === selectedRow && col === selectedCol) {
      className += " selected";
    }
    return className;
  };

  return (
    <>
      <style jsx>{`
        .game-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .game-card {
          background: white;
          border-radius: 15px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
          padding: 30px;
          max-width: 100%;
        }
        .cell {
          width: var(--cell-size, 30px);
          height: var(--cell-size, 30px);
          background: #ddd;
          border: 2px outset #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-weight: bold;
          font-size: 14px;
          user-select: none;
          box-sizing: border-box;
        }
        .cell:hover:not(.revealed):not(.flagged) {
          background: #ccc;
        }
        .cell.revealed {
          background: #f5f5f5;
          border: 1px solid #999;
          cursor: default;
        }
        .cell.flagged {
          background: #ffd700;
        }
        .cell.mine {
          background: #ff4444;
        }
        .cell.number-1 {
          color: blue;
        }
        .cell.number-2 {
          color: green;
        }
        .cell.number-3 {
          color: red;
        }
        .cell.number-4 {
          color: darkblue;
        }
        .cell.number-5 {
          color: darkred;
        }
        .cell.number-6 {
          color: cyan;
        }
        .cell.number-7 {
          color: black;
        }
        .cell.number-8 {
          color: gray;
        }
        .cell.selected {
          outline: 3px solid #0d6efd;
          outline-offset: 1px;
          box-shadow: 0 0 8px 2px rgba(13, 110, 253, 0.6);
        }
        .board-container {
          display: grid;
          gap: 2px;
          background: #999;
          padding: 5px;
          border-radius: 8px;
          grid-template-columns: repeat(${config.cols}, var(--cell-size, 30px));
          grid-auto-rows: var(--cell-size, 30px);
          width: 100%;
          justify-content: center;
        }
        .board-wrapper {
          overflow-x: auto;
          margin-top: 20px;
          max-width: 100%;
        }
        /* debug-info removed */
      `}</style>

      <div className="game-container">
        <div className="game-card" ref={gameCardRef}>
          <h1 className="text-center mb-4 display-5 fw-bold">💣 Minesweeper</h1>

          {/* debug panel removed */}

          <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
            <div className="d-flex gap-3">
              <div className="bg-light px-3 py-2 rounded fw-bold">
                ⏱️ {String(timer).padStart(3, "0")}
              </div>
              <div className="bg-light px-3 py-2 rounded fw-bold">
                🚩 {config.mines - flagCount}
              </div>
            </div>
            <button onClick={initBoard} className="btn btn-primary fw-bold">
              New Game
            </button>
          </div>

          {gameOver ? (
            <div
              className={`text-center mb-3 h3 fw-bold ${gameWon ? "text-success" : "text-danger"}`}
            >
              {gameWon ? "🎉 You Won!" : "💥 Game Over!"}
            </div>
          ) : (
            <div className="mb-3 text-center text-muted small">
              <p className="mb-1">
                <strong>How to play:</strong>
              </p>
              <p className="mb-0">
                Mouse: left click to reveal • Right click to flag
              </p>
              <p className="mb-0">
                Keyboard: Arrow keys move • Space reveal • X flag
              </p>
            </div>
          )}

          <div className="btn-group mb-4 w-100" role="group">
            <button
              type="button"
              onClick={() => handleDifficultyChange("easy")}
              className={`btn ${difficulty === "easy" ? "btn-primary" : "btn-outline-primary"}`}
            >
              Easy (9x9)
            </button>
            <button
              type="button"
              onClick={() => handleDifficultyChange("medium")}
              className={`btn ${difficulty === "medium" ? "btn-primary" : "btn-outline-primary"}`}
            >
              Medium (16x16)
            </button>
            <button
              type="button"
              onClick={() => handleDifficultyChange("hard")}
              className={`btn ${difficulty === "hard" ? "btn-primary" : "btn-outline-primary"}`}
            >
              Hard (16x30)
            </button>
          </div>

          <div className="board-wrapper">
            <div
              className="board-container"
              style={
                {
                  "--cell-size": `${cellSize}px`,
                  gridTemplateColumns: `repeat(${config.cols}, ${cellSize}px)`,
                } as React.CSSProperties
              }
            >
              {board.map((row, i) =>
                row.map((_, j) => (
                  <div
                    id={`cell-${i}-${j}`}
                    key={`${i}-${j}`}
                    className={getCellClass(i, j)}
                    onClick={() => {
                      setSelectedRow(i);
                      setSelectedCol(j);
                      handleCellClick(i, j);
                    }}
                    onContextMenu={(e) => handleRightClick(e, i, j)}
                  >
                    {getCellContent(i, j)}
                  </div>
                )),
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
