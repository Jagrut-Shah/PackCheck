"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Image as ImageIcon, AlertTriangle, CheckCircle2, Crosshair, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PackageImage } from "@/lib/types/image";
import { OCRResult } from "@/lib/types/ocr";
import { ComplianceFinding } from "@/lib/types/finding";

interface EvidenceViewerProps {
  images: PackageImage[];
  ocrResults: OCRResult[];
  findings: ComplianceFinding[];
  inspectionId?: string;
}

export const EvidenceViewer: React.FC<EvidenceViewerProps> = ({
  images,
  ocrResults,
  findings,
  inspectionId,
}) => {
  const [selectedImageId, setSelectedImageId] = useState<string>(
    images[0]?.id || "img_1"
  );
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null);
  const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null);
  const [isLoupeActive, setIsLoupeActive] = useState<boolean>(false);
  const [loupePos, setLoupePos] = useState<{ x: number; y: number; show: boolean }>({
    x: 0,
    y: 0,
    show: false,
  });

  const canvasRef = React.useRef<HTMLDivElement>(null);

  const selectedImage = images.find((img) => img.id === selectedImageId) || images[0];
  const ocrData = ocrResults.find((o) => o.imageId === selectedImageId) || ocrResults[0];
  const selectedBlock = ocrData?.blocks.find((b) => b.id === (activeHighlightId || hoveredBlockId));

  // Handle loupe movement over image
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isLoupeActive || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
      setLoupePos({ x, y, show: true });
    } else {
      setLoupePos((prev) => ({ ...prev, show: false }));
    }
  };

  const handleMouseLeave = () => {
    setLoupePos((prev) => ({ ...prev, show: false }));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left 2 Cols: Main Photographic Viewport with Bounding Box Overlays */}
      <div className="lg:col-span-2 flex flex-col gap-4">
        {/* Main Image Surface */}
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#F1F5F9] text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#0F172A]">Photographic Evidence Viewport</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F1F5F9] text-[#475569]">
                {selectedImage?.angle || "PANEL"}
              </span>
            </div>

            {/* Loupe Mode Toggle & Tool Status */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsLoupeActive(!isLoupeActive)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
                  isLoupeActive
                    ? "bg-[#1D4ED8] text-white shadow-xs ring-2 ring-[#2563EB]/40"
                    : "bg-[#F8FAFC] text-[#475569] border border-[#E2E8F0] hover:bg-[#EFF6FF] hover:text-[#1D4ED8] hover:border-[#BFDBFE]"
                }`}
                title="Toggle 2.5x Magnifier Loupe for packaging micro-text (Rule 7 font height check)"
              >
                <Crosshair className="size-3.5" />
                <span>{isLoupeActive ? "Loupe Active (2.5x)" : "Enable 2.5x Loupe"}</span>
              </button>

              <span className="hidden sm:inline text-[#94A3B8] text-[11px]">
                Hover to cross-corroborate
              </span>
            </div>
          </div>

          {/* Canvas / Viewport with Magnifier Support */}
          <div
            ref={canvasRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className={`relative mt-3 rounded-lg overflow-hidden border border-[#334155] bg-[#090D16] min-h-[380px] flex items-center justify-center select-none ${
              isLoupeActive ? "cursor-crosshair" : ""
            }`}
          >
            <div className="relative w-full h-[420px] bg-[#0F172A] flex flex-col items-center justify-center p-6 text-center overflow-hidden">
              {/* Background preview image if valid URL exists */}
              {selectedImage?.url && !selectedImage.url.startsWith("/mock-images") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedImage.url}
                  alt={selectedImage.fileName || "Package capture"}
                  className="absolute inset-0 size-full object-contain opacity-60 pointer-events-none"
                />
              ) : (
                <div className="flex flex-col items-center justify-center z-0 opacity-40">
                  <ImageIcon className="size-16 text-white mb-2" />
                  <p className="text-white text-xs font-semibold">{selectedImage?.fileName || "Package_Sample.jpg"}</p>
                  <p className="text-white/70 text-[11px] mt-0.5">High-Resolution Physical Packaging Audit Scan</p>
                </div>
              )}

              {/* Bounding Box Overlays with Interactive Hover Cross-Linking */}
              {ocrData?.blocks.map((blk) => {
                const isSelected = activeHighlightId === blk.id;
                const isHovered = hoveredBlockId === blk.id;
                const isHighlighted = isSelected || isHovered;

                const leftPct = Math.min(Math.max((blk.boundingBox.x / 1400) * 100, 5), 75);
                const topPct = Math.min(Math.max((blk.boundingBox.y / 1400) * 100, 8), 80);
                const widthPx = Math.min(Math.max(blk.boundingBox.width / 3, 140), 280);

                return (
                  <div
                    key={blk.id}
                    onClick={() => setActiveHighlightId(blk.id)}
                    onMouseEnter={() => setHoveredBlockId(blk.id)}
                    onMouseLeave={() => setHoveredBlockId(null)}
                    style={{
                      left: `${leftPct}%`,
                      top: `${topPct}%`,
                      width: `${widthPx}px`,
                      minHeight: "36px",
                    }}
                    className={`absolute cursor-pointer rounded-lg border transition-all duration-200 flex items-center px-2 py-1 text-[11px] font-mono shadow-sm ${
                      isHighlighted
                        ? "border-[#2563EB] bg-[#1D4ED8] text-white ring-4 ring-[#2563EB]/50 shadow-[0_0_24px_rgba(37,99,235,0.7)] font-bold scale-105 z-30"
                        : "border-[#3B82F6]/70 bg-[#0F172A]/85 text-[#EFF6FF] hover:border-[#60A5FA] hover:bg-[#1E40AF]/60 z-10"
                    }`}
                    title={`OCR Detected: ${blk.text}`}
                  >
                    <Crosshair className={`size-3 shrink-0 mr-1 ${isHighlighted ? "text-white" : "opacity-70 text-[#93C5FD]"}`} />
                    <span className="truncate">{blk.text}</span>
                  </div>
                );
              })}

              {/* 2.5x Magnifier Loupe Floating Lens */}
              {isLoupeActive && loupePos.show && (
                <div
                  style={{
                    left: `${loupePos.x - 90}px`,
                    top: `${loupePos.y - 90}px`,
                    width: "180px",
                    height: "180px",
                  }}
                  className="absolute pointer-events-none rounded-full border-2 border-white shadow-[0_0_0_2px_#2563EB,0_16px_36px_rgba(0,0,0,0.6)] overflow-hidden bg-[#090D16] z-50"
                >
                  {/* Magnified simulation background */}
                  <div
                    style={{
                      transform: `translate(-${loupePos.x * 2.5 - 90}px, -${loupePos.y * 2.5 - 90}px) scale(2.5)`,
                      transformOrigin: "top left",
                      width: "100%",
                      height: "100%",
                    }}
                    className="absolute inset-0 size-full flex items-center justify-center pointer-events-none"
                  >
                    {selectedImage?.url && !selectedImage.url.startsWith("/mock-images") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={selectedImage.url}
                        alt="Zoomed package"
                        className="max-w-none w-full h-full object-contain"
                      />
                    ) : (
                      <div className="text-white text-center p-4">
                        <ImageIcon className="size-8 mx-auto text-blue-400 mb-1" />
                        <span className="text-[9px] font-mono text-blue-200">Rule 7 Area Check</span>
                      </div>
                    )}
                  </div>

                  {/* Crosshair Reticle & Calibrated Metric Scale */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-full h-px bg-[#2563EB]/60" />
                    <div className="h-full w-px bg-[#2563EB]/60 absolute" />
                    <div className="size-8 rounded-full border border-[#60A5FA]/80 absolute" />
                    <span className="absolute bottom-2 text-[9px] font-mono font-bold text-white bg-[#0F172A]/90 px-1.5 py-0.5 rounded border border-[#2563EB]">
                      2.5x Loupe
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Panel Thumbnails Strip */}
          {images.length > 0 && (
            <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-1">
              {images.map((img) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => {
                    setSelectedImageId(img.id);
                    setActiveHighlightId(null);
                    setHoveredBlockId(null);
                  }}
                  className={`flex items-center gap-2 p-2 rounded-lg border text-left shrink-0 cursor-pointer transition-all duration-200 ease-out active:scale-95 ${
                    selectedImageId === img.id
                      ? "border-[#2563EB] bg-[#EFF6FF] text-[#1D4ED8] font-semibold ring-1 ring-[#2563EB] shadow-2xs"
                      : "border-[#E2E8F0] bg-white text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#1D4ED8] hover:border-[#CBD5E1] hover:-translate-y-0.5"
                  }`}
                >
                  <div className="size-8 rounded bg-[#E2E8F0] flex items-center justify-center shrink-0">
                    <ImageIcon className="size-4" />
                  </div>
                  <div className="flex flex-col text-[11px] leading-tight">
                    <span className="font-bold truncate max-w-[130px]">{img.fileName}</span>
                    <span className="text-[10px] text-[#94A3B8]">{img.angle}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected Evidence Inspector Box */}
        {selectedBlock && (
          <div className="rounded-xl border border-[#BFDBFE] bg-[#EFF6FF]/60 p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#BFDBFE] pb-2">
              <span className="text-xs font-bold text-[#1D4ED8]">
                Selected Region Evidence Details
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1D4ED8] text-white">
                CONFIDENCE: {Math.round(selectedBlock.confidence * 100)}%
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#475569]">Extracted Value</span>
                <p className="font-mono text-[#0F172A] font-bold mt-0.5">&quot;{selectedBlock.text}&quot;</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#475569]">Image Source</span>
                <p className="text-[#0F172A] font-medium mt-0.5">{selectedImage?.fileName}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#475569]">Bounding Box [X, Y, W, H]</span>
                <p className="font-mono text-[#0F172A] text-[11px] mt-0.5">
                  [{selectedBlock.boundingBox.x}, {selectedBlock.boundingBox.y}, {selectedBlock.boundingBox.width}, {selectedBlock.boundingBox.height}]
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Col: Detected OCR Snippets & Associated Findings */}
      <div className="flex flex-col gap-4">
        {/* Detected Text Snippets */}
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
            <h3 className="text-xs font-bold text-[#0F172A]">OCR Detected Text Blocks</h3>
            <span className="text-[10px] font-mono text-[#475569]">
              {ocrData?.blocks.length || 0} regions
            </span>
          </div>

          <div className="flex flex-col gap-2 mt-3 max-h-[380px] overflow-y-auto pr-1">
            {ocrData?.blocks.length === 0 ? (
              <p className="text-xs text-[#94A3B8] p-4 text-center">No OCR text blocks available for this image.</p>
            ) : (
              ocrData?.blocks.map((blk) => {
                const isSelected = activeHighlightId === blk.id;
                const isHovered = hoveredBlockId === blk.id;
                const isHighlighted = isSelected || isHovered;

                return (
                  <div
                    key={blk.id}
                    onClick={() => setActiveHighlightId(blk.id)}
                    onMouseEnter={() => setHoveredBlockId(blk.id)}
                    onMouseLeave={() => setHoveredBlockId(null)}
                    className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all duration-150 ${
                      isHighlighted
                        ? "border-[#2563EB] bg-[#EFF6FF] text-[#1D4ED8] font-semibold ring-2 ring-[#2563EB]/40 shadow-xs translate-x-1"
                        : "border-[#E2E8F0] bg-[#F8FAFC] hover:bg-white hover:border-[#CBD5E1] hover:shadow-2xs text-[#0F172A]"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                      <span className="text-[#64748B] flex items-center gap-1">
                        <Crosshair className="size-2.5" />
                        <span>{blk.id}</span>
                      </span>
                      <span className="font-bold text-[#15803D]">
                        {Math.round(blk.confidence * 100)}% conf
                      </span>
                    </div>
                    <p className="text-xs leading-snug">{blk.text}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Associated Statutory Findings */}
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-2">
            <h3 className="text-xs font-bold text-[#0F172A]">Connected Statutory Findings</h3>
            <span className="text-[10px] font-mono text-[#475569]">
              {findings.length} findings
            </span>
          </div>

          {findings.length === 0 ? (
            <div className="p-3 rounded-lg bg-[#DCFCE7] border border-[#86EFAC] text-xs text-[#166534] font-medium flex items-center gap-2">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>No statutory infractions flagged for this inspection.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {findings.map((f) => (
                <div
                  key={f.id}
                  className="p-3 rounded-lg border border-[#FCA5A5] bg-[#FEE2E2]/35 space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#991B1B]">{f.title}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white text-[#991B1B] font-bold border border-[#FCA5A5]">
                      {f.ruleNumber}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#475569]">{f.description}</p>
                  <div className="pt-1 text-[10px] text-[#0F172A] font-medium flex items-center justify-between">
                    <span>Observed: &quot;{f.observedValue || "N/A"}&quot;</span>
                    {f.statutoryReference && (
                      <span className="text-[#1D4ED8]">{f.statutoryReference}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {inspectionId && (
            <div className="pt-2 border-t border-[#F1F5F9]">
              <Link href={`/inspections/${inspectionId}/report`}>
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full"
                  rightIcon={<ArrowRight className="size-3.5" />}
                >
                  Continue to Verification Report
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
