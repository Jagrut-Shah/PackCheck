# PackCheck AI — System Architecture & Integration Guide
**Smart India Hackathon 2026**

---

## 1. Project Purpose & Scope

**PackCheck AI** is a professional, regulatory-grade compliance verification platform designed for Legal Metrology Officers and Inspectors. It automates statutory label verification for packaged commodities under the **Legal Metrology (Packaged Commodities) Rules, 2011** and the **Legal Metrology Act, 2009**.

The platform processes multi-angle package photographs, extracts statutory declarations (Rule 6), evaluates compliance against versioned legal rules deterministically, and produces legally sound, tamper-evident verification reports.

---

## 2. Core Operational Workflow

```
[Inspector Login]
       │
       ▼
[Inspector Dashboard]
       │
       ▼
[New Inspection Initialization]
       │
       ▼
[Upload Multiple Package Images] (Front, Back, MRP Panel, Ingredients, etc.)
       │
       ▼
[Image Quality Check] (Resolution, Blur, Glare, Lighting)
       │
       ▼
[OCR Ingestion] (PaddleOCR: text, bounding boxes, confidence)
       │
       ▼
[Structured AI Extraction] (LLM + Zod schema validation)
       │
       ▼
[Inspector Review & Overrides] (Manual correction of fields if needed)
       │
       ▼
[Deterministic Compliance Rules Engine] (Versioned PCR-2011 rules)
       │
       ▼
[Statutory Verdict] (PASS / POTENTIAL NON-COMPLIANCE / MANUAL REVIEW)
       │
       ▼
[Findings & Evidence Summary] (Rule citation + photographic bounding boxes)
       │
       ▼
[Programmatic PDF Verification Report] (Cryptographic verification hash)
```

---

## 3. Team Ownership & Division of Responsibilities

To ensure parallel development without conflicts during the hackathon:

| Team Member | Module / Role | Primary Responsibilities |
| :--- | :--- | :--- |
| **Jagrut** | Frontend | Next.js App Router UI, pages, inspection wizard, components, review modal. Consumes `@/mocks` and `@/lib/api`. |
| **Vijay** | Backend & Data | Route handlers, Supabase (Postgres, Auth, Storage), API orchestration between modules. |
| **Arwa** | OCR / Computer Vision | Python FastAPI microservice, OpenCV image quality checks, PaddleOCR bounding box extraction. |
| **Member 3** | LLM Extraction & Rules | Prompt engineering, Zod extraction contracts, deterministic versioned TypeScript rules engine. |
| **Member 6** | QA & Testing | Unit tests for rules engine, integration tests for API routes, E2E user flow tests (Vitest / Playwright). |
| **Team Lead** | Integration & Reports | Module contract alignment, coordination, programmatic tamper-proof PDF generation. |

---

## 4. Module Boundaries & Strict Isolation Principles

1. **Frontend Isolation**:
   - UI components must **NEVER** directly execute database queries, OCR calls, or LLM prompts.
   - UI consumes the typed abstraction layer in `@/lib/api`.
   - The frontend is a presentation and review interface, **NOT** the legal authority for compliance decisions.

2. **Compliance Engine Isolation**:
   - Compliance evaluation is strictly **deterministic TypeScript code** (`@/lib/compliance`).
   - LLMs may assist with extraction and natural-language explanations, but **NEVER make final statutory legal decisions**.
   - Rules are versioned (e.g., `PCR-2011-AMENDED-2024.1`).

3. **OCR Service Isolation**:
   - The Python OCR service runs independently as a microservice (`OCR_SERVICE_URL`).
   - Its contract is strictly defined in `@/types/ocr.ts` (`OCRResult`, `OCRTextBlock`, `BoundingBox`).

4. **Reporting Isolation**:
   - Verification reports (`@/lib/reports`) are generated **programmatically** using structured data and cryptographic hashes.
   - LLMs are **NEVER** used to hallucinate or generate PDF legal reports.

---

## 5. Directory Structure

```
SIH/
├── app/                              # Next.js App Router
│   ├── (auth)/                       # Authentication Route Group
│   │   ├── login/page.tsx            # Officer Login
│   │   └── signup/page.tsx           # Officer Onboarding Request
│   ├── (dashboard)/                  # Authenticated Dashboard Route Group
│   │   ├── layout.tsx                # AppShell Layout wrapper
│   │   ├── dashboard/page.tsx        # Main Operational Dashboard
│   │   ├── inspections/page.tsx      # Inspections Management Table
│   │   ├── companies/page.tsx        # Registered Packers Directory
│   │   ├── reports/page.tsx          # Verification Reports & Notices
│   │   └── profile/page.tsx          # Officer Profile & Jurisdiction
│   ├── api/                          # Route Handlers
│   │   └── health/route.ts           # API Health Check Endpoint
│   ├── globals.css                   # Refined Palette & Tailwind CSS Tokens
│   ├── layout.tsx                    # Root HTML/Body Layout
│   └── page.tsx                      # Root Route
│
├── components/                       # UI Component Library
│   ├── ui/                           # Base UI Primitives (Button, Table, Dialog, Badge, etc.)
│   ├── layout/                       # Shell, Light Sidebar (#F1F4F2), Quiet Header
│   ├── common/                       # PageHeader, SectionHeader, StatusBadge
│   ├── dashboard/                    # DashboardView & Metrics
│   ├── inspections/                  # [Reserved] Multi-Image Dropzone, Wizard
│   ├── extraction/                   # [Reserved] Rule 6 Field Review, Bounding-Box Overlay
│   ├── compliance/                   # [Reserved] Rule Checklist, Violation Cards
│   ├── evidence/                     # [Reserved] Photo Cropper, Evidence Snippets
│   └── reports/                      # [Reserved] PDF Preview & Verification Trigger
│
├── lib/                              # Logic & Service Adapters
│   ├── api/                          # Swappable API Client Layer (Mock-first, Supabase-ready)
│   ├── auth/                         # Session & Authorization Helpers
│   ├── db/                           # Supabase Database Client Abstraction
│   ├── storage/                      # Image Storage Upload Abstraction
│   ├── ocr/                          # Python PaddleOCR Microservice Client
│   ├── extraction/                   # Structured Extraction LLM Client Stub
│   ├── compliance/                   # Versioned Deterministic Rules Engine Stub
│   ├── reports/                      # Programmatic PDF Report Generator Stub
│   ├── preview-data.ts               # Legacy Preview Records
│   └── utils.ts                      # Tailwind Merge & Class Utility
│
├── types/                            # Centralized TypeScript Contracts
│   ├── common.ts                     # Single-Source-of-Truth Status Enums & Envelopes
│   ├── image.ts                      # Image Angles, Quality Metrics
│   ├── ocr.ts                        # PaddleOCR Bounding Boxes & Text Blocks
│   ├── extraction.ts                 # Rule 6 Mandatory Declarations Schema
│   ├── compliance.ts                 # Rule Categories, Statutory Statuses, Evaluations
│   ├── finding.ts                    # Statutory Infractions & Evidence Links
│   ├── inspection.ts                 # Main Inspection Aggregate Entity
│   ├── report.ts                     # Verification Report & Cryptographic Hash Schema
│   ├── user.ts                       # Inspector Profile & Role Authorization
│   └── index.ts                      # Central Barrel Export
│
├── config/                           # System Configuration
│   ├── constants.ts                  # Status Labels, Theme Mappings, Statutory Citations
│   ├── app.ts                        # App Metadata & Navigation Links
│   └── permissions.ts                # Role-Based Permissions Matrix
│
├── mocks/                            # Realistic Indian Packaged Goods Test Data
│   ├── inspections.ts                # Amul Ghee, NutriBite Cookies, Honey, etc.
│   ├── ocr.ts                        # Raw OCR Text & Coordinates
│   ├── extraction.ts                 # Extracted Rule 6 Declarations
│   ├── compliance.ts                 # Statutory Evaluations & Findings
│   ├── users.ts                      # Realistic Legal Metrology Inspector Profiles
│   └── index.ts                      # Mock Barrel Export
│
├── tests/                            # Test Suites
│   ├── unit/                         # Unit tests (Rule evaluations, validations)
│   ├── integration/                  # Route handler and adapter tests
│   └── e2e/                          # End-to-end browser flows
│
├── public/                           # Static Assets & Mock Package Photos
│
├── docs/                             # Documentation
│   └── architecture/
│       └── README.md                 # Architecture Specification (This document)
│
├── .env.example                      # Environment Variable Placeholders
└── tsconfig.json                     # TypeScript Config with `@/*` Alias
```

---

## 6. Shared Status Enums (Single Source of Truth)

All status codes are strictly defined in [`types/common.ts`](file:///c:/Users/HP/Downloads/SIH/types/common.ts) and mapped to UI tokens in [`config/constants.ts`](file:///c:/Users/HP/Downloads/SIH/config/constants.ts). They must never be duplicated as raw strings.

### A. Inspection Status
- `DRAFT`: Initial record created, images pending or uploaded.
- `PROCESSING`: OCR and AI extraction currently executing.
- `MANUAL_REVIEW`: Quality ambiguity, low OCR confidence, or inspector review required.
- `COMPLETED`: Rule engine evaluation completed and findings recorded.

### B. Overall Result
- `PASS`: All statutory declarations verified compliant with PCR 2011.
- `POTENTIAL_NON_COMPLIANCE`: One or more statutory infractions flagged (e.g., missing tax clause on MRP, missing phone in consumer care).
- `MANUAL_REVIEW`: Requires human inspector judgment before final determination.

### C. Image Quality Status
- `PENDING`: Image uploaded, waiting for blur/glare check.
- `PASSED`: Image sharp, well-lit, adequate DPI.
- `RETAKE_REQUIRED`: Motion blur, severe glare, or low resolution prevents accurate OCR.

### D. Confidence Level
- `HIGH`: $\ge 85\%$ confidence.
- `MEDIUM`: $65\% - 84\%$ confidence.
- `LOW`: $< 65\%$ confidence (triggers automatic inspector flag).

---

## 7. Mock Data & Frontend Independence Strategy

To allow **Jagrut** to build all frontend workflows before Vijay connects Supabase or Arwa connects PaddleOCR:
1. All UI screens consume `@/lib/api/inspections.ts`.
2. `@/lib/api/inspections.ts` imports realistic Indian packaged commodities from `@/mocks`.
3. When the real backend is ready, `@/lib/api/inspections.ts` will be updated to make real fetch/Supabase queries without changing any frontend component signatures or prop interfaces.

---

## 8. Environment Variable Conventions

Copy `.env.example` to `.env.local`. Rules:
- Never commit `.env.local` to git.
- Only variables prefixed with `NEXT_PUBLIC_` are exposed to client-side code.
- Service keys (`SUPABASE_SERVICE_ROLE_KEY`, `OCR_SERVICE_API_KEY`, `LLM_API_KEY`, `REPORT_SIGNING_SECRET`) are server-only.
