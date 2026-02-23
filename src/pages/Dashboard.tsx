import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { Users, FileText, Package, Boxes } from "lucide-react";
import { useClients } from "@/hooks/useClients";
import { useContracts } from "@/hooks/useContracts";
import { useProducts } from "@/hooks/useProducts";
import { useInventory } from "@/hooks/useInventory";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const { data: clients = [] } = useClients();
  const { data: contracts = [] } = useContracts();
  const { data: products = [] } = useProducts();
  const { data: inventory = [] } = useInventory();
  const [showFullInventory, setShowFullInventory] = useState(false);

  const totalInventory = inventory.reduce((sum, item) => sum + item.quantity_available, 0);

  const recentActivities = [
    ...contracts
      .filter((contract) => contract.contract_date)
      .slice(0, 4)
      .map((contract) => ({
        id: String(contract.id),
        type: "contract" as const,
        description: `Договор ${contract.contract_number} обновлен`,
        timestamp: new Date(contract.contract_date ?? new Date().toISOString()),
      })),
    ...clients.slice(0, 2).map((client) => ({
      id: String(client.id),
      type: "client" as const,
      description: `Добавлен новый покупатель: ${client.name}`,
      timestamp: new Date(),
    })),
  ]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 5);

  const inventoryByProductId = new Map(
    inventory.map((item) => [item.product_id, item])
  );

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display sm:text-3xl">Главная</h1>
          <p className="text-muted-foreground mt-1">Добро пожаловать! Краткая сводка по вашему бизнесу.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Всего покупателей"
            value={clients.length}
            subtitle="Зарегистрированные партнеры"
            icon={Users}
          />
          <StatsCard
            title="Договоры"
            value={contracts.length}
            subtitle="Подписанные соглашения"
            icon={FileText}
          />
          <StatsCard
            title="Товары"
            value={products.length}
            subtitle="Доступный каталог"
            icon={Package}
          />
          <StatsCard
            title="Склад"
            value={totalInventory.toLocaleString()}
            subtitle="Доступно единиц"
            icon={Boxes}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <div className="lg:col-span-1">
            <RecentActivity activities={recentActivities} />
          </div>

          {/* Inventory Snapshot */}
          <div className="lg:col-span-2">
            <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-lg font-semibold text-foreground">Сводка по складу</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFullInventory((prev) => !prev)}
                  className="w-full text-primary hover:text-primary sm:w-auto"
                >
                  {showFullInventory ? "Показать меньше" : "Показать весь склад"}
                </Button>
              </div>
              
              {products.length === 0 ? (
                <p className="text-muted-foreground text-sm">Товары пока не добавлены</p>
              ) : (
                <div className="space-y-3">
                  {(showFullInventory ? products : products.slice(0, 5)).map((product) => {
                    const stock = inventoryByProductId.get(product.id);
                    return (
                      <div key={product.id} className="flex flex-col gap-2 rounded-lg bg-muted/50 p-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-medium text-foreground">{product.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {product.unit} • {product.price.toLocaleString()} ₸
                          </p>
                        </div>
                        <div className="sm:text-right">
                          <p className="font-semibold text-foreground">
                            {stock?.quantity_available ?? 0} в наличии
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {stock?.quantity_reserved ?? 0} в резерве
                          </p>
                        </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            to="/clients"
            className="p-4 bg-card rounded-xl border border-border hover:border-primary/50 transition-all duration-200 group"
          >
            <Users className="h-8 w-8 text-primary mb-2 group-hover:scale-110 transition-transform" />
            <p className="font-medium text-foreground">Добавить покупателя</p>
            <p className="text-sm text-muted-foreground">Зарегистрировать нового партнера</p>
          </Link>
          <Link
            to="/contracts"
            className="p-4 bg-card rounded-xl border border-border hover:border-primary/50 transition-all duration-200 group"
          >
            <FileText className="h-8 w-8 text-primary mb-2 group-hover:scale-110 transition-transform" />
            <p className="font-medium text-foreground">Новый договор</p>
            <p className="text-sm text-muted-foreground">Создать соглашение</p>
          </Link>
        </div>
      </div>
    </MainLayout>
  );
}
