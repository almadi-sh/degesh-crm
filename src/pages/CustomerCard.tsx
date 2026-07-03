import { useMemo, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import {
  useCardClients,
  useClientCard,
  useClientAiSummary,
  type ClientListItem,
} from "@/hooks/useCustomerCard";
import { ClientContractsBlock } from "@/components/contracts/ClientContractsBlock";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem } from "@/components/ui/command";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Check,
  ChevronsUpDown,
  HandCoins,
  MapPin,
  Phone,
  ShoppingBag,
  Sparkles,
  User,
} from "lucide-react";
import { cn, displayCategory } from "@/lib/utils";

const currency = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "KZT",
  maximumFractionDigits: 0,
});
const number = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });

const PAGE_SIZE = 15;

export default function CustomerCard() {
  const { data: clients = [], isLoading: clientsLoading } = useCardClients();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [bin, setBin] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(0);

  const { data: card, isLoading: cardLoading } = useClientCard(bin);
  const { data: ai, isLoading: aiLoading, isError: aiError } = useClientAiSummary(bin);

  const selected = useMemo(() => clients.find((c) => c.bin_iin === bin), [clients, bin]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const base = needle
      ? clients.filter(
          (c) => (c.name && c.name.toLowerCase().includes(needle)) || c.bin_iin.includes(needle),
        )
      : clients;
    return base.slice(0, 50);
  }, [clients, query]);

  const purchases = card?.purchases ?? [];
  const pageCount = Math.max(1, Math.ceil(purchases.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pagePurchases = purchases.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
  const maxCat = Math.max(1, ...(card?.categories ?? []).map((c) => c.amount));

  const selectClient = (client: ClientListItem) => {
    setBin(client.bin_iin);
    setOpen(false);
    setPage(0);
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground font-display sm:text-3xl">
            <User className="h-7 w-7 text-primary" />
            Карточка клиента
          </h1>
          <p className="mt-1 text-muted-foreground">
            Профиль покупателя: контакты, задолженность, история закупок и AI-резюме для менеджера
          </p>
        </div>

        <div className="max-w-2xl space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Выбери клиента</label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between"
                disabled={clientsLoading}
              >
                <span className="truncate">
                  {selected ? selected.name ?? selected.bin_iin : clientsLoading ? "Загрузка…" : "Выбери клиента"}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
              <Command shouldFilter={false}>
                <CommandInput placeholder="Поиск по названию или БИН…" value={query} onValueChange={setQuery} />
                <CommandList>
                  <CommandEmpty>Ничего не найдено</CommandEmpty>
                  {filtered.map((c) => (
                    <CommandItem key={c.bin_iin} value={c.bin_iin} onSelect={() => selectClient(c)}>
                      <Check className={cn("mr-2 h-4 w-4", bin === c.bin_iin ? "opacity-100" : "opacity-0")} />
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate">{c.name ?? "—"}</span>
                        <span className="text-xs text-muted-foreground">
                          БИН {c.bin_iin} · долг {currency.format(c.total_debt)}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {!bin && (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              Выберите клиента, чтобы увидеть карточку
            </CardContent>
          </Card>
        )}

        {bin && cardLoading && (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        )}

        {bin && card && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">{card.profile.name ?? "—"}</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">БИН / ИИН</p>
                  <p className="font-medium">{card.profile.bin_iin}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Телефон</p>
                  {card.profile.phone ? (
                    <a
                      href={`tel:${card.profile.phone.replace(/[^\d+]/g, "")}`}
                      className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      {card.profile.phone}
                    </a>
                  ) : (
                    <p className="font-medium text-muted-foreground/60">нет данных</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Регион</p>
                  <p className="inline-flex items-center gap-1.5 font-medium">
                    {card.profile.region ? (
                      <>
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        {card.profile.region}
                      </>
                    ) : (
                      "—"
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Адрес</p>
                  <p className="font-medium" title={card.profile.address ?? ""}>
                    {card.profile.address ?? "—"}
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <StatsCard
                title="Задолженность"
                value={currency.format(card.total_debt)}
                subtitle={`${card.debts.length} строк договоров`}
                icon={HandCoins}
              />
              <StatsCard
                title="Всего купил"
                value={currency.format(card.realization_total)}
                subtitle={card.last_purchase ? `Последняя: ${card.last_purchase.slice(0, 10)}` : "Нет покупок"}
                icon={ShoppingBag}
              />
              <StatsCard
                title="Позиций / товаров"
                value={`${number.format(card.purchase_lines)} / ${number.format(card.product_count)}`}
                subtitle="Строк реализаций / уникальных SKU"
                icon={ShoppingBag}
              />
            </div>

            {card.categories.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Структура покупок по категориям</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {card.categories.map((c) => (
                    <div key={c.category} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{displayCategory(c.category)}</span>
                        <span className="text-muted-foreground">{currency.format(c.amount)}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${(c.amount / maxCat) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Долги по договорам</CardTitle>
              </CardHeader>
              <CardContent>
                {card.debts.length === 0 ? (
                  <p className="py-6 text-center text-muted-foreground">Задолженности нет</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Договор</TableHead>
                          <TableHead className="text-right">Дебет</TableHead>
                          <TableHead className="text-right">Кредит</TableHead>
                          <TableHead className="text-right">Долг</TableHead>
                          <TableHead>Дата</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {card.debts.map((d, i) => (
                          <TableRow key={i}>
                            <TableCell className="max-w-[320px] truncate" title={d.contract_name ?? ""}>
                              {d.contract_name ?? "—"}
                            </TableCell>
                            <TableCell className="text-right whitespace-nowrap">
                              {d.turnover_debit != null ? number.format(d.turnover_debit) : "—"}
                            </TableCell>
                            <TableCell className="text-right whitespace-nowrap">
                              {d.turnover_credit != null ? number.format(d.turnover_credit) : "—"}
                            </TableCell>
                            <TableCell className="text-right whitespace-nowrap font-semibold text-red-600">
                              {d.debt_amount != null ? currency.format(d.debt_amount) : "—"}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-muted-foreground">{d.report_date ?? "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">История покупок</CardTitle>
              </CardHeader>
              <CardContent>
                {purchases.length === 0 ? (
                  <p className="py-6 text-center text-muted-foreground">Покупок не найдено</p>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="whitespace-nowrap">Дата</TableHead>
                            <TableHead>Товар</TableHead>
                            <TableHead>Категория</TableHead>
                            <TableHead className="text-right">Кол-во</TableHead>
                            <TableHead className="text-right">Цена</TableHead>
                            <TableHead className="text-right">Сумма с НДС</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pagePurchases.map((p, i) => (
                            <TableRow key={i}>
                              <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                                {p.date ? p.date.slice(0, 10) : "—"}
                              </TableCell>
                              <TableCell className="max-w-[240px] truncate" title={p.product_name ?? ""}>
                                {p.product_name ?? "—"}
                              </TableCell>
                              <TableCell>{p.category ? <Badge variant="outline">{displayCategory(p.category)}</Badge> : "—"}</TableCell>
                              <TableCell className="text-right whitespace-nowrap">
                                {p.quantity != null ? `${number.format(p.quantity)} ${p.unit ?? ""}`.trim() : "—"}
                              </TableCell>
                              <TableCell className="text-right whitespace-nowrap">
                                {p.price != null ? currency.format(p.price) : "—"}
                              </TableCell>
                              <TableCell className="text-right whitespace-nowrap font-medium">
                                {p.amount != null ? currency.format(p.amount) : "—"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        {`Показано ${safePage * PAGE_SIZE + 1}–${Math.min((safePage + 1) * PAGE_SIZE, purchases.length)} из ${number.format(purchases.length)}`}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>
                          Назад
                        </Button>
                        <span className="text-sm text-muted-foreground">{safePage + 1} / {pageCount}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={safePage + 1 >= pageCount}
                          onClick={() => setPage(safePage + 1)}
                        >
                          Вперёд
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <ClientContractsBlock bin={bin} />

            <Card className="border-primary/30 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="h-5 w-5 text-primary" />
                  AI-резюме для менеджера
                  {ai && (
                    <Badge variant="secondary" className="ml-1">
                      {ai.source === "openai" ? "OpenAI" : "Авто-резюме"}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {aiLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-11/12" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                ) : aiError ? (
                  <p className="text-sm text-muted-foreground">Не удалось сгенерировать резюме.</p>
                ) : (
                  <div className="space-y-3 text-sm leading-relaxed">
                    {(ai?.summary ?? "").split("\n\n").map((para, i) => (
                      <p key={i}>{para}</p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </MainLayout>
  );
}
