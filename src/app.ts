import { DataGrid } from './grid/data-grid';
import { EMPLOYEE_COLUMNS, formatDate, formatSalary, generateEmployees, type Employee } from './employees';
import { createElement, useState, type VNode } from './mini-react';

export const EMPLOYEES = generateEmployees(64);

function EmployeeDetails({ employee }: { readonly employee: Employee | null }): VNode {
  const body = employee === null
    ? createElement('p', { className: 'muted' }, 'Press Enter on a row, or click it, to see the details here.')
    : createElement('article', { className: 'details-card', 'aria-labelledby': 'details-name' },
      createElement('h3', { id: 'details-name' }, employee.name),
      createElement('dl', null,
        ([
          ['Employee ID', employee.id],
          ['Department', employee.department],
          ['Role', employee.role],
          ['City', employee.city],
          ['Salary (monthly)', formatSalary(employee.salary)],
          ['Start date', formatDate(employee.startDate)],
          ['Status', employee.status],
          ['Email', employee.email],
        ] as const).map(([term, value]) => [
          // <dl> may only contain dt/dd (or div groups, which are banned here), so pairs are flat.
          createElement('dt', { key: `t-${term}` }, term),
          createElement('dd', { key: `d-${term}` }, value),
        ]),
      ),
    );

  return createElement('section', { className: 'details', 'aria-labelledby': 'details-title' },
    createElement('h2', { id: 'details-title' }, 'Employee details'),
    body,
  );
}

export function App(): VNode {
  const [opened, setOpened] = useState<Employee | null>(null);

  return createElement('section', { className: 'directory', 'aria-labelledby': 'directory-title' },
    createElement('h2', { id: 'directory-title' }, 'Directory'),
    DataGrid<Employee>({
      id: 'employees',
      data: EMPLOYEES,
      columns: EMPLOYEE_COLUMNS,
      getRowId: (employee) => employee.id,
      ariaLabel: 'Employees',
      caption: 'Employees',
      onRowSelect: setOpened,
    }),
    EmployeeDetails({ employee: opened }),
  );
}
