import { $, audits, key, mountGrid, unmountGrid } from './grid-fixtures';

afterEach(unmountGrid);

const names = (): string[] => [...document.body.querySelectorAll('tbody tr')].map((tr) => tr.querySelector('td')?.textContent ?? '');
const tabStops = (): Element[] => [...document.body.querySelectorAll('table [tabindex="0"]')];

describe('DataGrid: semantics', () => {
  beforeEach(() => mountGrid());

  it('renders a native table with ARIA grid roles and a caption', () => {
    expect($('table').getAttribute('role')).toBe('grid');
    expect($('table caption').textContent).toBe('People');
    expect($('table').getAttribute('aria-labelledby')).toBe('g-caption');
    expect(document.body.querySelectorAll('thead th[scope="col"][role="columnheader"]')).toHaveLength(3);
    expect(document.body.querySelectorAll('tbody tr[role="row"]')).toHaveLength(10);
    expect(document.body.querySelectorAll('tbody td[role="gridcell"]')).toHaveLength(30);
    expect(document.body.querySelector('div, span')).toBeNull();
  });

  it('exposes the full row count and absolute row indexes for the paged view', () => {
    expect($('table').getAttribute('aria-rowcount')).toBe('24');
    expect($('thead tr').getAttribute('aria-rowindex')).toBe('1');
    expect($('tbody tr').getAttribute('aria-rowindex')).toBe('2');
  });

  it('has exactly one tab stop (roving tabindex)', () => {
    expect(tabStops()).toHaveLength(1);
    expect(tabStops()[0]?.id).toBe('g-r1-c0');
    expect(document.body.querySelectorAll('table [tabindex="-1"]').length).toBe(3 + 30 - 1);
  });

  it('keeps the DOM in parity with the VNode tree', () => {
    expect(audits.every(Boolean)).toBe(true);
  });
});

describe('DataGrid: keyboard navigation', () => {
  beforeEach(() => {
    mountGrid();
    $('#g-r1-c0').focus();
  });

  it('moves focus with the arrow keys and keeps one tab stop', () => {
    key('ArrowRight');
    expect(document.activeElement?.id).toBe('g-r1-c1');
    key('ArrowDown');
    key('ArrowDown');
    expect(document.activeElement?.id).toBe('g-r3-c1');
    key('ArrowLeft');
    key('ArrowUp');
    expect(document.activeElement?.id).toBe('g-r2-c0');
    expect(tabStops().map((el) => el.id)).toEqual(['g-r2-c0']);
  });

  it('moves into the header row, where the tab stop is the sort button', () => {
    key('ArrowUp');
    expect(document.activeElement?.tagName).toBe('BUTTON');
    expect(document.activeElement?.closest('th')?.getAttribute('role')).toBe('columnheader');
  });

  it('Home/End and Ctrl+Home/Ctrl+End', () => {
    key('ArrowDown');
    key('End');
    expect(document.activeElement?.id).toBe('g-r2-c2');
    key('Home');
    expect(document.activeElement?.id).toBe('g-r2-c0');
    key('End', { ctrlKey: true });
    expect(document.activeElement?.id).toBe('g-r10-c2');
    key('Home', { ctrlKey: true });
    expect(document.activeElement?.id).toBe('g-r0-c0');
  });

  it('PageDown/PageUp change the page and keep focus in the grid', () => {
    key('ArrowDown');
    key('PageDown');
    expect(names()[0]).toBe('Person 11');
    expect(document.activeElement?.id).toBe('g-r2-c0');
    key('PageDown');
    key('PageDown'); // already on the last page
    expect(names()).toEqual(['Person 21', 'Person 22', 'Person 23']);
    expect(document.activeElement?.id).toBe('g-r2-c0');
    key('PageUp');
    expect(names()[0]).toBe('Person 11');
  });

  it('clamps focus when the next page has fewer rows', () => {
    key('End', { ctrlKey: true }); // row 10
    key('PageDown');
    key('PageDown'); // last page has 3 rows
    expect(document.activeElement?.id).toBe('g-r3-c2');
  });

  it('prevents page scrolling for handled keys only', () => {
    const arrow = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });
    const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    document.activeElement?.dispatchEvent(arrow);
    document.activeElement?.dispatchEvent(tab);
    expect(arrow.defaultPrevented).toBe(true);
    expect(tab.defaultPrevented).toBe(false);
  });

  it('a click makes the clicked cell the tab stop', () => {
    $('#g-r4-c1').click();
    expect(tabStops().map((el) => el.id)).toEqual(['g-r4-c1']);
  });

  it('patches cells in place instead of re-creating them', () => {
    const cell = $('#g-r1-c0');
    key('ArrowRight');
    expect(document.body.querySelector('#g-r1-c0')).toBe(cell);
  });
});

describe('DataGrid: sorting', () => {
  beforeEach(() => mountGrid());

  it('cycles aria-sort ascending → descending → none via the header button', () => {
    const button = (): HTMLButtonElement => $<HTMLButtonElement>('#g-r0-c2');
    button().click();
    expect($('thead th:nth-child(3)').getAttribute('aria-sort')).toBe('ascending');
    expect(document.body.querySelectorAll('th[aria-sort]')).toHaveLength(1);
    const ascending = [...document.body.querySelectorAll('tbody td:nth-child(3)')].map((td) => Number(td.textContent));
    expect(ascending).toEqual([...ascending].sort((a, b) => a - b));

    button().click();
    expect($('thead th:nth-child(3)').getAttribute('aria-sort')).toBe('descending');
    button().click();
    expect(document.body.querySelectorAll('th[aria-sort]')).toHaveLength(0);
  });

  it('announces sort changes in the status region without moving focus', () => {
    const button = $<HTMLButtonElement>('#g-r0-c0');
    button.focus();
    button.click();
    expect($('#g-status').textContent).toBe('Sorted by Name, ascending');
    expect(document.activeElement).toBe(button);
  });

  it('sorting jumps back to page 1', () => {
    $('#g-r1-c0').focus();
    key('PageDown');
    $<HTMLButtonElement>('#g-r0-c0').click();
    expect(names()[0]).toBe('Person 01');
  });
});
