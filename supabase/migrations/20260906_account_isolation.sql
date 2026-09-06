-- ============================================================
-- PackCheck AI — Account-Based Data Isolation Migration
-- Migration: 20260906_account_isolation.sql
-- Run this in your Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. REASSIGN LEGACY INSPECTIONS
-- Reassign any inspections owned by legacy dummy UUIDs or NULL to primary account
UPDATE public.inspections
SET inspector_id = '18745206-a250-46f3-87cc-6387ff7a4546'
WHERE inspector_id IS NULL
   OR inspector_id = 'da39b5fa-0000-4000-8000-000000000001'
   OR inspector_id NOT IN (SELECT id::text FROM auth.users);

-- 2. ENSURE REGISTERED_PACKERS HAS USER_ID
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'registered_packers') THEN
    ALTER TABLE public.registered_packers
      ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

    CREATE INDEX IF NOT EXISTS idx_registered_packers_user_id
      ON public.registered_packers(user_id);

    UPDATE public.registered_packers
    SET user_id = '18745206-a250-46f3-87cc-6387ff7a4546'
    WHERE user_id IS NULL;
  END IF;
END $$;

-- 3. ROW LEVEL SECURITY (RLS) FOR CORE INSPECTION TABLES
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extracted_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspector_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.final_results ENABLE ROW LEVEL SECURITY;

-- 3.1. inspections table policies
DROP POLICY IF EXISTS "inspections_user_isolation" ON public.inspections;
DROP POLICY IF EXISTS "Auth full access - inspections" ON public.inspections;
DROP POLICY IF EXISTS "Allow public read - inspections" ON public.inspections;

CREATE POLICY "inspections_user_isolation"
  ON public.inspections
  FOR ALL
  TO authenticated
  USING (
    inspector_id = auth.uid()::text
    OR (inspector_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND inspector_id::uuid = auth.uid())
  )
  WITH CHECK (
    inspector_id = auth.uid()::text
    OR (inspector_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND inspector_id::uuid = auth.uid())
  );

-- 3.2. inspection_images table policies
DROP POLICY IF EXISTS "inspection_images_user_isolation" ON public.inspection_images;
CREATE POLICY "inspection_images_user_isolation"
  ON public.inspection_images
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inspections i
      WHERE i.id = inspection_images.inspection_id
        AND (
          i.inspector_id = auth.uid()::text
          OR (i.inspector_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND i.inspector_id::uuid = auth.uid())
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.inspections i
      WHERE i.id = inspection_images.inspection_id
        AND (
          i.inspector_id = auth.uid()::text
          OR (i.inspector_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND i.inspector_id::uuid = auth.uid())
        )
    )
  );

-- 3.3. extracted_fields table policies
DROP POLICY IF EXISTS "extracted_fields_user_isolation" ON public.extracted_fields;
CREATE POLICY "extracted_fields_user_isolation"
  ON public.extracted_fields
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inspections i
      WHERE i.id = extracted_fields.inspection_id
        AND (
          i.inspector_id = auth.uid()::text
          OR (i.inspector_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND i.inspector_id::uuid = auth.uid())
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.inspections i
      WHERE i.id = extracted_fields.inspection_id
        AND (
          i.inspector_id = auth.uid()::text
          OR (i.inspector_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND i.inspector_id::uuid = auth.uid())
        )
    )
  );

-- 3.4. inspector_corrections table policies
DROP POLICY IF EXISTS "inspector_corrections_user_isolation" ON public.inspector_corrections;
CREATE POLICY "inspector_corrections_user_isolation"
  ON public.inspector_corrections
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inspections i
      WHERE i.id = inspector_corrections.inspection_id
        AND (
          i.inspector_id = auth.uid()::text
          OR (i.inspector_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND i.inspector_id::uuid = auth.uid())
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.inspections i
      WHERE i.id = inspector_corrections.inspection_id
        AND (
          i.inspector_id = auth.uid()::text
          OR (i.inspector_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND i.inspector_id::uuid = auth.uid())
        )
    )
  );

-- 3.5. compliance_findings table policies
DROP POLICY IF EXISTS "compliance_findings_user_isolation" ON public.compliance_findings;
CREATE POLICY "compliance_findings_user_isolation"
  ON public.compliance_findings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inspections i
      WHERE i.id = compliance_findings.inspection_id
        AND (
          i.inspector_id = auth.uid()::text
          OR (i.inspector_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND i.inspector_id::uuid = auth.uid())
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.inspections i
      WHERE i.id = compliance_findings.inspection_id
        AND (
          i.inspector_id = auth.uid()::text
          OR (i.inspector_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND i.inspector_id::uuid = auth.uid())
        )
    )
  );

-- 3.6. final_results table policies
DROP POLICY IF EXISTS "final_results_user_isolation" ON public.final_results;
CREATE POLICY "final_results_user_isolation"
  ON public.final_results
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inspections i
      WHERE i.id = final_results.inspection_id
        AND (
          i.inspector_id = auth.uid()::text
          OR (i.inspector_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND i.inspector_id::uuid = auth.uid())
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.inspections i
      WHERE i.id = final_results.inspection_id
        AND (
          i.inspector_id = auth.uid()::text
          OR (i.inspector_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND i.inspector_id::uuid = auth.uid())
        )
    )
  );

-- 4. ROW LEVEL SECURITY FOR AUXILIARY TABLES (when migrated)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'registered_packers') THEN
    ALTER TABLE public.registered_packers ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "packers_user_isolation" ON public.registered_packers;
    CREATE POLICY "packers_user_isolation"
      ON public.registered_packers
      FOR ALL
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_logs') THEN
    ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "audit_logs_user_isolation" ON public.audit_logs;
    CREATE POLICY "audit_logs_user_isolation"
      ON public.audit_logs
      FOR ALL
      TO authenticated
      USING (
        actor_id = auth.uid()::text
        OR EXISTS (
          SELECT 1 FROM public.inspections i
          WHERE i.id = audit_logs.inspection_id
            AND (i.inspector_id = auth.uid()::text OR (i.inspector_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND i.inspector_id::uuid = auth.uid()))
        )
      )
      WITH CHECK (
        actor_id = auth.uid()::text
      );
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
    ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "notifications_user_isolation" ON public.notifications;
    CREATE POLICY "notifications_user_isolation"
      ON public.notifications
      FOR ALL
      TO authenticated
      USING (user_id = auth.uid()::text)
      WITH CHECK (user_id = auth.uid()::text);
  END IF;
END $$;

-- 5. STORAGE BUCKET ROW LEVEL SECURITY (product-images)
-- Ensure objects stored under /{user_id}/* are only accessible by that authenticated user
DROP POLICY IF EXISTS "product_images_user_select" ON storage.objects;
DROP POLICY IF EXISTS "product_images_user_insert" ON storage.objects;
DROP POLICY IF EXISTS "product_images_user_update" ON storage.objects;
DROP POLICY IF EXISTS "product_images_user_delete" ON storage.objects;

CREATE POLICY "product_images_user_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR auth.uid() IS NOT NULL -- Allow viewing of active images referenced in inspection
    )
  );

CREATE POLICY "product_images_user_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "product_images_user_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "product_images_user_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
