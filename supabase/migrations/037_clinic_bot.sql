-- ============================================================
-- 037_clinic_bot.sql
-- WhatsApp Clinic Bot Module
-- ============================================================

-- ============================================================
-- CLINICS
-- ============================================================

CREATE TABLE IF NOT EXISTS clinics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  clinic_name TEXT NOT NULL,

  clinic_logo TEXT,

  clinic_type TEXT NOT NULL,

  doctor_name TEXT NOT NULL,

  whatsapp_number TEXT NOT NULL,

  phone_number TEXT,

  email TEXT,

  address TEXT NOT NULL,

  google_maps_link TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clinics_user
ON clinics(user_id);

ALTER TABLE clinics
ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS
"Users can manage own clinics"
ON clinics;

CREATE POLICY
"Users can manage own clinics"
ON clinics
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- DOCTORS
-- ============================================================

CREATE TABLE IF NOT EXISTS clinic_doctors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  clinic_id UUID NOT NULL
    REFERENCES clinics(id) ON DELETE CASCADE,

  user_id UUID NOT NULL
    REFERENCES auth.users(id) ON DELETE CASCADE,

  doctor_name TEXT NOT NULL,

  specialization TEXT,

  qualification TEXT,

  experience TEXT,

  consultation_fee NUMERIC,

  doctor_photo TEXT,

  available_days TEXT[],

  start_time TIME,

  end_time TIME,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clinic_doctors_clinic
ON clinic_doctors(clinic_id);

CREATE INDEX IF NOT EXISTS idx_clinic_doctors_user
ON clinic_doctors(user_id);

ALTER TABLE clinic_doctors
ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS
"Users can manage own clinic doctors"
ON clinic_doctors;

CREATE POLICY
"Users can manage own clinic doctors"
ON clinic_doctors
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- CLINIC SERVICES
-- ============================================================

CREATE TABLE IF NOT EXISTS clinic_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  clinic_id UUID NOT NULL
    REFERENCES clinics(id) ON DELETE CASCADE,

  user_id UUID NOT NULL
    REFERENCES auth.users(id) ON DELETE CASCADE,

  service_name TEXT NOT NULL,

  description TEXT,

  price NUMERIC,

  duration_minutes INTEGER,

  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clinic_services_clinic
ON clinic_services(clinic_id);

CREATE INDEX IF NOT EXISTS idx_clinic_services_user
ON clinic_services(user_id);

ALTER TABLE clinic_services
ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS
"Users can manage own clinic services"
ON clinic_services;

CREATE POLICY
"Users can manage own clinic services"
ON clinic_services
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- CLINIC WORKING HOURS
-- ============================================================

CREATE TABLE IF NOT EXISTS clinic_working_hours (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  clinic_id UUID NOT NULL
    REFERENCES clinics(id) ON DELETE CASCADE,

  user_id UUID NOT NULL
    REFERENCES auth.users(id) ON DELETE CASCADE,

  day_name TEXT NOT NULL,

  open_time TIME,

  close_time TIME,

  lunch_start TIME,

  lunch_end TIME,

  is_closed BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clinic_working_hours_clinic
ON clinic_working_hours(clinic_id);

CREATE INDEX IF NOT EXISTS idx_clinic_working_hours_user
ON clinic_working_hours(user_id);

ALTER TABLE clinic_working_hours
ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS
"Users can manage own clinic working hours"
ON clinic_working_hours;

CREATE POLICY
"Users can manage own clinic working hours"
ON clinic_working_hours
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- APPOINTMENT SETTINGS
-- ============================================================

CREATE TABLE IF NOT EXISTS clinic_appointment_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  clinic_id UUID NOT NULL
    REFERENCES clinics(id) ON DELETE CASCADE,

  user_id UUID NOT NULL
    REFERENCES auth.users(id) ON DELETE CASCADE,

  slot_duration INTEGER DEFAULT 30,
  max_booking_days INTEGER DEFAULT 30,
  allow_online_booking BOOLEAN DEFAULT TRUE,
  auto_confirm_booking BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE clinic_appointment_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS
"Users can manage own appointment settings"
ON clinic_appointment_settings;

CREATE POLICY
"Users can manage own appointment settings"
ON clinic_appointment_settings
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- BOT SETTINGS
-- ============================================================

CREATE TABLE IF NOT EXISTS clinic_bot_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  clinic_id UUID NOT NULL
    REFERENCES clinics(id) ON DELETE CASCADE,

  user_id UUID NOT NULL
    REFERENCES auth.users(id) ON DELETE CASCADE,

  welcome_message TEXT,
  fallback_message TEXT,
  goodbye_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE clinic_bot_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS
"Users can manage own bot settings"
ON clinic_bot_settings;

CREATE POLICY
"Users can manage own bot settings"
ON clinic_bot_settings
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- KNOWLEDGE BASE
-- ============================================================

CREATE TABLE IF NOT EXISTS clinic_knowledge_base (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  clinic_id UUID NOT NULL
    REFERENCES clinics(id) ON DELETE CASCADE,

  user_id UUID NOT NULL
    REFERENCES auth.users(id) ON DELETE CASCADE,

  question TEXT NOT NULL,
  answer TEXT NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE clinic_knowledge_base ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS
"Users can manage own knowledge base"
ON clinic_knowledge_base;

CREATE POLICY
"Users can manage own knowledge base"
ON clinic_knowledge_base
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
