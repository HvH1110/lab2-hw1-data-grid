# Project Rules — Lab 02 / Homework 1: Production Enterprise Data-Grid (WCAG 2.2 AA)

These rules are binding for every human or AI contribution to this repository.
A change that violates any rule below must not be committed.

## 1. Workflow (Anti-Monolithic Vibe Coding)

1. **Functional slicing**: work only on tasks listed in `TASK_DECOMPOSITION.md`.
2. **Contract first**: types/interfaces are written *before* the code that uses them.
3. **Atomic generation**: one sub-task per prompt and one sub-task per commit.
4. **Independent verification**: unit tests, `npm run typecheck`, axe-core, Lighthouse and DevTools before committing.
5. Tick the matching checkbox in `TASK_DECOMPOSITION.md` in the same commit that completes the task.

## 2. Git

- Conventional Commits: `type(scope): imperative summary`. Types: `feat`, `fix`, `test`, `docs`, `chore`, `refactor`.
- `npm run typecheck` **and** `npm test` must pass before every commit. Commit commands are gated on both (`&&`).

## 3. Language & Tooling

- TypeScript `strict`; no `any`. ES modules bundled with Vite.
- **BANNED:** `var`, implicit globals, `keypress`, `e.keyCode` (use `keydown` + `e.key`).
- **BANNED:** `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval`. Cell text is rendered as text nodes.
- Events go through the root delegation hub only; no `addEventListener` on rendered children, no `onclick="..."`.

## 4. Rendering Engine

- Re-renders **patch** the existing DOM through keyed O(n) reconciliation; they never re-mount the whole tree.
- Lists of rows use stable `key`s (`row.id`); **BANNED:** array index or `Math.random()` as key.
- Duplicate sibling keys are a bug and throw.
- Side effects (focus management) run in `useEffect` after commit, never during render.

## 5. Accessibility Contract (WCAG 2.2 Level AA)

- **Zero div-soup:** native `<table>`, `<caption>`, `<thead>`, `<tbody>`, `<th scope="col">`, `<button>`, `<label>`, `<nav>`.
- ARIA grid pattern: `role="grid"` on the table, `role="row"`, `role="columnheader"`, `role="gridcell"`,
  `aria-rowcount` / `aria-rowindex` / `aria-colindex` for the paged view, `aria-sort` on the sorted column,
  `aria-selected` on rows. ARIA must never contradict native semantics.
- **Roving tabindex:** exactly one cell (or header button) in the grid has `tabindex="0"`; the grid is one Tab stop.
- **Keyboard:** Arrow keys move between cells; Home/End go to the row start/end; Ctrl+Home/Ctrl+End go to the first/last cell;
  PageUp/PageDown change page; Enter selects (opens) the row; Space toggles row selection. Header: Enter/Space sorts.
- Contrast ≥ 4.5:1 for text and ≥ 3:1 for focus indicators and UI boundaries (1.4.3, 1.4.11), in light and dark themes.
- Focus is always visible (2.4.7) and never hidden by sticky headers (2.4.11 Focus Not Obscured, via `scroll-padding`).
- Targets ≥ 24×24 CSS px (2.5.8). Content reflows at 320 px (1.4.10). Text spacing overrides don't clip content (1.4.12).
- Result counts, sort changes and selections are announced via `role="status"` (4.1.3), without moving focus.
- Every form control has a visible `<label>`. The document has `lang`, a `<title>`, and landmarks.

## 6. Verification Gates

- `axe-core` reports zero violations for every grid state in the test suite.
- Lighthouse scores **100** for Accessibility and Best Practices on the production build.
- The DOM mirrors the VNode tree 1:1 after every commit (`auditMount`).
