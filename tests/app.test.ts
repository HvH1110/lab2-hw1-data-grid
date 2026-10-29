import { App, EMPLOYEES } from '../src/app';
import { EMPLOYEE_COLUMNS, formatDate, formatSalary, generateEmployees } from '../src/employees';
import { auditMount, renderApp, type AppHandle } from '../src/mini-react';

let app: AppHandle | null = null;
let root: HTMLElement;

const $ = <E extends Element = HTMLElement>(selector: string): E => {
  const el = root.querySelector<E>(selector);
  if (el === null) throw new Error(`not found: ${selector}`);
  return el;
};
const key = (k: string, init: KeyboardEventInit = {}): void => {
  document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init }));
};

beforeEach(() => {
  root = document.createElement('main');
  root.id = 'app';
  document.body.replaceChildren(root);
  app = renderApp(App, root);
});

afterEach(() => {
  app?.unmount();
  app = null;
});

describe('employee dataset', () => {
  it('is deterministic and has unique ids', () => {
    expect(generateEmployees(64)).toEqual(EMPLOYEES);
    expect(new Set(EMPLOYEES.map((e) => e.id)).size).toBe(64);
  });

  it('formats VND salaries and dd/mm/yyyy dates, sorted by raw values', () => {
    expect(formatSalary(35_000_000).replace(/\s/g, ' ')).toMatch(/^35\.000\.000 ₫$/);
    expect(formatDate('2021-03-09')).toBe('09/03/2021');
    expect(EMPLOYEE_COLUMNS.find((c) => c.accessorKey === 'salary')?.align).toBe('end');
  });
});

describe('Homework 1 checkpoint: employee directory', () => {
  it('renders the grid with 7 sortable columns and 10 rows of 64', () => {
    expect(root.querySelectorAll('thead .sort')).toHaveLength(7);
    expect(root.querySelectorAll('tbody tr')).toHaveLength(10);
    expect($('#employees-summary').textContent).toBe('Showing 1–10 of 64 employees');
    expect($('table').getAttribute('aria-rowcount')).toBe('65');
  });

  it('Enter on a row shows its details without moving focus', () => {
    const cell = $('#employees-r3-c0');
    cell.focus();
    key('Enter');
    const employee = EMPLOYEES[2];
    expect($('#details-name').textContent).toBe(employee?.name);
    expect($('.details-card').textContent).toContain(employee?.email ?? '');
    expect(document.activeElement).toBe(cell);
  });

  it('filters by department facet and finds names without diacritics', () => {
    const select = $<HTMLSelectElement>('#employees-facet-department');
    select.value = 'Design';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    const departments = [...root.querySelectorAll('tbody td:nth-child(2)')].map((td) => td.textContent);
    expect(departments.length).toBeGreaterThan(0);
    expect(new Set(departments)).toEqual(new Set(['Design']));

    const first = EMPLOYEES.find((e) => e.department === 'Design');
    const plain = first?.name.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/gi, 'd') ?? '';
    const input = $<HTMLInputElement>('#employees-search');
    input.value = plain.toUpperCase();
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect([...root.querySelectorAll('tbody td:first-child')].map((td) => td.textContent)).toContain(first?.name);
  });

  it('sorts salaries numerically, not as text', () => {
    $<HTMLButtonElement>('#employees-r0-c4').click();
    const salaries = [...root.querySelectorAll('tbody tr')].map((tr) => {
      const id = tr.querySelector('td')?.textContent;
      return EMPLOYEES.find((e) => e.name === id)?.salary ?? NaN;
    });
    expect(salaries).toEqual([...salaries].sort((a, b) => a - b));
  });

  it('keeps one tab stop, semantic markup and DOM parity after interaction', () => {
    $('#employees-r1-c0').focus();
    key('ArrowDown');
    key(' ');
    key('PageDown');
    expect(root.querySelectorAll('table [tabindex="0"]')).toHaveLength(1);
    expect(root.querySelector('div, span')).toBeNull();
    const tree = app?.getTree();
    expect(tree && auditMount(tree, root).ok).toBe(true);
  });
});
