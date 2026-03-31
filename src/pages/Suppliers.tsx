import { useMemo, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Trash2 } from "lucide-react";
import { DEMO_EMPLOYEES } from "@/lib/employees";
import { KZ_CITIES } from "@/lib/referenceData";
import { SupplierInsert, useCreateSupplier, useDeleteSupplier, useSuppliers } from "@/hooks/useSuppliers";

const EMPTY_SUPPLIER: SupplierInsert = {
  name: "",
  legal_form: null,
  bin_iin: null,
  city: null,
  legal_address: null,
  contact_person: null,
  phone: null,
  email: null,
  payment_terms: null,
  notes: null,
  created_by_user: null,
};

export default function Suppliers() {
  const { data: suppliers = [], isLoading } = useSuppliers();
  const createSupplier = useCreateSupplier();
  const deleteSupplier = useDeleteSupplier();
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<SupplierInsert>(EMPTY_SUPPLIER);
  const [binError, setBinError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const managers = useMemo(() => DEMO_EMPLOYEES.filter((employee) => employee.role === "manager"), []);

  const filtered = useMemo(
    () => suppliers.filter((item) => [item.name, item.bin_iin, item.city, item.contact_person].filter(Boolean).some((v) => v?.toLowerCase().includes(search.toLowerCase()))),
    [suppliers, search],
  );

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (formData.bin_iin && formData.bin_iin.length !== 12) {
      setBinError("BIN/ИИН должен содержать 12 цифр");
      return;
    }
    if (formData.email && !/^\S+@\S+\.\S+$/.test(formData.email)) {
      setEmailError("Некорректный email");
      return;
    }
    await createSupplier.mutateAsync(formData);
    setFormData(EMPTY_SUPPLIER);
    setBinError(null);
    setEmailError(null);
    setIsOpen(false);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-display">Поставщики</h1>
            <p className="text-muted-foreground mt-1">Карточки поставщиков и реквизиты закупа</p>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" />Добавить поставщика</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Добавить поставщика</DialogTitle></DialogHeader>
              <form onSubmit={onSubmit} className="space-y-3">
                <div className="space-y-2">
                  <Label>Наименование *</Label>
                  <Input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>БИН/ИИН</Label>
                    <Input value={formData.bin_iin ?? ""} maxLength={12} onChange={(e) => { setBinError(null); setFormData({ ...formData, bin_iin: e.target.value.replace(/\D/g, "") || null }); }} />
                    {binError && <p className="text-xs text-destructive">{binError}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Город</Label>
                    <Select value={formData.city ?? ""} onValueChange={(value) => setFormData({ ...formData, city: value })}>
                      <SelectTrigger><SelectValue placeholder="Выберите город" /></SelectTrigger>
                      <SelectContent>{KZ_CITIES.map((city) => <SelectItem key={city} value={city}>{city}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={formData.email ?? ""} onChange={(e) => { setEmailError(null); setFormData({ ...formData, email: e.target.value || null }); }} />
                  {emailError && <p className="text-xs text-destructive">{emailError}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Контактное лицо</Label>
                  <Input value={formData.contact_person ?? ""} onChange={(e) => setFormData({ ...formData, contact_person: e.target.value || null })} />
                </div>
                <div className="space-y-2">
                  <Label>Телефон</Label>
                  <Input value={formData.phone ?? ""} onChange={(e) => setFormData({ ...formData, phone: e.target.value || null })} />
                </div>
                <div className="space-y-2">
                  <Label>Кто создал</Label>
                  <Select value={formData.created_by_user ?? ""} onValueChange={(value) => setFormData({ ...formData, created_by_user: value })}>
                    <SelectTrigger><SelectValue placeholder="Менеджер" /></SelectTrigger>
                    <SelectContent>{managers.map((item) => <SelectItem key={item.id} value={item.name}>{item.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Button className="w-full" type="submit" disabled={createSupplier.isPending}>{createSupplier.isPending ? "Сохраняем..." : "Создать"}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-10" placeholder="Поиск по name/bin_iin/city/contact_person" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="rounded-xl border bg-card">
          {isLoading ? <div className="p-6 text-muted-foreground">Загрузка...</div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Наименование</TableHead><TableHead>БИН/ИИН</TableHead><TableHead>Город</TableHead><TableHead>Контакт</TableHead><TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell>{supplier.name}</TableCell>
                    <TableCell>{supplier.bin_iin ?? "—"}</TableCell>
                    <TableCell>{supplier.city ?? "—"}</TableCell>
                    <TableCell>{supplier.contact_person ?? "—"}</TableCell>
                    <TableCell><Button variant="ghost" size="icon" onClick={() => deleteSupplier.mutate(supplier.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
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
