ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS rescheduled_at timestamptz;
