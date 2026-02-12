import { useEffect, useMemo, useState } from "react";
import { Contract, ContractDocument, ContractDocumentClause } from "@/hooks/useContracts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";

interface ContractDocumentEditorProps {
  contract: Contract;
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

  if (!document || !header || !signatures) {
    return (
      <div className="rounded-lg border border-border p-6 text-sm text-muted-foreground">
        Contract document is not available for this agreement yet.
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
        <h3 className="text-lg font-semibold text-foreground">Signatures</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Seller label</Label>
            <Input
              value={signatures.seller_label}
              onChange={(event) => updateSignature("seller_label", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Buyer label</Label>
            <Input
              value={signatures.buyer_label}
              onChange={(event) => updateSignature("buyer_label", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Seller position</Label>
            <Input
              value={signatures.seller_position}
              onChange={(event) => updateSignature("seller_position", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Buyer position</Label>
            <Input
              value={signatures.buyer_position}
              onChange={(event) => updateSignature("buyer_position", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Seller name</Label>
            <Input
              value={signatures.seller_name}
              onChange={(event) => updateSignature("seller_name", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Buyer name</Label>
            <Input
              value={signatures.buyer_name}
              onChange={(event) => updateSignature("buyer_name", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Seller stamp</Label>
            <Input
              value={signatures.seller_stamp}
              onChange={(event) => updateSignature("seller_stamp", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Buyer stamp</Label>
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
          {isResetting ? "Resetting..." : "Back to default contract"}
        </Button>
        <Button onClick={handleSave} disabled={isSaving || isResetting}>
          {isSaving ? "Saving..." : isDirty ? "Save contract document" : "Saved"}
        </Button>
      </div>
    </div>
  );
}
