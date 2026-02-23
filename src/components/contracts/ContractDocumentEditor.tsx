import { useEffect, useMemo, useState } from "react";
import { Contract, ContractDocument, ContractDocumentClause } from "@/hooks/useContracts";
import { Client } from "@/hooks/useClients";
import { KZ_BANKS, KZ_CITIES } from "@/lib/referenceData";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";

interface ContractDocumentEditorProps {
  contract: Contract;
  customer?: Client;
  salesCity?: string;
  onSave: (document: ContractDocument) => Promise<void>;
  onResetToDefault: () => Promise<void>;
  isSaving: boolean;
  isResetting: boolean;
  onDocumentChange?: (document: ContractDocument, isDirty: boolean) => void;
}

const normalizeClauseBody = (clause: ContractDocumentClause): string[] => {
  const rawBody = clause.body as unknown;

  if (Array.isArray(rawBody)) {
    return rawBody.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof rawBody === "string") {
    return rawBody
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => item.replace(/^\d+(?:\.\d+)*[.)]?\s*/, "").replace(/^-\s*/, ""));
  }

  return [];
};

const normalizeDocumentClauses = (clauses: ContractDocumentClause[]) =>
  clauses.map((clause) => ({ ...clause, body: normalizeClauseBody(clause) }));

const cloneClauses = (clauses: ContractDocumentClause[]) =>
  normalizeDocumentClauses(clauses).map((clause) => ({ ...clause, body: [...(clause.body ?? [])] }));

export function ContractDocumentEditor({
  contract,
  customer,
  salesCity,
  onSave,
  onResetToDefault,
  isSaving,
  isResetting,
  onDocumentChange,
}: ContractDocumentEditorProps) {
  const [document, setDocument] = useState<ContractDocument | null>(
    contract.contract_document
      ? { ...contract.contract_document, clauses: normalizeDocumentClauses(contract.contract_document.clauses) }
      : null,
  );
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    const initialDocument =
      contract.contract_document
        ? { ...contract.contract_document, clauses: normalizeDocumentClauses(contract.contract_document.clauses) }
        : null;
    setDocument(initialDocument);
    setIsDirty(false);

    if (initialDocument) {
      onDocumentChange?.(initialDocument, false);
    }
  }, [contract, onDocumentChange]);

  const header = document?.header;
  const signatures = document?.signatures;
  const clauses = useMemo(() => document?.clauses ?? [], [document]);

  useEffect(() => {
    if (!customer || !document) return;
    setDocument((prev) => {
      if (!prev) return prev;
      const nextDocument = {
        ...prev,
        header: { ...prev.header, city: prev.header.city || (salesCity ? `г. ${salesCity}` : prev.header.city) },
        signatures: {
          ...prev.signatures,
          linked_customer_name: prev.signatures.linked_customer_name || customer.name,
          execution_city: prev.signatures.execution_city || customer.city || "",
          sales_city: prev.signatures.sales_city || salesCity || "",
          buyer_legal_address: prev.signatures.buyer_legal_address || customer.legal_address || customer.address || "",
          buyer_bin: prev.signatures.buyer_bin || customer.bin_iin || "",
        },
      };
      return nextDocument;
    });
  }, [customer, document, salesCity]);

  if (!document || !header || !signatures) {
    return (
      <div className="rounded-lg border border-border p-6 text-sm text-muted-foreground">
        Документ договора пока недоступен для этого соглашения.
      </div>
    );
  }

  const updateHeader = (field: keyof ContractDocument["header"], value: string) => {
    setDocument((prev) => {
      if (!prev) return prev;
      const nextDocument = { ...prev, header: { ...prev.header, [field]: value } };
      setIsDirty(true);
      onDocumentChange?.(nextDocument, true);
      return nextDocument;
    });
  };

  const updateSignature = (field: keyof ContractDocument["signatures"], value: string) => {
    setDocument((prev) =>
      {
        if (!prev) return prev;
        const nextDocument = { ...prev, signatures: { ...prev.signatures, [field]: value } };
        setIsDirty(true);
        onDocumentChange?.(nextDocument, true);
        return nextDocument;
      },
    );
  };

  const updateIntro = (value: string) => {
    setDocument((prev) => {
      if (!prev) return prev;
      const nextDocument = { ...prev, intro: value };
      setIsDirty(true);
      onDocumentChange?.(nextDocument, true);
      return nextDocument;
    });
  };

  const updateClause = (index: number, field: keyof ContractDocumentClause, value: string | boolean) => {
    setDocument((prev) => {
      if (!prev) return prev;
      const nextClauses = cloneClauses(prev.clauses);
      nextClauses[index] = { ...nextClauses[index], [field]: value } as ContractDocumentClause;
      const nextDocument = { ...prev, clauses: nextClauses };
      setIsDirty(true);
      onDocumentChange?.(nextDocument, true);
      return nextDocument;
    });
  };

  const updateClauseBodyItem = (clauseIndex: number, itemIndex: number, value: string) => {
    setDocument((prev) => {
      if (!prev) return prev;
      const nextClauses = cloneClauses(prev.clauses);
      const nextBody = [...(nextClauses[clauseIndex].body ?? [])];
      nextBody[itemIndex] = value;
      nextClauses[clauseIndex] = { ...nextClauses[clauseIndex], body: nextBody };
      const nextDocument = { ...prev, clauses: nextClauses };
      setIsDirty(true);
      onDocumentChange?.(nextDocument, true);
      return nextDocument;
    });
  };

  const addClauseBodyItem = (clauseIndex: number) => {
    setDocument((prev) => {
      if (!prev) return prev;
      const nextClauses = cloneClauses(prev.clauses);
      const nextBody = [...(nextClauses[clauseIndex].body ?? []), ""];
      nextClauses[clauseIndex] = { ...nextClauses[clauseIndex], body: nextBody };
      const nextDocument = { ...prev, clauses: nextClauses };
      setIsDirty(true);
      onDocumentChange?.(nextDocument, true);
      return nextDocument;
    });
  };

  const removeClauseBodyItem = (clauseIndex: number, itemIndex: number) => {
    setDocument((prev) => {
      if (!prev) return prev;
      const nextClauses = cloneClauses(prev.clauses);
      const nextBody = (nextClauses[clauseIndex].body ?? []).filter((_, index) => index !== itemIndex);
      nextClauses[clauseIndex] = { ...nextClauses[clauseIndex], body: nextBody };
      const nextDocument = { ...prev, clauses: nextClauses };
      setIsDirty(true);
      onDocumentChange?.(nextDocument, true);
      return nextDocument;
    });
  };

  const removeClause = (index: number) => {
    setDocument((prev) => {
      if (!prev) return prev;
      const nextClauses = prev.clauses.filter((_, clauseIndex) => clauseIndex !== index);
      const nextDocument = { ...prev, clauses: nextClauses };
      setIsDirty(true);
      onDocumentChange?.(nextDocument, true);
      return nextDocument;
    });
  };

  const handleSave = async () => {
    if (!document) return;
    await onSave(document);
    setIsDirty(false);
    onDocumentChange?.(document, false);
  };

  return (
    <div className="space-y-8">
      <div className="rounded-lg border border-border p-6 space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Header</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={header.title} onChange={(event) => updateHeader("title", event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Contract number</Label>
            <Input value={header.contract_number} readOnly />
          </div>
          <div className="space-y-2">
            <Label>City</Label>
            <Input value={header.city} onChange={(event) => updateHeader("city", event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Date</Label>
            <Input value={header.date} onChange={(event) => updateHeader("date", event.target.value)} />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border p-6 space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Introductory text</h3>
        <Textarea value={document.intro} onChange={(event) => updateIntro(event.target.value)} />
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Clauses</h3>
        {clauses.map((clause, index) => (
          <div key={clause.id} className="rounded-lg border border-border p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Input
                className="flex-1 min-w-[220px]"
                value={clause.title}
                onChange={(event) => updateClause(index, "title", event.target.value)}
              />
              {clause.deletable && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeClause(index)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="space-y-3">
              {(clause.body ?? []).map((item, itemIndex) => (
                <div key={`${clause.id}-item-${itemIndex}`} className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-xs text-muted-foreground">
                      {clause.id}.{itemIndex + 1}
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeClauseBodyItem(index, itemIndex)}
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Textarea
                    className="min-h-[90px]"
                    value={item}
                    onChange={(event) => updateClauseBodyItem(index, itemIndex, event.target.value)}
                  />
                </div>
              ))}
              <Button type="button" variant="outline" onClick={() => addClauseBodyItem(index)}>
                <Plus className="h-4 w-4 mr-2" />
                Добавить подпункт
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border p-6 space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Подписи</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Подвязка к клиенту</Label>
            <Input value={signatures.linked_customer_name ?? ""} onChange={(event) => updateSignature("linked_customer_name", event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Место исполнения договора (отгрузка)</Label>
            <Select value={signatures.execution_city ?? ""} onValueChange={(value) => updateSignature("execution_city", value)}>
              <SelectTrigger><SelectValue placeholder="Город" /></SelectTrigger>
              <SelectContent>{KZ_CITIES.map((city) => <SelectItem key={city} value={city}>{city}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Предмет поставки</Label>
            <Input value={signatures.supply_subject ?? ""} onChange={(event) => updateSignature("supply_subject", event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Город (подвязывается от продажника)</Label>
            <Input value={signatures.sales_city ?? ""} onChange={(event) => updateSignature("sales_city", event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Покупатель: Юр. адрес</Label>
            <Input value={signatures.buyer_legal_address ?? ""} onChange={(event) => updateSignature("buyer_legal_address", event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Покупатель: БИН</Label>
            <Input value={signatures.buyer_bin ?? ""} onChange={(event) => updateSignature("buyer_bin", event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Покупатель: Банк</Label>
            <Select value={signatures.buyer_bank ?? ""} onValueChange={(value) => {
              updateSignature("buyer_bank", value);
              const selected = KZ_BANKS.find((bank) => bank.name === value);
              if (selected) updateSignature("buyer_bik", selected.bik);
            }}>
              <SelectTrigger><SelectValue placeholder="Выборка банка" /></SelectTrigger>
              <SelectContent>{KZ_BANKS.map((bank) => <SelectItem key={bank.bik} value={bank.name}>{bank.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Покупатель: БИК</Label>
            <Input value={signatures.buyer_bik ?? ""} onChange={(event) => updateSignature("buyer_bik", event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Покупатель: ИИК (20 знаков)</Label>
            <Input value={signatures.buyer_iik ?? ""} maxLength={20} onChange={(event) => updateSignature("buyer_iik", event.target.value.toUpperCase())} />
          </div>
          <div className="space-y-2">
            <Label>Покупатель: Конт. тел</Label>
            <Input value={signatures.buyer_phone ?? ""} onChange={(event) => updateSignature("buyer_phone", event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Покупатель: Email (необязательно)</Label>
            <Input value={signatures.buyer_email ?? ""} onChange={(event) => updateSignature("buyer_email", event.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Продавец (фиксировано для Дегеш)</Label>
            <Textarea value={signatures.seller_details ?? ""} onChange={(event) => updateSignature("seller_details", event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Подпись продавца (заголовок)</Label>
            <Input
              value={signatures.seller_label}
              onChange={(event) => updateSignature("seller_label", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Подпись покупателя (заголовок)</Label>
            <Input
              value={signatures.buyer_label}
              onChange={(event) => updateSignature("buyer_label", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Должность продавца</Label>
            <Input
              value={signatures.seller_position}
              onChange={(event) => updateSignature("seller_position", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Должность покупателя</Label>
            <Input
              value={signatures.buyer_position}
              onChange={(event) => updateSignature("buyer_position", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>ФИО продавца</Label>
            <Input
              value={signatures.seller_name}
              onChange={(event) => updateSignature("seller_name", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>ФИО покупателя</Label>
            <Input
              value={signatures.buyer_name}
              onChange={(event) => updateSignature("buyer_name", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Отметка продавца</Label>
            <Input
              value={signatures.seller_stamp}
              onChange={(event) => updateSignature("seller_stamp", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Отметка покупателя</Label>
            <Input
              value={signatures.buyer_stamp}
              onChange={(event) => updateSignature("buyer_stamp", event.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={onResetToDefault}
          disabled={isSaving || isResetting}
        >
          {isResetting ? "Сброс..." : "Вернуть типовой договор"}
        </Button>
        <Button onClick={handleSave} disabled={isSaving || isResetting}>
          {isSaving ? "Сохранение..." : isDirty ? "Сохранить документ договора" : "Сохранено"}
        </Button>
      </div>
    </div>
  );
}
