import type { ColumnDef } from './grid/types';

export interface Employee {
  readonly id: string;
  readonly name: string;
  readonly department: string;
  readonly role: string;
  readonly city: string;
  /** Monthly gross salary in VND. */
  readonly salary: number;
  /** ISO date (YYYY-MM-DD): sorts correctly as text. */
  readonly startDate: string;
  readonly status: 'Active' | 'Remote' | 'On leave';
  readonly email: string;
}

const FAMILY = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý'];
const MIDDLE = ['Văn', 'Thị', 'Minh', 'Hoàng', 'Thu', 'Đức', 'Ngọc', 'Quang', 'Thanh', 'Gia'];
const GIVEN = ['An', 'Bình', 'Cường', 'Dũng', 'Giang', 'Hà', 'Hải', 'Hạnh', 'Hiếu', 'Hòa', 'Khánh', 'Linh', 'Long', 'Mai', 'Nam', 'Phúc', 'Quân', 'Tâm', 'Thảo', 'Trang', 'Tuấn', 'Vy'];
const CITIES = ['Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Cần Thơ', 'Hải Phòng'];
const STATUSES: readonly Employee['status'][] = ['Active', 'Active', 'Active', 'Remote', 'On leave'];
const ROLES: Readonly<Record<string, readonly string[]>> = {
  Engineering: ['Frontend Engineer', 'Backend Engineer', 'Staff Engineer', 'QA Engineer'],
  Design: ['Product Designer', 'UX Researcher'],
  Product: ['Product Manager', 'Product Owner'],
  Data: ['Data Analyst', 'Data Engineer', 'ML Engineer'],
  Operations: ['DevOps Engineer', 'IT Support'],
  People: ['HR Partner', 'Recruiter'],
};
const DEPARTMENTS = Object.keys(ROLES);

/** Deterministic PRNG (mulberry32): the dataset is identical on every load and in tests. */
function prng(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const asciiSlug = (text: string): string =>
  text.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z]+/g, '.');

export function generateEmployees(count: number, seed = 2026): readonly Employee[] {
  const random = prng(seed);
  const pick = <V>(items: readonly V[]): V => items[Math.floor(random() * items.length)] as V;

  return Object.freeze(Array.from({ length: count }, (_, i): Employee => {
    const family = pick(FAMILY);
    const given = pick(GIVEN);
    const name = `${family} ${pick(MIDDLE)} ${given}`;
    const department = pick(DEPARTMENTS);
    const year = 2016 + Math.floor(random() * 10);
    const month = 1 + Math.floor(random() * 12);
    const day = 1 + Math.floor(random() * 28);
    return Object.freeze({
      id: `E${String(i + 1).padStart(3, '0')}`,
      name,
      department,
      role: pick(ROLES[department] ?? ['Specialist']),
      city: pick(CITIES),
      salary: (15 + Math.floor(random() * 86)) * 1_000_000,
      startDate: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      status: pick(STATUSES),
      email: `${asciiSlug(`${given} ${family}`)}${i + 1}@example.com`,
    });
  }));
}

const vnd = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
export const formatSalary = (value: number): string => vnd.format(value);
export const formatDate = (iso: string): string => {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

export const EMPLOYEE_COLUMNS: readonly ColumnDef<Employee>[] = [
  { header: 'Name', accessorKey: 'name', sortable: true },
  { header: 'Department', accessorKey: 'department', sortable: true, filterable: true },
  { header: 'Role', accessorKey: 'role', sortable: true },
  { header: 'City', accessorKey: 'city', sortable: true, filterable: true },
  { header: 'Salary', accessorKey: 'salary', sortable: true, align: 'end', format: (value) => formatSalary(Number(value)) },
  { header: 'Start date', accessorKey: 'startDate', sortable: true, format: (value) => formatDate(String(value)) },
  { header: 'Status', accessorKey: 'status', sortable: true, filterable: true },
];
