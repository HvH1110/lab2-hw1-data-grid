import { auditMount } from '../src/audit';
import { createElement } from '../src/create-element';
import { DataGrid } from '../src/grid/data-grid';
import type { ColumnDef, DataGridProps } from '../src/grid/types';
import { renderApp, type AppHandle } from '../src/reactive-engine';

export interface Row {
  readonly id: string;
  readonly name: string;
  readonly team: string;
  readonly score: number;
}

export const rows: readonly Row[] = Array.from({ length: 23 }, (_, i) => ({
  id: `u${i + 1}`,
  name: `Person ${String(i + 1).padStart(2, '0')}`,
  team: ['Core', 'Platform', 'Design'][i % 3] ?? 'Core',
  score: (i * 37) % 100,
}));

export const columns: readonly ColumnDef<Row>[] = [
  { header: 'Name', accessorKey: 'name', sortable: true },
  { header: 'Team', accessorKey: 'team', sortable: true, filterable: true },
  { header: 'Score', accessorKey: 'score', sortable: true, align: 'end' },
];

let app: AppHandle | null = null;
let root: HTMLElement;
/** DOM parity result of every commit since the last mountGrid(). */
export let audits: boolean[] = [];

export function mountGrid(extra: Partial<DataGridProps<Row>> = {}): HTMLElement {
  root = document.createElement('body');
  document.documentElement.replaceChild(root, document.body);
  audits = [];
  app = renderApp(
    () => createElement('main', null,
      DataGrid<Row>({ id: 'g', data: rows, columns, getRowId: (r) => r.id, ariaLabel: 'People', ...extra })),
    root,
    { onCommit: (tree, container) => audits.push(auditMount(tree, container).ok) },
  );
  return root;
}

export function unmountGrid(): void {
  app?.unmount();
  app = null;
}

export const $ = <E extends Element = HTMLElement>(selector: string): E => {
  const el = document.body.querySelector<E>(selector);
  if (el === null) throw new Error(`not found: ${selector}`);
  return el;
};
export const key = (k: string, init: KeyboardEventInit = {}): void => {
  const target = document.activeElement ?? $('table');
  target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init }));
};
