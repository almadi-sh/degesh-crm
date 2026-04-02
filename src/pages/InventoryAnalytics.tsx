import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function InventoryAnalytics() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground font-display">Аналитика инвентаря</h1>
          <p className="text-muted-foreground mt-1">Дэшборды по товарам, остаткам и распределению по складам.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Оборачиваемость товаров</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">Раздел в разработке: скорость движения товара по складам.</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Распределение по складам</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">Раздел в разработке: структура остатков по регионам.</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Риск дефицита</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">Раздел в разработке: товары с критически низким остатком.</CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
