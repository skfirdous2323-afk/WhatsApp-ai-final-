-- ============================================================
-- 043_clinic_payment_settings.sql
-- Clinic patient payment configuration
-- Separate from ZIVEXO SaaS subscription billing
-- ============================================================

CREATE TABLE IF NOT EXISTS public.clinic_payment_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL UNIQUE
    REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id UUID NOT NULL
    REFERENCES auth.users(id) ON DELETE CASCADE,

  cash_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  upi_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  upi_qr_url TEXT,
  pay_at_clinic_enabled BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clinic_payment_settings_user
ON public.clinic_payment_settings(user_id);

ALTER TABLE public.clinic_payment_settings
ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own clinic payment settings"
ON public.clinic_payment_settings;

CREATE POLICY "Users can manage own clinic payment settings"
ON public.clinic_payment_settings
FOR ALL
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.clinics c
    WHERE c.id = clinic_payment_settings.clinic_id
      AND c.user_id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.clinics c
    WHERE c.id = clinic_payment_settings.clinic_id
      AND c.user_id = auth.uid()
  )
);

-- UPI QR image storage
INSERT INTO storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
)
VALUES (
  'clinic-payment-qr',
  'clinic-payment-qr',
  TRUE,
  2097152,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Clinic payment QR is publicly readable"
ON storage.objects;

CREATE POLICY "Clinic payment QR is publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'clinic-payment-qr');

DROP POLICY IF EXISTS "Users can upload own clinic payment QR"
ON storage.objects;

CREATE POLICY "Users can upload own clinic payment QR"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'clinic-payment-qr'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND EXISTS (
    SELECT 1
    FROM public.clinics c
    WHERE c.id::text = (storage.foldername(name))[2]
      AND c.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can update own clinic payment QR"
ON storage.objects;

CREATE POLICY "Users can update own clinic payment QR"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'clinic-payment-qr'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND EXISTS (
    SELECT 1
    FROM public.clinics c
    WHERE c.id::text = (storage.foldername(name))[2]
      AND c.user_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'clinic-payment-qr'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND EXISTS (
    SELECT 1
    FROM public.clinics c
    WHERE c.id::text = (storage.foldername(name))[2]
      AND c.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can delete own clinic payment QR"
ON storage.objects;

CREATE POLICY "Users can delete own clinic payment QR"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'clinic-payment-qr'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND EXISTS (
    SELECT 1
    FROM public.clinics c
    WHERE c.id::text = (storage.foldername(name))[2]
      AND c.user_id = auth.uid()
  )
);
