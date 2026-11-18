CREATE TABLE IF NOT EXISTS public.clinic_payment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL,
  contact_id UUID,
  payment_method TEXT NOT NULL DEFAULT 'upi'
    CHECK (payment_method = 'upi'),
  amount NUMERIC(12,2),
  status TEXT NOT NULL DEFAULT 'awaiting_screenshot'
    CHECK (status IN (
      'awaiting_screenshot',
      'pending_verification',
      'paid',
      'rejected',
      'expired'
    )),
  screenshot_path TEXT,
  utr TEXT,
  whatsapp_message_id TEXT UNIQUE,
  rejection_reason TEXT,
  submitted_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clinic_payment_submissions_clinic_status
  ON public.clinic_payment_submissions (clinic_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_clinic_payment_submissions_appointment
  ON public.clinic_payment_submissions (appointment_id);

CREATE INDEX IF NOT EXISTS idx_clinic_payment_submissions_contact_status
  ON public.clinic_payment_submissions (clinic_id, contact_id, status);

ALTER TABLE public.clinic_payment_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clinic owners can view payment submissions"
  ON public.clinic_payment_submissions;

CREATE POLICY "Clinic owners can view payment submissions"
  ON public.clinic_payment_submissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.clinics
      WHERE clinics.id = clinic_payment_submissions.clinic_id
        AND clinics.user_id = auth.uid()
    )
  );

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'clinic-payment-submissions',
  'clinic-payment-submissions',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];
