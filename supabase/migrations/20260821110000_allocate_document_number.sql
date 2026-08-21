-- Atomic document number allocation
--
-- Numbers are currently assigned by reading every existing document, taking the
-- maximum, and adding one. That races: two people creating an order in the same
-- second both read the same maximum and both get the same number. Proposals
-- have lived with it; orders must not, because an order number travels onto
-- purchase orders, invoices, and the customer's own paperwork, and a duplicate
-- is discovered weeks later by an accounts department.
--
-- This allocates from a counter instead. The UPDATE takes a row lock on the
-- organization, so concurrent callers serialize and each gets a distinct value.
--
-- It returns the NUMBER, not the formatted string. Formatting lives in
-- src/services/numberingConfigService.ts and stays there -- reimplementing
-- prefixes, separators, and padding in SQL would create a second source of
-- truth that could disagree with what the settings screen previews.
--
-- SECURITY DEFINER on purpose: bumping the counter means updating
-- public.organizations, which RLS restricts to Owner and Admin. Any active
-- member may create an order, so the function does the write on their behalf
-- after checking membership explicitly. That check is the whole security
-- boundary and must not be removed.

CREATE OR REPLACE FUNCTION public.allocate_document_number(
  p_organization_id uuid,
  p_document_type text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_next integer;
BEGIN
  IF p_organization_id IS NULL OR NULLIF(btrim(p_document_type), '') IS NULL THEN
    RAISE EXCEPTION 'organization and document type are both required';
  END IF;

  -- The security boundary. SECURITY DEFINER bypasses RLS, so membership is
  -- checked here rather than inherited.
  IF NOT public.is_active_member(auth.uid(), p_organization_id) THEN
    RAISE EXCEPTION 'Not a member of this organization';
  END IF;

  -- Merge rather than jsonb_set: jsonb_set will not create the intermediate
  -- object for a document type that has never been configured, and merging
  -- preserves any prefix and separators an admin has already set.
  UPDATE public.organizations o
     SET numbering_config =
           COALESCE(o.numbering_config, '{}'::jsonb)
           || jsonb_build_object(
                p_document_type,
                COALESCE(o.numbering_config -> p_document_type, '{}'::jsonb)
                || jsonb_build_object(
                     'lastNumber',
                     COALESCE(
                       (o.numbering_config -> p_document_type ->> 'lastNumber')::integer,
                       1000
                     ) + 1
                   )
              )
   WHERE o.id = p_organization_id
  RETURNING (numbering_config -> p_document_type ->> 'lastNumber')::integer
  INTO v_next;

  IF v_next IS NULL THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;

  RETURN v_next;
END;
$$;

COMMENT ON FUNCTION public.allocate_document_number(uuid, text) IS
  'Atomically allocate the next document number for an organization and document type. Returns the number; formatting belongs to the application. SECURITY DEFINER because bumping the counter writes to organizations, which RLS restricts to Owner/Admin -- membership is checked inside.';

REVOKE ALL ON FUNCTION public.allocate_document_number(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.allocate_document_number(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.allocate_document_number(uuid, text) TO service_role;
