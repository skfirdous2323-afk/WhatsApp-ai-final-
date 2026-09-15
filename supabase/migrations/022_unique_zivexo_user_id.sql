ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS user_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_code_unique
ON public.profiles(user_code);

CREATE OR REPLACE FUNCTION public.generate_user_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  code TEXT;
BEGIN
  LOOP
    code := 'ZVX-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE user_code = code
    );
  END LOOP;
  RETURN code;
END;
$$;

UPDATE public.profiles
SET user_code = public.generate_user_code()
WHERE user_code IS NULL;

ALTER TABLE public.profiles
ALTER COLUMN user_code SET DEFAULT public.generate_user_code();

ALTER TABLE public.profiles
ALTER COLUMN user_code SET NOT NULL;


CREATE OR REPLACE FUNCTION public.handle_new_profile_user_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.user_code IS NULL OR NEW.user_code = '' THEN
    NEW.user_code := public.generate_user_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_profile_user_code ON public.profiles;
CREATE TRIGGER set_profile_user_code
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_profile_user_code();
