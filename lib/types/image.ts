/**
 * PackCheck AI - Image & Quality Contracts
 * Shared interface for package image capture, storage references, and pre-OCR quality evaluation.
 */

import { ImageQualityStatus } from "./common";

/**
 * Standardized package image panel types.
 */
export type PackageImageType =
  | "FRONT"
  | "BACK"
  | "SIDE"
  | "TOP"
  | "BOTTOM"
  | "LABEL_CLOSEUP"
  | "SIDE_LEFT"
  | "SIDE_RIGHT"
  | "PRINCIPAL_DISPLAY_PANEL"
  | "MRP_PANEL"
  | "INGREDIENTS_PANEL"
  | "OTHER";

export type PackageImageAngle = PackageImageType;

/**
 * Pre-OCR image quality metrics evaluated by the preprocessing pipeline (e.g. OpenCV).
 */
export interface ImageQualityMetrics {
  blur: number;             // 0.0 (very blurry) to 1.0 (sharp)
  brightness: number;       // 0.0 (under-exposed) to 1.0 (optimal)
  glare: number;            // 0.0 (severe specular reflection) to 1.0 (clean)
  resolution: number;       // 0.0 (inadequate DPI) to 1.0 (high resolution)
  readability: number;      // 0.0 (unreadable) to 1.0 (clean contrast)
  issuesDetected?: string[];
  // Legacy aliases for backwards compatibility
  blurScore?: number;
  glareScore?: number;
  lightingScore?: number;
  resolutionScore?: number;
}

/**
 * Canonical Inspection Image contract.
 * Represents an uploaded commodity package photograph across Frontend, API, and OCR services.
 */
export interface InspectionImage {
  id: string;
  inspectionId: string;
  filename: string;
  storagePath: string;
  imageType: PackageImageType;
  width?: number;
  height?: number;
  fileSize: number; // in bytes
  qualityStatus: ImageQualityStatus;
  qualityScore?: number; // overall aggregated score 0.0 to 1.0
  qualityMetrics?: ImageQualityMetrics;
  uploadedAt: string; // ISO 8601 string

  // UI / Frontend compatibility properties
  url?: string;
  fileName?: string;
  fileSizeBytes?: number;
  mimeType?: string;
  angle?: PackageImageAngle;
  thumbnailUrl?: string;
}

/**
 * Alias for InspectionImage ensuring backwards compatibility with existing UI components.
 */
export type PackageImage = InspectionImage;

/**
 * Payload sent by Frontend / Mobile when uploading new inspection photos.
 */
export interface ImageUploadPayload {
  inspectionId: string;
  imageType: PackageImageType;
  file: File | Blob;
}
