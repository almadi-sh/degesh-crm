import { useEffect, useMemo, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { displayCategory } from "@/lib/utils";
import { StatsCard } from "@/components/dashboard/StatsCard";
import {
  useRealizations,
  useRealizationsAnalytics,
  useRealizationsPaymentSummary,
  type CategoryPoint,
} from "@/hooks/useRealizations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  LabelList,
  Legend,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  BarChart3,
  Boxes,
  HandCoins,
  Package,
  Users2,
} from "lucide-react";

const currency = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "KZT",
  maximumFractionDigits: 0,
});

const compact = new Intl.NumberFormat("ru-RU", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const number = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });
const bln = (v: number) => `${(v / 1e9).toFixed(1)} млрд ₸`;

const CATEGORY_COLORS: Record<string, string> = {
  "Гербицид": "hsl(150 45% 30%)",
  "Инсектицид": "hsl(38 85% 50%)",
  "Фунгицид": "hsl(200 50% 45%)",
  "Семена": "hsl(90 40% 40%)",
  "Удобрение": "hsl(25 60% 50%)",
  "Пестицид / СЗР": "hsl(340 45% 50%)",
  "Протравитель": "hsl(265 40% 55%)",
  "Стимулятор роста": "hsl(170 45% 40%)",
  "Прочее": "hsl(150 10% 55%)",
};
const FALLBACK_COLORS = [
  "hsl(150 45% 30%)",
  "hsl(38 85% 50%)",
  "hsl(200 50% 45%)",
  "hsl(90 40% 40%)",
  "hsl(25 60% 50%)",
  "hsl(340 45% 50%)",
  "hsl(265 40% 55%)",
  "hsl(170 45% 40%)",
];

const categoryColor = (name: string, index: number) =>
  CATEGORY_COLORS[name] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length];

const monthChartConfig = {
  amount: { label: "Выручка", color: "hsl(var(--primary))" },
} satisfies ChartConfig;

const categoryChartConfig = {
  amount: { label: "Выручка", color: "hsl(var(--primary))" },
} satisfies ChartConfig;

function useDebounced<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

const monthLabel = (ym: string) => {
  const [y, m] = ym.split("-");
  const months = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
  return `${months[Number(m) - 1] ?? m} ${y.slice(2)}`;
};

const PAGE_SIZE = 25;

export default function Realizations() {
  const [year, setYear] = useState<number | undefined>(undefined);

  // Table filters
  const [counterpartyInput, setCounterpartyInput] = useState("");
  const [productInput, setProductInput] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [month, setMonth] = useState<string>("all");
  const [page, setPage] = useState(0);

  const counterparty = useDebounced(counterpartyInput);
  const product = useDebounced(productInput);

  const { data: analytics, isLoading: analyticsLoading } = useRealizationsAnalytics(year, 10);
  const { data: paymentSummary } = useRealizationsPaymentSummary(year);

  useEffect(() => {
    setPage(0);
  }, [counterparty, product, category, month, year]);

  const { data: list, isLoading: listLoading } = useRealizations({
    counterparty: counterparty || undefined,
    product: product || undefined,
    category: category !== "all" ? category : undefined,
    year_month: month !== "all" ? month : undefined,
    year,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  const monthData = useMemo(
    () =>
      (analytics?.by_month ?? []).map((m) => ({
        ...m,
        label: monthLabel(m.year_month),
      })),
    [analytics],
  );

  const categoryData = useMemo(
    () =>
      (analytics?.by_category ?? []).map((c: CategoryPoint) => ({
        ...c,
        short: c.category.length > 16 ? `${c.category.slice(0, 15)}…` : c.category,
      })),
    [analytics],
  );

  const maxProduct = analytics?.top_products?.[0]?.amount ?? 0;
  const categoryTotal = (analytics?.by_category ?? []).reduce((sum, c) => sum + c.amount, 0);
  const regionData = (() => {
    const list = analytics?.by_region ?? [];
    const TOPN = 12;
    const rows = list.slice(0, TOPN).map((r) => ({ ...r, short: r.region }));
    const rest = list.slice(TOPN);
    if (rest.length > 0) {
      rows.push({
        region: "Прочие",
        short: "Прочие",
        amount: rest.reduce((sum, r) => sum + r.amount, 0),
        count: rest.reduce((sum, r) => sum + r.count, 0),
      });
    }
    return rows;
  })();
  const maxClient = analytics?.top_counterparties?.[0]?.amount ?? 0;
  const totalAmount = analytics?.total_amount ?? 0;

  const total = list?.total ?? 0;
  const items = list?.items ?? [];
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const yearOptions = analytics?.years ?? [];

  return (
    <MainLayout>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground font-display sm:text-3xl">Реализации</h1>
            <p className="mt-1 text-muted-foreground">
              Продажи компании: выручка, товары, категории и клиенты
              {analytics?.date_from && analytics?.date_to
                ? ` · ${analytics.date_from.slice(0, 10)} — ${analytics.date_to.slice(0, 10)}`
                : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={year === undefined ? "default" : "outline"}
              size="sm"
              onClick={() => setYear(undefined)}
            >
              Все годы
            </Button>
            {yearOptions.map((y) => (
              <Button
                key={y}
                variant={year === y ? "default" : "outline"}
                size="sm"
                onClick={() => setYear(y)}
              >
                {y}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          <StatsCard
            title="Общая выручка (с НДС)"
            value={currency.format(totalAmount)}
            subtitle={year ? `За ${year} год` : "За весь период"}
            icon={HandCoins}
          />
          <StatsCard
            title="Позиций продаж"
            value={number.format(analytics?.line_items ?? 0)}
            subtitle={`${number.format(analytics?.documents ?? 0)} документов`}
            icon={BarChart3}
          />
          <StatsCard
            title="Контрагентов"
            value={number.format(analytics?.counterparties ?? 0)}
            subtitle="Уникальных покупателей"
            icon={Users2}
          />
          <StatsCard
            title="Номенклатур"
            value={number.format(analytics?.products ?? 0)}
            subtitle="Уникальных товаров"
            icon={Package}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Динамика выручки по месяцам</CardTitle>
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <div className="h-[320px] animate-pulse rounded-md bg-muted/40" />
            ) : (
              <ChartContainer config={monthChartConfig} className="h-[320px] w-full">
                <AreaChart data={monthData} margin={{ left: 12, right: 12, top: 12 }}>
                  <defs>
                    <linearGradient id="fillAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-amount)" stopOpacity={0.7} />
                      <stop offset="95%" stopColor="var(--color-amount)" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    interval="preserveStartEnd"
                    minTickGap={16}
                    angle={-30}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    tickFormatter={(v) => compact.format(Number(v))}
                    tickLine={false}
                    axisLine={false}
                    width={70}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.label ?? ""}
                        formatter={(value, _name, item) => (
                          <div className="flex min-w-[190px] flex-col gap-1">
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-muted-foreground">Выручка</span>
                              <span className="font-medium text-foreground">{currency.format(Number(value))}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-muted-foreground">Позиций</span>
                              <span className="font-medium text-foreground">{number.format(item?.payload?.count ?? 0)}</span>
                            </div>
                          </div>
                        )}
                      />
                    }
                  />
                  <Area
                    dataKey="amount"
                    type="monotone"
                    fill="url(#fillAmount)"
                    stroke="var(--color-amount)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Выручка по категориям</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={categoryChartConfig} className="h-[340px] w-full">
                <BarChart
                  data={categoryData}
                  layout="vertical"
                  margin={{ left: 12, right: 40, top: 4, bottom: 4 }}
                >
                  <CartesianGrid horizontal={false} />
                  <XAxis
                    type="number"
                    tickFormatter={(v) => compact.format(Number(v))}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="short"
                    tickLine={false}
                    axisLine={false}
                    width={110}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.category ?? ""}
                        formatter={(value) => (
                          <div className="flex min-w-[170px] items-center justify-between gap-4">
                            <span className="text-muted-foreground">Выручка</span>
                            <span className="font-medium text-foreground">{currency.format(Number(value))}</span>
                          </div>
                        )}
                      />
                    }
                  />
                  <Bar dataKey="amount" radius={[0, 6, 6, 0]}>
                    {categoryData.map((c, i) => (
                      <Cell key={c.category} fill={categoryColor(c.category, i)} />
                    ))}
                    <LabelList
                      dataKey="amount"
                      position="right"
                      formatter={(v: number) => compact.format(Number(v))}
                      className="fill-muted-foreground text-xs"
                    />
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Топ-10 товаров по выручке</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(analytics?.top_products ?? []).map((p, i) => (
                <div key={p.product_name} className="space-y-1">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="w-5 text-muted-foreground">{i + 1}.</span>
                      <span className="truncate font-medium" title={p.product_name}>{p.product_name}</span>
                    </span>
                    <span className="whitespace-nowrap font-semibold">{currency.format(p.amount)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${maxProduct ? (p.amount / maxProduct) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
              {!analyticsLoading && (analytics?.top_products?.length ?? 0) === 0 && (
                <p className="text-sm text-muted-foreground">Нет данных</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Выручка по категориям (доли, %)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={categoryChartConfig} className="mx-auto h-[360px] w-full">
              <PieChart>
                <Tooltip
                  formatter={(value: number, name: string) => [
                    `${currency.format(Number(value))} (${categoryTotal ? ((Number(value) / categoryTotal) * 100).toFixed(1) : 0}%)`,
                    name,
                  ]}
                />
                <Legend />
                <Pie
                  data={categoryData}
                  dataKey="amount"
                  nameKey="category"
                  innerRadius={70}
                  outerRadius={130}
                  paddingAngle={2}
                  label={({ percent }) => (percent > 0.03 ? `${(percent * 100).toFixed(0)}%` : "")}
                  labelLine={false}
                >
                  {categoryData.map((c, i) => (
                    <Cell key={c.category} fill={categoryColor(c.category, i)} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Оплата (факт)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <p className="text-sm text-muted-foreground">Всего реализаций</p>
                <p className="text-3xl font-bold">{bln(paymentSummary?.total_realizations ?? 0)}</p>
              </div>
              <div className="flex h-3 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-emerald-500"
                  style={{ width: `${paymentSummary && paymentSummary.total_realizations ? (paymentSummary.paid / paymentSummary.total_realizations) * 100 : 0}%` }}
                />
                <div
                  className="h-full bg-red-500"
                  style={{ width: `${paymentSummary && paymentSummary.total_realizations ? (paymentSummary.unpaid / paymentSummary.total_realizations) * 100 : 0}%` }}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-emerald-50 p-3">
                  <p className="text-xs text-emerald-700">Оплачено</p>
                  <p className="text-2xl font-bold text-emerald-700">{bln(paymentSummary?.paid ?? 0)}</p>
                </div>
                <div className="rounded-lg bg-red-50 p-3">
                  <p className="text-xs text-red-700">Осталось оплатить</p>
                  <p className="text-2xl font-bold text-red-700">{bln(paymentSummary?.unpaid ?? 0)}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                «Осталось оплатить» — текущая дебиторка (счёт 1210). Оплачено = реализации − дебиторка.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Выручка по регионам</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={categoryChartConfig} className="h-[380px] w-full">
              <BarChart data={regionData} layout="vertical" margin={{ left: 12, right: 48, top: 4, bottom: 4 }}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => compact.format(Number(v))} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="short" tickLine={false} axisLine={false} width={160} />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.region ?? ""}
                      formatter={(value) => (
                        <div className="flex min-w-[170px] items-center justify-between gap-4">
                          <span className="text-muted-foreground">Выручка</span>
                          <span className="font-medium text-foreground">{currency.format(Number(value))}</span>
                        </div>
                      )}
                    />
                  }
                />
                <Bar dataKey="amount" radius={[0, 6, 6, 0]}>
                  {regionData.map((r, i) => (
                    <Cell key={r.region} fill={categoryColor(r.region, i)} />
                  ))}
                  <LabelList
                    dataKey="amount"
                    position="right"
                    formatter={(v: number) => compact.format(Number(v))}
                    className="fill-muted-foreground text-xs"
                  />
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Топ-10 клиентов по выручке</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-flow-col md:grid-cols-2 md:grid-rows-5">
              {(analytics?.top_counterparties ?? []).map((cp, i) => (
                <div key={cp.counterparty} className="space-y-1">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="w-5 text-muted-foreground">{i + 1}.</span>
                      <span className="truncate font-medium" title={cp.counterparty}>{cp.counterparty}</span>
                    </span>
                    <span className="flex items-center gap-2 whitespace-nowrap">
                      <Badge variant="secondary">{cp.count}</Badge>
                      <span className="font-semibold">{currency.format(cp.amount)}</span>
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${maxClient ? (cp.amount / maxClient) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="gap-4">
            <CardTitle className="text-lg">Все реализации</CardTitle>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Input
                placeholder="Поиск по контрагенту"
                value={counterpartyInput}
                onChange={(e) => setCounterpartyInput(e.target.value)}
              />
              <Input
                placeholder="Поиск по товару"
                value={productInput}
                onChange={(e) => setProductInput(e.target.value)}
              />
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Категория" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все категории</SelectItem>
                  {(analytics?.by_category ?? []).map((c) => (
                    <SelectItem key={c.category} value={c.category}>
                      {c.category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Месяц" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все месяцы</SelectItem>
                  {[...(analytics?.by_month ?? [])].reverse().map((m) => (
                    <SelectItem key={m.year_month} value={m.year_month}>
                      {monthLabel(m.year_month)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Дата</TableHead>
                    <TableHead>Контрагент</TableHead>
                    <TableHead>Товар</TableHead>
                    <TableHead>Категория</TableHead>
                    <TableHead className="text-right">Кол-во</TableHead>
                    <TableHead className="text-right">Цена</TableHead>
                    <TableHead className="text-right">Сумма с НДС</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                        Загрузка…
                      </TableCell>
                    </TableRow>
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                        Ничего не найдено
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {r.realization_date ? r.realization_date.slice(0, 10) : r.date_raw ?? "—"}
                        </TableCell>
                        <TableCell className="max-w-[220px] truncate font-medium" title={r.counterparty ?? ""}>
                          {r.counterparty ?? "—"}
                        </TableCell>
                        <TableCell className="max-w-[220px] truncate" title={r.nomenclature ?? ""}>
                          {r.product_name ?? r.nomenclature ?? "—"}
                        </TableCell>
                        <TableCell>
                          {r.category ? <Badge variant="outline">{displayCategory(r.category)}</Badge> : "—"}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {r.quantity != null ? `${number.format(r.quantity)} ${r.unit ?? ""}`.trim() : "—"}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {r.price != null ? currency.format(r.price) : "—"}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap font-medium">
                          {r.amount_with_vat != null ? currency.format(r.amount_with_vat) : "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
              <p className="text-sm text-muted-foreground">
                {total > 0
                  ? `Показано ${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, total)} из ${number.format(total)}`
                  : "0 записей"}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  Назад
                </Button>
                <span className="text-sm text-muted-foreground">
                  {page + 1} / {pageCount}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page + 1 >= pageCount}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Вперёд
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
