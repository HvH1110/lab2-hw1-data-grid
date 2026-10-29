import { createElement, useEffect, useRef, useState, type VNode } from '../mini-react';
import { clampPosition, navigate } from './navigation';
import { cellText, nextSort, runPipeline } from './pipeline';
import type { ColumnDef, DataGridProps, FilterState, GridBounds, GridPosition, SortState } from './types';

const DEFAULT_PAGE_SIZES: readonly number[] = [10, 25, 50];
const NO_FILTER: FilterState = Object.freeze({ query: '', facets: Object.freeze({}) });

/** Grid widget plus its live status. Called like a custom hook: uses hooks, returns sibling nodes. */
export function DataGrid<T>(props: DataGridProps<T> & { readonly id: string }): readonly VNode[] {
  const { id, data, columns, getRowId, ariaLabel } = props;

  const [sort, setSort] = useState<SortState<T> | null>(null);
  const [page, setPage] = useState(1);
  const pageSizes = props.pageSizes ?? DEFAULT_PAGE_SIZES;
  const [pageSize, setPageSize] = useState(pageSizes[0] ?? 10);
  const [filter, setFilter] = useState<FilterState>(NO_FILTER);
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

  /** `focusGrid`: keyboard paging inside the grid keeps focus in the grid; the nav keeps its own focus. */
  const goToPage = (target: number, focusGrid = true): void => {
    const clamped = Math.min(Math.max(1, target), result.pageCount);
    if (clamped === result.page) return;
    focusRequested.current = focusGrid;
    setPage(clamped);
  };

  const updateFilter = (next: FilterState): void => {
    setFilter(next);
    setPage(1);
  };
  const hasFilters = filter.query !== '' || Object.values(filter.facets).some((value) => value !== '');

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

  /** The cell the key was pressed in. Focus can reach a cell without updating `active`
   * (screen-reader virtual cursor, programmatic focus), so the event target wins over state. */
  const positionOf = (target: EventTarget | null): GridPosition => {
    const cell = target instanceof Element ? target.closest('[data-row][data-col]') : null;
    if (cell === null) return position;
    return clampPosition({ row: Number(cell.getAttribute('data-row')), col: Number(cell.getAttribute('data-col')) }, bounds);
  };

  const onKeyDown = (event: Event): void => {
    if (!(event instanceof KeyboardEvent)) return;
    const from = positionOf(event.target);
    const item = from.row > 0 ? result.rows[from.row - 1] : undefined;
    if (item !== undefined && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault(); // Space would scroll the page
      if (event.key === 'Enter') open(item);
      else toggle(item);
      return;
    }
    const outcome = navigate(from, event.key, { ctrl: event.ctrlKey || event.metaKey }, bounds);
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
        return createElement('th', { ...common, id: cellId(0, col), 'data-row': 0, 'data-col': col, tabIndex: roving(0, col), onClick: () => moveTo({ row: 0, col }, false) }, column.header);
      }
      return createElement('th', common,
        createElement('button', {
          id: cellId(0, col),
          'data-row': 0,
          'data-col': col,
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
          'data-row': row,
          'data-col': col,
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

  const inputValue = (event: Event): string =>
    event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement ? event.target.value : '';

  const facetColumns = columns.filter((column) => column.filterable);
  const toolbar = createElement('form', {
    className: 'grid-toolbar',
    role: 'search',
    'aria-label': `Filter ${ariaLabel}`,
    onSubmit: (event: Event) => event.preventDefault(),
  },
    createElement('p', { className: 'field field--grow' },
      createElement('label', { htmlFor: `${id}-search` }, 'Search'),
      createElement('input', {
        id: `${id}-search`, type: 'search', autocomplete: 'off', value: filter.query,
        placeholder: 'Name, role, city…',
        onInput: (event: Event) => updateFilter({ ...filter, query: inputValue(event) }),
      }),
    ),
    facetColumns.map((column) => {
      const options = [...new Set(data.map((row) => String(row[column.accessorKey])))].sort((a, b) => a.localeCompare(b, 'vi'));
      const selectedValue = filter.facets[column.accessorKey] ?? '';
      return createElement('p', { key: column.accessorKey, className: 'field' },
        createElement('label', { htmlFor: `${id}-facet-${column.accessorKey}` }, column.header),
        createElement('select', {
          id: `${id}-facet-${column.accessorKey}`, value: selectedValue,
          onChange: (event: Event) => updateFilter({ ...filter, facets: { ...filter.facets, [column.accessorKey]: inputValue(event) } }),
        },
          createElement('option', { key: '', value: '', selected: selectedValue === '' }, 'All'),
          options.map((option) => createElement('option', { key: option, value: option, selected: selectedValue === option }, option)),
        ),
      );
    }),
    createElement('p', { className: 'field' },
      createElement('label', { htmlFor: `${id}-page-size` }, 'Rows per page'),
      createElement('select', {
        id: `${id}-page-size`, value: String(pageSize),
        onChange: (event: Event) => {
          setPageSize(Number(inputValue(event)));
          setPage(1);
        },
      }, pageSizes.map((size) => createElement('option', { key: String(size), value: String(size), selected: size === pageSize }, String(size)))),
    ),
    createElement('p', { className: 'field field--action' },
      createElement('button', {
        id: `${id}-clear-filters`, type: 'button', className: 'btn btn--ghost', 'aria-disabled': String(!hasFilters),
        onClick: () => {
          if (!hasFilters) return;
          updateFilter(NO_FILTER);
          setAnnouncement('Filters cleared');
        },
      }, 'Clear filters'),
    ),
  );

  const summary = result.total === 0
    ? `No ${ariaLabel.toLowerCase()} match the current filters.`
    : `Showing ${result.start}–${result.end} of ${result.total} ${ariaLabel.toLowerCase()}`;

  const pageButton = (target: number, text: string, label: string, disabled: boolean, current = false): VNode =>
    createElement('button', {
      key: label,
      id: `${id}-page-${label.toLowerCase().replace(/\s+/g, '-')}`,
      type: 'button',
      className: current ? 'page page--current' : 'page',
      'aria-label': label,
      'aria-current': current ? 'page' : undefined,
      'aria-disabled': disabled ? 'true' : undefined,
      onClick: () => {
        if (!disabled) goToPage(target, false);
      },
    }, text);

  const pagination = createElement('nav', { className: 'grid-pagination', 'aria-label': `${ariaLabel} pages` },
    createElement('ul', null,
      createElement('li', { key: 'prev' }, pageButton(result.page - 1, '‹ Previous', 'Previous page', result.page <= 1)),
      pageWindow(result.page, result.pageCount).map((entry, i) =>
        entry === 'gap'
          ? createElement('li', { key: `gap-${i}`, className: 'page-gap', 'aria-hidden': 'true' }, '…')
          : createElement('li', { key: `p${entry}` }, pageButton(entry, String(entry), `Page ${entry}`, false, entry === result.page)),
      ),
      createElement('li', { key: 'next' }, pageButton(result.page + 1, 'Next ›', 'Next page', result.page >= result.pageCount)),
    ),
    createElement('p', { className: 'grid-selection' },
      `${selected.size} selected`,
      createElement('button', {
        id: `${id}-clear-selection`, type: 'button', className: 'btn btn--ghost', 'aria-disabled': String(selected.size === 0),
        onClick: () => {
          if (selected.size === 0) return;
          setSelected(new Set());
          setAnnouncement('Selection cleared');
        },
      }, 'Clear selection'),
    ),
  );

  return [
    toolbar,
    createElement('p', { id: `${id}-summary`, className: 'grid-summary', role: 'status' }, summary),
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
    pagination,
  ];
}

/** Page buttons to show: all when few, otherwise first, last and a window around the current page. */
export function pageWindow(page: number, pageCount: number): readonly (number | 'gap')[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const pages = new Set([1, pageCount, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pageCount));
  const sorted = [...pages].sort((a, b) => a - b);
  const out: (number | 'gap')[] = [];
  sorted.forEach((p, i) => {
    const prev = sorted[i - 1];
    if (prev !== undefined && p - prev > 1) out.push('gap');
    out.push(p);
  });
  return out;
}
