import { clampPosition, navigate } from '../src/grid/navigation';
import type { GridBounds, GridPosition, NavigationResult } from '../src/grid/types';

const bounds: GridBounds = { rowCount: 11, colCount: 6 }; // header + 10 rows, 6 columns
const at = (row: number, col: number): GridPosition => ({ row, col });
const moved = (row: number, col: number): NavigationResult => ({ type: 'MOVE', position: at(row, col) });
const plain = { ctrl: false };
const ctrl = { ctrl: true };

describe('navigate', () => {
  it.each<[string, GridPosition, string, NavigationResult]>([
    ['ArrowRight moves one cell right', at(3, 2), 'ArrowRight', moved(3, 3)],
    ['ArrowLeft moves one cell left', at(3, 2), 'ArrowLeft', moved(3, 1)],
    ['ArrowDown moves one row down', at(3, 2), 'ArrowDown', moved(4, 2)],
    ['ArrowUp moves one row up (into the header)', at(1, 2), 'ArrowUp', moved(0, 2)],
    ['ArrowRight stops at the last column', at(3, 5), 'ArrowRight', moved(3, 5)],
    ['ArrowLeft stops at the first column', at(3, 0), 'ArrowLeft', moved(3, 0)],
    ['ArrowDown stops at the last row', at(10, 1), 'ArrowDown', moved(10, 1)],
    ['ArrowUp stops at the header row', at(0, 1), 'ArrowUp', moved(0, 1)],
    ['Home goes to the start of the row', at(4, 3), 'Home', moved(4, 0)],
    ['End goes to the end of the row', at(4, 3), 'End', moved(4, 5)],
  ])('%s', (_name, from, key, expected) => {
    expect(navigate(from, key, plain, bounds)).toEqual(expected);
  });

  it('Ctrl+Home goes to the first cell of the first row', () => {
    expect(navigate(at(7, 4), 'Home', ctrl, bounds)).toEqual(moved(0, 0));
  });

  it('Ctrl+End goes to the last cell of the last row', () => {
    expect(navigate(at(2, 1), 'End', ctrl, bounds)).toEqual(moved(10, 5));
  });

  it('PageDown / PageUp request a page change', () => {
    expect(navigate(at(2, 1), 'PageDown', plain, bounds)).toEqual({ type: 'PAGE', delta: 1 });
    expect(navigate(at(2, 1), 'PageUp', plain, bounds)).toEqual({ type: 'PAGE', delta: -1 });
  });

  it.each(['Tab', 'a', ' ', 'Enter', 'Escape', 'F5'])('ignores %o so the browser default is kept', (key) => {
    expect(navigate(at(1, 1), key, plain, bounds)).toEqual({ type: 'NONE' });
  });

  it('works on a grid with only the header row (empty result)', () => {
    const empty: GridBounds = { rowCount: 1, colCount: 6 };
    expect(navigate(at(0, 2), 'ArrowDown', plain, empty)).toEqual(moved(0, 2));
    expect(navigate(at(0, 2), 'End', ctrl, empty)).toEqual(moved(0, 5));
  });
});

describe('clampPosition', () => {
  it('pulls a position back inside shrunken bounds', () => {
    expect(clampPosition(at(9, 5), { rowCount: 4, colCount: 6 })).toEqual(at(3, 5));
    expect(clampPosition(at(-1, -2), bounds)).toEqual(at(0, 0));
  });
});
