import { useMemo, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useClients } from "@/hooks/useClients";
import { useContracts } from "@/hooks/useContracts";
import { useProducts } from "@/hooks/useProducts";
import {
  useContractItems,
  useCreateContractItem,
  useDeleteContractItem,
} from "@/hooks/useContractItems";
import { useCreatePaymentTerm } from "@/hooks/usePaymentTerms";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, FileSpreadsheet } from "lucide-react";

interface PaymentRow {
  percent: number;
  due_date: string;
}

interface LineItem {
  product_id: number;
  quantity: number;
  price: number;
}

export default function ContractItems() {
  const { data: clients = [] } = useClients();
  const { data: products = [] } = useProducts();
  const [selectedCustomer, setSelectedCustomer] = useState<number | null>(null);
  const { data: contracts = [] } = useContracts(
    selectedCustomer ? { customer_id: selectedCustomer } : undefined,
  );
  const { data: contractItems = [] } = useContractItems(
    selectedCustomer ? { customer_id: selectedCustomer } : undefined,
  );
  const createContractItem = useCreateContractItem();
  const deleteContractItem = useDeleteContractItem();
  const createPaymentTerm = useCreatePaymentTerm();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    customer_id: 0,
    contract_id: 0,
    delivery_enabled: false,
    delivery_terms: "",
  });
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { product_id: 0, quantity: 1, price: 0 },
  ]);
  const [splitPayment, setSplitPayment] = useState(false);
  const [paymentRows, setPaymentRows] = useState<PaymentRow[]>([]);

  const customersById = useMemo(
    () => new Map(clients.map((client) => [client.id, client])),
    [clients],
  );
  const productsById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );
  const contractsById = useMemo(
    () => new Map(contracts.map((contract) => [contract.id, contract])),
    [contracts],
  );

  const totalAmount = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0,
  );
  const totalPercent = paymentRows.reduce((sum, row) => sum + row.percent, 0);
  const percentTone =
    totalPercent > 100 ? "destructive" : totalPercent === 100 ? "default" : "secondary";

  const handleAddPaymentRow = () => {
    if (paymentRows.length >= 5) return;
    setPaymentRows([...paymentRows, { percent: 0, due_date: "" }]);
  };

  const handleUpdatePaymentRow = (index: number, field: keyof PaymentRow, value: string | number) => {
    setPaymentRows(
      paymentRows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row,
      ),
    );
  };

  const handleDeletePaymentRow = (index: number) => {
    setPaymentRows(paymentRows.filter((_, rowIndex) => rowIndex !== index));
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { product_id: 0, quantity: 1, price: 0 }]);
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: number) => {
    setLineItems(
      lineItems.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter((_, itemIndex) => itemIndex !== index));
  };

  const resetForm = () => {
    setFormData({
      customer_id: 0,
      contract_id: 0,
      delivery_enabled: false,
      delivery_terms: "",
    });
    setLineItems([{ product_id: 0, quantity: 1, price: 0 }]);
    setSplitPayment(false);
    setPaymentRows([]);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    for (const lineItem of lineItems) {
      const createdItem = await createContractItem.mutateAsync({
        contract_id: formData.contract_id,
        product_id: lineItem.product_id,
        quantity: lineItem.quantity,
        price: lineItem.price,
        delivery_enabled: formData.delivery_enabled,
        delivery_terms: formData.delivery_enabled ? formData.delivery_terms : null,
      });

      if (splitPayment) {
        for (const row of paymentRows) {
          await createPaymentTerm.mutateAsync({
            contract_item_id: createdItem.id,
            percent: row.percent,
            due_date: row.due_date,
          });
        }
      }
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const canSave =
    formData.customer_id &&
    formData.contract_id &&
    lineItems.every((item) => item.product_id && item.quantity > 0 && item.price >= 0) &&
    (!splitPayment || (paymentRows.length > 0 && totalPercent <= 100));

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground font-display">Contract Items</h1>
            <p className="text-muted-foreground mt-1">Manage products and payment schedules per contract</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New Contract Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle className="font-display text-xl">Create Contract Item</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Customer *</Label>
                    <Select
                      value={formData.customer_id ? String(formData.customer_id) : ""}
                      onValueChange={(value) => {
                        const nextCustomer = Number(value);
                        setFormData({
                          ...formData,
                          customer_id: nextCustomer,
                          contract_id: 0,
                        });
                        setSelectedCustomer(nextCustomer);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select customer" />
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
                    <Label>Contract *</Label>
                    <Select
                      value={formData.contract_id ? String(formData.contract_id) : ""}
                      onValueChange={(value) =>
                        setFormData({ ...formData, contract_id: Number(value) })
                      }
                      disabled={!formData.customer_id}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select contract" />
                      </SelectTrigger>
                      <SelectContent>
                        {contracts.map((contract) => (
                          <SelectItem key={contract.id} value={String(contract.id)}>
                            {contract.contract_number} • {contract.status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Products *</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                        + Add item
                      </Button>
                    </div>
                    {lineItems.map((item, index) => (
                      <div key={index} className="grid grid-cols-12 gap-3 items-end">
                        <div className="col-span-6 space-y-2">
                          <Label>Product</Label>
                          <Select
                            value={item.product_id ? String(item.product_id) : ""}
                            onValueChange={(value) =>
                              updateLineItem(index, "product_id", Number(value))
                            }
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
                        <div className="col-span-3 space-y-2">
                          <Label>Quantity</Label>
                          <Input
                            type="number"
                            min="1"
                            step="1"
                            value={item.quantity}
                            onChange={(event) =>
                              updateLineItem(index, "quantity", Number(event.target.value))
                            }
                          />
                        </div>
                        <div className="col-span-3 space-y-2">
                          <Label>Price</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.price}
                            onChange={(event) =>
                              updateLineItem(index, "price", Number(event.target.value))
                            }
                          />
                        </div>
                        <div className="col-span-12 flex justify-between text-xs text-muted-foreground">
                          <span>
                            Line total: {(item.quantity * item.price).toFixed(2)}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeLineItem(index)}
                            disabled={lineItems.length === 1}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                    <div className="space-y-2">
                      <Label>Total amount</Label>
                      <Input value={totalAmount.toFixed(2)} readOnly />
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-border p-4 space-y-4 bg-muted/20">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={splitPayment}
                      onCheckedChange={(checked) => setSplitPayment(Boolean(checked))}
                      id="split-payment"
                    />
                    <Label htmlFor="split-payment">Split payment</Label>
                  </div>
                  {splitPayment && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-foreground">Payment Schedule</h4>
                          <p className="text-xs text-muted-foreground">
                            Up to 5 payment stages. Total percent must be 100% or less.
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleAddPaymentRow}
                          disabled={paymentRows.length >= 5}
                        >
                          + Add payment step
                        </Button>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Percent (%)</TableHead>
                            <TableHead>Due date</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead className="w-[60px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paymentRows.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center text-muted-foreground">
                                Add at least one payment step.
                              </TableCell>
                            </TableRow>
                          ) : (
                            paymentRows.map((row, index) => (
                              <TableRow key={index}>
                                <TableCell>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={row.percent}
                                    onChange={(event) =>
                                      handleUpdatePaymentRow(
                                        index,
                                        "percent",
                                        Number(event.target.value),
                                      )
                                    }
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="date"
                                    value={row.due_date}
                                    onChange={(event) =>
                                      handleUpdatePaymentRow(index, "due_date", event.target.value)
                                    }
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    value={(totalAmount * row.percent / 100).toFixed(2)}
                                    readOnly
                                  />
                                </TableCell>
                                <TableCell>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeletePaymentRow(index)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                      <div className="flex items-center justify-between">
                        <Badge variant={percentTone}>
                          Total %: {totalPercent.toFixed(2)}
                        </Badge>
                        {totalPercent > 100 && (
                          <span className="text-xs text-destructive">
                            Total percent exceeds 100%. Adjust to save.
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-lg border border-border p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={formData.delivery_enabled}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, delivery_enabled: Boolean(checked) })
                      }
                      id="delivery-enabled"
                    />
                    <Label htmlFor="delivery-enabled">Has delivery</Label>
                  </div>
                  {formData.delivery_enabled && (
                    <div className="space-y-2">
                      <Label>Delivery terms</Label>
                      <Input
                        value={formData.delivery_terms}
                        onChange={(event) =>
                          setFormData({ ...formData, delivery_terms: event.target.value })
                        }
                        placeholder="Describe delivery terms"
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={!canSave || createContractItem.isPending}>
                    {createContractItem.isPending ? "Saving..." : "Save Contract Item"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex gap-4">
          <div className="w-80 space-y-2">
            <Label>Filter by customer</Label>
            <Select
              value={selectedCustomer ? String(selectedCustomer) : "all"}
              onValueChange={(value) =>
                setSelectedCustomer(value === "all" ? null : Number(value))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All customers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All customers</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={String(client.id)}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {contractItems.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No contract items yet. Create the first one!
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="table-header">
                  <TableHead>Contract</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Delivery</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contractItems.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FileSpreadsheet className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {contractsById.get(item.contract_id)?.contract_number ?? "—"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {customersById.get(contractsById.get(item.contract_id)?.customer_id ?? 0)?.name ??
                              "Unknown"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {productsById.get(item.product_id)?.name ?? "Unknown"}
                    </TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell className="font-semibold text-foreground">
                      ${item.total_amount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {item.delivery_enabled ? (
                        <Badge variant="secondary">Enabled</Badge>
                      ) : (
                        <Badge variant="outline">No delivery</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteContractItem.mutateAsync(item.id)}
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
