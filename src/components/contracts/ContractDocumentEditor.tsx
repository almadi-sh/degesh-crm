import { useEffect, useMemo, useState } from "react";
import { Contract, ContractDocument, ContractDocumentClause } from "@/hooks/useContracts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2 } from "lucide-react";

interface ContractDocumentEditorProps {
  contract: Contract;
  onSave: (document: ContractDocument) => Promise<void>;
  isSaving: boolean;
}

const cloneClauses = (clauses: ContractDocumentClause[]) =>
  clauses.map((clause) => ({ ...clause }));

export function ContractDocumentEditor({ contract, onSave, isSaving }: ContractDocumentEditorProps) {
  const [document, setDocument] = useState<ContractDocument | null>(contract.contract_document ?? null);

  useEffect(() => {
    setDocument(contract.contract_document ?? null);
  }, [contract]);

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
    setDocument((prev) => (prev ? { ...prev, header: { ...prev.header, [field]: value } } : prev));
  };

  const updateSignature = (field: keyof ContractDocument["signatures"], value: string) => {
    setDocument((prev) =>
      prev ? { ...prev, signatures: { ...prev.signatures, [field]: value } } : prev,
    );
  };

  const updateIntro = (value: string) => {
    setDocument((prev) => (prev ? { ...prev, intro: value } : prev));
  };

  const updateClause = (index: number, field: keyof ContractDocumentClause, value: string | boolean) => {
    setDocument((prev) => {
      if (!prev) return prev;
      const nextClauses = cloneClauses(prev.clauses);
      nextClauses[index] = { ...nextClauses[index], [field]: value } as ContractDocumentClause;
      return { ...prev, clauses: nextClauses };
    });
  };

  const removeClause = (index: number) => {
    setDocument((prev) => {
      if (!prev) return prev;
      const nextClauses = prev.clauses.filter((_, clauseIndex) => clauseIndex !== index);
      return { ...prev, clauses: nextClauses };
    });
  };

  const handleSave = async () => {
    if (!document) return;
    await onSave(document);
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
            <Textarea
              className="min-h-[160px]"
              value={clause.body ?? ""}
              onChange={(event) => updateClause(index, "body", event.target.value)}
            />
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

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save contract document"}
        </Button>
      </div>
    </div>
  );
}
