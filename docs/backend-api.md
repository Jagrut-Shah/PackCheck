# PackCheck AI — Backend API Reference & Contract

This document specifies the live, working REST API routes implemented in Next.js App Router (`app/api/`) backed by Supabase Database, Authentication, and Storage.

All API responses follow the standard `ApiResponse<T>` envelope:
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional human-readable message",
  "error": {
    "code": "ERROR_CODE_STRING",
    "message": "Human readable error description",
    "details": "Optional low-level diagnostics"
  }
}
```

---

## 1. System Health Check

### `GET /api/health`
- **Purpose**: Verifies that the Next.js API server and Supabase database connection are operational.
- **Authentication**: Public.
- **Request**: None.
- **Response**:
  ```json
  {
    "success": true,
    "data": null,
    "message": "Connected to Supabase"
  }
  ```
- **Errors**:
  - `500 DB_CONNECTION_FAILED`: Database query failed or Supabase connection unreachable.

---

## 2. Inspections Ingestion & List

### `GET /api/inspections`
- **Purpose**: Fetch paginated inspection history with violation counts.
- **Authentication**: Public (Session verification to be enforced in auth step).
- **Query Parameters**:
  - `limit` (optional, default `10`): Number of items per page.
  - `offset` (optional, default `0`): Pagination offset.
  - `status` (optional): Filter by inspection status (`PENDING`, `REVIEWING`, `COMPLETED`).
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "inspections": [
        {
          "inspection_id": "3c708af4-7b5e-474f-b4a8-f900c17e3413",
          "product_type": "Packaged Snacks",
          "status": "COMPLETED",
          "violation_count": 1,
          "created_at": "2026-09-04T10:23:42.8"
        }
      ],
      "total": 2,
      "limit": 10,
      "offset": 0
    }
  }
  ```

---

### `POST /api/inspections`
- **Purpose**: Create a new commodity inspection record and upload package images to Supabase Storage (`product-images` bucket).
- **Authentication**: Requires `inspector_id` in form payload. Authenticated-user-derived `inspector_id` will be automatically linked in the authentication integration step.
- **Request Content-Type**: `multipart/form-data`
- **Form Data Fields**:
  - `file` OR `files` (required): Single or multiple package image files (JPEG, PNG, WebP). Maximum size per file: 10MB.
  - `inspector_id` (required): UUID or string ID of the inspecting officer. (Note: Returns `400 MISSING_INSPECTOR_ID` if omitted).
  - `product_type` (required): Product category or commodity name (also accepts `category`, `commodity_name`, `commodityName`).
- **Response**: `201 Created`
  ```json
  {
    "success": true,
    "data": {
      "inspection_id": "3c708af4-7b5e-474f-b4a8-f900c17e3413",
      "image_url": "https://.../storage/v1/object/public/product-images/1788517421417-signature.jpg",
      "image_urls": [
        "https://.../storage/v1/object/public/product-images/1788517421417-signature.jpg"
      ],
      "images": [
        {
          "filename": "signature.jpg",
          "storage_path": "product-images/1788517421417-signature.jpg",
          "image_url": "https://.../storage/v1/object/public/product-images/1788517421417-signature.jpg"
        }
      ],
      "status": "PENDING"
    }
  }
  ```
- **Errors**:
  - `400 INVALID_CONTENT_TYPE`: Content-Type is not multipart/form-data.
  - `400 MISSING_FILE`: No file uploaded.
  - `400 FILE_TOO_LARGE`: Image file exceeds 10MB limit.
  - `400 MISSING_INSPECTOR_ID`: `inspector_id` was not provided.
  - `400 MISSING_FIELDS`: `product_type` was not provided.
  - `500 STORAGE_UPLOAD_FAILED`: Supabase storage bucket rejected upload.
  - `500 DB_INSERT_FAILED`: Failed to insert into `inspections` table.

---

## 3. Inspection Detail & Workflow

### `GET /api/inspections/[id]`
- **Purpose**: Retrieve the full inspection aggregate including images, status, extracted declarations, corrections, compliance findings, and final verdict.
- **Authentication**: Public (Session verification in next step).
- **Path Parameter**: `id` (UUID of the inspection).
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": "3c708af4-7b5e-474f-b4a8-f900c17e3413",
      "inspector_id": "da39b5fa-0000-4000-8000-000000000001",
      "product_type": "Packaged Snacks",
      "image_url": "https://.../product-images/...",
      "image_path": "product-images/...",
      "status": "COMPLETED",
      "created_at": "2026-09-04T10:23:42.8",
      "updated_at": "2026-09-04T10:25:32.219",
      "extracted_fields": [
        {
          "id": "33a3e0e9-f496-4a9e-b640-3121c78422d0",
          "inspection_id": "3c708af4-7b5e-474f-b4a8-f900c17e3413",
          "field_name": "MRP",
          "extracted_value": "50",
          "confidence_score": 0.95,
          "source": "LLM",
          "created_at": "2026-09-04T10:24:42.107"
        }
      ],
      "corrections": [
        {
          "id": "e9a4331d-6363-4e6c-a520-2741a7bf1244",
          "inspection_id": "3c708af4-7b5e-474f-b4a8-f900c17e3413",
          "field_name": "MRP",
          "original_value": "50",
          "corrected_value": "55",
          "timestamp": "2026-09-04T10:25:15.899"
        }
      ],
      "findings": [
        {
          "id": "3d945bd9-8bfc-4213-a503-e4ac03ccce48",
          "inspection_id": "3c708af4-7b5e-474f-b4a8-f900c17e3413",
          "rule_id": "Rule-6-1-a",
          "rule_name": "Name and Address of Manufacturer",
          "violation_type": "MISSING",
          "severity": "HIGH",
          "message": "Manufacturer address is missing on primary display panel",
          "evidence": null,
          "created_at": "2026-09-04T10:25:30.14"
        }
      ],
      "final_result": {
        "id": "9ad5d0c7-a7ff-4697-b11a-ea627de5e2a5",
        "inspection_id": "3c708af4-7b5e-474f-b4a8-f900c17e3413",
        "status": "FAIL",
        "total_violations_count": 1,
        "high_severity_count": 1,
        "findings_json": [ ... ],
        "created_at": "2026-09-04T10:25:31.74"
      }
    }
  }
  ```
- **Errors**:
  - `404 INSPECTION_NOT_FOUND`: Inspection does not exist.

---

### `GET /api/inspections/[id]/extracted-fields`
- **Purpose**: Retrieve all extracted declaration fields stored for the inspection.
- **Path Parameter**: `id` (UUID of the inspection).
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "inspection_id": "3c708af4-7b5e-474f-b4a8-f900c17e3413",
      "count": 2,
      "fields": [
        {
          "id": "33a3e0e9-f496-4a9e-b640-3121c78422d0",
          "field_name": "MRP",
          "extracted_value": "50",
          "confidence_score": 0.95,
          "source": "LLM",
          "created_at": "2026-09-04T10:24:42.107"
        }
      ]
    }
  }
  ```

---

### `POST /api/inspections/[id]/extracted-fields`
- **Purpose**: Persist extracted declarations into the `extracted_fields` table and transition inspection status to `REVIEWING`.
- **Path Parameter**: `id` (UUID of the inspection).
- **Request Body**:
  ```json
  {
    "fields": [
      {
        "field_name": "MRP",
        "extracted_value": "₹50",
        "confidence_score": 0.95,
        "source": "LLM"
      },
      {
        "field_name": "Net Quantity",
        "extracted_value": "200g",
        "confidence_score": 0.91,
        "source": "LLM"
      }
    ]
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "message": "Fields stored successfully",
      "count": 2,
      "inspection_id": "3c708af4-7b5e-474f-b4a8-f900c17e3413"
    }
  }
  ```

---

### `POST /api/inspections/[id]/corrections`
- **Purpose**: Record manual corrections submitted by an enforcement inspector during Review.
- **Path Parameter**: `id` (UUID of the inspection).
- **Request Body**:
  ```json
  {
    "corrections": [
      {
        "field_name": "MRP",
        "original_value": "₹50",
        "corrected_value": "₹55"
      }
    ]
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "message": "Corrections stored successfully",
      "count": 1,
      "inspection_id": "3c708af4-7b5e-474f-b4a8-f900c17e3413"
    }
  }
  ```

---

### `POST /api/inspections/[id]/compliance-results`
- **Purpose**: Store statutory rule compliance findings and the overall verdict, transitioning inspection status to `COMPLETED`.
- **Path Parameter**: `id` (UUID of the inspection).
- **Request Body**:
  ```json
  {
    "status": "FAIL",
    "findings": [
      {
        "rule_id": "Rule-6-1-a",
        "rule_name": "Name and Address of Manufacturer",
        "violation_type": "MISSING",
        "severity": "HIGH",
        "message": "Manufacturer address is missing on primary display panel"
      }
    ]
  }
  ```
  *(Note: Accepts both `FAIL` and `POTENTIAL_NON_COMPLIANCE`; normalizes automatically to database enum `FAIL`).*
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "message": "Compliance results stored",
      "final_status": "POTENTIAL_NON_COMPLIANCE",
      "violations": 1,
      "inspection_id": "3c708af4-7b5e-474f-b4a8-f900c17e3413"
    }
  }
  ```

---

### `GET /api/inspections/[id]/report-data`
- **Purpose**: Fetch complete structured report payload for audit reports and PDF generation.
- **Path Parameter**: `id` (UUID of the inspection).
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "inspection": { ... },
      "extracted_fields": [ ... ],
      "corrections": [ ... ],
      "findings": [ ... ],
      "final_result": { ... }
    }
  }
  ```

---

## 4. Analytics

### `GET /api/analytics/violations`
- **Purpose**: Compute violation counts, pass counts, fail counts, and fail rates across categories or inspection status.
- **Query Parameters**:
  - `group_by` (optional, default `product_type`): Grouping dimension (`product_type`, `status`, or `id`).
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "data": [
        {
          "category": "Packaged Snacks",
          "violation_count": 1,
          "pass_count": 0,
          "fail_count": 1,
          "fail_rate": "100.00%"
        }
      ],
      "group_by": "product_type"
    }
  }
  ```

---

## 5. Status Normalization Mapping Layer

To reconcile the backend database enum with the canonical Legal Metrology verdict model:

| Backend Database Value (`final_results.status`) | Frontend Canonical Result (`OVERALL_RESULT`) | Statutory Meaning |
|---|---|---|
| `PASS` | `PASS` | Fully compliant with Legal Metrology Rules, 2011 |
| `FAIL` | `POTENTIAL_NON_COMPLIANCE` | Presumptive statutory violation detected |
| `MANUAL_REVIEW` | `MANUAL_REVIEW` | Low OCR/model confidence requiring inspector discretion |

The normalization helper functions are exported from `@/lib/types/common`:
- `toFrontendOverallResult(backendStatus)`: Normalizes `FAIL` to `POTENTIAL_NON_COMPLIANCE`.
- `toBackendComplianceStatus(frontendResult)`: Maps `POTENTIAL_NON_COMPLIANCE` to `FAIL`.
