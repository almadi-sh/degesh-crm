import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { useClients } from "@/hooks/useClients";
import { useContracts } from "@/hooks/useContracts";
import { useContractItems } from "@/hooks/useContractItems";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ClientCards() {
  const { data: clients = [], isLoading } = useClients();
  const [search, setSearch] = useState("");
  const [activeClientId, setActiveClientId] = useState<number | null>(null);

  const filtered = useMemo(
    () => clients.filter((item) => [item.name, item.bin_iin, item.city].filter(Boolean).some((v) => v?.toLowerCase().includes(search.toLowerCase()))),
    [clients, search],
  );

  const activeClient = useMemo(() => {
    if (activeClientId) {
      return clients.find((item) => item.id === activeClientId) ?? filtered[0] ?? null;
    }
    return filtered[0] ?? null;
  }, [activeClientId, clients, filtered]);

  const { data: contracts = [] } = useContracts(activeClient ? { customer_id: activeClient.id } : undefined);
  const { data: contractItems = [] } = useContractItems(activeClient ? { customer_id: activeClient.id } : undefined);

  const itemsByContract = useMemo(() => {
    const map = new Map<number, typeof contractItems>();
    for (const item of contractItems) {
      if (!map.has(item.contract_id)) {
        map.set(item.contract_id, []);
      }
      map.get(item.contract_id)?.push(item);
    }
    return map;
  }, [contractItems]);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground font-display">Клиенты</h1>
          <p className="text-muted-foreground mt-1">Полная карточка клиента: реквизиты, подписант, сделки и приложения в одном экране.</p>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px,1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Список клиентов</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по клиенту..." />
              <div className="max-h-[65vh] space-y-2 overflow-y-auto pr-1">
                {filtered.map((client) => (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => setActiveClientId(client.id)}
                    className={`w-full rounded-lg border px-3 py-2 text-left ${activeClient?.id === client.id ? "border-primary bg-primary/5" : "border-border"}`}
                  >
                    <p className="font-medium">{client.name}</p>
                    <p className="text-xs text-muted-foreground">{client.bin_iin ?? "Без BIN/IIN"}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Карточка клиента</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Загрузка...</p>
              ) : !activeClient ? (
                <p className="text-sm text-muted-foreground">Клиент не выбран.</p>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold">{activeClient.name}</h2>
                    <p className="text-sm text-muted-foreground">{activeClient.legal_form ?? "—"} • {activeClient.tax_regime ?? "Налоговый режим не указан"}</p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div><p className="text-xs text-muted-foreground">БИН/ИИН</p><p className="font-medium">{activeClient.bin_iin ?? "—"}</p></div>
                    <div><p className="text-xs text-muted-foreground">Город</p><p className="font-medium">{activeClient.city ?? "—"}</p></div>
                    <div className="md:col-span-2"><p className="text-xs text-muted-foreground">Юридический адрес</p><p className="font-medium">{activeClient.legal_address ?? "—"}</p></div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div><p className="text-xs text-muted-foreground">Подписант</p><p className="font-medium">{activeClient.contract_signer_full_name ?? "—"}</p></div>
                    <div><p className="text-xs text-muted-foreground">Роль подписанта</p><p className="font-medium">{activeClient.contract_signer_role ?? "—"}</p></div>
                    <div><p className="text-xs text-muted-foreground">Основание</p><p className="font-medium">{activeClient.contract_signer_basis ?? "—"}</p></div>
                    <div><p className="text-xs text-muted-foreground">Кто создал</p><p className="font-medium">{activeClient.created_by_user ?? "—"}</p></div>
                    <div><p className="text-xs text-muted-foreground">Изначально скоммуницировал</p><p className="font-medium">{activeClient.initial_contact_user ?? "—"}</p></div>
                  </div>

                  <Tabs defaultValue="contracts" className="space-y-4">
                    <TabsList>
                      <TabsTrigger value="contracts">Сделки / договоры</TabsTrigger>
                      <TabsTrigger value="appendices">Приложения</TabsTrigger>
                      <TabsTrigger value="shipments">Отгрузки</TabsTrigger>
                      <TabsTrigger value="payments">Платежи</TabsTrigger>
                      <TabsTrigger value="history">История изменений</TabsTrigger>
                    </TabsList>

                    <TabsContent value="contracts" className="space-y-2">
                      {contracts.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Нет договоров.</p>
                      ) : contracts.map((contract) => (
                        <div key={contract.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                          <div>
                            <p className="font-medium">{contract.contract_number}</p>
                            <p className="text-xs text-muted-foreground">{new Date(contract.contract_date).toLocaleDateString("ru-RU")}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge>{contract.status}</Badge>
                            <Link to={`/contract-items?contractId=${contract.id}`}>
                              <Button size="sm" variant="outline">Открыть</Button>
                            </Link>
                          </div>
                        </div>
                      ))}
                    </TabsContent>

                    <TabsContent value="appendices" className="space-y-2">
                      {contracts.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Сначала создайте договор для клиента.</p>
                      ) : contracts.map((contract) => {
                        const items = itemsByContract.get(contract.id) ?? [];
                        const appendixCount = new Set(items.map((item) => item.appendix_number || 1)).size;
                        const latestAppendix = items.reduce((maxValue, item) => Math.max(maxValue, item.appendix_number || 1), 1);
                        return (
                          <div key={contract.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                            <div>
                              <p className="font-medium">{contract.contract_number}</p>
                              <p className="text-xs text-muted-foreground">
                                Позиции: {items.length} • Приложений: {appendixCount}
                              </p>
                            </div>
                            <Link to={`/contract-items?contractId=${contract.id}&appendixNumber=${latestAppendix}`}>
                              <Button size="sm" variant="outline">Редактировать</Button>
                            </Link>
                          </div>
                        );
                      })}
                    </TabsContent>

                    <TabsContent value="shipments" className="space-y-2">
                      <div className="rounded-lg border border-dashed border-border p-4">
                        <p className="text-sm font-medium">Отгрузки клиента</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Раздел подготовлен как задел: здесь будет лента отгрузок по договорам клиента.
                        </p>
                      </div>
                    </TabsContent>

                    <TabsContent value="payments" className="space-y-2">
                      <div className="rounded-lg border border-dashed border-border p-4">
                        <p className="text-sm font-medium">Платежи клиента</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Раздел подготовлен как задел: здесь появится журнал платежей и сверка оплат.
                        </p>
                      </div>
                    </TabsContent>

                    <TabsContent value="history" className="space-y-2">
                      <div className="rounded-lg border border-dashed border-border p-4">
                        <p className="text-sm font-medium">История изменений</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Раздел подготовлен как задел: здесь будет таймлайн изменений по клиенту, сделкам и приложениям.
                        </p>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
