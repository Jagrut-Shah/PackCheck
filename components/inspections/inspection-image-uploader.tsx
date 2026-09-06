"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  UploadCloud,
  Camera,
  FolderOpen,
  X,
  Image as ImageIcon,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Loader2,
  RefreshCw,
  SwitchCamera,
} from "lucide-react";
import { PackageImageAngle, ImageQualityMetrics } from "@/lib/types/image";
import {
  analyzeImageQuality,
  ImageQualityAnalysisResult,
} from "@/lib/image/quality-analyzer";

export interface UploadedFileItem {
  id: string;
  file: File;
  previewUrl: string;
  angle: PackageImageAngle;
  sizeKb: number;
  dimensions?: string;
  qualityStatus: "CHECKING" | "GOOD" | "BORDERLINE" | "POOR" | "UNAVAILABLE";
  qualityScore: number;
  qualityReasons: string[];
  qualityMetrics?: ImageQualityMetrics;
  qualityStatusPlaceholder?: "PASSED" | "PENDING";
  isCameraCapture?: boolean;
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

const DEFAULT_ANGLE_SEQUENCE: PackageImageAngle[] = [
  "PRINCIPAL_DISPLAY_PANEL",
  "BACK",
  "MRP_PANEL",
  "INGREDIENTS_PANEL",
  "SIDE_LEFT",
  "SIDE_RIGHT",
  "TOP",
  "BOTTOM",
];

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getImageDimensions(file: File): Promise<string> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve("1920 × 1080 px");
      return;
    }
    try {
      const tempUrl = URL.createObjectURL(file);
      const img = new window.Image();
      const timer = setTimeout(() => {
        try {
          URL.revokeObjectURL(tempUrl);
        } catch {}
        resolve("Dimensions loaded");
      }, 1500);

      img.onload = () => {
        clearTimeout(timer);
        try {
          URL.revokeObjectURL(tempUrl);
        } catch {}
        resolve(`${img.naturalWidth} × ${img.naturalHeight} px`);
      };

      img.onerror = () => {
        clearTimeout(timer);
        try {
          URL.revokeObjectURL(tempUrl);
        } catch {}
        resolve("1920 × 1080 px");
      };

      img.src = tempUrl;
    } catch {
      resolve("1920 × 1080 px");
    }
  });
}

export const InspectionImageUploader: React.FC<InspectionImageUploaderProps> = ({
  files,
  onFilesChange,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Keep a synchronized ref to prevent stale-closure bugs during async quality checks
  const filesRef = useRef(files);
  filesRef.current = files;

  const updateFiles = (next: UploadedFileItem[]) => {
    filesRef.current = next;
    onFilesChange(next);
  };

  // Camera State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isCameraInitializing, setIsCameraInitializing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  // Camera Capture Preview & Confirmation State
  const [capturedPreviewUrl, setCapturedPreviewUrl] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);

  // Target Slot for Retake or Replace (null means adding a new photo)
  const [targetSlotId, setTargetSlotId] = useState<string | null>(null);

  // DOM Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const replaceFileInputRef = useRef<HTMLInputElement | null>(null);
  const trackedObjectUrlsRef = useRef<Set<string>>(new Set());

  // Check for camera devices on mount
  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
          const videoInputs = devices.filter((d) => d.kind === "videoinput");
          setHasMultipleCameras(videoInputs.length > 1);
        })
        .catch(() => {});
    }
  }, []);

  // Cleanup object URLs on unmount
  useEffect(() => {
    const urls = trackedObjectUrlsRef.current;
    return () => {
      urls.forEach((url) => {
        if (url.startsWith("blob:")) {
          URL.revokeObjectURL(url);
        }
      });
      urls.clear();
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [cameraStream]);

  // Connect video stream to video element when stream or modal changes
  useEffect(() => {
    if (isCameraOpen && cameraStream && videoRef.current && !capturedPreviewUrl) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(() => {});
    }
  }, [isCameraOpen, cameraStream, capturedPreviewUrl]);

  // ==========================================================================
  // CAMERA WORKFLOW
  // ==========================================================================

  const startCamera = async (targetFacing: "environment" | "user" = facingMode) => {
    setCameraError(null);
    setIsCameraInitializing(true);
    setCapturedPreviewUrl(null);
    setCapturedBlob(null);

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        "Camera access is not supported on this browser. Please choose an image from your device."
      );
      setIsCameraInitializing(false);
      return;
    }

    try {
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: targetFacing },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      setCameraStream(stream);
      setFacingMode(targetFacing);
      setIsCameraInitializing(false);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (err: unknown) {
      setIsCameraInitializing(false);
      const errorObj = err as { name?: string; message?: string };
      console.warn("Camera access failed:", errorObj);

      if (
        errorObj.name === "NotAllowedError" ||
        errorObj.name === "PermissionDeniedError"
      ) {
        setCameraError(
          "Camera access was blocked. Please allow camera permissions in your browser or choose a photo from your device."
        );
      } else if (
        errorObj.name === "NotFoundError" ||
        errorObj.name === "DevicesNotFoundError"
      ) {
        setCameraError(
          "No camera found on this device. Please choose a photo from your device."
        );
      } else if (
        errorObj.name === "NotReadableError" ||
        errorObj.name === "TrackStartError"
      ) {
        setCameraError(
          "Camera is currently unavailable or in use by another application. Please choose from device."
        );
      } else {
        setCameraError(
          "Camera access failed. Please check permissions or choose an image from your device."
        );
      }
    }
  };

  const openCameraModal = (slotId?: string) => {
    setTargetSlotId(slotId || null);
    setIsCameraOpen(true);
    startCamera(facingMode);
  };

  const toggleCameraFacing = () => {
    const nextFacing = facingMode === "environment" ? "user" : "environment";
    startCamera(nextFacing);
  };

  const closeCameraModal = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
    if (capturedPreviewUrl) {
      URL.revokeObjectURL(capturedPreviewUrl);
      trackedObjectUrlsRef.current.delete(capturedPreviewUrl);
      setCapturedPreviewUrl(null);
    }
    setCapturedBlob(null);
    setIsCameraOpen(false);
    setTargetSlotId(null);
    setCameraError(null);
    setIsCameraInitializing(false);
  };

  const capturePhotoFrame = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const preview = URL.createObjectURL(blob);
        trackedObjectUrlsRef.current.add(preview);
        setCapturedBlob(blob);
        setCapturedPreviewUrl(preview);
      },
      "image/jpeg",
      0.92
    );
  };

  const retakeCapturedFrame = () => {
    if (capturedPreviewUrl) {
      URL.revokeObjectURL(capturedPreviewUrl);
      trackedObjectUrlsRef.current.delete(capturedPreviewUrl);
    }
    setCapturedBlob(null);
    setCapturedPreviewUrl(null);
    if (videoRef.current && cameraStream) {
      videoRef.current.play().catch(() => {});
    }
  };

  const confirmCapturedPhoto = () => {
    if (!capturedBlob) return;

    const angleHint = targetSlotId
      ? filesRef.current.find((f) => f.id === targetSlotId)?.angle || "package"
      : "package";
    const filename = `camera_${angleHint.toLowerCase()}_${Date.now()}.jpg`;
    const photoFile = new File([capturedBlob], filename, { type: "image/jpeg" });

    const slotToUpdate = targetSlotId;
    closeCameraModal();

    if (slotToUpdate) {
      handleReplaceSlotFile(slotToUpdate, photoFile, true);
    } else {
      addNewFiles([photoFile], true);
    }
  };

  // ==========================================================================
  // QUALITY EVALUATION RUNNER (Uses filesRef to avoid stale closure wipes)
  // ==========================================================================

  const runQualityEvaluation = async (
    itemId: string,
    file: File
  ): Promise<void> => {
    try {
      const result: ImageQualityAnalysisResult = await analyzeImageQuality(file);

      const updated = filesRef.current.map((item) => {
        if (item.id !== itemId) return item;
        return {
          ...item,
          qualityStatus: result.status,
          qualityScore: result.score,
          qualityReasons: result.reasons,
          qualityMetrics: result.metrics,
          qualityStatusPlaceholder: result.status === "POOR" ? ("PENDING" as const) : ("PASSED" as const),
        };
      });
      updateFiles(updated);
    } catch (err) {
      console.error("Quality analysis failed for image:", itemId, err);
      const updated = filesRef.current.map((item) => {
        if (item.id !== itemId) return item;
        return {
          ...item,
          qualityStatus: "UNAVAILABLE" as const,
          qualityScore: 0,
          qualityReasons: ["Quality check could not be completed."],
          qualityStatusPlaceholder: "PENDING" as const,
        };
      });
      updateFiles(updated);
    }
  };

  // ==========================================================================
  // ADDING NEW FILES (Device or Camera)
  // ==========================================================================

  const addNewFiles = (validFiles: File[], isCamera: boolean = false) => {
    const currentFiles = filesRef.current;
    const startIndex = currentFiles.length;

    // Build new items synchronously so UI updates immediately
    const newItems: UploadedFileItem[] = validFiles.map((file, idx) => {
      const previewUrl = URL.createObjectURL(file);
      trackedObjectUrlsRef.current.add(previewUrl);

      const totalIndex = startIndex + idx;
      const defaultAngle =
        totalIndex < DEFAULT_ANGLE_SEQUENCE.length
          ? DEFAULT_ANGLE_SEQUENCE[totalIndex]
          : "OTHER";

      return {
        id: `img_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
        file,
        previewUrl,
        angle: defaultAngle,
        sizeKb: Math.round(file.size / 1024),
        dimensions: undefined,
        qualityStatus: "CHECKING" as const, // Strict flow: never PASSED immediately
        qualityScore: 0,
        qualityReasons: [],
        isCameraCapture: isCamera,
        qualityStatusPlaceholder: "PENDING" as const,
      };
    });

    // Immediately render items in UI in "CHECKING" state!
    const updatedFiles = [...filesRef.current, ...newItems];
    updateFiles(updatedFiles);

    // Concurrently fetch dimensions and quality analysis
    for (const item of newItems) {
      getImageDimensions(item.file).then((dims) => {
        const next = filesRef.current.map((f) =>
          f.id === item.id ? { ...f, dimensions: dims } : f
        );
        updateFiles(next);
      });

      runQualityEvaluation(item.id, item.file);
    }
  };

  const handleDeviceFileSelection = (selectedFiles: FileList | File[] | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;
    setUploadError(null);

    // Clone files out of the live FileList immediately before any browser reset
    const fileList = Array.from(selectedFiles);
    if (fileList.length === 0) return;

    const validFiles: File[] = [];
    const oversizedFiles: string[] = [];

    for (const f of fileList) {
      if (f.size > MAX_FILE_SIZE_BYTES) {
        oversizedFiles.push(`${f.name} (${formatFileSize(f.size)})`);
      } else {
        validFiles.push(f);
      }
    }

    if (oversizedFiles.length > 0) {
      setUploadError(
        `The following file(s) exceed the 15MB size limit: ${oversizedFiles.join(", ")}`
      );
    }

    if (validFiles.length > 0) {
      addNewFiles(validFiles, false);
    }
  };

  // ==========================================================================
  // RETAKE & REPLACE WORKFLOW (Slot-Specific)
  // ==========================================================================

  const handleReplaceSlotFile = (
    slotId: string,
    newFile: File,
    isCamera: boolean = false
  ) => {
    const existing = filesRef.current.find((f) => f.id === slotId);
    if (!existing) return;

    // Revoke old blob URL to free memory and guarantee old image is superseded
    if (existing.previewUrl && existing.previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(existing.previewUrl);
      trackedObjectUrlsRef.current.delete(existing.previewUrl);
    }

    // Strict requirement: Panel / Angle MUST survive retake/replace!
    const preservedAngle = existing.angle;
    const newPreviewUrl = URL.createObjectURL(newFile);
    trackedObjectUrlsRef.current.add(newPreviewUrl);

    // Immediately replace slot with status CHECKING (never immediate PASSED)
    const updatedFiles: UploadedFileItem[] = filesRef.current.map((item) => {
      if (item.id !== slotId) return item;
      return {
        ...item,
        file: newFile,
        previewUrl: newPreviewUrl,
        angle: preservedAngle, // PANEL PRESERVED!
        sizeKb: Math.round(newFile.size / 1024),
        dimensions: undefined,
        qualityStatus: "CHECKING" as const,
        qualityScore: 0,
        qualityReasons: [],
        qualityMetrics: undefined,
        qualityStatusPlaceholder: "PENDING" as const,
        isCameraCapture: isCamera,
      };
    });

    updateFiles(updatedFiles);

    // Concurrently fetch dimensions
    getImageDimensions(newFile).then((dims) => {
      const next = filesRef.current.map((f) =>
        f.id === slotId ? { ...f, dimensions: dims } : f
      );
      updateFiles(next);
    });

    // Run fresh quality evaluation on the replacement image
    runQualityEvaluation(slotId, newFile);
  };

  const triggerSlotDeviceReplacement = (slotId: string) => {
    setTargetSlotId(slotId);
    if (replaceFileInputRef.current) {
      replaceFileInputRef.current.value = "";
      replaceFileInputRef.current.click();
    }
  };

  // ==========================================================================
  // REMOVE, MOVE, ANGLE EDIT
  // ==========================================================================

  const handleRemove = (id: string) => {
    const item = filesRef.current.find((f) => f.id === id);
    if (item?.previewUrl && item.previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(item.previewUrl);
      trackedObjectUrlsRef.current.delete(item.previewUrl);
    }
    updateFiles(filesRef.current.filter((f) => f.id !== id));
  };

  const handleAngleChange = (id: string, newAngle: PackageImageAngle) => {
    updateFiles(
      filesRef.current.map((f) => (f.id === id ? { ...f, angle: newAngle } : f))
    );
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    const newFiles = [...filesRef.current];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newFiles.length) return;
    const temp = newFiles[index];
    newFiles[index] = newFiles[targetIndex];
    newFiles[targetIndex] = temp;
    updateFiles(newFiles);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Hidden slot replace file picker */}
      <input
        ref={replaceFileInputRef}
        type="file"
        accept="image/*,image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          const slotId = targetSlotId;
          e.target.value = "";
          if (file && slotId) {
            if (file.size > MAX_FILE_SIZE_BYTES) {
              setUploadError(`Selected file exceeds 15MB limit: ${formatFileSize(file.size)}`);
              return;
            }
            handleReplaceSlotFile(slotId, file, false);
          }
          setTargetSlotId(null);
        }}
      />

      {/* Upload Warning / Error Alert */}
      {uploadError && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-[#FCA5A5] bg-[#FEE2E2] text-xs text-[#991B1B]">
          <AlertCircle className="size-4 shrink-0" />
          <span>{uploadError}</span>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="ml-auto text-[#991B1B] hover:text-[#7F1D1D] text-xs font-semibold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Hero Upload & Camera Capture Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          handleDeviceFileSelection(e.dataTransfer.files);
        }}
        className={`relative flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed transition-colors duration-150 text-center ${
          isDragOver
            ? "border-[#2563EB] bg-[#EFF6FF]/70"
            : "border-[#CBD5E1] bg-[#F8FAFC] hover:bg-[#F1F5F9] hover:border-[#94A3B8]"
        }`}
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="size-11 rounded-full bg-[#EFF6FF] text-[#1D4ED8] flex items-center justify-center shadow-2xs">
            <Camera className="size-5.5" />
          </div>
          <div className="size-11 rounded-full bg-[#F1F5F9] text-[#475569] flex items-center justify-center shadow-2xs">
            <UploadCloud className="size-5.5" />
          </div>
        </div>

        <h3 className="text-sm font-bold text-[#0F172A]">
          Add Package Photo
        </h3>
        <p className="text-xs text-[#475569] mt-1 max-w-md">
          Capture packaging declarations with your device camera or choose existing image files. Drag and drop also supported.
        </p>

        {/* Dual Primary Action Buttons: [ Take Photo ] and [ Choose from Device ] */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          {/* Action A: Take Photo via Camera */}
          <button
            type="button"
            onClick={() => openCameraModal()}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-linear-to-b from-[#2563EB] via-[#1D4ED8] to-[#1E40AF] text-white text-xs font-semibold border border-[#1E40AF] shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_1px_3px_rgba(29,78,216,0.3)] hover:from-[#3B82F6] hover:via-[#2563EB] hover:to-[#1D4ED8] hover:shadow-[0_4px_16px_rgba(29,78,216,0.35),inset_0_1px_0_rgba(255,255,255,0.3)] hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-150 cursor-pointer select-none"
          >
            <Camera className="size-4" />
            <span>Take Photo</span>
          </button>

          {/* Action B: Choose from Device (Native HTML Label wrapping hidden input) */}
          <label className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-white text-[#0F172A] text-xs font-semibold border border-[#CBD5E1] shadow-2xs hover:bg-[#F8FAFC] hover:border-[#94A3B8] hover:text-[#1D4ED8] active:scale-[0.98] transition-all duration-150 cursor-pointer select-none">
            <input
              type="file"
              multiple
              accept="image/*,image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const targetFiles = e.target.files;
                handleDeviceFileSelection(targetFiles);
                e.target.value = "";
              }}
            />
            <FolderOpen className="size-4 text-[#475569]" />
            <span>Choose from Device</span>
          </label>
        </div>

        <span className="text-[10px] text-[#94A3B8] mt-2 font-mono">
          JPEG, PNG, WebP up to 15MB each (multi-image panel capture supported)
        </span>
      </div>

      {/* ==================================================================== */}
      {/* CAMERA CAPTURE MODAL / VIEWFINDER */}
      {/* ==================================================================== */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl rounded-2xl bg-[#0B0F17] border border-[#334155] shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1E293B] bg-[#0F172A]/90 text-white">
              <div className="flex items-center gap-2">
                <Camera className="size-4 text-[#60A5FA]" />
                <span className="text-xs font-bold">
                  {targetSlotId ? "Retake Package Photo" : "Take Package Photo"}
                </span>
                {targetSlotId && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1E293B] text-[#94A3B8] border border-[#334155]">
                    Slot: {filesRef.current.find((f) => f.id === targetSlotId)?.angle || "Evidence"}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {hasMultipleCameras && !capturedPreviewUrl && (
                  <button
                    type="button"
                    onClick={toggleCameraFacing}
                    className="p-1.5 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#1E293B] transition-colors cursor-pointer"
                    title="Flip camera"
                  >
                    <SwitchCamera className="size-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={closeCameraModal}
                  className="p-1.5 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#1E293B] transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* Viewfinder Body */}
            <div className="relative w-full aspect-4/3 bg-black flex items-center justify-center overflow-hidden">
              {/* Permission Denied or Camera Error View */}
              {cameraError ? (
                <div className="p-6 text-center max-w-sm space-y-3">
                  <div className="size-12 rounded-full bg-[#FEE2E2] text-[#DC2626] mx-auto flex items-center justify-center">
                    <AlertTriangle className="size-6" />
                  </div>
                  <h4 className="text-sm font-bold text-white">Camera Access Error</h4>
                  <p className="text-xs text-[#94A3B8]">{cameraError}</p>
                  <div className="flex flex-col gap-2 pt-2">
                    <label className="w-full inline-flex items-center justify-center h-8 px-3 rounded-lg bg-[#2563EB] text-white text-xs font-semibold hover:bg-[#1D4ED8] transition-colors cursor-pointer">
                      <input
                        type="file"
                        multiple={!targetSlotId}
                        accept="image/*,image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const targetFiles = e.target.files;
                          closeCameraModal();
                          if (targetSlotId && targetFiles?.[0]) {
                            handleReplaceSlotFile(targetSlotId, targetFiles[0], false);
                          } else if (targetFiles) {
                            handleDeviceFileSelection(targetFiles);
                          }
                          e.target.value = "";
                        }}
                      />
                      <span>Choose from Device Instead</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => startCamera(facingMode)}
                      className="w-full h-8 px-3 rounded-lg bg-[#1E293B] text-white text-xs font-semibold hover:bg-[#334155] transition-colors cursor-pointer"
                    >
                      Retry Camera
                    </button>
                  </div>
                </div>
              ) : isCameraInitializing ? (
                <div className="flex flex-col items-center justify-center gap-2 text-white/80">
                  <Loader2 className="size-8 animate-spin text-[#60A5FA]" />
                  <span className="text-xs font-medium">Starting camera stream...</span>
                </div>
              ) : capturedPreviewUrl ? (
                /* Captured Frame Preview View */
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={capturedPreviewUrl}
                  alt="Captured snapshot preview"
                  className="size-full object-contain"
                />
              ) : (
                /* Live Camera Stream with Package Framing Overlay */
                <div className="relative size-full flex items-center justify-center">
                  <video
                    ref={videoRef}
                    playsInline
                    autoPlay
                    muted
                    className="size-full object-contain"
                  />
                  {/* Framing Guide for Packaging Label Alignment */}
                  <div className="absolute inset-8 border-2 border-dashed border-white/50 rounded-xl pointer-events-none flex flex-col justify-between p-3">
                    <div className="flex justify-between text-[10px] font-mono text-white/70 bg-black/40 px-2 py-0.5 rounded self-start">
                      <span>Position package inside frame</span>
                    </div>
                    <div className="text-[10px] font-mono text-white/70 bg-black/40 px-2 py-0.5 rounded self-end">
                      <span>Ensure text & MRP are clear</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Controls Footer */}
            <div className="p-4 border-t border-[#1E293B] bg-[#0F172A] flex items-center justify-between gap-3">
              {capturedPreviewUrl ? (
                /* Actions after capture: Retake or Confirm */
                <>
                  <button
                    type="button"
                    onClick={retakeCapturedFrame}
                    className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#1E293B] text-white text-xs font-semibold hover:bg-[#334155] transition-colors cursor-pointer"
                  >
                    <RotateCcw className="size-3.5" />
                    <span>Retake</span>
                  </button>

                  <button
                    type="button"
                    onClick={confirmCapturedPhoto}
                    className="inline-flex items-center gap-1.5 h-9 px-5 rounded-lg bg-linear-to-b from-[#16A34A] to-[#15803D] text-white text-xs font-bold shadow-md hover:from-[#22C55E] hover:to-[#16A34A] active:scale-95 transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="size-4" />
                    <span>Use Photo</span>
                  </button>
                </>
              ) : !cameraError && !isCameraInitializing ? (
                /* Action to snap frame */
                <>
                  <button
                    type="button"
                    onClick={closeCameraModal}
                    className="h-9 px-4 rounded-lg bg-[#1E293B] text-white text-xs font-semibold hover:bg-[#334155] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={capturePhotoFrame}
                    className="inline-flex items-center gap-2 h-10 px-6 rounded-full bg-white text-[#0F172A] text-xs font-bold shadow-lg hover:bg-[#F1F5F9] active:scale-95 transition-all cursor-pointer ring-4 ring-white/20"
                  >
                    <div className="size-3 rounded-full bg-[#DC2626] animate-pulse" />
                    <span>Capture Photo</span>
                  </button>

                  <label className="text-xs text-[#94A3B8] hover:text-white underline cursor-pointer">
                    <input
                      type="file"
                      multiple={!targetSlotId}
                      accept="image/*,image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const targetFiles = e.target.files;
                        closeCameraModal();
                        if (targetSlotId && targetFiles?.[0]) {
                          handleReplaceSlotFile(targetSlotId, targetFiles[0], false);
                        } else if (targetFiles) {
                          handleDeviceFileSelection(targetFiles);
                        }
                        e.target.value = "";
                      }}
                    />
                    <span>Choose from Device</span>
                  </label>
                </>
              ) : (
                <button
                  type="button"
                  onClick={closeCameraModal}
                  className="w-full h-8 px-4 rounded-lg bg-[#1E293B] text-white text-xs font-semibold hover:bg-[#334155] transition-colors cursor-pointer"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* UPLOADED / CAPTURED PHOTOS GRID (Multi-slot with Quality & Retake) */}
      {/* ==================================================================== */}
      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-[#475569]">
            <span className="font-semibold text-[#0F172A]">
              Package Photos & Evidence ({files.length})
            </span>
            <span className="hidden sm:inline">
              Each slot is independently analyzed for clarity before OCR.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {files.map((item, index) => {
              const isChecking = item.qualityStatus === "CHECKING";
              const isGood = item.qualityStatus === "GOOD";
              const isBorderline = item.qualityStatus === "BORDERLINE";
              const isPoor = item.qualityStatus === "POOR";
              const isUnavailable = item.qualityStatus === "UNAVAILABLE";

              return (
                <div
                  key={item.id}
                  className={`flex flex-col gap-2.5 p-3.5 rounded-xl border transition-all ${
                    isPoor
                      ? "border-[#FCA5A5] bg-[#FEF2F2]/60 shadow-xs"
                      : isBorderline
                      ? "border-[#FDE68A] bg-[#FFFBEB]/60 shadow-xs"
                      : "border-[#E2E8F0] bg-white shadow-2xs hover:border-[#CBD5E1]"
                  }`}
                >
                  {/* Top Bar: Thumbnail + Metadata + Move/Remove */}
                  <div className="flex items-start gap-3">
                    <div className="size-18 rounded-lg bg-[#F1F5F9] border border-[#E2E8F0] overflow-hidden shrink-0 flex items-center justify-center relative shadow-2xs">
                      {item.previewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.previewUrl}
                          alt={item.file.name}
                          className="size-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="size-7 text-[#94A3B8]" />
                      )}
                      {item.isCameraCapture && (
                        <span
                          className="absolute bottom-0.5 right-0.5 p-0.5 rounded bg-black/70 text-white"
                          title="Captured via camera"
                        >
                          <Camera className="size-3" />
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className="text-xs font-bold text-[#0F172A] truncate"
                          title={item.file.name}
                        >
                          {item.file.name}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
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
                            title="Remove photo"
                          >
                            <X className="size-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-[10px] text-[#64748B] font-mono">
                        <span>{formatFileSize(item.file.size)}</span>
                        <span>•</span>
                        <span>{item.dimensions || "Dimensions loading..."}</span>
                      </div>

                      {/* Panel Selector (Belongs to slot) */}
                      <div className="flex items-center gap-2 mt-1">
                        <select
                          value={item.angle}
                          onChange={(e) =>
                            handleAngleChange(item.id, e.target.value as PackageImageAngle)
                          }
                          className="text-[11px] h-6 px-1.5 rounded border border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#2563EB] flex-1 min-w-0 font-medium cursor-pointer"
                        >
                          {AVAILABLE_ANGLES.map((ang) => (
                            <option key={ang.value} value={ang.value}>
                              {ang.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Quality Status Badge & Progress */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#F1F5F9]">
                    <span className="text-[10px] font-semibold text-[#64748B]">
                      Image Quality:
                    </span>

                    {isChecking ? (
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#1D4ED8] bg-[#EFF6FF] px-2 py-0.5 rounded border border-[#BFDBFE] animate-pulse">
                        <Loader2 className="size-3 animate-spin" />
                        <span>Checking image quality...</span>
                      </span>
                    ) : isGood ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#15803D] bg-[#DCFCE7] px-2 py-0.5 rounded border border-[#86EFAC]">
                        <CheckCircle2 className="size-3" />
                        <span>Good</span>
                      </span>
                    ) : isBorderline ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#B45309] bg-[#FEF3C7] px-2 py-0.5 rounded border border-[#FDE68A]">
                        <AlertTriangle className="size-3" />
                        <span>Borderline</span>
                      </span>
                    ) : isPoor ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#B91C1C] bg-[#FEE2E2] px-2 py-0.5 rounded border border-[#FCA5A5]">
                        <XCircle className="size-3" />
                        <span>Poor quality</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#475569] bg-[#F1F5F9] px-2 py-0.5 rounded border border-[#CBD5E1]">
                        <span>Quality check unavailable</span>
                      </span>
                    )}
                  </div>

                  {/* Retake Recommended Banner & Reasons (Shown for POOR or BORDERLINE) */}
                  {(isPoor || isBorderline) && (
                    <div className="p-2.5 rounded-lg border border-[#FCA5A5] bg-white space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[#B91C1C] font-bold text-[11px]">
                          <AlertTriangle className="size-3.5 shrink-0" />
                          <span>Retake recommended</span>
                        </div>
                        <span className="text-[10px] text-[#64748B]">
                          Slot preserved: <strong className="text-[#0F172A]">{item.angle}</strong>
                        </span>
                      </div>

                      {/* Friendly non-technical reasons */}
                      {item.qualityReasons.length > 0 && (
                        <ul className="space-y-0.5 text-[11px] text-[#475569] pl-3 list-disc marker:text-[#DC2626]">
                          {item.qualityReasons.map((reason, rIdx) => (
                            <li key={rIdx}>{reason}</li>
                          ))}
                        </ul>
                      )}

                      {/* Slot Retake / Replace Actions */}
                      <div className="pt-1 flex items-center gap-2">
                        {/* Retake Photo (Camera) */}
                        <button
                          type="button"
                          onClick={() => openCameraModal(item.id)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 h-7 px-2.5 rounded-md bg-[#2563EB] text-white text-[11px] font-semibold hover:bg-[#1D4ED8] active:scale-95 transition-all cursor-pointer shadow-2xs"
                        >
                          <Camera className="size-3" />
                          <span>Retake Photo</span>
                        </button>

                        {/* Replace Photo (Device File) */}
                        <button
                          type="button"
                          onClick={() => triggerSlotDeviceReplacement(item.id)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 h-7 px-2.5 rounded-md bg-white border border-[#CBD5E1] text-[#0F172A] text-[11px] font-semibold hover:bg-[#F8FAFC] hover:border-[#94A3B8] active:scale-95 transition-all cursor-pointer shadow-2xs"
                        >
                          <FolderOpen className="size-3 text-[#475569]" />
                          <span>Replace Photo</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Unavailable Fallback Action */}
                  {isUnavailable && (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-[#64748B]">
                        Analysis did not complete.
                      </span>
                      <button
                        type="button"
                        onClick={() => runQualityEvaluation(item.id, item.file)}
                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#1D4ED8] hover:underline cursor-pointer"
                      >
                        <RefreshCw className="size-2.5" />
                        <span>Check Again</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
