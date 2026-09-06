"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Info,
  CheckCheck,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { InspectionHeader } from "@/components/inspections/inspection-header";
import { InspectionStepper } from "@/components/inspections/inspection-stepper";
import { ExtractionFieldRow } from "@/components/extraction/extraction-field-row";
import { FieldEditModal } from "@/components/extraction/field-edit-modal";
import { getInspectionById, updateInspectionField, storeComplianceResults } from "@/lib/api/inspections";
import { InspectionRecord } from "@/lib/types/inspection";
import { MOCK_EXTRACTION_AMUL_GHEE } from "@/mocks/extraction";
import { STATUTORY_REFERENCES } from "@/config/constants";
import { getCurrentUser } from "@/lib/auth";
import { evaluateCompliance } from "@/lib/compliance";
import { useToast } from "@/components/common/toast";

interface ReviewPageProps {
  params: Promise<{ id: string }>;
}

interface FieldItemState {
  label: string;
  fieldKey: string;
  ruleReference: string;
  value: string;
  rawValue?: string;
  originalValue?: string;
  confidenceScore: number;
  confidenceLevel: "HIGH" | "MEDIUM" | "LOW";
  sourceImageAngle: string;
  isOverridden?: boolean;
}

export default function ExtractionReviewPage({ params }: ReviewPageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const toast = useToast();
  const inspectionId = resolvedParams.id;

  const [inspection, setInspection] = useState<InspectionRecord | null>(null);
  const [fields, setFields] = useState<Record<string, FieldItemState>>({});
  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    key: string;
    label: string;
    currentValue: string;
    originalValue?: string;
  }>({
    isOpen: false,
    key: "",
    label: "",
    currentValue: "",
  });
  const [hasNoExtraction, setHasNoExtraction] = useState(false);

  useEffect(() => {
    async function load() {
      const data = await getInspectionById(inspectionId);
      if (data) {
        setInspection(data);
        const isLegacyMock = data.id.startsWith("INSP-") || data.id === "insp_amul_ghee";
        const decl = data.extractedDeclarations || (isLegacyMock ? MOCK_EXTRACTION_AMUL_GHEE : null);

        if (!decl) {
          setHasNoExtraction(true);
          return;
        }
        setHasNoExtraction(false);

        setFields({
          productName: {
            label: "Product / Generic / Common Name",
            fieldKey: "productName",
            ruleReference: STATUTORY_REFERENCES.RULE_6_1_B.rule,
            value: decl.commodityName?.value || data.product || "",
            rawValue: decl.commodityName?.rawValue,
            originalValue: (decl.commodityName?.originalExtractedValue as string) || decl.commodityName?.value,
            confidenceScore: decl.commodityName?.confidence ?? (decl.commodityName?.value ? 0.95 : 0),
            confidenceLevel: decl.commodityName?.confidenceLevel || (decl.commodityName?.value ? "HIGH" : "LOW"),
            sourceImageAngle: "FRONT",
            isOverridden: decl.commodityName?.isInspectorOverridden,
          },
          manufacturer: {
            label: "Manufacturer Name",
            fieldKey: "manufacturer",
            ruleReference: STATUTORY_REFERENCES.RULE_6_1_A.rule,
            value: decl.manufacturerOrPacker?.value?.name || data.company || "",
            rawValue: decl.manufacturerOrPacker?.value?.rawText,
            confidenceScore: (decl.manufacturerOrPacker?.value?.name || data.company) ? (decl.manufacturerOrPacker?.confidence ?? 0.94) : 0,
            confidenceLevel: (decl.manufacturerOrPacker?.value?.name || data.company) ? (decl.manufacturerOrPacker?.confidenceLevel || "HIGH") : "LOW",
            sourceImageAngle: "BACK",
            isOverridden: decl.manufacturerOrPacker?.isInspectorOverridden,
          },
          packer: {
            label: "Pre-Packer / Re-Packer Name",
            fieldKey: "packer",
            ruleReference: "Rule 6(1)(a) Clause 2",
            value: decl.manufacturerOrPacker?.value?.role === "PACKER" ? decl.manufacturerOrPacker.value.name : (decl.manufacturerOrPacker?.value?.name ? "Same as manufacturer" : ""),
            confidenceScore: decl.manufacturerOrPacker?.value?.name ? 0.95 : 0,
            confidenceLevel: decl.manufacturerOrPacker?.value?.name ? "HIGH" : "LOW",
            sourceImageAngle: "BACK",
          },
          importer: {
            label: "Importer Name & Address (if imported)",
            fieldKey: "importer",
            ruleReference: "Rule 6(1)(a) Proviso",
            value: decl.countryOfOrigin?.value?.toLowerCase() === "india" ? "Not applicable (Domestic produce)" : (decl.countryOfOrigin?.value ? "N/A" : ""),
            confidenceScore: 0.99,
            confidenceLevel: "HIGH",
            sourceImageAngle: "BACK",
          },
          address: {
            label: "Registered Postal Address & PIN Code",
            fieldKey: "address",
            ruleReference: STATUTORY_REFERENCES.RULE_6_1_A.rule,
            value: decl.manufacturerOrPacker?.value?.address || "",
            confidenceScore: decl.manufacturerOrPacker?.value?.address ? (decl.manufacturerOrPacker?.confidence ?? 0.92) : 0,
            confidenceLevel: decl.manufacturerOrPacker?.value?.address ? (decl.manufacturerOrPacker?.confidenceLevel || "HIGH") : "LOW",
            sourceImageAngle: "BACK",
          },
          countryOfOrigin: {
            label: "Country of Origin",
            fieldKey: "countryOfOrigin",
            ruleReference: STATUTORY_REFERENCES.RULE_6_10.rule,
            value: decl.countryOfOrigin?.value || "India",
            confidenceScore: decl.countryOfOrigin?.confidence ?? 0.98,
            confidenceLevel: decl.countryOfOrigin?.confidenceLevel || "HIGH",
            sourceImageAngle: "FRONT",
          },
          netQuantity: {
            label: "Net Quantity in Standard SI Units",
            fieldKey: "netQuantity",
            ruleReference: STATUTORY_REFERENCES.RULE_6_1_C.rule,
            value: decl.netQuantity?.value?.rawText || "",
            rawValue: decl.netQuantity?.value?.rawText,
            confidenceScore: decl.netQuantity?.value?.rawText ? (decl.netQuantity?.confidence ?? 0.97) : 0,
            confidenceLevel: decl.netQuantity?.value?.rawText ? (decl.netQuantity?.confidenceLevel || "HIGH") : "LOW",
            sourceImageAngle: "FRONT",
            isOverridden: decl.netQuantity?.isInspectorOverridden,
          },
          mrp: {
            label: "Maximum Retail Price (MRP)",
            fieldKey: "mrp",
            ruleReference: STATUTORY_REFERENCES.RULE_6_1_E.rule,
            value: decl.mrp?.value?.rawText || "",
            rawValue: decl.mrp?.value?.rawText,
            confidenceScore: decl.mrp?.value?.rawText ? (decl.mrp?.confidence ?? 0.97) : 0,
            confidenceLevel: decl.mrp?.value?.rawText ? (decl.mrp?.confidenceLevel || "HIGH") : "LOW",
            sourceImageAngle: "MRP_PANEL",
            isOverridden: decl.mrp?.isInspectorOverridden,
          },
          mrpIncludesTaxes: {
            label: "MRP 'Inclusive of all taxes' Statement",
            fieldKey: "mrpIncludesTaxes",
            ruleReference: STATUTORY_REFERENCES.RULE_6_1_E.rule,
            value: decl.mrp?.value?.isInclusiveOfAllTaxes ? "Present ('INCL. OF ALL TAXES')" : (decl.mrp?.value?.rawText ? "MISSING (Required Statement Missing)" : ""),
            confidenceScore: decl.mrp?.value?.rawText ? (decl.mrp?.confidence ?? 0.96) : 0,
            confidenceLevel: decl.mrp?.value?.rawText ? (decl.mrp?.confidenceLevel || "HIGH") : "LOW",
            sourceImageAngle: "MRP_PANEL",
          },
          manufacturingDate: {
            label: "Month & Year of Manufacture",
            fieldKey: "manufacturingDate",
            ruleReference: STATUTORY_REFERENCES.RULE_6_1_D.rule,
            value: decl.manufacturingOrPackingDate?.value?.formattedText || "",
            confidenceScore: decl.manufacturingOrPackingDate?.value?.formattedText ? (decl.manufacturingOrPackingDate?.confidence ?? 0.93) : 0,
            confidenceLevel: decl.manufacturingOrPackingDate?.value?.formattedText ? (decl.manufacturingOrPackingDate?.confidenceLevel || "HIGH") : "LOW",
            sourceImageAngle: "MRP_PANEL",
            isOverridden: decl.manufacturingOrPackingDate?.isInspectorOverridden,
          },
          packingDate: {
            label: "Month & Year of Pre-Packing",
            fieldKey: "packingDate",
            ruleReference: "Rule 6(1)(d)",
            value: decl.manufacturingOrPackingDate?.value?.declarationType === "PACKING" && decl.manufacturingOrPackingDate?.value?.formattedText ? decl.manufacturingOrPackingDate.value.formattedText : "",
            confidenceScore: (decl.manufacturingOrPackingDate?.value?.declarationType === "PACKING" && decl.manufacturingOrPackingDate?.value?.formattedText) ? 0.91 : 0,
            confidenceLevel: (decl.manufacturingOrPackingDate?.value?.declarationType === "PACKING" && decl.manufacturingOrPackingDate?.value?.formattedText) ? "HIGH" : "LOW",
            sourceImageAngle: "MRP_PANEL",
          },
          importDate: {
            label: "Month & Year of Importation",
            fieldKey: "importDate",
            ruleReference: "Rule 6(1)(d) 2nd Proviso",
            value: "N/A (Domestic Produce)",
            confidenceScore: 0.99,
            confidenceLevel: "HIGH",
            sourceImageAngle: "OTHER",
          },
          bestBefore: {
            label: "Best Before / Use-By Date",
            fieldKey: "bestBefore",
            ruleReference: "Rule 6(1)(d) Proviso",
            value: decl.expiryOrBestBeforeDate?.value?.formattedText || "",
            confidenceScore: decl.expiryOrBestBeforeDate?.value?.formattedText ? (decl.expiryOrBestBeforeDate?.confidence ?? 0.88) : 0,
            confidenceLevel: decl.expiryOrBestBeforeDate?.value?.formattedText ? (decl.expiryOrBestBeforeDate?.confidenceLevel || "HIGH") : "LOW",
            sourceImageAngle: "MRP_PANEL",
          },
          useBy: {
            label: "Use-By / Expiry Date (Perishables)",
            fieldKey: "useBy",
            ruleReference: "Rule 6(1)(d) Clause 3",
            value: decl.expiryOrBestBeforeDate?.value?.declarationType === "USE_BY" && decl.expiryOrBestBeforeDate?.value?.formattedText ? decl.expiryOrBestBeforeDate.value.formattedText : "",
            confidenceScore: (decl.expiryOrBestBeforeDate?.value?.declarationType === "USE_BY" && decl.expiryOrBestBeforeDate?.value?.formattedText) ? 0.86 : 0,
            confidenceLevel: (decl.expiryOrBestBeforeDate?.value?.declarationType === "USE_BY" && decl.expiryOrBestBeforeDate?.value?.formattedText) ? "MEDIUM" : "LOW",
            sourceImageAngle: "MRP_PANEL",
          },
          consumerCare: {
            label: "Consumer Care Grievance Mechanism",
            fieldKey: "consumerCare",
            ruleReference: STATUTORY_REFERENCES.RULE_6_1_F.rule,
            value: decl.consumerCare?.value?.rawText || "",
            rawValue: decl.consumerCare?.value?.rawText,
            confidenceScore: decl.consumerCare?.value?.rawText ? (decl.consumerCare?.confidence ?? 0.91) : 0,
            confidenceLevel: decl.consumerCare?.value?.rawText ? (decl.consumerCare?.confidenceLevel || "HIGH") : "LOW",
            sourceImageAngle: "BACK",
            isOverridden: decl.consumerCare?.isInspectorOverridden,
          },
          unitSalePrice: {
            label: "Unit Sale Price (USP for packs > 100g / 100ml)",
            fieldKey: "unitSalePrice",
            ruleReference: "Rule 6(1)(e) Amendment",
            value: decl.unitSalePrice?.value?.rawText || "",
            confidenceScore: decl.unitSalePrice?.value?.rawText ? (decl.unitSalePrice?.confidence ?? 0.92) : 0,
            confidenceLevel: decl.unitSalePrice?.value?.rawText ? (decl.unitSalePrice?.confidenceLevel || "HIGH") : "LOW",
            sourceImageAngle: "MRP_PANEL",
          },
          dimensions: {
            label: "Package Size & Dimensions (if applicable)",
            fieldKey: "dimensions",
            ruleReference: STATUTORY_REFERENCES.RULE_7.rule,
            value: decl.sizesOrDimensions?.value || "",
            confidenceScore: decl.sizesOrDimensions?.value ? 0.94 : 0,
            confidenceLevel: decl.sizesOrDimensions?.value ? "HIGH" : "LOW",
            sourceImageAngle: "OTHER",
          },
        });
      }
    }
    load();
  }, [inspectionId]);

  const openEditor = (key: string, label: string) => {
    const item = fields[key];
    if (!item) return;
    setEditModal({
      isOpen: true,
      key,
      label,
      currentValue: item.value,
      originalValue: item.originalValue || item.rawValue || item.value,
    });
  };

  const handleSaveField = async (newValue: string, reason: string) => {
    const key = editModal.key;
    const item = fields[key];
    if (!item) return;

    try {
      const currentUser = await getCurrentUser();
      const origVal = item.originalValue || item.rawValue || item.value;

      await updateInspectionField(inspectionId, {
        fieldId: `field_${key}`,
        inspectionId,
        fieldName: key,
        oldValue: origVal,
        newValue,
        correctedBy: currentUser?.fullName || "Legal Metrology Inspector",
        correctionReason: reason || "Manual inspector label review",
        correctedTimestamp: new Date().toISOString(),
      });

      // Update local state ONLY after backend success
      setFields((prev) => ({
        ...prev,
        [key]: {
          ...prev[key],
          value: newValue,
          isOverridden: true,
        },
      }));
      setEditModal((prev) => ({ ...prev, isOpen: false }));
      toast.success(
        "Field Correction Saved",
        `Declaration '${item.label}' updated and saved.`
      );
    } catch (err) {
      console.error("Failed to save field correction to backend:", err);
      toast.error(
        "Correction Failed",
        "Failed to persist field correction to backend database. Please try again."
      );
    }
  };

  const handleProceedToCompliance = async () => {
    if (inspection?.extractedDeclarations) {
      try {
        const evaluation = await evaluateCompliance(inspection.extractedDeclarations);
        await storeComplianceResults(inspection.id, evaluation);
      } catch (e) {
        console.warn("Could not pre-sync compliance results:", e);
      }
    }
    router.push(`/inspections/${inspection?.id || inspectionId}/compliance`);
  };

  if (!inspection) {
    return (
      <div className="p-8 text-center text-xs text-[#475569]">
        Loading inspection review workspace...
      </div>
    );
  }

  if (hasNoExtraction) {
    return (
      <div className="flex flex-col gap-6 max-w-5xl mx-auto">
        <InspectionHeader inspection={inspection} />
        <InspectionStepper inspectionId={inspection.id} />
        <Card className="border-[#E2E8F0] bg-white shadow-2xs p-8 text-center space-y-4">
          <div className="mx-auto size-12 rounded-full bg-[#EFF6FF] flex items-center justify-center text-[#1D4ED8]">
            <Info className="size-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[#0F172A]">No Extracted Declarations Yet</h3>
            <p className="text-xs text-[#475569] max-w-md mx-auto">
              This inspection has not yet been processed through image reading and declaration extraction.
            </p>
          </div>
          <div>
            <Link href={`/inspections/${inspection.id}/processing`}>
              <Button variant="primary" size="md" rightIcon={<ArrowRight className="size-4" />}>
                Run Extraction Pipeline
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      <InspectionHeader inspection={inspection} />

      <InspectionStepper inspectionId={inspection.id} />

      {/* Badge legend strip */}
      <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-2.5">
        <p className="text-xs font-bold text-[#0F172A]">How to read this checklist:</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
          <div className="flex items-start gap-2 bg-white rounded-md border border-[#FCA5A5] p-2.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FEE2E2] text-[#991B1B] border border-[#FCA5A5] font-semibold shrink-0">✕ Action Needed</span>
            <span className="text-[#475569] leading-tight">Not found on label. Click ✏️ and type the value from the package.</span>
          </div>
          <div className="flex items-start gap-2 bg-white rounded-md border border-[#FCD34D] p-2.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D] font-semibold shrink-0">⚠ Please Review</span>
            <span className="text-[#475569] leading-tight">Partially read. Visually confirm it matches the package, or click ✏️ to fix.</span>
          </div>
          <div className="flex items-start gap-2 bg-white rounded-md border border-[#86EFAC] p-2.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#166534] border border-[#86EFAC] font-semibold shrink-0">✓ Verified</span>
            <span className="text-[#475569] leading-tight">Read with high confidence. No action needed unless you spot an error.</span>
          </div>
          <div className="flex items-start gap-2 bg-white rounded-md border border-[#86EFAC] p-2.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#166534] border border-[#86EFAC] font-semibold shrink-0">✓✓ Resolved</span>
            <span className="text-[#475569] leading-tight">You corrected this field. Your value will be used in the report.</span>
          </div>
        </div>
      </div>

      {/* Main Review Card */}
      <Card className="border-[#E2E8F0] bg-white shadow-2xs">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-[#E2E8F0]">
          <div>
            <CardTitle className="text-sm font-bold text-[#0F172A]">
              Required Rule 6 Declarations Checklist
            </CardTitle>
            <p className="text-xs text-[#475569]">
              Package label details evaluated under Legal Metrology Rules, 2011
            </p>
          </div>
          <span className="text-xs text-[#475569] font-medium">
            Label Reading & Extraction
          </span>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Group 1: Identity & Origin */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1.5 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-[#1D4ED8]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
                  Commodity, Manufacturer & Origin
                </h3>
              </div>
              <span className="text-[11px] font-mono text-[#475569]">
                Rule 6(1)(a), (b), (10)
              </span>
            </div>
            <div className="space-y-2.5">
              {["productName", "manufacturer", "packer", "importer", "address", "countryOfOrigin"]
                .map((k) => fields[k])
                .filter(Boolean)
                .map((item) => (
                  <ExtractionFieldRow
                    key={item.fieldKey}
                    label={item.label}
                    ruleReference={item.ruleReference}
                    value={item.value}
                    rawValue={item.rawValue}
                    confidenceLevel={item.confidenceLevel}
                    confidenceScore={item.confidenceScore}
                    sourceImageAngle={item.sourceImageAngle}
                    isOverridden={item.isOverridden}
                    onEdit={() => openEditor(item.fieldKey, item.label)}
                  />
                ))}
            </div>
          </div>

          {/* Group 2: Quantity & Pricing */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1.5 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-[#1D4ED8]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
                  Net Quantity, Pricing & Metric Standards
                </h3>
              </div>
              <span className="text-[11px] font-mono text-[#475569]">
                Rule 6(1)(c), (e), Rule 7
              </span>
            </div>
            <div className="space-y-2.5">
              {["netQuantity", "mrp", "mrpIncludesTaxes", "unitSalePrice", "dimensions"]
                .map((k) => fields[k])
                .filter(Boolean)
                .map((item) => (
                  <ExtractionFieldRow
                    key={item.fieldKey}
                    label={item.label}
                    ruleReference={item.ruleReference}
                    value={item.value}
                    rawValue={item.rawValue}
                    confidenceLevel={item.confidenceLevel}
                    confidenceScore={item.confidenceScore}
                    sourceImageAngle={item.sourceImageAngle}
                    isOverridden={item.isOverridden}
                    onEdit={() => openEditor(item.fieldKey, item.label)}
                  />
                ))}
            </div>
          </div>

          {/* Group 3: Dates & Consumer Care */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1.5 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-[#1D4ED8]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
                  Dates, Preservation & Consumer Redressal
                </h3>
              </div>
              <span className="text-[11px] font-mono text-[#475569]">
                Rule 6(1)(d), (f)
              </span>
            </div>
            <div className="space-y-2.5">
              {["manufacturingDate", "packingDate", "importDate", "bestBefore", "useBy", "consumerCare"]
                .map((k) => fields[k])
                .filter(Boolean)
                .map((item) => (
                  <ExtractionFieldRow
                    key={item.fieldKey}
                    label={item.label}
                    ruleReference={item.ruleReference}
                    value={item.value}
                    rawValue={item.rawValue}
                    confidenceLevel={item.confidenceLevel}
                    confidenceScore={item.confidenceScore}
                    sourceImageAngle={item.sourceImageAngle}
                    isOverridden={item.isOverridden}
                    onEdit={() => openEditor(item.fieldKey, item.label)}
                  />
                ))}
            </div>
          </div>
        </CardContent>

        <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAFC] rounded-b-xl flex items-center justify-between">
          <Link href={`/inspections/${inspection.id}/processing`}>
            <Button variant="secondary" size="sm">
              Back to Processing
            </Button>
          </Link>

          <Button
            variant="primary"
            size="md"
            onClick={handleProceedToCompliance}
            rightIcon={<ArrowRight className="size-4" />}
          >
            Continue to Compliance Check
          </Button>
        </div>
      </Card>

      {/* Field Edit Dialog Modal */}
      <FieldEditModal
        isOpen={editModal.isOpen}
        onClose={() => setEditModal((prev) => ({ ...prev, isOpen: false }))}
        fieldName={editModal.key}
        fieldLabel={editModal.label}
        currentValue={editModal.currentValue}
        originalValue={editModal.originalValue}
        onSave={handleSaveField}
      />
    </div>
  );
}
