// Data-grid contracts (written before any grid implementation).

/** Keys of T whose values the grid can display, filter and sort. */
export type CellKey<T> = Extract<keyof T, string>;

export type CellValue = string | number;

export interface ColumnDef<T> {
  readonly header: string;
  readonly accessorKey: CellKey<T>;
  readonly sortable?: boolean;
  /** Offer a facet filter (exact match) for this column in the toolbar. */
  readonly filterable?: boolean;
  /** Numeric columns are right-aligned and compared numerically. */
  readonly align?: 'start' | 'end';
  /** Display text; defaults to String(value). Search matches what the user sees. */
  readonly format?: (value: T[CellKey<T>], row: T) => string;
}

export interface DataGridProps<T> {
  readonly data: readonly T[];
  readonly columns: readonly ColumnDef<T>[];
  readonly onRowSelect?: (item: T) => void;
  readonly ariaLabel: string;
  /** Stable identity for keys, selection and focus. Never the array index. */
  readonly getRowId: (item: T) => string;
  /** Visible <caption>; defaults to ariaLabel. */
  readonly caption?: string;
  readonly pageSizes?: readonly number[];
}

export type SortDirection = 'ascending' | 'descending';

export interface SortState<T> {
  readonly key: CellKey<T>;
  readonly direction: SortDirection;
}

export interface FilterState {
  /** Free-text query over every visible cell (case- and diacritic-insensitive). */
  readonly query: string;
  /** Exact-match facet per column key; '' means "all". */
  readonly facets: Readonly<Record<string, string>>;
}

export interface PageRequest {
  /** 1-based page number; out-of-range values are clamped. */
  readonly page: number;
  readonly pageSize: number;
}

export interface PageResult<T> {
  readonly rows: readonly T[];
  readonly page: number;
  readonly pageSize: number;
  readonly pageCount: number;
  readonly total: number;
  /** 1-based index of the first and last row shown (0 when empty). */
  readonly start: number;
  readonly end: number;
}

/** Position of the focusable cell. Row 0 is the header row; rows 1..n are the rows of the current page. */
export interface GridPosition {
  readonly row: number;
  readonly col: number;
}

export interface GridBounds {
  /** Header row + body rows on the current page. */
  readonly rowCount: number;
  readonly colCount: number;
}

export interface KeyModifiers {
  readonly ctrl: boolean;
}

export type NavigationResult =
  | { readonly type: 'MOVE'; readonly position: GridPosition }
  | { readonly type: 'PAGE'; readonly delta: -1 | 1 }
  | { readonly type: 'NONE' };
