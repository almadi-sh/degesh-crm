import { useMemo, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useClients, useCreateClient, useDeleteClient, ClientInsert } from "@/hooks/useClients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, MapPin, Trash2, BadgeCheck } from "lucide-react";
import { DEMO_EMPLOYEES } from "@/lib/employees";
import { KZ_CITIES } from "@/lib/referenceData";

const EMPTY_CLIENT: ClientInsert = {
  name: "",
  legal_form: null,
  contract_signer_full_name: null,
  contract_signer_role: null,
  contract_signer_basis: null,
  bin_iin: null,
  city: null,
  legal_address: null,
  address: null,
  tax_regime: null,
  created_by_user: null,
  initial_contact_user: null,
};

export default function Clients() {
  const { data: clients = [], isLoading } = useClients();
  const createClient = useCreateClient();
  const deleteClient = useDeleteClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState<ClientInsert>(EMPTY_CLIENT);

  const managers = useMemo(() => DEMO_EMPLOYEES.filter((employee) => employee.role === "manager"), []);
  const sales = useMemo(() => DEMO_EMPLOYEES.filter((employee) => employee.role === "sales"), []);

  const filteredClients = clients.filter((client) =>
    [client.name, client.bin_iin, client.legal_address, client.city, client.created_by_user, client.initial_contact_user]
      .filter(Boolean)
      .some((value) => value?.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createClient.mutateAsync(formData);
    setIsDialogOpen(false);
    setFormData(EMPTY_CLIENT);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this client?")) {
      await deleteClient.mutateAsync(id);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground font-display">Customers</h1>
            <p className="text-muted-foreground mt-1">Расширенные реквизиты клиента для договора и подписей</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full gap-2 sm:w-auto">
                <Plus className="h-4 w-4" />
                Add Customer
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle className="font-display text-xl">Add New Customer</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="mt-4 space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Наименование клиента *</Label>
                    <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Форма лица</Label>
                    <Select value={formData.legal_form ?? ""} onValueChange={(value) => setFormData({ ...formData, legal_form: value })}>
                      <SelectTrigger><SelectValue placeholder="КХ / ТОО / ИП / ФХ" /></SelectTrigger>
                      <SelectContent>{["КХ", "ТОО", "ИП", "ФХ"].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Лицо на кого оформляется договор (ФИО)</Label>
                    <Input value={formData.contract_signer_full_name ?? ""} onChange={(e) => setFormData({ ...formData, contract_signer_full_name: e.target.value || null })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Роль подписанта</Label>
                    <Select value={formData.contract_signer_role ?? ""} onValueChange={(value) => setFormData({ ...formData, contract_signer_role: value })}>
                      <SelectTrigger><SelectValue placeholder="Директор / По доверенности" /></SelectTrigger>
                      <SelectContent>{["Директор", "По доверенности"].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Основание</Label>
                    <Input value={formData.contract_signer_basis ?? ""} onChange={(e) => setFormData({ ...formData, contract_signer_basis: e.target.value || null })} placeholder="Устав / доверенность / талон" />
                  </div>
                  <div className="space-y-2">
                    <Label>БИН/ИИН (12 цифр)</Label>
                    <Input value={formData.bin_iin ?? ""} maxLength={12} onChange={(e) => setFormData({ ...formData, bin_iin: e.target.value.replace(/\D/g, "") || null })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Налоговый режим</Label>
                    <Select value={formData.tax_regime ?? ""} onValueChange={(value) => setFormData({ ...formData, tax_regime: value })}>
                      <SelectTrigger><SelectValue placeholder="Общеустановленный / Упрощенный" /></SelectTrigger>
                      <SelectContent>{["Общеустановленный", "Упрощенный"].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Город</Label>
                    <Select value={formData.city ?? ""} onValueChange={(value) => setFormData({ ...formData, city: value })}>
                      <SelectTrigger><SelectValue placeholder="Выберите город" /></SelectTrigger>
                      <SelectContent>{KZ_CITIES.map((city) => <SelectItem key={city} value={city}>{city}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Юр. адрес</Label>
                    <Input value={formData.legal_address ?? ""} onChange={(e) => setFormData({ ...formData, legal_address: e.target.value || null, address: e.target.value || null })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Кто создал в системе</Label>
                    <Select value={formData.created_by_user ?? ""} onValueChange={(value) => setFormData({ ...formData, created_by_user: value })}>
                      <SelectTrigger><SelectValue placeholder="Менеджер" /></SelectTrigger>
                      <SelectContent>{managers.map((item) => <SelectItem key={item.id} value={item.name}>{item.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Кто скоммуницировал изначально</Label>
                    <Select value={formData.initial_contact_user ?? ""} onValueChange={(value) => setFormData({ ...formData, initial_contact_user: value })}>
                      <SelectTrigger><SelectValue placeholder="Продажник" /></SelectTrigger>
                      <SelectContent>{sales.map((item) => <SelectItem key={item.id} value={item.name}>{item.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-end">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createClient.isPending}>{createClient.isPending ? "Creating..." : "Create Client"}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search customers..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>

        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          {isLoading ? <div className="p-8 text-center text-muted-foreground">Loading customers...</div> : filteredClients.length === 0 ? <div className="p-8 text-center text-muted-foreground">{searchQuery ? "No customers found matching your search" : "No customers yet. Add your first customer!"}</div> : (
            <Table className="min-w-[840px]">
              <TableHeader>
                <TableRow className="table-header">
                  <TableHead>Customer</TableHead><TableHead>BIN/IIN</TableHead><TableHead>Address</TableHead><TableHead>Ответственные</TableHead><TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client) => (
                  <TableRow key={client.id} className="hover:bg-muted/50">
                    <TableCell>
                      <p className="font-medium text-foreground">{client.name}</p>
                      <p className="text-xs text-muted-foreground">{client.legal_form ?? "—"} • {client.tax_regime ?? "—"}</p>
                    </TableCell>
                    <TableCell>{client.bin_iin ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><BadgeCheck className="h-3.5 w-3.5" />{client.bin_iin}</div> : <span className="text-sm text-muted-foreground">—</span>}</TableCell>
                    <TableCell>{client.legal_address ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{client.city ? `${client.city}, ` : ""}{client.legal_address}</div> : <span className="text-sm text-muted-foreground">—</span>}</TableCell>
                    <TableCell><p className="text-xs text-muted-foreground">Создал: {client.created_by_user ?? "—"}</p><p className="text-xs text-muted-foreground">Продажник: {client.initial_contact_user ?? "—"}</p></TableCell>
                    <TableCell><Button variant="ghost" size="icon" onClick={() => handleDelete(client.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button></TableCell>
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
