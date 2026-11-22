-- Add clinic UPI payment details.
-- Existing QR codes and payment settings remain unchanged.

ALTER TABLE public.clinic_payment_settings
  ADD COLUMN IF NOT EXISTS upi_id TEXT,
  ADD COLUMN IF NOT EXISTS upi_mobile_number TEXT;
