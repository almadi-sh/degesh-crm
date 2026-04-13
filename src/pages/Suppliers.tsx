import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { KZ_CITIES } from "@/lib/referenceData";
import { Client, ClientInsert, useClients, useCreateClient, useDeleteClient, useUpdateClient } from "@/hooks/useClients";
import { Supplier, SupplierInsert, useCreateSupplier, useDeleteSupplier, useSuppliers, useUpdateSupplier } from "@/hooks/useSuppliers";
import { formatCreatedAt, getClientCreationMeta, getSupplierCreationMeta, setClientCreationMeta, setSupplierCreationMeta } from "@/lib/counterpartyMeta";

const SUPPLIER_KIND_STORAGE_KEY = "supplierKindMap";
type SupplierKind = "supplier" | "other";
export type CounterpartyPageMode = "buyers" | "suppliers" | "others";

interface SuppliersPageProps {
  mode: CounterpartyPageMode;
}

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

const EMPTY_CLIENT_FORM: ClientInsert = {
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

const PAGE_CONTENT: Record<CounterpartyPageMode, { title: string; description: string; searchPlaceholder: string }> = {
  buyers: {
    title: "Покупатели",
    description: "Список покупателей и переход в карточку.",
    searchPlaceholder: "Поиск по покупателям",
  },
  suppliers: {
    title: "Поставщики",
    description: "Список поставщиков и переход в карточку.",
    searchPlaceholder: "Поиск по поставщикам",
  },
  others: {
    title: "Прочие",
    description: "Список прочих контрагентов и переход в карточку.",
    searchPlaceholder: "Поиск по прочим контрагентам",
  },
};

export default function Suppliers({ mode }: SuppliersPageProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: buyers = [] } = useClients();
  const { data: suppliers = [], isLoading } = useSuppliers();

  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();

  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const deleteSupplier = useDeleteSupplier();

  const [search, setSearch] = useState("");

  const [openBuyerDialog, setOpenBuyerDialog] = useState(false);
  const [buyerForm, setBuyerForm] = useState<ClientInsert>(EMPTY_CLIENT_FORM);
  const [editingBuyer, setEditingBuyer] = useState<Client | null>(null);

  const [openSupplierDialog, setOpenSupplierDialog] = useState(false);
  const [openOtherDialog, setOpenOtherDialog] = useState(false);
  const [supplierForm, setSupplierForm] = useState<SupplierFormState>(EMPTY_SUPPLIER_FORM);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

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

  const createBuyer = async (event: React.FormEvent) => {
    event.preventDefault();
    const creator = user?.name ?? "Неизвестный аккаунт";
    const created = await createClient.mutateAsync({
      ...buyerForm,
      created_by_user: creator,
    });
    setClientCreationMeta(created.id, creator);
    setBuyerForm(EMPTY_CLIENT_FORM);
    setOpenBuyerDialog(false);
  };

  const updateBuyer = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingBuyer) return;
    await updateClient.mutateAsync({
      id: editingBuyer.id,
      ...buyerForm,
      created_by_user: editingBuyer.created_by_user,
    });
    setEditingBuyer(null);
    setBuyerForm(EMPTY_CLIENT_FORM);
    setOpenBuyerDialog(false);
  };

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

    const creator = user?.name ?? "Неизвестный аккаунт";
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
      created_by_user: creator,
    };

    const created = await createSupplier.mutateAsync(payload);
    setSupplierCreationMeta(created.id, creator);
    setSupplierKind(created.id, kind);
    setSupplierForm(EMPTY_SUPPLIER_FORM);
    setOpenSupplierDialog(false);
    setOpenOtherDialog(false);
  };

  const updateExistingSupplier = async () => {
    if (!editingSupplier) return;
    const isInternational = supplierForm.supplier_scope === "international";
    await updateSupplier.mutateAsync({
      id: editingSupplier.id,
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
      created_by_user: editingSupplier.created_by_user,
    });
    setEditingSupplier(null);
    setSupplierForm(EMPTY_SUPPLIER_FORM);
    setOpenSupplierDialog(false);
    setOpenOtherDialog(false);
  };

  const openBuyerEdit = (buyer: Client) => {
    setEditingBuyer(buyer);
    setBuyerForm({
      name: buyer.name,
      legal_form: buyer.legal_form ?? null,
      contract_signer_full_name: buyer.contract_signer_full_name ?? null,
      contract_signer_role: buyer.contract_signer_role ?? null,
      contract_signer_basis: buyer.contract_signer_basis ?? null,
      bin_iin: buyer.bin_iin ?? null,
      city: buyer.city ?? null,
      legal_address: buyer.legal_address ?? null,
      address: buyer.address ?? null,
      tax_regime: buyer.tax_regime ?? null,
      created_by_user: buyer.created_by_user ?? null,
      initial_contact_user: buyer.initial_contact_user ?? null,
    });
    setOpenBuyerDialog(true);
  };

  const openSupplierEdit = (supplier: Supplier, kind: SupplierKind) => {
    setEditingSupplier(supplier);
    const isInternational = supplier.legal_form === "Международный";
    setSupplierForm({
      name: supplier.name,
      supplier_scope: isInternational ? "international" : "domestic",
      bin_iin: supplier.bin_iin ?? "",
      country: isInternational ? supplier.notes?.replace("Страна: ", "") ?? "" : "",
      city: supplier.city ?? "",
      email: supplier.email ?? "",
      contact_person_1: supplier.contact_person?.split(";")[0]?.trim() ?? "",
      contact_person_2: supplier.contact_person?.split(";")[1]?.trim() ?? "",
      phone: supplier.phone ?? "",
    });
    if (kind === "supplier") setOpenSupplierDialog(true);
    else setOpenOtherDialog(true);
  };

  const renderCreated = (createdBy: string | null | undefined, createdAt: string | null) => {
    if (!createdBy && !createdAt) return "—";
    if (!createdAt) return createdBy ?? "—";
    return `${createdBy ?? "—"} • создан ${formatCreatedAt(createdAt)}`;
  };

  const content = PAGE_CONTENT[mode];

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold font-display">{content.title}</h1>
          <p className="mt-1 text-muted-foreground">{content.description}</p>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-10" placeholder={content.searchPlaceholder} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {mode === "buyers" && (
          <>
            <Dialog open={openBuyerDialog} onOpenChange={setOpenBuyerDialog}>
              <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" />{editingBuyer ? "Редактировать покупателя" : "Добавить покупателя"}</Button></DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>{editingBuyer ? "Редактирование покупателя" : "Новый покупатель"}</DialogTitle></DialogHeader>
                <form className="space-y-3" onSubmit={editingBuyer ? updateBuyer : createBuyer}>
                  <div className="space-y-2"><Label>Наименование *</Label><Input required value={buyerForm.name} onChange={(e) => setBuyerForm({ ...buyerForm, name: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>БИН/ИИН</Label><Input maxLength={12} value={buyerForm.bin_iin ?? ""} onChange={(e) => setBuyerForm({ ...buyerForm, bin_iin: e.target.value.replace(/\D/g, "") || null })} /></div>
                    <div className="space-y-2">
                      <Label>Город</Label>
                      <Select value={buyerForm.city ?? ""} onValueChange={(value) => setBuyerForm({ ...buyerForm, city: value })}>
                        <SelectTrigger><SelectValue placeholder="Выберите город" /></SelectTrigger>
                        <SelectContent>{KZ_CITIES.map((city) => <SelectItem key={city} value={city}>{city}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2"><Label>Юр. адрес</Label><Input value={buyerForm.legal_address ?? ""} onChange={(e) => setBuyerForm({ ...buyerForm, legal_address: e.target.value || null, address: e.target.value || null })} /></div>
                  <Button type="submit" className="w-full">{editingBuyer ? "Сохранить" : "Создать"}</Button>
                </form>
              </DialogContent>
            </Dialog>

            <div className="rounded-xl border bg-card">
              <Table>
                <TableHeader><TableRow><TableHead>Наименование</TableHead><TableHead>БИН/ИИН</TableHead><TableHead>Город</TableHead><TableHead>Создал</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {filteredBuyers.map((buyer) => {
                    const meta = getClientCreationMeta(buyer.id);
                    return (
                      <TableRow key={buyer.id} className="cursor-pointer" onClick={() => navigate(`/client-cards?clientId=${buyer.id}`)}>
                        <TableCell>{buyer.name}</TableCell>
                        <TableCell>{buyer.bin_iin ?? "—"}</TableCell>
                        <TableCell>{buyer.city ?? "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{renderCreated(buyer.created_by_user, meta?.createdAt ?? null)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button type="button" variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openBuyerEdit(buyer); }}><Pencil className="h-4 w-4" /></Button>
                            <Button type="button" variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); deleteClient.mutate(buyer.id); }}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        {mode === "suppliers" && (
          <>
            <Dialog open={openSupplierDialog} onOpenChange={setOpenSupplierDialog}>
              <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" />{editingSupplier ? "Редактировать поставщика" : "Добавить поставщика"}</Button></DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>{editingSupplier ? "Редактирование поставщика" : "Поставщик СЗР / Удобрения / Семена"}</DialogTitle></DialogHeader>
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
                  <div className="space-y-2"><Label>Email</Label><Input value={supplierForm.email} onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Телефон</Label><Input value={supplierForm.phone} onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })} /></div>
                </div>
                <Button className="mt-4 w-full" onClick={editingSupplier ? updateExistingSupplier : () => createNewSupplier("supplier")}>{editingSupplier ? "Сохранить" : "Создать поставщика"}</Button>
              </DialogContent>
            </Dialog>

            <div className="rounded-xl border bg-card">
              {isLoading ? <div className="p-4 text-muted-foreground">Загрузка...</div> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Наименование</TableHead><TableHead>Тип</TableHead><TableHead>БИН/ИИН</TableHead><TableHead>Контакты</TableHead><TableHead>Создал</TableHead><TableHead></TableHead></TableRow></TableHeader>
                  <TableBody>
                    {filteredSuppliers.map((supplier) => {
                      const meta = getSupplierCreationMeta(supplier.id);
                      return (
                        <TableRow key={supplier.id} className="cursor-pointer" onClick={() => navigate(`/supplier-cards?supplierId=${supplier.id}`)}>
                          <TableCell>{supplier.name}</TableCell>
                          <TableCell>{supplier.legal_form ?? "—"}</TableCell>
                          <TableCell>{supplier.bin_iin ?? "—"}</TableCell>
                          <TableCell>{supplier.contact_person ?? "—"}<br />{supplier.email ?? "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{renderCreated(supplier.created_by_user, meta?.createdAt ?? null)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button type="button" variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openSupplierEdit(supplier, "supplier"); }}><Pencil className="h-4 w-4" /></Button>
                              <Button type="button" variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); deleteSupplier.mutate(supplier.id); }}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </>
        )}

        {mode === "others" && (
          <>
            <Dialog open={openOtherDialog} onOpenChange={setOpenOtherDialog}>
              <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" />{editingSupplier ? "Редактировать контрагента" : "Добавить контрагента"}</Button></DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>Прочие контрагенты</DialogTitle></DialogHeader>
                <div className="space-y-2"><Label>Наименование *</Label><Input value={supplierForm.name} onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })} /></div>
                <div className="space-y-2"><Label>Контакт *</Label><Input value={supplierForm.contact_person_1} onChange={(e) => setSupplierForm({ ...supplierForm, contact_person_1: e.target.value })} /></div>
                <div className="space-y-2"><Label>Город *</Label><Input value={supplierForm.city} onChange={(e) => setSupplierForm({ ...supplierForm, city: e.target.value })} /></div>
                <Button className="mt-2 w-full" onClick={editingSupplier ? updateExistingSupplier : () => createNewSupplier("other")}>{editingSupplier ? "Сохранить" : "Создать контрагента"}</Button>
              </DialogContent>
            </Dialog>

            <div className="rounded-xl border bg-card">
              <Table>
                <TableHeader><TableRow><TableHead>Наименование</TableHead><TableHead>Контакт</TableHead><TableHead>Город</TableHead><TableHead>Создал</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {filteredOthers.map((item) => {
                    const meta = getSupplierCreationMeta(item.id);
                    return (
                      <TableRow key={item.id} className="cursor-pointer" onClick={() => navigate(`/supplier-cards?supplierId=${item.id}&tab=others`)}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>{item.contact_person ?? "—"}</TableCell>
                        <TableCell>{item.city ?? "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{renderCreated(item.created_by_user, meta?.createdAt ?? null)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button type="button" variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openSupplierEdit(item, "other"); }}><Pencil className="h-4 w-4" /></Button>
                            <Button type="button" variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); deleteSupplier.mutate(item.id); }}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
