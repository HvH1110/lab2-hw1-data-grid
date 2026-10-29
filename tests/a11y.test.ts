import axe from 'axe-core';
import { App } from '../src/app';
import { renderApp, type AppHandle } from '../src/mini-react';

/** The static shell from index.html, so landmark and page-level rules see the real page. */
function mountPage(): HTMLElement {
  document.documentElement.lang = 'en';
  document.title = 'Employee Directory | Accessible Data Grid';
  document.body.innerHTML = ''; // test setup only; the app never uses innerHTML
  const header = document.createElement('header');
  const h1 = document.createElement('h1');
  h1.textContent = 'Employee Directory';
  header.append(h1);
  const main = document.createElement('main');
  main.id = 'app';
  const footer = document.createElement('footer');
  footer.textContent = 'Sample data';
  document.body.append(header, main, footer);
  return main;
}

let app: AppHandle | null = null;
let root: HTMLElement;

beforeEach(() => {
  root = mountPage();
  app = renderApp(App, root);
});

afterEach(() => {
  app?.unmount();
  app = null;
});

const $ = <E extends Element = HTMLElement>(selector: string): E => {
  const el = root.querySelector<E>(selector);
  if (el === null) throw new Error(`not found: ${selector}`);
  return el;
};
const key = (k: string, init: KeyboardEventInit = {}): void => {
  document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init }));
};

async function violations(): Promise<string[]> {
  const result = await axe.run(document, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] },
    rules: {
      // jsdom has no layout or rendering: contrast is verified by Lighthouse in real Chrome instead.
      'color-contrast': { enabled: false },
    },
  });
  return result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}

describe('axe-core: WCAG 2.2 A/AA + best practices', () => {
  it('control: the harness does catch real violations', async () => {
    const unnamed = document.createElement('button'); // no accessible name
    const unlabeled = document.createElement('input'); // no label
    document.body.append(unnamed, unlabeled);
    const found = (await violations()).map((v) => v.split(':')[0]);
    unnamed.remove();
    unlabeled.remove();
    expect(found).toEqual(expect.arrayContaining(['button-name', 'label']));
  });

  it('initial state', async () => {
    expect(await violations()).toEqual([]);
  });

  it('sorted descending, with focus in the header', async () => {
    const button = $<HTMLButtonElement>('#employees-r0-c4');
    button.focus();
    button.click();
    button.click();
    expect(await violations()).toEqual([]);
  });

  it('rows selected, one opened, on page 2', async () => {
    $('#employees-r1-c0').focus();
    key(' ');
    key('ArrowDown');
    key(' ');
    key('Enter');
    key('PageDown');
    expect(root.querySelector('#details-name')).not.toBeNull();
    expect(await violations()).toEqual([]);
  });

  it('filtered to an empty result', async () => {
    const input = $<HTMLInputElement>('#employees-search');
    input.value = 'zzzz';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(root.querySelectorAll('tbody tr')).toHaveLength(0);
    expect(await violations()).toEqual([]);
  });

  it('50 rows per page, last page', async () => {
    const select = $<HTMLSelectElement>('#employees-page-size');
    select.value = '50';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    $('#employees-page-next-page').click();
    expect(await violations()).toEqual([]);
  });
});
