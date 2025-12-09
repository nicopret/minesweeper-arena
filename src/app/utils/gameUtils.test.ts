import { GameUtils } from './gameUtils';

describe('GameUtils.checkWin', () => {
  it('returns false when not all non-mine cells are revealed', () => {
    const config = { rows: 3, cols: 3, mines: 1 };
    const revealed = [
      [true, true, true],
      [true, false, false],
      [true, true, true],
    ];
    expect(GameUtils.checkWin(config, revealed)).toBe(false);
  });

  it('returns true when all non-mine cells are revealed', () => {
    const config = { rows: 3, cols: 3, mines: 1 };
    const revealed = [
      [true, true, true],
      [true, false, true],
      [true, true, true],
    ];
    expect(GameUtils.checkWin(config, revealed)).toBe(true);
  });
});

describe('GameUtils.checkFlagsWin', () => {
  it('returns false if firstClick is true', () => {
    const config = { rows: 3, cols: 3, mines: 1 };
    const flagged = [
      [false, false, false],
      [false, false, false],
      [false, false, false],
    ];
    const board = [
      [0, 0, 0],
      [0, -1, 0],
      [0, 0, 0],
    ];
    expect(GameUtils.checkFlagsWin(config, true, flagged, board)).toBe(false);
  });

  it('returns true when all mines are flagged correctly', () => {
    const config = { rows: 3, cols: 3, mines: 1 };
    const flagged = [
      [false, false, false],
      [false, true, false],
      [false, false, false],
    ];
    const board = [
      [0, 0, 0],
      [0, -1, 0],
      [0, 0, 0],
    ];
    expect(GameUtils.checkFlagsWin(config, false, flagged, board)).toBe(true);
  });

  it('returns false when a flag is on a non-mine cell', () => {
    const config = { rows: 3, cols: 3, mines: 1 };
    const flagged = [
      [true, false, false],
      [false, false, false],
      [false, false, false],
    ];
    const board = [
      [0, 0, 0],
      [0, -1, 0],
      [0, 0, 0],
    ];
    expect(GameUtils.checkFlagsWin(config, false, flagged, board)).toBe(false);
  });

  it('returns false when number of flags does not match mines', () => {
    const config = { rows: 3, cols: 3, mines: 2 };
    const flagged = [
      [false, false, false],
      [false, true, false],
      [false, false, false],
    ];
    const board = [
      [0, 0, 0],
      [0, -1, 0],
      [0, 0, -1],
    ];
    expect(GameUtils.checkFlagsWin(config, false, flagged, board)).toBe(false);
  });
});
