import { MainLayout } from "@/components/layout/MainLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { Users, FileText, Package, Boxes } from "lucide-react";
import { useClients } from "@/hooks/useClients";
import { useContracts } from "@/hooks/useContracts";
import { useProducts } from "@/hooks/useProducts";
import { useInventory } from "@/hooks/useInventory";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const { data: clients = [] } = useClients();
  const { data: contracts = [] } = useContracts();
  const { data: products = [] } = useProducts();
  const { data: inventory = [] } = useInventory();

  const totalInventory = inventory.reduce((sum, item) => sum + item.quantity_available, 0);

  const recentActivities = [
    ...contracts
      .filter((contract) => contract.contract_date)
      .slice(0, 4)
      .map((contract) => ({
        id: String(contract.id),
        type: "contract" as const,
        description: `Contract ${contract.contract_number} updated`,
        timestamp: new Date(contract.contract_date ?? new Date().toISOString()),
      })),
    ...clients.slice(0, 2).map((client) => ({
      id: String(client.id),
      type: "client" as const,
      description: `New customer added: ${client.name}`,
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
          <h1 className="text-3xl font-bold text-foreground font-display">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back! Here's your farm business overview.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total Customers"
            value={clients.length}
            subtitle="Registered partners"
            icon={Users}
          />
          <StatsCard
            title="Contracts"
            value={contracts.length}
            subtitle="Signed agreements"
            icon={FileText}
          />
          <StatsCard
            title="Products"
            value={products.length}
            subtitle="Available catalog"
            icon={Package}
          />
          <StatsCard
            title="Inventory"
            value={totalInventory.toLocaleString()}
            subtitle="Units available"
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
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Inventory Snapshot</h3>
                <Link to="/contracts" className="text-sm text-primary hover:underline">
                  View contracts
                </Link>
              </div>
              
              {products.length === 0 ? (
                <p className="text-muted-foreground text-sm">No products added yet</p>
              ) : (
                <div className="space-y-3">
                  {products.slice(0, 5).map((product) => {
                    const stock = inventoryByProductId.get(product.id);
                    return (
                      <div key={product.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div>
                          <p className="font-medium text-foreground">{product.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {product.unit} • ${product.price.toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-foreground">
                            {stock?.quantity_available ?? 0} available
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {stock?.quantity_reserved ?? 0} reserved
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
            <p className="font-medium text-foreground">Add Customer</p>
            <p className="text-sm text-muted-foreground">Register a new partner</p>
          </Link>
          <Link
            to="/contracts"
            className="p-4 bg-card rounded-xl border border-border hover:border-primary/50 transition-all duration-200 group"
          >
            <FileText className="h-8 w-8 text-primary mb-2 group-hover:scale-110 transition-transform" />
            <p className="font-medium text-foreground">New Contract</p>
            <p className="text-sm text-muted-foreground">Create agreement</p>
          </Link>
        </div>
      </div>
    </MainLayout>
  );
}
