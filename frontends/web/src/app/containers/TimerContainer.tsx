import React from "react";
import IconTextLabel from "../components/labels/IconTextLabel";
import StandardButton from "../components/buttons/StandardButton";
import TwoColumnLayout from "../components/layouts/TwoColumnLayout";
import { useAppSelector } from "../store/hooks";

type TimerContainerProps = {
  onNewGame: () => void;
};

const FlagLabel = (): React.JSX.Element => {
  const flagCount = useAppSelector((state) => state.game.flagCount);
  const totalMines = useAppSelector((state) => state.game.config.mines);
  return (
    <IconTextLabel
      containerTestId="flags-display"
      iconTestId="flags-icon"
      iconClassName="fa-solid fa-flag"
      text={totalMines - flagCount}
    />
  );
};

const NewGameButton = ({
  onNewGame,
}: {
  onNewGame: () => void;
}): React.JSX.Element => (
  <StandardButton
    label="New Game"
    variantClass="btn-primary"
    onClick={onNewGame}
  />
);

const TimerLabel = (): React.JSX.Element => {
  const timer = useAppSelector((state) => state.game.timer);
  return (
    <IconTextLabel
      containerTestId="timer-display"
      iconTestId="timer-icon"
      iconClassName="fa-regular fa-clock"
      text={String(timer).padStart(3, "0")}
    />
  );
};

const TimerContainer = ({
  onNewGame,
}: TimerContainerProps): React.JSX.Element => {
  return (
    <TwoColumnLayout
      left={
        <>
          <TimerLabel />
          <FlagLabel />
        </>
      }
      right={<NewGameButton onNewGame={onNewGame} />}
    />
  );
};

export default TimerContainer;
