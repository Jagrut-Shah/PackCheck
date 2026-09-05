
# PackCheck AI — Shared Integration & Data Contracts

This document establishes the official data interchange contracts between all modules of the **PackCheck AI** architecture for Smart India Hackathon 2026.

Every module communicates strictly via these TypeScript interfaces. No module may invent an uncoordinated data structure.

```
Frontend (Inspector UI)
    ↓
Backend API Gateway
    ↓
Inspection Aggregate + Package Images
    ↓
OCR Service (PaddleOCR / Vision Pipeline)
    ↓
AI Structured Extraction (Rule 6 Normalization)
    ↓
Inspector Review & Verification Gate
    ↓
Deterministic Compliance Engine (PCR 2011 / Legal Metrology Act 2009)
    ↓
Findings + Linked Evidentiary Coordinates
    ↓
Verification Report & PDF Generation
```

---

## 1. Inspection Contract (`types/inspection.ts`)

- **Producer**: Backend API / Inspection Management Service.
- **Consumer**: Frontend Inspector UI, Compliance Engine, Reporting Service.
- **Purpose**: Central aggregate connecting the complete lifecycle of a commodity label verification audit.

### Important Fields
- `id` (`string`): Unique inspection identifier (e.g. `ins_amul_ghee_001`).
- `inspectionNumber` (`string`): Human-readable departmental audit number (e.g. `INS-2026-0101`).
- `company` (`string`): Pre-packer, manufacturer, or importer legal name.
- `product` (`string`): Commodity trade or common name.
- `productCategory` (`CommodityCategory`): e.g., `FOOD_AND_BEVERAGES`, `EDIBLE_OILS`, `ELECTRONICS_AND_APPLIANCES`.
- `inspectionDate` (`string`): ISO 8601 audit timestamp.
- `location` (`string`): Retail store, warehouse, or transit premises where sample was inspected.
- `inspectionType` (`InspectionType`): `ROUTINE_MARKET_SURVEILLANCE`, `CONSUMER_GRIEVANCE_AUDIT`, `FACTORY_PRE_PACK_INSPECTION`, `CUSTOMS_IMPORT_CLEARANCE`.
- `inspector` (`string`): Full name of the authorized Legal Metrology Officer.
- `department` (`string`): Departmental division (e.g., *Department of Consumer Affairs, Legal Metrology Wing*).
- `status` (`InspectionStatus`): `DRAFT` | `PROCESSING` | `MANUAL_REVIEW` | `COMPLETED`.
- `overallResult` (`OverallResult`): `PASS` | `POTENTIAL_NON_COMPLIANCE` | `MANUAL_REVIEW`.
- `images` (`InspectionImage[]`): Associated package panel photographs.
- `extractedFields` (`ExtractedDeclarations`): Normalized Rule 6 statutory fields.
- `complianceSummary` (`ComplianceRun`): Aggregated rule evaluations and score.
- `findings` (`Finding[]`): Itemized non-compliance infractions.
- `timestamps`: Object containing `createdAt`, `updatedAt`, and optional `completedAt`.

### What Must NOT Be Assumed
- Do NOT assume `overallResult` exists when `status` is `DRAFT` or `PROCESSING`.
- Do NOT assume all package panels (front, back, sides, top, bottom) are present; inspection is valid with any set of clear panels.
- Do NOT assume the frontend calculates or alters the `overallResult`.

---

## 2. Image Contract (`types/image.ts`)

- **Producer**: Inspector Mobile Client / Web Upload Interface.
- **Consumer**: Preprocessing Service (OpenCV), OCR Service (PaddleOCR), Evidence Viewer.
- **Purpose**: Defines uploaded commodity photographs and image quality assessments.

### Important Fields
- `id` (`string`): Unique image identifier.
- `inspectionId` (`string`): Foreign key to the parent inspection aggregate.
- `filename` (`string`): Original filename.
- `storagePath` (`string`): Object storage URI / bucket reference.
- `imageType` (`PackageImageType`): `FRONT` | `BACK` | `SIDE` | `TOP` | `BOTTOM` | `LABEL_CLOSEUP` | `OTHER`.
- `fileSize` (`number`): Size in bytes.
- `qualityStatus` (`ImageQualityStatus`): `PENDING` | `PASSED` | `RETAKE_REQUIRED`.
- `qualityScore` (`number`): Normalized quality score (0.0 to 1.0).
- `qualityMetrics`:
  - `blur` (`number`): Sharpness score (0.0 to 1.0; threshold >= 0.7).
  - `brightness` (`number`): Exposure level (0.0 to 1.0; threshold >= 0.5).
  - `glare` (`number`): Specular reflection index (1.0 = glare-free).
  - `resolution` (`number`): Adequate DPI for character recognition.
  - `readability` (`number`): High-contrast edge definition score.
  - `issuesDetected` (`string[]`): Human-readable warnings (e.g., *"Glare on curved bottle surface"*).

### What Must NOT Be Assumed
- Do NOT assume an image is sharp or readable without checking `qualityStatus`.
- Do NOT assume a fixed number of images per commodity.
- Do NOT hardcode local filesystem paths; use `storagePath` / `url`.

---

## 3. OCR Contract (`types/ocr.ts`)

- **Producer**: PaddleOCR / Vision Service.
- **Consumer**: AI Extraction Module, Evidence Viewer.
- **Purpose**: Defines optical character recognition output with canonical coordinate mapping.

### Important Fields
- `OCRRequest`:
  - `inspectionId` (`string`): Parent inspection reference.
  - `imageId` (`string`): Target package photograph ID.
  - `imageLocation` (`string`): URL, path, or object storage key.
  - `options`: Optional deskew, denoise, and language configurations.
- `OCRResponse`:
  - `inspectionId` (`string`) & `imageId` (`string`).
  - `engine` (`string`): Underlying OCR engine (e.g., `PaddleOCR`).
  - `engineVersion` (`string`): Engine release (e.g., `v2.7.3-PP-OCRv4`).
  - `processingStatus` (`ProcessingStatus`): `COMPLETED` | `FAILED`.
  - `rawText` (`string`): Full concatenated extracted textual stream.
  - `overallConfidence` (`number`): Aggregate mean confidence (0.0 to 1.0).
  - `detectedTextItems` (`OCRTextItem[]`):
    - `text` (`string`): Recognized string token or line.
    - `confidence` (`number`): Confidence score (0.0 to 1.0).
    - `boundingBox` (`[x, y, width, height]`): Canonical 4-tuple coordinate format in pixel units.

### What Must NOT Be Assumed
- Do NOT assume OCR understands legal metrology rules or semantic fields.
- Do NOT assume bounding boxes are sorted top-to-bottom or left-to-right.
- Do NOT assume text is spell-checked or grammatically sound.

---

## 4. AI Extraction Contract (`types/extraction.ts`)

- **Producer**: LLM Extraction Service with Zod schema validation.
- **Consumer**: Inspector Review Interface, Compliance Rules Engine.
- **Purpose**: Converts unstructured OCR text streams into standardized packaged-commodity declarations.

### Important Fields
- `ExtractedField<T>`:
  - `fieldName` (`StatutoryFieldName`): Field name (e.g., `mrp`, `netQuantity`, `manufacturer`).
  - `value` (`T`): Strongly-typed parsed value.
  - `rawValue` (`string`): Verbatim text snippet from OCR.
  - `normalizedValue` (`T`): Standardized numeric/string format.
  - `unit` (`string`): Applicable SI unit (`g`, `kg`, `ml`, `l`, `INR`).
  - `confidenceScore` (`number`): Model extraction confidence (0.0 to 1.0).
  - `confidenceLevel` (`ConfidenceLevel`): `HIGH` | `MEDIUM` | `LOW`.
  - `sourceImageId` (`string`): Photo containing the declaration.
  - `sourceBoundingBox` (`[x, y, width, height]`): Coordinates on source photograph.
  - `sourceType` (`string`): `OCR_TEXT`, `BARCODE`, `QR_CODE`, `TABLE`.
  - `verified` (`boolean`): Whether an inspector has confirmed this value.
- Supported Declarations:
  - `commodityName`: Generic/common commodity designation.
  - `brandName`: Trade or commercial brand name.
  - `manufacturerOrPacker`: Entity name, full address, PIN code, and legal capacity.
  - `netQuantity`: Declared metric quantity, SI unit standard check.
  - `mrp`: Numerical retail price and tax inclusion flag (`isInclusiveOfAllTaxes`).
  - `manufacturingOrPackingDate`: Month, year, and date type.
  - `expiryOrBestBeforeDate`: Shelf-life statement where applicable.
  - `unitSalePrice`: Unit price per gram/ml for packages exceeding 100g/100ml.
  - `consumerCare`: Designated officer/cell, toll-free number, and email.
  - `countryOfOrigin`: Mandatory for all imported and pre-packed goods.
  - `sizesOrDimensions`: Mandatory for textiles, sheets, and sized goods.

### What Must NOT Be Assumed
- Do NOT assume the AI extraction engine makes legal compliance decisions.
- Do NOT assume every declaration is present on every package.
- Do NOT assume extraction confidence equals legal compliance.

---

## 5. Inspector Correction Contract (`types/extraction.ts`)

- **Producer**: Frontend Inspector Review Screen.
- **Consumer**: Backend API, Audit Trail Logger, Compliance Engine Re-run.
- **Purpose**: Allows authorized enforcement officers to correct OCR/AI misreads with full audit logging.

### Important Fields
- `FieldCorrection`:
  - `fieldId` (`string`): Target declaration field identifier.
  - `inspectionId` (`string`): Parent audit reference.
  - `fieldName` (`string`): Field key being corrected.
  - `oldValue` (`unknown`): Machine-extracted value before modification.
  - `newValue` (`unknown`): Officer-corrected statutory value.
  - `correctedBy` (`string`): Officer ID / badge number.
  - `correctionReason` (`string`): Official justification.
  - `correctedTimestamp` (`string`): ISO 8601 timestamp.

### What Must NOT Be Assumed
- Do NOT allow field corrections without logging `correctedBy` and `correctionReason`.
- Do NOT bypass compliance engine re-evaluation after a field is corrected.

---

## 6. Compliance Contract (`types/compliance.ts`)

- **Producer**: Deterministic Legal Metrology Compliance Engine.
- **Consumer**: Frontend Inspection Views, Verification Reports, Notification Service.
- **Purpose**: Evaluates extracted commodity declarations strictly against Legal Metrology Rules, 2011.

### Important Fields
- `ComplianceRule`:
  - `ruleId` (`string`): Unique rule identifier (e.g. `rule_6_1_e`).
  - `ruleCode` (`string`): e.g., `RULE_6_1_E`.
  - `ruleName` (`string`): e.g., *Maximum Retail Price (Inclusive of all taxes)*.
  - `category` (`RuleCategory`): Classification group.
  - `description` (`string`): Legal description.
  - `requirement` (`string`): Exact statutory mandate.
  - `severity` (`ViolationSeverity`): `CRITICAL` | `MAJOR` | `MINOR` | `ADVISORY`.
  - `validationType` (`ValidationType`): `DETERMINISTIC`, `REGEX`, `RANGE_CHECK`, `VOCABULARY_CHECK`.
  - `ruleSetVersion` (`string`): Versioned statute set (e.g. `PCR-2011-AMENDED-2024.1`).
  - `statutorySource` (`string`): e.g., *Legal Metrology (Packaged Commodities) Rules, 2011*.
  - `sourcePageOrSection` (`string`): e.g., *Rule 6(1)(e)*.
- `ComplianceRuleResult`:
  - `ruleId` (`string`) & `ruleVersion` (`string`).
  - `fieldEvaluated` (`string`).
  - `observedValue` (`unknown`): Value observed on package label.
  - `expectedRequirement` (`string`): Statutory mandate.
  - `result` (`IndividualRuleResult`): `PASS` | `FAIL` | `MANUAL_REVIEW` | `NOT_APPLICABLE`.
  - `explanation` (`string`): Deterministic rationale for the finding.
  - `evidenceReference` (`string`): Link to photographic evidence bounding box.

### What Must NOT Be Assumed
- Do NOT calculate compliance in the frontend; all results stem from the deterministic rule engine.
- Do NOT hardcode rule logic without referencing a versioned `ruleSetVersion`.

---

## 7. Overall Compliance Contract (`types/compliance.ts`)

- **Producer**: Compliance Rules Engine.
- **Consumer**: Inspection Overview, Dashboard, Legal Notice Generator.
- **Purpose**: Defines aggregated compliance outcome across all evaluated statutory rules.

### Important Fields
- `ComplianceRun`:
  - `inspectionId` (`string`): Audit reference.
  - `ruleSetId` (`string`): e.g., `ruleset_pcr_2011_v2024`.
  - `engineVersion` (`string`): e.g., `PCR-2011-AMENDED-2024.1`.
  - `startedAt` & `completedAt` (`string`): Execution timestamps.
  - `overallResult` (`OverallResult`):
    - `PASS`: Every mandatory rule evaluated to `PASS` or `NOT_APPLICABLE`.
    - `POTENTIAL_NON_COMPLIANCE`: One or more statutory rules evaluated to `FAIL`.
    - `MANUAL_REVIEW`: OCR ambiguity, blur, or incomplete label requires officer physical verification.
  - `rulesEvaluated`, `rulesPassed`, `rulesFailed`, `rulesManualReview` (`number`): Counts.
  - `score` (`number`): Optional statutory compliance index (0 to 100).
  - `results` (`ComplianceRuleResult[]`): Individual rule results.
  - `summaryNotes` (`string`): Executive legal summary.

---

## 8. Finding Contract (`types/finding.ts`)

- **Producer**: Compliance Rules Engine.
- **Consumer**: Inspector Review, Show-Cause Notice Drafting, Historical Analytics.
- **Purpose**: Represents a discrete statutory infraction with evidentiary coordinates.

### Important Fields
- `Finding`:
  - `findingId` (`string`): Unique finding reference (e.g. `fnd_nb_001`).
  - `inspectionId` (`string`): Parent audit ID.
  - `complianceRunId` (`string`): Execution run ID.
  - `ruleId` (`string`): Legal rule violated (e.g. `rule_6_1_e`).
  - `fieldName` (`string`): Affected declaration field.
  - `severity` (`ViolationSeverity`): `CRITICAL` | `MAJOR` | `MINOR` | `ADVISORY`.
  - `status` (`FindingStatus`): `OPEN` | `VERIFIED` | `DISMISSED` | `RESOLVED`.
  - `title` (`string`): Concise violation summary.
  - `description` (`string`): Detailed legal metrology violation description.
  - `observedValue` (`string`): Observed package text.
  - `expectedValue` (`string`): Mandated statutory wording.
  - `evidenceImageId` (`string`): Reference photo.
  - `evidenceBoundingBox` (`[x, y, width, height]`): Coordinate region.
  - `recommendation` (`string`): Legal action recommendation (e.g. *Issue Show-Cause Notice under Section 36*).
  - `ruleSource` (`string`): Legal citation.
  - `timestamps`: `createdAt` and `updatedAt`.

---

## 9. Evidence Contract (`types/finding.ts`)

- **Producer**: OCR Service / AI Extraction Pipeline.
- **Consumer**: Photographic Evidence Viewer, Enforcement Dossier.
- **Purpose**: Explicit evidentiary link connecting image, bounding box, extracted value, and statutory finding.

### Important Fields
- `Evidence`:
  - `imageId` (`string`): Associated package photograph ID.
  - `boundingBox` (`[x, y, width, height]`): Pixel coordinates of the cropped declaration.
  - `extractedValue` (`string`): Extracted text within the region.
  - `fieldName` (`string`): Associated statutory declaration field.
  - `findingId` (`string`, optional): Linked infraction ID if non-compliant.
  - `ruleId` (`string`, optional): Associated rule citation.
  - `imageAngle` (`string`, optional): e.g., `PRINCIPAL_DISPLAY_PANEL`, `BACK`.
  - `snippetUrl` (`string`, optional): Cropped high-resolution evidence snippet.

---

## 10. Report Contract (`types/report.ts`)

- **Producer**: Report Aggregator Service.
- **Consumer**: PDF Generation Service, Court Submission Packager.
- **Purpose**: Structured payload consumed by the PDF generator.

### Important Fields
- `VerificationReportData`:
  - `reportId` (`string`): Unique report document ID.
  - `inspectionId` & `inspectionNumber` (`string`).
  - `company` & `product` (`string`).
  - `inspectionDate` & `location` (`string`).
  - `inspector` (`string`): Signing officer name.
  - `overallResult` (`OverallResult`): Final statutory verdict.
  - `executiveSummary` (`string`): Official findings synopsis.
  - `extractedDeclarations` (`ExtractedDeclarations`): Complete Rule 6 checklist.
  - `complianceResults` (`ComplianceRuleResult[]`): Itemized rule evaluations.
  - `findings` (`Finding[]`): Itemized non-compliance infractions.
  - `ruleSources` (`string[]`): Statutory acts applied.
  - `documentHash` (`string`): SHA-256 cryptographic hash of document contents for tamper detection.
  - `signoff` (`OfficerSignoff`):
    - `officerName`, `designation`, `badgeNumber`, `signedAt`, `digitalSignatureHash`.

### What Must NOT Be Assumed
- The PDF generator MUST NOT make compliance decisions; it strictly renders this structured contract.
- Do NOT generate reports without the tamper-proof `documentHash`.

---

## 11. User & Role Contract (`types/user.ts`)

- **Producer**: Departmental Identity Provider / Auth Service.
- **Consumer**: Frontend Session Provider, Audit Trail Logger.
- **Purpose**: Establishes authorized officer identities and statutory enforcement powers.

### Important Fields
- `UserContract`:
  - `id` (`string`): Officer UUID / ID.
  - `fullName` (`string`): Official officer name.
  - `employeeCode` (`string`): Official badge/employee number (e.g. `LM-DEL-4821`).
  - `email` (`string`): Official government email (`officer.name@gov.in`).
  - `role` (`UserRole`): `INSPECTOR` | `SENIOR_OFFICER` | `CONTROLLER` | `ADMIN`.
  - `organizationId` (`string`): e.g. `org_dca_india`.
  - `departmentId` (`string`): e.g. `dept_lm_delhi_central`.
  - `isActive` (`boolean`): Clearance status.

---

## 12. API Response Contract (`types/common.ts`)

- **Producer**: All Backend API Endpoints.
- **Consumer**: Frontend Client API Layer.
- **Purpose**: Standardized envelope ensuring consistent error handling and metadata tracking.

### Canonical Structure
```typescript
// Success Response
{
  "success": true,
  "data": { /* T */ },
  "message": "Inspection retrieved successfully",
  "metadata": {
    "timestamp": "2026-09-04T08:30:00Z",
    "requestId": "req_88192a"
  }
}

// Error Response
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Net quantity SI unit invalid under Schedule II",
    "details": { "declaredUnit": "lbs" }
  },
  "metadata": {
    "timestamp": "2026-09-04T08:30:00Z",
    "requestId": "req_88192b"
  }
}

// Paginated Response
{
  "success": true,
  "data": [ /* T[] */ ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 142,
    "totalPages": 8,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

---

## 13. Async Processing vs Inspection Lifecycle

To eliminate state ambiguity across asynchronous services:

| Contract | Allowed States | Purpose |
|---|---|---|
| **`ProcessingStatus`** | `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`, `MANUAL_REVIEW` | Tracks execution of discrete asynchronous pipeline tasks (OpenCV preprocessing, PaddleOCR, LLM extraction). |
| **`InspectionStatus`** | `DRAFT`, `PROCESSING`, `MANUAL_REVIEW`, `COMPLETED` | Tracks the human/statutory lifecycle of the overall inspection record. |
| **`OverallResult`** | `PASS`, `POTENTIAL_NON_COMPLIANCE`, `MANUAL_REVIEW` | The legal verdict evaluated strictly by the deterministic compliance engine. |

---

## 14. Data Formatting Conventions

1. **Dates**: Always ISO 8601 strings in API contracts (`YYYY-MM-DDTHH:mm:ssZ`).
2. **Currency & Money**: Structured numeric convention (`{ "amount": 120, "currency": "INR" }`). Never pass UI-formatted strings (`"Rs. 120/-"`) as the canonical value.
3. **Quantity**: Structured numeric convention (`{ "value": 250, "unit": "g" }`).
4. **Bounding Box**: Canonical 4-tuple: `[x, y, width, height]` in pixel units.
5. **IDs**: Opaque strings (`string`). Never couple contracts to a specific database UUID format.

---

## 15. The 10 Non-Negotiable Module Rules

1. **Frontend does not make legal compliance decisions.**
   The UI only renders the results of the deterministic compliance engine.
2. **OCR only reads images.**
   PaddleOCR extracts textual tokens and coordinates. It does not classify declarations or evaluate rules.
3. **AI extraction structures data; it does not adjudicate.**
   LLM extraction transforms OCR strings into normalized fields under Rule 6. Its responsibility ends there.
4. **Compliance engine is deterministic.**
   Legal Metrology compliance rules execute strictly against statute tables, regex, and allowable thresholds.
5. **Every compliance result must cite statutory sources.**
   Results must specify `ruleCode`, `statutorySource`, and `ruleSetVersion`.
6. **Findings must reference evidentiary coordinates.**
   Every infraction links back to source photographic bounding boxes wherever possible.
7. **PDF generation consumes structured results.**
   The report generator does not evaluate compliance; it prints verified audit results.
8. **Shared types must never be duplicated across microservices.**
   All modules import from this centralized contract layer.
9. **Mock data must strictly follow the shared contracts.**
   No temporary mock format is permitted to drift from production contracts.
10. **Contracts cannot be changed silently.**
    Any modification must be proposed, updated in `types/`, and communicated to the entire team.
