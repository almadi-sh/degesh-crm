import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import {
  useContracts,
  useCreateContract,
  useUpdateContract,
  useDeleteContract,
  useResetContractDocument,
  useUpdateContractDocument,
  ContractDocument,
  ContractInsert,
} from "@/hooks/useContracts";
import { useClients } from "@/hooks/useClients";
import { useProducts } from "@/hooks/useProducts";
import { useContractItems } from "@/hooks/useContractItems";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, FileText, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { getContractOwnerMap, getOwnedContractIds, setContractOwner } from "@/lib/contractOwnership";
import { ContractDocumentEditor } from "@/components/contracts/ContractDocumentEditor";
import { toast } from "sonner";
import { apiFetchResponse } from "@/lib/apiClient";

export default function Contracts() {
  const { data: contracts = [], isLoading } = useContracts();
  const { data: clients = [] } = useClients();
  const { data: products = [] } = useProducts();
  const { data: contractItems = [] } = useContractItems();
  const { user } = useAuth();
  const createContract = useCreateContract();
  const updateContract = useUpdateContract();
  const deleteContract = useDeleteContract();
  const updateContractDocument = useUpdateContractDocument();
  const resetContractDocument = useResetContractDocument();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState<ContractInsert>({ customer_id: 0 });
  const [ownerMap, setOwnerMap] = useState(() => getContractOwnerMap());

  const [isContractDialogOpen, setIsContractDialogOpen] = useState(false);
  const [activeContractId, setActiveContractId] = useState<number | null>(null);
  const [draftContractDocument, setDraftContractDocument] = useState<ContractDocument | null>(null);
  const [isContractDocumentDirty, setIsContractDocumentDirty] = useState(false);
  const [contractPreviewPdfUrl, setContractPreviewPdfUrl] = useState<string | null>(null);
  const [isContractPreviewLoading, setIsContractPreviewLoading] = useState(false);
  const previewBlobUrlRef = useRef<string | null>(null);

  const customersById = useMemo(() => new Map(clients.map((client) => [client.id, client])), [clients]);
  const productsById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);

  const ownedContractIds = new Set(getOwnedContractIds(ownerMap, user?.id ?? ""));
  const filteredContracts = contracts.filter((contract) => {
    if (!ownedContractIds.has(contract.id)) return false;
    const customerName = customersById.get(contract.customer_id)?.name ?? "";
    return contract.contract_number.toLowerCase().includes(searchQuery.toLowerCase()) || customerName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const activeContract = useMemo(
    () => (activeContractId ? contracts.find((contract) => contract.id === activeContractId) : undefined),
    [activeContractId, contracts],
  );
  const activeCustomer = activeContract ? customersById.get(activeContract.customer_id) : undefined;
  const activeItems = useMemo(
    () => (activeContractId ? contractItems.filter((item) => item.contract_id === activeContractId) : []),
    [activeContractId, contractItems],
  );

  const handleDocumentChange = useCallback((document: ContractDocument, isDirty: boolean) => {
    setDraftContractDocument(document);
    setIsContractDocumentDirty(isDirty);
  }, []);

  const closeContractDialog = () => {
    if (previewBlobUrlRef.current) {
      window.URL.revokeObjectURL(previewBlobUrlRef.current);
      previewBlobUrlRef.current = null;
    }
    setContractPreviewPdfUrl(null);
    setIsContractDialogOpen(false);
    setActiveContractId(null);
    setDraftContractDocument(null);
    setIsContractDocumentDirty(false);
  };

  const openContractDialog = (contractId: number) => {
    setActiveContractId(contractId);
    setIsContractDialogOpen(true);
  };

  const refreshContractPreview = useCallback(async () => {
    if (!activeContract || activeContract.status !== "Confirmed") {
      setContractPreviewPdfUrl(null);
      return;
    }

    setIsContractPreviewLoading(true);
    try {
      const body = draftContractDocument ? JSON.stringify({ contract_document: draftContractDocument }) : undefined;
      const response = await apiFetchResponse(`/api/v1/contracts/${activeContract.id}/document/preview-pdf?ts=${Date.now()}`, {
        method: "POST",
        cache: "no-store",
        body,
      });
      const blob = await response.blob();
      const nextUrl = window.URL.createObjectURL(blob);
      if (previewBlobUrlRef.current) {
        window.URL.revokeObjectURL(previewBlobUrlRef.current);
      }
      previewBlobUrlRef.current = nextUrl;
      setContractPreviewPdfUrl(nextUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load PDF preview";
      toast.error(message);
    } finally {
      setIsContractPreviewLoading(false);
    }
  }, [activeContract, draftContractDocument]);

  useEffect(() => {
    if (!isContractDialogOpen) return;
    const timeoutId = window.setTimeout(() => {
      void refreshContractPreview();
    }, 500);
    return () => window.clearTimeout(timeoutId);
  }, [isContractDialogOpen, refreshContractPreview]);

  useEffect(() => {
    return () => {
      if (previewBlobUrlRef.current) {
        window.URL.revokeObjectURL(previewBlobUrlRef.current);
      }
    };
  }, []);

  const handleDownloadContract = async () => {
    if (!activeContract) return;
    try {
      if (isContractDocumentDirty && draftContractDocument) {
        await updateContractDocument.mutateAsync({
          id: activeContract.id,
          contract_document: draftContractDocument,
        });
        setIsContractDocumentDirty(false);
      }

      const response = await apiFetchResponse(`/api/v1/contracts/${activeContract.id}/document/export?ts=${Date.now()}`, { cache: "no-store" });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const filenameMatch = disposition.match(/filename=([^;]+)/i);
      const fallbackFilename = `contract-${activeContract.contract_number}.docx`;
      const filename = filenameMatch?.[1]?.trim().replace(/^"|"$/g, "") || fallbackFilename;
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Contract downloaded");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to download contract";
      toast.error(message);
    }
  };

  const handleResetContractDocument = async () => {
    if (!activeContract) return;
    if (!window.confirm("Reset contract text to default template?")) return;

    await resetContractDocument.mutateAsync({ id: activeContract.id });
    setDraftContractDocument(null);
    setIsContractDocumentDirty(false);
  };

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
    setFormData({ customer_id: 0 });
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
                  <Select value={formData.customer_id ? String(formData.customer_id) : ""} onValueChange={(value) => setFormData({ ...formData, customer_id: Number(value) })}>
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
                  <Button type="submit" disabled={createContract.isPending || !formData.customer_id}>
                    {createContract.isPending ? "Creating..." : "Create Contract"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search contracts..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>

        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading contracts...</div>
          ) : filteredContracts.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">{searchQuery ? "No contracts found matching your search" : "No contracts yet. Create your first contract!"}</div>
          ) : (
            <Table className="min-w-[1080px]">
              <TableHeader>
                <TableRow className="table-header">
                  <TableHead>Contract</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead className="w-[120px]"></TableHead>
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
                          <p className="text-sm text-muted-foreground">{contract.items.length} item{contract.items.length === 1 ? "" : "s"}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-foreground">{customersById.get(contract.customer_id)?.name ?? "Unknown"}</p>
                    </TableCell>
                    <TableCell>{contract.contract_date ? format(new Date(contract.contract_date), "MMM dd, yyyy") : "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={contract.status === "Confirmed" ? "default" : contract.status === "Sent" ? "secondary" : "outline"}>{contract.status}</Badge>
                        <Select value={contract.status} onValueChange={(value) => handleStatusChange(contract.id, value as "Draft" | "Confirmed" | "Sent")}>
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
                    <TableCell className="text-sm text-muted-foreground">{contract.items.length}</TableCell>
                    <TableCell className="font-semibold text-foreground">${contract.items.reduce((sum, item) => sum + (item.total_amount ?? item.price * item.quantity), 0).toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => openContractDialog(contract.id)}>
                          Contract
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(contract.id)} className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <Dialog
          open={isContractDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              closeContractDialog();
            } else {
              setIsContractDialogOpen(true);
            }
          }}
        >
          <DialogContent className="max-w-5xl overflow-hidden p-0">
            <div className="flex max-h-[90vh] flex-col">
              <DialogHeader className="px-6 pt-6">
                <DialogTitle className="font-display text-xl">Contract {activeContract?.contract_number ?? ""}</DialogTitle>
              </DialogHeader>
              <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pr-2">
                {activeContract ? (
                  activeContract.status === "Confirmed" ? (
                    <div className="space-y-6">
                      <div className="rounded-lg border border-border p-4 space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-lg font-semibold text-foreground">Contract overview</h3>
                            <p className="text-sm text-muted-foreground">Customer and items included in this contract.</p>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" onClick={() => void refreshContractPreview()} disabled={isContractPreviewLoading}>
                              {isContractPreviewLoading ? "Refreshing preview..." : "Refresh preview"}
                            </Button>
                            <Button onClick={handleDownloadContract}>Download contract</Button>
                          </div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2 text-sm">
                          <div>
                            <p className="text-muted-foreground">Customer</p>
                            <p className="font-medium text-foreground">{activeCustomer?.name ?? "Unknown"}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">BIN/IIN</p>
                            <p className="font-medium text-foreground">{activeCustomer?.bin_iin ?? "—"}</p>
                          </div>
                          <div className="md:col-span-2">
                            <p className="text-muted-foreground">Address</p>
                            <p className="font-medium text-foreground">{activeCustomer?.address ?? "—"}</p>
                          </div>
                        </div>
                        <div className="rounded-lg border border-border overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Product</TableHead>
                                <TableHead>Qty</TableHead>
                                <TableHead>Price</TableHead>
                                <TableHead>Total</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {activeItems.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                                    No items added yet.
                                  </TableCell>
                                </TableRow>
                              ) : (
                                activeItems.map((item) => (
                                  <TableRow key={item.id}>
                                    <TableCell>{productsById.get(item.product_id)?.name ?? "Unknown"}</TableCell>
                                    <TableCell>{item.quantity}</TableCell>
                                    <TableCell>{item.price.toFixed(2)}</TableCell>
                                    <TableCell>{(item.total_amount ?? item.quantity * item.price).toFixed(2)}</TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </div>

                      <div className="rounded-lg border border-border p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-base font-semibold text-foreground">PDF preview</h3>
                          {isContractPreviewLoading && <span className="text-xs text-muted-foreground">Updating…</span>}
                        </div>
                        {contractPreviewPdfUrl ? (
                          <iframe title="Contract PDF preview" src={contractPreviewPdfUrl} className="w-full h-[720px] rounded-md border border-border bg-background" />
                        ) : (
                          <div className="rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground">PDF preview is unavailable. Click “Refresh preview” to generate it.</div>
                        )}
                      </div>

                      <ContractDocumentEditor
                        contract={activeContract}
                        isSaving={updateContractDocument.isPending}
                        isResetting={resetContractDocument.isPending}
                        onDocumentChange={handleDocumentChange}
                        onResetToDefault={handleResetContractDocument}
                        onSave={async (document) => {
                          await updateContractDocument.mutateAsync({
                            id: activeContract.id,
                            contract_document: document,
                          });
                          setIsContractDocumentDirty(false);
                        }}
                      />
                    </div>
                  ) : (
                    <div className="rounded-lg border border-border p-6 text-sm text-muted-foreground">Confirm the contract status to view and download the document.</div>
                  )
                ) : (
                  <div className="rounded-lg border border-border p-6 text-sm text-muted-foreground">Select a contract to view its document.</div>
                )}
              </div>
              <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
                <Button variant="outline" onClick={closeContractDialog}>
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
