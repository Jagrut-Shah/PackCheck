-- ============================================================
-- PackCheck AI — Audit Trail & Notifications Migration
-- Run this in your Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. AUDIT LOGS TABLE
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

-- 2. NOTIFICATIONS TABLE
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

-- 3. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.audit_logs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth full access - audit_logs"
  ON public.audit_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read - audit_logs"
  ON public.audit_logs FOR SELECT TO anon USING (true);

CREATE POLICY "Auth full access - notifications"
  ON public.notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read - notifications"
  ON public.notifications FOR SELECT TO anon USING (true);

-- 4. REALTIME REPLICATION PUBLICATION
-- Enables Supabase Realtime websocket subscriptions for postgres_changes
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Table may already be in publication or publication restricted
  NULL;
END $$;
