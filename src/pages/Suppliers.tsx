import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { KZ_CITIES } from "@/lib/referenceData";
import { useClients } from "@/hooks/useClients";
import { SupplierInsert, useCreateSupplier, useDeleteSupplier, useSuppliers } from "@/hooks/useSuppliers";

const SUPPLIER_KIND_STORAGE_KEY = "supplierKindMap";
type SupplierKind = "supplier" | "other";

interface SupplierFormState {
  name: string;
  supplier_scope: "international" | "domestic";
  bin_iin: string;
  country: string;
  city: string;
  email: string;
  contact_person_1: string;
  contact_person_2: string;
  phone: string;
}

const EMPTY_SUPPLIER_FORM: SupplierFormState = {
  name: "",
  supplier_scope: "international",
  bin_iin: "",
  country: "",
  city: "",
  email: "",
  contact_person_1: "",
  contact_person_2: "",
  phone: "",
};

const getSupplierKindMap = (): Record<string, SupplierKind> => {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(SUPPLIER_KIND_STORAGE_KEY) ?? "{}") as Record<string, SupplierKind>;
  } catch {
    return {};
  }
};

const setSupplierKind = (id: number, kind: SupplierKind) => {
  if (typeof window === "undefined") return;
  const map = getSupplierKindMap();
  map[String(id)] = kind;
  window.localStorage.setItem(SUPPLIER_KIND_STORAGE_KEY, JSON.stringify(map));
};

export default function Suppliers() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") === "others" ? "others" : "buyers";
  const { data: buyers = [] } = useClients();
  const { data: suppliers = [], isLoading } = useSuppliers();
  const createSupplier = useCreateSupplier();
  const deleteSupplier = useDeleteSupplier();

  const [search, setSearch] = useState("");
  const [openBuyerDialog, setOpenBuyerDialog] = useState(false);
  const [openSupplierDialog, setOpenSupplierDialog] = useState(false);
  const [openOtherDialog, setOpenOtherDialog] = useState(false);
  const [supplierForm, setSupplierForm] = useState<SupplierFormState>(EMPTY_SUPPLIER_FORM);

  const supplierKinds = getSupplierKindMap();

  const filteredBuyers = useMemo(
    () => buyers.filter((item) => [item.name, item.bin_iin, item.city].filter(Boolean).some((v) => v?.toLowerCase().includes(search.toLowerCase()))),
    [buyers, search],
  );

  const supplierOnly = useMemo(
    () => suppliers.filter((item) => (supplierKinds[String(item.id)] ?? "supplier") === "supplier"),
    [suppliers, supplierKinds],
  );

  const otherOnly = useMemo(
    () => suppliers.filter((item) => supplierKinds[String(item.id)] === "other"),
    [suppliers, supplierKinds],
  );

  const filteredSuppliers = useMemo(
    () => supplierOnly.filter((item) => [item.name, item.bin_iin, item.city, item.contact_person].filter(Boolean).some((v) => v?.toLowerCase().includes(search.toLowerCase()))),
    [supplierOnly, search],
  );

  const filteredOthers = useMemo(
    () => otherOnly.filter((item) => [item.name, item.city, item.contact_person, item.notes].filter(Boolean).some((v) => v?.toLowerCase().includes(search.toLowerCase()))),
    [otherOnly, search],
  );

  const createNewSupplier = async (kind: SupplierKind) => {
    const isInternational = supplierForm.supplier_scope === "international";

    if (!supplierForm.name.trim()) return;
    if (!supplierForm.contact_person_1.trim()) return;
    if (!supplierForm.city.trim()) return;
    if (!isInternational && supplierForm.bin_iin.length !== 12) {
      alert("Для внутреннего поставщика БИН/ИИН обязателен и должен содержать 12 цифр");
      return;
    }
    if (isInternational && !supplierForm.email.trim()) {
      alert("Для международного поставщика email обязателен");
      return;
    }

    const payload: SupplierInsert = {
      name: supplierForm.name,
      legal_form: isInternational ? "Международный" : "Внутренний",
      bin_iin: isInternational ? null : supplierForm.bin_iin,
      city: supplierForm.city,
      legal_address: isInternational ? `${supplierForm.country}, ${supplierForm.city}` : supplierForm.city,
      email: supplierForm.email || null,
      contact_person: supplierForm.contact_person_2
        ? `${supplierForm.contact_person_1}; ${supplierForm.contact_person_2}`
        : supplierForm.contact_person_1,
      phone: supplierForm.phone || null,
      notes: isInternational ? `Страна: ${supplierForm.country}` : "",
      created_by_user: user?.name ?? null,
    };

    const created = await createSupplier.mutateAsync(payload);
    setSupplierKind(created.id, kind);
    setSupplierForm(EMPTY_SUPPLIER_FORM);
    setOpenSupplierDialog(false);
    setOpenOtherDialog(false);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold font-display">Контрагент</h1>
          <p className="mt-1 text-muted-foreground">Единый реестр: Покупатели, Поставщики и Прочие.</p>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-10" placeholder="Поиск по контрагентам" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <Tabs defaultValue={defaultTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="buyers">Покупатель</TabsTrigger>
            <TabsTrigger value="suppliers">Поставщик</TabsTrigger>
            <TabsTrigger value="others">Прочие</TabsTrigger>
          </TabsList>

          <TabsContent value="buyers" className="space-y-4">
            <Dialog open={openBuyerDialog} onOpenChange={setOpenBuyerDialog}>
              <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" />Добавить покупателя</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Покупатели создаются во вкладке «Покупатели»</DialogTitle></DialogHeader>
                <Button asChild><a href="/clients">Открыть вкладку Покупатели</a></Button>
              </DialogContent>
            </Dialog>
            <div className="rounded-xl border bg-card">
              <Table>
                <TableHeader><TableRow><TableHead>Наименование</TableHead><TableHead>БИН/ИИН</TableHead><TableHead>Город</TableHead></TableRow></TableHeader>
                <TableBody>
                  {filteredBuyers.map((buyer) => (
                    <TableRow key={buyer.id}><TableCell>{buyer.name}</TableCell><TableCell>{buyer.bin_iin ?? "—"}</TableCell><TableCell>{buyer.city ?? "—"}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="suppliers" className="space-y-4">
            <Dialog open={openSupplierDialog} onOpenChange={setOpenSupplierDialog}>
              <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" />Добавить поставщика</Button></DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>Поставщик СЗР / Удобрения / Семена</DialogTitle></DialogHeader>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2"><Label>Наименование *</Label><Input value={supplierForm.name} onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })} /></div>
                  <div className="space-y-2">
                    <Label>Международный/Внутренний *</Label>
                    <Select value={supplierForm.supplier_scope} onValueChange={(value) => setSupplierForm({ ...supplierForm, supplier_scope: value as "international" | "domestic" })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="international">Международный</SelectItem>
                        <SelectItem value="domestic">Внутренний</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {supplierForm.supplier_scope === "domestic" && (
                    <div className="space-y-2"><Label>БИН/ИИН *</Label><Input value={supplierForm.bin_iin} maxLength={12} onChange={(e) => setSupplierForm({ ...supplierForm, bin_iin: e.target.value.replace(/\D/g, "") })} /></div>
                  )}
                  {supplierForm.supplier_scope === "international" && (
                    <div className="space-y-2"><Label>Страна *</Label><Input value={supplierForm.country} onChange={(e) => setSupplierForm({ ...supplierForm, country: e.target.value })} /></div>
                  )}
                  <div className="space-y-2">
                    <Label>Город *</Label>
                    <Select value={supplierForm.city} onValueChange={(value) => setSupplierForm({ ...supplierForm, city: value })}>
                      <SelectTrigger><SelectValue placeholder="Выберите город" /></SelectTrigger>
                      <SelectContent>{KZ_CITIES.map((city) => <SelectItem key={city} value={city}>{city}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Контактное лицо 1 *</Label><Input value={supplierForm.contact_person_1} onChange={(e) => setSupplierForm({ ...supplierForm, contact_person_1: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Контактное лицо 2</Label><Input value={supplierForm.contact_person_2} onChange={(e) => setSupplierForm({ ...supplierForm, contact_person_2: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Email {supplierForm.supplier_scope === "international" ? "*" : "(опционально)"}</Label><Input value={supplierForm.email} onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Телефон (опционально)</Label><Input value={supplierForm.phone} onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })} /></div>
                </div>
                <Button className="mt-4 w-full" onClick={() => createNewSupplier("supplier")}>Создать поставщика</Button>
              </DialogContent>
            </Dialog>

            <div className="rounded-xl border bg-card">
              {isLoading ? <div className="p-4 text-muted-foreground">Загрузка...</div> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Наименование</TableHead><TableHead>Тип</TableHead><TableHead>БИН/ИИН</TableHead><TableHead>Контакты</TableHead><TableHead>Создал</TableHead><TableHead></TableHead></TableRow></TableHeader>
                  <TableBody>
                    {filteredSuppliers.map((supplier) => (
                      <TableRow key={supplier.id}>
                        <TableCell>{supplier.name}</TableCell>
                        <TableCell>{supplier.legal_form ?? "—"}</TableCell>
                        <TableCell>{supplier.bin_iin ?? "—"}</TableCell>
                        <TableCell>{supplier.contact_person ?? "—"}<br />{supplier.email ?? "—"}</TableCell>
                        <TableCell>{supplier.created_by_user ?? "—"}</TableCell>
                        <TableCell><Button variant="ghost" size="icon" onClick={() => deleteSupplier.mutate(supplier.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>

          <TabsContent value="others" className="space-y-4">
            <Dialog open={openOtherDialog} onOpenChange={setOpenOtherDialog}>
              <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" />Добавить прочее</Button></DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>Прочие контрагенты и услуги</DialogTitle></DialogHeader>
                <div className="space-y-2"><Label>Наименование *</Label><Input value={supplierForm.name} onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })} /></div>
                <div className="space-y-2"><Label>Контакт *</Label><Input value={supplierForm.contact_person_1} onChange={(e) => setSupplierForm({ ...supplierForm, contact_person_1: e.target.value })} /></div>
                <div className="space-y-2"><Label>Город *</Label><Input value={supplierForm.city} onChange={(e) => setSupplierForm({ ...supplierForm, city: e.target.value })} /></div>
                <Button className="mt-2 w-full" onClick={() => createNewSupplier("other")}>Создать «Прочее»</Button>
              </DialogContent>
            </Dialog>

            <div className="rounded-xl border bg-card">
              <Table>
                <TableHeader><TableRow><TableHead>Наименование</TableHead><TableHead>Контакт</TableHead><TableHead>Город</TableHead><TableHead>Комментарий</TableHead></TableRow></TableHeader>
                <TableBody>
                  {filteredOthers.map((item) => (
                    <TableRow key={item.id}><TableCell>{item.name}</TableCell><TableCell>{item.contact_person ?? "—"}</TableCell><TableCell>{item.city ?? "—"}</TableCell><TableCell>{item.notes ?? "—"}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
