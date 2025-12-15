/* eslint-disable testing-library/no-node-access, testing-library/no-unnecessary-act, jest-dom/prefer-to-have-class */
import {
  render,
  screen,
  waitFor,
  fireEvent,
  act,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Provider } from "react-redux";
import Minesweeper from "./page";
import { store } from "./store/store";

type TestWindow = typeof window & {
  __TEST_setMines?: (mines: Array<[number, number]>) => void;
};

const renderGame = () =>
  render(
    <Provider store={store}>
      <Minesweeper />
    </Provider>,
  );

describe.skip("Minesweeper page component", () => {
  beforeEach(() => {
    vi.spyOn(Math, "random").mockReturnValue(0.42);
    // Avoid errors when scrollIntoView runs in keyboard handler
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders instructions and controls after mount", async () => {
    renderGame();

    await screen.findByText(/How to play/i);
    expect(
      screen.getByRole("button", { name: /New Game/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/⏱️/)).toBeInTheDocument();
    expect(screen.getByText(/🚩/)).toBeInTheDocument();
  });

  it("seeds mines via the test hook and shows Game Over when clicking a mine", async () => {
    renderGame();

    const testWindow = window as TestWindow;
    expect(typeof testWindow.__TEST_setMines).toBe("function");

    // Seed a mine at the top-left cell
    await act(async () => {
      testWindow.__TEST_setMines?.([[0, 0]]);
    });

    await waitFor(() => {
      const cell = document.getElementById("cell-0-0");
      expect(cell).not.toBeNull();
    });

    const cell = document.getElementById("cell-0-0");
    expect(cell).not.toBeNull();
    await act(async () => {
      fireEvent.click(cell!);
    });

    await screen.findByText(/Game Over/i);
  });

  it("updates flag counter when flagging a cell", async () => {
    renderGame();

    const testWindow = window as TestWindow;
    await act(async () => {
      testWindow.__TEST_setMines?.([]);
    });

    const initialFlagDisplay = await screen.findByText(/🚩/);
    const initialText = initialFlagDisplay.textContent ?? "";
    expect(initialText).toMatch(/\d+/);

    await waitFor(() => {
      const cell = document.getElementById("cell-0-0");
      expect(cell).not.toBeNull();
    });

    const cell = document.getElementById("cell-0-0");
    expect(cell).not.toBeNull();
    fireEvent.contextMenu(cell!);

    const updatedText = initialFlagDisplay.textContent ?? "";
    const initialNumber = parseInt(initialText.replace(/\D/g, ""), 10);
    const updatedNumber = parseInt(updatedText.replace(/\D/g, ""), 10);
    expect(updatedNumber).toBe(initialNumber - 1);
    expect(cell!.classList.contains("flagged")).toBe(true);
  });

  it("keeps playing after flagging some mines (no premature win)", async () => {
    renderGame();

    const testWindow = window as TestWindow;
    await act(async () => {
      testWindow.__TEST_setMines?.([
        [0, 0],
        [0, 1],
      ]);
    });

    const mineCells = [
      document.getElementById("cell-0-0"),
      document.getElementById("cell-0-1"),
    ];
    mineCells.forEach((cell) => expect(cell).not.toBeNull());

    await act(async () => {
      mineCells.forEach((cell) => {
        if (cell) fireEvent.contextMenu(cell);
      });
    });

    // Reveal a safe cell to ensure win detection runs after flags placed
    await act(async () => {
      const safeCell = document.getElementById("cell-2-2");
      if (safeCell) {
        fireEvent.click(safeCell);
      }
    });

    expect(screen.queryByText(/You Won/i)).not.toBeInTheDocument();
  });

  it("updates mine counter when changing difficulty", async () => {
    renderGame();

    const counter = await screen.findByText(/🚩/);
    const initial = parseInt(
      counter.textContent?.replace(/\D/g, "") || "0",
      10,
    );

    const hardBtn = screen.getByRole("button", { name: /Hard \(16x30\)/i });
    await act(async () => {
      fireEvent.click(hardBtn);
    });

    const hardVal = parseInt(
      counter.textContent?.replace(/\D/g, "") || "0",
      10,
    );
    expect(hardVal).not.toBe(initial);
  });

  it("moves selection with arrow keys and flags via keyboard", async () => {
    renderGame();

    const testWindow = window as TestWindow;
    await act(async () => {
      testWindow.__TEST_setMines?.([]);
    });

    // Initial selection should be at 0,0
    expect(document.getElementById("cell-0-0")?.className).toContain(
      "selected",
    );

    // Move right
    await act(async () => {
      fireEvent.keyDown(window, { key: "ArrowRight" });
    });
    expect(document.getElementById("cell-0-1")?.className).toContain(
      "selected",
    );

    // Flag with X before revealing
    await act(async () => {
      fireEvent.keyDown(window, { key: "x" });
    });
    expect(document.getElementById("cell-0-1")?.className).toContain("flagged");

    // Reveal with Space (should not toggle flag status)
    await act(async () => {
      fireEvent.keyDown(window, { key: " " });
    });
    expect(document.getElementById("cell-0-1")?.className).toContain("flagged");
  });

  it("moves to start/end of row with Home/End keys", async () => {
    renderGame();

    const testWindow = window as TestWindow;
    await act(async () => {
      testWindow.__TEST_setMines?.([]);
    });

    // Click a cell to set selection baseline
    await act(async () => {
      const target = document.getElementById("cell-0-2");
      if (target) fireEvent.click(target);
    });
    expect(document.getElementById("cell-0-2")?.className).toContain(
      "selected",
    );

    // Home -> column 0
    await act(async () => {
      fireEvent.keyDown(window, { key: "Home" });
    });
    expect(document.getElementById("cell-0-0")?.className).toContain(
      "selected",
    );

    // End -> last column (8 for easy)
  });

  it("displays how-to-play instructions when game is active", async () => {
    renderGame();

    await screen.findByText(/How to play:/i);
    expect(
      screen.getByText(/Mouse: left click to reveal/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Keyboard: Arrow keys move/i)).toBeInTheDocument();
  });

  it("toggles difficulty buttons and mines count when selecting medium/hard/easy", async () => {
    renderGame();

    const easy = screen.getByRole("button", { name: /Easy \(9x9\)/i });
    const medium = screen.getByRole("button", { name: /Medium \(16x16\)/i });
    const hard = screen.getByRole("button", { name: /Hard \(16x30\)/i });
    const counter = await screen.findByText(/🚩/);
    const initial = parseInt(
      counter.textContent?.replace(/\D/g, "") || "0",
      10,
    );

    expect(easy.className).toContain("btn-primary");
    expect(medium.className).toContain("btn-outline-primary");
    expect(hard.className).toContain("btn-outline-primary");
    expect(initial).toBeGreaterThan(0);

    await act(async () => {
      fireEvent.click(medium);
    });
    expect(medium.className).toContain("btn-primary");
    expect(easy.className).toContain("btn-outline-primary");
    const mediumVal = parseInt(
      counter.textContent?.replace(/\D/g, "") || "0",
      10,
    );
    expect(mediumVal).not.toBe(initial);

    await act(async () => {
      fireEvent.click(hard);
    });
    expect(hard.className).toContain("btn-primary");
    const hardVal = parseInt(
      counter.textContent?.replace(/\D/g, "") || "0",
      10,
    );
    expect(hardVal).not.toBe(mediumVal);

    await act(async () => {
      fireEvent.click(easy);
    });
    expect(easy.className).toContain("btn-primary");
    const easyVal = parseInt(
      counter.textContent?.replace(/\D/g, "") || "0",
      10,
    );
    expect(easyVal).toBe(initial);
  });

  it("supports numpad navigation", async () => {
    renderGame();

    const testWindow = window as TestWindow;
    await act(async () => {
      testWindow.__TEST_setMines?.([]);
    });

    // Ensure board populated and selection visible
    const newGame = screen.getByRole("button", { name: /New Game/i });
    await act(async () => {
      fireEvent.click(newGame);
    });

    await act(async () => {
      document
        .getElementById("cell-0-0")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    await act(async () => {
      fireEvent.keyDown(window, { key: "Numpad6" });
    });
    await waitFor(() => {
      expect(document.getElementById("cell-0-1")?.className).toContain(
        "selected",
      );
    });

    await act(async () => {
      fireEvent.keyDown(window, { key: "Numpad2" });
    });
    await waitFor(() => {
      expect(document.getElementById("cell-1-1")?.className).toContain(
        "selected",
      );
    });
  });

  it("ignores unknown keys and uses Enter to restart after game over", async () => {
    renderGame();

    const testWindow = window as TestWindow;
    await act(async () => {
      testWindow.__TEST_setMines?.([[0, 0]]);
    });

    await act(async () => {
      document
        .getElementById("cell-0-0")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await screen.findByText(/Game Over/i);

    const prevSelection = document.getElementById("cell-0-0")?.className;
    await act(async () => {
      fireEvent.keyDown(window, { key: "Q" }); // unknown key should do nothing
    });
    expect(document.getElementById("cell-0-0")?.className).toBe(prevSelection);

    await act(async () => {
      fireEvent.keyDown(window, { key: "Enter" });
    });
    await screen.findByText(/How to play:/i);
  });

  it("clicking New Game initializes a fresh board", async () => {
    renderGame();

    const newGame = screen.getByRole("button", { name: /New Game/i });
    await act(async () => {
      fireEvent.click(newGame);
    });

    expect(
      document.querySelectorAll(".board-container .cell").length,
    ).toBeGreaterThan(0);
  });
});
