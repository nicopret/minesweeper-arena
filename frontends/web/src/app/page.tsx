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
import GoogleLoginPanel from "./components/auth/GoogleLoginPanel";
import HighscoresPanel from "./components/highscores/HighscoresPanel";
import { setHighscores } from "./store/authSlice";
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
    score,
    difficulty,
    selectedRow,
    selectedCol,
    resetId,
  } = gameState;

  const isTestEnv = process.env.NODE_ENV === "test";
  const scoreboardApiBase = process.env.NEXT_PUBLIC_SCOREBOARD_API_BASE_URL;
  const [cellSize, setCellSize] = useState(30);
  const gameCardRef = useRef<HTMLDivElement | null>(null);
  const [hasMounted, setHasMounted] = useState(false);
  const autoClickRanFor = useRef(0);
  const [isNativeMobile, setIsNativeMobile] = useState(false);
  const lastScoreSyncResetId = useRef<number | null>(null);

  const user = useAppSelector((state) => state.auth.user);
  const highscores = useAppSelector((state) => state.auth.highscores);

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
      dispatch(revealCellAction({ row, col, userInitiated: true }));
    },
    [dispatch],
  );

  // Toggle flag without an event (for keyboard)
  const toggleFlag = useCallback(
    (row: number, col: number): void => {
      dispatch(toggleFlagAction({ row, col, userInitiated: true }));
    },
    [dispatch],
  );

  // Push new high scores to the API when a game is won.
  useEffect(() => {
    if (!gameOver || !gameWon) return;
    if (score === null || score === undefined) return;
    if (!user?.userId) return;
    if (!scoreboardApiBase) return;
    if (lastScoreSyncResetId.current === resetId) return;

    const levelIdMap = {
      easy: "easy-9x9",
      medium: "medium-16x16",
      hard: "hard-16x30",
    } as const;
    const levelId = levelIdMap[difficulty];

    const existingEntry = highscores.find((h) => h.levelId === levelId);
    const existingScores = Array.isArray(existingEntry?.scores)
      ? [...existingEntry.scores]
      : typeof existingEntry?.highScore === "number"
        ? [existingEntry.highScore]
        : [];

    const nextScores = [...existingScores, score]
      .filter((n): n is number => typeof n === "number" && Number.isFinite(n))
      .sort((a, b) => b - a)
      .slice(0, 15);

    const changed =
      nextScores.length !== existingScores.length ||
      nextScores.some((v, i) => v !== existingScores[i]);

    if (!changed) {
      lastScoreSyncResetId.current = resetId;
      return;
    }

    lastScoreSyncResetId.current = resetId;

    const base = scoreboardApiBase.replace(/\/$/, "");
    const userId = user.userId;

    void (async () => {
      try {
        await fetch(
          `${base}/${encodeURIComponent(userId)}/minesweeper/${encodeURIComponent(levelId)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ scores: nextScores }),
          },
        );
      } catch (err) {
        console.warn("Failed to update highscores", err);
      } finally {
        const updatedEntry = {
          levelId,
          highScore: nextScores[0],
          scores: nextScores,
          attempts: nextScores.length,
          updatedAt: Date.now(),
          bestTimeMs: existingEntry?.bestTimeMs,
        };
        const merged = [
          ...highscores.filter((h) => h.levelId !== levelId),
          updatedEntry,
        ].sort((a, b) => (b.highScore ?? 0) - (a.highScore ?? 0));
        dispatch(setHighscores(merged));
      }
    })();
  }, [
    dispatch,
    gameOver,
    gameWon,
    score,
    user?.userId,
    scoreboardApiBase,
    resetId,
    highscores,
    difficulty,
  ]);

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
      dispatch(
        revealCellAction({
          row: clickRow,
          col: clickCol,
          userInitiated: false,
        }),
      );
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
          <div className={styles.banner}>
            <div className={styles.bannerLeft} aria-hidden="true" />
            <div className={styles.bannerTitle}>
              <i className="fa-solid fa-bomb me-2" aria-hidden="true" />
              <span className={styles.bannerTitleText}>Minesweeper</span>
            </div>
            <div className={styles.bannerRight}>
              <GoogleLoginPanel />
            </div>
          </div>

          <div className={styles.twoColumn}>
            <section
              className={`${styles.gameInfoPanel} ${styles.infoSection} ${styles.mobileOnly}`}
              aria-label="How to play instructions"
            >
              <GameInfoContainer />
            </section>
            <section
              className={`${styles.leftPanel} ${styles.scoreSection} ${styles.mobileOnly}`}
              aria-label="Scoreboard"
            >
              <HighscoresPanel />
            </section>
            <section
              className={styles.desktopLeftColumn}
              aria-label="How to play and highscores"
            >
              <div className={styles.gameInfoPanel}>
                <GameInfoContainer />
              </div>
              <div className={styles.leftPanel}>
                <HighscoresPanel />
              </div>
            </section>
            <section className={styles.rightPanel} aria-label="Game board">
              <DifficultyOptionContainer />
              <TimerContainer onNewGame={handleNewGame} />
              <BoardContainer cellSize={cellSize} />
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
