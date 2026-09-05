# PackCheck AI — Project Architecture & Directory Structure

This document outlines the organization and responsibilities of each directory in the **PackCheck AI** repository.

---

## High-Level Directory Overview

```text
packcheck-ai/
├── app/                  # Next.js App Router (pages, layouts, API routes)
│   ├── (auth)/           # Authentication flows (login, signup)
│   ├── (dashboard)/      # Authenticated regulatory portal routes
│   │   ├── dashboard/    # Inspector overview metrics & urgent queue
│   │   ├── inspections/  # Inspection lifecycle: list, new, review, compliance, evidence, report
│   │   ├── audit-history/# Immutable regulatory audit trail (SHA-256 custody)
│   │   ├── companies/    # Registered packers & pre-packers under Rule 27
│   │   ├── reports/      # Court-admissible statutory compliance reports
│   │   ├── analytics/    # Violation analytics & rule defect distributions
│   │   ├── profile/      # Officer profile & credentials
│   │   └── settings/     # Regional jurisdiction & calibration settings
│   ├── api/              # Internal API endpoints (health, integrations)
│   └── dev/              # Development-only design system & component gallery
│
├── components/           # Modular React components
│   ├── common/           # Cross-cutting components (PageHeader, StatusBadge, CommandPalette)
│   ├── layout/           # App shell, header, sidebar, navigation triggers
│   ├── ui/               # Design system primitives (Button, Card, Badge, Dialog, Table, Tabs...)
│   ├── dashboard/        # Dashboard metrics widgets & activity tables
│   ├── inspections/      # Inspection header, image uploader, workflow stepper
│   ├── extraction/       # OCR field rows, confidence indicators, manual override modal
│   ├── compliance/       # Verdict banners, finding cards, statutory rule checklist
│   ├── evidence/         # Calibrated evidence viewer, bounding box overlay, 2.5x loupe
│   └── reports/          # Judicial certificate view, Guilloche patterns, compliance stamp
│
├── config/               # Static configuration & system constants
│   ├── app.ts            # Application metadata & environment config
│   ├── constants.ts      # Statutory thresholds, Legal Metrology rule constants
│   ├── navigation.ts     # Centralized sidebar and header navigation items
│   └── permissions.ts    # Role-based access control (RBAC) permission definitions
│
├── docs/                 # Engineering and architectural documentation
│   ├── architecture/     # Integration contracts, data flow specs, sequence diagrams
│   └── project-structure.md # This document
│
├── lib/                  # Business logic, API abstractions, and service clients
│   ├── api/              # Unified API client layer (inspections, companies, reports)
│   ├── auth/             # Session & authentication helpers
│   ├── compliance/       # Deterministic Legal Metrology compliance rules engine
│   ├── db/               # Database client abstractions (PostgreSQL/Supabase)
│   ├── extraction/       # Structured AI field extraction module
│   ├── ocr/              # Optical character recognition microservice client
│   ├── reports/          # Programmatic PDF certificate generator
│   ├── storage/          # Cloud image storage integration (S3/Supabase Storage)
│   └── utils.ts          # Tailwind CSS merge and utility functions
│
├── mocks/                # Regulatory test datasets conforming to canonical contracts
│   ├── inspections.ts    # Realistic multi-angle inspection samples (Amul, NutriBite, etc.)
│   ├── companies.ts      # Registered packers under Rule 27
│   ├── ocr.ts            # Raw PaddleOCR bounding boxes and extracted text
│   ├── extraction.ts     # Extracted Rule 6 declarations
│   ├── compliance.ts     # PCR-2011 compliance run results and findings
│   ├── reports.ts        # Court-admissible statutory reports
│   └── users.ts          # Sample Legal Metrology Officers & credentials
│
├── public/               # Static assets & public resources
├── tests/                # Automated tests (unit, integration, e2e)
├── types/                # Single source of truth for canonical TypeScript contracts
│   ├── common.ts         # Base statuses, overall results, commodity categories
│   ├── inspection.ts     # Core InspectionRecord aggregate contract
│   ├── image.ts          # Package image metadata and quality status
│   ├── ocr.ts            # OCR bounding boxes, words, lines, confidence scores
│   ├── extraction.ts     # Rule 6 mandatory declaration field definitions
│   ├── compliance.ts     # Statutory compliance check contracts and results
│   ├── finding.ts        # Violation infractions and evidentiary links
│   ├── report.ts         # Verification report data and digital signoff contracts
│   └── user.ts           # Officer profile, roles, and auth session contracts
│
├── .env.example          # Environment variables template with safe placeholders
├── .gitignore            # Git exclusion rules for builds, secrets, and caches
├── next.config.ts        # Next.js configuration with Turbopack root definition
├── package.json          # Project dependencies and operational scripts
└── tsconfig.json         # TypeScript strict configuration
```

---

## Architectural Principles & Ownership

### 1. Separation of Concerns
- **UI Components** (`components/`) receive props and invoke methods from `lib/api/` — they do not execute database queries directly.
- **Service Layer** (`lib/`) provides a clean interface that operates on mock data during local development and smoothly transitions to production backends (FastAPI OCR, Supabase, LLM extraction) without UI changes.
- **Canonical Contracts** (`types/`) are strictly maintained as the single source of truth across frontend, backend stubs, and mock datasets.

### 2. Legal Metrology Decision Integrity
- The **Rules Engine** (`lib/compliance/`) evaluates statutory requirements (Rules 6, 7, 8, etc.) **deterministically** via code.
- AI (OCR and LLM extraction) assists in transcribing packaging declarations, but legal compliance determination is strictly rule-based and auditable.
