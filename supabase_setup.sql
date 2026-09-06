-- ============================================================
-- PackCheck AI — Supabase Database Setup Script
-- Run this in your Supabase Dashboard > SQL Editor
-- ============================================================

-- ============================================================
-- 1. TABLES
-- ============================================================

-- Rule 27 Registered Pre-Packers & Manufacturers
CREATE TABLE IF NOT EXISTS public.registered_packers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  normalized_name     TEXT NOT NULL,
  brand               TEXT,
  registration_number TEXT NOT NULL UNIQUE,
  registered_office   TEXT NOT NULL,
  state               TEXT NOT NULL,
  district            TEXT NOT NULL,
  contact_email       TEXT,
  contact_phone       TEXT,
  categories          TEXT[] DEFAULT '{}',
  status              TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'UNDER_REVIEW', 'SUSPENDED')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_registered_packers_normalized_name
  ON public.registered_packers (normalized_name);

CREATE INDEX IF NOT EXISTS idx_registered_packers_reg_no
  ON public.registered_packers (registration_number);

-- Core inspection record
CREATE TABLE IF NOT EXISTS public.inspections (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspector_id  UUID NOT NULL,
  product_type  TEXT NOT NULL,
  company_id    UUID REFERENCES public.registered_packers(id) ON DELETE SET NULL,
  company_name  TEXT,
  status        TEXT NOT NULL DEFAULT 'PENDING'
                  CHECK (status IN ('PENDING','PROCESSING','REVIEWING','COMPLETED','MANUAL_REVIEW')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inspections_company_id
  ON public.inspections (company_id);

-- Multi-image table (all panel photos per inspection)
CREATE TABLE IF NOT EXISTS public.inspection_images (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id  UUID NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  filename       TEXT NOT NULL,
  storage_path   TEXT NOT NULL,
  image_url      TEXT NOT NULL,
  angle          TEXT NOT NULL DEFAULT 'OTHER',
  is_primary     BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inspection_images_inspection_id
  ON public.inspection_images (inspection_id);

-- OCR raw text, confidence, token bounding boxes, and blocks
CREATE TABLE IF NOT EXISTS public.ocr_results (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id       UUID NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  image_id            UUID REFERENCES public.inspection_images(id) ON DELETE SET NULL,
  engine              TEXT NOT NULL DEFAULT 'PaddleOCR',
  engine_version      TEXT,
  raw_text            TEXT NOT NULL,
  overall_confidence  NUMERIC(4,3) CHECK (overall_confidence >= 0 AND overall_confidence <= 1),
  detected_text_items JSONB,
  blocks              JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ocr_results_inspection_id
  ON public.ocr_results (inspection_id);

-- OCR / LLM extracted label declarations
CREATE TABLE IF NOT EXISTS public.extracted_fields (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id    UUID NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  field_name       TEXT NOT NULL,
  extracted_value  TEXT NOT NULL,
  confidence_score NUMERIC(4,3) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  source           TEXT NOT NULL DEFAULT 'LLM' CHECK (source IN ('OCR','LLM')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_extracted_fields_inspection_id
  ON public.extracted_fields (inspection_id);

-- Inspector manual corrections
CREATE TABLE IF NOT EXISTS public.inspector_corrections (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id    UUID NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  field_name       TEXT NOT NULL,
  original_value   TEXT,
  corrected_value  TEXT NOT NULL,
  timestamp        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inspector_corrections_inspection_id
  ON public.inspector_corrections (inspection_id);

-- Statutory violations flagged by compliance engine
CREATE TABLE IF NOT EXISTS public.compliance_findings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id   UUID NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  rule_id         TEXT NOT NULL,
  rule_name       TEXT,
  violation_type  TEXT,
  severity        TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (severity IN ('HIGH','MEDIUM','LOW')),
  message         TEXT NOT NULL,
  evidence        TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_compliance_findings_inspection_id
  ON public.compliance_findings (inspection_id);

-- Final aggregated compliance result
CREATE TABLE IF NOT EXISTS public.final_results (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id          UUID NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  status                 TEXT NOT NULL CHECK (status IN ('PASS','FAIL','MANUAL_REVIEW')),
  total_violations_count INTEGER NOT NULL DEFAULT 0,
  high_severity_count    INTEGER NOT NULL DEFAULT 0,
  findings_json          JSONB,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (inspection_id)
);

CREATE INDEX IF NOT EXISTS idx_final_results_inspection_id
  ON public.final_results (inspection_id);

-- Immutable Regulatory Audit Trail
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id     UUID REFERENCES public.inspections(id) ON DELETE CASCADE,
  action            TEXT NOT NULL,
  action_label      TEXT NOT NULL,
  category          TEXT NOT NULL DEFAULT 'SYSTEM',
  actor_id          TEXT,
  actor_name        TEXT,
  details           TEXT NOT NULL,
  verification_hash TEXT NOT NULL,
  ip_address        TEXT DEFAULT '10.42.18.91 (Enforcement Terminal)',
  metadata          JSONB DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
  ON public.audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_inspection_id
  ON public.audit_logs (inspection_id, created_at DESC);

-- Real-Time Inspector Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        TEXT NOT NULL,
  inspection_id  UUID REFERENCES public.inspections(id) ON DELETE CASCADE,
  type           TEXT NOT NULL CHECK (type IN ('CRITICAL', 'COMPLIANT', 'REVIEW', 'INFO', 'WARNING')),
  title          TEXT NOT NULL,
  message        TEXT NOT NULL,
  action_url     TEXT,
  read           BOOLEAN NOT NULL DEFAULT false,
  read_at        TIMESTAMPTZ,
  metadata       JSONB DEFAULT '{}'::jsonb,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id, read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_created_at
  ON public.notifications (created_at DESC);

-- ============================================================
-- 2. STORAGE BUCKET
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. STORAGE RLS POLICIES
-- ============================================================

CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Allow public image reads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'product-images');

-- ============================================================
-- 4. TABLE RLS
-- ============================================================

ALTER TABLE public.registered_packers    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_images     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ocr_results           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extracted_fields      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspector_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_findings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.final_results         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications         ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth full access - registered_packers"
  ON public.registered_packers FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon read - registered_packers"
  ON public.registered_packers FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon insert - registered_packers"
  ON public.registered_packers FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon update - registered_packers"
  ON public.registered_packers FOR UPDATE TO anon USING (true);

CREATE POLICY "Auth full access - inspections"
  ON public.inspections FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Auth full access - inspection_images"
  ON public.inspection_images FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Auth full access - ocr_results"
  ON public.ocr_results FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Auth full access - extracted_fields"
  ON public.extracted_fields FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Auth full access - inspector_corrections"
  ON public.inspector_corrections FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Auth full access - compliance_findings"
  ON public.compliance_findings FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Auth full access - final_results"
  ON public.final_results FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Auth full access - audit_logs"
  ON public.audit_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon read - audit_logs"
  ON public.audit_logs FOR SELECT TO anon USING (true);

CREATE POLICY "Auth full access - notifications"
  ON public.notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon read - notifications"
  ON public.notifications FOR SELECT TO anon USING (true);

-- ============================================================
-- 5. updated_at AUTO-TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_inspections_updated_at'
  ) THEN
    CREATE TRIGGER trg_inspections_updated_at
    BEFORE UPDATE ON public.inspections
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- ============================================================
-- Verification query (uncomment to run)
-- ============================================================
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' ORDER BY table_name;
