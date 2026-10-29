import { $, key, mountGrid, unmountGrid } from './grid-fixtures';
import type { Row } from './grid-fixtures';

afterEach(unmountGrid);

const row = (n: number): HTMLElement => $(`tbody tr:nth-child(${n})`);
const status = (): string | null => $('#g-status').textContent;

describe('DataGrid: selection', () => {
  let opened: Row[];

  beforeEach(() => {
    opened = [];
    mountGrid({ onRowSelect: (item) => opened.push(item) });
    $('#g-r1-c0').focus();
  });

  it('declares a multi-selectable grid with aria-selected on every row', () => {
    expect($('table').getAttribute('aria-multiselectable')).toBe('true');
    expect([...document.body.querySelectorAll('tbody tr')].every((tr) => tr.getAttribute('aria-selected') === 'false')).toBe(true);
  });

  it('Space toggles the focused row and announces the count', () => {
    key(' ');
    expect(row(1).getAttribute('aria-selected')).toBe('true');
    expect(status()).toBe('Person 01 selected. 1 selected.');
    key('ArrowDown');
    key(' ');
    expect(status()).toBe('Person 02 selected. 2 selected.');
    key('ArrowUp');
    key(' ');
    expect(row(1).getAttribute('aria-selected')).toBe('false');
    expect(status()).toBe('Person 01 deselected. 1 selected.');
  });

  it('Space does not scroll the page', () => {
    const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
    document.activeElement?.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('Enter opens the row: onRowSelect + aria-current, focus stays put', () => {
    key('ArrowDown');
    key('Enter');
    expect(opened.map((r) => r.id)).toEqual(['u2']);
    expect(row(2).getAttribute('aria-current')).toBe('true');
    expect(document.body.querySelectorAll('tbody [aria-current]')).toHaveLength(1);
    expect(document.activeElement?.id).toBe('g-r2-c0');
    expect(status()).toBe('Opened Person 02');
  });

  it('selection follows the row identity across sorting and paging', () => {
    key(' '); // Person 01
    $<HTMLButtonElement>('#g-r0-c0').click();
    $<HTMLButtonElement>('#g-r0-c0').click(); // name descending: Person 01 is now on page 3
    expect(document.body.querySelector('tbody tr[aria-selected="true"]')).toBeNull();
    $('#g-r1-c0').focus();
    key('PageDown');
    key('PageDown');
    const last = [...document.body.querySelectorAll('tbody tr')].at(-1);
    expect(last?.querySelector('td')?.textContent).toBe('Person 01');
    expect(last?.getAttribute('aria-selected')).toBe('true');
  });

  it('Enter/Space on the header row are left to the sort button', () => {
    key('ArrowUp');
    const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
    document.activeElement?.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(document.body.querySelector('tr[aria-selected="true"]')).toBeNull();
  });

  it('click opens a row; Ctrl+click toggles it', () => {
    $('#g-r3-c1').click();
    expect(opened.map((r) => r.id)).toEqual(['u3']);
    $('#g-r4-c1').dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true }));
    expect(row(4).getAttribute('aria-selected')).toBe('true');
    expect(opened).toHaveLength(1);
  });
});
