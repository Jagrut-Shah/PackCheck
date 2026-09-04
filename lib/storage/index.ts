/**
 * PackCheck AI - Storage Module
 * Owner: Vijay (Backend)
 * Purpose: Package image upload to cloud storage (Supabase Storage / S3).
 */

export interface StorageUploadResult {
  fileKey: string;
  publicUrl: string;
}

export async function uploadPackageImage(
  _inspectionId: string,
  _file: File | Blob,
  fileName: string
): Promise<StorageUploadResult> {
  // Reserved for Supabase Storage integration
  return {
    fileKey: `inspections/${fileName}`,
    publicUrl: `/mock-images/${fileName}`,
  };
}
