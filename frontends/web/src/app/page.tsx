"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import {
  revealCell as revealCellAction,
  setSelection,
  setTestMines,
  startNewGame,
  tick,
  toggleFlag as toggleFlagAction,
} from "./store/gameSlice";
import { useAppDispatch, useAppSelector } from "./store/hooks";
import TimerContainer from "./containers/TimerContainer";
import GameInfoContainer from "./containers/GameInfoContainer";
import DifficultyOptionContainer from "./containers/DifficultyOptionContainer";
import BoardContainer from "./containers/BoardContainer";
import AuthContainer from "./containers/AuthContainer";
import LeaderboardContainer from "./containers/LeaderboardContainer";
import {
  submitRunAndMaybeUpdateLeaderboard,
  setMessage,
} from "./store/scoreServerSlice";
import { getModeFromGameState } from "./utils/modeUtils";
import styles from "./page.module.css";

type TestWindow = typeof window & {
  __TEST_setMines?: (mines: Array<[number, number]>) => void;
};

export default function Minesweeper() {
  const dispatch = useAppDispatch();
  const gameState = useAppSelector((state) => state.game);
  const {
    config,
    board,
    revealed,
    flagged,
    gameOver,
    gameWon,
    isRunning,
    selectedRow,
    selectedCol,
    resetId,
    timer,
    flagCount,
    difficulty,
  } = gameState;

  const isTestEnv = process.env.NODE_ENV === "test";
  const [cellSize, setCellSize] = useState(30);
  const gameCardRef = useRef<HTMLDivElement | null>(null);
  const [hasMounted, setHasMounted] = useState(false);
  const autoClickRanFor = useRef(0);
  const [isNativeMobile, setIsNativeMobile] = useState(false);
  const lastSubmittedFor = useRef<number>(-1);
  const authToken = useAppSelector((state) => state.scoreServer.token);
  const submitStatus = useAppSelector(
    (state) => state.scoreServer.submitStatus,
  );
  const lastSubmit = useAppSelector((state) => state.scoreServer.lastSubmit);

  // Track client mount to keep SSR/CSR consistent
  useEffect(() => {
    setHasMounted(true);
    setIsNativeMobile(Capacitor.isNativePlatform?.() ?? false);
  }, []);

  // Default selection to the top-left in tests to make behavior deterministic
  useEffect(() => {
    if (isTestEnv) {
      dispatch(setSelection({ row: 0, col: 0 }));
    }
  }, [dispatch, isTestEnv]);

  // Initialize the board once on mount (skip heavy auto-play in tests)
  useEffect(() => {
    if (isTestEnv) return;
    dispatch(startNewGame(undefined));
  }, [dispatch, isTestEnv]);

  // Responsive cell sizing: compute cell size to fit board inside the card
  useEffect(() => {
    const updateCellSize = () => {
      // On native mobile, keep the easy-grid size and allow panning for larger grids.
      if (isNativeMobile && config.cols > 9) {
        setCellSize(30);
        return;
      }

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
  }, [config.cols, isNativeMobile]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isRunning && !gameOver) {
      interval = setInterval(() => {
        dispatch(tick());
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [dispatch, isRunning, gameOver]);

  // Submit run on win (only once per resetId)
  useEffect(() => {
    if (!gameOver || !gameWon) return;
    if (lastSubmittedFor.current === resetId) return;
    lastSubmittedFor.current = resetId;

    if (!authToken) {
      void dispatch(
        setMessage(
          "You won, but you’re playing as a guest. Log in to submit runs.",
        ),
      );
      return;
    }

    const mode = getModeFromGameState({ difficulty, config });
    const totalCells = config.rows * config.cols;
    const clientVersion = process.env.NEXT_PUBLIC_CLIENT_VERSION;

    void dispatch(
      submitRunAndMaybeUpdateLeaderboard({
        payload: {
          mode,
          secondsTaken: timer,
          bombsMarked: flagCount,
          totalCells,
          clientPlatform: "web",
          clientVersion,
        },
      }),
    );
  }, [
    authToken,
    config,
    difficulty,
    dispatch,
    flagCount,
    gameOver,
    gameWon,
    resetId,
    timer,
  ]);

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

  // Toggle flag without an event (for keyboard)
  const toggleFlag = useCallback(
    (row: number, col: number): void => {
      dispatch(toggleFlagAction({ row, col }));
    },
    [dispatch],
  );

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

  if (!hasMounted) {
    return (
      <div className={`${styles.gameContainer} game-container`}>
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-12 col-md-10 col-lg-8">
              <div className={`${styles.gameCard} game-card`}>
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
      <div className={`${styles.gameContainer} game-container`}>
        <div className={`${styles.gameCard} game-card`} ref={gameCardRef}>
          <h1 className="text-center mb-4 display-5 fw-bold">
            <i className="fa-solid fa-bomb me-2" aria-hidden="true" />
            Minesweeper
          </h1>

          <TimerContainer onNewGame={handleNewGame} />

          <AuthContainer />

          <GameInfoContainer />

          {gameOver && gameWon && submitStatus === "succeeded" && lastSubmit ? (
            <div className="alert alert-success py-2 px-3 mb-3" role="alert">
              Submitted score: <strong>{lastSubmit.score.toFixed(4)}</strong>
              {lastSubmit.isPb ? " (PB!)" : ""}
            </div>
          ) : null}

          <LeaderboardContainer />

          <DifficultyOptionContainer />

          <BoardContainer cellSize={cellSize} />
        </div>
      </div>
    </>
  );
}
