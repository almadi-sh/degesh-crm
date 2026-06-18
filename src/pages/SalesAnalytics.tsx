import { useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { useContracts } from "@/hooks/useContracts";
import { useEmployees } from "@/hooks/useEmployees";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, FileCheck2, FileClock, HandCoins, Users2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

type EmployeeStats = {
  id: string;
  name: string;
  roleLabel: string;
  city: string;
  contractsTotal: number;
  contractsActive: number;
  contractsClosed: number;
  revenueTotal: number;
  avgContractAmount: number;
  largestContractAmount: number;
};

const ACTIVE_STATUSES = new Set(["Draft", "Confirmed"]);

const chartConfig = {
  revenue: {
    label: "Сумма продаж",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

const currencyFormatter = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "KZT",
  maximumFractionDigits: 0,
});

const compactCurrencyFormatter = new Intl.NumberFormat("ru-RU", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function getContractTotalAmount(contract: { items?: Array<{ total_amount: number; price: number; quantity: number }> }) {
  return (contract.items ?? []).reduce((sum, item) => {
    const total = Number(item.total_amount) || Number(item.price) * Number(item.quantity) || 0;
    return sum + total;
  }, 0);
}

export default function SalesAnalytics() {
  const { data: contracts = [] } = useContracts();
  const { data: employees = [] } = useEmployees();

  const employeeStats = useMemo<EmployeeStats[]>(() => {
    return employees.map((employee) => {
      const ownedContracts = contracts.filter((contract) => contract.owner_employee_id === employee.id);
      const totalAmount = ownedContracts.reduce((sum, contract) => sum + getContractTotalAmount(contract), 0);
      const activeContracts = ownedContracts.filter((contract) => ACTIVE_STATUSES.has(contract.status)).length;
      const closedContracts = ownedContracts.filter((contract) => contract.status === "Sent").length;
      const largestContractAmount = ownedContracts.reduce((max, contract) => Math.max(max, getContractTotalAmount(contract)), 0);

      return {
        id: employee.id,
        name: employee.name,
        roleLabel: employee.role === "sales" ? "Продажник" : "Сотрудник",
        city: employee.city,
        contractsTotal: ownedContracts.length,
        contractsActive: activeContracts,
        contractsClosed: closedContracts,
        revenueTotal: totalAmount,
        avgContractAmount: ownedContracts.length ? totalAmount / ownedContracts.length : 0,
        largestContractAmount,
      };
    }).sort((a, b) => b.revenueTotal - a.revenueTotal);
  }, [contracts, employees]);

  const totalRevenue = employeeStats.reduce((sum, stat) => sum + stat.revenueTotal, 0);
  const totalContracts = employeeStats.reduce((sum, stat) => sum + stat.contractsTotal, 0);
  const totalActiveContracts = employeeStats.reduce((sum, stat) => sum + stat.contractsActive, 0);
  const totalClosedContracts = employeeStats.reduce((sum, stat) => sum + stat.contractsClosed, 0);
  const bestEmployee = employeeStats[0];

  const roleSummary = useMemo(() => {
    return employeeStats.reduce(
      (acc, stat) => {
        if (stat.roleLabel === "Продажник") {
          acc.salesRevenue += stat.revenueTotal;
          acc.salesContracts += stat.contractsTotal;
        } else {
          acc.staffRevenue += stat.revenueTotal;
          acc.staffContracts += stat.contractsTotal;
        }
        return acc;
      },
      {
        salesRevenue: 0,
        salesContracts: 0,
        staffRevenue: 0,
        staffContracts: 0,
      },
    );
  }, [employeeStats]);

  return (
    <MainLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display sm:text-3xl">Аналитика продаж</h1>
          <p className="mt-1 text-muted-foreground">Сводка по сотрудникам и продажникам: объем продаж, активные договоры и эффективность.</p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          <StatsCard title="Общая сумма контрактов" value={currencyFormatter.format(totalRevenue)} subtitle="По всем сотрудникам" icon={HandCoins} />
          <StatsCard title="Всего договоров" value={totalContracts} subtitle="В работе и закрытые" icon={Users2} />
          <StatsCard title="Активные договоры" value={totalActiveContracts} subtitle="Draft + Confirmed" icon={FileClock} />
          <StatsCard title="Закрытые договоры" value={totalClosedContracts} subtitle="Со статусом Sent" icon={FileCheck2} />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
          <Card className="xl:col-span-3">
            <CardHeader>
              <CardTitle className="text-lg">Сумма продаж по сотрудникам</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[340px] w-full">
                <BarChart data={employeeStats} margin={{ left: 12, right: 12, top: 12 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} interval={0} angle={-20} textAnchor="end" height={70} />
                  <YAxis tickFormatter={(value) => compactCurrencyFormatter.format(Number(value))} tickLine={false} axisLine={false} width={90} />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        formatter={(value) => (
                          <div className="flex min-w-[180px] items-center justify-between gap-4">
                            <span className="text-muted-foreground">Сумма</span>
                            <span className="font-medium text-foreground">{currencyFormatter.format(Number(value))}</span>
                          </div>
                        )}
                      />
                    }
                  />
                  <Bar dataKey="revenueTotal" fill="var(--color-revenue)" radius={[8, 8, 0, 0]} name="revenue" />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Роли и вклад в выручку</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-border p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-medium">Продажники</p>
                  <Badge variant="secondary">{roleSummary.salesContracts} договоров</Badge>
                </div>
                <p className="text-2xl font-semibold">{currencyFormatter.format(roleSummary.salesRevenue)}</p>
              </div>

              <div className="rounded-lg border border-border p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-medium">Сотрудники</p>
                  <Badge variant="secondary">{roleSummary.staffContracts} договоров</Badge>
                </div>
                <p className="text-2xl font-semibold">{currencyFormatter.format(roleSummary.staffRevenue)}</p>
              </div>

              <div className="rounded-lg bg-muted/40 p-4">
                <p className="text-sm text-muted-foreground">Лидер по сумме продаж</p>
                <p className="text-lg font-semibold">{bestEmployee?.name ?? "—"}</p>
                <p className="text-sm text-muted-foreground">{bestEmployee ? currencyFormatter.format(bestEmployee.revenueTotal) : "Нет данных"}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Подробная таблица по сотрудникам</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Сотрудник</TableHead>
                  <TableHead>Роль</TableHead>
                  <TableHead>Город</TableHead>
                  <TableHead className="text-right">Договоров</TableHead>
                  <TableHead className="text-right">Активные</TableHead>
                  <TableHead className="text-right">Закрытые</TableHead>
                  <TableHead className="text-right">Сумма контрактов</TableHead>
                  <TableHead className="text-right">Средний чек</TableHead>
                  <TableHead className="text-right">Крупнейший контракт</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employeeStats.map((stat) => (
                  <TableRow key={stat.id}>
                    <TableCell className="font-medium">{stat.name}</TableCell>
                    <TableCell>
                      <Badge variant={stat.roleLabel === "Продажник" ? "default" : "outline"}>{stat.roleLabel}</Badge>
                    </TableCell>
                    <TableCell>{stat.city}</TableCell>
                    <TableCell className="text-right">{stat.contractsTotal}</TableCell>
                    <TableCell className="text-right">{stat.contractsActive}</TableCell>
                    <TableCell className="text-right">{stat.contractsClosed}</TableCell>
                    <TableCell className="text-right">{currencyFormatter.format(stat.revenueTotal)}</TableCell>
                    <TableCell className="text-right">{currencyFormatter.format(stat.avgContractAmount)}</TableCell>
                    <TableCell className="text-right">{currencyFormatter.format(stat.largestContractAmount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-2 flex items-center gap-2 text-foreground">
            <BarChart3 className="h-5 w-5 text-primary" />
            <p className="font-medium">Что учитывается в аналитике</p>
          </div>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Сумма продаж считается по позициям договора (total_amount, либо quantity × price).</li>
            <li>Активные договоры: статусы Draft и Confirmed.</li>
            <li>Закрытые договоры: статус Sent.</li>
          </ul>
        </div>
      </div>
    </MainLayout>
  );
}
