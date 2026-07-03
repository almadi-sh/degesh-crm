import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  useClientContracts,
  useContractDetail,
  useShipItem,
  useDeleteShipment,
  contractDownloadUrl,
  type AppendixItemOut,
} from "@/hooks/useClientContracts";
import { useWarehouseSummary } from "@/hooks/useWarehouseStock";
import { ChevronDown, ChevronRight, Download, FileText, Truck, X } from "lucide-react";

const currency = new Intl.NumberFormat("ru-RU", { style: "currency", currency: "KZT", maximumFractionDigits: 0 });
const num = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 });

const statusClass = (status: string) => {
  if (status === "полностью отгружен") return "bg-emerald-100 text-emerald-700 hover:bg-emerald-100";
  if (status === "частично отгружен") return "bg-amber-100 text-amber-700 hover:bg-amber-100";
  return "bg-muted text-muted-foreground hover:bg-muted";
};

const payClass = (status: string) => {
  if (status === "оплачен") return "bg-emerald-100 text-emerald-700 hover:bg-emerald-100";
  if (status === "частично оплачен") return "bg-amber-100 text-amber-700 hover:bg-amber-100";
  if (status === "не оплачен") return "bg-red-100 text-red-700 hover:bg-red-100";
  return "bg-muted text-muted-foreground hover:bg-muted";
};

interface ShipTarget {
  item: AppendixItemOut;
  contractId: number;
}

function AppendixItems({
  item,
  onShip,
  onDeleteShipment,
}: {
  item: AppendixItemOut;
  onShip: (item: AppendixItemOut) => void;
  onDeleteShipment: (shipmentId: number) => void;
}) {
  return (
    <>
      <TableRow>
        <TableCell className="max-w-[240px] font-medium">{item.name ?? "—"}</TableCell>
        <TableCell className="text-right whitespace-nowrap">
          {item.quantity != null ? `${num.format(item.quantity)} ${item.unit ?? ""}`.trim() : "—"}
        </TableCell>
        <TableCell className="text-right whitespace-nowrap">{item.unit_price != null ? currency.format(item.unit_price) : "—"}</TableCell>
        <TableCell className="text-right whitespace-nowrap">{item.total != null ? currency.format(item.total) : "—"}</TableCell>
        <TableCell className="text-right whitespace-nowrap text-emerald-700">{num.format(item.shipped)}</TableCell>
        <TableCell className="text-right whitespace-nowrap font-semibold">{num.format(item.remaining)}</TableCell>
        <TableCell>
          <Badge className={statusClass(item.status)} variant="secondary">{item.status}</Badge>
        </TableCell>
        <TableCell>
          <Button
            size="sm"
            variant="outline"
            className="gap-1"
            disabled={item.quantity != null && item.remaining <= 0}
            onClick={() => onShip(item)}
          >
            <Truck className="h-3.5 w-3.5" />
            Отгрузить
          </Button>
        </TableCell>
      </TableRow>
      {item.shipments.length > 0 && (
        <TableRow>
          <TableCell colSpan={8} className="bg-muted/30 py-2">
            <div className="flex flex-wrap gap-2">
              {item.shipments.map((s) => (
                <span key={s.id} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-xs">
                  <Truck className="h-3 w-3 text-muted-foreground" />
                  {s.warehouse ?? "—"}: {num.format(s.quantity)}
                  <button className="text-muted-foreground hover:text-red-600" onClick={() => onDeleteShipment(s.id)} title="Отменить">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function ContractRow({
  contract,
  bin,
  onShip,
}: {
  contract: { id: number; number: string | null; date: string | null; contract_total: number | null; appendix_count: number; status: string; payment_status: string; unpaid_amount: number | null; cancelled: boolean; has_file: boolean };
  bin: string;
  onShip: (t: ShipTarget) => void;
}) {
  const [open, setOpen] = useState(false);
  const { data: detail } = useContractDetail(open ? contract.id : undefined);
  const deleteShipment = useDeleteShipment(contract.id, bin);

  return (
    <>
      <TableRow className="cursor-pointer" onClick={() => setOpen((v) => !v)}>
        <TableCell>{open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</TableCell>
        <TableCell className="whitespace-nowrap text-muted-foreground">{contract.date ?? "—"}</TableCell>
        <TableCell className="font-medium">
          №{contract.number ?? "—"}
          {contract.cancelled && <Badge variant="outline" className="ml-2 text-red-600">аннулирован</Badge>}
        </TableCell>
        <TableCell className="text-right whitespace-nowrap font-semibold">{contract.contract_total != null ? currency.format(contract.contract_total) : "—"}</TableCell>
        <TableCell className="text-center">{contract.appendix_count}</TableCell>
        <TableCell><Badge className={statusClass(contract.status)} variant="secondary">{contract.status}</Badge></TableCell>
        <TableCell>
          <Badge className={payClass(contract.payment_status)} variant="secondary">{contract.payment_status}</Badge>
          {contract.unpaid_amount != null && contract.unpaid_amount > 0 && (
            <div className="mt-0.5 text-xs text-muted-foreground">долг {currency.format(contract.unpaid_amount)}</div>
          )}
        </TableCell>
        <TableCell onClick={(e) => e.stopPropagation()}>
          {contract.has_file ? (
            <a href={contractDownloadUrl(contract.id)} target="_blank" rel="noreferrer">
              <Button size="sm" variant="ghost" className="gap-1"><Download className="h-3.5 w-3.5" />Скачать</Button>
            </a>
          ) : (
            <span className="text-xs text-muted-foreground/60">нет файла</span>
          )}
        </TableCell>
      </TableRow>
      {open && detail && (
        <TableRow>
          <TableCell colSpan={8} className="bg-muted/20 p-4">
            <div className="space-y-4">
              {detail.appendices.map((app, idx) => (
                <div key={app.id} className="rounded-lg border border-border bg-background p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="font-semibold">Приложение №{app.appendix_number ?? idx + 1}</span>
                      {app.appendix_date && <span className="text-sm text-muted-foreground">от {app.appendix_date}</span>}
                      <Badge className={statusClass(app.status)} variant="secondary">{app.status}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {app.stated_total != null && <span className="font-medium text-foreground">{currency.format(app.stated_total)}</span>}
                      {app.payment_schedule.length > 0 && (
                        <span className="ml-3">
                          Оплата: {app.payment_schedule.map((p) => `${p.percent ?? "?"}%${p.date ? ` до ${p.date}` : ""}`).join(", ")}
                        </span>
                      )}
                    </div>
                  </div>
                  {app.delivery_terms && <p className="mb-2 text-xs text-muted-foreground">Поставка: {app.delivery_terms}</p>}
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Товар</TableHead>
                          <TableHead className="text-right">Кол-во</TableHead>
                          <TableHead className="text-right">Цена</TableHead>
                          <TableHead className="text-right">Сумма</TableHead>
                          <TableHead className="text-right">Отгружено</TableHead>
                          <TableHead className="text-right">Осталось</TableHead>
                          <TableHead>Статус</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {app.items.map((it) => (
                          <AppendixItems
                            key={it.id}
                            item={it}
                            onShip={(item) => onShip({ item, contractId: contract.id })}
                            onDeleteShipment={(sid) => deleteShipment.mutate(sid)}
                          />
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ))}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export function ClientContractsBlock({ bin }: { bin: string }) {
  const { data: contracts = [], isLoading } = useClientContracts(bin);
  const { data: whSummary } = useWarehouseSummary();
  const warehouses = (whSummary?.warehouses ?? []).map((w) => w.warehouse);

  const [shipTarget, setShipTarget] = useState<ShipTarget | null>(null);
  const [warehouse, setWarehouse] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const shipMutation = useShipItem(shipTarget?.contractId, bin);

  const openShip = (t: ShipTarget) => {
    setShipTarget(t);
    setWarehouse(warehouses[0] ?? "");
    setQuantity(t.item.remaining > 0 ? String(t.item.remaining) : "");
    setNote("");
  };

  const submitShip = () => {
    if (!shipTarget) return;
    const qty = Number(quantity);
    if (!warehouse || !qty || qty <= 0) return;
    shipMutation.mutate(
      { itemId: shipTarget.item.id, warehouse, quantity: qty, note: note || undefined },
      { onSuccess: () => setShipTarget(null) },
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Договоры</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Загрузка…</p>
        ) : contracts.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Договоров не найдено</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Дата</TableHead>
                  <TableHead>Договор</TableHead>
                  <TableHead className="text-right">Сумма контракта</TableHead>
                  <TableHead className="text-center">Приложений</TableHead>
                  <TableHead>Статус отгрузки</TableHead>
                  <TableHead>Оплата</TableHead>
                  <TableHead>Файл</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.map((c) => (
                  <ContractRow key={c.id} contract={c} bin={bin} onShip={openShip} />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={!!shipTarget} onOpenChange={(o) => !o && setShipTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Отгрузка: {shipTarget?.item.name ?? ""}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Осталось отгрузить: <span className="font-semibold text-foreground">{shipTarget ? num.format(shipTarget.item.remaining) : 0} {shipTarget?.item.unit ?? ""}</span>
            </p>
            <div className="space-y-2">
              <Label>Склад отгрузки</Label>
              {warehouses.length > 0 ? (
                <Select value={warehouse} onValueChange={setWarehouse}>
                  <SelectTrigger><SelectValue placeholder="Выберите склад" /></SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (<SelectItem key={w} value={w}>{w}</SelectItem>))}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={warehouse} onChange={(e) => setWarehouse(e.target.value)} placeholder="Название склада" />
              )}
            </div>
            <div className="space-y-2">
              <Label>Количество</Label>
              <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Количество" />
            </div>
            <div className="space-y-2">
              <Label>Комментарий (необязательно)</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Напр. номер накладной" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShipTarget(null)}>Отмена</Button>
              <Button onClick={submitShip} disabled={shipMutation.isPending || !warehouse || !Number(quantity)}>
                Отгрузить
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
