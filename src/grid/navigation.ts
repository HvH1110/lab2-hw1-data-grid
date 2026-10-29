import type { GridBounds, GridPosition, KeyModifiers, NavigationResult } from './types';

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

/** Keeps a position inside the grid after the data changed (filtering can remove rows). */
export function clampPosition(position: GridPosition, bounds: GridBounds): GridPosition {
  return {
    row: clamp(position.row, 0, Math.max(0, bounds.rowCount - 1)),
    col: clamp(position.col, 0, Math.max(0, bounds.colCount - 1)),
  };
}

/**
 * WAI-ARIA APG data-grid keyboard model, as a pure function of the pressed key.
 * Returns NONE for keys the grid does not own, so the browser default is kept.
 */
export function navigate(position: GridPosition, key: string, modifiers: KeyModifiers, bounds: GridBounds): NavigationResult {
  const lastRow = Math.max(0, bounds.rowCount - 1);
  const lastCol = Math.max(0, bounds.colCount - 1);
  const move = (row: number, col: number): NavigationResult => ({
    type: 'MOVE',
    position: clampPosition({ row, col }, bounds),
  });

  switch (key) {
    case 'ArrowRight':
      return move(position.row, position.col + 1);
    case 'ArrowLeft':
      return move(position.row, position.col - 1);
    case 'ArrowDown':
      return move(position.row + 1, position.col);
    case 'ArrowUp':
      return move(position.row - 1, position.col);
    case 'Home':
      return modifiers.ctrl ? move(0, 0) : move(position.row, 0);
    case 'End':
      return modifiers.ctrl ? move(lastRow, lastCol) : move(position.row, lastCol);
    case 'PageDown':
      return { type: 'PAGE', delta: 1 };
    case 'PageUp':
      return { type: 'PAGE', delta: -1 };
    default:
      return { type: 'NONE' };
  }
}
