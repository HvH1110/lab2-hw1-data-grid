# Work Breakdown Structure (WBS) — Homework 1

Objective: an accessible enterprise Data-Grid with sorting, filtering and pagination. It meets WCAG 2.2 AA,
supports full keyboard navigation (Arrows, Enter selects, Space toggles), and scores a verified Lighthouse
100/100 in Accessibility and Best Practices.

> RULE: Never prompt AI with more than one sub-task at a time. One task = one commit.

| # | Task | Verification | Commit |
|---|------|--------------|--------|
| 1.0 | Project rules & WBS | Review | `chore: add project rules and task decomposition` |
| 1.1 | Import the Mini-React engine from Exercise 3 (core only) | `npm test`, `npm run typecheck` | `chore: import mini-react engine from exercise 3` |
| 1.2 | Keyed O(n) reconciliation: patch DOM instead of re-mounting | Unit tests (node identity, keys, props) | `feat(core): implement keyed reconciliation` |
| 1.3 | `useEffect` with post-commit flush and cleanup | Unit tests | `feat(state): add useEffect hook` |
| 1.4 | Contracts: `ColumnDef<T>`, `DataGridProps<T>`, sort/filter/page/position types | `npm run typecheck` | `feat(types): define data grid contracts` |
| 1.5 | Pure pipeline: filter → sort (stable, locale-aware) → paginate | Unit tests | `feat(grid): implement filter sort and paginate pipeline` |
| 1.6 | Pure keyboard navigation reducer | Unit tests (every key) | `feat(grid): implement keyboard navigation reducer` |
| 1.7 | DataGrid view: ARIA grid table, `aria-sort`, roving tabindex, focus effect | Component tests | `feat(grid): render accessible grid with roving focus` |
| 1.8 | Selection: Enter selects (opens) the row, Space toggles multi-select | Component tests | `feat(grid): add keyboard row selection` |
| 1.9 | Toolbar (search, filter, page size) + pagination nav + live status | Component tests | `feat(grid): add filter toolbar and pagination` |
| 1.10 | Employee directory app, dataset, light/dark AA styles | Checkpoint tests + DevTools | `feat(ui): assemble employee directory data grid` |
| 1.11 | axe-core audit of every grid state | axe: 0 violations | `test(a11y): audit grid states with axe-core` |
| 1.12 | README with WCAG 2.2 checklist and Lighthouse results | Lighthouse 100/100 | `docs: add readme with wcag checklist and lighthouse report` |

## Checklist

- [x] Task 1.0: Write `project-rules.md` and `TASK_DECOMPOSITION.md`
- [x] Task 1.1: Import engine from Exercise 3
- [ ] Task 1.2: Implement keyed reconciliation
- [ ] Task 1.3: Implement `useEffect`
- [ ] Task 1.4: Define data grid contracts
- [ ] Task 1.5: Implement filter → sort → paginate pipeline
- [ ] Task 1.6: Implement keyboard navigation reducer
- [ ] Task 1.7: Render accessible grid with roving tabindex
- [ ] Task 1.8: Add Enter / Space row selection
- [ ] Task 1.9: Add toolbar and pagination
- [ ] Task 1.10: Assemble employee directory app
- [ ] Task 1.11: axe-core audit
- [ ] Task 1.12: README + Lighthouse report
