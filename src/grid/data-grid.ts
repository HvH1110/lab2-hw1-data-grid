import { createElement, useEffect, useRef, useState, type VNode } from '../mini-react';
import { clampPosition, navigate } from './navigation';
import { cellText, nextSort, runPipeline } from './pipeline';
import type { ColumnDef, DataGridProps, FilterState, GridBounds, GridPosition, SortState } from './types';

const DEFAULT_PAGE_SIZE = 10;
const NO_FILTER: FilterState = Object.freeze({ query: '', facets: Object.freeze({}) });

/** Grid widget plus its live status. Called like a custom hook: uses hooks, returns sibling nodes. */
export function DataGrid<T>(props: DataGridProps<T> & { readonly id: string }): readonly VNode[] {
  const { id, data, columns, getRowId, ariaLabel } = props;

  const [sort, setSort] = useState<SortState<T> | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(props.pageSizes?.[0] ?? DEFAULT_PAGE_SIZE);
  const [filter] = useState<FilterState>(NO_FILTER);
  const [active, setActive] = useState<GridPosition>({ row: 1, col: 0 });
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [openedId, setOpenedId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  // Focus moves only after keyboard navigation, never on first render or on unrelated updates.
  const focusRequested = useRef(false);

  const result = runPipeline(data, columns, filter, sort, { page, pageSize });
  const bounds: GridBounds = { rowCount: result.rows.length + 1, colCount: columns.length };
  const position = clampPosition(active, bounds);

  const cellId = (row: number, col: number): string => `${id}-r${row}-c${col}`;
  const activeId = cellId(position.row, position.col);

  useEffect(() => {
    if (!focusRequested.current) return;
    focusRequested.current = false;
    document.getElementById(activeId)?.focus();
  }, [activeId, result.page]);

  const moveTo = (next: GridPosition, focus: boolean): void => {
    focusRequested.current = focus;
    setActive(next);
  };

  const goToPage = (target: number): void => {
    const clamped = Math.min(Math.max(1, target), result.pageCount);
    if (clamped === result.page) return;
    focusRequested.current = true;
    setPage(clamped);
  };

  const label = (item: T): string => (columns[0] ? cellText(item, columns[0]) : getRowId(item));

  /** Enter / click: the row becomes the current one and the consumer is notified. */
  const open = (item: T): void => {
    setOpenedId(getRowId(item));
    setAnnouncement(`Opened ${label(item)}`);
    props.onRowSelect?.(item);
  };

  /** Space / Ctrl+click: toggles the row in the multi-selection. */
  const toggle = (item: T): void => {
    const rowId = getRowId(item);
    const next = new Set(selected);
    const added = !next.delete(rowId);
    if (added) next.add(rowId);
    setSelected(next);
    setAnnouncement(`${label(item)} ${added ? 'selected' : 'deselected'}. ${next.size} selected.`);
  };

  const onKeyDown = (event: Event): void => {
    if (!(event instanceof KeyboardEvent)) return;
    const item = position.row > 0 ? result.rows[position.row - 1] : undefined;
    if (item !== undefined && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault(); // Space would scroll the page
      if (event.key === 'Enter') open(item);
      else toggle(item);
      return;
    }
    const outcome = navigate(position, event.key, { ctrl: event.ctrlKey || event.metaKey }, bounds);
    if (outcome.type === 'NONE') return;
    event.preventDefault(); // arrows and paging must not scroll the page
    if (outcome.type === 'MOVE') moveTo(outcome.position, true);
    else goToPage(result.page + outcome.delta);
  };

  const toggleSort = (column: ColumnDef<T>): void => {
    const next = nextSort(sort, column.accessorKey);
    setSort(next);
    setPage(1);
    setAnnouncement(next === null ? `Sorting removed from ${column.header}` : `Sorted by ${column.header}, ${next.direction}`);
  };

  const roving = (row: number, col: number): number => (row === position.row && col === position.col ? 0 : -1);

  const headerRow = createElement('tr', { role: 'row', 'aria-rowindex': 1 },
    columns.map((column, col) => {
      const sorted = sort?.key === column.accessorKey ? sort.direction : undefined;
      const common = { key: column.accessorKey, role: 'columnheader', scope: 'col', 'aria-sort': sorted, className: column.align === 'end' ? 'num' : undefined };
      if (!column.sortable) {
        return createElement('th', { ...common, id: cellId(0, col), tabIndex: roving(0, col), onClick: () => moveTo({ row: 0, col }, false) }, column.header);
      }
      return createElement('th', common,
        createElement('button', {
          id: cellId(0, col),
          type: 'button',
          className: 'sort',
          tabIndex: roving(0, col),
          onClick: () => {
            moveTo({ row: 0, col }, false);
            toggleSort(column);
          },
        }, column.header),
      );
    }),
  );

  const bodyRows = result.rows.map((item, index) => {
    const row = index + 1;
    const rowId = getRowId(item);
    const isSelected = selected.has(rowId);
    const isOpen = openedId === rowId;
    return createElement('tr', {
      key: rowId,
      role: 'row',
      'aria-rowindex': result.start + index + 1,
      'aria-selected': String(isSelected),
      'aria-current': isOpen ? 'true' : undefined,
      className: [isSelected && 'is-selected', isOpen && 'is-open'].filter(Boolean).join(' ') || undefined,
    },
      columns.map((column, col) =>
        createElement('td', {
          key: column.accessorKey,
          id: cellId(row, col),
          role: 'gridcell',
          tabIndex: roving(row, col),
          className: column.align === 'end' ? 'num' : undefined,
          onClick: (event: Event) => {
            moveTo({ row, col }, false);
            if (event instanceof MouseEvent && (event.ctrlKey || event.metaKey)) toggle(item);
            else open(item);
          },
        }, cellText(item, column)),
      ),
    );
  });

  return [
    createElement('p', { id: `${id}-status`, className: 'grid-status', role: 'status' }, announcement),
    createElement('section', { className: 'grid-scroll' },
      createElement('table', {
        id,
        role: 'grid',
        className: 'grid',
        'aria-labelledby': `${id}-caption`,
        'aria-rowcount': result.total + 1,
        'aria-multiselectable': 'true',
        'aria-describedby': `${id}-help`,
        onKeyDown,
      },
        createElement('caption', { id: `${id}-caption` }, props.caption ?? ariaLabel),
        createElement('thead', null, headerRow),
        createElement('tbody', null, bodyRows),
      ),
    ),
    createElement('p', { id: `${id}-help`, className: 'grid-help' },
      'Use arrow keys to move between cells, Home and End for the row start and end, Ctrl+Home and Ctrl+End for the first and last cell, Page Up and Page Down to change page. Enter opens a row, Space selects or deselects it.'),
  ];
}
