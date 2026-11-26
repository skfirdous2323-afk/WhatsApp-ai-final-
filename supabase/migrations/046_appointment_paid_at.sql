ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_appointments_clinic_paid_at
ON public.appointments (clinic_id, paid_at)
WHERE paid_at IS NOT NULL;
