import React, { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import GameStatusLabel from "../components/labels/GameStatusLabel";
import { useAppSelector } from "../store/hooks";

const GameResult = ({ gameWon }: { gameWon: boolean }): React.JSX.Element => (
  <GameStatusLabel
    iconClassName={gameWon ? "fa-solid fa-trophy" : "fa-solid fa-bomb"}
    text={gameWon ? <>You Won!</> : "Game Over!"}
    className={gameWon ? "text-success" : "text-danger"}
    containerTestId="game-status"
    iconTestId="game-status-icon"
  />
);

const GameInfoContainer = (): React.JSX.Element => {
  const { gameOver, gameWon } = useAppSelector((state) => state.game);
  const [isNativeMobile, setIsNativeMobile] = useState(false);

  useEffect(() => {
    setIsNativeMobile(Capacitor.isNativePlatform?.() ?? false);
  }, []);

  if (gameOver) {
    return <GameResult gameWon={gameWon} />;
  }

  return (
    <div className="mb-3 text-center" style={{ fontSize: "14px" }}>
      <h5 className="mb-2">How to play</h5>
      {isNativeMobile ? (
        <p className="mb-0">
          Tap to reveal — Long press to flag — Drag to move the board on larger
          grids
        </p>
      ) : (
        <>
          <p className="mb-0">
            Mouse: left click to reveal — Right click to flag
          </p>
          <p className="mb-0">
            Keyboard: Arrow keys move — Space reveals — X flags
          </p>
        </>
      )}
    </div>
  );
};

export default GameInfoContainer;
