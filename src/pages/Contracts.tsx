import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useContracts, useCreateContract, useDeleteContract, ContractInsert } from "@/hooks/useContracts";
import { useClients } from "@/hooks/useClients";
import { useProducts } from "@/hooks/useProducts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, Trash2, FileText } from "lucide-react";
import { format } from "date-fns";

interface ContractItemForm {
  product_id: string;
  quantity: number;
  price: number;
  payment_terms: string;
  delivery_terms: string;
}

export default function Contracts() {
  const { data: contracts = [], isLoading } = useContracts();
  const { data: clients = [] } = useClients();
  const { data: products = [] } = useProducts();
  const createContract = useCreateContract();
  const deleteContract = useDeleteContract();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState<Pick<ContractInsert, "customer_id" | "number" | "date">>({
    customer_id: 0,
    number: "",
    date: new Date().toISOString().split("T")[0],
  });
  const [items, setItems] = useState<ContractItemForm[]>([
    {
      product_id: "",
      quantity: 1,
      price: 0,
      payment_terms: "",
      delivery_terms: "",
    },
  ]);

  const customersById = new Map(clients.map((client) => [client.id, client]));

  const filteredContracts = contracts.filter((contract) => {
    const customerName = customersById.get(contract.customer_id)?.name ?? "";
    return (
      contract.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customerName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const generateContractNumber = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    return `CTR-${year}-${random}`;
  };

  const addItem = () => {
    setItems([
      ...items,
      { product_id: "", quantity: 1, price: 0, payment_terms: "", delivery_terms: "" },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof ContractItemForm, value: string | number) => {
    setItems(items.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createContract.mutateAsync({
      ...formData,
      customer_id: Number(formData.customer_id),
      number: formData.number || generateContractNumber(),
      date: formData.date || null,
      items: items.map((item) => ({
        product_id: Number(item.product_id),
        quantity: item.quantity,
        price: item.price,
        payment_terms: item.payment_terms || null,
        delivery_terms: item.delivery_terms || null,
      })),
    });
    setIsDialogOpen(false);
    setFormData({
      customer_id: 0,
      number: "",
      date: new Date().toISOString().split("T")[0],
    });
    setItems([{ product_id: "", quantity: 1, price: 0, payment_terms: "", delivery_terms: "" }]);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this contract?")) {
      await deleteContract.mutateAsync(id);
    }
  };

  const hasInvalidItems = items.some(item => !item.product_id);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground font-display">Contracts</h1>
            <p className="text-muted-foreground mt-1">Manage agreements with your customers</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New Contract
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="font-display text-xl">Create New Contract</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="customer_id">Customer *</Label>
                    <Select
                      value={formData.customer_id ? String(formData.customer_id) : ""}
                      onValueChange={(value) => setFormData({ ...formData, customer_id: Number(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={String(client.id)}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contract_number">Contract Number</Label>
                    <Input
                      id="contract_number"
                      placeholder="Auto-generated if empty"
                      value={formData.number}
                      onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Contract Date test</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date || ""}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value || null })}
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-foreground">Contract Items</h4>
                    <Button type="button" variant="outline" size="sm" onClick={addItem}>
                      Add item
                    </Button>
                  </div>
                  {products.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Add products in the backend before creating contracts.
                    </p>
                  )}
                  {items.map((item, index) => (
                    <div key={index} className="grid grid-cols-6 gap-3 items-end">
                      <div className="space-y-2 col-span-2">
                        <Label>Product</Label>
                        <Select
                          value={item.product_id}
                          onValueChange={(value) => updateItem(index, "product_id", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((product) => (
                              <SelectItem key={product.id} value={String(product.id)}>
                                {product.name} ({product.unit})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Qty</Label>
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, "quantity", Number(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Price</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.price}
                          onChange={(e) => updateItem(index, "price", Number(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Payment</Label>
                        <Input
                          value={item.payment_terms}
                          onChange={(e) => updateItem(index, "payment_terms", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Delivery</Label>
                        <Input
                          value={item.delivery_terms}
                          onChange={(e) => updateItem(index, "delivery_terms", e.target.value)}
                        />
                      </div>
                      <div className="col-span-6 flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                          disabled={items.length === 1}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createContract.isPending || !formData.customer_id || hasInvalidItems}
                  >
                    {createContract.isPending ? "Creating..." : "Create Contract"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contracts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading contracts...</div>
          ) : filteredContracts.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {searchQuery ? "No contracts found matching your search" : "No contracts yet. Create your first contract!"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="table-header">
                  <TableHead>Contract</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContracts.map((contract) => (
                  <TableRow key={contract.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{contract.number}</p>
                          <p className="text-sm text-muted-foreground">
                            {contract.items.length} item{contract.items.length === 1 ? "" : "s"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-foreground">
                        {customersById.get(contract.customer_id)?.name ?? "Unknown"}
                      </p>
                    </TableCell>
                    <TableCell>
                      {contract.date ? format(new Date(contract.date), "MMM dd, yyyy") : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {contract.items.length}
                    </TableCell>
                    <TableCell className="font-semibold text-foreground">
                      $
                      {contract.items
                        .reduce((sum, item) => sum + (item.total ?? item.price * item.quantity), 0)
                        .toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(contract.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
