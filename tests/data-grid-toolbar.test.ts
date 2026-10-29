import { pageWindow } from '../src/grid/data-grid';
import { $, audits, key, mountGrid, unmountGrid } from './grid-fixtures';

afterEach(unmountGrid);

const names = (): string[] => [...document.body.querySelectorAll('tbody tr')].map((tr) => tr.querySelector('td')?.textContent ?? '');
const summary = (): string | null => $('#g-summary').textContent;
const type = (selector: string, value: string): void => {
  const input = $<HTMLInputElement>(selector);
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
};
const choose = (selector: string, value: string): void => {
  const select = $<HTMLSelectElement>(selector);
  select.value = value;
  select.dispatchEvent(new Event('change', { bubbles: true }));
};

describe('DataGrid: toolbar', () => {
  beforeEach(() => mountGrid());

  it('labels every control and wraps them in a search landmark', () => {
    expect($('form').getAttribute('role')).toBe('search');
    for (const control of document.body.querySelectorAll('form input, form select')) {
      expect(document.body.querySelector(`label[for="${control.id}"]`)).not.toBeNull();
    }
  });

  it('filters by free text, resets to page 1 and keeps focus and caret in the input', () => {
    $('#g-r1-c0').focus();
    key('PageDown');
    const input = $<HTMLInputElement>('#g-search');
    input.focus();
    type('#g-search', 'person 2'); // every term must match some cell: "2" also matches scores
    expect(names()).toContain('Person 20');
    type('#g-search', 'person 21');
    expect(names()).toEqual(['Person 21']);
    expect(summary()).toBe('Showing 1–1 of 1 people');
    expect(document.activeElement).toBe(input);
    expect($<HTMLInputElement>('#g-search')).toBe(input); // patched, not re-created
  });

  it('filters by facet', () => {
    choose('#g-facet-team', 'Design');
    expect(new Set([...document.body.querySelectorAll('tbody td:nth-child(2)')].map((td) => td.textContent))).toEqual(new Set(['Design']));
    expect(summary()).toBe('Showing 1–7 of 7 people');
    expect($<HTMLSelectElement>('#g-facet-team').value).toBe('Design');
  });

  it('reports an empty result instead of an empty table', () => {
    type('#g-search', 'nobody');
    expect(document.body.querySelectorAll('tbody tr')).toHaveLength(0);
    expect(summary()).toBe('No people match the current filters.');
    expect($('table').getAttribute('aria-rowcount')).toBe('1');
  });

  it('Clear filters resets everything and is aria-disabled when there is nothing to clear', () => {
    expect($('#g-clear-filters').getAttribute('aria-disabled')).toBe('true');
    type('#g-search', 'person 1');
    choose('#g-facet-team', 'Core');
    $('#g-clear-filters').click();
    expect(summary()).toBe('Showing 1–10 of 23 people');
    expect($<HTMLInputElement>('#g-search').value).toBe('');
    expect($<HTMLSelectElement>('#g-facet-team').value).toBe('');
    expect($('#g-status').textContent).toBe('Filters cleared');
  });

  it('changes the page size', () => {
    choose('#g-page-size', '25');
    expect(names()).toHaveLength(23);
    expect(summary()).toBe('Showing 1–23 of 23 people');
  });
});

describe('DataGrid: pagination', () => {
  beforeEach(() => mountGrid());

  it('marks the current page and disables Previous on page 1', () => {
    expect($('nav').getAttribute('aria-label')).toBe('People pages');
    expect($('[aria-current="page"]').textContent).toBe('1');
    expect($('#g-page-previous-page').getAttribute('aria-disabled')).toBe('true');
  });

  it('Next/Previous and numbered buttons change the page; focus stays on the button', () => {
    const next = $('#g-page-next-page');
    next.focus();
    next.click();
    expect(summary()).toBe('Showing 11–20 of 23 people');
    expect(document.activeElement).toBe(next);
    next.click();
    expect(next.getAttribute('aria-disabled')).toBe('true');
    next.click(); // no-op on the last page
    expect(summary()).toBe('Showing 21–23 of 23 people');
    expect(document.activeElement).toBe(next);
    $('#g-page-page-1').click();
    expect(names()[0]).toBe('Person 01');
  });

  it('Clear selection empties the multi-selection', () => {
    $('#g-r1-c0').focus();
    key(' ');
    key('ArrowDown');
    key(' ');
    expect($('.grid-selection').textContent).toContain('2 selected');
    $('#g-clear-selection').click();
    expect($('.grid-selection').textContent).toContain('0 selected');
    expect(document.body.querySelector('tr[aria-selected="true"]')).toBeNull();
  });

  it('keeps DOM parity through every interaction', () => {
    type('#g-search', 'person');
    choose('#g-page-size', '25');
    choose('#g-page-size', '10');
    $('#g-page-next-page').click();
    expect(audits.length).toBeGreaterThan(3);
    expect(audits.every(Boolean)).toBe(true);
  });
});

describe('pageWindow', () => {
  it('lists every page when there are few', () => {
    expect(pageWindow(2, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('collapses long ranges around the current page', () => {
    expect(pageWindow(1, 12)).toEqual([1, 2, 'gap', 12]);
    expect(pageWindow(6, 12)).toEqual([1, 'gap', 5, 6, 7, 'gap', 12]);
    expect(pageWindow(12, 12)).toEqual([1, 'gap', 11, 12]);
  });
});
