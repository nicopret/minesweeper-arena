import React from "react";
import GameStatusLabel from "../components/labels/GameStatusLabel";
import { useAppSelector } from "../store/hooks";

const GameResult = ({ gameWon }: { gameWon: boolean }): React.JSX.Element => (
  <GameStatusLabel
    iconClassName={gameWon ? "fa-solid fa-trophy" : "fa-solid fa-bomb"}
    text={gameWon ? "You Won!" : "Game Over!"}
    className={gameWon ? "text-success" : "text-danger"}
    containerTestId="game-status"
    iconTestId="game-status-icon"
  />
);

const GameInfoContainer = (): React.JSX.Element => {
  const { gameOver, gameWon } = useAppSelector((state) => state.game);

  if (gameOver) {
    return <GameResult gameWon={gameWon} />;
  }

  return (
    <div className="mb-3 text-center text-muted small">
      <p className="mb-1">
        <strong>How to play:</strong>
      </p>
      <p className="mb-0">Mouse: left click to reveal • Right click to flag</p>
      <p className="mb-0">Keyboard: Arrow keys move • Space reveal • X flag</p>
    </div>
  );
};

export default GameInfoContainer;
