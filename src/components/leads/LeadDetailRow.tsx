import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { useLeadDetail, type Lead } from "@/hooks/useLeads";
import { ChevronDown, ChevronRight, FileText, Phone, Sparkles } from "lucide-react";

const currency = new Intl.NumberFormat("ru-RU", { style: "currency", currency: "KZT", maximumFractionDigits: 0 });
const num = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 });

const TYPE_STYLE: Record<string, string> = {
  "Кросс-продажа": "bg-sky-100 text-sky-700 hover:bg-sky-100",
  "Потенциал роста": "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
  "Сезонная допродажа": "bg-amber-100 text-amber-700 hover:bg-amber-100",
  "Предложение остатков": "bg-violet-100 text-violet-700 hover:bg-violet-100",
};

const qtyStr = (q: number | null, unit: string | null) =>
  q != null ? `${num.format(q)} ${unit ?? ""}`.trim() : "—";

export function LeadDetailRow({ lead }: { lead: Lead }) {
  const [open, setOpen] = useState(false);
  const { data: detail, isLoading } = useLeadDetail(lead, open);

  return (
    <>
      <TableRow className="cursor-pointer" onClick={() => setOpen((v) => !v)}>
        <TableCell>
          <div className="flex items-center gap-1.5">
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <Badge className={TYPE_STYLE[lead.lead_type] ?? ""} variant="secondary">{lead.lead_type}</Badge>
          </div>
        </TableCell>
        <TableCell className="max-w-[220px]">
          <div className="truncate font-medium" title={lead.company_name ?? ""}>{lead.company_name ?? "—"}</div>
          <div className="text-xs text-muted-foreground">куплено {currency.format(lead.total_bought)}</div>
        </TableCell>
        <TableCell><Badge variant="outline">{lead.category}</Badge></TableCell>
        <TableCell className="max-w-[180px] truncate font-medium" title={lead.suggested_product ?? ""}>
          {lead.suggested_product ?? "—"}
        </TableCell>
        <TableCell className="text-right whitespace-nowrap font-semibold text-emerald-600">
          {currency.format(lead.potential)}
        </TableCell>
        <TableCell onClick={(e) => e.stopPropagation()}>
          {lead.phone ? (
            <a href={`tel:${lead.phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-1.5 whitespace-nowrap text-primary hover:underline">
              <Phone className="h-3.5 w-3.5" />
              {lead.phone}
            </a>
          ) : (
            <span className="text-muted-foreground/60">нет</span>
          )}
        </TableCell>
        <TableCell className="text-sm text-muted-foreground">{lead.reason}</TableCell>
      </TableRow>

      {open && (
        <TableRow>
          <TableCell colSpan={7} className="bg-muted/20 p-4">
            {isLoading ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Загрузка деталей…</p>
            ) : detail ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                  <div className="mb-1 flex items-center gap-2 text-sm font-medium">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Рекомендация
                    <Badge variant="secondary">{detail.narrative_source === "openai" ? "OpenAI" : "Авто"}</Badge>
                  </div>
                  <p className="text-sm leading-relaxed">{detail.narrative}</p>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div>
                    <p className="mb-2 text-sm font-semibold">
                      Закупки в сезон ({detail.season_label}) прошлых лет
                    </p>
                    {detail.seasons.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Нет данных за прошлые сезоны</p>
                    ) : (
                      <div className="space-y-2">
                        {detail.seasons.map((s) => (
                          <div key={s.year ?? "n"} className="rounded-md border border-border p-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium">{s.year}</span>
                              <span className="font-semibold">{currency.format(s.amount)}</span>
                            </div>
                            <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                              {s.items.slice(0, 4).map((it, idx) => (
                                <li key={idx} className="flex justify-between gap-2">
                                  <span className="truncate">{it.product} · {qtyStr(it.quantity, it.unit)}</span>
                                  <span className="whitespace-nowrap">{currency.format(it.amount)}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                        <div className="rounded-md border border-dashed border-border p-2 text-sm">
                          Сезон {detail.current_year}:{" "}
                          {detail.current_season && detail.current_season.items.length > 0 ? (
                            <span className="font-medium text-emerald-700">закуплено на {currency.format(detail.current_season.amount)}</span>
                          ) : (
                            <span className="font-medium text-amber-700">закупок по этой позиции ещё нет</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      Связанные приложения / договоры
                    </p>
                    {detail.related_appendices.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Нет привязанных приложений по этому товару</p>
                    ) : (
                      <div className="space-y-1.5">
                        {detail.related_appendices.map((r, idx) => (
                          <div key={idx} className="rounded-md border border-border p-2 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">№{r.contract_number} · прил. {r.appendix_number}</span>
                              <span className="text-muted-foreground">{r.appendix_date ?? r.contract_date ?? ""}</span>
                            </div>
                            <div className="mt-0.5 flex items-center justify-between text-muted-foreground">
                              <span className="truncate">{r.item_name} · {qtyStr(r.quantity, r.unit)}</span>
                              <span className="whitespace-nowrap">{r.amount != null ? currency.format(r.amount) : "—"}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">Не удалось загрузить детали</p>
            )}
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
