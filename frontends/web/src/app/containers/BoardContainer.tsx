import React from "react";
import {
  revealCell as revealCellAction,
  setSelection,
  toggleFlag as toggleFlagAction,
} from "../store/gameSlice";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { GameUtils } from "../utils/gameUtils";
import styles from "../page.module.css";

type BoardContainerProps = {
  cellSize: number;
};

const BoardContainer = ({
  cellSize,
}: BoardContainerProps): React.JSX.Element => {
  const dispatch = useAppDispatch();
  const gameState = useAppSelector((state) => state.game);
  const { config, board } = gameState;

  const handleCellClick = (row: number, col: number): void => {
    dispatch(setSelection({ row, col }));
    dispatch(revealCellAction({ row, col }));
  };

  const handleRightClick = (
    e: React.MouseEvent<HTMLDivElement>,
    row: number,
    col: number,
  ): void => {
    e.preventDefault();
    dispatch(toggleFlagAction({ row, col }));
  };

  const getCellClass = (row: number, col: number): string => {
    const baseClasses = GameUtils.getCellClass(gameState, row, col);
    const combined = baseClasses.flatMap((cls) => {
      const moduleClass = styles[cls as keyof typeof styles];
      return moduleClass ? [moduleClass, cls] : [cls];
    });
    return combined.filter(Boolean).join(" ");
  };

  return (
    <div className={`${styles.boardWrapper} board-wrapper`}>
      <div
        className={`${styles.boardContainer} board-container`}
        style={
          {
            "--cell-size": `${cellSize}px`,
            "--cols": String(config.cols),
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
              {GameUtils.getCellContent(gameState, i, j)}
            </div>
          )),
        )}
      </div>
    </div>
  );
};

export default BoardContainer;
