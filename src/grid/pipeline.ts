import type { CellKey, ColumnDef, FilterState, PageRequest, PageResult, SortState } from './types';

/** Lowercase, strip combining marks and fold đ/Đ: "Nguyễn Đức" → "nguyen duc". */
export function normalizeText(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/gi, 'd').toLowerCase().trim();
}

export function cellText<T>(row: T, column: ColumnDef<T>): string {
  const value = row[column.accessorKey];
  return column.format ? column.format(value, row) : String(value);
}

export function filterRows<T>(rows: readonly T[], columns: readonly ColumnDef<T>[], filter: FilterState): readonly T[] {
  const terms = normalizeText(filter.query).split(/\s+/).filter(Boolean);
  const facets = Object.entries(filter.facets).filter(([, value]) => value !== '');
  if (terms.length === 0 && facets.length === 0) return rows;

  return rows.filter((row) => {
    const matchesFacets = facets.every(([key, value]) => String(row[key as CellKey<T>]) === value);
    if (!matchesFacets) return false;
    if (terms.length === 0) return true;
    // Every term must appear in some visible cell ("ha noi engineer" matches across columns).
    const haystack = normalizeText(columns.map((column) => cellText(row, column)).join(' '));
    return terms.every((term) => haystack.includes(term));
  });
}

const collator = new Intl.Collator('vi', { sensitivity: 'base', numeric: true });

export function compareValues(a: unknown, b: unknown): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return collator.compare(String(a), String(b));
}

/** Stable sort (ties keep their input order) that never mutates its input. */
export function sortRows<T>(rows: readonly T[], sort: SortState<T> | null): readonly T[] {
  if (sort === null) return rows;
  const factor = sort.direction === 'ascending' ? 1 : -1;
  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => compareValues(a.row[sort.key], b.row[sort.key]) * factor || a.index - b.index)
    .map(({ row }) => row);
}

export function paginate<T>(rows: readonly T[], { page, pageSize }: PageRequest): PageResult<T> {
  const size = Math.max(1, Math.floor(pageSize));
  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / size));
  const current = Math.min(Math.max(1, Math.floor(page)), pageCount);
  const offset = (current - 1) * size;
  const slice = rows.slice(offset, offset + size);
  return {
    rows: slice,
    page: current,
    pageSize: size,
    pageCount,
    total,
    start: slice.length === 0 ? 0 : offset + 1,
    end: offset + slice.length,
  };
}

/** Header click cycle: none → ascending → descending → none. */
export function nextSort<T>(current: SortState<T> | null, key: CellKey<T>): SortState<T> | null {
  if (current === null || current.key !== key) return { key, direction: 'ascending' };
  if (current.direction === 'ascending') return { key, direction: 'descending' };
  return null;
}

export function runPipeline<T>(
  rows: readonly T[],
  columns: readonly ColumnDef<T>[],
  filter: FilterState,
  sort: SortState<T> | null,
  page: PageRequest,
): PageResult<T> {
  return paginate(sortRows(filterRows(rows, columns, filter), sort), page);
}
