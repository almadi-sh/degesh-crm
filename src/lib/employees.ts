export type EmployeeRole = "manager" | "sales";

export interface DemoEmployee {
  id: string;
  name: string;
  email: string;
  password: string;
  role: EmployeeRole;
  city: string;
}

export const DEMO_EMPLOYEES: DemoEmployee[] = [
  { id: "manager-001", name: "Айгерим Менеджер", email: "manager1@degeshcrm.local", password: "demo123", role: "manager", city: "Астана" },
  { id: "manager-002", name: "Нурлан Менеджер", email: "manager2@degeshcrm.local", password: "demo123", role: "manager", city: "Алматы" },
  { id: "sales-001", name: "Ерлан Продажи", email: "sales1@degeshcrm.local", password: "demo123", role: "sales", city: "Шымкент" },
  { id: "sales-002", name: "Дина Продажи", email: "sales2@degeshcrm.local", password: "demo123", role: "sales", city: "Караганда" },
];

export const DEFAULT_EMPLOYEE = DEMO_EMPLOYEES[0];
