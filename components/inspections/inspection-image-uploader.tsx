"use client";

import React, { useState } from "react";
import { UploadCloud, X, Image as ImageIcon, ArrowUp, ArrowDown, CheckCircle2 } from "lucide-react";
import { PackageImageAngle } from "@/lib/types/image";

export interface UploadedFileItem {
  id: string;
  file: File;
  previewUrl: string;
  angle: PackageImageAngle;
  sizeKb: number;
  dimensions?: string; // e.g. "2048 x 1536 px"
  qualityStatusPlaceholder: "PASSED" | "PENDING";
}

interface InspectionImageUploaderProps {
  files: UploadedFileItem[];
  onFilesChange: (files: UploadedFileItem[]) => void;
}

const AVAILABLE_ANGLES: { value: PackageImageAngle; label: string }[] = [
  { value: "PRINCIPAL_DISPLAY_PANEL", label: "Front / Principal Display" },
  { value: "BACK", label: "Back Panel" },
  { value: "MRP_PANEL", label: "MRP & Date Panel" },
  { value: "INGREDIENTS_PANEL", label: "Ingredients & Details" },
  { value: "SIDE_LEFT", label: "Side Left" },
  { value: "SIDE_RIGHT", label: "Side Right" },
  { value: "TOP", label: "Top" },
  { value: "BOTTOM", label: "Bottom" },
  { value: "LABEL_CLOSEUP", label: "Label Close-Up" },
  { value: "OTHER", label: "Other Panel" },
];

export const InspectionImageUploader: React.FC<InspectionImageUploaderProps> = ({
  files,
  onFilesChange,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileSelection = (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    const newItems: UploadedFileItem[] = Array.from(selectedFiles).map((file, idx) => {
      const previewUrl = URL.createObjectURL(file);
      const item: UploadedFileItem = {
        id: `img_${Date.now()}_${idx}`,
        file,
        previewUrl,
        angle: files.length === 0 && idx === 0 ? "PRINCIPAL_DISPLAY_PANEL" : "OTHER",
        sizeKb: Math.round(file.size / 1024),
        dimensions: "1920 × 1080 px", // Default estimation
        qualityStatusPlaceholder: "PASSED",
      };

      // Attempt to load exact image dimensions
      if (typeof window !== "undefined") {
        const img = new window.Image();
        img.onload = () => {
          item.dimensions = `${img.naturalWidth} × ${img.naturalHeight} px`;
          onFilesChange([...files, ...newItems]);
        };
        img.src = previewUrl;
      }

      return item;
    });

    onFilesChange([...files, ...newItems]);
  };

  const handleRemove = (id: string) => {
    onFilesChange(files.filter((f) => f.id !== id));
  };

  const handleAngleChange = (id: string, newAngle: PackageImageAngle) => {
    onFilesChange(
      files.map((f) => (f.id === id ? { ...f, angle: newAngle } : f))
    );
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    const newFiles = [...files];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newFiles.length) return;
    const temp = newFiles[index];
    newFiles[index] = newFiles[targetIndex];
    newFiles[targetIndex] = temp;
    onFilesChange(newFiles);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Drag & Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          handleFileSelection(e.dataTransfer.files);
        }}
        className={`relative flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed transition-colors duration-150 text-center ${
          isDragOver
            ? "border-[#2563EB] bg-[#EFF6FF]/60"
            : "border-[#CBD5E1] bg-[#F8FAFC] hover:bg-[#F1F5F9] hover:border-[#94A3B8]"
        }`}
      >
        <div className="size-12 rounded-full bg-[#EFF6FF] text-[#1D4ED8] flex items-center justify-center mb-3">
          <UploadCloud className="size-6" />
        </div>
        <h3 className="text-sm font-bold text-[#0F172A]">
          Drag and drop commodity package photos
        </h3>
        <p className="text-xs text-[#475569] mt-1 max-w-md">
          Upload any number of clear photographs of the package panels (Front, MRP stamp, barcode, back address).
        </p>

        <label className="mt-4 cursor-pointer">
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => handleFileSelection(e.target.files)}
          />
          <span className="inline-flex items-center justify-center h-9 px-4 rounded-lg bg-gradient-to-b from-[#2563EB] via-[#1D4ED8] to-[#1E40AF] text-white text-xs font-semibold border border-[#1E40AF] shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_1px_3px_rgba(29,78,216,0.3)] hover:from-[#3B82F6] hover:via-[#2563EB] hover:to-[#1D4ED8] hover:shadow-[0_4px_16px_rgba(29,78,216,0.35),inset_0_1px_0_rgba(255,255,255,0.3)] hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-200 cursor-pointer select-none">
            Browse Files from Device
          </span>
        </label>
        <span className="text-[10px] text-[#94A3B8] mt-2 font-mono">
          JPEG, PNG, WebP up to 15MB each
        </span>
      </div>

      {/* Uploaded Photos Grid */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-[#475569]">
            <span className="font-semibold text-[#0F172A]">
              Uploaded Images ({files.length})
            </span>
            <span>Assign panel type and sequence to aid legal inspection classification</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {files.map((item, index) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-[#E2E8F0] bg-white shadow-2xs hover:border-[#CBD5E1] transition-colors"
              >
                <div className="size-16 rounded-md bg-[#F1F5F9] border border-[#E2E8F0] overflow-hidden shrink-0 flex items-center justify-center relative">
                  {item.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.previewUrl}
                      alt={item.file.name}
                      className="size-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="size-6 text-[#94A3B8]" />
                  )}
                </div>

                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-semibold text-[#0F172A] truncate" title={item.file.name}>
                      {item.file.name}
                    </span>
                    <div className="flex items-center gap-1">
                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => handleMove(index, "up")}
                          className="text-[#94A3B8] hover:text-[#1D4ED8] hover:bg-[#EFF6FF] p-1 rounded transition-colors cursor-pointer active:scale-90"
                          title="Move earlier"
                        >
                          <ArrowUp className="size-3" />
                        </button>
                      )}
                      {index < files.length - 1 && (
                        <button
                          type="button"
                          onClick={() => handleMove(index, "down")}
                          className="text-[#94A3B8] hover:text-[#1D4ED8] hover:bg-[#EFF6FF] p-1 rounded transition-colors cursor-pointer active:scale-90"
                          title="Move later"
                        >
                          <ArrowDown className="size-3" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemove(item.id)}
                        className="text-[#94A3B8] hover:text-[#DC2626] hover:bg-[#FEE2E2] p-1 rounded transition-colors cursor-pointer active:scale-90"
                        title="Remove image"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-[#94A3B8] font-mono">
                    <span>{item.sizeKb} KB</span>
                    <span>•</span>
                    <span>{item.dimensions || "Dimensions loading"}</span>
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <select
                      value={item.angle}
                      onChange={(e) => handleAngleChange(item.id, e.target.value as PackageImageAngle)}
                      className="text-[11px] h-6 px-1.5 rounded border border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#2563EB] flex-1 min-w-0"
                    >
                      {AVAILABLE_ANGLES.map((ang) => (
                        <option key={ang.value} value={ang.value}>
                          {ang.label}
                        </option>
                      ))}
                    </select>
                    <span className="text-[10px] font-bold text-[#15803D] bg-[#DCFCE7] px-2 py-0.5 rounded border border-[#86EFAC] shrink-0">
                      PASSED
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
