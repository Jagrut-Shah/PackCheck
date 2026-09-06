-- ============================================================
-- Migration: 20260906_registered_packers.sql
-- PackCheck AI — Rule 27 Registered Pre-Packers & Manufacturers
-- ============================================================

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

-- Add company references to inspections
ALTER TABLE public.inspections
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.registered_packers(id) ON DELETE SET NULL;

ALTER TABLE public.inspections
  ADD COLUMN IF NOT EXISTS company_name TEXT;

CREATE INDEX IF NOT EXISTS idx_inspections_company_id
  ON public.inspections (company_id);

-- Enable RLS
ALTER TABLE public.registered_packers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth full access - registered_packers"
  ON public.registered_packers FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon read - registered_packers"
  ON public.registered_packers FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon insert - registered_packers"
  ON public.registered_packers FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon update - registered_packers"
  ON public.registered_packers FOR UPDATE TO anon USING (true);
