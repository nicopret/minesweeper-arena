"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  DIFFICULTIES,
  revealCell as revealCellAction,
  setSelection,
  setTestMines,
  startNewGame,
  tick,
  toggleFlag as toggleFlagAction,
  type Difficulty,
} from "./store/gameSlice";
import { useAppDispatch, useAppSelector } from "./store/hooks";

type TestWindow = typeof window & {
  __TEST_setMines?: (mines: Array<[number, number]>) => void;
};

export default function Minesweeper() {
  const dispatch = useAppDispatch();
  const {
    difficulty,
    config,
    board,
    revealed,
    flagged,
    gameOver,
    gameWon,
    timer,
    flagCount,
    isRunning,
    selectedRow,
    selectedCol,
    resetId,
  } = useAppSelector((state) => state.game);

  const isTestEnv = process.env.NODE_ENV === "test";
  const [cellSize, setCellSize] = useState(30);
  const gameCardRef = useRef<HTMLDivElement | null>(null);
  const [hasMounted, setHasMounted] = useState(false);
  const autoClickRanFor = useRef(0);

  // Track client mount to keep SSR/CSR consistent
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasMounted(true);
  }, []);

  // Initialize the board once on mount (skip heavy auto-play in tests)
  useEffect(() => {
    if (isTestEnv) return;
    dispatch(startNewGame(undefined));
  }, [dispatch, isTestEnv]);

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
        dispatch(tick());
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [dispatch, isRunning, gameOver]);

  // Expose a test hook to set a deterministic board from Playwright/tests (always on in dev/test)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const testWindow = window as TestWindow;
    testWindow.__TEST_setMines = (mines: Array<[number, number]>) => {
      dispatch(setTestMines(mines || []));
    };
    return () => {
      if (typeof window !== "undefined") {
        const tw = window as TestWindow;
        delete tw.__TEST_setMines;
      }
    };
  }, [dispatch]);

  const handleNewGame = useCallback(() => {
    dispatch(startNewGame(undefined));
  }, [dispatch]);

  const handleCellClick = useCallback(
    (row: number, col: number): void => {
      dispatch(setSelection({ row, col }));
      dispatch(revealCellAction({ row, col }));
    },
    [dispatch],
  );

  const handleRightClick = (
    e: React.MouseEvent<HTMLDivElement>,
    row: number,
    col: number,
  ): void => {
    e.preventDefault();
    dispatch(toggleFlagAction({ row, col }));
  };

  // Toggle flag without an event (for keyboard)
  const toggleFlag = useCallback(
    (row: number, col: number): void => {
      dispatch(toggleFlagAction({ row, col }));
    },
    [dispatch],
  );

  const handleDifficultyChange = (newDifficulty: Difficulty): void => {
    dispatch(startNewGame({ difficulty: newDifficulty }));
  };

  const difficultyLabel = (level: Difficulty): string =>
    `${DIFFICULTIES[level].rows}x${DIFFICULTIES[level].cols}`;

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
        handleNewGame();
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

      dispatch(setSelection({ row: r, col: c }));

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
    board.length,
    config.rows,
    config.cols,
    gameOver,
    handleCellClick,
    toggleFlag,
    handleNewGame,
    dispatch,
  ]);

  // Auto-click a nearby empty cell after a reset (skip in tests)
  useEffect(() => {
    if (
      isTestEnv ||
      board.length === 0 ||
      resetId === 0 ||
      autoClickRanFor.current === resetId
    )
      return;
    autoClickRanFor.current = resetId;
    const timeout = setTimeout(() => {
      let clickRow = selectedRow;
      let clickCol = selectedCol;
      let found = false;
      for (
        let radius = 0;
        radius < Math.max(config.rows, config.cols) && !found;
        radius++
      ) {
        for (
          let r = Math.max(0, selectedRow - radius);
          r <= Math.min(config.rows - 1, selectedRow + radius);
          r++
        ) {
          for (
            let c = Math.max(0, selectedCol - radius);
            c <= Math.min(config.cols - 1, selectedCol + radius);
            c++
          ) {
            if (!revealed[r][c] && !flagged[r][c]) {
              clickRow = r;
              clickCol = c;
              found = true;
              break;
            }
          }
          if (found) break;
        }
      }
      dispatch(setSelection({ row: clickRow, col: clickCol }));
      dispatch(revealCellAction({ row: clickRow, col: clickCol }));
    }, 0);
    return () => clearTimeout(timeout);
  }, [
    board.length,
    config.cols,
    config.rows,
    dispatch,
    flagged,
    isTestEnv,
    revealed,
    resetId,
    selectedCol,
    selectedRow,
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

  if (!hasMounted) {
    return (
      <div className="game-container">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-12 col-md-10 col-lg-8">
              <div className="game-card">
                <h1 className="text-center mb-4">Minesweeper</h1>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div className="bg-light rounded px-3 py-2">
                    <strong>Mines:</strong> {config.mines}
                  </div>
                  <button type="button" className="btn btn-primary fw-bold">
                    New Game
                  </button>
                  <div className="bg-light rounded px-3 py-2">
                    <strong>Time:</strong> 0s
                  </div>
                </div>
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
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
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
            <button onClick={handleNewGame} className="btn btn-primary fw-bold">
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
              Easy ({difficultyLabel("easy")})
            </button>
            <button
              type="button"
              onClick={() => handleDifficultyChange("medium")}
              className={`btn ${difficulty === "medium" ? "btn-primary" : "btn-outline-primary"}`}
            >
              Medium ({difficultyLabel("medium")})
            </button>
            <button
              type="button"
              onClick={() => handleDifficultyChange("hard")}
              className={`btn ${difficulty === "hard" ? "btn-primary" : "btn-outline-primary"}`}
            >
              Hard ({difficultyLabel("hard")})
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
