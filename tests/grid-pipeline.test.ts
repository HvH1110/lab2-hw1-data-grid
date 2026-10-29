import {
  compareValues,
  filterRows,
  nextSort,
  normalizeText,
  paginate,
  runPipeline,
  sortRows,
} from '../src/grid/pipeline';
import type { ColumnDef, FilterState } from '../src/grid/types';

interface Person {
  readonly id: string;
  readonly name: string;
  readonly city: string;
  readonly salary: number;
}

const people: readonly Person[] = Object.freeze([
  { id: '1', name: 'Nguyễn Văn An', city: 'Hà Nội', salary: 30 },
  { id: '2', name: 'Trần Thị Bình', city: 'Đà Nẵng', salary: 45 },
  { id: '3', name: 'Lê Hoàng Cường', city: 'Hà Nội', salary: 30 },
  { id: '4', name: 'Đặng Minh Dũng', city: 'TP. Hồ Chí Minh', salary: 120 },
  { id: '5', name: 'Phạm Thu Hà', city: 'Đà Nẵng', salary: 9 },
]);

const columns: readonly ColumnDef<Person>[] = [
  { header: 'Name', accessorKey: 'name', sortable: true },
  { header: 'City', accessorKey: 'city', filterable: true },
  { header: 'Salary', accessorKey: 'salary', align: 'end', format: (v) => `${v} triệu` },
];

const noFilter: FilterState = { query: '', facets: {} };
const ids = (rows: readonly Person[]): string[] => rows.map((p) => p.id);

describe('normalizeText', () => {
  it('folds case, diacritics and đ', () => {
    expect(normalizeText('  Nguyễn ĐỨC Thắng ')).toBe('nguyen duc thang');
    expect(normalizeText('Đà Nẵng')).toBe('da nang');
  });
});

describe('filterRows', () => {
  it('returns the same array when nothing filters', () => {
    expect(filterRows(people, columns, noFilter)).toBe(people);
  });

  it('matches without diacritics or case', () => {
    expect(ids(filterRows(people, columns, { query: 'nguyen', facets: {} }))).toEqual(['1']);
    expect(ids(filterRows(people, columns, { query: 'DANG', facets: {} }))).toEqual(['4']); // Đặng; "Đà Nẵng" → "da nang"
    expect(ids(filterRows(people, columns, { query: 'da nang', facets: {} }))).toEqual(['2', '5']);
  });

  it('requires every term, across columns', () => {
    expect(ids(filterRows(people, columns, { query: 'ha noi cuong', facets: {} }))).toEqual(['3']);
  });

  it('searches the formatted text the user sees', () => {
    expect(ids(filterRows(people, columns, { query: '120 trieu', facets: {} }))).toEqual(['4']);
  });

  it('applies facets as exact matches, combined with the query', () => {
    expect(ids(filterRows(people, columns, { query: '', facets: { city: 'Đà Nẵng' } }))).toEqual(['2', '5']);
    expect(ids(filterRows(people, columns, { query: 'ha', facets: { city: 'Đà Nẵng' } }))).toEqual(['5']);
    expect(ids(filterRows(people, columns, { query: '', facets: { city: '' } }))).toHaveLength(5);
  });
});

describe('sortRows', () => {
  it('sorts numbers numerically in both directions', () => {
    expect(ids(sortRows(people, { key: 'salary', direction: 'ascending' }))).toEqual(['5', '1', '3', '2', '4']);
    expect(ids(sortRows(people, { key: 'salary', direction: 'descending' }))).toEqual(['4', '2', '1', '3', '5']);
  });

  it('is stable: equal values keep their input order in both directions', () => {
    const asc = ids(sortRows(people, { key: 'salary', direction: 'ascending' }));
    const desc = ids(sortRows(people, { key: 'salary', direction: 'descending' }));
    expect(asc.indexOf('1')).toBeLessThan(asc.indexOf('3'));
    expect(desc.indexOf('1')).toBeLessThan(desc.indexOf('3'));
  });

  it('uses Vietnamese collation for text', () => {
    expect(ids(sortRows(people, { key: 'name', direction: 'ascending' }))).toEqual(['4', '3', '1', '5', '2']);
  });

  it('does not mutate the input', () => {
    sortRows(people, { key: 'name', direction: 'descending' });
    expect(ids(people)).toEqual(['1', '2', '3', '4', '5']);
  });

  it('compares numeric strings naturally', () => {
    expect(compareValues('item 2', 'item 10')).toBeLessThan(0);
  });
});

describe('paginate', () => {
  const rows = Array.from({ length: 23 }, (_, i) => i + 1);

  it('slices pages and reports 1-based ranges', () => {
    expect(paginate(rows, { page: 3, pageSize: 10 })).toMatchObject({
      rows: [21, 22, 23], page: 3, pageCount: 3, total: 23, start: 21, end: 23,
    });
  });

  it('clamps out-of-range pages', () => {
    expect(paginate(rows, { page: 99, pageSize: 10 }).page).toBe(3);
    expect(paginate(rows, { page: 0, pageSize: 10 }).page).toBe(1);
  });

  it('handles an empty result as one empty page', () => {
    expect(paginate([], { page: 2, pageSize: 10 })).toMatchObject({ rows: [], page: 1, pageCount: 1, start: 0, end: 0 });
  });
});

describe('nextSort', () => {
  it('cycles none → ascending → descending → none, and resets on a new column', () => {
    const asc = nextSort<Person>(null, 'name');
    expect(asc).toEqual({ key: 'name', direction: 'ascending' });
    const desc = nextSort(asc, 'name');
    expect(desc).toEqual({ key: 'name', direction: 'descending' });
    expect(nextSort(desc, 'name')).toBeNull();
    expect(nextSort(desc, 'salary')).toEqual({ key: 'salary', direction: 'ascending' });
  });
});

describe('runPipeline', () => {
  it('filters, then sorts, then paginates', () => {
    const result = runPipeline(people, columns, { query: '', facets: { city: 'Hà Nội' } }, { key: 'name', direction: 'descending' }, { page: 1, pageSize: 1 });
    expect(ids(result.rows)).toEqual(['1']);
    expect(result.total).toBe(2);
    expect(result.pageCount).toBe(2);
  });
});
