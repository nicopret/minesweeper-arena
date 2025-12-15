import React from "react";
import {
  DIFFICULTIES,
  startNewGame,
  type Difficulty,
} from "../store/gameSlice";
import OptionButton from "../components/buttons/OptionButton";
import { useAppDispatch, useAppSelector } from "../store/hooks";

const DifficultyOptionContainer = (): React.JSX.Element => {
  const dispatch = useAppDispatch();
  const selected = useAppSelector((state) => state.game.difficulty);

  const difficultyLabel = (level: Difficulty): string =>
    `${DIFFICULTIES[level].rows}x${DIFFICULTIES[level].cols}`;

  const handleChange = (level: Difficulty): void => {
    if (level === selected) return;
    dispatch(startNewGame({ difficulty: level }));
  };

  return (
    <div className="btn-group mb-4 w-100" role="group">
      {(["easy", "medium", "hard"] as Difficulty[]).map((level) => (
        <OptionButton
          key={level}
          onClick={() => handleChange(level)}
          active={selected === level}
          label={`${level.charAt(0).toUpperCase() + level.slice(1)} (${difficultyLabel(level)})`}
        />
      ))}
    </div>
  );
};

export default DifficultyOptionContainer;
