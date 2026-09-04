# PackCheck AI — Automated Statutory Label Compliance Platform
**Ministry of Consumer Affairs, Food & Public Distribution • Department of Consumer Affairs**
*Smart India Hackathon 2026*

---

## Overview

**PackCheck AI** is an enterprise-grade regulatory enforcement platform engineered for Legal Metrology Officers and Inspectors. It automates statutory packaging compliance verification under the **Legal Metrology Act, 2009** and the **Legal Metrology (Packaged Commodities) Rules, 2011**.

The platform ingests multi-angle package photographs, extracts mandatory declarations (Rule 6) via OCR and structured parsing, applies deterministic statutory compliance rules, and generates court-admissible, tamper-evident verification certificates complete with Guilloche anti-forgery patterns, cryptographic verification hashes, and official departmental stamps.

---

## Technology Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack, React Server Components)
- **UI Library**: [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) with curated Sovereign Sapphire & Obsidian Slate design tokens
- **Typography & Icons**: System fonts with [Lucide React](https://lucide.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (Strict type checking with unified canonical aggregate contracts)
- **Tooling**: ESLint 9, PostCSS 8

---

## Getting Started

### Prerequisites

- **Node.js**: `v20.x` or later (LTS recommended)
- **Package Manager**: `npm` (v10+ recommended)

### 1. Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/your-org/packcheck-ai.git
cd packcheck-ai
npm install
```

### 2. Environment Configuration

Copy the environment template:

```bash
cp .env.example .env.local
```

For local frontend development and demo workflows, default placeholder values in `.env.example` will work out of the box with the built-in mock datasets.

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Core Regulatory Workflow

The application implements an end-to-end statutory inspection lifecycle:

1. **Officer Login** (`/login`)
   - Pre-filled mock officer credentials (`rajesh.kumar@gov.in`).
2. **Inspector Dashboard** (`/dashboard`)
   - Overview metrics, urgent compliance queues, inspection history, and quick actions.
3. **New Inspection** (`/inspections/new`)
   - Ingest commodity details, manufacturer info, and multi-angle package photographs (Front, Back, Base, MRP Panel).
4. **Verification Pipeline & Laser HUD** (`/inspections/[id]/processing`)
   - Simulated 7-stage automated pipeline (Ingestion → Deskew → PaddleOCR → Declaration Classification → SI Normalization → Rules Evaluation → Cryptographic Sealing) with a real-time optical scanning HUD and laser beam.
5. **Data Review & Field Override** (`/inspections/[id]/review`)
   - Review extracted Rule 6 declarations with confidence indicators, bounding coordinates, and manual override dialog.
6. **Deterministic Compliance Assessment** (`/inspections/[id]/compliance`)
   - Versioned rule checklist (Rule 6 mandatory fields, Rule 7 PDP dimensions, Rule 8 font heights) with violation severity badges.
7. **Calibrated Evidence Viewer** (`/inspections/[id]/evidence`)
   - Photographic evidence inspection with bidirectional OCR bounding box cross-linking and a calibrated 2.5x inspection loupe.
8. **Statutory Verification Certificate** (`/inspections/[id]/report`)
   - Court-admissible certificate featuring SVG Guilloche wave anti-forgery patterns, official inked compliance stamp, digital signature blocks, and clean A4 print styles (`Ctrl + P`).

---

## Key Feature Highlights

- **Global Command Palette** (`Ctrl + K` / `Cmd + K`): Instant keyboard navigation across inspections, registered companies, Legal Metrology rules, and quick actions.
- **2.5x Loupe Tool**: Circular magnifying lens with calibrated millimeter ticks and crosshairs for micro-text packaging inspection.
- **Regulatory Audit Trail** (`/audit-history`): Immutable log of officer actions, field overrides, and cryptographic SHA-256 signatures.
- **Registered Packers Directory** (`/companies`): Company database under Rule 27 with compliance ratings and violation histories.
- **Rule Analytics** (`/analytics/rules`): Infraction frequency analysis by commodity category and statutory rule.

---

## Repository Structure

```text
├── app/                  # Next.js App Router pages and layouts
├── components/           # UI primitives, feature components, and layout shells
│   ├── common/           # Command palette, page headers, status badges
│   ├── layout/           # AppShell, Header, Sidebar
│   ├── inspections/      # Inspection header, image uploader, stepper
│   ├── extraction/       # Field rows, confidence indicators, edit modal
│   ├── compliance/       # Finding cards, rule checklists, verdict banners
│   ├── evidence/         # Evidence viewer, bounding box overlay, 2.5x loupe
│   ├── reports/          # Judicial certificate view, Guilloche patterns, stamp
│   └── ui/               # Design system primitives (Button, Card, Table...)
├── config/               # Navigation, permissions, and statutory constants
├── docs/                 # Architecture contracts and project structure guides
├── lib/                  # Service clients, rules engine, and API layer
│   ├── api/              # Unified API client consumed by pages
│   ├── compliance/       # Deterministic Legal Metrology rules engine
│   ├── extraction/       # Structured declaration parser
│   ├── ocr/              # PaddleOCR microservice client
│   └── reports/          # Programmatic certificate generator
├── mocks/                # Comprehensive mock datasets conforming to canonical types
├── public/               # Public assets and icons
└── types/                # Canonical TypeScript contracts (Single Source of Truth)
```

For detailed folder responsibilities, see [docs/project-structure.md](docs/project-structure.md).

---

## Development Scripts

```bash
# Run local development server
npm run dev

# Run TypeScript type verification
npx tsc --noEmit

# Run ESLint validation
npm run lint

# Build production bundle
npm run build

# Start production server
npm start
```

---

## Guidelines for Teammates

1. **Shared TypeScript Contracts**: Always import entity interfaces from `@/types` (`InspectionRecord`, `ComplianceFinding`, `VerificationReportData`). Do not declare ad-hoc duplicate types in components.
2. **API Layer**: Consume data via `@/lib/api` methods (`getInspectionById`, `getCompanies`, etc.). This isolates components from future backend/database migrations.
3. **Design Consistency**: Utilize pre-defined design tokens in `app/globals.css` and existing primitives in `components/ui/`. Refer to `/dev/design-system` for visual component reference.
4. **Clean Commits**: Ensure `npx tsc --noEmit` and `npm run lint` pass with 0 errors before pushing commits.
