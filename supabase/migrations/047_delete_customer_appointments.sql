-- Atomically delete selected customers and their clinic appointments.
-- Existing migration 041 cascades WhatsApp conversations/messages,
-- notes, tags and custom values. Deals and broadcast history are preserved.

CREATE OR REPLACE FUNCTION public.delete_customers_with_appointments(
  p_contact_ids UUID[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_account_id UUID;
  v_account_role TEXT;
  v_clinic_id UUID;
  v_owned_count BIGINT;
  v_unique_count BIGINT;
  v_deleted_appointments BIGINT := 0;
  v_deleted_contacts BIGINT := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Please sign in again.' USING ERRCODE = '42501';
  END IF;

  IF p_contact_ids IS NULL
     OR cardinality(p_contact_ids) = 0
     OR cardinality(p_contact_ids) > 100
     OR array_position(p_contact_ids, NULL::UUID) IS NOT NULL THEN
    RAISE EXCEPTION 'Invalid customer selection.' USING ERRCODE = '22023';
  END IF;

  SELECT COUNT(DISTINCT selected_id)
    INTO v_unique_count
  FROM unnest(p_contact_ids) AS selected(selected_id);

  IF v_unique_count <> cardinality(p_contact_ids) THEN
    RAISE EXCEPTION 'Duplicate customer selection.' USING ERRCODE = '22023';
  END IF;

  SELECT p.account_id, p.account_role
    INTO v_account_id, v_account_role
  FROM public.profiles p
  WHERE p.user_id = v_user_id;

  IF v_account_id IS NULL THEN
    RAISE EXCEPTION 'Your workspace could not be verified.' USING ERRCODE = '42501';
  END IF;

  IF v_account_role IS NULL
     OR v_account_role NOT IN ('owner', 'admin', 'agent') THEN
    RAISE EXCEPTION 'You do not have permission to delete customers.' USING ERRCODE = '42501';
  END IF;

  SELECT c.id
    INTO v_clinic_id
  FROM public.clinics c
  WHERE c.user_id = v_user_id
  ORDER BY c.created_at DESC
  LIMIT 1;

  IF v_clinic_id IS NULL THEN
    RAISE EXCEPTION 'Your clinic could not be verified.' USING ERRCODE = '42501';
  END IF;

  -- Lock and verify all selected contacts before deleting anything.
  PERFORM c.id
  FROM public.contacts c
  WHERE c.account_id = v_account_id
    AND c.id = ANY (p_contact_ids)
  FOR UPDATE;

  SELECT COUNT(*)
    INTO v_owned_count
  FROM public.contacts c
  WHERE c.account_id = v_account_id
    AND c.id = ANY (p_contact_ids);

  IF v_owned_count <> cardinality(p_contact_ids) THEN
    RAISE EXCEPTION 'Some customers were not found in your workspace.' USING ERRCODE = 'P0002';
  END IF;

  -- Patient payment details are stored on appointment rows.
  DELETE FROM public.appointments a
  WHERE a.clinic_id = v_clinic_id
    AND a.contact_id IN (
      SELECT selected_id::TEXT
      FROM unnest(p_contact_ids) AS selected(selected_id)
    );
  GET DIAGNOSTICS v_deleted_appointments = ROW_COUNT;

  DELETE FROM public.contacts c
  WHERE c.account_id = v_account_id
    AND c.id = ANY (p_contact_ids);
  GET DIAGNOSTICS v_deleted_contacts = ROW_COUNT;

  IF v_deleted_contacts <> cardinality(p_contact_ids) THEN
    RAISE EXCEPTION 'Not all selected customers could be deleted.' USING ERRCODE = '40001';
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'deletedCount', v_deleted_contacts,
    'deletedAppointmentsCount', v_deleted_appointments
  );
END;
$$;

REVOKE ALL ON FUNCTION public.delete_customers_with_appointments(UUID[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_customers_with_appointments(UUID[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_customers_with_appointments(UUID[]) TO authenticated;
