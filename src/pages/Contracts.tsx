import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import {
  useContracts,
  useCreateContract,
  useUpdateContract,
  useDeleteContract,
  ContractInsert,
} from "@/hooks/useContracts";
import { useClients } from "@/hooks/useClients";
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
import { Badge } from "@/components/ui/badge";
import { Plus, Search, FileText, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { getContractOwnerMap, getOwnedContractIds, setContractOwner } from "@/lib/contractOwnership";

export default function Contracts() {
  const { data: contracts = [], isLoading } = useContracts();
  const { data: clients = [] } = useClients();
  const { user } = useAuth();
  const createContract = useCreateContract();
  const updateContract = useUpdateContract();
  const deleteContract = useDeleteContract();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState<ContractInsert>({
    customer_id: 0,
  });
  const [ownerMap, setOwnerMap] = useState(() => getContractOwnerMap());

  const customersById = new Map(clients.map((client) => [client.id, client]));

  const ownedContractIds = new Set(getOwnedContractIds(ownerMap, user?.id ?? ""));

  const filteredContracts = contracts.filter((contract) => {
    if (!ownedContractIds.has(contract.id)) return false;
    const customerName = customersById.get(contract.customer_id)?.name ?? "";
    return (
      contract.contract_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customerName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const createdContract = await createContract.mutateAsync({
      ...formData,
      customer_id: Number(formData.customer_id),
    });
    if (user) {
      setOwnerMap(setContractOwner(createdContract.id, user.id));
    }
    setIsDialogOpen(false);
    setFormData({
      customer_id: 0,
    });
  };
  const handleStatusChange = async (id: number, status: "Draft" | "Confirmed" | "Sent") => {
    await updateContract.mutateAsync({ id, status });
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this contract? This will remove all contract items.")) return;
    await deleteContract.mutateAsync(id);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground font-display">Contracts</h1>
            <p className="text-muted-foreground mt-1">Manage agreements with your customers</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full gap-2 sm:w-auto">
                <Plus className="h-4 w-4" />
                New Contract
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="font-display text-xl">Create New Contract</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div className="space-y-2">
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
                <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-end">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createContract.isPending || !formData.customer_id}
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
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading contracts...</div>
          ) : filteredContracts.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {searchQuery ? "No contracts found matching your search" : "No contracts yet. Create your first contract!"}
            </div>
          ) : (
            <Table className="min-w-[980px]">
              <TableHeader>
                <TableRow className="table-header">
                  <TableHead>Contract</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
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
                          <p className="font-medium text-foreground">{contract.contract_number}</p>
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
                      {contract.contract_date ? format(new Date(contract.contract_date), "MMM dd, yyyy") : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            contract.status === "Confirmed"
                              ? "default"
                              : contract.status === "Sent"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {contract.status}
                        </Badge>
                        <Select
                          value={contract.status}
                          onValueChange={(value) =>
                            handleStatusChange(contract.id, value as "Draft" | "Confirmed" | "Sent")
                          }
                        >
                          <SelectTrigger className="h-8 w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Draft">Draft</SelectItem>
                            <SelectItem value="Confirmed">Confirmed</SelectItem>
                            <SelectItem value="Sent">Sent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {contract.items.length}
                    </TableCell>
                    <TableCell className="font-semibold text-foreground">
                      $
                      {contract.items
                        .reduce((sum, item) => sum + (item.total_amount ?? item.price * item.quantity), 0)
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
