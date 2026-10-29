import './styles.css';
import { App } from './app';
import { auditMount, renderApp } from './mini-react';

const root = document.getElementById('app');
if (root === null) throw new Error('Mount target #app not found');

let commits = 0;

renderApp(App, root, {
  onCommit: (tree, container) => {
    commits++;
    const report = auditMount(tree, container);
    console.assert(report.ok, 'VNode/DOM parity audit failed', report.issues);
    console.assert(container.querySelector('div, span') === null, 'div-soup detected');
    console.assert(container.querySelectorAll('table [tabindex="0"]').length === 1, 'roving tabindex must leave exactly one tab stop');
    console.info(`[commit #${commits}] audit ${report.ok ? 'PASS' : 'FAIL'}: ${report.vnodeCount} VNodes ↔ ${report.domNodeCount} DOM nodes`);
  },
});
