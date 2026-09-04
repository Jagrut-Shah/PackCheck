"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, AlertCircle, Calendar } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { InspectionImageUploader, UploadedFileItem } from "@/components/inspections/inspection-image-uploader";
import { CommodityCategory } from "@/lib/types/inspection";
import { InspectionImage } from "@/lib/types/image";
import { createInspection } from "@/lib/api/inspections";
import { getCurrentUser } from "@/lib/auth";
import { useToast } from "@/components/common/toast";

export default function NewInspectionPage() {
  const router = useRouter();
  const toast = useToast();

  // Form State
  const [commodityName, setCommodityName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [manufacturerName, setManufacturerName] = useState("");
  const [category, setCategory] = useState<CommodityCategory>("FOOD_AND_BEVERAGES");
  const [inspectionDate, setInspectionDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [location, setLocation] = useState("Connaught Place Retail Zone, New Delhi");
  const [inspectionType, setInspectionType] = useState("ROUTINE_MARKET_SURVEILLANCE");
  const [notes, setNotes] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleStartVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commodityName.trim()) {
      setErrorMessage("Please enter the commodity name as declared on the package.");
      return;
    }

    if (uploadedFiles.length === 0) {
      setErrorMessage("Please upload at least one package photo before starting verification.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const user = await getCurrentUser();
      if (!user?.id) {
        setErrorMessage("Authentication required: You must be logged in to initialize an inspection. Please sign in.");
        setIsSubmitting(false);
        return;
      }

      const filesToUpload = uploadedFiles.map((item) => item.file).filter(Boolean);

      // Map uploaded client files to canonical InspectionImage structures
      const inspectionImages: InspectionImage[] = uploadedFiles.map((item, idx) => ({
        id: `img_${Date.now()}_${idx}`,
        inspectionId: "pending",
        filename: item.file.name,
        fileName: item.file.name,
        storagePath: item.previewUrl,
        url: item.previewUrl,
        imageType: item.angle,
        angle: item.angle,
        fileSize: item.file.size,
        fileSizeBytes: item.file.size,
        mimeType: item.file.type || "image/jpeg",
        qualityStatus: "PASSED",
        qualityScore: 0.94,
        qualityMetrics: {
          blur: 0.95,
          brightness: 0.9,
          glare: 0.92,
          resolution: 0.96,
          readability: 0.93,
        },
        uploadedAt: new Date().toISOString(),
      }));

      const newInspection = await createInspection(
        {
          commodityName: commodityName.trim(),
          brandName: brandName.trim() || undefined,
          category,
          manufacturerName: manufacturerName.trim() || undefined,
          location: location.trim(),
          inspectionType,
          notes: notes.trim() || undefined,
        },
        inspectionImages,
        filesToUpload
      );

      toast.success(
        "Inspection Created",
        `Inspection record for '${commodityName.trim()}' initialized successfully.`
      );

      // Route directly to the 7-stage processing visualizer
      router.push(`/inspections/${newInspection.id}/processing`);
    } catch (err) {
      console.error("Error creating inspection", err);
      const msg = err instanceof Error ? err.message : "Error initializing inspection record. Please check inputs and try again.";
      setErrorMessage(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-2">
        <Link href="/inspections">
          <Button variant="secondary" size="sm" leftIcon={<ArrowLeft className="size-3.5" />}>
            Back to Inspections
          </Button>
        </Link>
      </div>

      <PageHeader
        title="Initialize New Commodity Inspection"
        description="Initiate legal verification for pre-packaged commodities under Legal Metrology Rules, 2011."
      />

      {errorMessage && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-[#FCA5A5] bg-[#FEE2E2] text-xs text-[#991B1B] font-medium">
          <AlertCircle className="size-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleStartVerification} className="space-y-6">
        {/* SECTION A: Inspection Details */}
        <Card className="border-[#E2E8F0] bg-white shadow-2xs">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-[#0F172A]">
              Section A: Inspection Particulars
            </CardTitle>
            <CardDescription className="text-xs text-[#475569]">
              Commodity identifying declarations observed during physical inspection
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-semibold text-[#0F172A]">
                  Product / Commodity Name *
                </label>
                <Input
                  required
                  placeholder="e.g. Pure Ghee 1L Tin"
                  value={commodityName}
                  onChange={(e) => setCommodityName(e.target.value)}
                  className="text-xs h-8"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#0F172A]">
                  Brand / Trade Name
                </label>
                <Input
                  placeholder="e.g. Amul"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="text-xs h-8"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-semibold text-[#0F172A]">
                  Company / Manufacturer / Pre-Packer
                </label>
                <Input
                  placeholder="e.g. Kaira District Co-operative Milk Producers' Union Ltd."
                  value={manufacturerName}
                  onChange={(e) => setManufacturerName(e.target.value)}
                  className="text-xs h-8"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#0F172A]">
                  Product Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as CommodityCategory)}
                  className="w-full h-8 px-2.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-colors"
                >
                  <option value="FOOD_AND_BEVERAGES">Food & Beverages</option>
                  <option value="EDIBLE_OILS">Edible Oils & Fats</option>
                  <option value="PHARMACEUTICALS_AND_HEALTH">Pharmaceuticals & Health</option>
                  <option value="COSMETICS_AND_PERSONAL_CARE">Cosmetics & Personal Care</option>
                  <option value="ELECTRONICS_AND_APPLIANCES">Electronics & Appliances</option>
                  <option value="CLEANING_AND_HOUSEHOLD">Cleaning & Household</option>
                  <option value="APPAREL_AND_TEXTILES">Apparel & Textiles</option>
                  <option value="GENERAL_COMMODITY">General Commodity</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="font-semibold text-[#0F172A]">
                  Inspection Date
                </label>
                <Input
                  type="date"
                  value={inspectionDate}
                  onChange={(e) => setInspectionDate(e.target.value)}
                  className="text-xs h-8"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#0F172A]">
                  Location / Retail Point
                </label>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="text-xs h-8"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#0F172A]">
                  Inspection Type
                </label>
                <select
                  value={inspectionType}
                  onChange={(e) => setInspectionType(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-colors"
                >
                  <option value="ROUTINE_MARKET_SURVEILLANCE">Routine Market Surveillance</option>
                  <option value="CONSUMER_GRIEVANCE_AUDIT">Consumer Grievance Investigation</option>
                  <option value="FACTORY_PRE_PACK_INSPECTION">Factory Pre-Pack Inspection</option>
                  <option value="CUSTOMS_IMPORT_CLEARANCE">Customs Import Clearance</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SECTION B: Package Images Upload Workspace */}
        <Card className="border-[#E2E8F0] bg-white shadow-2xs">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-[#0F172A]">
              Section B: Package Photographic Evidence Workspace
            </CardTitle>
            <CardDescription className="text-xs text-[#475569]">
              Upload any number of relevant package panel photos. The system accommodates flexible angles without rigid panel mandates.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InspectionImageUploader
              files={uploadedFiles}
              onFilesChange={setUploadedFiles}
            />
          </CardContent>
        </Card>

        {/* SECTION C: Action Buttons */}
        <div className="flex items-center justify-between p-4 rounded-xl border border-[#E2E8F0] bg-white shadow-2xs">
          <Link href="/inspections">
            <Button variant="secondary" size="sm">
              Cancel
            </Button>
          </Link>

          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isSubmitting}
            rightIcon={<ArrowRight className="size-4" />}
          >
            Start Verification Pipeline
          </Button>
        </div>
      </form>
    </div>
  );
}
