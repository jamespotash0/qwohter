-- Qwohter (new version) -- storage buckets and bucket-level RLS.
--
-- STEP 3 of 3.  Run after new-app-tables.sql and new-app-layer.sql.
--
-- WHY THIS FILE EXISTS
-- The migrations only ever captured one bucket (`organization-logos`). The other
-- three the app uses were created through the Supabase dashboard in production and
-- never written down as SQL, so a database built purely from migrations has no
-- bucket rows and no storage RLS for them -- uploads fail, and anything that did
-- land would be world-readable.
--
-- This file is the single source of truth for ALL FOUR buckets. `organization-logos`
-- is also created by new-app-layer.sql (it came through in the squashed baseline);
-- it is repeated here so storage config lives in one place. Every statement is
-- idempotent -- ON CONFLICT DO NOTHING on buckets, DROP POLICY IF EXISTS before
-- each policy -- so re-applying after the layer file is a safe no-op.
--
-- Bucket names are taken from the code, not from prod:
--   projects-attachments  src/services/attachmentsService.ts:15   (note: plural "projects")
--   proposal-documents    src/services/proposalDocumentsService.ts:48
--   task-attachments      src/services/taskCommentsService.ts:301
--
-- Path convention for all three, from the same services:
--   projects-attachments  {organization_id}/{entity_type}/{entity_id}/{timestamp}_{filename}
--                         (legacy rows keep {organization_id}/{project_id}/... ; the RLS
--                          policy only checks segment 1, so both conventions pass)
--   proposal-documents    {organization_id}/{proposal_id}/{timestamp}_{filename}
--   task-attachments      {organization_id}/tasks/{task_id}/{timestamp}-{rand}.{ext}
-- so (storage.foldername(name))[1] is the organization id in every case.
--
-- ACCESS MODEL
-- Any Active member of the owning organization gets full CRUD inside that org's
-- folder. This mirrors the services, which do not gate uploads or deletes by role.
-- To restrict deletes to Owner/Admin, swap is_org_folder_member for
-- is_org_folder_admin in the DELETE policies below.
--
-- Edge functions (export-proposal-pdf, send-for-signature, submit-signature,
-- get-signing-data) reach storage with the service_role key, which bypasses RLS,
-- so they need no policy of their own. External signers receive time-limited
-- signed URLs, which also bypass RLS by design.


-- ============================================================
-- Helper: Owner/Admin in the org that owns a storage folder
-- ============================================================
-- Also created by new-app-layer.sql. Repeated here (CREATE OR REPLACE, so it is a
-- harmless no-op if the layer ran first) because the policies below call it, and
-- this file must apply standalone. Without it you get:
--     ERROR 42883: function is_org_folder_admin(uuid, text) does not exist
--
-- Both helpers read public.memberships, so new-app-tables.sql must have run first.
CREATE OR REPLACE FUNCTION public.is_org_folder_admin(check_user_id uuid, folder_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  is_admin boolean;
  org_uuid uuid;
BEGIN
  -- Convert folder name (text) to UUID
  BEGIN
    org_uuid := folder_name::uuid;
  EXCEPTION WHEN OTHERS THEN
    RETURN false;
  END;

  -- Check if user is Owner/Admin in this org
  SELECT EXISTS(
    SELECT 1
    FROM public.memberships
    WHERE user_id = check_user_id
    AND organization_id = org_uuid
    AND status = 'Active'
    AND role IN ('Owner', 'Admin')
  ) INTO is_admin;

  RETURN is_admin;
END;
$$;

ALTER FUNCTION public.is_org_folder_admin(uuid, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.is_org_folder_admin(uuid, text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.is_org_folder_admin(uuid, text) TO authenticated;
GRANT ALL ON FUNCTION public.is_org_folder_admin(uuid, text) TO service_role;

COMMENT ON FUNCTION public.is_org_folder_admin(uuid, text) IS
  'Check if user is Owner/Admin in specific org folder. SECURITY DEFINER bypasses RLS.';


-- ============================================================
-- Helper: active membership in the org that owns a storage folder
-- ============================================================
-- Mirrors public.is_org_folder_admin (see new-app-layer.sql) but accepts any
-- Active member rather than only Owner/Admin. The cast is guarded because
-- foldername() returns text and a malformed prefix must fail closed, not raise.
CREATE OR REPLACE FUNCTION public.is_org_folder_member(check_user_id uuid, folder_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  is_member boolean;
  org_uuid uuid;
BEGIN
  BEGIN
    org_uuid := folder_name::uuid;
  EXCEPTION WHEN OTHERS THEN
    RETURN false;
  END;

  SELECT EXISTS(
    SELECT 1
    FROM public.memberships
    WHERE user_id = check_user_id
      AND organization_id = org_uuid
      AND status = 'Active'
  ) INTO is_member;

  RETURN COALESCE(is_member, false);
END;
$$;

ALTER FUNCTION public.is_org_folder_member(uuid, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.is_org_folder_member(uuid, text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.is_org_folder_member(uuid, text) TO authenticated;
GRANT ALL ON FUNCTION public.is_org_folder_member(uuid, text) TO service_role;

COMMENT ON FUNCTION public.is_org_folder_member(uuid, text) IS
  'Check if user is an Active member of the org owning a storage folder. SECURITY DEFINER bypasses RLS.';


-- ============================================================
-- Buckets
-- ============================================================
-- Private. file_size_limit matches MAX_FILE_SIZE (50MB) in both services.
-- allowed_mime_types is intentionally left NULL: the services already validate
-- MIME types in application code, and duplicating a partial list here would
-- silently reject valid uploads whenever that list drifts.

-- 5MB, matching MAX_FILE_SIZE in src/services/LogoUploadService.ts:19.
-- The baseline seeds this bucket with no size limit at all; the UPDATE applies one
-- whether the row was created here or by new-app-layer.sql.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('organization-logos', 'organization-logos', false, 5242880)
ON CONFLICT (id) DO NOTHING;

UPDATE storage.buckets
   SET file_size_limit = 5242880
 WHERE id = 'organization-logos'
   AND file_size_limit IS DISTINCT FROM 5242880;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('projects-attachments', 'projects-attachments', false, 52428800)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('proposal-documents', 'proposal-documents', false, 52428800)
ON CONFLICT (id) DO NOTHING;

-- 10MB here, not 50MB -- matches MAX_FILE_SIZE in
-- src/components/features/board/task-detail/TaskAttachments.tsx:41
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('task-attachments', 'task-attachments', false, 10485760)
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- RLS -- organization-logos
-- ============================================================
-- Policy names and semantics match new-app-layer.sql exactly: Owner/Admin write,
-- any Active member read. Reproduced here so the whole storage surface is in one
-- file; DROP ... IF EXISTS makes re-application after the layer file a no-op.
--
-- One deliberate change: the SELECT policy in the baseline calls
--   is_active_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
-- with an UNGUARDED cast, so an object whose first path segment is not a uuid
-- raises invalid-input-syntax instead of simply denying access. Swapped for
-- is_org_folder_member, which guards the cast and fails closed. Same access,
-- no error path.

DROP POLICY IF EXISTS "Admins can upload organization logos" ON storage.objects;
CREATE POLICY "Admins can upload organization logos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'organization-logos'
  AND public.is_org_folder_admin((select auth.uid()), (storage.foldername(name))[1])
);

DROP POLICY IF EXISTS "Admins can update organization logos" ON storage.objects;
CREATE POLICY "Admins can update organization logos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'organization-logos'
  AND public.is_org_folder_admin((select auth.uid()), (storage.foldername(name))[1])
);

DROP POLICY IF EXISTS "Admins can delete organization logos" ON storage.objects;
CREATE POLICY "Admins can delete organization logos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'organization-logos'
  AND public.is_org_folder_admin((select auth.uid()), (storage.foldername(name))[1])
);

DROP POLICY IF EXISTS "Members can view organization logos" ON storage.objects;
CREATE POLICY "Members can view organization logos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'organization-logos'
  AND public.is_org_folder_member((select auth.uid()), (storage.foldername(name))[1])
);


-- ============================================================
-- RLS -- projects-attachments
-- ============================================================
DROP POLICY IF EXISTS "projects_attachments_select" ON storage.objects;
CREATE POLICY "projects_attachments_select"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'projects-attachments'
  AND public.is_org_folder_member((select auth.uid()), (storage.foldername(name))[1])
);

DROP POLICY IF EXISTS "projects_attachments_insert" ON storage.objects;
CREATE POLICY "projects_attachments_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'projects-attachments'
  AND public.is_org_folder_member((select auth.uid()), (storage.foldername(name))[1])
);

DROP POLICY IF EXISTS "projects_attachments_update" ON storage.objects;
CREATE POLICY "projects_attachments_update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'projects-attachments'
  AND public.is_org_folder_member((select auth.uid()), (storage.foldername(name))[1])
)
WITH CHECK (
  bucket_id = 'projects-attachments'
  AND public.is_org_folder_member((select auth.uid()), (storage.foldername(name))[1])
);

DROP POLICY IF EXISTS "projects_attachments_delete" ON storage.objects;
CREATE POLICY "projects_attachments_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'projects-attachments'
  AND public.is_org_folder_member((select auth.uid()), (storage.foldername(name))[1])
);


-- ============================================================
-- RLS -- proposal-documents
-- ============================================================
DROP POLICY IF EXISTS "proposal_documents_select" ON storage.objects;
CREATE POLICY "proposal_documents_select"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'proposal-documents'
  AND public.is_org_folder_member((select auth.uid()), (storage.foldername(name))[1])
);

DROP POLICY IF EXISTS "proposal_documents_insert" ON storage.objects;
CREATE POLICY "proposal_documents_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'proposal-documents'
  AND public.is_org_folder_member((select auth.uid()), (storage.foldername(name))[1])
);

DROP POLICY IF EXISTS "proposal_documents_update" ON storage.objects;
CREATE POLICY "proposal_documents_update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'proposal-documents'
  AND public.is_org_folder_member((select auth.uid()), (storage.foldername(name))[1])
)
WITH CHECK (
  bucket_id = 'proposal-documents'
  AND public.is_org_folder_member((select auth.uid()), (storage.foldername(name))[1])
);

DROP POLICY IF EXISTS "proposal_documents_delete" ON storage.objects;
CREATE POLICY "proposal_documents_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'proposal-documents'
  AND public.is_org_folder_member((select auth.uid()), (storage.foldername(name))[1])
);


-- ============================================================
-- RLS -- task-attachments
-- ============================================================
DROP POLICY IF EXISTS "task_attachments_select" ON storage.objects;
CREATE POLICY "task_attachments_select"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'task-attachments'
  AND public.is_org_folder_member((select auth.uid()), (storage.foldername(name))[1])
);

DROP POLICY IF EXISTS "task_attachments_insert" ON storage.objects;
CREATE POLICY "task_attachments_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'task-attachments'
  AND public.is_org_folder_member((select auth.uid()), (storage.foldername(name))[1])
);

DROP POLICY IF EXISTS "task_attachments_update" ON storage.objects;
CREATE POLICY "task_attachments_update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'task-attachments'
  AND public.is_org_folder_member((select auth.uid()), (storage.foldername(name))[1])
)
WITH CHECK (
  bucket_id = 'task-attachments'
  AND public.is_org_folder_member((select auth.uid()), (storage.foldername(name))[1])
);

DROP POLICY IF EXISTS "task_attachments_delete" ON storage.objects;
CREATE POLICY "task_attachments_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'task-attachments'
  AND public.is_org_folder_member((select auth.uid()), (storage.foldername(name))[1])
);


-- ============================================================
-- Verify
-- ============================================================
-- Expect 4 buckets and 16 storage.objects policies (4 logos + 4 + 4 + 4).
--   SELECT id, public, file_size_limit FROM storage.buckets ORDER BY id;
--   SELECT policyname FROM pg_policies
--    WHERE schemaname = 'storage' AND tablename = 'objects' ORDER BY policyname;
