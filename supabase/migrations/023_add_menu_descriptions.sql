ALTER TABLE public.clinics
ADD COLUMN IF NOT EXISTS menu_descriptions JSONB DEFAULT '{}'::jsonb;
